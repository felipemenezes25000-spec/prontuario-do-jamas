import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBiopsyRequestDto,
  MacroscopyDto,
  MicroscopyDto,
  ImmunohistochemistryDto,
  FinalPathologyReportDto,
  PathologyStatus,
} from './dto/pathology.dto';

export interface PathologyCase {
  id: string;
  patientId: string;
  encounterId: string | null;
  examResultId: string;
  biopsyType: string;
  specimenSite: string;
  laterality: string | null;
  clinicalHistory: string;
  clinicalSuspicion: string | null;
  numberOfFragments: number | null;
  fixative: string | null;
  accessionNumber: string;
  status: string;
  macroscopy: MacroscopyDto | null;
  microscopy: MicroscopyDto | null;
  ihc: ImmunohistochemistryDto | null;
  finalReport: FinalPathologyReportDto | null;
  tenantId: string;
  requestedById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PathologyService {
  private cases: PathologyCase[] = [];
  private accessionCounter = 5000;

  constructor(private readonly prisma: PrismaService) {}

  private generateAccessionNumber(): string {
    this.accessionCounter++;
    return `AP-${new Date().getFullYear()}-${String(this.accessionCounter).padStart(6, '0')}`;
  }

  async createBiopsy(tenantId: string, userId: string, dto: CreateBiopsyRequestDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const examResult = await this.prisma.examResult.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        examName: `Biopsy - ${dto.specimenSite}`,
        examType: 'PATHOLOGY',
        requestedById: userId,
        requestedAt: new Date(),
        status: 'REQUESTED',
      },
    });

    const pathCase: PathologyCase = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      examResultId: examResult.id,
      biopsyType: dto.biopsyType,
      specimenSite: dto.specimenSite,
      laterality: dto.laterality ?? null,
      clinicalHistory: dto.clinicalHistory,
      clinicalSuspicion: dto.clinicalSuspicion ?? null,
      numberOfFragments: dto.numberOfFragments ?? null,
      fixative: dto.fixative ?? 'Formalina 10%',
      accessionNumber: this.generateAccessionNumber(),
      status: PathologyStatus.REQUESTED,
      macroscopy: null,
      microscopy: null,
      ihc: null,
      finalReport: null,
      tenantId,
      requestedById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cases.push(pathCase);
    return pathCase;
  }

  async addMacroscopy(tenantId: string, caseId: string, dto: MacroscopyDto) {
    const pathCase = this.cases.find((c) => c.id === caseId && c.tenantId === tenantId);
    if (!pathCase) {
      throw new NotFoundException(`Pathology case "${caseId}" not found`);
    }

    pathCase.macroscopy = dto;
    pathCase.status = PathologyStatus.GROSSING;
    pathCase.updatedAt = new Date();

    await this.prisma.examResult.update({
      where: { id: pathCase.examResultId },
      data: { status: 'IN_PROGRESS' },
    });

    return pathCase;
  }

  async addMicroscopy(tenantId: string, caseId: string, dto: MicroscopyDto) {
    const pathCase = this.cases.find((c) => c.id === caseId && c.tenantId === tenantId);
    if (!pathCase) {
      throw new NotFoundException(`Pathology case "${caseId}" not found`);
    }

    pathCase.microscopy = dto;
    pathCase.status = PathologyStatus.MICROSCOPY;
    pathCase.updatedAt = new Date();

    return pathCase;
  }

  async addImmunohistochemistry(tenantId: string, caseId: string, dto: ImmunohistochemistryDto) {
    const pathCase = this.cases.find((c) => c.id === caseId && c.tenantId === tenantId);
    if (!pathCase) {
      throw new NotFoundException(`Pathology case "${caseId}" not found`);
    }

    pathCase.ihc = dto;
    pathCase.status = PathologyStatus.IHC_PENDING;
    pathCase.updatedAt = new Date();

    return pathCase;
  }

  async createFinalReport(tenantId: string, userId: string, caseId: string, dto: FinalPathologyReportDto) {
    const pathCase = this.cases.find((c) => c.id === caseId && c.tenantId === tenantId);
    if (!pathCase) {
      throw new NotFoundException(`Pathology case "${caseId}" not found`);
    }

    pathCase.finalReport = dto;
    pathCase.status = PathologyStatus.FINAL_REPORT;
    pathCase.updatedAt = new Date();

    // Build the full report text
    const sections: string[] = [];
    sections.push(`CASO: ${pathCase.accessionNumber}`);
    sections.push(`LOCAL: ${pathCase.specimenSite}`);
    sections.push(`TIPO: ${pathCase.biopsyType}`);

    if (pathCase.macroscopy) {
      sections.push(`\nMACROSCOPIA:\n${pathCase.macroscopy.description}`);
    }
    if (pathCase.microscopy) {
      sections.push(`\nMICROSCOPIA:\n${pathCase.microscopy.description}`);
    }
    if (pathCase.ihc) {
      const markers = pathCase.ihc.markers
        .map((m) => `  ${m.marker}: ${m.result}${m.percentage !== undefined ? ` (${m.percentage}%)` : ''}`)
        .join('\n');
      sections.push(`\nIMUNO-HISTOQUIMICA:\n${markers}`);
    }
    sections.push(`\nDIAGNOSTICO:\n${dto.diagnosis}`);
    if (dto.tnmStaging) {
      sections.push(`\nESTADIAMENTO TNM: ${dto.tnmStaging}`);
    }

    const fullReport = sections.join('\n');

    // Update exam result
    await this.prisma.examResult.update({
      where: { id: pathCase.examResultId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: userId,
        radiologistReport: fullReport,
        labResults: {
          diagnosis: dto.diagnosis,
          icdCode: dto.icdCode,
          snomedCode: dto.snomedCode,
          tnmStaging: dto.tnmStaging,
          synopticData: dto.synopticData,
        } as never,
      },
    });

    return pathCase;
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const cases = this.cases.filter(
      (c) => c.patientId === patientId && c.tenantId === tenantId,
    );

    return {
      patientId,
      patientName: patient.fullName,
      totalCases: cases.length,
      cases: cases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    };
  }
}
