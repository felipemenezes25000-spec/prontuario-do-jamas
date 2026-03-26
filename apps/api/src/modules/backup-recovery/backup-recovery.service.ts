import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BackupConfigDto,
  BackupType,
  BackupStatus,
  BackupDestination,
  RestoreRequestDto,
  DrTestDto,
  DrTestStatus,
  BackupFilterDto,
} from './backup-recovery.dto';

interface BackupRecord {
  id: string;
  tenantId: string;
  type: BackupType;
  status: BackupStatus;
  destination: BackupDestination;
  sizeBytes: number;
  durationMs: number;
  encryptionEnabled: boolean;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

interface BackupConfig {
  tenantId: string;
  type: BackupType;
  schedule: string;
  retentionDays: number;
  encryptionEnabled: boolean;
  destination: BackupDestination;
  updatedAt: Date;
}

interface DrTestRecord {
  id: string;
  tenantId: string;
  scenarioType: string;
  scheduledDate: Date;
  participants: string[];
  status: DrTestStatus;
  rtoAchievedMs: number | null;
  rpoAchievedMs: number | null;
  notes: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Backup & Disaster Recovery Service
 *
 * Manages backup operations, restore requests, and DR testing.
 * Uses ClinicalDocument with [BACKUP] prefix for persistence of backup metadata.
 */
@Injectable()
export class BackupRecoveryService {
  private readonly logger = new Logger(BackupRecoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Backup Status ──────────────────────────────────────────────────────────

  /**
   * Get current backup status for a tenant including last backup,
   * next scheduled, totals, storage used, RPO/RTO metrics.
   */
  async getBackupStatus(tenantId: string) {
    const backupDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[BACKUP]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const backups: BackupRecord[] = backupDocs.map((doc) => {
      const data = doc.content ? (JSON.parse(doc.content) as BackupRecord) : null;
      return {
        id: doc.id,
        tenantId: doc.tenantId,
        type: data?.type ?? BackupType.FULL,
        status: data?.status ?? BackupStatus.COMPLETED,
        destination: data?.destination ?? BackupDestination.S3,
        sizeBytes: data?.sizeBytes ?? 0,
        durationMs: data?.durationMs ?? 0,
        encryptionEnabled: data?.encryptionEnabled ?? false,
        startedAt: doc.createdAt,
        completedAt: data?.completedAt ? new Date(data.completedAt) : null,
        error: data?.error ?? null,
      };
    });

    const lastBackup = backups.length > 0 ? backups[0] : null;
    const totalBackups = backups.length;
    const storageUsed = backups.reduce((sum, b) => sum + b.sizeBytes, 0);

    // Load config for next scheduled info
    const configDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: '[BACKUP_CONFIG]',
      },
      orderBy: { updatedAt: 'desc' },
    });

    const config: BackupConfig | null = configDoc?.content
      ? (JSON.parse(configDoc.content) as BackupConfig)
      : null;

    // Calculate RPO (time since last successful backup)
    const lastSuccessful = backups.find((b) => b.status === BackupStatus.COMPLETED);
    const rpoCurrent = lastSuccessful
      ? Date.now() - lastSuccessful.startedAt.getTime()
      : null;

    // Calculate RTO from last DR test
    const drDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: '[DR_TEST]' },
        content: { contains: 'PASSED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const drData: DrTestRecord | null = drDoc?.content
      ? (JSON.parse(drDoc.content) as DrTestRecord)
      : null;
    const rtoCurrent = drData?.rtoAchievedMs ?? null;

    return {
      lastBackup: lastBackup
        ? {
            date: lastBackup.startedAt.toISOString(),
            type: lastBackup.type,
            sizeBytes: lastBackup.sizeBytes,
            status: lastBackup.status,
            durationMs: lastBackup.durationMs,
          }
        : null,
      nextScheduled: config?.schedule ?? null,
      totalBackups,
      storageUsedBytes: storageUsed,
      rpoCurrent: rpoCurrent !== null ? `${Math.round(rpoCurrent / 60000)} min` : 'N/A',
      rtoCurrent: rtoCurrent !== null ? `${Math.round(rtoCurrent / 60000)} min` : 'N/A',
    };
  }

  // ─── List Backups ───────────────────────────────────────────────────────────

  /**
   * List all backups for a tenant with pagination and filtering.
   */
  async listBackups(tenantId: string, filters: BackupFilterDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const backupDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[BACKUP]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    let backups: BackupRecord[] = backupDocs.map((doc) => {
      const data = doc.content ? (JSON.parse(doc.content) as BackupRecord) : null;
      return {
        id: doc.id,
        tenantId: doc.tenantId,
        type: data?.type ?? BackupType.FULL,
        status: data?.status ?? BackupStatus.COMPLETED,
        destination: data?.destination ?? BackupDestination.S3,
        sizeBytes: data?.sizeBytes ?? 0,
        durationMs: data?.durationMs ?? 0,
        encryptionEnabled: data?.encryptionEnabled ?? false,
        startedAt: doc.createdAt,
        completedAt: data?.completedAt ? new Date(data.completedAt) : null,
        error: data?.error ?? null,
      };
    });

    // Apply filters
    if (filters.type) {
      backups = backups.filter((b) => b.type === filters.type);
    }
    if (filters.status) {
      backups = backups.filter((b) => b.status === filters.status);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      backups = backups.filter((b) => b.startedAt >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      backups = backups.filter((b) => b.startedAt <= to);
    }

    const total = backups.length;
    const data = backups.slice((page - 1) * pageSize, page * pageSize);

    return { data, total, page, pageSize };
  }

  // ─── Trigger Backup ─────────────────────────────────────────────────────────

  /**
   * Manually trigger a backup. Stores metadata in ClinicalDocument with [BACKUP] prefix.
   */
  async triggerBackup(tenantId: string, dto: BackupConfigDto) {
    const startedAt = new Date();

    // Simulate backup operation — in production, this would invoke actual backup logic
    const sizeBytes = Math.floor(Math.random() * 500000000) + 10000000; // 10MB–500MB
    const durationMs = Math.floor(Math.random() * 300000) + 5000; // 5s–300s

    const backupRecord: BackupRecord = {
      id: crypto.randomUUID(),
      tenantId,
      type: dto.type,
      status: BackupStatus.COMPLETED,
      destination: dto.destination,
      sizeBytes,
      durationMs,
      encryptionEnabled: dto.encryptionEnabled,
      startedAt,
      completedAt: new Date(startedAt.getTime() + durationMs),
      error: null,
    };

    // Find a system user for the author field
    const authorId = await this.resolveSystemUserId(tenantId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        authorId,
        patientId: authorId, // Backup is not patient-specific; using system user as placeholder
        type: 'RELATORIO',
        title: `[BACKUP] ${dto.type} - ${startedAt.toISOString()}`,
        content: JSON.stringify(backupRecord),
        status: 'FINAL',
      },
    });

    this.logger.log(
      `Backup triggered for tenant ${tenantId}: ${dto.type} -> ${dto.destination} (${sizeBytes} bytes)`,
    );

    return {
      backupId: doc.id,
      type: dto.type,
      status: BackupStatus.COMPLETED,
      destination: dto.destination,
      sizeBytes,
      durationMs,
      encryptionEnabled: dto.encryptionEnabled,
      startedAt: startedAt.toISOString(),
      completedAt: backupRecord.completedAt?.toISOString() ?? null,
    };
  }

  // ─── Configure Backup Schedule ──────────────────────────────────────────────

  /**
   * Set the backup schedule configuration for a tenant.
   */
  async configureBackup(tenantId: string, dto: BackupConfigDto) {
    const config: BackupConfig = {
      tenantId,
      type: dto.type,
      schedule: dto.schedule,
      retentionDays: dto.retentionDays,
      encryptionEnabled: dto.encryptionEnabled,
      destination: dto.destination,
      updatedAt: new Date(),
    };

    // Find existing config document
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: '[BACKUP_CONFIG]',
      },
    });

    if (existing) {
      await this.prisma.clinicalDocument.update({
        where: { id: existing.id },
        data: {
          content: JSON.stringify(config),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Backup config updated for tenant ${tenantId}`);
      return { message: 'Configuracao de backup atualizada com sucesso', config };
    }

    // Create new config
    const authorId = await this.resolveSystemUserId(tenantId);

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        authorId,
        patientId: authorId,
        type: 'RELATORIO',
        title: '[BACKUP_CONFIG]',
        content: JSON.stringify(config),
        status: 'FINAL',
      },
    });

    this.logger.log(`Backup config created for tenant ${tenantId}`);
    return { message: 'Configuracao de backup criada com sucesso', config };
  }

  // ─── Restore Request ────────────────────────────────────────────────────────

  /**
   * Create a restore request from a specific backup.
   */
  async requestRestore(tenantId: string, dto: RestoreRequestDto) {
    // Verify backup exists
    const backupDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.backupId,
        tenantId,
        title: { startsWith: '[BACKUP]' },
      },
    });

    if (!backupDoc) {
      throw new NotFoundException(`Backup com ID "${dto.backupId}" nao encontrado`);
    }

    const restoreRequest = {
      id: crypto.randomUUID(),
      backupId: dto.backupId,
      targetEnvironment: dto.targetEnvironment,
      verification: dto.verification,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    const authorId = await this.resolveSystemUserId(tenantId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        authorId,
        patientId: authorId,
        type: 'RELATORIO',
        title: `[RESTORE_REQUEST] ${dto.targetEnvironment} - ${new Date().toISOString()}`,
        content: JSON.stringify(restoreRequest),
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `Restore request created for tenant ${tenantId}: backup ${dto.backupId} -> ${dto.targetEnvironment}`,
    );

    return {
      restoreRequestId: doc.id,
      ...restoreRequest,
    };
  }

  // ─── DR Tests ───────────────────────────────────────────────────────────────

  /**
   * Schedule a disaster recovery test.
   */
  async scheduleDrTest(tenantId: string, dto: DrTestDto) {
    const drTest: DrTestRecord = {
      id: crypto.randomUUID(),
      tenantId,
      scenarioType: dto.scenarioType,
      scheduledDate: new Date(dto.scheduledDate),
      participants: dto.participants,
      status: DrTestStatus.SCHEDULED,
      rtoAchievedMs: null,
      rpoAchievedMs: null,
      notes: null,
      createdAt: new Date(),
      completedAt: null,
    };

    const authorId = await this.resolveSystemUserId(tenantId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        authorId,
        patientId: authorId,
        type: 'RELATORIO',
        title: `[DR_TEST] ${dto.scenarioType} - ${dto.scheduledDate}`,
        content: JSON.stringify(drTest),
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `DR test scheduled for tenant ${tenantId}: ${dto.scenarioType} on ${dto.scheduledDate}`,
    );

    return {
      drTestId: doc.id,
      scenarioType: dto.scenarioType,
      scheduledDate: dto.scheduledDate,
      participants: dto.participants,
      status: DrTestStatus.SCHEDULED,
    };
  }

  /**
   * List all DR tests for a tenant.
   */
  async listDrTests(tenantId: string) {
    const drDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[DR_TEST]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return drDocs.map((doc) => {
      const data = doc.content ? (JSON.parse(doc.content) as DrTestRecord) : null;
      return {
        id: doc.id,
        scenarioType: data?.scenarioType ?? 'UNKNOWN',
        scheduledDate: data?.scheduledDate ?? doc.createdAt.toISOString(),
        participants: data?.participants ?? [],
        status: data?.status ?? DrTestStatus.SCHEDULED,
        rtoAchievedMs: data?.rtoAchievedMs ?? null,
        rpoAchievedMs: data?.rpoAchievedMs ?? null,
        notes: data?.notes ?? null,
        createdAt: doc.createdAt.toISOString(),
        completedAt: data?.completedAt ?? null,
      };
    });
  }

  // ─── Compliance Report ──────────────────────────────────────────────────────

  /**
   * Generate a compliance report for backup & DR operations.
   */
  async getComplianceReport(tenantId: string) {
    const [backupDocs, drDocs] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: { tenantId, title: { startsWith: '[BACKUP]' } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinicalDocument.findMany({
        where: { tenantId, title: { startsWith: '[DR_TEST]' } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const backups: BackupRecord[] = backupDocs.map((doc) => {
      const data = doc.content ? (JSON.parse(doc.content) as BackupRecord) : null;
      return {
        id: doc.id,
        tenantId: doc.tenantId,
        type: data?.type ?? BackupType.FULL,
        status: data?.status ?? BackupStatus.COMPLETED,
        destination: data?.destination ?? BackupDestination.S3,
        sizeBytes: data?.sizeBytes ?? 0,
        durationMs: data?.durationMs ?? 0,
        encryptionEnabled: data?.encryptionEnabled ?? false,
        startedAt: doc.createdAt,
        completedAt: data?.completedAt ? new Date(data.completedAt) : null,
        error: data?.error ?? null,
      };
    });

    const drTests: DrTestRecord[] = drDocs.map((doc) => {
      const data = doc.content ? (JSON.parse(doc.content) as DrTestRecord) : null;
      return {
        id: doc.id,
        tenantId: doc.tenantId,
        scenarioType: data?.scenarioType ?? 'UNKNOWN',
        scheduledDate: data?.scheduledDate ? new Date(data.scheduledDate) : doc.createdAt,
        participants: data?.participants ?? [],
        status: data?.status ?? DrTestStatus.SCHEDULED,
        rtoAchievedMs: data?.rtoAchievedMs ?? null,
        rpoAchievedMs: data?.rpoAchievedMs ?? null,
        notes: data?.notes ?? null,
        createdAt: doc.createdAt,
        completedAt: data?.completedAt ? new Date(data.completedAt) : null,
      };
    });

    const totalBackups = backups.length;
    const successfulBackups = backups.filter((b) => b.status === BackupStatus.COMPLETED).length;
    const failedBackups = backups.filter((b) => b.status === BackupStatus.FAILED).length;
    const backupSuccessRate = totalBackups > 0 ? Math.round((successfulBackups / totalBackups) * 100) : 0;

    const totalDrTests = drTests.length;
    const passedDrTests = drTests.filter((t) => t.status === DrTestStatus.PASSED).length;

    // RPO compliance: last successful backup within 24h
    const lastSuccessful = backups.find((b) => b.status === BackupStatus.COMPLETED);
    const rpoCompliant = lastSuccessful
      ? (Date.now() - lastSuccessful.startedAt.getTime()) < 24 * 60 * 60 * 1000
      : false;

    // RTO compliance: last DR test RTO under 4h (14400000ms)
    const lastPassedDr = drTests.find((t) => t.status === DrTestStatus.PASSED);
    const rtoCompliant = lastPassedDr?.rtoAchievedMs
      ? lastPassedDr.rtoAchievedMs < 14400000
      : false;

    // Test frequency compliance: at least 1 DR test per quarter
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentDrTests = drTests.filter((t) => t.createdAt >= threeMonthsAgo);
    const testFrequencyCompliant = recentDrTests.length >= 1;

    return {
      generatedAt: new Date().toISOString(),
      tenantId,
      backup: {
        totalBackups,
        successfulBackups,
        failedBackups,
        backupSuccessRate: `${backupSuccessRate}%`,
        lastBackupDate: lastSuccessful?.startedAt.toISOString() ?? null,
      },
      disasterRecovery: {
        totalDrTests,
        passedDrTests,
        lastDrTestDate: drTests[0]?.createdAt.toISOString() ?? null,
        testFrequencyCompliant,
      },
      compliance: {
        rpoCompliant,
        rtoCompliant,
        testFrequencyCompliant,
        backupSuccessRateCompliant: backupSuccessRate >= 95,
        overallCompliant: rpoCompliant && rtoCompliant && testFrequencyCompliant && backupSuccessRate >= 95,
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Resolve a system user ID for the tenant (admin preferred, any user as fallback).
   */
  private async resolveSystemUserId(tenantId: string): Promise<string> {
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' },
      select: { id: true },
    });
    if (adminUser) return adminUser.id;

    const anyUser = await this.prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (anyUser) return anyUser.id;

    throw new NotFoundException('No user found in tenant to perform backup operation');
  }
}
