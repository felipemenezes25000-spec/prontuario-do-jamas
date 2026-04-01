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
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { GovernanceAdvancedService } from './governance-advanced.service';
import {
  SectorType,
  RestoreResult,
  SensitiveDiagnosisCategory,
  type DataPortabilityDto,
  type SessionTimeoutDto,
  type PasswordPolicyDto,
  type BackupRecoveryDto,
  type DpiaReportDto,
  type SensitiveDataSegregationDto,
} from './dto/governance-advanced.dto';

@ApiTags('Governance - Advanced')
@ApiBearerAuth('access-token')
@Controller('governance')
export class GovernanceAdvancedController {
  constructor(private readonly service: GovernanceAdvancedService) {}

  // ─── LGPD Data Portability ───────────────────────────────────────────────

  @Post('portability')
  @ApiOperation({
    summary: 'Request LGPD data portability export (Art. 18) — JSON, PDF or FHIR, 15-day SLA',
  })
  @ApiResponse({ status: 201, description: 'Portability request created' })
  async createPortabilityRequest(
    @CurrentTenant() tenantId: string,
    @Body() dto: DataPortabilityDto,
  ) {
    return this.service.createPortabilityRequest(tenantId, dto);
  }

  @Post('portability/:requestId/process')
  @ApiParam({ name: 'requestId', description: 'Portability request UUID' })
  @ApiOperation({ summary: 'Process portability request and generate data package' })
  @ApiResponse({ status: 201, description: 'Data package generated' })
  async processPortabilityRequest(
    @CurrentTenant() tenantId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.service.processPortabilityRequest(tenantId, requestId);
  }

  @Get('portability')
  @ApiOperation({ summary: 'List all LGPD portability requests for the tenant' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiResponse({ status: 200, description: 'List of portability requests' })
  async listPortabilityRequests(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.listPortabilityRequests(tenantId, patientId);
  }

  // ─── Session Timeout ─────────────────────────────────────────────────────

  @Get('session-policies')
  @ApiOperation({ summary: 'List session timeout policies for all sectors' })
  @ApiResponse({ status: 200, description: 'Session policies' })
  async listSessionPolicies(@CurrentTenant() tenantId: string) {
    return this.service.listSessionPolicies(tenantId);
  }

  @Get('session-policies/:sectorType')
  @ApiParam({ name: 'sectorType', enum: SectorType })
  @ApiOperation({ summary: 'Get session timeout policy for a specific sector' })
  @ApiResponse({ status: 200, description: 'Session policy for sector' })
  async getSessionPolicy(
    @CurrentTenant() tenantId: string,
    @Param('sectorType') sectorType: SectorType,
  ) {
    return this.service.getSessionPolicy(tenantId, sectorType);
  }

  @Post('session-policies')
  @ApiOperation({
    summary: 'Upsert session timeout policy — ICU gets shorter timeout than admin',
  })
  @ApiResponse({ status: 201, description: 'Session policy saved' })
  async upsertSessionPolicy(
    @CurrentTenant() tenantId: string,
    @Body() dto: SessionTimeoutDto,
  ) {
    return this.service.upsertSessionPolicy(tenantId, dto);
  }

  // ─── Password Policy ─────────────────────────────────────────────────────

  @Get('password-policy')
  @ApiOperation({ summary: 'Get password policy for the tenant' })
  @ApiResponse({ status: 200, description: 'Password policy' })
  async getPasswordPolicy(@CurrentTenant() tenantId: string) {
    return this.service.getPasswordPolicy(tenantId);
  }

  @Post('password-policy')
  @ApiOperation({
    summary: 'Upsert password policy (complexity, rotation, history, lockout)',
  })
  @ApiResponse({ status: 201, description: 'Password policy saved' })
  async upsertPasswordPolicy(
    @CurrentTenant() tenantId: string,
    @Body() dto: PasswordPolicyDto,
  ) {
    return this.service.upsertPasswordPolicy(tenantId, dto);
  }

  @Post('password-policy/validate')
  @ApiOperation({ summary: 'Validate a candidate password against the tenant policy' })
  @ApiResponse({ status: 201, description: 'Validation result' })
  async validatePassword(
    @CurrentTenant() tenantId: string,
    @Body() body: { password: string },
  ) {
    return this.service.validatePassword(tenantId, body.password);
  }

  // ─── Backup & Disaster Recovery ──────────────────────────────────────────

  @Post('backup-configs')
  @ApiOperation({
    summary: 'Create backup configuration — RPO < 1h, RTO < 4h, cross-region replication',
  })
  @ApiResponse({ status: 201, description: 'Backup config created' })
  async createBackupConfig(
    @CurrentTenant() tenantId: string,
    @Body() dto: BackupRecoveryDto,
  ) {
    return this.service.createBackupConfig(tenantId, dto);
  }

  @Get('backup-configs')
  @ApiOperation({ summary: 'List all backup configurations for the tenant' })
  @ApiResponse({ status: 200, description: 'Backup configurations' })
  async listBackupConfigs(@CurrentTenant() tenantId: string) {
    return this.service.listBackupConfigs(tenantId);
  }

  @Patch('backup-configs/:configId/restore-test')
  @ApiParam({ name: 'configId', description: 'Backup config UUID' })
  @ApiOperation({ summary: 'Record result of a periodic restore test' })
  @ApiResponse({ status: 200, description: 'Restore test recorded' })
  async recordRestoreTest(
    @CurrentTenant() tenantId: string,
    @Param('configId') configId: string,
    @Body() body: { result: RestoreResult; notes?: string },
  ) {
    return this.service.recordRestoreTest(tenantId, configId, body.result, body.notes);
  }

  @Get('disaster-recovery/status')
  @ApiOperation({
    summary: 'Get disaster recovery compliance status — RPO/RTO compliance, last test date',
  })
  @ApiResponse({ status: 200, description: 'Disaster recovery status' })
  async getDisasterRecoveryStatus(@CurrentTenant() tenantId: string) {
    return this.service.getDisasterRecoveryStatus(tenantId);
  }

  // ─── DPO Dashboard ───────────────────────────────────────────────────────

  @Get('dpo-dashboard')
  @ApiOperation({
    summary: 'DPO dashboard — consents, LGPD requests, incidents, RIPD status, data mapping',
  })
  @ApiResponse({ status: 200, description: 'DPO dashboard data' })
  async getDpoDashboard(@CurrentTenant() tenantId: string) {
    return this.service.getDpoDashboard(tenantId);
  }

  // ─── DPIA ────────────────────────────────────────────────────────────────

  @Post('dpia')
  @ApiOperation({
    summary: 'Create DPIA (Data Protection Impact Assessment) report',
  })
  @ApiResponse({ status: 201, description: 'DPIA report created' })
  async createDpiaReport(
    @CurrentTenant() tenantId: string,
    @Body() dto: DpiaReportDto,
  ) {
    return this.service.createDpiaReport(tenantId, dto);
  }

  @Get('dpia')
  @ApiOperation({ summary: 'List all DPIA reports for the tenant' })
  @ApiResponse({ status: 200, description: 'DPIA reports' })
  async listDpiaReports(@CurrentTenant() tenantId: string) {
    return this.service.listDpiaReports(tenantId);
  }

  @Get('dpia/:dpiaId')
  @ApiParam({ name: 'dpiaId', description: 'DPIA UUID' })
  @ApiOperation({ summary: 'Get a specific DPIA report' })
  @ApiResponse({ status: 200, description: 'DPIA report' })
  async getDpiaReport(
    @CurrentTenant() tenantId: string,
    @Param('dpiaId') dpiaId: string,
  ) {
    return this.service.getDpiaReport(tenantId, dpiaId);
  }

  // ─── Sensitive Data Segregation ──────────────────────────────────────────

  @Get('sensitive-policies')
  @ApiOperation({
    summary: 'List sensitive data access policies (HIV, psychiatry, STI, genetics)',
  })
  @ApiResponse({ status: 200, description: 'Sensitive data policies' })
  async getSensitivePolicies(@CurrentTenant() tenantId: string) {
    return this.service.getSensitivePolicies(tenantId);
  }

  @Post('sensitive-policies')
  @ApiOperation({ summary: 'Create or update sensitive data policy for a diagnosis category' })
  @ApiResponse({ status: 201, description: 'Sensitive policy saved' })
  async upsertSensitivePolicy(
    @CurrentTenant() tenantId: string,
    @Body() dto: SensitiveDataSegregationDto,
  ) {
    return this.service.upsertSensitivePolicy(tenantId, dto);
  }

  @Get('sensitive-policies/:category/check')
  @ApiParam({ name: 'category', enum: SensitiveDiagnosisCategory })
  @ApiQuery({ name: 'role', required: true, description: 'User role to check access for' })
  @ApiOperation({ summary: 'Check if a user role is allowed to access a sensitive data category' })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkSensitiveAccess(
    @CurrentTenant() tenantId: string,
    @Param('category') category: SensitiveDiagnosisCategory,
    @Query('role') role: string,
  ) {
    return this.service.checkSensitiveAccess(tenantId, category, role);
  }
}
