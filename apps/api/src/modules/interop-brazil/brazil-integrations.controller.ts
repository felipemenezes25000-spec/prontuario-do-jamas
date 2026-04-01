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
import { BrazilIntegrationsService } from './brazil-integrations.service';
import {
  SinanNotificationDto,
  AutoDetectNotifiableDto,
  CadsusRegistrationDto,
  BPADto,
  APACDto,
  AIHDto,
  SUSBillingExportDto,
  NotivisaDto,
  DeathCertificateDto,
  BirthCertificateDto,
} from './dto/brazil-integrations.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Interop Brazil — Enhanced Integrations')
@ApiBearerAuth('access-token')
@Controller('interop-brazil/integrations')
export class BrazilIntegrationsController {
  constructor(
    private readonly brazilIntegrationsService: BrazilIntegrationsService,
  ) {}

  // ─── SINAN ──────────────────────────────────────────────────────────────────

  @Post('sinan/notify')
  @ApiOperation({ summary: 'Create SINAN compulsory disease notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async createSinanNotification(
    @CurrentTenant() tenantId: string,
    @Body() dto: SinanNotificationDto,
  ) {
    return this.brazilIntegrationsService.createNotification(tenantId, dto);
  }

  @Get('sinan/notifiable-diseases')
  @ApiOperation({ summary: 'List all compulsory notifiable diseases (Portaria MS)' })
  @ApiResponse({ status: 200, description: 'List of notifiable diseases' })
  getNotifiableDiseases() {
    return this.brazilIntegrationsService.getNotifiableDiseases();
  }

  @Post('sinan/auto-detect')
  @ApiOperation({ summary: 'Auto-detect if a CID-10 code is a notifiable disease' })
  @ApiResponse({ status: 200, description: 'Detection result with disease info' })
  autoDetectNotifiable(
    @Body() dto: AutoDetectNotifiableDto,
  ) {
    return this.brazilIntegrationsService.autoDetectNotifiable(dto.cidCode);
  }

  @Post('sinan/:id/submit')
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiOperation({ summary: 'Submit notification to SINAN' })
  @ApiResponse({ status: 200, description: 'Notification submitted' })
  async submitToSINAN(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.brazilIntegrationsService.submitToSINAN(tenantId, id);
  }

  @Get('sinan/:id/status')
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiOperation({ summary: 'Get SINAN notification status' })
  @ApiResponse({ status: 200, description: 'Notification status' })
  async getNotificationStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.brazilIntegrationsService.getNotificationStatus(tenantId, id);
  }

  // ─── CADSUS / CNS ──────────────────────────────────────────────────────────

  @Get('cadsus/lookup')
  @ApiOperation({ summary: 'Lookup patient in CADSUS by CPF, CNS, or name' })
  @ApiResponse({ status: 200, description: 'Patient data from CADSUS' })
  @ApiQuery({ name: 'cpf', required: false })
  @ApiQuery({ name: 'cns', required: false })
  @ApiQuery({ name: 'fullName', required: false })
  @ApiQuery({ name: 'birthDate', required: false })
  @ApiQuery({ name: 'motherName', required: false })
  async lookupCadsus(
    @CurrentTenant() tenantId: string,
    @Query('cpf') cpf?: string,
    @Query('cns') cns?: string,
    @Query('fullName') fullName?: string,
    @Query('birthDate') birthDate?: string,
    @Query('motherName') motherName?: string,
  ) {
    if (cpf) {
      return this.brazilIntegrationsService.lookupByCPF(tenantId, cpf);
    }
    if (cns) {
      return this.brazilIntegrationsService.lookupByCNS(tenantId, cns);
    }
    if (fullName && birthDate && motherName) {
      return this.brazilIntegrationsService.lookupByName(tenantId, fullName, birthDate, motherName);
    }
    return { error: 'Provide cpf, cns, or (fullName + birthDate + motherName) for lookup' };
  }

  @Post('cadsus/register')
  @ApiOperation({ summary: 'Register a new patient in CADSUS' })
  @ApiResponse({ status: 201, description: 'Patient registered, CNS generated' })
  async registerCadsus(
    @CurrentTenant() tenantId: string,
    @Body() dto: CadsusRegistrationDto,
  ) {
    return this.brazilIntegrationsService.registerPatient(tenantId, dto);
  }

  @Get('cadsus/validate-cns/:cns')
  @ApiParam({ name: 'cns', description: 'CNS number (15 digits)' })
  @ApiOperation({ summary: 'Validate a CNS number (modulo 11 algorithm)' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validateCNS(@Param('cns') cns: string) {
    return {
      cns,
      valid: this.brazilIntegrationsService.validateCNS(cns),
    };
  }

  // ─── CNES ───────────────────────────────────────────────────────────────────

  @Get('cnes/establishment/:code')
  @ApiParam({ name: 'code', description: 'CNES code (7 digits)' })
  @ApiOperation({ summary: 'Lookup health establishment in CNES' })
  @ApiResponse({ status: 200, description: 'Establishment data' })
  async lookupEstablishment(
    @CurrentTenant() tenantId: string,
    @Param('code') code: string,
  ) {
    return this.brazilIntegrationsService.lookupEstablishment(tenantId, code);
  }

  @Get('cnes/professional/:crm')
  @ApiParam({ name: 'crm', description: 'CRM number' })
  @ApiOperation({ summary: 'Lookup health professional in CNES by CRM' })
  @ApiResponse({ status: 200, description: 'Professional data' })
  async lookupProfessional(
    @CurrentTenant() tenantId: string,
    @Param('crm') crm: string,
  ) {
    return this.brazilIntegrationsService.lookupProfessional(tenantId, crm);
  }

  @Get('cnes/establishment/:code/services')
  @ApiParam({ name: 'code', description: 'CNES code' })
  @ApiOperation({ summary: 'Get services offered by a CNES establishment' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getEstablishmentServices(
    @CurrentTenant() tenantId: string,
    @Param('code') code: string,
  ) {
    return this.brazilIntegrationsService.getEstablishmentServices(tenantId, code);
  }

  @Get('cnes/validate-crm/:crm')
  @ApiParam({ name: 'crm', description: 'CRM number' })
  @ApiQuery({ name: 'state', required: true, description: 'UF state code' })
  @ApiOperation({ summary: 'Validate a CRM number against CFM' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCRM(
    @Param('crm') crm: string,
    @Query('state') state: string,
  ) {
    return this.brazilIntegrationsService.validateCRM(crm, state);
  }

  // ─── SUS Billing ────────────────────────────────────────────────────────────

  @Post('sus/bpa')
  @ApiOperation({ summary: 'Generate SUS BPA (Boletim de Producao Ambulatorial)' })
  @ApiResponse({ status: 201, description: 'BPA generated' })
  async generateBPA(
    @CurrentTenant() tenantId: string,
    @Body() dto: BPADto,
  ) {
    return this.brazilIntegrationsService.generateBPA(tenantId, dto);
  }

  @Post('sus/apac')
  @ApiOperation({ summary: 'Generate SUS APAC (Autorizacao de Procedimentos de Alta Complexidade)' })
  @ApiResponse({ status: 201, description: 'APAC generated' })
  async generateAPAC(
    @CurrentTenant() tenantId: string,
    @Body() dto: APACDto,
  ) {
    return this.brazilIntegrationsService.generateAPAC(tenantId, dto);
  }

  @Post('sus/aih')
  @ApiOperation({ summary: 'Generate SUS AIH (Autorizacao de Internacao Hospitalar)' })
  @ApiResponse({ status: 201, description: 'AIH generated' })
  async generateAIH(
    @CurrentTenant() tenantId: string,
    @Body() dto: AIHDto,
  ) {
    return this.brazilIntegrationsService.generateAIH(tenantId, dto);
  }

  @Post('sus/export')
  @ApiOperation({ summary: 'Export SUS billing to SIA (BPA/APAC) or SIH (AIH)' })
  @ApiResponse({ status: 200, description: 'Billing exported' })
  async exportBilling(
    @CurrentTenant() tenantId: string,
    @Body() dto: SUSBillingExportDto,
  ) {
    if (dto.type === 'AIH') {
      return this.brazilIntegrationsService.exportToSIH(tenantId, dto);
    }
    return this.brazilIntegrationsService.exportToSIA(tenantId, dto);
  }

  @Get('sus/processing-status/:id')
  @ApiParam({ name: 'id', description: 'Export UUID' })
  @ApiOperation({ summary: 'Get SUS billing processing status' })
  @ApiResponse({ status: 200, description: 'Processing status' })
  async getProcessingStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.brazilIntegrationsService.getProcessingStatus(tenantId, id);
  }

  // ─── NOTIVISA ───────────────────────────────────────────────────────────────

  @Post('notivisa')
  @ApiOperation({ summary: 'Create NOTIVISA pharmacovigilance report (ANVISA)' })
  @ApiResponse({ status: 201, description: 'Report created' })
  async createNotivisaReport(
    @CurrentTenant() tenantId: string,
    @Body() dto: NotivisaDto,
  ) {
    return this.brazilIntegrationsService.createReport(tenantId, dto);
  }

  @Post('notivisa/:id/submit')
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiOperation({ summary: 'Submit NOTIVISA report to ANVISA' })
  @ApiResponse({ status: 200, description: 'Report submitted' })
  async submitNotivisaReport(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.brazilIntegrationsService.submitReport(tenantId, id);
  }

  @Get('notivisa/:id/status')
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiOperation({ summary: 'Get NOTIVISA report status' })
  @ApiResponse({ status: 200, description: 'Report status' })
  async getNotivisaReportStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.brazilIntegrationsService.getReportStatus(tenantId, id);
  }

  // ─── SIM (Death Certificate) ───────────────────────────────────────────────

  @Post('sim/death-certificate')
  @ApiOperation({ summary: 'Generate SIM death certificate (Declaracao de Obito)' })
  @ApiResponse({ status: 201, description: 'Death certificate generated' })
  async generateDeathCertificate(
    @CurrentTenant() tenantId: string,
    @Body() dto: DeathCertificateDto,
  ) {
    return this.brazilIntegrationsService.generateDeathCertificate(tenantId, dto);
  }

  // ─── SINASC (Birth Certificate) ────────────────────────────────────────────

  @Post('sinasc/birth-certificate')
  @ApiOperation({ summary: 'Generate SINASC birth certificate (Declaracao de Nascido Vivo)' })
  @ApiResponse({ status: 201, description: 'Birth certificate generated' })
  async generateBirthCertificate(
    @CurrentTenant() tenantId: string,
    @Body() dto: BirthCertificateDto,
  ) {
    return this.brazilIntegrationsService.generateBirthCertificate(tenantId, dto);
  }
}
