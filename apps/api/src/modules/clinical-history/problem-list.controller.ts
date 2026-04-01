import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { ProblemListService } from './problem-list.service';
import { CreateProblemDto, UpdateProblemDto, ProblemStatus } from './dto/problem-list.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Problem List')
@ApiBearerAuth('access-token')
@Controller('patients/:patientId/problems')
export class ProblemListController {
  constructor(private readonly service: ProblemListService) {}

  @Post()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Add a problem to the patient problem list (ICD-10 linked)' })
  @ApiResponse({ status: 201, description: 'Problem created' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateProblemDto,
  ) {
    return this.service.create(tenantId, patientId, dto, user.sub);
  }

  @Get()
  @ApiParam({ name: 'patientId' })
  @ApiQuery({ name: 'status', enum: ProblemStatus, required: false })
  @ApiOperation({ summary: 'List patient problems — filter by status (ACTIVE, CHRONIC, RESOLVED, etc.)' })
  @ApiResponse({ status: 200, description: 'Problem list' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status?: ProblemStatus,
  ) {
    return this.service.findAll(tenantId, patientId, status);
  }

  @Get(':problemId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'problemId' })
  @ApiOperation({ summary: 'Get a single problem entry' })
  @ApiResponse({ status: 200, description: 'Problem detail' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
  ) {
    return this.service.findOne(tenantId, patientId, problemId);
  }

  @Patch(':problemId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'problemId' })
  @ApiOperation({ summary: 'Update a problem (status, resolution date, notes, etc.)' })
  @ApiResponse({ status: 200, description: 'Problem updated' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
    @Body() dto: UpdateProblemDto,
  ) {
    return this.service.update(tenantId, patientId, problemId, dto);
  }

  @Delete(':problemId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'problemId' })
  @ApiOperation({ summary: 'Delete a problem entry' })
  @ApiResponse({ status: 200, description: 'Problem deleted' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
  ) {
    return this.service.remove(tenantId, patientId, problemId);
  }
}
