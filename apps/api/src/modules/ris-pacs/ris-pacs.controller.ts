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
import { RisPacsService } from './ris-pacs.service';
import {
  CreateRadiologyOrderDto,
  CreateRadiologyReportDto,
  IncidentalFindingFollowUpDto,
} from './dto/ris-pacs.dto';
import {
  PrepProtocolExamType,
  ArchiveStudyDto,
  Request3DReconstructionDto,
  RequestTeleradiologyDto,
} from './dto/ris-pacs-advanced.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('RIS/PACS — Radiology')
@ApiBearerAuth('access-token')
@Controller('ris-pacs')
export class RisPacsController {
  constructor(private readonly risPacsService: RisPacsService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Create radiology order' })
  @ApiResponse({ status: 201, description: 'Radiology order created' })
  async createOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRadiologyOrderDto,
  ) {
    return this.risPacsService.createOrder(tenantId, user.sub, dto);
  }

  @Get('worklist')
  @ApiOperation({ summary: 'DICOM Modality Worklist' })
  @ApiQuery({ name: 'modality', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: 200, description: 'Radiology worklist' })
  async getWorklist(
    @CurrentTenant() tenantId: string,
    @Query('modality') modality?: string,
    @Query('date') date?: string,
  ) {
    return this.risPacsService.getWorklist(tenantId, modality, date);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Create structured radiology report' })
  @ApiResponse({ status: 201, description: 'Report created' })
  async createReport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRadiologyReportDto,
  ) {
    return this.risPacsService.createReport(tenantId, user.sub, dto);
  }

  @Get('reports/:id')
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiOperation({ summary: 'Get radiology report with template' })
  @ApiResponse({ status: 200, description: 'Radiology report' })
  async getReport(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.risPacsService.getReport(tenantId, id);
  }

  @Post('findings/:id/follow-up')
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiOperation({ summary: 'Create follow-up for incidental finding' })
  @ApiResponse({ status: 201, description: 'Follow-up created' })
  async addFollowUp(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IncidentalFindingFollowUpDto,
  ) {
    return this.risPacsService.addFollowUp(tenantId, id, dto);
  }

  @Get('viewer/:studyId')
  @ApiParam({ name: 'studyId', description: 'Study Instance UID or order ID' })
  @ApiOperation({ summary: 'Get DICOM viewer metadata' })
  @ApiResponse({ status: 200, description: 'Viewer metadata' })
  async getViewerMetadata(
    @CurrentTenant() tenantId: string,
    @Param('studyId') studyId: string,
  ) {
    return this.risPacsService.getViewerMetadata(tenantId, studyId);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Patient imaging history' })
  @ApiResponse({ status: 200, description: 'Imaging history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.risPacsService.getPatientImagingHistory(tenantId, patientId);
  }

  // ─── Prep Protocols ───────────────────────────────────────────────────────

  @Get('prep-protocol/:examType')
  @ApiParam({ name: 'examType', description: 'Exam type', enum: PrepProtocolExamType })
  @ApiOperation({ summary: 'Get patient prep protocol for a specific exam type' })
  @ApiResponse({ status: 200, description: 'Prep protocol' })
  async getPrepProtocol(
    @CurrentTenant() tenantId: string,
    @Param('examType') examType: PrepProtocolExamType,
  ) {
    return this.risPacsService.getPrepProtocol(tenantId, examType);
  }

  // ─── PACS Archive Lifecycle ───────────────────────────────────────────────

  @Post('archive/:studyId')
  @ApiParam({ name: 'studyId', description: 'Study/Order UUID' })
  @ApiOperation({ summary: 'Archive a study to NEARLINE or OFFLINE storage' })
  @ApiResponse({ status: 201, description: 'Study archived' })
  async archiveStudy(
    @CurrentTenant() tenantId: string,
    @Param('studyId', ParseUUIDPipe) studyId: string,
    @Body() dto: ArchiveStudyDto,
  ) {
    return this.risPacsService.archiveStudy(tenantId, studyId, dto);
  }

  @Post('archive/:studyId/retrieve')
  @ApiParam({ name: 'studyId', description: 'Study/Order UUID' })
  @ApiOperation({ summary: 'Retrieve an archived study back to ONLINE' })
  @ApiResponse({ status: 200, description: 'Study retrieved' })
  async retrieveStudy(
    @CurrentTenant() tenantId: string,
    @Param('studyId', ParseUUIDPipe) studyId: string,
  ) {
    return this.risPacsService.retrieveStudy(tenantId, studyId);
  }

  // ─── 3D Reconstruction ────────────────────────────────────────────────────

  @Post('3d/:studyId')
  @ApiParam({ name: 'studyId', description: 'Study/Order UUID (CT or MR only)' })
  @ApiOperation({ summary: 'Request 3D reconstruction (VRT, MIP, MPR, CPR, Cinematic)' })
  @ApiResponse({ status: 201, description: '3D reconstruction queued' })
  async request3DReconstruction(
    @CurrentTenant() tenantId: string,
    @Param('studyId', ParseUUIDPipe) studyId: string,
    @Body() dto: Request3DReconstructionDto,
  ) {
    return this.risPacsService.request3DReconstruction(tenantId, studyId, dto);
  }

  // ─── Tele-radiology ───────────────────────────────────────────────────────

  @Post('teleradiology/:studyId')
  @ApiParam({ name: 'studyId', description: 'Study/Order UUID' })
  @ApiOperation({ summary: 'Request remote reading via tele-radiology' })
  @ApiResponse({ status: 201, description: 'Tele-radiology request sent' })
  async requestTeleradiology(
    @CurrentTenant() tenantId: string,
    @Param('studyId', ParseUUIDPipe) studyId: string,
    @Body() dto: RequestTeleradiologyDto,
  ) {
    return this.risPacsService.requestTeleradiology(tenantId, studyId, dto);
  }
}
