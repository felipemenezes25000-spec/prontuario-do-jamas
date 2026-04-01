import {
  Controller,
  Get,
  Post,
  Patch,
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
import { EmergencyService } from './emergency.service';
import { CreateTriageDto, UpdateEmergencyStatusDto, ActivateProtocolDto } from './dto/create-triage.dto';
import { ReclassifyRiskDto, CalculateNedocsDto } from './dto/emergency-advanced.dto';
import {
  ManageQueueDto,
  CreateFastTrackDto,
  ActivateCodeStrokeDto,
  ActivateCodeSTEMIDto,
  ActivateCodeSepsisDto,
  ActivateCodeTraumaDto,
  ActivateCodeBlueDto,
  CreateChestPainProtocolDto,
  CreateObservationUnitDto,
  CreateEmergencyHandoffDto,
} from './dto/emergency-protocols.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Emergency')
@ApiBearerAuth('access-token')
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  // ─── Existing Endpoints ───────────────────────────────────────────────────

  @Post('triage')
  @ApiOperation({ summary: 'Create triage with Manchester protocol + door-time tracking' })
  @ApiResponse({ status: 201, description: 'Triage created' })
  async createTriage(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTriageDto,
  ) {
    return this.emergencyService.createTriage(tenantId, dto);
  }

  @Get('board')
  @ApiOperation({ summary: 'Patient flow board (waiting, in-treatment, observation)' })
  @ApiResponse({ status: 200, description: 'Emergency board' })
  async getBoard(@CurrentTenant() tenantId: string) {
    return this.emergencyService.getBoard(tenantId);
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Update patient status in PS' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyStatusDto,
  ) {
    return this.emergencyService.updateStatus(tenantId, id, dto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Door-to-doctor time, occupancy, wait times' })
  @ApiResponse({ status: 200, description: 'Emergency metrics' })
  async getMetrics(@CurrentTenant() tenantId: string) {
    return this.emergencyService.getMetrics(tenantId);
  }

  @Post(':id/protocol')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Activate AVC/IAM/SEPSIS protocol' })
  @ApiResponse({ status: 201, description: 'Protocol activated' })
  async activateProtocol(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateProtocolDto,
  ) {
    return this.emergencyService.activateProtocol(tenantId, id, dto);
  }

  @Post(':id/reclassify')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Reclassify Manchester triage level with justification and audit trail' })
  @ApiResponse({ status: 200, description: 'Risk reclassified' })
  async reclassifyRisk(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyRiskDto,
  ) {
    return this.emergencyService.reclassifyRisk(tenantId, id, dto);
  }

  @Post(':id/fast-track')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Divert green/blue patient to Fast Track lane' })
  @ApiResponse({ status: 200, description: 'Fast Track assigned' })
  async assignFastTrack(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emergencyService.assignFastTrack(tenantId, id);
  }

  @Post('nedocs')
  @ApiOperation({ summary: 'Calculate NEDOCS overcrowding score' })
  @ApiResponse({ status: 201, description: 'NEDOCS score calculated' })
  async calculateNedocs(
    @CurrentTenant() tenantId: string,
    @Body() dto: CalculateNedocsDto,
  ) {
    return this.emergencyService.calculateNedocs(tenantId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENHANCED EMERGENCY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Tracking Board ───────────────────────────────────────────────────────

  @Get('tracking-board')
  @ApiOperation({ summary: 'Real-time patient tracking board with column status' })
  @ApiResponse({ status: 200, description: 'Tracking board with waiting, triage, treatment, observation, discharge columns' })
  async getTrackingBoard(@CurrentTenant() tenantId: string) {
    return this.emergencyService.getTrackingBoard(tenantId);
  }

  // ─── Door-to-X Metrics ────────────────────────────────────────────────────

  @Get('door-metrics')
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date ISO' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date ISO' })
  @ApiOperation({ summary: 'Door-to-X times: triage, doctor, needle (AVC), balloon (STEMI)' })
  @ApiResponse({ status: 200, description: 'Door metrics' })
  async getDoorMetrics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.emergencyService.getDoorMetrics(tenantId, { startDate, endDate });
  }

  // ─── Queue Management ─────────────────────────────────────────────────────

  @Post('queue')
  @ApiOperation({ summary: 'Queue management: generate ticket, call next, recall, skip' })
  @ApiResponse({ status: 201, description: 'Queue action processed' })
  async manageQueue(
    @CurrentTenant() tenantId: string,
    @Body() dto: ManageQueueDto,
  ) {
    return this.emergencyService.manageQueue(tenantId, dto);
  }

  // ─── Fast Track (with DTO) ────────────────────────────────────────────────

  @Post('fast-track')
  @ApiOperation({ summary: 'Create Fast Track entry for green/blue patients' })
  @ApiResponse({ status: 201, description: 'Fast track created' })
  async createFastTrack(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateFastTrackDto,
  ) {
    return this.emergencyService.createFastTrack(tenantId, dto);
  }

  // ─── Code Stroke (AVC) ────────────────────────────────────────────────────

  @Post('code-stroke')
  @ApiOperation({ summary: 'Activate AVC protocol: NIHSS, rt-PA criteria, thrombectomy checklist' })
  @ApiResponse({ status: 201, description: 'Code Stroke activated' })
  async activateCodeStroke(
    @CurrentTenant() tenantId: string,
    @Body() dto: ActivateCodeStrokeDto,
  ) {
    return this.emergencyService.activateCodeStroke(tenantId, dto);
  }

  // ─── Code STEMI ───────────────────────────────────────────────────────────

  @Post('code-stemi')
  @ApiOperation({ summary: 'Activate STEMI protocol: ECG <10min, cath lab, door-to-balloon, KILLIP, TIMI' })
  @ApiResponse({ status: 201, description: 'Code STEMI activated' })
  async activateCodeSTEMI(
    @CurrentTenant() tenantId: string,
    @Body() dto: ActivateCodeSTEMIDto,
  ) {
    return this.emergencyService.activateCodeSTEMI(tenantId, dto);
  }

  // ─── Code Sepsis ──────────────────────────────────────────────────────────

  @Post('code-sepsis')
  @ApiOperation({ summary: 'Activate Sepsis protocol: qSOFA/SOFA auto-calc, 1h bundle compliance' })
  @ApiResponse({ status: 201, description: 'Code Sepsis activated' })
  async activateCodeSepsis(
    @CurrentTenant() tenantId: string,
    @Body() dto: ActivateCodeSepsisDto,
  ) {
    return this.emergencyService.activateCodeSepsis(tenantId, dto);
  }

  // ─── Code Trauma ──────────────────────────────────────────────────────────

  @Post('code-trauma')
  @ApiOperation({ summary: 'Activate Trauma protocol: ABCDE, FAST, ISS, RTS, TRISS with timestamps' })
  @ApiResponse({ status: 201, description: 'Code Trauma activated' })
  async activateCodeTrauma(
    @CurrentTenant() tenantId: string,
    @Body() dto: ActivateCodeTraumaDto,
  ) {
    return this.emergencyService.activateCodeTrauma(tenantId, dto);
  }

  // ─── Code Blue (Cardiac Arrest) ───────────────────────────────────────────

  @Post('code-blue')
  @ApiOperation({ summary: 'Activate Code Blue: initial rhythm, CPR cycles, drugs, defib, ROSC (Utstein)' })
  @ApiResponse({ status: 201, description: 'Code Blue activated' })
  async activateCodeBlue(
    @CurrentTenant() tenantId: string,
    @Body() dto: ActivateCodeBlueDto,
  ) {
    return this.emergencyService.activateCodeBlue(tenantId, dto);
  }

  // ─── Chest Pain Protocol ──────────────────────────────────────────────────

  @Post('chest-pain-protocol')
  @ApiOperation({ summary: 'Chest pain protocol: ECG + serial troponin + HEART/TIMI score, admit vs discharge decision' })
  @ApiResponse({ status: 201, description: 'Chest pain protocol created' })
  async createChestPainProtocol(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateChestPainProtocolDto,
  ) {
    return this.emergencyService.createChestPainProtocol(tenantId, dto);
  }

  // ─── Observation Unit (CDU) ───────────────────────────────────────────────

  @Post('observation-unit')
  @ApiOperation({ summary: 'CDU: <24h observation with timer and mandatory reassessment schedule' })
  @ApiResponse({ status: 201, description: 'Observation unit admission created' })
  async createObservationUnit(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateObservationUnitDto,
  ) {
    return this.emergencyService.createObservationUnit(tenantId, dto);
  }

  // ─── SBAR/I-PASS Handoff ──────────────────────────────────────────────────

  @Post('handoff')
  @ApiOperation({ summary: 'SBAR/I-PASS structured shift handoff' })
  @ApiResponse({ status: 201, description: 'Handoff created' })
  async createHandoff(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateEmergencyHandoffDto,
  ) {
    return this.emergencyService.createHandoff(tenantId, dto);
  }

  // ─── Enhanced NEDOCS ──────────────────────────────────────────────────────

  @Get('nedocs/auto')
  @ApiOperation({ summary: 'Auto-calculate NEDOCS with data from current emergency state' })
  @ApiResponse({ status: 200, description: 'Enhanced NEDOCS data' })
  async calculateEnhancedNEDOCS(@CurrentTenant() tenantId: string) {
    return this.emergencyService.calculateEnhancedNEDOCS(tenantId);
  }
}
