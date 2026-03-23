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
import { ExamsService } from './exams.service';
import { CreateExamRequestDto } from './dto/create-exam-request.dto';
import { BulkExamRequestDto } from './dto/bulk-exam-request.dto';
import { AddExamResultDto } from './dto/add-exam-result.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Exams')
@ApiBearerAuth('access-token')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Request an exam' })
  @ApiResponse({ status: 201, description: 'Exam requested' })
  async request(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExamRequestDto,
  ) {
    return this.examsService.request(user.sub, dto);
  }

  @Post('request')
  @ApiOperation({ summary: 'Bulk request multiple exams' })
  @ApiResponse({ status: 201, description: 'Exams requested' })
  async bulkRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkExamRequestDto,
  ) {
    return this.examsService.bulkRequest(user.sub, dto);
  }

  @Post(':id/results')
  @ApiParam({ name: 'id', description: 'Exam request UUID' })
  @ApiOperation({ summary: 'Add results to an exam' })
  @ApiResponse({ status: 200, description: 'Results added' })
  async addResults(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddExamResultDto,
  ) {
    return this.examsService.addResults(id, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List exams with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of exams' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.examsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      patientId,
    });
  }

  @Get('catalog')
  @ApiOperation({ summary: 'List exam catalog with optional search' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or code' })
  @ApiQuery({ name: 'examType', required: false, description: 'Filter by exam type' })
  @ApiResponse({ status: 200, description: 'List of catalog exams' })
  async getCatalog(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('examType') examType?: string,
  ) {
    return this.examsService.getCatalog(tenantId, { search, examType });
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending exams' })
  @ApiResponse({ status: 200, description: 'Pending exams' })
  async getPending(@CurrentTenant() tenantId: string) {
    return this.examsService.getPending(tenantId);
  }

  @Get('trending/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'analyte', required: true, description: 'Analyte name to trend' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 10)' })
  @ApiOperation({ summary: 'Get lab result trends for a patient analyte' })
  @ApiResponse({ status: 200, description: 'Trending lab data' })
  async getTrending(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('analyte') analyte: string,
    @Query('limit') limit?: string,
  ) {
    return this.examsService.getTrending(patientId, analyte, limit ? parseInt(limit, 10) : 10);
  }

  @Get('by-patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get exams by patient' })
  @ApiResponse({ status: 200, description: 'Patient exams' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.examsService.findByPatient(patientId);
  }

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get exams by encounter' })
  @ApiResponse({ status: 200, description: 'Encounter exams' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.examsService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Exam request UUID' })
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiResponse({ status: 200, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findById(id);
  }
}
