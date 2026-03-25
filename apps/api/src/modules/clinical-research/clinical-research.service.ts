import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  TrialStatus,
  EnrollmentStatus,
  TrialResponseDto,
  EligiblePatientsResponseDto,
  EnrollmentResponseDto,
  ResearchDataResponseDto,
} from './dto/clinical-research.dto';

interface Trial {
  id: string;
  tenantId: string;
  title: string;
  protocolNumber?: string;
  sponsor?: string;
  principalInvestigator: string;
  status: TrialStatus;
  eligibilityCriteria: Record<string, unknown>;
  startDate?: Date;
  endDate?: Date;
  ethicsApprovalNumber?: string;
  targetEnrollment?: number;
  currentEnrollment: number;
  createdAt: Date;
}

@Injectable()
export class ClinicalResearchService {
  private readonly logger = new Logger(ClinicalResearchService.name);
  private readonly trials = new Map<string, Trial>();

  async registerTrial(
    tenantId: string,
    dto: {
      title: string;
      protocolNumber?: string;
      sponsor?: string;
      principalInvestigator: string;
      description?: string;
      eligibilityCriteria: Record<string, unknown>;
      startDate?: string;
      endDate?: string;
      ethicsApprovalNumber?: string;
      targetEnrollment?: number;
    },
  ): Promise<TrialResponseDto> {
    const trial: Trial = {
      id: randomUUID(),
      tenantId,
      title: dto.title,
      protocolNumber: dto.protocolNumber,
      sponsor: dto.sponsor,
      principalInvestigator: dto.principalInvestigator,
      status: TrialStatus.DRAFT,
      eligibilityCriteria: dto.eligibilityCriteria,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      ethicsApprovalNumber: dto.ethicsApprovalNumber,
      targetEnrollment: dto.targetEnrollment,
      currentEnrollment: 0,
      createdAt: new Date(),
    };
    this.trials.set(trial.id, trial);
    this.logger.log(`Clinical trial registered: ${trial.title}`);
    return this.toResponse(trial);
  }

  async findEligible(
    _tenantId: string,
    _trialId: string,
  ): Promise<EligiblePatientsResponseDto> {
    // Stub — in production queries Prisma based on eligibility criteria
    return {
      patients: [
        {
          patientId: randomUUID(),
          patientName: 'Maria Oliveira',
          matchScore: 0.95,
          matchingCriteria: ['DM2 diagnosticado', 'HbA1c entre 7-10%', 'Idade 40-65'],
          excludingCriteria: [],
        },
        {
          patientId: randomUUID(),
          patientName: 'Carlos Mendes',
          matchScore: 0.82,
          matchingCriteria: ['DM2 diagnosticado', 'HbA1c entre 7-10%'],
          excludingCriteria: ['Doença renal crônica estágio 4 — critério de exclusão parcial'],
        },
      ],
      totalEligible: 2,
      totalScreened: 150,
    };
  }

  async enrollPatient(
    _tenantId: string,
    trialId: string,
    patientId: string,
    consentDocumentUrl?: string,
    arm?: string,
  ): Promise<EnrollmentResponseDto> {
    const trial = this.trials.get(trialId);
    if (trial) trial.currentEnrollment += 1;

    this.logger.log(`Patient ${patientId} enrolled in trial ${trialId}`);

    return {
      id: randomUUID(),
      trialId,
      patientId,
      status: EnrollmentStatus.ENROLLED,
      arm,
      enrolledAt: new Date(),
      consentDocumentUrl,
    };
  }

  async listTrials(tenantId: string): Promise<TrialResponseDto[]> {
    return Array.from(this.trials.values())
      .filter((t) => t.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => this.toResponse(t));
  }

  async getResearchData(
    tenantId: string,
    trialId: string,
  ): Promise<ResearchDataResponseDto> {
    const trial = this.trials.get(trialId);
    if (!trial || trial.tenantId !== tenantId) {
      throw new NotFoundException(`Trial ${trialId} not found`);
    }
    return {
      trialId: trial.id,
      title: trial.title,
      enrollments: trial.currentEnrollment,
      dataPoints: [
        {
          patientId: randomUUID(),
          visitDate: '2026-03-15',
          dataType: 'LAB_RESULT',
          values: { HbA1c: 7.2, fastingGlucose: 118 },
        },
      ],
      completionRate: 0.45,
    };
  }

  private toResponse(trial: Trial): TrialResponseDto {
    return {
      id: trial.id,
      title: trial.title,
      protocolNumber: trial.protocolNumber,
      sponsor: trial.sponsor,
      principalInvestigator: trial.principalInvestigator,
      status: trial.status,
      eligibilityCriteria: trial.eligibilityCriteria,
      startDate: trial.startDate,
      endDate: trial.endDate,
      ethicsApprovalNumber: trial.ethicsApprovalNumber,
      targetEnrollment: trial.targetEnrollment,
      currentEnrollment: trial.currentEnrollment,
      createdAt: trial.createdAt,
    };
  }
}
