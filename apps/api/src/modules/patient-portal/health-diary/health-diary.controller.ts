import {
  Controller,
  Get,
  Post,
  Delete,
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
import { HealthDiaryService } from './health-diary.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { AddDiaryEntryDto } from './health-diary.dto';

@ApiTags('Patient Portal — Health Diary')
@ApiBearerAuth('access-token')
@Controller('patient-portal/health-diary')
export class HealthDiaryController {
  constructor(private readonly service: HealthDiaryService) {}

  @Post()
  @ApiOperation({ summary: 'Add a health diary entry' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  async addEntry(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddDiaryEntryDto,
  ) {
    return this.service.addEntry(tenantId, user.email, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List health diary entries' })
  @ApiQuery({ name: 'entryType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Paginated diary entries' })
  async listEntries(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('entryType') entryType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listEntries(tenantId, user.email, {
      entryType,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get trend data for a diary metric' })
  @ApiQuery({ name: 'entryType', required: true })
  @ApiQuery({ name: 'field', required: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, description: 'Trend data points' })
  async getTrendData(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('entryType') entryType: string,
    @Query('field') field: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getTrendData(tenantId, user.email, entryType, field, dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get diary entry detail' })
  @ApiParam({ name: 'id', description: 'Entry UUID' })
  @ApiResponse({ status: 200, description: 'Entry detail' })
  async getEntryDetail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getEntryDetail(tenantId, user.email, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete diary entry' })
  @ApiParam({ name: 'id', description: 'Entry UUID' })
  @ApiResponse({ status: 200, description: 'Entry deleted' })
  async deleteEntry(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteEntry(tenantId, user.email, id);
  }

  @Get('doctor-view/:patientId')
  @ApiOperation({ summary: 'Doctor view of patient diary entries' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'entryType', required: false })
  @ApiResponse({ status: 200, description: 'Patient diary entries for clinical review' })
  async getDoctorView(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('entryType') entryType?: string,
  ) {
    return this.service.getDoctorView(tenantId, patientId, entryType);
  }
}
