import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StartReconciliationDto,
  AddHomeMedicationDto,
  RecordDecisionDto,
} from './dto/create-medication-reconciliation.dto';

@Injectable()
export class MedicationReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async startReconciliation(tenantId: string, authorId: string, dto: StartReconciliationDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `Medication Reconciliation — ${dto.type}`,
        content: JSON.stringify({
          documentType: 'MEDICATION_RECONCILIATION',
          reconciliationType: dto.type,
          observations: dto.observations,
          homeMedications: [],
          comparison: null,
          decisions: [],
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'DRAFT',
      },
    });

    return { id: doc.id, type: dto.type, status: 'IN_PROGRESS', createdAt: doc.createdAt };
  }

  private async getReconciliationDoc(tenantId: string, id: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId },
    });
    if (!doc) throw new NotFoundException(`Reconciliation "${id}" not found`);
    return doc;
  }

  async addHomeMedication(tenantId: string, authorId: string, reconciliationId: string, dto: AddHomeMedicationDto) {
    const doc = await this.getReconciliationDoc(tenantId, reconciliationId);
    const existing = JSON.parse(doc.content ?? '{}');
    const homeMeds = existing.homeMedications ?? [];

    homeMeds.push({
      ...dto,
      addedBy: authorId,
      addedAt: new Date().toISOString(),
    });

    await this.prisma.clinicalDocument.update({
      where: { id: reconciliationId },
      data: { content: JSON.stringify({ ...existing, homeMedications: homeMeds }) },
    });

    return { id: reconciliationId, homeMedicationCount: homeMeds.length, added: dto.medicationName };
  }

  async compareMedications(tenantId: string, authorId: string, reconciliationId: string) {
    const doc = await this.getReconciliationDoc(tenantId, reconciliationId);
    const existing = JSON.parse(doc.content ?? '{}');
    const homeMeds = existing.homeMedications ?? [];

    // Get current prescriptions
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        encounterId: doc.encounterId ?? undefined,
        status: 'ACTIVE',
      },
      include: {
        items: { where: { status: 'ACTIVE', medicationName: { not: null } } },
      },
    });

    const currentMeds = prescriptions.flatMap((p) =>
      p.items.map((i) => ({
        id: i.id,
        medicationName: i.medicationName,
        dose: i.dose,
        route: i.route,
        frequency: i.frequency,
      })),
    );

    // Compare: find discrepancies
    const discrepancies: Array<{
      homeMed: string;
      currentMed: string | null;
      type: string;
      details: string;
    }> = [];

    for (const home of homeMeds) {
      const match = currentMeds.find(
        (c) =>
          c.medicationName?.toLowerCase().includes(home.medicationName.toLowerCase()) ||
          home.medicationName.toLowerCase().includes(c.medicationName?.toLowerCase() ?? ''),
      );

      if (!match) {
        discrepancies.push({
          homeMed: home.medicationName,
          currentMed: null,
          type: 'OMISSION',
          details: `Medicacao domiciliar "${home.medicationName}" nao encontrada nas prescricoes atuais`,
        });
      } else {
        if (home.dose && match.dose && home.dose !== match.dose) {
          discrepancies.push({
            homeMed: home.medicationName,
            currentMed: match.medicationName ?? '',
            type: 'DOSE_CHANGE',
            details: `Dose alterada: domiciliar ${home.dose} vs atual ${match.dose}`,
          });
        }
        if (home.route && match.route && home.route !== match.route) {
          discrepancies.push({
            homeMed: home.medicationName,
            currentMed: match.medicationName ?? '',
            type: 'ROUTE_CHANGE',
            details: `Via alterada: domiciliar ${home.route} vs atual ${match.route}`,
          });
        }
      }
    }

    // Check for new meds not in home list
    for (const current of currentMeds) {
      const match = homeMeds.find(
        (h: { medicationName: string }) =>
          current.medicationName?.toLowerCase().includes(h.medicationName.toLowerCase()) ||
          h.medicationName.toLowerCase().includes(current.medicationName?.toLowerCase() ?? ''),
      );
      if (!match) {
        discrepancies.push({
          homeMed: '',
          currentMed: current.medicationName ?? '',
          type: 'ADDITION',
          details: `Nova medicacao "${current.medicationName}" nao constava no uso domiciliar`,
        });
      }
    }

    const comparison = {
      homeMedications: homeMeds,
      currentMedications: currentMeds,
      discrepancies,
      comparedAt: new Date().toISOString(),
      comparedBy: authorId,
    };

    await this.prisma.clinicalDocument.update({
      where: { id: reconciliationId },
      data: { content: JSON.stringify({ ...existing, comparison }) },
    });

    return { id: reconciliationId, discrepancies, totalDiscrepancies: discrepancies.length };
  }

  async recordDecision(tenantId: string, authorId: string, reconciliationId: string, dto: RecordDecisionDto) {
    const doc = await this.getReconciliationDoc(tenantId, reconciliationId);
    const existing = JSON.parse(doc.content ?? '{}');
    const decisions = existing.decisions ?? [];

    decisions.push({
      ...dto,
      decidedBy: authorId,
      decidedAt: new Date().toISOString(),
    });

    await this.prisma.clinicalDocument.update({
      where: { id: reconciliationId },
      data: { content: JSON.stringify({ ...existing, decisions }) },
    });

    return { id: reconciliationId, decisionCount: decisions.length, latest: dto };
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: 'Medication Reconciliation' },
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      ...JSON.parse(d.content ?? '{}'),
      author: d.author,
      createdAt: d.createdAt,
    }));
  }
}
