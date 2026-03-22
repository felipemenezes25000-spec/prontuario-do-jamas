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
}
