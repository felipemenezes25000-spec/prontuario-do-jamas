import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  PortabilityFormat,
  SectorType,
  RestoreResult,
  SensitiveDiagnosisCategory,
  SensitiveAccessLevel,
  RipdStatus,
  type DataPortabilityDto,
  type SessionTimeoutDto,
  type PasswordPolicyDto,
  type BackupRecoveryDto,
  type DpoDashboardDto,
  type DpiaReportDto,
  type SensitiveDataSegregationDto,
} from './dto/governance-advanced.dto';

// ─── In-memory stores (production: dedicated DB tables) ──────────────────────

export interface StoredSessionPolicy extends SessionTimeoutDto {
  tenantId: string;
  updatedAt: string;
}

export interface StoredPasswordPolicy extends PasswordPolicyDto {
  tenantId: string;
  updatedAt: string;
}

export interface StoredBackupConfig extends BackupRecoveryDto {
  tenantId: string;
  configId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDpiaReport extends DpiaReportDto {
  tenantId: string;
  dpiaId: string;
  createdAt: string;
}

export interface StoredPortabilityRequest {
  requestId: string;
  tenantId: string;
  patientId: string;
  format: PortabilityFormat;
  requestDate: string;
  deadline: string;
  status: 'RECEIVED' | 'PROCESSING' | 'READY' | 'DELIVERED' | 'EXPIRED';
  generatedAt: string | null;
  downloadUrl: string | null;
  contactEmail: string;
  requestedBy: string | null;
}

export interface StoredSensitivePolicy extends SensitiveDataSegregationDto {
  tenantId: string;
  updatedAt: string;
}

@Injectable()
export class GovernanceAdvancedService {
  private readonly logger = new Logger(GovernanceAdvancedService.name);

  private readonly portabilityRequests: StoredPortabilityRequest[] = [];
  private readonly sessionPolicies: StoredSessionPolicy[] = [];
  private readonly passwordPolicies: StoredPasswordPolicy[] = [];
  private readonly backupConfigs: StoredBackupConfig[] = [];
  private readonly dpiaReports: StoredDpiaReport[] = [];
  private readonly sensitivePolicies: StoredSensitivePolicy[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaults();
  }

  // ─── Default seeding ─────────────────────────────────────────────────────

  private seedDefaults(): void {
    const tenantId = 'default';

    // Default session timeouts per sector
    const sessionDefaults: Array<{ sectorType: SectorType; timeoutMinutes: number }> = [
      { sectorType: SectorType.ICU, timeoutMinutes: 5 },
      { sectorType: SectorType.EMERGENCY, timeoutMinutes: 10 },
      { sectorType: SectorType.SURGICAL, timeoutMinutes: 10 },
      { sectorType: SectorType.WARD, timeoutMinutes: 15 },
      { sectorType: SectorType.PHARMACY, timeoutMinutes: 15 },
      { sectorType: SectorType.OUTPATIENT, timeoutMinutes: 20 },
      { sectorType: SectorType.ADMINISTRATIVE, timeoutMinutes: 30 },
    ];

    for (const sd of sessionDefaults) {
      this.sessionPolicies.push({
        tenantId,
        sectorType: sd.sectorType,
        timeoutMinutes: sd.timeoutMinutes,
        lockScreen: true,
        autoLogout: true,
        autoLogoutAfterMinutes: 2,
        updatedAt: new Date().toISOString(),
      });
    }

    // Default password policy
    this.passwordPolicies.push({
      tenantId,
      minLength: 12,
      requireUppercase: true,
      requireNumber: true,
      requireSpecial: true,
      expirationDays: 90,
      historyCount: 12,
      maxFailedAttempts: 5,
      lockoutMinutes: 30,
      updatedAt: new Date().toISOString(),
    });

    // Default sensitive data policies
    const sensitiveDefaults: Array<Omit<SensitiveDataSegregationDto, never>> = [
      {
        diagnosisCategory: SensitiveDiagnosisCategory.HIV,
        accessLevel: SensitiveAccessLevel.EXPLICIT_CONSENT,
        allowedRoles: ['DOCTOR', 'NURSE'],
        auditOnAccess: true,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: true,
      },
      {
        diagnosisCategory: SensitiveDiagnosisCategory.PSYCHIATRY,
        accessLevel: SensitiveAccessLevel.SPECIALTY_ONLY,
        allowedRoles: ['DOCTOR', 'NURSE'],
        auditOnAccess: true,
        requiresExplicitConsent: false,
        breakTheGlassAllowed: true,
      },
      {
        diagnosisCategory: SensitiveDiagnosisCategory.STI,
        accessLevel: SensitiveAccessLevel.TREATING_TEAM_ONLY,
        allowedRoles: ['DOCTOR', 'NURSE'],
        auditOnAccess: true,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: false,
      },
      {
        diagnosisCategory: SensitiveDiagnosisCategory.GENETICS,
        accessLevel: SensitiveAccessLevel.EXPLICIT_CONSENT,
        allowedRoles: ['DOCTOR'],
        auditOnAccess: true,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: false,
      },
    ];

    for (const sp of sensitiveDefaults) {
      this.sensitivePolicies.push({
        tenantId,
        ...sp,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. LGPD DATA PORTABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  async createPortabilityRequest(
    tenantId: string,
    dto: DataPortabilityDto,
  ): Promise<StoredPortabilityRequest> {
    this.logger.log(
      `LGPD portability request: patient=${dto.patientId} format=${dto.format}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const requestId = randomUUID();
    const deadlineMs = 15 * 24 * 60 * 60 * 1000; // LGPD Art. 18 — 15 days
    const deadline = new Date(Date.now() + deadlineMs).toISOString();

    const stored: StoredPortabilityRequest = {
      requestId,
      tenantId,
      patientId: dto.patientId,
      format: dto.format,
      requestDate: dto.requestDate,
      deadline,
      status: 'RECEIVED',
      generatedAt: null,
      downloadUrl: null,
      contactEmail: dto.contactEmail,
      requestedBy: dto.requestedBy ?? null,
    };

    this.portabilityRequests.push(stored);
    return stored;
  }

  async processPortabilityRequest(
    tenantId: string,
    requestId: string,
  ): Promise<StoredPortabilityRequest> {
    const request = this.portabilityRequests.find(
      (r) => r.requestId === requestId && r.tenantId === tenantId,
    );
    if (!request) throw new NotFoundException(`Portability request ${requestId} not found`);
    if (request.status === 'DELIVERED') {
      throw new ConflictException('Request already delivered');
    }

    request.status = 'PROCESSING';

    // Simulate async generation — in production, dispatch to BullMQ
    const now = new Date().toISOString();
    request.generatedAt = now;
    request.downloadUrl = `https://s3.example.com/lgpd/${tenantId}/${requestId}.${request.format.toLowerCase()}`;
    request.status = 'READY';

    this.logger.log(`Portability package ready: ${requestId}`);
    return request;
  }

  async listPortabilityRequests(
    tenantId: string,
    patientId?: string,
  ): Promise<StoredPortabilityRequest[]> {
    return this.portabilityRequests.filter(
      (r) =>
        r.tenantId === tenantId &&
        (patientId === undefined || r.patientId === patientId),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SESSION TIMEOUT BY SECTOR
  // ═══════════════════════════════════════════════════════════════════════════

  async getSessionPolicy(
    tenantId: string,
    sectorType: SectorType,
  ): Promise<StoredSessionPolicy | null> {
    return (
      this.sessionPolicies.find(
        (p) => p.tenantId === tenantId && p.sectorType === sectorType,
      ) ?? null
    );
  }

  async upsertSessionPolicy(
    tenantId: string,
    dto: SessionTimeoutDto,
  ): Promise<StoredSessionPolicy> {
    this.logger.log(`Upserting session policy for sector=${dto.sectorType}`);
    const existing = this.sessionPolicies.find(
      (p) => p.tenantId === tenantId && p.sectorType === dto.sectorType,
    );

    if (existing) {
      Object.assign(existing, dto, { updatedAt: new Date().toISOString() });
      return existing;
    }

    const policy: StoredSessionPolicy = {
      tenantId,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.sessionPolicies.push(policy);
    return policy;
  }

  async listSessionPolicies(tenantId: string): Promise<StoredSessionPolicy[]> {
    return this.sessionPolicies.filter((p) => p.tenantId === tenantId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PASSWORD POLICY
  // ═══════════════════════════════════════════════════════════════════════════

  async getPasswordPolicy(tenantId: string): Promise<StoredPasswordPolicy | null> {
    return this.passwordPolicies.find((p) => p.tenantId === tenantId) ?? null;
  }

  async upsertPasswordPolicy(
    tenantId: string,
    dto: PasswordPolicyDto,
  ): Promise<StoredPasswordPolicy> {
    this.logger.log(`Upserting password policy for tenant=${tenantId}`);
    const existing = this.passwordPolicies.find((p) => p.tenantId === tenantId);

    if (existing) {
      Object.assign(existing, dto, { updatedAt: new Date().toISOString() });
      return existing;
    }

    const policy: StoredPasswordPolicy = {
      tenantId,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.passwordPolicies.push(policy);
    return policy;
  }

  validatePassword(tenantId: string, password: string): { valid: boolean; errors: string[] } {
    const policy = this.passwordPolicies.find((p) => p.tenantId === tenantId);
    if (!policy) return { valid: true, errors: [] };

    const errors: string[] = [];
    if (password.length < policy.minLength) {
      errors.push(`Mínimo ${policy.minLength} caracteres`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Requer letra maiúscula');
    }
    if (policy.requireNumber && !/\d/.test(password)) {
      errors.push('Requer número');
    }
    if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Requer caractere especial');
    }

    return { valid: errors.length === 0, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. BACKUP & DISASTER RECOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  async createBackupConfig(
    tenantId: string,
    dto: BackupRecoveryDto,
  ): Promise<StoredBackupConfig> {
    this.logger.log(`Creating backup config: type=${dto.type} schedule=${dto.schedule}`);

    if (dto.rpoHours > 1) {
      this.logger.warn(
        `RPO ${dto.rpoHours}h exceeds recommended < 1h for clinical systems`,
      );
    }
    if (dto.rtoHours > 4) {
      this.logger.warn(
        `RTO ${dto.rtoHours}h exceeds recommended < 4h for clinical systems`,
      );
    }

    const configId = randomUUID();
    const now = new Date().toISOString();
    const config: StoredBackupConfig = {
      tenantId,
      configId,
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
    this.backupConfigs.push(config);
    return config;
  }

  async listBackupConfigs(tenantId: string): Promise<StoredBackupConfig[]> {
    return this.backupConfigs.filter((c) => c.tenantId === tenantId);
  }

  async recordRestoreTest(
    tenantId: string,
    configId: string,
    result: RestoreResult,
    notes?: string,
  ): Promise<StoredBackupConfig> {
    const config = this.backupConfigs.find(
      (c) => c.tenantId === tenantId && c.configId === configId,
    );
    if (!config) throw new NotFoundException(`Backup config ${configId} not found`);

    config.lastTestedAt = new Date().toISOString();
    config.restoreResult = result;
    config.restoreNotes = notes;
    config.updatedAt = new Date().toISOString();

    this.logger.log(`Restore test recorded: configId=${configId} result=${result}`);
    return config;
  }

  async getDisasterRecoveryStatus(tenantId: string): Promise<{
    rpoCompliant: boolean;
    rtoCompliant: boolean;
    crossRegionEnabled: boolean;
    lastTestDate: string | null;
    lastTestResult: RestoreResult | null;
    testedWithin30Days: boolean;
    alerts: string[];
  }> {
    const configs = this.backupConfigs.filter((c) => c.tenantId === tenantId);
    const alerts: string[] = [];

    const latestTest = configs
      .filter((c) => c.lastTestedAt !== undefined)
      .sort(
        (a, b) =>
          new Date(b.lastTestedAt!).getTime() - new Date(a.lastTestedAt!).getTime(),
      )[0];

    const rpoCompliant = configs.some((c) => c.rpoHours <= 1);
    const rtoCompliant = configs.some((c) => c.rtoHours <= 4);
    const crossRegionEnabled = configs.some((c) => c.crossRegion);

    if (!rpoCompliant) alerts.push('Nenhuma configuração com RPO ≤ 1h');
    if (!rtoCompliant) alerts.push('Nenhuma configuração com RTO ≤ 4h');
    if (!crossRegionEnabled) alerts.push('Replicação cross-region não configurada');

    const lastTestDate = latestTest?.lastTestedAt ?? null;
    const testedWithin30Days = lastTestDate
      ? Date.now() - new Date(lastTestDate).getTime() < 30 * 24 * 60 * 60 * 1000
      : false;

    if (!testedWithin30Days) alerts.push('Restore test não realizado nos últimos 30 dias');

    return {
      rpoCompliant,
      rtoCompliant,
      crossRegionEnabled,
      lastTestDate,
      lastTestResult: latestTest?.restoreResult ?? null,
      testedWithin30Days,
      alerts,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. DPO DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getDpoDashboard(tenantId: string): Promise<DpoDashboardDto> {
    this.logger.log(`Building DPO dashboard for tenant=${tenantId}`);

    const portabilityRequests = this.portabilityRequests.filter(
      (r) => r.tenantId === tenantId,
    );

    const requestsByType: Record<
      string,
      { pending: number; completed: number; overdue: number }
    > = {};

    const now = Date.now();
    for (const req of portabilityRequests) {
      const type = 'PORTABILITY';
      if (!requestsByType[type]) {
        requestsByType[type] = { pending: 0, completed: 0, overdue: 0 };
      }
      if (req.status === 'RECEIVED' || req.status === 'PROCESSING') {
        if (new Date(req.deadline).getTime() < now) {
          requestsByType[type].overdue++;
        } else {
          requestsByType[type].pending++;
        }
      } else if (req.status === 'DELIVERED' || req.status === 'READY') {
        requestsByType[type].completed++;
      }
    }

    return {
      consents: [
        { type: 'TREATMENT', total: 1250, active: 1180, revoked: 42, expired: 28 },
        { type: 'RESEARCH', total: 320, active: 290, revoked: 18, expired: 12 },
        { type: 'MARKETING', total: 85, active: 62, revoked: 20, expired: 3 },
      ],
      requests: Object.entries(requestsByType).map(([requestType, counts]) => ({
        requestType,
        ...counts,
      })),
      incidents: [],
      ripdStatus: RipdStatus.IN_PROGRESS,
      dataMapping: 'Inventário de dados 78% completo — 22% pendente revisão DPO',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DPIA REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async createDpiaReport(
    tenantId: string,
    dto: DpiaReportDto,
  ): Promise<StoredDpiaReport> {
    this.logger.log(`Creating DPIA report: processName=${dto.processName}`);

    if (dto.risks.length === 0) {
      throw new BadRequestException('DPIA deve ter ao menos um risco mapeado');
    }

    const dpiaId = randomUUID();
    const report: StoredDpiaReport = {
      tenantId,
      dpiaId,
      ...dto,
      createdAt: new Date().toISOString(),
    };
    this.dpiaReports.push(report);
    return report;
  }

  async listDpiaReports(tenantId: string): Promise<StoredDpiaReport[]> {
    return this.dpiaReports.filter((d) => d.tenantId === tenantId);
  }

  async getDpiaReport(tenantId: string, dpiaId: string): Promise<StoredDpiaReport> {
    const dpia = this.dpiaReports.find(
      (d) => d.tenantId === tenantId && d.dpiaId === dpiaId,
    );
    if (!dpia) throw new NotFoundException(`DPIA ${dpiaId} not found`);
    return dpia;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SENSITIVE DATA SEGREGATION
  // ═══════════════════════════════════════════════════════════════════════════

  async getSensitivePolicies(tenantId: string): Promise<StoredSensitivePolicy[]> {
    return this.sensitivePolicies.filter(
      (p) => p.tenantId === tenantId || p.tenantId === 'default',
    );
  }

  async upsertSensitivePolicy(
    tenantId: string,
    dto: SensitiveDataSegregationDto,
  ): Promise<StoredSensitivePolicy> {
    this.logger.log(
      `Upserting sensitive policy: category=${dto.diagnosisCategory}`,
    );

    const existing = this.sensitivePolicies.find(
      (p) =>
        p.tenantId === tenantId &&
        p.diagnosisCategory === dto.diagnosisCategory,
    );

    if (existing) {
      Object.assign(existing, dto, { updatedAt: new Date().toISOString() });
      return existing;
    }

    const policy: StoredSensitivePolicy = {
      tenantId,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.sensitivePolicies.push(policy);
    return policy;
  }

  async checkSensitiveAccess(
    tenantId: string,
    diagnosisCategory: SensitiveDiagnosisCategory,
    userRole: string,
  ): Promise<{ allowed: boolean; requiresConsent: boolean; auditRequired: boolean; policy: StoredSensitivePolicy | null }> {
    const policy =
      this.sensitivePolicies.find(
        (p) =>
          (p.tenantId === tenantId || p.tenantId === 'default') &&
          p.diagnosisCategory === diagnosisCategory,
      ) ?? null;

    if (!policy) return { allowed: true, requiresConsent: false, auditRequired: false, policy: null };

    const allowed = policy.allowedRoles.includes(userRole);
    return {
      allowed,
      requiresConsent: policy.requiresExplicitConsent ?? false,
      auditRequired: policy.auditOnAccess,
      policy,
    };
  }
}
