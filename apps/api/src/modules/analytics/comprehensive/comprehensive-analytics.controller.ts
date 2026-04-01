import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ComprehensiveAnalyticsService } from './comprehensive-analytics.service';
import {
  SelfServiceAnalyticsDto,
  PopulationHealthDto,
  ClinicalResearchCohortDto,
  ComprehensiveQualityResponseDto,
  ProcessIndicatorResponseDto,
  SelfServiceAnalyticsResponseDto,
  PopulationHealthResponseDto,
  BenchmarkingResponseDto,
  ClinicalResearchCohortResponseDto,
} from './dto/comprehensive-analytics.dto';

@ApiTags('Analytics - Comprehensive')
@ApiBearerAuth('access-token')
@Controller('analytics/comprehensive')
export class ComprehensiveAnalyticsController {
  constructor(private readonly service: ComprehensiveAnalyticsService) {}

  // ─── Quality Indicators (ONA/JCI/AHRQ) ─────────────────────────────────

  @Get('quality-indicators')
  @ApiOperation({
    summary: 'Comprehensive quality indicators: infection, mortality, LOS, readmission, falls, LPP, protocol compliance',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Quality indicators with benchmarks', type: ComprehensiveQualityResponseDto })
  async getQualityIndicators(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ComprehensiveQualityResponseDto> {
    return this.service.getQualityIndicators(tenantId, { startDate, endDate });
  }

  // ─── Process Indicators ─────────────────────────────────────────────────

  @Get('process-indicators')
  @ApiOperation({
    summary: 'Process care indicators: protocol compliance, door-to-needle, prophylactic ATB, VTE prophylaxis',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Process indicators', type: ProcessIndicatorResponseDto })
  async getProcessIndicators(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ProcessIndicatorResponseDto> {
    return this.service.getProcessIndicators(tenantId, { startDate, endDate });
  }

  // ─── CCIH Dashboard ────────────────────────────────────────────────────

  @Get('ccih')
  @ApiOperation({
    summary: 'CCIH infection control dashboard: density by site, organisms, resistance, device utilization',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'CCIH dashboard data' })
  async getCCIHDashboard(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getCCIHDashboard(tenantId, { startDate, endDate });
  }

  // ─── Regulatory Reports ─────────────────────────────────────────────────

  @Get('regulatory-report')
  @ApiOperation({
    summary: 'Auto-generate regulatory reports: ANS, ANVISA, VIGILANCIA, CRM',
  })
  @ApiQuery({ name: 'type', required: true, description: 'ANS | ANVISA | VIGILANCIA | CRM' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Regulatory report data' })
  async getRegulatoryReports(
    @CurrentTenant() tenantId: string,
    @Query('type') reportType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getRegulatoryReports(tenantId, reportType, { startDate, endDate });
  }

  // ─── Self-Service Analytics ─────────────────────────────────────────────

  @Post('self-service')
  @ApiOperation({
    summary: 'Visual data exploration without SQL: filter by diagnosis, procedure, period, doctor, unit',
  })
  @ApiResponse({ status: 201, description: 'Self-service analytics results', type: SelfServiceAnalyticsResponseDto })
  async getSelfServiceAnalytics(
    @CurrentTenant() tenantId: string,
    @Body() dto: SelfServiceAnalyticsDto,
  ): Promise<SelfServiceAnalyticsResponseDto> {
    return this.service.getSelfServiceAnalytics(tenantId, dto);
  }

  // ─── Population Health ──────────────────────────────────────────────────

  @Post('population-health')
  @ApiOperation({
    summary: 'Population health: cohort analysis, chronic disease management, risk stratification',
  })
  @ApiResponse({ status: 201, description: 'Population health analysis', type: PopulationHealthResponseDto })
  async getPopulationHealth(
    @CurrentTenant() tenantId: string,
    @Body() dto: PopulationHealthDto,
  ): Promise<PopulationHealthResponseDto> {
    return this.service.getPopulationHealth(tenantId, dto);
  }

  // ─── Benchmarking ─────────────────────────────────────────────────────

  @Get('benchmarking')
  @ApiOperation({
    summary: 'Compare quality indicators across units/branches of the network',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'indicator', required: false, description: 'Filter by specific indicator name' })
  @ApiResponse({ status: 200, description: 'Benchmarking comparison', type: BenchmarkingResponseDto })
  async getBenchmarking(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('indicator') indicator?: string,
  ): Promise<BenchmarkingResponseDto> {
    return this.service.getBenchmarking(tenantId, { startDate, endDate, indicator });
  }

  // ─── Clinical Research Cohort ───────────────────────────────────────────

  @Post('research-cohort')
  @ApiOperation({
    summary: 'Identify eligible patients for clinical trials with screening criteria',
  })
  @ApiResponse({ status: 201, description: 'Research cohort results', type: ClinicalResearchCohortResponseDto })
  async getClinicalResearchCohort(
    @CurrentTenant() tenantId: string,
    @Body() dto: ClinicalResearchCohortDto,
  ): Promise<ClinicalResearchCohortResponseDto> {
    return this.service.getClinicalResearchCohort(tenantId, dto);
  }
}
