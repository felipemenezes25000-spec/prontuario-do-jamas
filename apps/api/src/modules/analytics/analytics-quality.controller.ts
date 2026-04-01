import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AnalyticsQualityService } from './analytics-quality.service';
import {
  QualityIndicatorType,
  InfectionSiteType,
  RegulatoryReportType,
} from './dto/analytics-quality.dto';

@ApiTags('Analytics - Quality & Regulatory')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsQualityController {
  constructor(private readonly service: AnalyticsQualityService) {}

  // ─── Quality Indicators ───────────────────────────────────────────────────

  @Get('quality')
  @ApiOperation({
    summary: 'Quality indicators (ONA/JCI/AHRQ): infection, mortality, 30-day readmission, LOS, falls, pressure injuries',
  })
  @ApiQuery({ name: 'indicatorType', required: false, enum: QualityIndicatorType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiResponse({ status: 200, description: 'Quality indicators with benchmarks and alerts' })
  async getQualityIndicators(
    @CurrentTenant() tenantId: string,
    @Query('indicatorType') indicatorType?: QualityIndicatorType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
  ) {
    return this.service.getQualityIndicators(tenantId, {
      indicatorType,
      startDate,
      endDate,
      department,
    });
  }

  // ─── Process Indicators ───────────────────────────────────────────────────

  @Get('quality/process')
  @ApiOperation({
    summary: 'Process indicators: protocol compliance, door-to-needle, prophylactic ABX timing, VTE prophylaxis',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiResponse({ status: 200, description: 'Process indicators with benchmarks' })
  async getProcessIndicators(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
  ) {
    return this.service.getProcessIndicators(tenantId, { startDate, endDate, department });
  }

  // ─── CCIH Infection Control Dashboard ────────────────────────────────────

  @Get('ccih')
  @ApiOperation({
    summary: 'CCIH dashboard: infection density per 1000 device-days, organisms, resistance patterns (SSI, CLABSI, VAP, CAUTI)',
  })
  @ApiQuery({ name: 'siteType', required: false, enum: InfectionSiteType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'unit', required: false })
  @ApiResponse({ status: 200, description: 'CCIH dashboard data' })
  async getCCIHDashboard(
    @CurrentTenant() tenantId: string,
    @Query('siteType') siteType?: InfectionSiteType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('unit') unit?: string,
  ) {
    return this.service.getCCIHDashboard(tenantId, { siteType, startDate, endDate, unit });
  }

  // ─── Regulatory Reports ───────────────────────────────────────────────────

  @Post('regulatory-reports/generate')
  @ApiOperation({
    summary: 'Auto-generate regulatory report: ANS, ANVISA, Vigilância Sanitária, DATASUS/CRM',
  })
  @ApiQuery({ name: 'type', required: true, enum: RegulatoryReportType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 201, description: 'Regulatory report generated' })
  async generateRegulatoryReport(
    @CurrentTenant() tenantId: string,
    @Query('type') type: RegulatoryReportType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.generateRegulatoryReport(tenantId, type, { startDate, endDate });
  }

  @Patch('regulatory-reports/:reportId/submit')
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiOperation({ summary: 'Submit a regulatory report to the corresponding agency' })
  @ApiResponse({ status: 200, description: 'Report submitted' })
  async submitRegulatoryReport(
    @CurrentTenant() tenantId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.service.submitRegulatoryReport(tenantId, reportId);
  }

  @Get('regulatory-reports')
  @ApiOperation({ summary: 'List regulatory reports for the tenant' })
  @ApiQuery({ name: 'type', required: false, enum: RegulatoryReportType })
  @ApiResponse({ status: 200, description: 'List of regulatory reports' })
  async listRegulatoryReports(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: RegulatoryReportType,
  ) {
    return this.service.listRegulatoryReports(tenantId, type);
  }
}
