import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
} from './dto/create-patient.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import {
  AllergyType,
  AllergySeverity,
  ConditionStatus,
  FamilyRelation,
  SmokingStatus,
  AlcoholStatus,
  DrugUseStatus,
  ExerciseLevel,
} from '@prisma/client';

// ============================================================================
// Timeline types
// ============================================================================

interface TimelineEntry {
  id: string;
  type: 'clinical_note' | 'prescription' | 'exam' | 'vital_signs' | 'triage' | 'document';
  date: string;
  professional: { id: string; name: string } | null;
  summary: string;
  details: Record<string, unknown>;
}

export interface TimelineResponse {
  items: TimelineEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePatientDto) {
    const existingCpf = await this.prisma.patient.findFirst({
      where: { cpf: dto.cpf, tenantId },
    });
    if (existingCpf) {
      throw new ConflictException('Patient with this CPF already registered in this tenant');
    }

    const { name, dateOfBirth, mobile: _mobile, zipCode: _zip, ...restDto } = dto as any;

    return this.prisma.patient.create({
      data: {
        ...restDto,
        fullName: name ?? 'Unknown',
        birthDate: new Date(dateOfBirth),
        tenantId,
        mrn: dto.mrn ?? `MRN-${Date.now()}`,
      },
    });
  }

  async findAll(tenantId: string, query: PatientQueryDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.name) {
      where.fullName = { contains: query.name, mode: 'insensitive' };
    }
    if (query.cpf) {
      where.cpf = { contains: query.cpf };
    }
    if (query.mrn) {
      where.mrn = query.mrn;
    }

    const orderBy: Record<string, string> = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder;
    } else {
      orderBy['fullName'] = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy,
        select: {
          id: true,
          fullName: true,
          cpf: true,
          mrn: true,
          birthDate: true,
          gender: true,
          phone: true,
          insuranceProvider: true,
          createdAt: true,
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findById(id: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId },
      include: {
        allergies: true,
        chronicConditions: true,
        encounters: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            primaryDoctor: { select: { id: true, name: true } },
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${id}" not found`);
    }

    return patient;
  }

  async update(id: string, tenantId: string, dto: UpdatePatientDto) {
    await this.findById(id, tenantId);
    return this.prisma.patient.update({
      where: { id },
      data: dto as any,
    });
  }

  async softDelete(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Sub-resource operations ---

  async addAllergy(patientId: string, tenantId: string, data: {
    substance: string;
    type?: AllergyType;
    severity?: AllergySeverity;
    reaction?: string;
    notes?: string;
  }) {
    await this.findById(patientId, tenantId);
    return this.prisma.allergy.create({
      data: {
        patientId,
        substance: data.substance,
        type: data.type ?? 'OTHER',
        severity: data.severity ?? 'MODERATE',
        reaction: data.reaction,
        notes: data.notes,
      },
    });
  }

  async getAllergies(patientId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.allergy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeAllergy(patientId: string, allergyId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.allergy.delete({
      where: { id: allergyId },
    });
  }

  async addCondition(patientId: string, tenantId: string, data: {
    cidCode?: string;
    cidDescription?: string;
    status?: ConditionStatus;
    diagnosedAt?: string;
    notes?: string;
  }) {
    await this.findById(patientId, tenantId);
    return this.prisma.chronicCondition.create({
      data: {
        patientId,
        cidCode: data.cidCode,
        cidDescription: data.cidDescription,
        status: data.status ?? 'ACTIVE',
        diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : undefined,
        notes: data.notes,
      },
    });
  }

  async getConditions(patientId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.chronicCondition.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCondition(
    patientId: string,
    conditionId: string,
    tenantId: string,
    data: { status?: string; notes?: string; cidCode?: string; cidDescription?: string },
  ) {
    await this.findById(patientId, tenantId);
    const condition = await this.prisma.chronicCondition.findFirst({
      where: { id: conditionId, patientId },
    });
    if (!condition) {
      throw new NotFoundException(`Condition with ID "${conditionId}" not found for this patient`);
    }
    return this.prisma.chronicCondition.update({
      where: { id: conditionId },
      data: {
        ...(data.status ? { status: data.status as ConditionStatus } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.cidCode !== undefined ? { cidCode: data.cidCode } : {}),
        ...(data.cidDescription !== undefined ? { cidDescription: data.cidDescription } : {}),
      },
    });
  }

  async getFamilyHistory(patientId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.familyHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFamilyHistory(patientId: string, tenantId: string, data: {
    relationship: FamilyRelation;
    condition: string;
    notes?: string;
  }) {
    await this.findById(patientId, tenantId);
    return this.prisma.familyHistory.create({
      data: {
        patientId,
        relationship: data.relationship,
        condition: data.condition,
        notes: data.notes,
      },
    });
  }

  async getSurgicalHistory(patientId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.surgicalHistory.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
    });
  }

  async addSurgicalHistory(patientId: string, tenantId: string, data: {
    procedure: string;
    date?: string;
    notes?: string;
  }) {
    await this.findById(patientId, tenantId);
    return this.prisma.surgicalHistory.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        patientId,
      },
    });
  }

  async getSocialHistory(patientId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.socialHistory.findFirst({
      where: { patientId },
    });
  }

  async upsertSocialHistory(patientId: string, tenantId: string, data: {
    smoking?: SmokingStatus;
    alcohol?: AlcoholStatus;
    drugs?: DrugUseStatus;
    exercise?: ExerciseLevel;
    diet?: string;
    notes?: string;
  }) {
    await this.findById(patientId, tenantId);
    const existing = await this.prisma.socialHistory.findFirst({
      where: { patientId },
    });

    if (existing) {
      return this.prisma.socialHistory.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.socialHistory.create({
      data: { ...data, patientId },
    });
  }

  async getVaccinations(patientId: string, tenantId: string) {
    await this.findById(patientId, tenantId);
    return this.prisma.vaccination.findMany({
      where: { patientId },
      orderBy: { applicationDate: 'desc' },
    });
  }

  async addVaccination(patientId: string, tenantId: string, data: {
    vaccine: string;
    dose?: string;
    lot?: string;
    applicationDate?: string;
    notes?: string;
  }) {
    await this.findById(patientId, tenantId);
    return this.prisma.vaccination.create({
      data: {
        vaccine: data.vaccine,
        dose: data.dose,
        lot: data.lot,
        applicationDate: data.applicationDate
          ? new Date(data.applicationDate)
          : new Date(),
        notes: data.notes,
        patientId,
      },
    });
  }

  // === Timeline (A9) ===

  async getTimeline(
    patientId: string,
    tenantId: string,
    query: TimelineQueryDto,
  ): Promise<TimelineResponse> {
    const limit = query.limit ?? 20;
    const cursorDate = query.cursor ? new Date(query.cursor) : undefined;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const typeFilter = query.type;

    // Verify patient exists in tenant
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (cursorDate) dateFilter.lt = cursorDate;
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Fetch all types in parallel (or only the requested type)
    const shouldFetch = (type: string) => !typeFilter || typeFilter === type;

    const [
      clinicalNotes,
      prescriptions,
      examResults,
      vitalSigns,
      triageAssessments,
      clinicalDocuments,
    ] = await Promise.all([
      shouldFetch('clinical_note')
        ? this.prisma.clinicalNote.findMany({
            where: {
              encounter: { patientId },
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            },
            include: {
              author: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
          })
        : Promise.resolve([]),

      shouldFetch('prescription')
        ? this.prisma.prescription.findMany({
            where: {
              patientId,
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            },
            include: {
              doctor: { select: { id: true, name: true } },
              items: { take: 3, orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
          })
        : Promise.resolve([]),

      shouldFetch('exam')
        ? this.prisma.examResult.findMany({
            where: {
              patientId,
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            },
            include: {
              requestedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
          })
        : Promise.resolve([]),

      shouldFetch('vital_signs')
        ? this.prisma.vitalSigns.findMany({
            where: {
              patientId,
              ...(hasDateFilter ? { recordedAt: dateFilter } : {}),
            },
            include: {
              recordedBy: { select: { id: true, name: true } },
            },
            orderBy: { recordedAt: 'desc' },
            take: limit + 1,
          })
        : Promise.resolve([]),

      shouldFetch('triage')
        ? this.prisma.triageAssessment.findMany({
            where: {
              encounter: { patientId },
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            },
            include: {
              nurse: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
          })
        : Promise.resolve([]),

      shouldFetch('document')
        ? this.prisma.clinicalDocument.findMany({
            where: {
              patientId,
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            },
            include: {
              author: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
          })
        : Promise.resolve([]),
    ]);

    // Transform to timeline entries
    const entries: TimelineEntry[] = [];

    for (const note of clinicalNotes) {
      const summary = note.subjective
        ? `${note.type}: ${note.subjective.slice(0, 120)}`
        : `${note.type}: ${(note.freeText ?? '').slice(0, 120)}`;
      entries.push({
        id: note.id,
        type: 'clinical_note',
        date: note.createdAt.toISOString(),
        professional: note.author ?? null,
        summary,
        details: {
          noteType: note.type,
          status: note.status,
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
          freeText: note.freeText,
        },
      });
    }

    for (const presc of prescriptions) {
      const itemNames = presc.items
        .map((i) => i.medicationName ?? i.examName ?? i.procedureName ?? 'Item')
        .join(', ');
      entries.push({
        id: presc.id,
        type: 'prescription',
        date: presc.createdAt.toISOString(),
        professional: presc.doctor ?? null,
        summary: `${presc.type}: ${itemNames}`,
        details: {
          prescriptionType: presc.type,
          status: presc.status,
          itemCount: presc.items.length,
          items: presc.items.map((i) => ({
            name: i.medicationName ?? i.examName ?? i.procedureName,
            dose: i.dose,
            route: i.route,
            frequency: i.frequency,
          })),
        },
      });
    }

    for (const exam of examResults) {
      entries.push({
        id: exam.id,
        type: 'exam',
        date: exam.createdAt.toISOString(),
        professional: exam.requestedBy ?? null,
        summary: `${exam.examType}: ${exam.examName}`,
        details: {
          examName: exam.examName,
          examType: exam.examType,
          status: exam.status,
          completedAt: exam.completedAt?.toISOString() ?? null,
          aiInterpretation: exam.aiInterpretation,
        },
      });
    }

    for (const vs of vitalSigns) {
      const parts: string[] = [];
      if (vs.systolicBP != null) parts.push(`PA ${vs.systolicBP}/${vs.diastolicBP}`);
      if (vs.heartRate != null) parts.push(`FC ${vs.heartRate}`);
      if (vs.oxygenSaturation != null) parts.push(`SpO2 ${vs.oxygenSaturation}%`);
      if (vs.temperature != null) parts.push(`T ${vs.temperature}C`);
      entries.push({
        id: vs.id,
        type: 'vital_signs',
        date: vs.recordedAt.toISOString(),
        professional: vs.recordedBy ?? null,
        summary: parts.join(' | ') || 'Sinais vitais registrados',
        details: {
          systolicBP: vs.systolicBP,
          diastolicBP: vs.diastolicBP,
          heartRate: vs.heartRate,
          respiratoryRate: vs.respiratoryRate,
          temperature: vs.temperature,
          oxygenSaturation: vs.oxygenSaturation,
          painScale: vs.painScale,
        },
      });
    }

    for (const triage of triageAssessments) {
      entries.push({
        id: triage.id,
        type: 'triage',
        date: triage.createdAt.toISOString(),
        professional: triage.nurse ?? null,
        summary: `Triagem ${triage.protocol} — ${triage.level}: ${triage.chiefComplaint}`,
        details: {
          protocol: triage.protocol,
          level: triage.level,
          chiefComplaint: triage.chiefComplaint,
          painScale: triage.painScale,
          maxWaitTimeMinutes: triage.maxWaitTimeMinutes,
        },
      });
    }

    for (const doc of clinicalDocuments) {
      entries.push({
        id: doc.id,
        type: 'document',
        date: doc.createdAt.toISOString(),
        professional: doc.author ?? null,
        summary: `${doc.type}: ${doc.title}`,
        details: {
          documentType: doc.type,
          title: doc.title,
          status: doc.status,
          content: doc.content?.slice(0, 300) ?? null,
          pdfUrl: doc.pdfUrl,
        },
      });
    }

    // Sort all entries by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply limit + check hasMore
    const hasMore = entries.length > limit;
    const items = entries.slice(0, limit);
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].date
      : null;

    return { items, nextCursor, hasMore };
  }
}
