import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryPortalDto, RequestAppointmentDto } from './dto/query-portal.dto';

@Injectable()
export class PatientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the patient record.
   * Staff (DOCTOR, NURSE, ADMIN, etc.) can pass an explicit patientId.
   * Patient users fall back to email matching.
   */
  private async resolvePatientId(
    tenantId: string,
    userEmail: string,
    userRole: string,
    explicitPatientId?: string,
  ): Promise<string> {
    // Staff roles can access any patient via explicit patientId
    const staffRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH'];
    if (explicitPatientId && staffRoles.includes(userRole)) {
      // Verify patient exists in tenant
      const patient = await this.prisma.patient.findFirst({
        where: { id: explicitPatientId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!patient) {
        throw new ForbiddenException('Paciente nao encontrado neste tenant.');
      }
      return patient.id;
    }

    // Self-service: match by email
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });

    if (!patient) {
      throw new ForbiddenException(
        'Nenhum registro de paciente vinculado a esta conta. Selecione um paciente.',
      );
    }

    return patient.id;
  }

  async getMyEncounters(tenantId: string, userEmail: string, userRole: string, query: QueryPortalDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    const where: Record<string, unknown> = { tenantId, patientId };

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const pageSize = query.limit ?? query.pageSize;
    const skip = (query.page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          priority: true,
          scheduledAt: true,
          startedAt: true,
          completedAt: true,
          chiefComplaint: true,
          location: true,
          room: true,
          createdAt: true,
          primaryDoctor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMyResults(tenantId: string, userEmail: string, userRole: string, query: QueryPortalDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    const where: Record<string, unknown> = { patientId };

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const pageSize = query.limit ?? query.pageSize;
    const skip = (query.page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.examResult.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          examType: true,
          status: true,
          examName: true,
          requestedAt: true,
          completedAt: true,
          aiInterpretation: true,
          createdAt: true,
          requestedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.examResult.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMyPrescriptions(tenantId: string, userEmail: string, userRole: string, query: QueryPortalDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    const where: Record<string, unknown> = { tenantId, patientId };

    const pageSize = query.limit ?? query.pageSize;
    const skip = (query.page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            select: {
              id: true,
              medicationName: true,
              dose: true,
              route: true,
              frequency: true,
              duration: true,
            },
          },
          doctor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMyAppointments(tenantId: string, userEmail: string, userRole: string, query: QueryPortalDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    const where: Record<string, unknown> = { tenantId, patientId };

    if (query.dateFrom || query.dateTo) {
      where.scheduledAt = {};
      if (query.dateFrom) {
        (where.scheduledAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.scheduledAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const pageSize = query.limit ?? query.pageSize;
    const skip = (query.page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scheduledAt: 'asc' },
        select: {
          id: true,
          type: true,
          status: true,
          scheduledAt: true,
          duration: true,
          notes: true,
          createdAt: true,
          doctor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async requestAppointment(tenantId: string, userEmail: string, userRole: string, dto: RequestAppointmentDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    // Find any available doctor for the requested specialty, or fallback to any doctor
    const doctorWhere: Record<string, unknown> = { tenantId, role: 'DOCTOR', isActive: true };
    if (dto.specialty) {
      doctorWhere.specialty = dto.specialty;
    }
    const doctor = await this.prisma.user.findFirst({
      where: doctorWhere,
      select: { id: true },
    });

    // doctorId is required on Appointment — if no doctor found, use a placeholder message
    if (!doctor) {
      throw new ForbiddenException(
        'Nenhum profissional disponivel para a especialidade solicitada.',
      );
    }

    return this.prisma.appointment.create({
      data: {
        tenantId,
        patientId,
        doctorId: doctor.id,
        type: (dto.type as 'FIRST_VISIT' | 'RETURN' | 'FOLLOW_UP') ?? 'FIRST_VISIT',
        status: 'SCHEDULED',
        scheduledAt: dto.preferredDate ? new Date(dto.preferredDate) : new Date(),
        duration: 30,
        notes: [dto.specialty, dto.reason].filter(Boolean).join(' — ') || undefined,
      },
    });
  }

  async getMyVitals(tenantId: string, userEmail: string, userRole: string, query: QueryPortalDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    const where: Record<string, unknown> = { patientId };

    if (query.dateFrom || query.dateTo) {
      where.recordedAt = {};
      if (query.dateFrom) {
        (where.recordedAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.recordedAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const pageSize = query.limit ?? query.pageSize;
    const skip = (query.page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.vitalSigns.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { recordedAt: 'desc' },
        select: {
          id: true,
          recordedAt: true,
          systolicBP: true,
          diastolicBP: true,
          heartRate: true,
          respiratoryRate: true,
          temperature: true,
          oxygenSaturation: true,
          weight: true,
          height: true,
          bmi: true,
          glucoseLevel: true,
          painScale: true,
        },
      }),
      this.prisma.vitalSigns.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMyDocuments(tenantId: string, userEmail: string, userRole: string, query: QueryPortalDto, explicitPatientId?: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail, userRole, explicitPatientId);

    const where: Record<string, unknown> = { tenantId, patientId };

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const pageSize = query.limit ?? query.pageSize;
    const skip = (query.page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          createdAt: true,
          signedAt: true,
          author: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
