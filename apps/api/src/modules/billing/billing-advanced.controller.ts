import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BillingAdvancedService } from './billing-advanced.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  EligibilityCheckDto,
  GenerateTISSDto,
  CreateTISSBatchDto,
  PreBillingAuditDto,
  CostAnalysisDto,
} from './dto/billing-advanced.dto';

@ApiTags('Billing Advanced')
@ApiBearerAuth('access-token')
@Controller('billing/advanced')
export class BillingAdvancedController {
  constructor(private readonly service: BillingAdvancedService) {}

  // ─── 1. Eligibility Check ────────────────────────────────────────────────

  @Post('eligibility')
  @ApiOperation({
    summary: 'Real-time insurance eligibility check with TUSS procedure',
  })
  @ApiResponse({ status: 201, description: 'Eligibility result' })
  async checkEligibility(
    @CurrentTenant() tenantId: string,
    @Body() dto: EligibilityCheckDto,
  ) {
    return this.service.checkEligibility(tenantId, dto);
  }

  // ─── 2. TISS XML Generation ──────────────────────────────────────────────

  @Post('tiss/guide')
  @ApiOperation({
    summary: 'Generate TISS 4.0 guide (SP/SADT, Internacao, Consulta, etc.)',
  })
  @ApiResponse({ status: 201, description: 'TISS guide generated' })
  async generateTISSGuide(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenerateTISSDto,
  ) {
    return this.service.generateGuide(tenantId, dto);
  }

  @Post('tiss/guide/validate')
  @ApiOperation({ summary: 'Validate a TISS guide against required fields' })
  @ApiResponse({ status: 201, description: 'Validation result' })
  async validateTISSGuide(
    @CurrentTenant() _tenantId: string,
    @Body() guide: GenerateTISSDto,
  ) {
    // Generate the guide first, then validate it
    const generated = await this.service.generateGuide(_tenantId, guide);
    return this.service.validateGuide(generated);
  }

  @Post('tiss/batch')
  @ApiOperation({
    summary: 'Create a batch of TISS guides for a competence period',
  })
  @ApiResponse({ status: 201, description: 'TISS batch created' })
  async createTISSBatch(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTISSBatchDto,
  ) {
    return this.service.createBatch(tenantId, dto);
  }

  @Post('tiss/batch/:batchNumber/export')
  @ApiParam({ name: 'batchNumber', description: 'Batch number' })
  @ApiOperation({ summary: 'Export a TISS batch as full XML' })
  @ApiResponse({ status: 201, description: 'Batch XML exported' })
  async exportTISSBatch(@Param('batchNumber') batchNumber: string) {
    return this.service.exportBatch(batchNumber);
  }

  @Post('tiss/batch/:batchNumber/submit')
  @ApiParam({ name: 'batchNumber', description: 'Batch number' })
  @ApiOperation({ summary: 'Submit a TISS batch to the insurance operator' })
  @ApiResponse({ status: 201, description: 'Batch submitted with protocol' })
  async submitTISSBatch(@Param('batchNumber') batchNumber: string) {
    return this.service.submitBatch(batchNumber);
  }

  // ─── 3. Pre-billing Audit ────────────────────────────────────────────────

  @Post('audit')
  @ApiOperation({
    summary:
      'Run automated pre-billing audit (completeness, consistency, coding, documentation, authorization)',
  })
  @ApiResponse({ status: 201, description: 'Audit result' })
  async runPreBillingAudit(
    @CurrentTenant() tenantId: string,
    @Body() dto: PreBillingAuditDto,
  ) {
    return this.service.runPreBillingAudit(tenantId, dto);
  }

  @Get('audit/history/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get audit history for an encounter' })
  @ApiResponse({ status: 200, description: 'Audit history' })
  async getAuditHistory(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getAuditHistory(tenantId, encounterId);
  }

  // ─── 4. Cost per Patient/Case ────────────────────────────────────────────

  @Get('cost/encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({
    summary: 'Calculate detailed cost breakdown for an encounter',
  })
  @ApiResponse({ status: 200, description: 'Cost breakdown' })
  async calculateCostPerEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.calculateCostPerEncounter(tenantId, encounterId);
  }

  @Post('cost/patient')
  @ApiOperation({
    summary: 'Calculate aggregate cost for a patient across encounters',
  })
  @ApiResponse({ status: 201, description: 'Patient cost analysis' })
  async calculateCostPerPatient(
    @CurrentTenant() tenantId: string,
    @Body() dto: CostAnalysisDto,
  ) {
    return this.service.calculateCostPerPatient(tenantId, dto);
  }

  @Get('cost/comparison/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({
    summary: 'Compare actual cost vs DRG expected cost for an encounter',
  })
  @ApiResponse({ status: 200, description: 'Cost comparison with DRG' })
  async getCostComparison(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getCostComparison(tenantId, encounterId);
  }

  @Get('cost/margin')
  @ApiOperation({
    summary: 'Get margin analysis for a period (revenue vs cost)',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Margin analysis' })
  async getMarginAnalysis(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getMarginAnalysis(tenantId, startDate, endDate);
  }
}
