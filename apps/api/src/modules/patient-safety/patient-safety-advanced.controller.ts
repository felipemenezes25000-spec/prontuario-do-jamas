import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PatientSafetyAdvancedService } from './patient-safety-advanced.service';
import {
  AdverseEventDto,
  NearMissDto,
  PositiveIdDto,
  AllergyAlertDto,
  InvasiveProcedureTimeoutDto,
  RootCauseAnalysisDto,
  EventClassificationDto,
  DeviceTrackingDto,
  SafetyDashboardQueryDto,
  VteProphylaxisDto,
  SsiPreventionDto,
} from './dto/patient-safety-advanced.dto';

@ApiTags('Patient Safety — Advanced')
@ApiBearerAuth('access-token')
@Controller('patient-safety')
export class PatientSafetyAdvancedController {
  constructor(private readonly service: PatientSafetyAdvancedService) {}

  // =========================================================================
  // Adverse Events
  // =========================================================================

  @Post('adverse-event')
  @ApiOperation({ summary: 'Report adverse event (type, severity, NCC MERP harm category A–I)' })
  @ApiResponse({ status: 201, description: 'Adverse event reported — NOTIVISA flag for severe/death' })
  async reportAdverseEvent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdverseEventDto,
  ) {
    return this.service.reportAdverseEvent(tenantId, user.sub, dto);
  }

  @Get('adverse-events')
  @ApiOperation({ summary: 'List adverse events for tenant' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Max records (default 50)' })
  async listAdverseEvents(
    @CurrentTenant() tenantId: string,
    @Query('take') take?: string,
  ) {
    return this.service.listEventsByType(tenantId, '[PATIENT_SAFETY:ADVERSE_EVENT]', take ? parseInt(take, 10) : 50);
  }

  // =========================================================================
  // Near-Miss
  // =========================================================================

  @Post('near-miss')
  @ApiOperation({ summary: 'Report near-miss (no-blame culture, intercepted error)' })
  @ApiResponse({ status: 201, description: 'Near-miss recorded' })
  async reportNearMiss(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NearMissDto,
  ) {
    return this.service.reportNearMiss(tenantId, user.sub, dto);
  }

  @Get('near-misses')
  @ApiOperation({ summary: 'List near-miss reports for tenant' })
  async listNearMisses(@CurrentTenant() tenantId: string) {
    return this.service.listEventsByType(tenantId, '[PATIENT_SAFETY:NEAR_MISS]');
  }

  // =========================================================================
  // Positive Patient Identification
  // =========================================================================

  @Post('positive-id')
  @ApiOperation({ summary: 'Record positive patient identification (2 identifiers before any procedure)' })
  @ApiResponse({ status: 201, description: 'Positive ID check recorded' })
  async recordPositiveId(
    @CurrentTenant() tenantId: string,
    @Body() dto: PositiveIdDto,
  ) {
    return this.service.recordPositiveIdentification(tenantId, dto);
  }

  // =========================================================================
  // Allergy Visual Signaling
  // =========================================================================

  @Post('allergy-alert')
  @ApiOperation({ summary: 'Configure allergy visual alert (red header, popup on prescription, wristband link)' })
  @ApiResponse({ status: 201, description: 'Allergy alert configured' })
  async configureAllergyAlert(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AllergyAlertDto,
  ) {
    return this.service.configureAllergyAlert(tenantId, user.sub, dto);
  }

  @Get('allergy-alert/:patientId')
  @ApiOperation({ summary: 'Get active allergy alerts for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getAllergyAlerts(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getActiveAllergyAlerts(tenantId, patientId);
  }

  // =========================================================================
  // Invasive Procedure Timeout
  // =========================================================================

  @Post('procedure-timeout')
  @ApiOperation({ summary: 'Record invasive procedure timeout (biopsy, CVC, chest drain, LP, etc.)' })
  @ApiResponse({ status: 201, description: 'Timeout checklist recorded with compliance status' })
  async recordProcedureTimeout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InvasiveProcedureTimeoutDto,
  ) {
    return this.service.recordProcedureTimeout(tenantId, user.sub, dto);
  }

  // =========================================================================
  // Root Cause Analysis
  // =========================================================================

  @Post('rca')
  @ApiOperation({ summary: 'Create Root Cause Analysis (Ishikawa, 5-Whys, corrective actions)' })
  @ApiResponse({ status: 201, description: 'RCA recorded with open action count' })
  async createRca(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RootCauseAnalysisDto,
  ) {
    return this.service.createRootCauseAnalysis(tenantId, user.sub, dto);
  }

  @Get('rca')
  @ApiOperation({ summary: 'List all RCAs for tenant' })
  async listRcas(@CurrentTenant() tenantId: string) {
    return this.service.listEventsByType(tenantId, '[PATIENT_SAFETY:RCA]');
  }

  // =========================================================================
  // Event Classification (WHO + NCC MERP)
  // =========================================================================

  @Post('classify-event')
  @ApiOperation({ summary: 'Classify adverse event using WHO taxonomy and NCC MERP A–I categories' })
  @ApiResponse({ status: 201, description: 'Event classified' })
  async classifyEvent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EventClassificationDto,
  ) {
    return this.service.classifyEvent(tenantId, user.sub, dto);
  }

  // =========================================================================
  // Medical Device Tracking & Recall
  // =========================================================================

  @Post('device-tracking')
  @ApiOperation({ summary: 'Register medical device (implant, equipment) with ANVISA registry + recall status' })
  @ApiResponse({ status: 201, description: 'Device tracked — recall alert if applicable' })
  async trackDevice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeviceTrackingDto,
  ) {
    return this.service.trackDevice(tenantId, user.sub, dto);
  }

  @Get('device-tracking/:patientId')
  @ApiOperation({ summary: 'Get tracked devices for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getDevices(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getDevicesByPatient(tenantId, patientId);
  }

  // =========================================================================
  // Safety Indicators Dashboard
  // =========================================================================

  @Post('dashboard')
  @ApiOperation({ summary: 'Safety indicators dashboard (falls, pressure injuries, SSI, medication errors per 1000 patient-days)' })
  @ApiResponse({ status: 200, description: 'Dashboard with safety indicators and benchmarks' })
  async getSafetyDashboard(
    @CurrentTenant() tenantId: string,
    @Body() dto: SafetyDashboardQueryDto,
  ) {
    return this.service.getSafetyDashboard(tenantId, dto);
  }

  // =========================================================================
  // VTE Prophylaxis
  // =========================================================================

  @Post('vte-prophylaxis')
  @ApiOperation({ summary: 'Record VTE prophylaxis (Caprini/Padua risk score, alert if not prescribed)' })
  @ApiResponse({ status: 201, description: 'VTE prophylaxis recorded with risk classification' })
  async recordVteProphylaxis(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: VteProphylaxisDto,
  ) {
    return this.service.recordVteProphylaxis(tenantId, user.sub, dto);
  }

  @Get('vte-prophylaxis/:patientId')
  @ApiOperation({ summary: 'Get VTE prophylaxis records for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getVteProphylaxis(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) _patientId: string,
  ) {
    return this.service.listEventsByType(tenantId, '[PATIENT_SAFETY:VTE]');
  }

  // =========================================================================
  // SSI Prevention
  // =========================================================================

  @Post('ssi-prevention')
  @ApiOperation({ summary: 'Record SSI prevention checklist (ABX timing, normothermia, glycemic control, trichotomy)' })
  @ApiResponse({ status: 201, description: 'SSI prevention recorded with compliance score' })
  async recordSsiPrevention(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SsiPreventionDto,
  ) {
    return this.service.recordSsiPrevention(tenantId, user.sub, dto);
  }

  @Get('ssi-prevention')
  @ApiOperation({ summary: 'List SSI prevention records for tenant' })
  async listSsiPrevention(@CurrentTenant() tenantId: string) {
    return this.service.listEventsByType(tenantId, '[PATIENT_SAFETY:SSI]');
  }

  // =========================================================================
  // Unified Incident Endpoints (facade over adverse events + near-misses)
  // =========================================================================

  @Post('incidents')
  @ApiOperation({ summary: 'Report an incident (adverse event or near-miss)' })
  @ApiResponse({ status: 201, description: 'Incident reported' })
  async reportIncident(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdverseEventDto,
  ) {
    return this.service.reportAdverseEvent(tenantId, user.sub, dto);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'List all safety incidents with optional filters' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by incident type (ADVERSE_EVENT or NEAR_MISS)' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Max records (default 50)' })
  async listIncidents(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
  ) {
    return this.service.listIncidents(tenantId, type, take ? parseInt(take, 10) : 50);
  }

  @Get('incidents/:incidentId')
  @ApiParam({ name: 'incidentId', description: 'Incident UUID' })
  @ApiOperation({ summary: 'Get incident detail by ID' })
  @ApiResponse({ status: 200, description: 'Incident detail' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async getIncident(
    @CurrentTenant() tenantId: string,
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
  ) {
    return this.service.getIncidentById(tenantId, incidentId);
  }

  @Post('incidents/:incidentId/rca')
  @ApiParam({ name: 'incidentId', description: 'Incident UUID to attach RCA to' })
  @ApiOperation({ summary: 'Create Root Cause Analysis linked to a specific incident' })
  @ApiResponse({ status: 201, description: 'RCA created and linked to incident' })
  async createIncidentRca(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
    @Body() dto: RootCauseAnalysisDto,
  ) {
    // Override eventId with the URL param to ensure linkage
    dto.eventId = incidentId;
    return this.service.createRootCauseAnalysis(tenantId, user.sub, dto);
  }

  // =========================================================================
  // Safety Dashboard (GET variant)
  // =========================================================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Safety indicators dashboard (GET with query params)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date YYYY-MM-DD' })
  @ApiQuery({ name: 'unit', required: false, description: 'Unit/ward filter' })
  @ApiResponse({ status: 200, description: 'Safety dashboard' })
  async getSafetyDashboardGet(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('unit') unit?: string,
  ) {
    return this.service.getSafetyDashboard(tenantId, { startDate, endDate, unit });
  }

  // =========================================================================
  // Quality/Safety KPIs
  // =========================================================================

  @Get('indicators')
  @ApiOperation({ summary: 'Quality and safety KPIs — real-time summary indicators' })
  @ApiResponse({ status: 200, description: 'Safety KPIs' })
  async getIndicators(@CurrentTenant() tenantId: string) {
    return this.service.getIndicators(tenantId);
  }
}
