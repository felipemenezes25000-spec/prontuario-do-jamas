import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SendEncounterSummaryDto,
  SendVaccinationDto,
  SendLabResultDto,
  RndsResourceType,
  RndsSubmissionStatus,
} from './dto/rnds.dto';

export interface RndsSubmission {
  id: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  patientId: string;
  fhirBundle: Record<string, unknown>;
  status: string;
  rndsResponseId: string | null;
  errorMessage: string | null;
  submittedAt: Date;
  respondedAt: Date | null;
}

@Injectable()
export class RndsService {
  private readonly logger = new Logger(RndsService.name);
  private submissions: RndsSubmission[] = [];
  private connectionStatus = {
    connected: false,
    lastCheck: new Date(),
    environment: 'HOMOLOGATION',
    certificateValid: true,
    certificateExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };

  constructor(private readonly prisma: PrismaService) {}

  async sendEncounterSummary(tenantId: string, userId: string, dto: SendEncounterSummaryDto) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      include: {
        patient: true,
        clinicalNotes: { where: { status: 'SIGNED' }, take: 1 },
        prescriptions: { take: 5 },
      },
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter "${dto.encounterId}" not found`);
    }

    // Build FHIR Bundle for RNDS
    const fhirBundle = {
      resourceType: 'Bundle',
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            status: 'final',
            type: {
              coding: [{ system: 'http://loinc.org', code: '60591-5', display: 'Patient summary Document' }],
            },
            subject: { reference: `Patient/${encounter.patientId}` },
            date: encounter.createdAt.toISOString(),
            author: [{ reference: `Practitioner/${userId}` }],
          },
        },
        {
          resource: {
            resourceType: 'Patient',
            id: encounter.patientId,
            identifier: [
              { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf', value: encounter.patient.cpf ?? '' },
              ...(dto.patientCns ? [{ system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: dto.patientCns }] : []),
            ],
            name: [{ text: encounter.patient.fullName }],
          },
        },
        {
          resource: {
            resourceType: 'Encounter',
            id: encounter.id,
            status: 'finished',
            class: { code: encounter.type },
            period: {
              start: encounter.startedAt?.toISOString(),
              end: encounter.completedAt?.toISOString(),
            },
          },
        },
      ],
    };

    const submission: RndsSubmission = {
      id: crypto.randomUUID(),
      tenantId,
      resourceType: RndsResourceType.ENCOUNTER_SUMMARY,
      resourceId: dto.encounterId,
      patientId: encounter.patientId,
      fhirBundle,
      status: RndsSubmissionStatus.SENT,
      rndsResponseId: `RNDS-${Date.now()}`,
      errorMessage: null,
      submittedAt: new Date(),
      respondedAt: new Date(),
    };

    this.submissions.push(submission);
    this.logger.log(`RNDS submission ${submission.id} for encounter ${dto.encounterId}`);

    return {
      submissionId: submission.id,
      status: submission.status,
      rndsResponseId: submission.rndsResponseId,
      message: 'Encounter summary sent to RNDS successfully (simulated)',
    };
  }

  async sendVaccination(tenantId: string, userId: string, dto: SendVaccinationDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const fhirBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: {
            resourceType: 'Immunization',
            status: 'completed',
            vaccineCode: {
              coding: [{ system: 'http://rnds.saude.gov.br/fhir/r4/CodeSystem/BRImunobiologico', code: dto.vaccineCode, display: dto.vaccineName }],
            },
            patient: { reference: `Patient/${dto.patientId}` },
            occurrenceDateTime: new Date().toISOString(),
            lotNumber: dto.lotNumber,
            manufacturer: { display: dto.manufacturer },
            protocolApplied: dto.doseNumber ? [{ doseNumberPositiveInt: dto.doseNumber }] : undefined,
            site: dto.administrationSite ? { coding: [{ display: dto.administrationSite }] } : undefined,
          },
        },
      ],
    };

    const submission: RndsSubmission = {
      id: crypto.randomUUID(),
      tenantId,
      resourceType: RndsResourceType.VACCINATION,
      resourceId: dto.patientId,
      patientId: dto.patientId,
      fhirBundle,
      status: RndsSubmissionStatus.ACCEPTED,
      rndsResponseId: `RNDS-VAC-${Date.now()}`,
      errorMessage: null,
      submittedAt: new Date(),
      respondedAt: new Date(),
    };

    this.submissions.push(submission);

    return {
      submissionId: submission.id,
      status: submission.status,
      rndsResponseId: submission.rndsResponseId,
      message: 'Vaccination record sent to RNDS successfully (simulated)',
    };
  }

  async sendLabResult(tenantId: string, userId: string, dto: SendLabResultDto) {
    const exam = await this.prisma.examResult.findUnique({
      where: { id: dto.examResultId },
      include: { patient: true },
    });

    if (!exam) {
      throw new NotFoundException(`Exam result "${dto.examResultId}" not found`);
    }

    const fhirBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: {
            resourceType: 'DiagnosticReport',
            status: 'final',
            code: {
              coding: dto.loincCode
                ? [{ system: 'http://loinc.org', code: dto.loincCode }]
                : [{ display: exam.examName }],
            },
            subject: { reference: `Patient/${exam.patientId}` },
            effectiveDateTime: (exam.completedAt ?? exam.createdAt).toISOString(),
            result: exam.labResults
              ? (exam.labResults as Array<{ analyte: string; value: string; unit?: string }>).map((r, idx) => ({
                  reference: `Observation/${idx}`,
                  display: `${r.analyte}: ${r.value} ${r.unit ?? ''}`,
                }))
              : [],
          },
        },
      ],
    };

    const submission: RndsSubmission = {
      id: crypto.randomUUID(),
      tenantId,
      resourceType: RndsResourceType.LAB_RESULT,
      resourceId: dto.examResultId,
      patientId: exam.patientId,
      fhirBundle,
      status: RndsSubmissionStatus.ACCEPTED,
      rndsResponseId: `RNDS-LAB-${Date.now()}`,
      errorMessage: null,
      submittedAt: new Date(),
      respondedAt: new Date(),
    };

    this.submissions.push(submission);

    return {
      submissionId: submission.id,
      status: submission.status,
      rndsResponseId: submission.rndsResponseId,
      message: 'Lab result sent to RNDS successfully (simulated)',
    };
  }

  async getConnectionStatus(tenantId: string) {
    return {
      ...this.connectionStatus,
      tenantId,
      totalSubmissions: this.submissions.filter((s) => s.tenantId === tenantId).length,
      message: 'RNDS integration is in HOMOLOGATION mode. Configure production certificate for live environment.',
    };
  }

  async getSubmissions(
    tenantId: string,
    filters: { resourceType?: string; status?: string; page?: number; pageSize?: number },
  ) {
    let filtered = this.submissions.filter((s) => s.tenantId === tenantId);

    if (filters.resourceType) {
      filtered = filtered.filter((s) => s.resourceType === filters.resourceType);
    }
    if (filters.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const total = filtered.length;
    const data = filtered
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice((page - 1) * pageSize, page * pageSize);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
