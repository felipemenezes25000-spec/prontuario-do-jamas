import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IncidentReportingService } from './incident-reporting.service';
import {
  CreateIncidentDto,
  UpdateInvestigationDto,
  UpdateActionPlanDto,
} from './dto/create-incident-reporting.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Incident Reporting')
@ApiBearerAuth('access-token')
@Controller('incident-reporting')
export class IncidentReportingController {
  constructor(private readonly incidentReportingService: IncidentReportingService) {}

  @Post()
  @ApiOperation({ summary: 'Submit incident report (adverse event, near-miss)' })
  @ApiResponse({ status: 201, description: 'Incident reported' })
  async createIncident(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentReportingService.createIncident(tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List incidents with filters' })
  @ApiResponse({ status: 200, description: 'Paginated incident list' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listIncidents(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.incidentReportingService.listIncidents(tenantId, {
      type,
      severity,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get incident dashboard (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@CurrentTenant() tenantId: string) {
    return this.incidentReportingService.getDashboard(tenantId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiOperation({ summary: 'Get incident details' })
  @ApiResponse({ status: 200, description: 'Incident details' })
  async getIncidentById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentReportingService.getIncidentById(tenantId, id);
  }

  @Patch(':id/investigation')
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiOperation({ summary: 'Record root cause analysis' })
  @ApiResponse({ status: 200, description: 'Investigation updated' })
  async updateInvestigation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
  ) {
    return this.incidentReportingService.updateInvestigation(tenantId, user.sub, id, dto);
  }

  @Patch(':id/action-plan')
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiOperation({ summary: 'Define action plan' })
  @ApiResponse({ status: 200, description: 'Action plan updated' })
  async updateActionPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActionPlanDto,
  ) {
    return this.incidentReportingService.updateActionPlan(tenantId, user.sub, id, dto);
  }

  // ─── Enhanced Patient Safety Endpoints ──────────────────────────────────────

  @Post('near-miss')
  @ApiOperation({ summary: 'Report near-miss event (no-punishment learning)' })
  @ApiResponse({ status: 201, description: 'Near-miss reported' })
  async reportNearMiss(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      description: string;
      location?: string;
      interceptedBy?: string;
      howIntercepted: string;
      potentialConsequence: string;
      patientId?: string;
      anonymous?: boolean;
    },
  ) {
    return this.incidentReportingService.reportNearMiss(tenantId, user.sub, dto);
  }

  @Post('positive-identification')
  @ApiOperation({ summary: 'Verify patient positive identification (2 identifiers)' })
  @ApiResponse({ status: 201, description: 'Identification verified' })
  async verifyPositiveIdentification(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      procedureType: string;
      identifier1Type: string;
      identifier1Value: string;
      identifier2Type: string;
      identifier2Value: string;
      verified: boolean;
    },
  ) {
    return this.incidentReportingService.verifyPositiveIdentification(tenantId, user.sub, dto);
  }

  @Get('allergy-alerts/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get visual allergy signaling for patient' })
  @ApiResponse({ status: 200, description: 'Allergy alert data' })
  async getAllergyAlerts(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.incidentReportingService.getAllergyAlerts(tenantId, patientId);
  }

  @Post('timeout')
  @ApiOperation({ summary: 'Record invasive procedure timeout checklist' })
  @ApiResponse({ status: 201, description: 'Timeout recorded' })
  async recordTimeout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      procedureName: string;
      procedureType: string;
      checklist: Array<{ item: string; confirmed: boolean }>;
      teamMembers: string[];
      site?: string;
      laterality?: string;
    },
  ) {
    return this.incidentReportingService.recordTimeout(tenantId, user.sub, dto);
  }

  @Post(':id/rca')
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiOperation({ summary: 'Create Root Cause Analysis (Ishikawa/5 Whys)' })
  @ApiResponse({ status: 201, description: 'RCA created' })
  async createRCA(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: {
      method: 'ISHIKAWA' | 'FIVE_WHYS' | 'BOTH';
      ishikawa?: {
        manpower: string[];
        method: string[];
        material: string[];
        machine: string[];
        measurement: string[];
        environment: string[];
      };
      fiveWhys?: Array<{ why: string; answer: string }>;
      rootCause: string;
      correctiveActions: Array<{ action: string; responsible: string; dueDate: string; status: string }>;
      followUpDate?: string;
    },
  ) {
    return this.incidentReportingService.createRCA(tenantId, user.sub, id, dto);
  }

  @Post(':id/classify-ae')
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiOperation({ summary: 'Classify adverse event (NCC MERP A-I)' })
  @ApiResponse({ status: 201, description: 'Classification recorded' })
  async classifyAdverseEvent(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: {
      nccMerpCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
      whoClassification?: string;
      description: string;
    },
  ) {
    return this.incidentReportingService.classifyAdverseEvent(tenantId, id, dto);
  }

  @Post('device-tracking')
  @ApiOperation({ summary: 'Track medical device (lot, expiry, recall)' })
  @ApiResponse({ status: 201, description: 'Device tracked' })
  async trackDevice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      deviceName: string;
      manufacturer: string;
      lotNumber: string;
      serialNumber?: string;
      expiryDate: string;
      implantDate?: string;
      anvisaRegistration?: string;
    },
  ) {
    return this.incidentReportingService.trackDevice(tenantId, user.sub, dto);
  }

  @Get('safety-indicators')
  @ApiOperation({ summary: 'Safety indicators dashboard (falls, LPP, SSI, medication errors)' })
  @ApiResponse({ status: 200, description: 'Safety indicators' })
  async getSafetyIndicatorsDashboard(@CurrentTenant() tenantId: string) {
    return this.incidentReportingService.getSafetyIndicatorsDashboard(tenantId);
  }

  @Post('fmea')
  @ApiOperation({ summary: 'Create FMEA (Failure Mode and Effects Analysis)' })
  @ApiResponse({ status: 201, description: 'FMEA created' })
  async createFMEA(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      processName: string;
      teamMembers: string[];
      failureModes: Array<{
        step: string;
        failureMode: string;
        effect: string;
        severity: number;
        occurrence: number;
        detection: number;
        currentControls?: string;
        recommendedActions?: string;
        responsible?: string;
      }>;
    },
  ) {
    return this.incidentReportingService.createFMEA(tenantId, user.sub, dto);
  }

  @Get('ai/predict-readmission/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'AI: Predict preventable readmission risk' })
  @ApiResponse({ status: 200, description: 'Readmission prediction' })
  async predictReadmission(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.incidentReportingService.predictReadmission(tenantId, patientId);
  }

  @Get('ai/medication-error-detection')
  @ApiOperation({ summary: 'AI: Real-time medication error detection' })
  @ApiResponse({ status: 200, description: 'Medication error detection results' })
  async detectMedicationErrors(@CurrentTenant() tenantId: string) {
    return this.incidentReportingService.detectMedicationErrors(tenantId);
  }
}
