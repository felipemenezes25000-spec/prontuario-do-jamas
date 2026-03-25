import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-antimicrobial-stewardship.dto';

@Injectable()
export class AntimicrobialStewardshipService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    // Get all antimicrobial prescriptions
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        type: 'ANTIMICROBIAL',
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        items: { where: { medicationName: { not: null } } },
        patient: { select: { id: true, fullName: true } },
      },
    });

    const byAgent: Record<string, number> = {};
    let totalTherapyDays = 0;

    for (const rx of prescriptions) {
      for (const item of rx.items) {
        const name = item.medicationName ?? 'Unknown';
        byAgent[name] = (byAgent[name] ?? 0) + 1;
      }
      // Estimate therapy duration
      if (rx.createdAt) {
        const endDate = rx.status === 'ACTIVE' ? new Date() : rx.updatedAt;
        const days = Math.ceil((endDate.getTime() - rx.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        totalTherapyDays += days;
      }
    }

    // Get reviews
    const reviews = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Antimicrobial Review' },
      },
    });

    const reviewActions: Record<string, number> = {};
    for (const r of reviews) {
      const content = JSON.parse(r.content ?? '{}');
      const action = content.action ?? 'UNKNOWN';
      reviewActions[action] = (reviewActions[action] ?? 0) + 1;
    }

    return {
      totalActivePrescriptions: prescriptions.filter((p) => p.status === 'ACTIVE').length,
      totalPrescriptions: prescriptions.length,
      totalTherapyDays,
      averageTherapyDays: prescriptions.length > 0
        ? Math.round(totalTherapyDays / prescriptions.length)
        : 0,
      byAgent,
      totalReviews: reviews.length,
      reviewActions,
    };
  }

  async getActiveTherapies(tenantId: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        type: 'ANTIMICROBIAL',
        status: 'ACTIVE',
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
        items: {
          where: { status: 'ACTIVE', medicationName: { not: null } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return prescriptions.map((rx) => {
      const daysOnTherapy = Math.ceil(
        (new Date().getTime() - rx.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        prescriptionId: rx.id,
        patient: rx.patient,
        prescriber: rx.doctor,
        medications: rx.items.map((i) => ({
          id: i.id,
          name: i.medicationName,
          dose: i.dose,
          route: i.route,
          frequency: i.frequency,
        })),
        daysOnTherapy,
        needsReview: daysOnTherapy >= 3,
        startedAt: rx.createdAt,
      };
    });
  }

  async createReview(tenantId: string, authorId: string, dto: CreateReviewDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `Antimicrobial Review — ${dto.action} — ${dto.antimicrobialName}`,
        content: JSON.stringify({
          documentType: 'ANTIMICROBIAL_REVIEW',
          prescriptionId: dto.prescriptionId,
          antimicrobialName: dto.antimicrobialName,
          action: dto.action,
          justification: dto.justification,
          recommendedAlternative: dto.recommendedAlternative,
          cultureResults: dto.cultureResults,
          sensitivityPattern: dto.sensitivityPattern,
          observations: dto.observations,
          reviewedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, action: dto.action, antimicrobialName: dto.antimicrobialName, createdAt: doc.createdAt };
  }

  async getAntibiogram(tenantId: string) {
    // Get all antimicrobial reviews with culture results
    const reviews = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Antimicrobial Review' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const organisms: Record<
      string,
      Record<string, { sensitive: number; resistant: number; intermediate: number }>
    > = {};

    for (const review of reviews) {
      const content = JSON.parse(review.content ?? '{}');
      if (content.cultureResults && content.sensitivityPattern) {
        const organism = content.cultureResults;
        const agent = content.antimicrobialName;
        const pattern = (content.sensitivityPattern as string).toUpperCase();

        if (!organisms[organism]) organisms[organism] = {};
        if (!organisms[organism][agent]) {
          organisms[organism][agent] = { sensitive: 0, resistant: 0, intermediate: 0 };
        }

        if (pattern.includes('SENSIVEL') || pattern.includes('SENSITIVE') || pattern === 'S') {
          organisms[organism][agent].sensitive++;
        } else if (pattern.includes('RESISTENTE') || pattern.includes('RESISTANT') || pattern === 'R') {
          organisms[organism][agent].resistant++;
        } else {
          organisms[organism][agent].intermediate++;
        }
      }
    }

    return {
      organisms,
      note: 'Antibiograma institucional baseado em dados de culturas registradas no sistema',
      generatedAt: new Date().toISOString(),
    };
  }

  async getPendingCultures(tenantId: string) {
    // Get microbiological exam results that are pending
    const exams = await this.prisma.examResult.findMany({
      where: {
        examType: 'MICROBIOLOGICAL',
        status: { in: ['REQUESTED', 'COLLECTED', 'IN_PROGRESS'] },
        patient: { tenantId },
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });

    return exams.map((e) => ({
      id: e.id,
      patient: e.patient,
      requester: e.requestedBy,
      examName: e.examName,
      status: e.status,
      requestedAt: e.requestedAt,
      daysPending: e.requestedAt
        ? Math.ceil((new Date().getTime() - e.requestedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }
}
