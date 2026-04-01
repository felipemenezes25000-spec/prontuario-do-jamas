import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { BillingService } from './billing.service';
import { TissService } from './tiss.service';
import { PdfGeneratorService } from '../documents/pdf-generator.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { BillingStatus } from '@prisma/client';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly tissService: TissService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a billing entry' })
  @ApiResponse({ status: 201, description: 'Billing entry created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBillingDto,
  ) {
    return this.billingService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List billing entries for tenant (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated billing entries' })
  async findByTenant(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('insuranceProvider') insuranceProvider?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.findByTenant(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      status,
      patientId,
      insuranceProvider,
      startDate,
      endDate,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get billing summary for tenant' })
  @ApiResponse({ status: 200, description: 'Billing summary' })
  async generateSummary(@CurrentTenant() tenantId: string) {
    return this.billingService.generateSummary(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get billing dashboard data for tenant' })
  @ApiResponse({ status: 200, description: 'Billing dashboard data' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getDashboard(tenantId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get billing entries by encounter' })
  @ApiResponse({ status: 200, description: 'Encounter billing entries' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.billingService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Billing entry UUID' })
  @ApiOperation({ summary: 'Get billing entry by ID' })
  @ApiResponse({ status: 200, description: 'Billing entry details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findById(id);
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', description: 'Billing entry UUID' })
  @ApiOperation({ summary: 'Update billing entry status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', description: 'New billing status' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: BillingStatus,
  ) {
    return this.billingService.updateStatus(id, status);
  }

  @Post(':id/generate-tiss')
  @ApiParam({ name: 'id', description: 'Billing entry UUID' })
  @ApiOperation({ summary: 'Generate TISS XML 4.0 for a billing entry' })
  @ApiResponse({ status: 201, description: 'TISS XML generated' })
  @ApiResponse({ status: 404, description: 'Billing entry not found' })
  async generateTiss(@Param('id', ParseUUIDPipe) id: string) {
    const xml = await this.tissService.generateTISSXml(id);
    return { xml };
  }

  @Get(':id/tiss-pdf')
  @ApiParam({ name: 'id', description: 'Billing entry UUID' })
  @ApiOperation({ summary: 'Generate TISS guide PDF for a billing entry' })
  @ApiResponse({ status: 200, description: 'TISS guide PDF file' })
  @ApiResponse({ status: 404, description: 'Billing entry not found' })
  async generateTissPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfGeneratorService.generateTissGuidePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="guia_tiss_${id}.pdf"`,
    });
    res.send(buffer);
  }

  // ─── Eligibility Check ──────────────────────────────────────────────────────

  @Post('eligibility/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Real-time insurance eligibility check' })
  @ApiResponse({ status: 201, description: 'Eligibility result' })
  async checkEligibility(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.billingService.checkEligibility(tenantId, patientId);
  }

  // ─── Prior Authorization ───────────────────────────────────────────────────

  @Post('prior-auth-create')
  @ApiOperation({ summary: 'Create prior authorization request' })
  @ApiResponse({ status: 201, description: 'Prior auth created' })
  async createPriorAuth(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      insuranceProvider: string;
      insurancePlanNumber: string;
      procedureDescription: string;
      procedureCodes?: string[];
      clinicalJustification: string;
      cidCode?: string;
      urgency?: string;
    },
  ) {
    // Uses the first admin email as author fallback
    return this.billingService.createPriorAuth(tenantId, 'system@voxpep.com', dto);
  }

  @Patch('prior-auth/:authId/status')
  @ApiParam({ name: 'authId', description: 'Prior Auth UUID' })
  @ApiOperation({ summary: 'Update prior authorization status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updatePriorAuthStatus(
    @CurrentTenant() tenantId: string,
    @Param('authId', ParseUUIDPipe) authId: string,
    @Body() dto: {
      status: string;
      authorizationNumber?: string;
      reviewNotes?: string;
      denialReason?: string;
      reviewerName?: string;
    },
  ) {
    return this.billingService.updatePriorAuthStatus(tenantId, authId, dto);
  }

  @Get('prior-auth-queue')
  @ApiOperation({ summary: 'Get pending prior authorizations queue' })
  @ApiResponse({ status: 200, description: 'Pending authorizations' })
  async getPriorAuthQueue(@CurrentTenant() tenantId: string) {
    return this.billingService.getPriorAuthQueue(tenantId);
  }

  // ─── Price Table ───────────────────────────────────────────────────────────

  @Post('price-table')
  @ApiOperation({ summary: 'Create price table (AMB, CBHPM, TUSS, SUS) with versioning' })
  @ApiResponse({ status: 201, description: 'Price table created' })
  async createPriceTable(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      tableName: string;
      tableType: 'AMB' | 'CBHPM' | 'TUSS' | 'SUS' | 'CUSTOM';
      version: string;
      effectiveDate: string;
      items: Array<{ code: string; description: string; unitPrice: number; category?: string; porte?: string }>;
    },
  ) {
    // Resolve authorId from first admin
    return this.billingService.createPriceTable(tenantId, 'system', dto);
  }

  // ─── Hospital Account ──────────────────────────────────────────────────────

  @Post('hospital-account')
  @ApiOperation({ summary: 'Create itemized hospital account' })
  @ApiResponse({ status: 201, description: 'Hospital account created' })
  async createHospitalAccount(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      patientId: string;
      encounterId: string;
      admissionDate: string;
      dischargeDate?: string;
      items: Array<{
        category: 'DAILY_RATE' | 'PROFESSIONAL_FEE' | 'MATERIAL' | 'DRUG' | 'EXAM' | 'PROCEDURE' | 'OTHER';
        costCenter: string;
        code: string;
        description: string;
        quantity: number;
        unitPrice: number;
        date: string;
      }>;
    },
  ) {
    return this.billingService.createHospitalAccount(tenantId, 'system', dto);
  }

  // ─── Private Quote ─────────────────────────────────────────────────────────

  @Post('private-quote')
  @ApiOperation({ summary: 'Create quote for private patient with installments' })
  @ApiResponse({ status: 201, description: 'Private quote created' })
  async createPrivateQuote(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      patientId: string;
      items: Array<{ code: string; description: string; quantity: number; unitPrice: number }>;
      validDays?: number;
      installments?: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) {
    return this.billingService.createPrivateQuote(tenantId, 'system', dto);
  }

  // ─── Audit ─────────────────────────────────────────────────────────────────

  @Post(':id/audit')
  @ApiParam({ name: 'id', description: 'Billing entry UUID' })
  @ApiOperation({ summary: 'Pre-billing audit checklist' })
  @ApiResponse({ status: 201, description: 'Audit result' })
  async auditAccount(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: {
      auditorNotes?: string;
      checkCompleteness?: boolean;
      checkConsistency?: boolean;
      checkCoding?: boolean;
    },
  ) {
    return this.billingService.auditAccount(tenantId, id, dto);
  }

  // ─── TISS Guide ────────────────────────────────────────────────────────────

  @Post('tiss-guide')
  @ApiOperation({ summary: 'Auto-generate TISS guide (SP/SADT/hospitalization/summary)' })
  @ApiResponse({ status: 201, description: 'TISS guide generated' })
  async generateTISSGuide(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      guideType: 'SP_SADT' | 'INTERNACAO' | 'CONSULTA' | 'RESUMO';
      encounterId: string;
      insuranceProvider: string;
      registroAns: string;
    },
  ) {
    return this.billingService.generateTISSGuide(tenantId, dto);
  }

  // ─── TISS Batch ────────────────────────────────────────────────────────────

  @Post('tiss-batch')
  @ApiOperation({ summary: 'Submit TISS XML batch to operator' })
  @ApiResponse({ status: 201, description: 'Batch submitted with protocol' })
  async submitTISSBatch(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      insuranceProvider: string;
      registroAns: string;
      guides: Array<{ guideNumber: string; guideType: string; totalAmount: number }>;
    },
  ) {
    return this.billingService.submitTISSBatch(tenantId, dto);
  }

  // ─── Disallowance ─────────────────────────────────────────────────────────

  @Post('disallowance')
  @ApiOperation({ summary: 'Manage disallowances (register, classify, justify, appeal)' })
  @ApiResponse({ status: 201, description: 'Disallowance action performed' })
  async manageDisallowance(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      action: 'REGISTER' | 'CLASSIFY' | 'JUSTIFY' | 'APPEAL';
      billingEntryId?: string;
      glosaId?: string;
      amount?: number;
      reasonCode?: string;
      reasonDescription?: string;
      justification?: string;
      appealDocuments?: string[];
    },
  ) {
    return this.billingService.manageDisallowance(tenantId, dto);
  }

  @Get('disallowance-metrics')
  @ApiOperation({ summary: 'Disallowance rate, by reason, by operator' })
  @ApiResponse({ status: 200, description: 'Disallowance metrics' })
  async getDisallowanceMetrics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getDisallowanceMetrics(tenantId, { startDate, endDate });
  }

  // ─── Suggest Coding ────────────────────────────────────────────────────────

  @Post('suggest-coding/:noteId')
  @ApiParam({ name: 'noteId', description: 'Clinical note UUID' })
  @ApiOperation({ summary: 'AI suggest CID/CBHPM/TUSS from clinical note text' })
  @ApiResponse({ status: 201, description: 'Coding suggestions' })
  async suggestCoding(
    @CurrentTenant() tenantId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.billingService.suggestCoding(tenantId, noteId);
  }

  // ─── SUS Billing ───────────────────────────────────────────────────────────

  @Post('sus')
  @ApiOperation({ summary: 'Create SUS billing (BPA-I/BPA-C, APAC, AIH) for DATASUS' })
  @ApiResponse({ status: 201, description: 'SUS billing created' })
  async createSUSBilling(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      type: 'BPA_I' | 'BPA_C' | 'APAC' | 'AIH';
      competence: string;
      cnes: string;
      items: Array<{
        patientId?: string;
        procedureCode: string;
        cid: string;
        quantity: number;
        cbo: string;
        date: string;
      }>;
    },
  ) {
    return this.billingService.createSUSBilling(tenantId, dto);
  }

  // ─── Financial Dashboard ───────────────────────────────────────────────────

  @Get('financial-dashboard')
  @ApiOperation({ summary: 'Financial dashboard: revenue, expenses, margin, cash forecast' })
  @ApiResponse({ status: 200, description: 'Financial dashboard data' })
  async getFinancialDashboard(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getFinancialDashboard(tenantId, { startDate, endDate });
  }

  // ─── DRG ───────────────────────────────────────────────────────────────────

  @Get('drg/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Brazilian DRG classification for encounter' })
  @ApiResponse({ status: 200, description: 'DRG result' })
  async calculateDRG(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.billingService.calculateDRG(tenantId, encounterId);
  }

  // ─── Charge Capture Detection ──────────────────────────────────────────────

  @Get('detect-charges/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Auto-detect documented procedures not yet billed' })
  @ApiResponse({ status: 200, description: 'Charge capture detection result' })
  async detectChargeCapture(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.billingService.detectChargeCapture(tenantId, encounterId);
  }

  // ─── Cost Per Case ─────────────────────────────────────────────────────────

  @Get('cost-per-case/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Real cost vs revenue for encounter' })
  @ApiResponse({ status: 200, description: 'Cost per case analysis' })
  async calculateCostPerCase(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.billingService.calculateCostPerCase(tenantId, encounterId);
  }
}
