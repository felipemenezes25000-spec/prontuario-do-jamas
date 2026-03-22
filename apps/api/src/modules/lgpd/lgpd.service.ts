import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConsentType,
  LegalBasis,
  DataCategory,
} from '@prisma/client';
import * as crypto from 'crypto';

/**
 * LGPD Compliance Service
 *
 * Implements key requirements from Lei Geral de Protecao de Dados (Lei 13.709/2018):
 * - Art. 7: Legal bases for data processing
 * - Art. 8: Consent management
 * - Art. 15: End of data processing
 * - Art. 16: Data elimination
 * - Art. 18: Data subject rights (access, portability, deletion, anonymization)
 * - Art. 37: Record of processing activities
 * - Art. 46: Security measures
 */
@Injectable()
export class LgpdService {
  private readonly logger = new Logger(LgpdService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Consent Management (LGPD Art. 8) ──────────────────────────────────────

  /**
   * Record patient consent for a specific data processing purpose.
   * LGPD Art. 8 — Consent must be free, informed, and unambiguous.
   */
  async recordConsent(
    patientId: string,
    tenantId: string,
    data: {
      consentType: ConsentType;
      purpose: string;
      granted: boolean;
      legalBasis: LegalBasis;
      expiresAt?: string;
      consentText?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    // Verify patient exists and belongs to tenant
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(
        `Paciente com ID "${patientId}" nao encontrado neste tenant`,
      );
    }

    return this.prisma.consentRecord.create({
      data: {
        patientId,
        tenantId,
        type: data.consentType,
        purpose: data.purpose,
        granted: data.granted,
        grantedAt: data.granted ? new Date() : null,
        legalBasis: data.legalBasis,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        consentText: data.consentText,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Revoke a specific consent type for a patient.
   * LGPD Art. 8, §5 — Consent can be revoked at any time.
   */
  async revokeConsent(patientId: string, consentType: ConsentType, tenantId: string) {
    const activeConsent = await this.prisma.consentRecord.findFirst({
      where: {
        patientId,
        tenantId,
        type: consentType,
        granted: true,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeConsent) {
      throw new NotFoundException(
        `Consentimento ativo do tipo "${consentType}" nao encontrado para o paciente`,
      );
    }

    return this.prisma.consentRecord.update({
      where: { id: activeConsent.id },
      data: {
        granted: false,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * List all consent records for a patient.
   * LGPD Art. 18, II — Confirmation and access to processing data.
   */
  async getPatientConsents(patientId: string, tenantId: string) {
    return this.prisma.consentRecord.findMany({
      where: { patientId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if a specific consent is active for a patient.
   * Returns true if there is a granted, non-revoked, non-expired consent.
   */
  async checkConsent(
    patientId: string,
    consentType: ConsentType,
    tenantId: string,
  ): Promise<boolean> {
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        patientId,
        tenantId,
        type: consentType,
        granted: true,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return consent !== null;
  }

  // ─── Data Portability (LGPD Art. 18, V) ────────────────────────────────────

  /**
   * Export all patient data in a portable JSON format.
   * LGPD Art. 18, V — Right to data portability.
   */
  async exportPatientData(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: {
        allergies: true,
        chronicConditions: true,
        familyHistory: true,
        surgicalHistory: true,
        socialHistory: true,
        vaccinations: true,
        encounters: {
          include: {
            clinicalNotes: true,
            vitalSigns: true,
            prescriptions: {
              include: { items: true },
            },
          },
        },
        vitalSigns: true,
        examResults: true,
        documents: true,
        consentRecords: true,
        dataAccessRequests: true,
        billingEntries: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Paciente com ID "${patientId}" nao encontrado neste tenant`,
      );
    }

    // Log the data export event
    await this.prisma.dataAccessLog.create({
      data: {
        tenantId,
        userId: 'system',
        patientId,
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: patientId,
        purpose: 'LGPD Art. 18, V — Portabilidade de dados',
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      lgpdReference: 'Lei 13.709/2018, Art. 18, V',
      format: 'JSON',
      patient,
    };
  }

  // ─── Data Anonymization (LGPD Art. 18, VI) ─────────────────────────────────

  /**
   * Anonymize patient PII while preserving medical data for research.
   * LGPD Art. 18, VI — Right to anonymization, blocking, or deletion.
   * LGPD Art. 12 — Anonymized data is not considered personal data.
   */
  async anonymizePatientData(
    patientId: string,
    tenantId: string,
    requestedBy: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });

    if (!patient) {
      throw new NotFoundException(
        `Paciente com ID "${patientId}" nao encontrado neste tenant`,
      );
    }

    // Check if there are legal holds (e.g., active admissions, pending billing)
    const activeEncounters = await this.prisma.encounter.count({
      where: {
        patientId,
        status: { in: ['IN_PROGRESS', 'WAITING', 'IN_TRIAGE', 'ON_HOLD'] },
      },
    });

    if (activeEncounters > 0) {
      throw new BadRequestException(
        'Nao e possivel anonimizar dados de paciente com atendimentos ativos',
      );
    }

    // Check retention policies — some data must be retained
    const retentionPolicies = await this.prisma.dataRetentionPolicy.findMany({
      where: { tenantId },
    });

    const healthRetention = retentionPolicies.find(
      (p) => p.dataCategory === 'HEALTH_RECORDS',
    );

    if (healthRetention) {
      const retentionEndDate = new Date();
      retentionEndDate.setFullYear(
        retentionEndDate.getFullYear() - healthRetention.retentionYears,
      );
      if (patient.createdAt > retentionEndDate) {
        throw new ForbiddenException(
          `Dados do paciente estao dentro do periodo de retencao obrigatoria de ${healthRetention.retentionYears} anos (CFM Resolucao 1.821/2007)`,
        );
      }
    }

    // Create anonymization log entry
    const anonymizationLog = await this.prisma.anonymizationLog.create({
      data: {
        tenantId,
        patientId,
        requestedBy,
        status: 'IN_PROGRESS',
        dataCategories: ['PERSONAL_IDENTIFICATION'],
      },
    });

    try {
      // Generate anonymized hash from patientId for traceability
      const anonymizedHash = crypto
        .createHash('sha256')
        .update(patientId + tenantId)
        .digest('hex')
        .substring(0, 12);

      // Anonymize PII fields, keep medical data for research (LGPD Art. 12)
      await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          fullName: `ANONIMIZADO-${anonymizedHash}`,
          socialName: null,
          cpf: null,
          rg: null,
          cns: null,
          phone: null,
          phoneSecondary: null,
          email: null,
          address: null,
          addressNumber: null,
          addressComplement: null,
          neighborhood: null,
          city: null,
          state: null,
          cep: null,
          photo: null,
          motherName: null,
          fatherName: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          emergencyContactRelation: null,
          insuranceProvider: null,
          insurancePlan: null,
          insuranceNumber: null,
          isActive: false,
          deletedAt: new Date(),
        },
      });

      // Mark anonymization as completed
      await this.prisma.anonymizationLog.update({
        where: { id: anonymizationLog.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Patient ${patientId} anonymized successfully by ${requestedBy}`,
      );

      return {
        anonymizationLogId: anonymizationLog.id,
        status: 'COMPLETED',
        anonymizedHash,
        message: 'Dados pessoais anonimizados com sucesso. Dados clinicos preservados para pesquisa.',
      };
    } catch (error) {
      // Mark anonymization as failed
      await this.prisma.anonymizationLog.update({
        where: { id: anonymizationLog.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  // ─── Data Retention (LGPD Art. 15–16) ──────────────────────────────────────

  /**
   * Get retention policies for a tenant.
   */
  async getDataRetentionPolicies(tenantId: string) {
    return this.prisma.dataRetentionPolicy.findMany({
      where: { tenantId },
      orderBy: { dataCategory: 'asc' },
    });
  }

  /**
   * Set or update a data retention policy for a tenant.
   * LGPD Art. 15 — End of data processing conditions.
   */
  async setRetentionPolicy(
    tenantId: string,
    policy: {
      dataCategory: DataCategory;
      retentionYears: number;
      legalBasis: string;
      description: string;
    },
  ) {
    return this.prisma.dataRetentionPolicy.upsert({
      where: {
        tenantId_dataCategory: {
          tenantId,
          dataCategory: policy.dataCategory,
        },
      },
      update: {
        retentionYears: policy.retentionYears,
        legalBasis: policy.legalBasis,
        description: policy.description,
      },
      create: {
        tenantId,
        dataCategory: policy.dataCategory,
        retentionYears: policy.retentionYears,
        legalBasis: policy.legalBasis,
        description: policy.description,
      },
    });
  }

  /**
   * Check which records have exceeded their retention period.
   * Returns a summary of records that can potentially be purged.
   */
  async checkRetentionCompliance(tenantId: string) {
    const policies = await this.prisma.dataRetentionPolicy.findMany({
      where: { tenantId },
    });

    const results: Array<{
      category: DataCategory;
      retentionYears: number;
      expiredCount: number;
      oldestRecord: Date | null;
    }> = [];

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retentionYears);

      let expiredCount = 0;
      let oldestRecord: Date | null = null;

      switch (policy.dataCategory) {
        case 'HEALTH_RECORDS': {
          const data = await this.prisma.encounter.aggregate({
            where: { tenantId, createdAt: { lt: cutoffDate } },
            _count: true,
            _min: { createdAt: true },
          });
          expiredCount = data._count;
          oldestRecord = data._min.createdAt;
          break;
        }
        case 'PRESCRIPTIONS': {
          const data = await this.prisma.prescription.aggregate({
            where: { tenantId, createdAt: { lt: cutoffDate } },
            _count: true,
            _min: { createdAt: true },
          });
          expiredCount = data._count;
          oldestRecord = data._min.createdAt;
          break;
        }
        case 'BILLING': {
          const data = await this.prisma.billingEntry.aggregate({
            where: { tenantId, createdAt: { lt: cutoffDate } },
            _count: true,
            _min: { createdAt: true },
          });
          expiredCount = data._count;
          oldestRecord = data._min.createdAt;
          break;
        }
        case 'AUDIT_LOGS': {
          const data = await this.prisma.auditLog.aggregate({
            where: { tenantId, timestamp: { lt: cutoffDate } },
            _count: true,
            _min: { timestamp: true },
          });
          expiredCount = data._count;
          oldestRecord = data._min.timestamp;
          break;
        }
        default:
          break;
      }

      results.push({
        category: policy.dataCategory,
        retentionYears: policy.retentionYears,
        expiredCount,
        oldestRecord,
      });
    }

    return results;
  }

  /**
   * Purge data that has exceeded its retention period.
   * LGPD Art. 16 — Data must be eliminated after processing ends.
   *
   * Note: Health records and voice recordings follow CFM Resolution 1.821/2007
   * (20-year mandatory retention). Only truly expired data is purged.
   */
  async purgeExpiredData(tenantId: string) {
    const policies = await this.prisma.dataRetentionPolicy.findMany({
      where: { tenantId },
    });

    const purgeResults: Array<{
      category: DataCategory;
      purgedCount: number;
    }> = [];

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retentionYears);

      let purgedCount = 0;

      switch (policy.dataCategory) {
        case 'AUDIT_LOGS': {
          const result = await this.prisma.auditLog.deleteMany({
            where: { tenantId, timestamp: { lt: cutoffDate } },
          });
          purgedCount = result.count;
          break;
        }
        // Health records and voice recordings are NOT purged automatically
        // due to CFM Resolution 1.821/2007 (20-year minimum retention).
        // They require manual review and explicit authorization.
        default:
          break;
      }

      if (purgedCount > 0) {
        purgeResults.push({
          category: policy.dataCategory,
          purgedCount,
        });
      }
    }

    this.logger.log(
      `Data purge completed for tenant ${tenantId}: ${JSON.stringify(purgeResults)}`,
    );

    return {
      tenantId,
      purgedAt: new Date().toISOString(),
      results: purgeResults,
      note: 'Registros clinicos e gravacoes de voz requerem autorizacao explicita para exclusao (CFM Resolucao 1.821/2007)',
    };
  }

  // ─── Privacy Report (LGPD Art. 37–38) ──────────────────────────────────────

  /**
   * Generate a comprehensive LGPD compliance report for a tenant.
   * LGPD Art. 37 — Record of processing activities.
   * LGPD Art. 38 — National Authority may request impact report.
   */
  async generatePrivacyReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const [
      totalPatients,
      activeConsents,
      revokedConsents,
      dataAccessLogs,
      anonymizationLogs,
      retentionPolicies,
      dataAccessRequests,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { tenantId } }),
      this.prisma.consentRecord.count({
        where: {
          tenantId,
          granted: true,
          revokedAt: null,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.consentRecord.count({
        where: {
          tenantId,
          revokedAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.dataAccessLog.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.anonymizationLog.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.dataRetentionPolicy.findMany({
        where: { tenantId },
      }),
      this.prisma.dataAccessRequest.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Access breakdown by action type
    const accessByAction = await this.prisma.dataAccessLog.groupBy({
      by: ['action'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    // Consent breakdown by type
    const consentsByType = await this.prisma.consentRecord.groupBy({
      by: ['type'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    return {
      reportGeneratedAt: new Date().toISOString(),
      lgpdReference: 'Lei 13.709/2018, Art. 37-38',
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      tenantId,
      summary: {
        totalPatients,
        activeConsents,
        revokedConsents,
        dataAccessEvents: dataAccessLogs,
        dataSubjectRequests: dataAccessRequests,
        anonymizationRequests: anonymizationLogs.length,
        anonymizationsCompleted: anonymizationLogs.filter(
          (l) => l.status === 'COMPLETED',
        ).length,
      },
      accessBreakdown: accessByAction.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      consentBreakdown: consentsByType.map((c) => ({
        type: c.type,
        count: c._count,
      })),
      retentionPolicies: retentionPolicies.map((p) => ({
        category: p.dataCategory,
        retentionYears: p.retentionYears,
        legalBasis: p.legalBasis,
      })),
    };
  }
}
