import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DatasusIntegrationsService } from './datasus-integrations.service';
import {
  SinanNotificationDto,
  CadsusQueryDto,
  CnesValidationDto,
  EsusApsDto,
  DeathCertificateDto,
  BirthCertificateDto,
  NotivisaReportDto,
  MemedIntegrationDto,
  WhatsappBusinessDto,
  WhatsappMessageType,
} from './dto/datasus-integrations.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Interop Brazil — DATASUS Integrations')
@ApiBearerAuth('access-token')
@Controller('interop-brazil')
export class DatasusIntegrationsController {
  constructor(
    private readonly datasusService: DatasusIntegrationsService,
  ) {}

  // ─── SINAN ───────────────────────────────────────────────────────────────────

  @Post('sinan/notifications')
  @ApiOperation({
    summary: 'Create SINAN compulsory disease notification (auto-fill from diagnosis)',
  })
  @ApiResponse({ status: 201, description: 'Notification created' })
  createSinanNotification(
    @CurrentTenant() tenantId: string,
    @Body() dto: SinanNotificationDto,
  ) {
    return this.datasusService.createSinanNotification(tenantId, dto);
  }

  @Post('sinan/notifications/:notificationId/submit')
  @ApiOperation({ summary: 'Submit a SINAN notification to SVS/MS' })
  @ApiParam({ name: 'notificationId', description: 'Notification identifier' })
  @ApiResponse({ status: 200, description: 'Notification submitted' })
  submitSinanNotification(
    @CurrentTenant() tenantId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.datasusService.submitSinanNotification(tenantId, notificationId);
  }

  // ─── CADSUS / CNS ─────────────────────────────────────────────────────────────

  @Post('cadsus/lookup')
  @ApiOperation({
    summary: 'Resolve CPF → CNS via CADSUS WS (required for SUS billing and RNDS)',
  })
  @ApiResponse({ status: 200, description: 'CADSUS lookup result with resolved CNS' })
  lookupCadsus(
    @CurrentTenant() tenantId: string,
    @Body() dto: CadsusQueryDto,
  ) {
    return this.datasusService.lookupCadsus(tenantId, dto);
  }

  @Post('cadsus/patients/:patientId/register')
  @ApiOperation({ summary: 'Register patient in CADSUS and obtain a CNS' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 201, description: 'Patient registered in CADSUS' })
  registerCadsus(
    @CurrentTenant() tenantId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.datasusService.registerCadsus(tenantId, patientId);
  }

  // ─── CNES ─────────────────────────────────────────────────────────────────────

  @Post('cnes/professionals/validate')
  @ApiOperation({
    summary: 'Validate professional CRM, specialty, and CNES establishment data',
  })
  @ApiResponse({ status: 200, description: 'CNES validation result' })
  validateCnes(
    @CurrentTenant() tenantId: string,
    @Body() dto: CnesValidationDto,
  ) {
    return this.datasusService.validateCnes(tenantId, dto);
  }

  @Get('cnes/establishments/:cnesCode')
  @ApiOperation({ summary: 'Fetch CNES establishment data from DATASUS' })
  @ApiParam({ name: 'cnesCode', description: 'CNES establishment code (7 digits)' })
  @ApiResponse({ status: 200, description: 'Establishment data' })
  getEstablishmentData(
    @CurrentTenant() tenantId: string,
    @Param('cnesCode') cnesCode: string,
  ) {
    return this.datasusService.getEstablishmentData(tenantId, cnesCode);
  }

  // ─── e-SUS APS ────────────────────────────────────────────────────────────────

  @Post('esus-aps/encounters/:encounterId/export')
  @ApiOperation({
    summary: 'Export encounter data to e-SUS APS (SISAB) for primary care reporting',
  })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 201, description: 'e-SUS APS export result' })
  exportEsusAps(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
    @Body() dto: EsusApsDto,
  ) {
    return this.datasusService.exportEsusAps(tenantId, encounterId, dto);
  }

  // ─── SIM — Death Certificate ──────────────────────────────────────────────────

  @Post('sim/death-certificates')
  @ApiOperation({
    summary: 'Issue a digital Death Certificate (DO) and export to SIM/DATASUS',
  })
  @ApiResponse({ status: 201, description: 'Death certificate issued' })
  issueDeathCertificate(
    @CurrentTenant() tenantId: string,
    @Body() dto: DeathCertificateDto,
  ) {
    return this.datasusService.issueDeathCertificate(tenantId, dto);
  }

  @Post('sim/death-certificates/:certificateId/submit')
  @ApiOperation({ summary: 'Submit death certificate (DO) to SIM mortality information system' })
  @ApiParam({ name: 'certificateId', description: 'Certificate identifier' })
  @ApiResponse({ status: 200, description: 'Certificate submitted to SIM' })
  submitToSim(
    @CurrentTenant() tenantId: string,
    @Param('certificateId') certificateId: string,
  ) {
    return this.datasusService.submitToSim(tenantId, certificateId);
  }

  // ─── SINASC — Birth Certificate ───────────────────────────────────────────────

  @Post('sinasc/birth-certificates')
  @ApiOperation({
    summary: 'Issue a digital Birth Certificate (DNV) and export to SINASC/DATASUS',
  })
  @ApiResponse({ status: 201, description: 'Birth certificate issued' })
  issueBirthCertificate(
    @CurrentTenant() tenantId: string,
    @Body() dto: BirthCertificateDto,
  ) {
    return this.datasusService.issueBirthCertificate(tenantId, dto);
  }

  @Post('sinasc/birth-certificates/:certificateId/submit')
  @ApiOperation({ summary: 'Submit birth certificate (DNV) to SINASC live births information system' })
  @ApiParam({ name: 'certificateId', description: 'Certificate identifier' })
  @ApiResponse({ status: 200, description: 'Certificate submitted to SINASC' })
  submitToSinasc(
    @CurrentTenant() tenantId: string,
    @Param('certificateId') certificateId: string,
  ) {
    return this.datasusService.submitToSinasc(tenantId, certificateId);
  }

  // ─── NOTIVISA ─────────────────────────────────────────────────────────────────

  @Post('notivisa/reports')
  @ApiOperation({
    summary: 'Submit pharmacovigilance or technovigilance adverse event report to ANVISA',
  })
  @ApiResponse({ status: 201, description: 'NOTIVISA report submitted' })
  submitNotivisa(
    @CurrentTenant() tenantId: string,
    @Body() dto: NotivisaReportDto,
  ) {
    return this.datasusService.submitNotivisa(tenantId, dto);
  }

  @Get('notivisa/reports/:reportId/status')
  @ApiOperation({ summary: 'Get NOTIVISA report processing status from ANVISA' })
  @ApiParam({ name: 'reportId', description: 'NOTIVISA report identifier' })
  @ApiResponse({ status: 200, description: 'Report status' })
  getNotivisaStatus(
    @CurrentTenant() tenantId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.datasusService.getNotivisaStatus(tenantId, reportId);
  }

  // ─── Memed / Nexodata ─────────────────────────────────────────────────────────

  @Post('memed/prescriptions')
  @ApiOperation({
    summary: 'Send e-prescription to Memed/Nexodata with ICP-Brasil digital signature',
  })
  @ApiResponse({ status: 201, description: 'Prescription sent to Memed' })
  sendMemedPrescription(
    @CurrentTenant() tenantId: string,
    @Body() dto: MemedIntegrationDto,
  ) {
    return this.datasusService.sendMemedPrescription(tenantId, dto);
  }

  @Get('memed/prescriptions/:memedId/status')
  @ApiOperation({ summary: 'Get Memed prescription pharmacy dispensing status' })
  @ApiParam({ name: 'memedId', description: 'Memed prescription identifier' })
  @ApiResponse({ status: 200, description: 'Prescription status' })
  getMemedPrescriptionStatus(
    @CurrentTenant() tenantId: string,
    @Param('memedId') memedId: string,
  ) {
    return this.datasusService.getMemedPrescriptionStatus(tenantId, memedId);
  }

  // ─── WhatsApp Business API ────────────────────────────────────────────────────

  @Post('whatsapp/messages')
  @ApiOperation({
    summary: 'Send WhatsApp Business message (reminders, results, prescriptions, chatbot)',
  })
  @ApiResponse({ status: 201, description: 'Message queued / sent' })
  sendWhatsappMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: WhatsappBusinessDto,
  ) {
    return this.datasusService.sendWhatsappMessage(tenantId, dto);
  }

  @Get('whatsapp/messages/:messageId/status')
  @ApiOperation({ summary: 'Get WhatsApp message delivery status from Meta Cloud API' })
  @ApiParam({ name: 'messageId', description: 'WhatsApp message identifier' })
  @ApiResponse({ status: 200, description: 'Message delivery status' })
  getWhatsappStatus(
    @CurrentTenant() tenantId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.datasusService.getWhatsappStatus(tenantId, messageId);
  }

  @Post('whatsapp/messages/bulk')
  @ApiOperation({
    summary: 'Send bulk WhatsApp messages to multiple patients (e.g., appointment reminders)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['patientIds', 'messageType', 'template'],
      properties: {
        patientIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        messageType: { type: 'string', enum: Object.values(WhatsappMessageType) },
        template: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Bulk messages queued' })
  sendWhatsappBulk(
    @CurrentTenant() tenantId: string,
    @Body('patientIds') patientIds: string[],
    @Body('messageType') messageType: WhatsappMessageType,
    @Body('template') template: string,
  ) {
    return this.datasusService.sendWhatsappBulk(tenantId, patientIds, messageType, template);
  }
}
