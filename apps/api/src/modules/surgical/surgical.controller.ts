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
  ApiBody,
} from '@nestjs/swagger';
import { SurgicalService } from './surgical.service';
import { CreateSurgicalProcedureDto } from './dto/create-surgical-procedure.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { SurgicalStatus } from '@prisma/client';

@ApiTags('Surgical')
@ApiBearerAuth('access-token')
@Controller('surgical')
export class SurgicalController {
  constructor(private readonly surgicalService: SurgicalService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a surgical procedure' })
  @ApiResponse({ status: 201, description: 'Surgical procedure scheduled' })
  async schedule(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSurgicalProcedureDto,
  ) {
    return this.surgicalService.schedule(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List surgical procedures with filters' })
  @ApiResponse({ status: 200, description: 'Paginated surgical procedures' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('surgeonId') surgeonId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.surgicalService.findAll(tenantId, {
      patientId,
      surgeonId,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('by-date')
  @ApiOperation({ summary: 'Get surgical procedures by date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in ISO format (YYYY-MM-DD)', example: '2026-03-22' })
  @ApiResponse({ status: 200, description: 'List of surgical procedures' })
  async findByDate(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.surgicalService.findByDate(tenantId, date);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Get surgical procedure by ID' })
  @ApiResponse({ status: 200, description: 'Surgical procedure details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.surgicalService.findById(id);
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Update surgical procedure status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', description: 'New surgical status' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: SurgicalStatus,
  ) {
    return this.surgicalService.updateStatus(id, status);
  }

  @Patch(':id/checklist/:phase')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiParam({ name: 'phase', description: 'Checklist phase', enum: ['before', 'during', 'after'] })
  @ApiOperation({ summary: 'Update safety checklist for a phase' })
  @ApiResponse({ status: 200, description: 'Checklist updated' })
  async updateChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phase') phase: 'before' | 'during' | 'after',
    @Body() checklist: Record<string, unknown>,
  ) {
    return this.surgicalService.updateChecklist(id, phase, checklist);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Update surgical procedure fields (e.g. surgical times)' })
  @ApiResponse({ status: 200, description: 'Procedure updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.surgicalService.update(id, data);
  }

  @Post(':id/complete')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Complete a surgical procedure' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        surgicalDescription: { type: 'string', description: 'Surgical description' },
        complications: { type: 'string', description: 'Complications encountered' },
        bloodLoss: { type: 'number', description: 'Estimated blood loss in mL' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Procedure completed' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    data: {
      surgicalDescription?: string;
      complications?: string;
      bloodLoss?: number;
    },
  ) {
    return this.surgicalService.complete(id, data);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ENHANCED SURGICAL ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

  @Post('sponge-count')
  @ApiOperation({ summary: 'Record sponge/instrument count (before or after surgery)' })
  @ApiResponse({ status: 201, description: 'Sponge count recorded' })
  async createSpongeCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      procedureId: string;
      phase: 'BEFORE' | 'AFTER';
      items: Array<{ name: string; expectedCount: number; actualCount: number }>;
      observations?: string;
    },
  ) {
    return this.surgicalService.createSpongeCount(tenantId, user.sub, dto);
  }

  @Get('sponge-count/:procedureId/verify')
  @ApiParam({ name: 'procedureId', description: 'Procedure UUID' })
  @ApiOperation({ summary: 'Verify sponge/instrument count (before vs after)' })
  async verifySpongeCount(
    @CurrentTenant() tenantId: string,
    @Param('procedureId', ParseUUIDPipe) procedureId: string,
  ) {
    return this.surgicalService.verifySpongeCount(tenantId, procedureId);
  }

  @Post('pre-anesthetic-evaluation')
  @ApiOperation({ summary: 'Create pre-anesthetic evaluation (APA)' })
  @ApiResponse({ status: 201, description: 'APA created' })
  async createPreAnestheticEvaluation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      procedureId: string;
      patientId: string;
      comorbidities: string[];
      currentMedications: string[];
      allergies: string[];
      previousAnesthesia: { date?: string; type?: string; complications?: string };
      airway: {
        mallampati: 1 | 2 | 3 | 4;
        mouthOpening: string;
        neckMobility: string;
        thyromental: string;
        dentition: string;
        beardOrObesity: boolean;
      };
      fastingHours: number;
      fastingSolidsHours: number;
      asaClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
      asaEmergency: boolean;
      cardiacRisk: string;
      pulmonaryRisk: string;
      labResults: Record<string, unknown>;
      anesthesiaPlan: string;
      consentObtained: boolean;
      observations?: string;
    },
  ) {
    return this.surgicalService.createPreAnestheticEvaluation(tenantId, user.sub, dto);
  }

  @Post('anesthesia-record')
  @ApiOperation({ summary: 'Create digital anesthesia record' })
  @ApiResponse({ status: 201, description: 'Anesthesia record created' })
  async createAnesthesiaRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.surgicalService.createAnesthesiaRecord(
      tenantId,
      user.sub,
      dto as Parameters<typeof this.surgicalService.createAnesthesiaRecord>[2],
    );
  }

  @Post('intraop-vitals')
  @ApiOperation({ summary: 'Add intraoperative monitoring vitals' })
  @ApiResponse({ status: 201, description: 'Intraop vitals recorded' })
  async addIntraoperativeVitals(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      procedureId: string;
      patientId: string;
      timestamp: string;
      systolicBp: number;
      diastolicBp: number;
      heartRate: number;
      spo2: number;
      etco2?: number;
      temperature?: number;
      fio2?: number;
      tidalVolume?: number;
      respiratoryRate?: number;
      bis?: number;
      observations?: string;
    },
  ) {
    return this.surgicalService.addIntraoperativeVitals(tenantId, user.sub, dto);
  }

  @Get('intraop-chart/:procedureId')
  @ApiParam({ name: 'procedureId', description: 'Procedure UUID' })
  @ApiOperation({ summary: 'Get intraoperative monitoring chart' })
  async getIntraoperativeChart(
    @CurrentTenant() tenantId: string,
    @Param('procedureId', ParseUUIDPipe) procedureId: string,
  ) {
    return this.surgicalService.getIntraoperativeChart(tenantId, procedureId);
  }

  @Get('or-room-map')
  @ApiOperation({ summary: 'Get OR room map (real-time status)' })
  @ApiResponse({ status: 200, description: 'OR room map' })
  async getOrRoomMap(@CurrentTenant() tenantId: string) {
    return this.surgicalService.getOrRoomMap(tenantId);
  }

  @Get('utilization-metrics')
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiOperation({ summary: 'Get room utilization metrics' })
  @ApiResponse({ status: 200, description: 'Utilization metrics' })
  async getRoomUtilizationMetrics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.surgicalService.getRoomUtilizationMetrics(tenantId, startDate, endDate);
  }

  @Post('preference-card')
  @ApiOperation({ summary: 'Create surgeon preference card' })
  @ApiResponse({ status: 201, description: 'Preference card created' })
  async createSurgeonPreferenceCard(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      surgeonId: string;
      procedureType: string;
      instruments: string[];
      sutures: string[];
      materials: string[];
      patientPosition: string;
      equipment: string[];
      specialRequirements?: string;
      notes?: string;
    },
  ) {
    return this.surgicalService.createSurgeonPreferenceCard(tenantId, user.sub, dto);
  }

  @Get('preference-card/:surgeonId')
  @ApiParam({ name: 'surgeonId', description: 'Surgeon UUID' })
  @ApiQuery({ name: 'procedureType', required: false })
  @ApiOperation({ summary: 'Get surgeon preference cards' })
  async getSurgeonPreferenceCards(
    @CurrentTenant() tenantId: string,
    @Param('surgeonId', ParseUUIDPipe) surgeonId: string,
    @Query('procedureType') procedureType?: string,
  ) {
    return this.surgicalService.getSurgeonPreferenceCards(tenantId, surgeonId, procedureType);
  }

  @Post('eras-checklist')
  @ApiOperation({ summary: 'Record ERAS protocol checklist' })
  @ApiResponse({ status: 201, description: 'ERAS checklist recorded' })
  async createErasChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      procedureId: string;
      patientId: string;
      preOp: Record<string, boolean>;
      intraOp: Record<string, boolean>;
      postOp: Record<string, boolean>;
      observations?: string;
    },
  ) {
    return this.surgicalService.createErasChecklist(tenantId, user.sub, dto);
  }

  @Post('estimate-duration')
  @ApiOperation({ summary: 'Estimate surgery duration based on historical data' })
  @ApiResponse({ status: 200, description: 'Duration estimation' })
  async estimateSurgeryDuration(
    @CurrentTenant() tenantId: string,
    @Body() dto: { procedureName: string; surgeonId: string; patientComorbidities?: number },
  ) {
    return this.surgicalService.estimateSurgeryDuration(tenantId, dto);
  }

  // ─── Video Recording ─────────────────────────────────────────────────────

  @Post(':id/video/start')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Start surgical video recording' })
  @ApiResponse({ status: 201, description: 'Recording started' })
  async startVideoRecording(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.surgicalService.startVideoRecording(tenantId, id);
  }

  @Post(':id/video/stop')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Stop surgical video recording' })
  @ApiResponse({ status: 200, description: 'Recording stopped' })
  async stopVideoRecording(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.surgicalService.stopVideoRecording(tenantId, id);
  }

  @Get(':id/videos')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'List surgical video recordings' })
  @ApiResponse({ status: 200, description: 'List of video recordings' })
  async getSurgeryVideos(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.surgicalService.getSurgeryVideos(tenantId, id);
  }
}
