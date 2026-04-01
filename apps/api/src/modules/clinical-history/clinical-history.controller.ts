import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ClinicalHistoryService } from './clinical-history.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateProblemDto, UpdateProblemDto, ProblemStatus } from './dto/problem-list.dto';
import { CreateHomeMedicationDto, HomeMedStatus } from './dto/home-medications.dto';

/**
 * Facade controller that provides unified /clinical-history/:patientId/* routes.
 * Delegates to the existing sub-services (ProblemList, HomeMedications, etc.).
 */
@ApiTags('Clinical History')
@ApiBearerAuth('access-token')
@Controller('clinical-history')
export class ClinicalHistoryController {
  constructor(private readonly service: ClinicalHistoryService) {}

  // =========================================================================
  // Problems (Problem List)
  // =========================================================================

  @Get(':patientId/problems')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'status', enum: ProblemStatus, required: false })
  @ApiOperation({ summary: 'Get problem list (active/inactive) for patient' })
  @ApiResponse({ status: 200, description: 'Problem list' })
  async getProblems(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status?: ProblemStatus,
  ) {
    return this.service.getProblems(tenantId, patientId, status);
  }

  @Post(':patientId/problems')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add a problem to the patient problem list' })
  @ApiResponse({ status: 201, description: 'Problem created' })
  async addProblem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateProblemDto,
  ) {
    return this.service.addProblem(tenantId, patientId, dto, user.sub);
  }

  @Patch(':patientId/problems/:problemId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiParam({ name: 'problemId', description: 'Problem UUID' })
  @ApiOperation({ summary: 'Update problem status (active, resolved, chronic, etc.)' })
  @ApiResponse({ status: 200, description: 'Problem updated' })
  async updateProblem(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
    @Body() dto: UpdateProblemDto,
  ) {
    return this.service.updateProblem(tenantId, patientId, problemId, dto);
  }

  // =========================================================================
  // Medications (Home Medications)
  // =========================================================================

  @Get(':patientId/medications')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'status', enum: HomeMedStatus, required: false })
  @ApiOperation({ summary: 'Get home medications for patient' })
  @ApiResponse({ status: 200, description: 'Medication list' })
  async getMedications(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status?: HomeMedStatus,
  ) {
    return this.service.getMedications(tenantId, patientId, status);
  }

  @Post(':patientId/medications')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add a home medication' })
  @ApiResponse({ status: 201, description: 'Medication added' })
  async addMedication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateHomeMedicationDto,
  ) {
    return this.service.addMedication(tenantId, patientId, dto, user.sub);
  }

  // =========================================================================
  // Timeline
  // =========================================================================

  @Get(':patientId/timeline')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max events (default 100)' })
  @ApiOperation({ summary: 'Get visual clinical timeline of all events' })
  @ApiResponse({ status: 200, description: 'Clinical timeline' })
  async getTimeline(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTimeline(tenantId, patientId, { from, to, limit: limit ? parseInt(limit, 10) : undefined });
  }

  // =========================================================================
  // Obstetric History
  // =========================================================================

  @Get(':patientId/obstetric')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get obstetric history (GPAC)' })
  @ApiResponse({ status: 200, description: 'Obstetric history' })
  async getObstetricHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getObstetricHistory(tenantId, patientId);
  }

  // =========================================================================
  // Transfusion History
  // =========================================================================

  @Get(':patientId/transfusions')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get transfusion history' })
  @ApiResponse({ status: 200, description: 'Transfusion list' })
  async getTransfusions(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getTransfusions(tenantId, patientId);
  }

  // =========================================================================
  // Implanted Devices
  // =========================================================================

  @Get(':patientId/devices')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get implanted devices' })
  @ApiResponse({ status: 200, description: 'Device list' })
  async getDevices(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getDevices(tenantId, patientId);
  }
}
