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
import { BrazilIntegrationsExtendedService } from './brazil-integrations-extended.service';
import {
  ESusAttendanceDto,
  ESusExportDto,
  WhatsAppMessageDto,
  WhatsAppBotCommandDto,
  EprescribingDto,
  HealthKitSyncDto,
  HealthKitDataDto,
  HealthDataType,
  HealthDataSource,
} from './dto/brazil-integrations-extended.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Interop Brazil — Extended Integrations (e-SUS, WhatsApp, e-Prescribing, HealthKit)')
@ApiBearerAuth('access-token')
@Controller('interop-brazil/extended')
export class BrazilIntegrationsExtendedController {
  constructor(private readonly service: BrazilIntegrationsExtendedService) {}

  // ─── e-SUS APS ────────────────────────────────────────────────────────────

  @Post('esus/ficha')
  @ApiOperation({ summary: 'Generate e-SUS APS ficha (attendance record)' })
  @ApiResponse({ status: 201, description: 'Ficha generated' })
  async generateFicha(
    @CurrentTenant() tenantId: string,
    @Body() dto: ESusAttendanceDto,
  ) {
    return this.service.generateFicha(tenantId, dto);
  }

  @Post('esus/ficha/validate')
  @ApiOperation({ summary: 'Validate e-SUS ficha data without persisting' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validateFicha(@Body() dto: ESusAttendanceDto) {
    return this.service.validateFicha(dto);
  }

  @Post('esus/export')
  @ApiOperation({ summary: 'Export fichas to SISAB' })
  @ApiResponse({ status: 201, description: 'Export created' })
  async exportToSISAB(
    @CurrentTenant() tenantId: string,
    @Body() dto: ESusExportDto,
  ) {
    return this.service.exportToSISAB(tenantId, dto);
  }

  @Get('esus/export/:exportId')
  @ApiParam({ name: 'exportId', description: 'Export record UUID' })
  @ApiOperation({ summary: 'Get e-SUS export status' })
  @ApiResponse({ status: 200, description: 'Export status' })
  getExportStatus(
    @CurrentTenant() tenantId: string,
    @Param('exportId') exportId: string,
  ) {
    return this.service.getExportStatus(tenantId, exportId);
  }

  // ─── WhatsApp Business API ────────────────────────────────────────────────

  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Send WhatsApp template message to patient' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendTemplateMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: WhatsAppMessageDto,
  ) {
    return this.service.sendTemplateMessage(tenantId, dto);
  }

  @Post('whatsapp/inbound')
  @ApiOperation({ summary: 'Process inbound WhatsApp message (webhook)' })
  @ApiResponse({ status: 201, description: 'Message processed' })
  async processInboundMessage(
    @CurrentTenant() tenantId: string,
    @Body() body: { patientId: string; phoneNumber: string; content: string },
  ) {
    return this.service.processInboundMessage(
      tenantId,
      body.patientId,
      body.phoneNumber,
      body.content,
    );
  }

  @Post('whatsapp/bot/command')
  @ApiOperation({ summary: 'Handle WhatsApp bot command (AGENDAR, CANCELAR, etc.)' })
  @ApiResponse({ status: 200, description: 'Bot response' })
  handleBotCommand(
    @CurrentTenant() tenantId: string,
    @Body() dto: WhatsAppBotCommandDto,
  ) {
    return this.service.handleBotCommand(tenantId, dto);
  }

  @Get('whatsapp/conversation/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Get WhatsApp conversation history for a patient' })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  getConversationHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getConversationHistory(
      tenantId,
      patientId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('whatsapp/schedule')
  @ApiOperation({ summary: 'Schedule a WhatsApp reminder for future delivery' })
  @ApiResponse({ status: 201, description: 'Reminder scheduled' })
  async scheduleReminder(
    @CurrentTenant() tenantId: string,
    @Body() dto: WhatsAppMessageDto,
  ) {
    return this.service.scheduleReminder(tenantId, dto);
  }

  // ─── Memed / Nexodata e-Prescribing ───────────────────────────────────────

  @Post('eprescribing')
  @ApiOperation({ summary: 'Create e-prescription via Memed or Nexodata' })
  @ApiResponse({ status: 201, description: 'E-prescription created' })
  async createEprescription(
    @CurrentTenant() tenantId: string,
    @Body() dto: EprescribingDto,
  ) {
    return this.service.createEprescription(tenantId, dto);
  }

  @Get('eprescribing/:externalId')
  @ApiParam({ name: 'externalId', description: 'External prescription ID' })
  @ApiOperation({ summary: 'Get e-prescription status' })
  @ApiResponse({ status: 200, description: 'E-prescription status' })
  getEprescriptionStatus(
    @CurrentTenant() tenantId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.service.getEprescriptionStatus(tenantId, externalId);
  }

  @Delete('eprescribing/:externalId')
  @ApiParam({ name: 'externalId', description: 'External prescription ID' })
  @ApiOperation({ summary: 'Cancel e-prescription' })
  @ApiResponse({ status: 200, description: 'E-prescription cancelled' })
  cancelEprescription(
    @CurrentTenant() tenantId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.service.cancelEprescription(tenantId, externalId);
  }

  // ─── Apple Health / Google Fit / Wearable Integration ─────────────────────

  @Post('healthkit/sync')
  @ApiOperation({ summary: 'Process health data from wearable (Apple Health, Google Fit, etc.)' })
  @ApiResponse({ status: 201, description: 'Health data processed' })
  async processHealthData(
    @CurrentTenant() tenantId: string,
    @Body() dto: HealthKitDataDto,
  ) {
    return this.service.processHealthData(tenantId, dto);
  }

  @Get('healthkit/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'dataType', required: false, enum: HealthDataType })
  @ApiQuery({ name: 'source', required: false, enum: HealthDataSource })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOperation({ summary: 'Get patient health data (merged from all wearable sources)' })
  @ApiResponse({ status: 200, description: 'Patient health readings' })
  getPatientHealthData(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('dataType') dataType?: HealthDataType,
    @Query('source') source?: HealthDataSource,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getPatientHealthData(
      tenantId,
      patientId,
      dataType,
      source,
      startDate,
      endDate,
    );
  }

  @Post('healthkit/configure')
  @ApiOperation({ summary: 'Configure wearable data sync for a patient' })
  @ApiResponse({ status: 201, description: 'Sync configured' })
  configureSync(
    @CurrentTenant() tenantId: string,
    @Body() dto: HealthKitSyncDto,
  ) {
    return this.service.configureSync(tenantId, dto);
  }

  @Get('healthkit/:patientId/latest')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get latest reading for each data type' })
  @ApiResponse({ status: 200, description: 'Latest readings by type' })
  getLatestReadings(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getLatestReadings(tenantId, patientId);
  }
}
