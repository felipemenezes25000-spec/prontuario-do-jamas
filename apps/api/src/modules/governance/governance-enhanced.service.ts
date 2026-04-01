import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  PortabilityStatus,
  PortabilityFormat,
  PortabilityRequestType,
  RiskLikelihood,
  RiskImpact,
  DiagnosisCategory,
  SensitiveAccessLevel,
  SensitiveAuditFrequency,
  AccessUrgency,
  AccreditationStandard,
  ComplianceStatus,
  type DataPortabilityRequestDto,
  type DataPortabilityResultDto,
  type DataPackageDto,
  type CreateDPIADto,
  type DPIADto,
  type AddDPIARiskDto,
  type DPIARiskDto,
  type DPIAResultDto,
  type ApproveDPIADto,
  type SensitiveDataPolicyDto,
  type SensitiveAccessRequestDto,
  type SensitiveAccessResultDto,
  type AccreditationChecklistDto,
  type AccreditationSectionDto,
  type AccreditationDashboardDto,
  type UpdateRequirementDto,
} from './dto/governance-enhanced.dto';

// ─── In-memory stores (production: use database tables) ────────────────────

interface StoredDPIA extends DPIADto {
  tenantId: string;
  risks: DPIARiskDto[];
  result: DPIAResultDto | null;
}

interface StoredPortabilityRequest {
  requestId: string;
  tenantId: string;
  patientId: string;
  requestType: PortabilityRequestType;
  format: PortabilityFormat;
  requestedBy: string;
  contactEmail: string;
  status: PortabilityStatus;
  deadline: string;
  createdAt: string;
}

interface StoredSensitivePolicy extends SensitiveDataPolicyDto {
  tenantId: string;
}

interface StoredAccessLog {
  id: string;
  tenantId: string;
  requesterId: string;
  patientId: string;
  diagnosisCategory: DiagnosisCategory;
  justification: string;
  urgency: AccessUrgency;
  accessGranted: boolean;
  timestamp: string;
}

@Injectable()
export class GovernanceEnhancedService {
  private readonly logger = new Logger(GovernanceEnhancedService.name);

  // In-memory stores for demo/dev — production would use Prisma models
  private readonly dpias: StoredDPIA[] = [];
  private readonly portabilityRequests: StoredPortabilityRequest[] = [];
  private readonly sensitivePolicies: StoredSensitivePolicy[] = [];
  private readonly sensitiveAccessLogs: StoredAccessLog[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultTenant = 'default';
    const defaults: SensitiveDataPolicyDto[] = [
      {
        diagnosisCategory: DiagnosisCategory.HIV,
        accessLevel: SensitiveAccessLevel.EXPLICIT_CONSENT,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: true,
        auditFrequency: SensitiveAuditFrequency.EVERY_ACCESS,
      },
      {
        diagnosisCategory: DiagnosisCategory.PSYCHIATRY,
        accessLevel: SensitiveAccessLevel.SPECIALTY_ONLY,
        requiresExplicitConsent: false,
        breakTheGlassAllowed: true,
        auditFrequency: SensitiveAuditFrequency.EVERY_ACCESS,
      },
      {
        diagnosisCategory: DiagnosisCategory.SUBSTANCE_ABUSE,
        accessLevel: SensitiveAccessLevel.TREATING_TEAM_ONLY,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: true,
        auditFrequency: SensitiveAuditFrequency.EVERY_ACCESS,
      },
      {
        diagnosisCategory: DiagnosisCategory.SEXUAL_HEALTH,
        accessLevel: SensitiveAccessLevel.TREATING_TEAM_ONLY,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: false,
        auditFrequency: SensitiveAuditFrequency.DAILY,
      },
      {
        diagnosisCategory: DiagnosisCategory.GENETIC,
        accessLevel: SensitiveAccessLevel.EXPLICIT_CONSENT,
        requiresExplicitConsent: true,
        breakTheGlassAllowed: false,
        auditFrequency: SensitiveAuditFrequency.EVERY_ACCESS,
      },
      {
        diagnosisCategory: DiagnosisCategory.DOMESTIC_VIOLENCE,
        accessLevel: SensitiveAccessLevel.TREATING_TEAM_ONLY,
        requiresExplicitConsent: false,
        breakTheGlassAllowed: true,
        auditFrequency: SensitiveAuditFrequency.EVERY_ACCESS,
      },
    ];

    for (const policy of defaults) {
      this.sensitivePolicies.push({ ...policy, tenantId: defaultTenant });
    }
  }

  // ─── 5. LGPD Data Portability ────────────────────────────────────────────

  async createPortabilityRequest(
    tenantId: string,
    dto: DataPortabilityRequestDto,
  ): Promise<DataPortabilityResultDto> {
    this.logger.log(
      `LGPD portability request: type=${dto.requestType}, patient=${dto.patientId}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const requestId = randomUUID();
    const deadlineMs = 15 * 24 * 60 * 60 * 1000; // 15 days per LGPD Art. 18
    const deadline = new Date(Date.now() + deadlineMs).toISOString();

    const stored: StoredPortabilityRequest = {
      requestId,
      tenantId,
      patientId: dto.patientId,
      requestType: dto.requestType,
      format: dto.format,
      requestedBy: dto.requestedBy,
      contactEmail: dto.contactEmail,
      status: PortabilityStatus.RECEIVED,
      deadline,
      createdAt: new Date().toISOString(),
    };

    this.portabilityRequests.push(stored);

    return {
      requestId,
      status: PortabilityStatus.RECEIVED,
      dataPackage: null,
      exportedAt: null,
      downloadUrl: null,
      expiresAt: null,
      deadline,
    };
  }

  async processPortabilityRequest(
    tenantId: string,
    requestId: string,
  ): Promise<DataPortabilityResultDto> {
    this.logger.log(`Processing portability request ${requestId}`);

    const request = this.portabilityRequests.find(
      (r) => r.requestId === requestId && r.tenantId === tenantId,
    );

    if (!request) {
      throw new NotFoundException(
        `Portability request ${requestId} not found`,
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: request.patientId, tenantId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${request.patientId} not found`);
    }

    // Collect all patient data from all tables
    const [encounters, prescriptions, clinicalNotes, _vitalSigns, allergies] =
      await Promise.all([
        this.prisma.encounter.findMany({
          where: { patientId: request.patientId, tenantId },
          take: 500,
        }),
        this.prisma.prescription.findMany({
          where: { patientId: request.patientId, tenantId },
          take: 500,
        }),
        this.prisma.clinicalNote.findMany({
          where: { encounter: { patientId: request.patientId, tenantId } },
          take: 500,
        }),
        this.prisma.vitalSigns.findMany({
          where: { patientId: request.patientId },
          take: 500,
        }),
        this.prisma.allergy.findMany({
          where: { patientId: request.patientId },
        }),
      ]);

    const dataPackage: DataPackageDto = {
      demographics: {
        name: patient.fullName,
        dateOfBirth: patient.birthDate,
        gender: patient.gender,
        cpf: patient.cpf,
        email: patient.email,
        phone: patient.phone,
      },
      encounters: encounters.map((e: (typeof encounters)[number]) => ({
        id: e.id,
        type: e.type,
        status: e.status,
        startTime: e.startedAt,
        endTime: e.completedAt,
        diagnosis: e.chiefComplaint,
      })),
      prescriptions: prescriptions.map((p: (typeof prescriptions)[number]) => ({
        id: p.id,
        status: p.status,
        createdAt: p.createdAt,
      })),
      labResults: [], // Would collect from lab module
      imaging: [], // Would collect from RIS/PACS module
      notes: clinicalNotes.map((n: (typeof clinicalNotes)[number]) => ({
        id: n.id,
        type: n.type,
        createdAt: n.createdAt,
      })),
      allergies: allergies.map((a: (typeof allergies)[number]) => ({
        id: a.id,
        allergen: a.substance,
        severity: a.severity,
        reaction: a.reaction,
      })),
      vaccinations: [], // Would collect from vaccination module
      consents: [], // Would collect from consent records
    };

    const exportedAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    request.status = PortabilityStatus.READY;

    return {
      requestId,
      status: PortabilityStatus.READY,
      dataPackage,
      exportedAt,
      downloadUrl: `/api/governance/lgpd/portability/${requestId}/download`,
      expiresAt,
      deadline: request.deadline,
    };
  }

  async generateExport(
    tenantId: string,
    requestId: string,
  ): Promise<{
    requestId: string;
    format: PortabilityFormat;
    content: string;
    filename: string;
  }> {
    const request = this.portabilityRequests.find(
      (r) => r.requestId === requestId && r.tenantId === tenantId,
    );

    if (!request) {
      throw new NotFoundException(
        `Portability request ${requestId} not found`,
      );
    }

    const result = await this.processPortabilityRequest(tenantId, requestId);

    let content: string;
    let filename: string;

    switch (request.format) {
      case PortabilityFormat.JSON:
        content = JSON.stringify(result.dataPackage, null, 2);
        filename = `portability_${request.patientId}_${Date.now()}.json`;
        break;
      case PortabilityFormat.FHIR_BUNDLE:
        content = JSON.stringify(
          this.convertToFHIRBundle(result.dataPackage),
          null,
          2,
        );
        filename = `portability_fhir_${request.patientId}_${Date.now()}.json`;
        break;
      case PortabilityFormat.PDF:
        content = '[PDF binary content would be generated here]';
        filename = `portability_${request.patientId}_${Date.now()}.pdf`;
        break;
    }

    return {
      requestId,
      format: request.format,
      content,
      filename,
    };
  }

  async trackDeadline(
    tenantId: string,
  ): Promise<
    Array<{
      requestId: string;
      patientId: string;
      deadline: string;
      daysRemaining: number;
      status: PortabilityStatus;
      overdue: boolean;
    }>
  > {
    const requests = this.portabilityRequests.filter(
      (r) => r.tenantId === tenantId,
    );

    const now = Date.now();
    return requests.map((r) => {
      const deadlineDate = new Date(r.deadline).getTime();
      const daysRemaining = Math.ceil(
        (deadlineDate - now) / (24 * 60 * 60 * 1000),
      );
      return {
        requestId: r.requestId,
        patientId: r.patientId,
        deadline: r.deadline,
        daysRemaining,
        status: r.status,
        overdue: daysRemaining < 0,
      };
    });
  }

  private convertToFHIRBundle(
    dataPackage: DataPackageDto | null,
  ): Record<string, unknown> {
    if (!dataPackage) {
      return { resourceType: 'Bundle', type: 'document', entry: [] };
    }

    return {
      resourceType: 'Bundle',
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            name: [
              { text: dataPackage.demographics['name'] as string },
            ],
            birthDate: dataPackage.demographics['dateOfBirth'] as string,
            gender: dataPackage.demographics['gender'] as string,
          },
        },
        ...dataPackage.encounters.map((e) => ({
          resource: {
            resourceType: 'Encounter',
            id: e['id'] as string,
            status: e['status'] as string,
            period: {
              start: e['startTime'] as string,
              end: e['endTime'] as string,
            },
          },
        })),
        ...dataPackage.allergies.map((a) => ({
          resource: {
            resourceType: 'AllergyIntolerance',
            id: a['id'] as string,
            code: { text: a['allergen'] as string },
            criticality: a['severity'] as string,
          },
        })),
      ],
    };
  }

  // ─── 6. DPIA (Data Protection Impact Assessment) ─────────────────────────

  async createDPIA(tenantId: string, dto: CreateDPIADto): Promise<DPIADto> {
    this.logger.log(`Creating DPIA: ${dto.title}`);

    const dpia: StoredDPIA = {
      id: randomUUID(),
      title: dto.title,
      assessorId: dto.assessorId,
      department: dto.department,
      processingActivity: dto.processingActivity,
      personalDataTypes: dto.personalDataTypes,
      dataSubjects: dto.dataSubjects,
      legalBasis: dto.legalBasis,
      purpose: dto.purpose,
      necessity: dto.necessity,
      proportionality: dto.proportionality,
      createdAt: new Date().toISOString(),
      tenantId,
      risks: [],
      result: null,
    };

    this.dpias.push(dpia);

    const { tenantId: _t, risks: _r, result: _res, ...dto_response } = dpia;
    return dto_response;
  }

  async addRisk(
    tenantId: string,
    dto: AddDPIARiskDto,
  ): Promise<DPIARiskDto> {
    const dpia = this.dpias.find(
      (d) => d.id === dto.dpiaId && d.tenantId === tenantId,
    );

    if (!dpia) {
      throw new NotFoundException(`DPIA ${dto.dpiaId} not found`);
    }

    const riskLevel = this.calculateRiskScore(dto.likelihood, dto.impact);
    const residualRisk = this.calculateResidualRisk(
      dto.likelihood,
      dto.proposedMitigations.length,
    );

    const risk: DPIARiskDto = {
      id: randomUUID(),
      dpiaId: dto.dpiaId,
      riskDescription: dto.riskDescription,
      likelihood: dto.likelihood,
      impact: dto.impact,
      riskLevel,
      existingControls: dto.existingControls,
      proposedMitigations: dto.proposedMitigations,
      residualRisk,
      responsiblePerson: dto.responsiblePerson,
      deadline: dto.deadline,
    };

    dpia.risks.push(risk);

    this.logger.log(
      `Risk added to DPIA ${dto.dpiaId}: level=${riskLevel}, residual=${residualRisk}`,
    );
    return risk;
  }

  calculateRiskMatrix(
    likelihood: RiskLikelihood,
    impact: RiskImpact,
  ): {
    score: number;
    level: RiskLikelihood;
    description: string;
  } {
    const score = this.calculateRiskScore(likelihood, impact);
    let level: RiskLikelihood;
    let description: string;

    if (score <= 3) {
      level = RiskLikelihood.LOW;
      description = 'Risco aceitavel — monitoramento padrao';
    } else if (score <= 6) {
      level = RiskLikelihood.MEDIUM;
      description = 'Risco moderado — mitigacoes recomendadas';
    } else if (score <= 12) {
      level = RiskLikelihood.HIGH;
      description =
        'Risco alto — mitigacoes obrigatorias, possivel consulta a ANPD';
    } else {
      level = RiskLikelihood.VERY_HIGH;
      description =
        'Risco muito alto — consulta a ANPD obrigatoria (LGPD Art. 38)';
    }

    return { score, level, description };
  }

  async approveDPIA(
    tenantId: string,
    dto: ApproveDPIADto,
  ): Promise<DPIAResultDto> {
    const dpia = this.dpias.find(
      (d) => d.id === dto.dpiaId && d.tenantId === tenantId,
    );

    if (!dpia) {
      throw new NotFoundException(`DPIA ${dto.dpiaId} not found`);
    }

    if (dpia.risks.length === 0) {
      throw new BadRequestException(
        'DPIA must have at least one risk assessment before approval',
      );
    }

    const maxRiskLevel = Math.max(...dpia.risks.map((r) => r.riskLevel));
    let overallRiskLevel: RiskLikelihood;

    if (maxRiskLevel <= 3) {
      overallRiskLevel = RiskLikelihood.LOW;
    } else if (maxRiskLevel <= 6) {
      overallRiskLevel = RiskLikelihood.MEDIUM;
    } else if (maxRiskLevel <= 12) {
      overallRiskLevel = RiskLikelihood.HIGH;
    } else {
      overallRiskLevel = RiskLikelihood.VERY_HIGH;
    }

    const result: DPIAResultDto = {
      overallRiskLevel,
      acceptableRisk:
        overallRiskLevel === RiskLikelihood.LOW ||
        overallRiskLevel === RiskLikelihood.MEDIUM,
      requiresAnpdConsultation:
        overallRiskLevel === RiskLikelihood.HIGH ||
        overallRiskLevel === RiskLikelihood.VERY_HIGH,
      approvedBy: dto.approvedBy,
      approvedAt: new Date().toISOString(),
    };

    dpia.result = result;

    this.logger.log(
      `DPIA ${dto.dpiaId} approved: risk=${overallRiskLevel}, anpd=${result.requiresAnpdConsultation}`,
    );
    return result;
  }

  async getDPIAsByDepartment(
    tenantId: string,
    department?: string,
  ): Promise<
    Array<DPIADto & { riskCount: number; overallRisk: string | null }>
  > {
    let filtered = this.dpias.filter((d) => d.tenantId === tenantId);

    if (department) {
      filtered = filtered.filter((d) => d.department === department);
    }

    return filtered.map((d) => {
      const { tenantId: _t, risks, result, ...dpiaDto } = d;
      return {
        ...dpiaDto,
        riskCount: risks.length,
        overallRisk: result?.overallRiskLevel ?? null,
      };
    });
  }

  private calculateRiskScore(
    likelihood: RiskLikelihood,
    impact: RiskImpact,
  ): number {
    const likelihoodValues: Record<RiskLikelihood, number> = {
      [RiskLikelihood.LOW]: 1,
      [RiskLikelihood.MEDIUM]: 2,
      [RiskLikelihood.HIGH]: 3,
      [RiskLikelihood.VERY_HIGH]: 4,
    };

    const impactValues: Record<RiskImpact, number> = {
      [RiskImpact.LOW]: 1,
      [RiskImpact.MEDIUM]: 2,
      [RiskImpact.HIGH]: 3,
      [RiskImpact.VERY_HIGH]: 4,
    };

    return likelihoodValues[likelihood] * impactValues[impact];
  }

  private calculateResidualRisk(
    originalLikelihood: RiskLikelihood,
    mitigationCount: number,
  ): RiskLikelihood {
    const levels: RiskLikelihood[] = [
      RiskLikelihood.LOW,
      RiskLikelihood.MEDIUM,
      RiskLikelihood.HIGH,
      RiskLikelihood.VERY_HIGH,
    ];

    const currentIndex = levels.indexOf(originalLikelihood);
    const reduction = Math.min(mitigationCount, currentIndex);
    return levels[currentIndex - reduction];
  }

  // ─── 7. Sensitive Data Segregation ───────────────────────────────────────

  async checkSensitiveAccess(
    tenantId: string,
    dto: SensitiveAccessRequestDto,
  ): Promise<SensitiveAccessResultDto> {
    this.logger.log(
      `Checking sensitive access: requester=${dto.requesterId}, patient=${dto.patientId}, category=${dto.diagnosisCategory}`,
    );

    const policy = this.sensitivePolicies.find(
      (p) =>
        (p.tenantId === tenantId || p.tenantId === 'default') &&
        p.diagnosisCategory === dto.diagnosisCategory,
    );

    if (!policy) {
      throw new NotFoundException(
        `No sensitive data policy found for category ${dto.diagnosisCategory}`,
      );
    }

    const accessId = randomUUID();
    const auditLogId = randomUUID();
    let accessGranted = false;
    let denialReason: string | null = null;
    let expiresAt: string | null = null;

    // Emergency access always granted (break the glass)
    if (dto.urgency === AccessUrgency.EMERGENCY) {
      if (policy.breakTheGlassAllowed) {
        accessGranted = true;
        expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
        this.logger.warn(
          `BREAK THE GLASS: Emergency access granted for ${dto.diagnosisCategory} by ${dto.requesterId}`,
        );
      } else {
        accessGranted = false;
        denialReason = `Break-the-glass not allowed for ${dto.diagnosisCategory}`;
      }
    } else if (policy.requiresExplicitConsent) {
      // Would check consent records in production
      accessGranted = false;
      denialReason =
        'Explicit patient consent required. Request consent before accessing this data.';
    } else if (policy.accessLevel === SensitiveAccessLevel.TREATING_TEAM_ONLY) {
      // Would verify requester is in treating team in production
      accessGranted = true;
      expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(); // 24 hours
    } else if (policy.accessLevel === SensitiveAccessLevel.SPECIALTY_ONLY) {
      // Would verify requester specialty matches in production
      accessGranted = true;
      expiresAt = new Date(
        Date.now() + 8 * 60 * 60 * 1000,
      ).toISOString(); // 8 hours
    } else {
      accessGranted = false;
      denialReason = 'Access denied by policy';
    }

    // Always log sensitive data access
    this.sensitiveAccessLogs.push({
      id: auditLogId,
      tenantId,
      requesterId: dto.requesterId,
      patientId: dto.patientId,
      diagnosisCategory: dto.diagnosisCategory,
      justification: dto.justification,
      urgency: dto.urgency,
      accessGranted,
      timestamp: new Date().toISOString(),
    });

    return {
      accessGranted,
      accessId,
      expiresAt,
      denialReason,
      auditLogId,
    };
  }

  async grantAccess(
    tenantId: string,
    dto: SensitiveAccessRequestDto,
  ): Promise<SensitiveAccessResultDto> {
    // Explicit grant by authorized personnel (DPO or treating physician)
    return this.checkSensitiveAccess(tenantId, dto);
  }

  async logSensitiveAccess(
    tenantId: string,
    accessId: string,
    action: string,
  ): Promise<{ logged: boolean; auditLogId: string }> {
    const auditLogId = randomUUID();

    this.sensitiveAccessLogs.push({
      id: auditLogId,
      tenantId,
      requesterId: 'system',
      patientId: 'N/A',
      diagnosisCategory: DiagnosisCategory.HIV, // placeholder
      justification: `Access action: ${action} for accessId: ${accessId}`,
      urgency: AccessUrgency.ROUTINE,
      accessGranted: true,
      timestamp: new Date().toISOString(),
    });

    return { logged: true, auditLogId };
  }

  async getSensitiveAccessAudit(
    tenantId: string,
    patientId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    logs: StoredAccessLog[];
    total: number;
    summary: {
      totalAccesses: number;
      granted: number;
      denied: number;
      emergencyAccesses: number;
    };
  }> {
    let logs = this.sensitiveAccessLogs.filter(
      (l) => l.tenantId === tenantId,
    );

    if (patientId) {
      logs = logs.filter((l) => l.patientId === patientId);
    }
    if (startDate) {
      logs = logs.filter((l) => l.timestamp >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.timestamp <= endDate);
    }

    return {
      logs,
      total: logs.length,
      summary: {
        totalAccesses: logs.length,
        granted: logs.filter((l) => l.accessGranted).length,
        denied: logs.filter((l) => !l.accessGranted).length,
        emergencyAccesses: logs.filter(
          (l) => l.urgency === AccessUrgency.EMERGENCY,
        ).length,
      },
    };
  }

  async configureSensitivePolicy(
    tenantId: string,
    dto: SensitiveDataPolicyDto,
  ): Promise<SensitiveDataPolicyDto> {
    const existingIndex = this.sensitivePolicies.findIndex(
      (p) =>
        p.tenantId === tenantId &&
        p.diagnosisCategory === dto.diagnosisCategory,
    );

    const stored: StoredSensitivePolicy = { ...dto, tenantId };

    if (existingIndex >= 0) {
      this.sensitivePolicies[existingIndex] = stored;
    } else {
      this.sensitivePolicies.push(stored);
    }

    this.logger.log(
      `Sensitive data policy updated for ${dto.diagnosisCategory}`,
    );
    return dto;
  }

  // ─── 8. ONA / JCI Readiness Checklist ────────────────────────────────────

  async getChecklist(
    _tenantId: string,
    standard: AccreditationStandard,
  ): Promise<AccreditationChecklistDto> {
    const sections = this.buildChecklistSections(standard);

    return {
      standard,
      sections,
    };
  }

  async updateRequirement(
    _tenantId: string,
    dto: UpdateRequirementDto,
  ): Promise<{
    updated: boolean;
    requirementCode: string;
    newStatus: ComplianceStatus;
  }> {
    this.logger.log(
      `Updating requirement ${dto.requirementCode} for ${dto.standard}: status=${dto.status}`,
    );

    // In production, would persist to database
    return {
      updated: true,
      requirementCode: dto.requirementCode,
      newStatus: dto.status,
    };
  }

  async getDashboard(
    tenantId: string,
    standard: AccreditationStandard,
  ): Promise<AccreditationDashboardDto> {
    const checklist = await this.getChecklist(tenantId, standard);

    const allRequirements = checklist.sections.flatMap(
      (s) => s.requirements,
    );
    const total = allRequirements.length;
    const compliant = allRequirements.filter(
      (r) => r.status === ComplianceStatus.COMPLIANT,
    ).length;
    const partiallyCompliant = allRequirements.filter(
      (r) => r.status === ComplianceStatus.PARTIALLY_COMPLIANT,
    ).length;
    const nonCompliant = allRequirements.filter(
      (r) => r.status === ComplianceStatus.NON_COMPLIANT,
    ).length;
    const notAssessed = allRequirements.filter(
      (r) => r.status === ComplianceStatus.NOT_ASSESSED,
    ).length;

    const complianceRate = total > 0 ? (compliant / total) * 100 : 0;

    const criticalGaps: Array<{
      code: string;
      description: string;
      section: string;
    }> = [];
    for (const section of checklist.sections) {
      for (const req of section.requirements) {
        if (req.status === ComplianceStatus.NON_COMPLIANT) {
          criticalGaps.push({
            code: req.code,
            description: req.description,
            section: section.name,
          });
        }
      }
    }

    const upcomingDeadlines: Array<{
      code: string;
      description: string;
      dueDate: string;
      daysRemaining: number;
    }> = [];
    const now = Date.now();
    for (const section of checklist.sections) {
      for (const req of section.requirements) {
        if (req.dueDate) {
          const due = new Date(req.dueDate).getTime();
          const daysRemaining = Math.ceil(
            (due - now) / (24 * 60 * 60 * 1000),
          );
          if (daysRemaining <= 90 && daysRemaining > 0) {
            upcomingDeadlines.push({
              code: req.code,
              description: req.description,
              dueDate: req.dueDate,
              daysRemaining,
            });
          }
        }
      }
    }

    upcomingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      standard,
      totalRequirements: total,
      compliant,
      partiallyCompliant,
      nonCompliant,
      notAssessed,
      complianceRate: Math.round(complianceRate * 100) / 100,
      criticalGaps,
      upcomingDeadlines,
    };
  }

  async generateReadinessReport(
    tenantId: string,
    standard: AccreditationStandard,
  ): Promise<{
    standard: AccreditationStandard;
    generatedAt: string;
    dashboard: AccreditationDashboardDto;
    recommendations: string[];
    priorityActions: Array<{
      priority: number;
      action: string;
      section: string;
      effort: string;
    }>;
  }> {
    const dashboard = await this.getDashboard(tenantId, standard);

    const recommendations: string[] = [];
    const priorityActions: Array<{
      priority: number;
      action: string;
      section: string;
      effort: string;
    }> = [];

    let priority = 1;
    for (const gap of dashboard.criticalGaps) {
      recommendations.push(
        `Resolver nao-conformidade: ${gap.code} — ${gap.description} (${gap.section})`,
      );
      priorityActions.push({
        priority: priority++,
        action: `Implementar ${gap.description}`,
        section: gap.section,
        effort: 'MEDIO',
      });
    }

    if (dashboard.complianceRate < 70) {
      recommendations.push(
        'Taxa de conformidade abaixo de 70% — considerar plano de acao intensivo',
      );
    }
    if (dashboard.notAssessed > 0) {
      recommendations.push(
        `${dashboard.notAssessed} requisito(s) ainda nao avaliado(s) — priorizar avaliacao`,
      );
    }

    return {
      standard,
      generatedAt: new Date().toISOString(),
      dashboard,
      recommendations,
      priorityActions,
    };
  }

  private buildChecklistSections(
    standard: AccreditationStandard,
  ): AccreditationSectionDto[] {
    switch (standard) {
      case AccreditationStandard.ONA_LEVEL_1:
        return this.buildONALevel1Sections();
      case AccreditationStandard.ONA_LEVEL_2:
        return this.buildONALevel2Sections();
      case AccreditationStandard.ONA_LEVEL_3:
        return this.buildONALevel3Sections();
      case AccreditationStandard.JCI:
        return this.buildJCISections();
    }
  }

  private buildONALevel1Sections(): AccreditationSectionDto[] {
    return [
      {
        name: 'Lideranca e Gestao',
        requirements: [
          {
            code: 'LG-01',
            description:
              'Definicao da missao, visao e valores da organizacao',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Documento institucional aprovado pela diretoria',
            dueDate: '2026-06-30',
          },
          {
            code: 'LG-02',
            description:
              'Estrutura organizacional e responsabilidades definidas',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Organograma atualizado',
          },
          {
            code: 'LG-03',
            description:
              'Plano de seguranca do paciente implantado',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Plano aprovado, implementacao em 75%',
            dueDate: '2026-05-15',
          },
          {
            code: 'LG-04',
            description:
              'Gestao de riscos assistenciais com acoes corretivas',
            status: ComplianceStatus.NOT_ASSESSED,
          },
          {
            code: 'LG-05',
            description:
              'Comissoes obrigatorias ativas (CCIH, CIPA, Etica Medica)',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Atas de reunioes trimestrais',
          },
        ],
      },
      {
        name: 'Atencao ao Paciente',
        requirements: [
          {
            code: 'AP-01',
            description:
              'Identificacao segura do paciente (pulseira + 2 identificadores)',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Protocolo POP-ID-001, adesao 99%',
          },
          {
            code: 'AP-02',
            description:
              'Protocolos de seguranca do paciente (6 metas internacionais)',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: '5 de 6 metas implementadas',
            dueDate: '2026-04-30',
          },
          {
            code: 'AP-03',
            description: 'Prontuario do paciente completo e organizado',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'PEP VoxPEP implantado, 100% digital',
          },
          {
            code: 'AP-04',
            description:
              'Classificacao de risco na emergencia (protocolo validado)',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Manchester Protocol implantado',
          },
          {
            code: 'AP-05',
            description:
              'Consentimento informado para procedimentos invasivos',
            status: ComplianceStatus.NON_COMPLIANT,
            evidence: 'Formularios existem, mas adesao abaixo de 80%',
            dueDate: '2026-04-15',
          },
          {
            code: 'AP-06',
            description:
              'Plano terapeutico multiprofissional documentado',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Em implementacao para unidades de internacao',
            dueDate: '2026-06-01',
          },
        ],
      },
      {
        name: 'Diagnostico e Terapeutica',
        requirements: [
          {
            code: 'DT-01',
            description:
              'Servico de laboratorio com controle de qualidade interno',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'CQ diario com Westgard rules',
          },
          {
            code: 'DT-02',
            description:
              'Servico de imagem com protocolos de radioprotecao',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'PCMSO atualizado, dosimetros individuais',
          },
          {
            code: 'DT-03',
            description:
              'Farmacia com controle de medicamentos de alta vigilancia',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Lista de MAV definida, sinalizacao parcial',
            dueDate: '2026-05-01',
          },
          {
            code: 'DT-04',
            description: 'Hemocomponentes com rastreabilidade completa',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Sistema de rastreamento integrado ao PEP',
          },
        ],
      },
      {
        name: 'Apoio Tecnico e Logistico',
        requirements: [
          {
            code: 'AT-01',
            description:
              'Plano de manutencao preventiva de equipamentos medicos',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Plano existe para 80% dos equipamentos criticos',
            dueDate: '2026-05-30',
          },
          {
            code: 'AT-02',
            description:
              'Gestao de residuos de servicos de saude (PGRSS)',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'PGRSS aprovado pela Vigilancia Sanitaria',
          },
          {
            code: 'AT-03',
            description:
              'Controle de infeccao hospitalar (PCIRAS ativo)',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'CCIH atuante, taxas dentro do benchmark',
          },
          {
            code: 'AT-04',
            description:
              'Gestao de suprimentos com rastreabilidade de lotes',
            status: ComplianceStatus.NON_COMPLIANT,
            evidence: 'Rastreabilidade apenas parcial',
            dueDate: '2026-06-15',
          },
          {
            code: 'AT-05',
            description:
              'Seguranca predial e plano de contingencia',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Plano de contingencia atualizado, simulados semestrais',
          },
        ],
      },
    ];
  }

  private buildONALevel2Sections(): AccreditationSectionDto[] {
    const level1 = this.buildONALevel1Sections();

    // Level 2 adds process management and outcome measurement
    const additionalSections: AccreditationSectionDto[] = [
      {
        name: 'Gestao de Processos',
        requirements: [
          {
            code: 'GP-01',
            description:
              'Mapeamento de processos assistenciais criticos',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: '60% dos processos criticos mapeados',
            dueDate: '2026-07-01',
          },
          {
            code: 'GP-02',
            description: 'Indicadores de desempenho por processo',
            status: ComplianceStatus.NOT_ASSESSED,
          },
          {
            code: 'GP-03',
            description:
              'Ciclos de melhoria (PDCA) documentados',
            status: ComplianceStatus.NON_COMPLIANT,
            evidence: 'Apenas 2 ciclos concluidos',
            dueDate: '2026-06-01',
          },
          {
            code: 'GP-04',
            description: 'Protocolos clinicos baseados em evidencia',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: '15 de 20 protocolos atualizados',
            dueDate: '2026-05-15',
          },
        ],
      },
      {
        name: 'Resultados e Indicadores',
        requirements: [
          {
            code: 'RI-01',
            description:
              'Painel de indicadores assistenciais monitorados',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Dashboard VoxPEP com 35 indicadores',
          },
          {
            code: 'RI-02',
            description: 'Benchmarking com dados nacionais',
            status: ComplianceStatus.NOT_ASSESSED,
          },
          {
            code: 'RI-03',
            description: 'Analise critica de resultados trimestral',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Realizada em 3 de 4 trimestres',
            dueDate: '2026-06-30',
          },
        ],
      },
    ];

    return [...level1, ...additionalSections];
  }

  private buildONALevel3Sections(): AccreditationSectionDto[] {
    const level2 = this.buildONALevel2Sections();

    // Level 3 (Excellence) adds strategic management and innovation
    const additionalSections: AccreditationSectionDto[] = [
      {
        name: 'Excelencia em Gestao',
        requirements: [
          {
            code: 'EG-01',
            description:
              'Planejamento estrategico com desdobramento de metas',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'PE 2026-2028 aprovado, BSC em implantacao',
            dueDate: '2026-08-01',
          },
          {
            code: 'EG-02',
            description: 'Cultura de seguranca mensurada e melhorada',
            status: ComplianceStatus.NOT_ASSESSED,
          },
          {
            code: 'EG-03',
            description:
              'Gestao do conhecimento e inovacao',
            status: ComplianceStatus.NOT_ASSESSED,
          },
          {
            code: 'EG-04',
            description:
              'Sustentabilidade economico-financeira demonstrada',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Resultado positivo nos ultimos 3 anos',
          },
          {
            code: 'EG-05',
            description:
              'Responsabilidade social e ambiental',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Programa de residuos implementado, falta relatorio ESG',
            dueDate: '2026-09-01',
          },
        ],
      },
    ];

    return [...level2, ...additionalSections];
  }

  private buildJCISections(): AccreditationSectionDto[] {
    return [
      {
        name: 'International Patient Safety Goals (IPSG)',
        requirements: [
          {
            code: 'IPSG.1',
            description: 'Identify patients correctly using two identifiers',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Wristband + 2 identifiers protocol active',
          },
          {
            code: 'IPSG.2',
            description:
              'Improve effective communication (SBAR, read-back)',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'SBAR implemented, read-back compliance at 85%',
            dueDate: '2026-05-01',
          },
          {
            code: 'IPSG.3',
            description:
              'Improve safety of high-alert medications',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'High-alert med list, double-check protocol',
          },
          {
            code: 'IPSG.4',
            description: 'Ensure correct-site, correct-procedure, correct-patient surgery',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'WHO Safe Surgery Checklist, 100% compliance',
          },
          {
            code: 'IPSG.5',
            description: 'Reduce risk of healthcare-associated infections',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Hand hygiene compliance 78% (target 85%)',
            dueDate: '2026-04-30',
          },
          {
            code: 'IPSG.6',
            description: 'Reduce risk of patient harm from falls',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Morse Fall Scale, prevention protocol active',
          },
        ],
      },
      {
        name: 'Access to Care and Continuity of Care (ACC)',
        requirements: [
          {
            code: 'ACC.1',
            description:
              'Screening and admission process standardized',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Triage protocol with Manchester classification',
          },
          {
            code: 'ACC.2',
            description: 'Continuity of care across settings',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Discharge planning protocol in progress',
            dueDate: '2026-06-01',
          },
          {
            code: 'ACC.3',
            description: 'Discharge and follow-up planning',
            status: ComplianceStatus.NON_COMPLIANT,
            evidence: 'Follow-up tracking not systematic',
            dueDate: '2026-05-15',
          },
        ],
      },
      {
        name: 'Patient and Family Rights (PFR)',
        requirements: [
          {
            code: 'PFR.1',
            description: 'Patient rights policy and informed consent',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Policy PFR-001, consent forms digitized',
          },
          {
            code: 'PFR.2',
            description: 'Privacy and confidentiality protections',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'LGPD compliance framework, access controls',
          },
          {
            code: 'PFR.3',
            description: 'Complaint and grievance mechanism',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'SAC active, response time needs improvement',
            dueDate: '2026-05-30',
          },
        ],
      },
      {
        name: 'Assessment of Patients (AOP)',
        requirements: [
          {
            code: 'AOP.1',
            description: 'Initial assessment within defined timeframe',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Assessment within 24h of admission',
          },
          {
            code: 'AOP.2',
            description: 'Reassessment at regular intervals',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Automated reminders in VoxPEP, compliance 90%',
            dueDate: '2026-06-15',
          },
          {
            code: 'AOP.3',
            description: 'Laboratory and radiology services quality',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'PALC and PADI certifications active',
          },
        ],
      },
      {
        name: 'Care of Patients (COP)',
        requirements: [
          {
            code: 'COP.1',
            description:
              'Care delivery guided by clinical practice guidelines',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: '18 of 22 CPGs updated',
            dueDate: '2026-07-01',
          },
          {
            code: 'COP.2',
            description: 'High-risk patients identified and managed',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Early warning score (NEWS2) implemented',
          },
          {
            code: 'COP.3',
            description: 'Surgical care and anesthesia safety',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Safe surgery protocol, ASA classification',
          },
        ],
      },
      {
        name: 'Medication Management and Use (MMU)',
        requirements: [
          {
            code: 'MMU.1',
            description: 'Medication management system organized',
            status: ComplianceStatus.COMPLIANT,
            evidence: 'Electronic prescribing with drug interaction alerts',
          },
          {
            code: 'MMU.2',
            description:
              'Medication errors reported and analyzed',
            status: ComplianceStatus.PARTIALLY_COMPLIANT,
            evidence: 'Reporting system active, root cause analysis needs improvement',
            dueDate: '2026-05-01',
          },
        ],
      },
    ];
  }
}
