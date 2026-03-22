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
@Controller('lgpd')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class LgpdController {
  constructor(private readonly lgpdService: LgpdService) {}

  // ─── Consent Management ─────────────────────────────────────────────────

  /** Record patient consent — LGPD Art. 8 */
  @Post('consent')
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
  async revokeConsent(
    @Param('patientId') patientId: string,
    @Param('consentType') consentType: ConsentType,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.revokeConsent(patientId, consentType, tenantId);
  }

  /** Get patient consents — LGPD Art. 18, II */
  @Get('consent/:patientId')
  async getPatientConsents(
    @Param('patientId') patientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.getPatientConsents(patientId, tenantId);
  }

  // ─── Data Portability ───────────────────────────────────────────────────

  /** Export all patient data — LGPD Art. 18, V */
  @Get('export/:patientId')
  async exportPatientData(
    @Param('patientId') patientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.exportPatientData(patientId, tenantId);
  }

  // ─── Anonymization ─────────────────────────────────────────────────────

  /** Anonymize patient data — LGPD Art. 18, VI */
  @Post('anonymize/:patientId')
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
  async getRetentionPolicies(@CurrentTenant() tenantId: string) {
    return this.lgpdService.getDataRetentionPolicies(tenantId);
  }

  /** Update retention policy — LGPD Art. 15 */
  @Put('retention-policies')
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
  async purgeExpiredData(@CurrentTenant() tenantId: string) {
    return this.lgpdService.purgeExpiredData(tenantId);
  }
}
