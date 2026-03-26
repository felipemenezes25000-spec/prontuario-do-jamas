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
import {
  RecordConsentDto,
  SetRetentionPolicyDto,
  ComplianceReportQueryDto,
  CreateSubjectRequestDto,
  ListSubjectRequestsDto,
  UpdateSubjectRequestDto,
  CreateDataIncidentDto,
  CreateDpiaDto,
} from './dto';
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

  // ─── DPO Dashboard ──────────────────────────────────────────────────────

  /** Get DPO dashboard data — LGPD Art. 41 */
  @Get('dpo/dashboard')
  @ApiOperation({ summary: 'Get DPO dashboard data (LGPD Art. 41)' })
  @ApiResponse({ status: 200, description: 'DPO dashboard data' })
  async getDpoDashboard(@CurrentTenant() tenantId: string) {
    return this.lgpdService.getDpoDashboard(tenantId);
  }

  // ─── Subject Requests (LGPD Art. 18) ─────────────────────────────────────

  /** Create a data subject request — LGPD Art. 18 */
  @Post('subject-requests')
  @ApiOperation({ summary: 'Create data subject request (LGPD Art. 18)' })
  @ApiResponse({ status: 201, description: 'Subject request created' })
  async createSubjectRequest(
    @Body() dto: CreateSubjectRequestDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lgpdService.createSubjectRequest(tenantId, {
      type: dto.type,
      patientId: dto.patientId,
      requestedBy: dto.requestedBy,
      description: dto.description,
    }, user.sub);
  }

  /** List subject requests with filters */
  @Get('subject-requests')
  @ApiOperation({ summary: 'List data subject requests' })
  @ApiResponse({ status: 200, description: 'Subject requests list' })
  async listSubjectRequests(
    @Query() query: ListSubjectRequestsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.listSubjectRequests(tenantId, {
      status: query.status,
      type: query.type,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  /** Update a subject request status */
  @Put('subject-requests/:requestId')
  @ApiParam({ name: 'requestId', description: 'Subject request UUID' })
  @ApiOperation({ summary: 'Update subject request status' })
  @ApiResponse({ status: 200, description: 'Subject request updated' })
  async updateSubjectRequest(
    @Param('requestId') requestId: string,
    @Body() dto: UpdateSubjectRequestDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.lgpdService.updateSubjectRequest(
      tenantId,
      requestId,
      dto.status,
      dto.response,
    );
  }

  // ─── Data Incidents (LGPD Art. 48) ───────────────────────────────────────

  /** Record a data incident — LGPD Art. 48 */
  @Post('incidents')
  @ApiOperation({ summary: 'Record data breach/incident (LGPD Art. 48)' })
  @ApiResponse({ status: 201, description: 'Incident recorded' })
  async createDataIncident(
    @Body() dto: CreateDataIncidentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lgpdService.createDataIncident(tenantId, {
      severity: dto.severity,
      affectedRecords: dto.affectedRecords,
      description: dto.description,
      containmentActions: dto.containmentActions,
      notifiedAnpd: dto.notifiedAnpd,
    }, user.sub);
  }

  /** List data incidents */
  @Get('incidents')
  @ApiOperation({ summary: 'List data incidents' })
  @ApiResponse({ status: 200, description: 'Incidents list' })
  async listDataIncidents(@CurrentTenant() tenantId: string) {
    return this.lgpdService.listDataIncidents(tenantId);
  }

  // ─── DPIA (LGPD Art. 38) ────────────────────────────────────────────────

  /** Generate a DPIA — LGPD Art. 38 */
  @Post('dpia')
  @ApiOperation({ summary: 'Generate Data Protection Impact Assessment (LGPD Art. 38)' })
  @ApiResponse({ status: 201, description: 'DPIA generated' })
  async generateDpia(
    @Body() dto: CreateDpiaDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lgpdService.generateDpia(tenantId, {
      processName: dto.processName,
      purpose: dto.purpose,
      dataCategories: dto.dataCategories,
      risks: dto.risks,
      mitigationMeasures: dto.mitigationMeasures,
    }, user.sub);
  }

  /** List all DPIAs */
  @Get('dpia')
  @ApiOperation({ summary: 'List Data Protection Impact Assessments' })
  @ApiResponse({ status: 200, description: 'DPIA list' })
  async listDpias(@CurrentTenant() tenantId: string) {
    return this.lgpdService.listDpias(tenantId);
  }
}
