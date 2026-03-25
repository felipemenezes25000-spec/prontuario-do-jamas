import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { DataWarehouseService } from './data-warehouse.service';
import {
  CreateCohortDto,
  CohortsListResponseDto,
  CohortResponseDto,
  LongitudinalAnalysisResponseDto,
  BenchmarkResponseDto,
} from './dto/data-warehouse.dto';

@ApiTags('Analytics — Data Warehouse')
@ApiBearerAuth('access-token')
@Controller('analytics/warehouse')
export class DataWarehouseController {
  constructor(private readonly warehouseService: DataWarehouseService) {}

  @Get('cohorts')
  @ApiOperation({ summary: 'List patient cohorts' })
  @ApiResponse({ status: 200, type: CohortsListResponseDto })
  async listCohorts(@CurrentTenant() tenantId: string): Promise<CohortsListResponseDto> {
    return this.warehouseService.listCohorts(tenantId);
  }

  @Post('cohorts')
  @ApiOperation({ summary: 'Create cohort query' })
  @ApiResponse({ status: 201, type: CohortResponseDto })
  async createCohort(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCohortDto,
  ): Promise<CohortResponseDto> {
    return this.warehouseService.createCohort(tenantId, dto.name, dto.criteria, dto.description);
  }

  @Get('longitudinal/:patientId')
  @ApiOperation({ summary: 'Longitudinal patient analysis' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, type: LongitudinalAnalysisResponseDto })
  async getLongitudinal(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<LongitudinalAnalysisResponseDto> {
    return this.warehouseService.getLongitudinalAnalysis(tenantId, patientId);
  }

  @Get('benchmarks')
  @ApiOperation({ summary: 'Benchmark data compared to national averages' })
  @ApiResponse({ status: 200, type: BenchmarkResponseDto })
  async getBenchmarks(@CurrentTenant() tenantId: string): Promise<BenchmarkResponseDto> {
    return this.warehouseService.getBenchmarks(tenantId);
  }
}
