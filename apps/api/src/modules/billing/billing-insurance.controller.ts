import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BillingInsuranceService } from './billing-insurance.service';
import {
  EligibilityCheckDto,
  PriceTableDto,
  PriceTableType,
  HospitalBillDto,
  PrivatePayBudgetDto,
  PreBillingAuditDto,
  TissGuideDto,
  TissGuideType,
  TissBatchDto,
  GlosaManagementDto,
  GlosaAppealStatus,
  SusBillingDto,
  CostPerCaseDto,
} from './dto/billing-insurance.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Billing — Advanced Insurance')
@ApiBearerAuth('access-token')
@Controller('billing')
export class BillingInsuranceController {
  constructor(
    private readonly billingInsuranceService: BillingInsuranceService,
  ) {}

  // ─── Eligibility ─────────────────────────────────────────────────────────────

  @Post('eligibility/check')
  @ApiOperation({ summary: 'Real-time insurance eligibility verification (TISS WS)' })
  @ApiResponse({ status: 200, description: 'Eligibility result' })
  checkEligibility(
    @CurrentTenant() tenantId: string,
    @Body() dto: EligibilityCheckDto,
  ) {
    return this.billingInsuranceService.checkEligibility(tenantId, dto);
  }

  // ─── Price Tables ─────────────────────────────────────────────────────────────

  @Post('price-tables')
  @ApiOperation({ summary: 'Create or update a price table (AMB, CBHPM, TUSS, SUS, institutional)' })
  @ApiResponse({ status: 201, description: 'Price table saved' })
  upsertPriceTable(
    @CurrentTenant() tenantId: string,
    @Body() dto: PriceTableDto,
  ) {
    return this.billingInsuranceService.upsertPriceTable(tenantId, dto);
  }

  @Get('price-tables')
  @ApiOperation({ summary: 'List available price tables for this tenant' })
  @ApiResponse({ status: 200, description: 'List of table keys' })
  listPriceTables(@CurrentTenant() tenantId: string) {
    return this.billingInsuranceService.listPriceTables(tenantId);
  }

  @Get('price-tables/:tableType/:version')
  @ApiOperation({ summary: 'Get a specific price table by type and version' })
  @ApiParam({ name: 'tableType', enum: PriceTableType })
  @ApiParam({ name: 'version', description: 'Table version (e.g. "2024.01")' })
  @ApiResponse({ status: 200, description: 'Price table content' })
  getPriceTable(
    @CurrentTenant() tenantId: string,
    @Param('tableType', new ParseEnumPipe(PriceTableType)) tableType: PriceTableType,
    @Param('version') version: string,
  ) {
    return this.billingInsuranceService.getPriceTable(tenantId, tableType, version);
  }

  @Get('price-tables/:tableType/:version/procedures/:code')
  @ApiOperation({ summary: 'Look up a single procedure price from a table' })
  @ApiParam({ name: 'tableType', enum: PriceTableType })
  @ApiParam({ name: 'version' })
  @ApiParam({ name: 'code', description: 'TUSS / CBHPM procedure code' })
  @ApiResponse({ status: 200, description: 'Procedure price in BRL' })
  lookupProcedurePrice(
    @CurrentTenant() tenantId: string,
    @Param('tableType', new ParseEnumPipe(PriceTableType)) tableType: PriceTableType,
    @Param('version') version: string,
    @Param('code') code: string,
  ) {
    const price = this.billingInsuranceService.lookupProcedurePrice(
      tenantId,
      tableType,
      version,
      code,
    );
    return { procedureCode: code, price };
  }

  // ─── Hospital Bill ────────────────────────────────────────────────────────────

  @Post('hospital-bills')
  @ApiOperation({ summary: 'Create itemized hospital bill (conta hospitalar) by cost center' })
  @ApiResponse({ status: 201, description: 'Hospital bill created' })
  createHospitalBill(
    @CurrentTenant() tenantId: string,
    @Body() dto: HospitalBillDto,
  ) {
    return this.billingInsuranceService.createHospitalBill(tenantId, dto);
  }

  // ─── Private Pay Budget ───────────────────────────────────────────────────────

  @Post('private-pay/budgets')
  @ApiOperation({ summary: 'Create private-pay budget with payment gateway integration' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  createPrivatePayBudget(
    @CurrentTenant() tenantId: string,
    @Body() dto: PrivatePayBudgetDto,
  ) {
    return this.billingInsuranceService.createPrivatePayBudget(tenantId, dto);
  }

  @Post('private-pay/budgets/:budgetId/approve')
  @ApiOperation({ summary: 'Approve a private-pay budget and trigger payment gateway' })
  @ApiParam({ name: 'budgetId', description: 'Budget identifier' })
  @ApiResponse({ status: 200, description: 'Budget approved' })
  approvePrivatePayBudget(
    @CurrentTenant() tenantId: string,
    @Param('budgetId') budgetId: string,
  ) {
    return this.billingInsuranceService.approvePrivatePayBudget(tenantId, budgetId);
  }

  // ─── Pre-Billing Audit ────────────────────────────────────────────────────────

  @Post('audits/pre-billing')
  @ApiOperation({ summary: 'Run pre-billing audit workflow before TISS submission' })
  @ApiResponse({ status: 201, description: 'Audit completed' })
  runPreBillingAudit(
    @CurrentTenant() tenantId: string,
    @Body() dto: PreBillingAuditDto,
  ) {
    return this.billingInsuranceService.runPreBillingAudit(tenantId, dto);
  }

  // ─── TISS Guides ──────────────────────────────────────────────────────────────

  @Post('tiss/guides/generate/:encounterId')
  @ApiOperation({ summary: 'Auto-generate TISS XML guide from clinical documentation' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiQuery({ name: 'guideType', enum: TissGuideType, required: true })
  @ApiResponse({ status: 201, description: 'TISS guide generated' })
  generateTissGuide(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
    @Query('guideType', new ParseEnumPipe(TissGuideType)) guideType: TissGuideType,
  ) {
    return this.billingInsuranceService.generateTissGuide(tenantId, encounterId, guideType);
  }

  @Post('tiss/guides/validate')
  @ApiOperation({ summary: 'Validate a TISS guide XML against ANS XSD schema' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validateTissGuide(@Body() dto: TissGuideDto) {
    return this.billingInsuranceService.validateTissGuide(dto);
  }

  // ─── TISS Batch ───────────────────────────────────────────────────────────────

  @Post('tiss/batches/submit')
  @ApiOperation({ summary: 'Submit a TISS batch to the insurance operator' })
  @ApiResponse({ status: 201, description: 'Batch submitted, returns protocol number' })
  submitTissBatch(
    @CurrentTenant() tenantId: string,
    @Body() dto: TissBatchDto,
  ) {
    return this.billingInsuranceService.submitTissBatch(tenantId, dto);
  }

  @Get('tiss/batches/:batchId/status')
  @ApiOperation({ summary: 'Query TISS batch processing status from the operator' })
  @ApiParam({ name: 'batchId', description: 'Batch identifier' })
  @ApiResponse({ status: 200, description: 'Batch status' })
  getTissBatchStatus(
    @CurrentTenant() tenantId: string,
    @Param('batchId') batchId: string,
  ) {
    return this.billingInsuranceService.getTissBatchStatus(tenantId, batchId);
  }

  // ─── Glosa Management ─────────────────────────────────────────────────────────

  @Post('glosas')
  @ApiOperation({ summary: 'Register a glosa (insurance charge rejection) for a bill' })
  @ApiResponse({ status: 201, description: 'Glosa registered' })
  registerGlosa(
    @CurrentTenant() tenantId: string,
    @Body() dto: GlosaManagementDto,
  ) {
    return this.billingInsuranceService.registerGlosa(tenantId, dto);
  }

  @Get('glosas')
  @ApiOperation({ summary: 'List glosas with optional filters' })
  @ApiQuery({ name: 'billId', required: false })
  @ApiQuery({ name: 'appealStatus', enum: GlosaAppealStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of glosas' })
  listGlosas(
    @CurrentTenant() tenantId: string,
    @Query('billId') billId?: string,
    @Query('appealStatus') appealStatus?: GlosaAppealStatus,
  ) {
    return this.billingInsuranceService.listGlosas(tenantId, { billId, appealStatus });
  }

  @Post('glosas/:glosaId/appeal')
  @ApiOperation({ summary: 'Submit a glosa appeal with written justification' })
  @ApiParam({ name: 'glosaId', description: 'Glosa identifier' })
  @ApiResponse({ status: 200, description: 'Appeal submitted' })
  submitGlosaAppeal(
    @CurrentTenant() tenantId: string,
    @Param('glosaId') glosaId: string,
    @Body('justification') justification: string,
  ) {
    return this.billingInsuranceService.submitGlosaAppeal(tenantId, glosaId, justification);
  }

  // ─── SUS Billing ──────────────────────────────────────────────────────────────

  @Post('sus/billing')
  @ApiOperation({ summary: 'Generate SUS billing file (BPA-I/BPA-C, APAC, AIH) for DATASUS' })
  @ApiResponse({ status: 201, description: 'SUS billing export generated' })
  generateSusBilling(
    @CurrentTenant() tenantId: string,
    @Body() dto: SusBillingDto,
  ) {
    return this.billingInsuranceService.generateSusBilling(tenantId, dto);
  }

  // ─── Cost Per Case ────────────────────────────────────────────────────────────

  @Post('costs/per-case')
  @ApiOperation({ summary: 'Analyze cost per patient/case with margin calculation' })
  @ApiResponse({ status: 200, description: 'Cost per case analysis' })
  analyzeCostPerCase(
    @CurrentTenant() tenantId: string,
    @Body() dto: CostPerCaseDto,
  ) {
    return this.billingInsuranceService.analyzeCostPerCase(tenantId, dto);
  }

  @Get('costs/dashboard')
  @ApiOperation({ summary: 'Cost dashboard: avg cost per case, margins, revenue vs cost' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'costCenter', required: false })
  @ApiResponse({ status: 200, description: 'Aggregated cost metrics' })
  getCostDashboard(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('costCenter') costCenter?: string,
  ) {
    return this.billingInsuranceService.getCostDashboard(tenantId, {
      startDate,
      endDate,
      costCenter,
    });
  }
}
