import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { EnhancedAnalyticsService } from './enhanced-analytics.service';

@ApiTags('Analytics — Enhanced')
@ApiBearerAuth('access-token')
@Controller('analytics/enhanced')
export class EnhancedAnalyticsController {
  constructor(private readonly service: EnhancedAnalyticsService) {}

  @Get('process-care')
  @ApiOperation({ summary: 'Process care indicators (protocol compliance, door-to-needle, ATB timing, VTE)' })
  @ApiQuery({ name: 'startDate', required: false }) @ApiQuery({ name: 'endDate', required: false })
  async processCare(
    @CurrentTenant() t: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getProcessCareIndicators(t, { startDate, endDate });
  }

  @Get('ccih')
  @ApiOperation({ summary: 'CCIH dashboard (infection density, organisms, resistance, device utilization)' })
  @ApiQuery({ name: 'startDate', required: false }) @ApiQuery({ name: 'endDate', required: false })
  async ccih(
    @CurrentTenant() t: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getCcihDashboard(t, { startDate, endDate });
  }

  @Get('regulatory-report')
  @ApiOperation({ summary: 'Generate regulatory report (ANS, ANVISA, VIGILANCIA, CRM)' })
  @ApiQuery({ name: 'type', required: true, description: 'ANS | ANVISA | VIGILANCIA | CRM' })
  @ApiQuery({ name: 'startDate', required: false }) @ApiQuery({ name: 'endDate', required: false })
  async regulatoryReport(
    @CurrentTenant() t: string,
    @Query('type') reportType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.generateRegulatoryReport(t, reportType, { startDate, endDate });
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'AI anomaly detection in quality indicators' })
  async anomalies(@CurrentTenant() t: string) {
    return this.service.detectAnomalies(t);
  }

  @Get('demand-prediction')
  @ApiOperation({ summary: 'AI demand prediction (ED, admissions, OR for next N days)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async demandPrediction(
    @CurrentTenant() t: string,
    @Query('days') days?: string,
  ) {
    return this.service.predictDemand(t, days ? parseInt(days, 10) : 7);
  }

  @Get('accreditation')
  @ApiOperation({ summary: 'Accreditation indicators (ONA, JCI, AHRQ)' })
  @ApiQuery({ name: 'framework', required: true, description: 'ONA | JCI | AHRQ' })
  async accreditation(
    @CurrentTenant() t: string,
    @Query('framework') framework: string,
  ) {
    return this.service.getAccreditationIndicators(t, framework);
  }
}
