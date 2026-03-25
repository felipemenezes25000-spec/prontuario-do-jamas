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
import { ClinicalPathwaysService } from './clinical-pathways.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  CalculateScoreDto,
  CreateOrderSetDto,
  CreatePathwayDto,
  RecordComplianceDto,
  RecordDeviationDto,
} from './dto/clinical-pathways.dto';

@ApiTags('Clinical Pathways & Protocols')
@ApiBearerAuth('access-token')
@Controller('clinical-pathways')
export class ClinicalPathwaysController {
  constructor(private readonly service: ClinicalPathwaysService) {}

  // ─── Medical Calculators ────────────────────────────────────────────────────

  @Post('calculators')
  @ApiOperation({ summary: 'Calculate medical score (CHADS2-VASc, MELD, APACHE, Wells, etc.)' })
  @ApiResponse({ status: 201, description: 'Score calculated' })
  async calculateScore(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateScoreDto,
  ) {
    return this.service.calculateScore(tenantId, user.sub, dto);
  }

  // ─── Order Sets ─────────────────────────────────────────────────────────────

  @Post('order-sets')
  @ApiOperation({ summary: 'Create order set linked to protocol' })
  @ApiResponse({ status: 201, description: 'Order set created' })
  async createOrderSet(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderSetDto,
  ) {
    return this.service.createOrderSet(tenantId, user.sub, dto);
  }

  @Get('order-sets')
  @ApiOperation({ summary: 'List order sets' })
  @ApiQuery({ name: 'diagnosisCode', required: false })
  @ApiResponse({ status: 200, description: 'Order sets list' })
  async listOrderSets(
    @CurrentTenant() tenantId: string,
    @Query('diagnosisCode') diagnosisCode?: string,
  ) {
    return this.service.listOrderSets(tenantId, diagnosisCode);
  }

  // ─── Clinical Pathways ──────────────────────────────────────────────────────

  @Post('pathways')
  @ApiOperation({ summary: 'Create clinical pathway (day-by-day protocol)' })
  @ApiResponse({ status: 201, description: 'Pathway created' })
  async createPathway(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePathwayDto,
  ) {
    return this.service.createPathway(tenantId, user.sub, dto);
  }

  @Get('pathways')
  @ApiOperation({ summary: 'List clinical pathways' })
  @ApiResponse({ status: 200, description: 'Pathways list' })
  async listPathways(@CurrentTenant() tenantId: string) {
    return this.service.listPathways(tenantId);
  }

  @Get('pathways/:id')
  @ApiOperation({ summary: 'Get pathway details' })
  @ApiParam({ name: 'id', description: 'Pathway document UUID' })
  @ApiResponse({ status: 200, description: 'Pathway details' })
  async getPathwayById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getPathwayById(tenantId, id);
  }

  // ─── Protocol Compliance ────────────────────────────────────────────────────

  @Post('compliance')
  @ApiOperation({ summary: 'Record protocol compliance checklist' })
  @ApiResponse({ status: 201, description: 'Compliance recorded' })
  async recordCompliance(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordComplianceDto,
  ) {
    return this.service.recordCompliance(tenantId, user.sub, dto);
  }

  @Get('compliance/dashboard')
  @ApiOperation({ summary: 'Protocol compliance dashboard' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard data' })
  async getComplianceDashboard(@CurrentTenant() tenantId: string) {
    return this.service.getComplianceDashboard(tenantId);
  }

  // ─── Protocol Deviations ────────────────────────────────────────────────────

  @Post('deviations')
  @ApiOperation({ summary: 'Record protocol deviation with mandatory justification' })
  @ApiResponse({ status: 201, description: 'Deviation recorded' })
  async recordDeviation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordDeviationDto,
  ) {
    return this.service.recordDeviation(tenantId, user.sub, dto);
  }

  @Get('deviations')
  @ApiOperation({ summary: 'List protocol deviations' })
  @ApiQuery({ name: 'pathwayId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Deviations list' })
  async listDeviations(
    @CurrentTenant() tenantId: string,
    @Query('pathwayId') pathwayId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listDeviations(tenantId, {
      pathwayId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  // ─── Guidelines Library ─────────────────────────────────────────────────────

  @Get('guidelines/:diagnosisCode')
  @ApiOperation({ summary: 'Get clinical guidelines for diagnosis' })
  @ApiParam({ name: 'diagnosisCode', description: 'ICD-10 code' })
  @ApiResponse({ status: 200, description: 'Guidelines for diagnosis' })
  async getGuidelinesForDiagnosis(
    @CurrentTenant() tenantId: string,
    @Param('diagnosisCode') diagnosisCode: string,
  ) {
    return this.service.getGuidelinesForDiagnosis(tenantId, diagnosisCode);
  }

  // ─── AI Endpoints ──────────────────────────────────────────────────────────

  @Post('ai/recommend-protocol')
  @ApiOperation({ summary: 'AI: Recommend protocols based on diagnoses' })
  @ApiResponse({ status: 201, description: 'Protocol recommendations' })
  async recommendProtocol(
    @CurrentTenant() tenantId: string,
    @Body() dto: { diagnosisCodes: string[]; patientAge?: number; gender?: string },
  ) {
    return this.service.recommendProtocol(tenantId, dto);
  }

  @Get('ai/compliance-monitor')
  @ApiOperation({ summary: 'AI: Real-time compliance monitoring with alerts' })
  @ApiResponse({ status: 200, description: 'Real-time compliance data' })
  async monitorComplianceRealTime(@CurrentTenant() tenantId: string) {
    return this.service.monitorComplianceRealTime(tenantId);
  }
}
