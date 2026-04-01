import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ClinicalPathwaysAdvancedService } from './clinical-pathways-advanced.service';
import {
  MedicalCalculatorType,
  type MedicalCalculatorDto,
  type ClinicalPathwayDto,
  type ComplianceChecklistDto,
  type ProtocolDeviationDto,
} from './dto/clinical-pathways-advanced.dto';

@ApiTags('Clinical Pathways - Advanced')
@ApiBearerAuth('access-token')
@Controller('clinical-pathways')
export class ClinicalPathwaysAdvancedController {
  constructor(private readonly service: ClinicalPathwaysAdvancedService) {}

  // ─── Medical Calculators ──────────────────────────────────────────────────

  @Post('calculators')
  @ApiOperation({
    summary: 'Run medical calculator — CHADS₂-VASc, MELD, CURB-65, SOFA, GCS, APACHE II, Wells, Framingham, etc.',
  })
  @ApiResponse({ status: 201, description: 'Calculator result with interpretation' })
  async calculate(
    @CurrentTenant() tenantId: string,
    @Body() dto: MedicalCalculatorDto,
  ) {
    return this.service.calculate(tenantId, dto);
  }

  @Get('calculators')
  @ApiOperation({ summary: 'List past calculations for a patient or encounter' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'calculatorType', required: false, enum: MedicalCalculatorType })
  @ApiResponse({ status: 200, description: 'List of calculations' })
  async listCalculations(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('calculatorType') calculatorType?: MedicalCalculatorType,
  ) {
    return this.service.listCalculations(tenantId, patientId, calculatorType);
  }

  // ─── Clinical Pathways ────────────────────────────────────────────────────

  @Post('pathways')
  @ApiOperation({
    summary: 'Upsert clinical pathway day entry — orders, goals, discharge criteria, variance tracking',
  })
  @ApiResponse({ status: 201, description: 'Pathway entry saved' })
  async upsertPathwayEntry(
    @CurrentTenant() tenantId: string,
    @Body() dto: ClinicalPathwayDto,
  ) {
    return this.service.upsertPathwayEntry(tenantId, dto);
  }

  @Get('pathways/:encounterId/:pathwayId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiParam({ name: 'pathwayId', description: 'Pathway definition ID' })
  @ApiOperation({
    summary: 'Get full pathway progress for an encounter — all days, discharge criteria, variances',
  })
  @ApiResponse({ status: 200, description: 'Pathway progress' })
  async getPathwayProgress(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
    @Param('pathwayId') pathwayId: string,
  ) {
    return this.service.getPathwayProgress(tenantId, encounterId, pathwayId);
  }

  // ─── Protocol Compliance Checklists ──────────────────────────────────────

  @Post('compliance-checklists')
  @ApiOperation({
    summary: 'Create protocol compliance checklist — ATB timing, VTE prophylaxis, reconciliation',
  })
  @ApiResponse({ status: 201, description: 'Checklist created with compliance %' })
  async createChecklist(
    @CurrentTenant() tenantId: string,
    @Body() dto: ComplianceChecklistDto,
  ) {
    return this.service.createChecklist(tenantId, dto);
  }

  @Get('compliance-checklists/:protocolId/stats')
  @ApiParam({ name: 'protocolId', description: 'Protocol definition ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({
    summary: 'Get aggregated compliance statistics for a protocol — trend analysis',
  })
  @ApiResponse({ status: 200, description: 'Compliance statistics' })
  async getComplianceStats(
    @CurrentTenant() tenantId: string,
    @Param('protocolId') protocolId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getComplianceStats(tenantId, protocolId, startDate, endDate);
  }

  // ─── Protocol Deviations ─────────────────────────────────────────────────

  @Post('deviations')
  @ApiOperation({
    summary: 'Report protocol deviation — mandatory justification, automatic alert for major/critical',
  })
  @ApiResponse({ status: 201, description: 'Deviation reported with audit record' })
  async reportDeviation(
    @CurrentTenant() tenantId: string,
    @Body() dto: ProtocolDeviationDto,
  ) {
    return this.service.reportDeviation(tenantId, dto);
  }

  @Get('deviations')
  @ApiOperation({ summary: 'List protocol deviations' })
  @ApiQuery({ name: 'protocolId', required: false })
  @ApiQuery({ name: 'encounterId', required: false })
  @ApiResponse({ status: 200, description: 'Protocol deviations list' })
  async listDeviations(
    @CurrentTenant() tenantId: string,
    @Query('protocolId') protocolId?: string,
    @Query('encounterId') encounterId?: string,
  ) {
    return this.service.listDeviations(tenantId, protocolId, encounterId);
  }

  @Patch('deviations/:deviationId/approve')
  @ApiParam({ name: 'deviationId', description: 'Deviation UUID' })
  @ApiOperation({ summary: 'Approve a protocol deviation (attending physician authorization)' })
  @ApiResponse({ status: 200, description: 'Deviation approved' })
  async approveDeviation(
    @CurrentTenant() tenantId: string,
    @Param('deviationId') deviationId: string,
    @Body() body: { approvedBy: string },
  ) {
    return this.service.approveDeviation(tenantId, deviationId, body.approvedBy);
  }
}
