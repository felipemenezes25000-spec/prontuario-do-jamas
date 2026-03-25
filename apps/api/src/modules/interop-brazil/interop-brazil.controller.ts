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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InteropBrazilService } from './interop-brazil.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  CreateSinanNotificationDto,
  CreateDeathCertificateDto,
  CreateBirthCertificateDto,
  CreateNotivisaReportDto,
  SendDigitalPrescriptionDto,
  SendWhatsAppDto,
  SyncHealthAppDto,
} from './dto/interop-brazil.dto';

@ApiTags('Brazil Interoperability')
@ApiBearerAuth('access-token')
@Controller('interop-brazil')
export class InteropBrazilController {
  constructor(private readonly service: InteropBrazilService) {}

  // SINAN
  @Post('sinan')
  @ApiOperation({ summary: 'Create compulsory disease notification (SINAN)' })
  async createSinanNotification(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSinanNotificationDto,
  ) {
    return this.service.createSinanNotification(tenantId, user.email, dto);
  }

  @Patch('sinan/:id/submit')
  @ApiOperation({ summary: 'Submit SINAN notification' })
  @ApiParam({ name: 'id' })
  async submitSinanNotification(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.submitSinanNotification(tenantId, id);
  }

  @Get('sinan')
  @ApiOperation({ summary: 'List SINAN notifications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async listSinanNotifications(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listSinanNotifications(tenantId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('sinan/auto-detect/:patientId/:cidCode')
  @ApiOperation({ summary: 'Auto-detect if CID is compulsory notification' })
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'cidCode' })
  async autoDetectCompulsoryDisease(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('cidCode') cidCode: string,
  ) {
    return this.service.autoDetectCompulsoryDisease(tenantId, patientId, cidCode);
  }

  // CADSUS / CNS
  @Get('cadsus/lookup/:cpf')
  @ApiOperation({ summary: 'Lookup CNS by CPF (CADSUS)' })
  @ApiParam({ name: 'cpf' })
  async lookupCns(@Param('cpf') cpf: string) {
    return this.service.lookupCns(cpf);
  }

  // CNES
  @Get('cnes/establishment/:cnes')
  @ApiOperation({ summary: 'Validate CNES establishment' })
  @ApiParam({ name: 'cnes' })
  async validateCnes(@Param('cnes') cnes: string) {
    return this.service.validateCnes(cnes);
  }

  @Get('cnes/professional/:cns')
  @ApiOperation({ summary: 'Validate professional by CNS' })
  @ApiParam({ name: 'cns' })
  async validateProfessional(@Param('cns') cns: string) {
    return this.service.validateProfessional(cns);
  }

  // e-SUS APS
  @Post('esus/export/:encounterId')
  @ApiOperation({ summary: 'Export encounter to e-SUS APS' })
  @ApiParam({ name: 'encounterId' })
  async exportEsusRecord(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.exportEsusRecord(tenantId, encounterId);
  }

  // SIM — Death Certificate
  @Post('sim/death-certificate')
  @ApiOperation({ summary: 'Create digital death certificate (SIM)' })
  async createDeathCertificate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDeathCertificateDto,
  ) {
    return this.service.createDeathCertificate(tenantId, user.email, dto);
  }

  // SINASC — Birth Certificate
  @Post('sinasc/birth-certificate')
  @ApiOperation({ summary: 'Create digital live birth certificate (SINASC)' })
  async createBirthCertificate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBirthCertificateDto,
  ) {
    return this.service.createBirthCertificate(tenantId, user.email, dto);
  }

  // NOTIVISA
  @Post('notivisa')
  @ApiOperation({ summary: 'Create pharmacovigilance report (NOTIVISA)' })
  async createNotivisaReport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNotivisaReportDto,
  ) {
    return this.service.createNotivisaReport(tenantId, user.email, dto);
  }

  // Digital Prescription
  @Post('prescription/:prescriptionId/send')
  @ApiOperation({ summary: 'Send digital prescription to pharmacy (Memed/Nexodata)' })
  @ApiParam({ name: 'prescriptionId' })
  async sendDigitalPrescription(
    @CurrentTenant() tenantId: string,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: SendDigitalPrescriptionDto,
  ) {
    return this.service.sendDigitalPrescription(tenantId, prescriptionId, dto);
  }

  // WhatsApp Business
  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Send WhatsApp message' })
  async sendWhatsApp(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendWhatsAppDto,
  ) {
    return this.service.sendWhatsApp(tenantId, dto);
  }

  // Health App Sync
  @Post('health-app/sync')
  @ApiOperation({ summary: 'Sync data from Apple Health / Google Fit' })
  async syncHealthApp(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SyncHealthAppDto,
  ) {
    return this.service.syncHealthApp(tenantId, user.email, dto);
  }
}
