import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QualityMeasuresService } from './quality-measures.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';

@ApiTags('Analytics — Quality Measures')
@ApiBearerAuth('access-token')
@Controller('analytics/quality')
export class QualityMeasuresController {
  constructor(private readonly service: QualityMeasuresService) {}

  @Get('infection-rate')
  @ApiOperation({ summary: 'Hospital infection rate' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Infection rate data' })
  async getInfectionRate(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getInfectionRate(tenantId, { startDate, endDate });
  }

  @Get('mortality')
  @ApiOperation({ summary: 'Mortality indicators' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Mortality data' })
  async getMortalityIndicators(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getMortalityIndicators(tenantId, { startDate, endDate });
  }

  @Get('readmission')
  @ApiOperation({ summary: '30-day readmission rate' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'days', required: false, description: 'Readmission window (default 30)' })
  @ApiResponse({ status: 200, description: 'Readmission rate data' })
  async getReadmissionRate(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
  ) {
    return this.service.getReadmissionRate(tenantId, {
      startDate,
      endDate,
      days: days ? parseInt(days, 10) : undefined,
    });
  }

  @Get('los')
  @ApiOperation({ summary: 'Length of stay analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'LOS data' })
  async getLengthOfStay(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getLengthOfStay(tenantId, { startDate, endDate });
  }

  @Get('protocol-compliance')
  @ApiOperation({ summary: 'Protocol compliance rates' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Protocol compliance data' })
  async getProtocolCompliance(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getProtocolCompliance(tenantId, { startDate, endDate });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Quality dashboard — all indicators combined' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Quality dashboard data' })
  async getQualityDashboard(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getQualityDashboard(tenantId, { startDate, endDate });
  }
}
