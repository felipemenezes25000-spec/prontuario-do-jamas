import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { SelfServiceAnalyticsService } from './self-service-analytics.service';
import {
  ExecuteQueryDto,
  SaveQueryDto,
  DimensionDto,
  MeasureDto,
  QueryResultResponseDto,
  SavedQueryResponseDto,
} from './dto/self-service-analytics.dto';

@ApiTags('Analytics — Self-Service Explorer')
@ApiBearerAuth('access-token')
@Controller('analytics/explorer')
export class SelfServiceAnalyticsController {
  constructor(private readonly analyticsService: SelfServiceAnalyticsService) {}

  @Post('query')
  @ApiOperation({ summary: 'Execute visual data query' })
  @ApiResponse({ status: 201, type: QueryResultResponseDto })
  async executeQuery(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExecuteQueryDto,
  ): Promise<QueryResultResponseDto> {
    return this.analyticsService.executeQuery(
      tenantId, dto.dimensions, dto.measures, dto.filters, dto.fromDate, dto.toDate, dto.limit,
    );
  }

  @Get('dimensions')
  @ApiOperation({ summary: 'Get available dimensions for querying' })
  @ApiResponse({ status: 200, type: [DimensionDto] })
  async getDimensions(@CurrentTenant() tenantId: string): Promise<DimensionDto[]> {
    return this.analyticsService.getDimensions(tenantId);
  }

  @Get('measures')
  @ApiOperation({ summary: 'Get available measures for querying' })
  @ApiResponse({ status: 200, type: [MeasureDto] })
  async getMeasures(@CurrentTenant() tenantId: string): Promise<MeasureDto[]> {
    return this.analyticsService.getMeasures(tenantId);
  }

  @Post('save')
  @ApiOperation({ summary: 'Save a query for reuse' })
  @ApiResponse({ status: 201, type: SavedQueryResponseDto })
  async saveQuery(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: SaveQueryDto,
  ): Promise<SavedQueryResponseDto> {
    return this.analyticsService.saveQuery(tenantId, user.sub, dto.name, dto.query, dto.description);
  }

  @Get('saved')
  @ApiOperation({ summary: 'List saved queries' })
  @ApiResponse({ status: 200, type: [SavedQueryResponseDto] })
  async getSavedQueries(@CurrentTenant() tenantId: string): Promise<SavedQueryResponseDto[]> {
    return this.analyticsService.getSavedQueries(tenantId);
  }
}
