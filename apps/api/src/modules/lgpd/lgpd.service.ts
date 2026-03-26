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
import {
  SubjectRequestType,
  SubjectRequestStatus,
  IncidentSeverity,
  IncidentStatus,
} from './dto/lgpd-dpo.dto';

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

  // ─── DPO Dashboard (LGPD Art. 41) ──────────────────────────────────────────

  /**
   * Get comprehensive DPO (Data Protection Officer) dashboard data.
   * LGPD Art. 41 — The controller shall appoint a DPO.
   */
  async getDpoDashboard(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Consent metrics
    const [totalConsents, activeConsents, revokedConsents] = await Promise.all([
      this.prisma.consentRecord.count({ where: { tenantId } }),
      this.prisma.consentRecord.count({
        where: {
          tenantId,
          granted: true,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.consentRecord.count({
        where: { tenantId, revokedAt: { not: null } },
      }),
    ]);

    // Consents grouped by type
    const consentsByType = await this.prisma.consentRecord.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: true,
    });

    // Data access logs last 30 days grouped by day
    const accessLogs = await this.prisma.dataAccessLog.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const accessByDay = new Map<string, number>();
    for (const log of accessLogs) {
      const dayKey = log.createdAt.toISOString().split('T')[0];
      accessByDay.set(dayKey, (accessByDay.get(dayKey) ?? 0) + 1);
    }
    const dataAccessLogsByDay = Array.from(accessByDay.entries()).map(
      ([date, count]) => ({ date, count }),
    );

    // Pending subject requests (stored as ClinicalDocument with [LGPD:REQUEST] prefix)
    const pendingSubjectRequests = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[LGPD:REQUEST]' },
        status: 'DRAFT', // DRAFT = PENDING in our mapping
      },
      orderBy: { createdAt: 'desc' },
    });

    // Anonymizations last 90 days
    const anonymizationsPerformed = await this.prisma.anonymizationLog.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: ninetyDaysAgo },
      },
    });

    // Data categories at risk: find ConsentTypes with no active consent across any patient
    const allConsentTypes = Object.values(ConsentType);
    const activeConsentTypes = await this.prisma.consentRecord.findMany({
      where: {
        tenantId,
        granted: true,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { type: true },
      distinct: ['type'],
    });
    const activeTypeSet = new Set(activeConsentTypes.map((c) => c.type));
    const categoriesAtRisk = allConsentTypes.filter((t) => !activeTypeSet.has(t));

    // Compliance score (0-100)
    const retentionPolicies = await this.prisma.dataRetentionPolicy.findMany({
      where: { tenantId },
    });
    const auditLogCount = await this.prisma.auditLog.count({
      where: { tenantId, timestamp: { gte: thirtyDaysAgo } },
    });

    let complianceScore = 0;
    // 40 points: percentage of consent types that are active
    const consentCoverage =
      allConsentTypes.length > 0
        ? (activeTypeSet.size / allConsentTypes.length) * 40
        : 0;
    complianceScore += Math.round(consentCoverage);

    // 30 points: retention policies configured (at least 4 categories expected)
    const expectedCategories = 4;
    const retentionCoverage = Math.min(retentionPolicies.length / expectedCategories, 1) * 30;
    complianceScore += Math.round(retentionCoverage);

    // 30 points: audit trail active (at least 1 log in last 30 days)
    complianceScore += auditLogCount > 0 ? 30 : 0;

    return {
      totalConsents,
      activeConsents,
      revokedConsents,
      consentsByType: consentsByType.map((c) => ({
        type: c.type,
        count: c._count,
      })),
      dataAccessLogsByDay,
      pendingSubjectRequests: pendingSubjectRequests.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        status: doc.status,
        createdAt: doc.createdAt,
      })),
      anonymizationsPerformed,
      categoriesAtRisk,
      complianceScore: Math.min(complianceScore, 100),
    };
  }

  // ─── Subject Requests (LGPD Art. 18) ───────────────────────────────────────

  /**
   * Create a data subject request.
   * LGPD Art. 18 — Data subject rights. Deadline: 15 days.
   * Stored as ClinicalDocument with title prefix [LGPD:REQUEST].
   */
  async createSubjectRequest(
    tenantId: string,
    data: {
      type: SubjectRequestType;
      patientId: string;
      requestedBy: string;
      description: string;
    },
    authorId: string,
  ) {
    // Verify patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: data.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(
        `Paciente com ID "${data.patientId}" nao encontrado neste tenant`,
      );
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 15); // LGPD Art. 18 — 15 days

    const content = JSON.stringify({
      type: data.type,
      requestedBy: data.requestedBy,
      description: data.description,
      status: SubjectRequestStatus.PENDING,
      deadline: deadline.toISOString(),
      response: null,
      statusHistory: [
        {
          status: SubjectRequestStatus.PENDING,
          timestamp: new Date().toISOString(),
          note: 'Solicitacao criada',
        },
      ],
    });

    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: data.patientId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[LGPD:REQUEST] ${data.type} — ${data.requestedBy}`,
        content,
        status: 'DRAFT', // DRAFT = PENDING
      },
    });

    this.logger.log(
      `Subject request ${data.type} created for patient ${data.patientId} by ${data.requestedBy}`,
    );

    return {
      id: document.id,
      type: data.type,
      patientId: data.patientId,
      requestedBy: data.requestedBy,
      description: data.description,
      status: SubjectRequestStatus.PENDING,
      deadline: deadline.toISOString(),
      createdAt: document.createdAt,
    };
  }

  /**
   * List data subject requests with optional filters.
   */
  async listSubjectRequests(
    tenantId: string,
    filters: {
      status?: SubjectRequestStatus;
      type?: SubjectRequestType;
      startDate?: string;
      endDate?: string;
    },
  ) {
    // Map SubjectRequestStatus to DocumentStatus for DB query
    const statusToDocStatus: Record<SubjectRequestStatus, string> = {
      [SubjectRequestStatus.PENDING]: 'DRAFT',
      [SubjectRequestStatus.IN_PROGRESS]: 'DRAFT',
      [SubjectRequestStatus.COMPLETED]: 'FINAL',
      [SubjectRequestStatus.DENIED]: 'FINAL',
    };

    const where: Record<string, unknown> = {
      tenantId,
      title: { startsWith: '[LGPD:REQUEST]' },
    };

    if (filters.status) {
      where['status'] = statusToDocStatus[filters.status];
    }

    if (filters.type) {
      where['title'] = { startsWith: `[LGPD:REQUEST] ${filters.type}` };
    }

    if (filters.startDate || filters.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) createdAt['gte'] = new Date(filters.startDate);
      if (filters.endDate) createdAt['lte'] = new Date(filters.endDate);
      where['createdAt'] = createdAt;
    }

    const documents = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => {
      const parsed = doc.content ? JSON.parse(doc.content) as {
        type: SubjectRequestType;
        requestedBy: string;
        description: string;
        status: SubjectRequestStatus;
        deadline: string;
        response: string | null;
      } : null;

      return {
        id: doc.id,
        type: parsed?.type ?? 'UNKNOWN',
        patientId: doc.patientId,
        requestedBy: parsed?.requestedBy ?? '',
        description: parsed?.description ?? '',
        status: parsed?.status ?? SubjectRequestStatus.PENDING,
        deadline: parsed?.deadline ?? null,
        response: parsed?.response ?? null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });
  }

  /**
   * Update the status of a data subject request.
   */
  async updateSubjectRequest(
    tenantId: string,
    requestId: string,
    status: SubjectRequestStatus,
    response?: string,
  ) {
    const document = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: requestId,
        tenantId,
        title: { startsWith: '[LGPD:REQUEST]' },
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Solicitacao LGPD com ID "${requestId}" nao encontrada`,
      );
    }

    const parsed = document.content ? JSON.parse(document.content) as {
      type: SubjectRequestType;
      requestedBy: string;
      description: string;
      status: SubjectRequestStatus;
      deadline: string;
      response: string | null;
      statusHistory: Array<{ status: string; timestamp: string; note?: string }>;
    } : null;

    if (!parsed) {
      throw new BadRequestException('Conteudo da solicitacao invalido');
    }

    parsed.status = status;
    parsed.response = response ?? parsed.response;
    parsed.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: response,
    });

    const docStatus =
      status === SubjectRequestStatus.COMPLETED || status === SubjectRequestStatus.DENIED
        ? 'FINAL'
        : 'DRAFT';

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: requestId },
      data: {
        content: JSON.stringify(parsed),
        status: docStatus as 'DRAFT' | 'FINAL',
      },
    });

    this.logger.log(
      `Subject request ${requestId} updated to ${status}`,
    );

    return {
      id: updated.id,
      type: parsed.type,
      status: parsed.status,
      response: parsed.response,
      updatedAt: updated.updatedAt,
    };
  }

  // ─── Data Incidents (LGPD Art. 48) ─────────────────────────────────────────

  /**
   * Record a data breach/incident.
   * LGPD Art. 48 — Controller must notify the authority and data subjects
   * in case of a security incident that may cause risk or damage.
   * Stored as ClinicalDocument with title prefix [LGPD:INCIDENT].
   */
  async createDataIncident(
    tenantId: string,
    data: {
      severity: IncidentSeverity;
      affectedRecords: number;
      description: string;
      containmentActions: string;
      notifiedAnpd: boolean;
    },
    authorId: string,
  ) {
    const content = JSON.stringify({
      severity: data.severity,
      affectedRecords: data.affectedRecords,
      description: data.description,
      containmentActions: data.containmentActions,
      notifiedAnpd: data.notifiedAnpd,
      status: IncidentStatus.DETECTED,
      timeline: [
        {
          status: IncidentStatus.DETECTED,
          timestamp: new Date().toISOString(),
          note: data.description,
        },
      ],
    });

    // Use a system patient placeholder for incident docs.
    // We need a patientId for ClinicalDocument — use the authorId to look up a
    // "system" patient or pick the first patient in the tenant as placeholder.
    const systemPatient = await this.prisma.patient.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    if (!systemPatient) {
      throw new BadRequestException(
        'Nenhum paciente cadastrado no tenant — necessario para registro de incidente',
      );
    }

    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: systemPatient.id,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[LGPD:INCIDENT] ${data.severity} — ${data.affectedRecords} registros afetados`,
        content,
        status: 'DRAFT',
      },
    });

    this.logger.warn(
      `Data incident created: severity=${data.severity}, affected=${data.affectedRecords}, anpd_notified=${data.notifiedAnpd}`,
    );

    return {
      id: document.id,
      severity: data.severity,
      affectedRecords: data.affectedRecords,
      status: IncidentStatus.DETECTED,
      notifiedAnpd: data.notifiedAnpd,
      createdAt: document.createdAt,
    };
  }

  /**
   * List all data incidents for a tenant.
   */
  async listDataIncidents(tenantId: string) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[LGPD:INCIDENT]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => {
      const parsed = doc.content ? JSON.parse(doc.content) as {
        severity: IncidentSeverity;
        affectedRecords: number;
        description: string;
        containmentActions: string;
        notifiedAnpd: boolean;
        status: IncidentStatus;
        timeline: Array<{ status: string; timestamp: string; note?: string }>;
      } : null;

      return {
        id: doc.id,
        severity: parsed?.severity ?? IncidentSeverity.LOW,
        affectedRecords: parsed?.affectedRecords ?? 0,
        description: parsed?.description ?? '',
        containmentActions: parsed?.containmentActions ?? '',
        notifiedAnpd: parsed?.notifiedAnpd ?? false,
        status: parsed?.status ?? IncidentStatus.DETECTED,
        timeline: parsed?.timeline ?? [],
        createdAt: doc.createdAt,
      };
    });
  }

  // ─── DPIA — Data Protection Impact Assessment (LGPD Art. 38) ───────────────

  /**
   * Generate and store a Data Protection Impact Assessment.
   * LGPD Art. 38 — The authority may request a DPIA.
   * Stored as ClinicalDocument with title prefix [LGPD:DPIA].
   */
  async generateDpia(
    tenantId: string,
    data: {
      processName: string;
      purpose: string;
      dataCategories: string[];
      risks: string[];
      mitigationMeasures: string[];
    },
    authorId: string,
  ) {
    const content = JSON.stringify({
      processName: data.processName,
      purpose: data.purpose,
      dataCategories: data.dataCategories,
      risks: data.risks,
      mitigationMeasures: data.mitigationMeasures,
      riskLevel: this.calculateDpiaRiskLevel(data.risks.length, data.mitigationMeasures.length),
      generatedAt: new Date().toISOString(),
      lgpdReference: 'Lei 13.709/2018, Art. 38',
    });

    // Use first patient as placeholder for the DPIA document
    const systemPatient = await this.prisma.patient.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    if (!systemPatient) {
      throw new BadRequestException(
        'Nenhum paciente cadastrado no tenant — necessario para registro de DPIA',
      );
    }

    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: systemPatient.id,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[LGPD:DPIA] ${data.processName}`,
        content,
        status: 'FINAL',
      },
    });

    this.logger.log(
      `DPIA generated for process "${data.processName}" in tenant ${tenantId}`,
    );

    return {
      id: document.id,
      processName: data.processName,
      purpose: data.purpose,
      dataCategories: data.dataCategories,
      risks: data.risks,
      mitigationMeasures: data.mitigationMeasures,
      riskLevel: this.calculateDpiaRiskLevel(data.risks.length, data.mitigationMeasures.length),
      createdAt: document.createdAt,
    };
  }

  /**
   * List all DPIAs for a tenant.
   */
  async listDpias(tenantId: string) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[LGPD:DPIA]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => {
      const parsed = doc.content ? JSON.parse(doc.content) as {
        processName: string;
        purpose: string;
        dataCategories: string[];
        risks: string[];
        mitigationMeasures: string[];
        riskLevel: string;
        generatedAt: string;
      } : null;

      return {
        id: doc.id,
        processName: parsed?.processName ?? '',
        purpose: parsed?.purpose ?? '',
        dataCategories: parsed?.dataCategories ?? [],
        risks: parsed?.risks ?? [],
        mitigationMeasures: parsed?.mitigationMeasures ?? [],
        riskLevel: parsed?.riskLevel ?? 'UNKNOWN',
        createdAt: doc.createdAt,
      };
    });
  }

  /**
   * Calculate risk level for a DPIA based on risk-to-mitigation ratio.
   */
  private calculateDpiaRiskLevel(riskCount: number, mitigationCount: number): string {
    if (riskCount === 0) return 'LOW';
    const ratio = mitigationCount / riskCount;
    if (ratio >= 1) return 'LOW';
    if (ratio >= 0.5) return 'MEDIUM';
    return 'HIGH';
  }
}
