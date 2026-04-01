import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ClinicalTimelineQueryDto,
  ClinicalTimelineDto,
  TimelineEventDto,
  TimelineEventType,
} from './dto/clinical-timeline.dto';

@Injectable()
export class ClinicalTimelineService {
  private readonly logger = new Logger(ClinicalTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // getTimeline — Aggregate all clinical events for a patient
  // =========================================================================

  async getTimeline(
    tenantId: string,
    patientId: string,
    query: ClinicalTimelineQueryDto,
  ): Promise<ClinicalTimelineDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const requestedTypes = query.eventTypes
      ? Array.isArray(query.eventTypes)
        ? query.eventTypes
        : [query.eventTypes]
      : null;

    const events: TimelineEventDto[] = [];

    // --- Encounters ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.ENCOUNTER)) {
      const encounters = await this.prisma.encounter.findMany({
        where: {
          tenantId,
          patientId,
          ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          type: true,
          status: true,
          chiefComplaint: true,
          createdAt: true,
          primaryDoctorId: true,
        },
        take: 200,
      });

      for (const e of encounters) {
        events.push({
          id: e.id,
          type: TimelineEventType.ENCOUNTER,
          eventDate: e.createdAt.toISOString(),
          title: `Atendimento: ${e.type ?? 'Consulta'}`,
          summary: e.chiefComplaint ?? null,
          metadata: { encounterType: e.type, status: e.status },
          providerId: e.primaryDoctorId ?? null,
          providerName: null,
        });
      }
    }

    // --- Vital Signs (sampled, most recent) ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.VITAL_SIGNS)) {
      const vitals = await this.prisma.vitalSigns.findMany({
        where: {
          patientId,
          ...(from || to ? { recordedAt: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          systolicBP: true,
          diastolicBP: true,
          heartRate: true,
          temperature: true,
          oxygenSaturation: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      });

      for (const v of vitals) {
        const parts: string[] = [];
        if (v.systolicBP && v.diastolicBP) parts.push(`PA ${v.systolicBP}/${v.diastolicBP}`);
        if (v.heartRate) parts.push(`FC ${v.heartRate}`);
        if (v.temperature) parts.push(`T ${v.temperature}°C`);
        if (v.oxygenSaturation) parts.push(`SpO2 ${v.oxygenSaturation}%`);

        events.push({
          id: v.id,
          type: TimelineEventType.VITAL_SIGNS,
          eventDate: v.recordedAt.toISOString(),
          title: 'Sinais Vitais',
          summary: parts.join(' | ') || null,
          metadata: {
            systolicBP: v.systolicBP,
            diastolicBP: v.diastolicBP,
            heartRate: v.heartRate,
            temperature: v.temperature,
            oxygenSaturation: v.oxygenSaturation,
          },
          providerId: null,
          providerName: null,
        });
      }
    }

    // --- Exam Results ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.EXAM_RESULT)) {
      const exams = await this.prisma.examResult.findMany({
        where: {
          patientId,
          ...(from || to ? { completedAt: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          examName: true,
          status: true,
          completedAt: true,
          createdAt: true,
          requestedById: true,
        },
        take: 100,
      });

      for (const ex of exams) {
        events.push({
          id: ex.id,
          type: TimelineEventType.EXAM_RESULT,
          eventDate: (ex.completedAt ?? ex.createdAt).toISOString(),
          title: `Exame: ${ex.examName}`,
          summary: null,
          metadata: { status: ex.status },
          providerId: ex.requestedById ?? null,
          providerName: null,
        });
      }
    }

    // --- Prescriptions ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.PRESCRIPTION)) {
      const rxs = await this.prisma.prescription.findMany({
        where: {
          tenantId,
          patientId,
          ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          doctorId: true,
        },
        take: 100,
      });

      for (const rx of rxs) {
        events.push({
          id: rx.id,
          type: TimelineEventType.PRESCRIPTION,
          eventDate: rx.createdAt.toISOString(),
          title: 'Prescrição',
          summary: null,
          metadata: { status: rx.status },
          providerId: rx.doctorId ?? null,
          providerName: null,
        });
      }
    }

    // --- Diagnoses (ICD-10 from chronic conditions) ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.DIAGNOSIS)) {
      const conditions = await this.prisma.chronicCondition.findMany({
        where: {
          patientId,
          ...(from || to ? { diagnosedAt: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          cidDescription: true,
          cidCode: true,
          diagnosedAt: true,
          status: true,
          diagnosedById: true,
        },
        take: 100,
      });

      for (const c of conditions) {
        events.push({
          id: c.id,
          type: TimelineEventType.DIAGNOSIS,
          eventDate: c.diagnosedAt?.toISOString() ?? new Date().toISOString(),
          title: `Diagnóstico: ${c.cidDescription ?? c.cidCode ?? 'Desconhecido'}`,
          summary: c.cidCode ?? null,
          metadata: { cidCode: c.cidCode, status: c.status },
          providerId: c.diagnosedById ?? null,
          providerName: null,
        });
      }
    }

    // --- Vaccinations ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.VACCINATION)) {
      const vaccinations = await this.prisma.vaccination.findMany({
        where: {
          patientId,
          ...(from || to ? { applicationDate: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          vaccine: true,
          applicationDate: true,
          dose: true,
          appliedById: true,
        },
        take: 100,
      });

      for (const v of vaccinations) {
        events.push({
          id: v.id,
          type: TimelineEventType.VACCINATION,
          eventDate: v.applicationDate.toISOString(),
          title: `Vacina: ${v.vaccine}`,
          summary: v.dose ?? null,
          metadata: { dose: v.dose },
          providerId: v.appliedById ?? null,
          providerName: null,
        });
      }
    }

    // --- Surgical History ---
    if (!requestedTypes || requestedTypes.includes(TimelineEventType.SURGERY)) {
      const surgeries = await this.prisma.surgicalHistory.findMany({
        where: {
          patientId,
          ...(from || to ? { date: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          procedure: true,
          date: true,
          complications: true,
          surgeon: true,
        },
        take: 100,
      });

      for (const s of surgeries) {
        events.push({
          id: s.id,
          type: TimelineEventType.SURGERY,
          eventDate: s.date?.toISOString() ?? new Date().toISOString(),
          title: `Cirurgia: ${s.procedure}`,
          summary: s.complications ?? null,
          metadata: { procedure: s.procedure, surgeon: s.surgeon },
          providerId: null,
          providerName: s.surgeon ?? null,
        });
      }
    }

    // --- Document-based events (transfusions, implants, notes) ---
    if (
      !requestedTypes ||
      requestedTypes.includes(TimelineEventType.TRANSFUSION) ||
      requestedTypes.includes(TimelineEventType.IMPLANT) ||
      requestedTypes.includes(TimelineEventType.NOTE)
    ) {
      const docs = await this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          patientId,
          ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
        },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
          authorId: true,
        },
        take: 200,
      });

      for (const doc of docs) {
        let evType: TimelineEventType | null = null;

        if (
          doc.title.startsWith('[TRANSFUSION]') &&
          (!requestedTypes || requestedTypes.includes(TimelineEventType.TRANSFUSION))
        ) {
          evType = TimelineEventType.TRANSFUSION;
        } else if (
          doc.title.startsWith('[IMPLANT]') &&
          (!requestedTypes || requestedTypes.includes(TimelineEventType.IMPLANT))
        ) {
          evType = TimelineEventType.IMPLANT;
        } else if (
          !doc.title.startsWith('[') &&
          (!requestedTypes || requestedTypes.includes(TimelineEventType.NOTE))
        ) {
          evType = TimelineEventType.NOTE;
        }

        if (evType) {
          events.push({
            id: doc.id,
            type: evType,
            eventDate: doc.createdAt.toISOString(),
            title: doc.title.replace(/^\[[^\]]+\]\s*/, ''),
            summary: null,
            metadata: { documentType: doc.type },
            providerId: doc.authorId,
            providerName: null,
          });
        }
      }
    }

    // Sort all events by date descending
    events.sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );

    const totalEvents = events.length;
    const paginated = events.slice(offset, offset + limit);

    this.logger.log(
      `Timeline generated: patient=${patientId} total=${totalEvents} returned=${paginated.length}`,
    );

    return {
      patientId,
      totalEvents,
      events: paginated,
      from: query.from ?? null,
      to: query.to ?? null,
      generatedAt: new Date().toISOString(),
    };
  }
}
