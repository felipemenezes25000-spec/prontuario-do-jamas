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
import { PopulationHealthService } from './population-health.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Population Health')
@ApiBearerAuth('access-token')
@Controller('population-health')
export class PopulationHealthController {
  constructor(
    private readonly populationHealthService: PopulationHealthService,
  ) {}

  @Get('conditions-summary')
  @ApiOperation({ summary: 'Get patient count per chronic condition' })
  @ApiResponse({ status: 200, description: 'Condition summary list' })
  @ApiQuery({ name: 'ageMin', required: false, type: Number })
  @ApiQuery({ name: 'ageMax', required: false, type: Number })
  @ApiQuery({ name: 'gender', required: false, type: String })
  @ApiQuery({ name: 'diagnosedFrom', required: false, type: String })
  @ApiQuery({ name: 'diagnosedTo', required: false, type: String })
  async getConditionsSummary(
    @CurrentTenant() tenantId: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
    @Query('gender') gender?: string,
    @Query('diagnosedFrom') diagnosedFrom?: string,
    @Query('diagnosedTo') diagnosedTo?: string,
  ) {
    return this.populationHealthService.getConditionsSummary(tenantId, {
      ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
      ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
      gender,
      diagnosedFrom,
      diagnosedTo,
    });
  }

  @Get('patients-by-condition')
  @ApiOperation({ summary: 'Get list of patients with a specific condition' })
  @ApiResponse({ status: 200, description: 'Paginated patient list' })
  @ApiQuery({ name: 'conditionCode', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'ageMin', required: false, type: Number })
  @ApiQuery({ name: 'ageMax', required: false, type: Number })
  @ApiQuery({ name: 'gender', required: false, type: String })
  async getPatientsByCondition(
    @CurrentTenant() tenantId: string,
    @Query('conditionCode') conditionCode: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
    @Query('gender') gender?: string,
  ) {
    return this.populationHealthService.getPatientsByCondition(tenantId, conditionCode, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
      ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
      gender,
    });
  }

  @Get('care-gaps')
  @ApiOperation({ summary: 'Get patients with care gaps (missing exams/appointments)' })
  @ApiResponse({ status: 200, description: 'Paginated care gap list' })
  @ApiQuery({ name: 'conditionCode', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getCareGaps(
    @CurrentTenant() tenantId: string,
    @Query('conditionCode') conditionCode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.populationHealthService.getCareGaps(tenantId, {
      conditionCode,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('risk-stratification')
  @ApiOperation({ summary: 'Get patient risk stratification' })
  @ApiResponse({ status: 200, description: 'Risk stratification data' })
  async getRiskStratification(
    @CurrentTenant() tenantId: string,
  ) {
    return this.populationHealthService.getRiskStratification(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get population health dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data with charts' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.populationHealthService.getDashboard(tenantId);
  }
}
