import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('patients')
  @ApiOperation({ summary: 'Full-text search for patients' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'insuranceProvider', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Comma-separated tags',
  })
  async searchPatients(
    @CurrentTenant() tenantId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('insuranceProvider') insuranceProvider?: string,
    @Query('gender') gender?: string,
    @Query('tags') tags?: string,
  ) {
    const filters: Record<string, any> = {};
    if (insuranceProvider) filters.insuranceProvider = insuranceProvider;
    if (gender) filters.gender = gender;
    if (tags) filters.tags = tags.split(',').map((t) => t.trim());

    return this.searchService.searchPatients(tenantId, q || '', {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      filters,
    });
  }

  @Get('notes')
  @ApiOperation({ summary: 'Full-text search for clinical notes' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'authorId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'ISO date' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Note type filter',
  })
  async searchNotes(
    @CurrentTenant() tenantId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('patientId') patientId?: string,
    @Query('authorId') authorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
  ) {
    return this.searchService.searchNotes(tenantId, q || '', {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      patientId,
      authorId,
      dateFrom,
      dateTo,
      type,
    });
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Elasticsearch health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async health() {
    const healthy = await this.searchService.isHealthy();
    return { elasticsearch: healthy ? 'connected' : 'unavailable' };
  }
}
