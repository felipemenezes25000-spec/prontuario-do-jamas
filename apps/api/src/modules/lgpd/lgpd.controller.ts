import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { LgpdService } from './lgpd.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RecordConsentDto, SetRetentionPolicyDto, ComplianceReportQueryDto } from './dto';
import { ConsentType } from '@prisma/client';

/**
 * LGPD Compliance Controller
 *
 * Provides endpoints for managing LGPD (Lei Geral de Protecao de Dados)
 * compliance: consent management, data portability, anonymization,
 * retention policies, and compliance reporting.
 *
 * All endpoints require ADMIN role.
 */
@ApiTags('LGPD')
@ApiBearerAuth('access-token')
@Controller('lgpd')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class LgpdController {
  constructor(private readonly lgpdService: LgpdService) {}

  // ─── Consent Management ─────────────────────────────────────────────────

  /** Record patient consent — LGPD Art. 8 */
  @Post('consent')
  @ApiOperation({ summary: 'Record patient consent (LGPD Art. 8)' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @Body() dto: RecordConsentDto,
    @CurrentTenant() tenantId: string,
    @Req() req: Request,
  ) {
    return this.lgpdService.recordConsent(dto.patientId, tenantId, {
      consentType: dto.consentType,
      purpose: dto.purpose,
      granted: dto.granted,
      legalBasis: dto.legalBasis,
      expiresAt: dto.expiresAt,
      consentText: dto.consentText,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /** Revoke specific consent — LGPD Art. 8, §5 */
  @Delete('consent/:patientId/:consentType')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiParam({ name: 'consentType', description: 'Consent type to revoke' })
  @ApiOperation({ summary: 'Revoke specific consent (LGPD Art. 8, para 5)' })
  @ApiResponse({ status: 200, description: 'Consent revoked' })
  async revokeConsent(
    @Param('patientId') patientId: string,
    @Param('consentType') consentType: ConsentType,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.revokeConsent(patientId, consentType, tenantId);
  }

  /** Get patient consents — LGPD Art. 18, II */
  @Get('consent/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient consents (LGPD Art. 18, II)' })
  @ApiResponse({ status: 200, description: 'Patient consent records' })
  async getPatientConsents(
    @Param('patientId') patientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.getPatientConsents(patientId, tenantId);
  }

  // ─── Data Portability ───────────────────────────────────────────────────

  /** Export all patient data — LGPD Art. 18, V */
  @Get('export/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Export all patient data (LGPD Art. 18, V — data portability)' })
  @ApiResponse({ status: 200, description: 'Exported patient data' })
  async exportPatientData(
    @Param('patientId') patientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.exportPatientData(patientId, tenantId);
  }

  // ─── Anonymization ─────────────────────────────────────────────────────

  /** Anonymize patient data — LGPD Art. 18, VI */
  @Post('anonymize/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Anonymize patient data (LGPD Art. 18, VI)' })
  @ApiResponse({ status: 200, description: 'Patient data anonymized' })
  async anonymizePatientData(
    @Param('patientId') patientId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lgpdService.anonymizePatientData(patientId, tenantId, user.sub);
  }

  // ─── Retention Policies ─────────────────────────────────────────────────

  /** List retention policies */
  @Get('retention-policies')
  @ApiOperation({ summary: 'List data retention policies' })
  @ApiResponse({ status: 200, description: 'Retention policies' })
  async getRetentionPolicies(@CurrentTenant() tenantId: string) {
    return this.lgpdService.getDataRetentionPolicies(tenantId);
  }

  /** Update retention policy — LGPD Art. 15 */
  @Put('retention-policies')
  @ApiOperation({ summary: 'Set data retention policy (LGPD Art. 15)' })
  @ApiResponse({ status: 200, description: 'Retention policy updated' })
  async setRetentionPolicy(
    @Body() dto: SetRetentionPolicyDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.setRetentionPolicy(tenantId, {
      dataCategory: dto.dataCategory,
      retentionYears: dto.retentionYears,
      legalBasis: dto.legalBasis,
      description: dto.description,
    });
  }

  // ─── Compliance Report ──────────────────────────────────────────────────

  /** Generate LGPD compliance report — LGPD Art. 37-38 */
  @Get('compliance-report')
  @ApiOperation({ summary: 'Generate LGPD compliance report (Art. 37-38)' })
  @ApiResponse({ status: 200, description: 'Compliance report' })
  async generateComplianceReport(
    @Query() query: ComplianceReportQueryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.generatePrivacyReport(
      tenantId,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  // ─── Data Purge ─────────────────────────────────────────────────────────

  /** Purge expired data — LGPD Art. 16 */
  @Post('purge-expired')
  @ApiOperation({ summary: 'Purge expired data (LGPD Art. 16)' })
  @ApiResponse({ status: 200, description: 'Expired data purged' })
  async purgeExpiredData(@CurrentTenant() tenantId: string) {
    return this.lgpdService.purgeExpiredData(tenantId);
  }
}
