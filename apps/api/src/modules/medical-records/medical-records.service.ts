import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RequestRecordDto,
  ReturnRecordDto,
  DigitizeRecordDto,
  CheckoutRecordDto,
  LoanStatus,
} from './dto/medical-records.dto';

/** Overdue threshold in milliseconds (48 hours). */
const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/** CFM retention limit in years. */
const CFM_RETENTION_YEARS = 20;

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Request Physical Record
  // =========================================================================

  async requestPhysicalRecord(tenantId: string, userId: string, dto: RequestRecordDto) {
    // Verify patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" nao encontrado`);
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[MEDICAL_RECORD:LOAN] ${patient.fullName}`,
        content: JSON.stringify({
          requestedBy: dto.requestedBy,
          purpose: dto.purpose,
          urgency: dto.urgency,
          status: LoanStatus.REQUESTED,
          requestedAt: new Date().toISOString(),
          loanHistory: [],
        }),
        status: 'DRAFT',
      },
    });
  }

  // =========================================================================
  // Checkout Record (mark as loaned)
  // =========================================================================

  async checkoutRecord(tenantId: string, userId: string, dto: CheckoutRecordDto) {
    const doc = await this.findRecordOrFail(dto.recordId, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');

    if (existing.status === LoanStatus.LOANED) {
      throw new BadRequestException('Prontuario ja esta emprestado. Devolva antes de emprestar novamente.');
    }

    const loanHistory = existing.loanHistory ?? [];
    loanHistory.push({
      action: 'CHECKOUT',
      by: dto.checkedOutBy,
      purpose: dto.purpose,
      department: dto.department,
      at: new Date().toISOString(),
      userId,
    });

    return this.prisma.clinicalDocument.update({
      where: { id: dto.recordId },
      data: {
        content: JSON.stringify({
          ...existing,
          status: LoanStatus.LOANED,
          checkedOutBy: dto.checkedOutBy,
          checkedOutAt: new Date().toISOString(),
          currentDepartment: dto.department,
          purpose: dto.purpose,
          loanHistory,
        }),
        status: 'DRAFT',
      },
    });
  }

  // =========================================================================
  // Return Record
  // =========================================================================

  async returnRecord(tenantId: string, userId: string, dto: ReturnRecordDto) {
    const doc = await this.findRecordOrFail(dto.recordId, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');

    if (existing.status !== LoanStatus.LOANED && existing.status !== LoanStatus.OVERDUE) {
      throw new BadRequestException('Prontuario nao esta emprestado.');
    }

    const loanHistory = existing.loanHistory ?? [];
    loanHistory.push({
      action: 'RETURN',
      by: dto.returnedBy,
      condition: dto.condition,
      at: new Date().toISOString(),
      userId,
    });

    return this.prisma.clinicalDocument.update({
      where: { id: dto.recordId },
      data: {
        content: JSON.stringify({
          ...existing,
          status: LoanStatus.RETURNED,
          returnedBy: dto.returnedBy,
          returnedAt: new Date().toISOString(),
          returnCondition: dto.condition,
          currentDepartment: 'SAME',
          loanHistory,
        }),
        status: 'FINAL',
      },
    });
  }

  // =========================================================================
  // Digitize Record
  // =========================================================================

  async digitizeRecord(tenantId: string, userId: string, dto: DigitizeRecordDto) {
    const doc = await this.findRecordOrFail(dto.recordId, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');

    return this.prisma.clinicalDocument.update({
      where: { id: dto.recordId },
      data: {
        content: JSON.stringify({
          ...existing,
          digitized: true,
          digitizedAt: new Date().toISOString(),
          scannedPages: dto.scannedPages,
          operator: dto.operator,
          digitizedBy: userId,
        }),
      },
    });
  }

  // =========================================================================
  // List Loaned Records (with overdue alerts)
  // =========================================================================

  async listLoanedRecords(tenantId: string) {
    const records = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[MEDICAL_RECORD:LOAN]' },
      },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();

    return records
      .map((record) => {
        const data = JSON.parse(record.content ?? '{}');
        const checkedOutAt = data.checkedOutAt ? new Date(data.checkedOutAt).getTime() : null;
        const isOverdue =
          data.status === LoanStatus.LOANED &&
          checkedOutAt !== null &&
          now - checkedOutAt > OVERDUE_THRESHOLD_MS;

        return {
          id: record.id,
          patientId: record.patientId,
          title: record.title,
          status: isOverdue ? LoanStatus.OVERDUE : data.status,
          checkedOutBy: data.checkedOutBy ?? null,
          checkedOutAt: data.checkedOutAt ?? null,
          currentDepartment: data.currentDepartment ?? null,
          purpose: data.purpose ?? null,
          urgency: data.urgency ?? null,
          digitized: data.digitized ?? false,
          isOverdue,
          overdueHours: isOverdue && checkedOutAt ? Math.round((now - checkedOutAt) / 3_600_000) : 0,
          createdAt: record.createdAt,
          author: record.author,
        };
      })
      .filter((r) => r.status === LoanStatus.LOANED || r.status === LoanStatus.OVERDUE || r.status === LoanStatus.REQUESTED);
  }

  // =========================================================================
  // Get Record Location
  // =========================================================================

  async getRecordLocation(tenantId: string, recordId: string) {
    const doc = await this.findRecordOrFail(recordId, tenantId);
    const data = JSON.parse(doc.content ?? '{}');

    return {
      recordId: doc.id,
      patientId: doc.patientId,
      status: data.status,
      currentDepartment: data.currentDepartment ?? 'SAME',
      checkedOutBy: data.checkedOutBy ?? null,
      checkedOutAt: data.checkedOutAt ?? null,
      digitized: data.digitized ?? false,
      lastAction: data.loanHistory?.length
        ? data.loanHistory[data.loanHistory.length - 1]
        : null,
    };
  }

  // =========================================================================
  // Retention Schedule (CFM 20-year limit)
  // =========================================================================

  async getRetentionSchedule(tenantId: string) {
    const records = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[MEDICAL_RECORD:LOAN]' },
      },
      select: {
        id: true,
        patientId: true,
        title: true,
        createdAt: true,
        content: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const retentionLimitDate = new Date(now);
    retentionLimitDate.setFullYear(retentionLimitDate.getFullYear() - CFM_RETENTION_YEARS);

    // Alert records created more than 19 years ago (approaching limit)
    const warningDate = new Date(now);
    warningDate.setFullYear(warningDate.getFullYear() - (CFM_RETENTION_YEARS - 1));

    return records.map((record) => {
      const createdAt = new Date(record.createdAt);
      const ageYears = (now.getTime() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const data = JSON.parse(record.content ?? '{}');

      let retentionStatus: 'OK' | 'APPROACHING' | 'EXPIRED';
      if (createdAt < retentionLimitDate) {
        retentionStatus = 'EXPIRED';
      } else if (createdAt < warningDate) {
        retentionStatus = 'APPROACHING';
      } else {
        retentionStatus = 'OK';
      }

      return {
        recordId: record.id,
        patientId: record.patientId,
        createdAt: record.createdAt,
        ageYears: Math.round(ageYears * 10) / 10,
        retentionLimitYears: CFM_RETENTION_YEARS,
        retentionStatus,
        digitized: data.digitized ?? false,
      };
    });
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async findRecordOrFail(id: string, tenantId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[MEDICAL_RECORD:' } },
    });
    if (!doc) {
      throw new NotFoundException(`Registro medico "${id}" nao encontrado`);
    }
    return doc;
  }
}
