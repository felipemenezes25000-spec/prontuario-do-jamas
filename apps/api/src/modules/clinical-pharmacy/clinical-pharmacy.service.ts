import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ValidatePrescriptionDto,
  CreateInterventionDto,
} from './dto/create-clinical-pharmacy.dto';

@Injectable()
export class ClinicalPharmacyService {
  constructor(private readonly prisma: PrismaService) {}

  async validatePrescription(tenantId: string, pharmacistId: string, dto: ValidatePrescriptionDto) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id: dto.prescriptionId, tenantId },
      include: {
        patient: { select: { id: true, fullName: true } },
        items: { where: { status: 'ACTIVE' } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription "${dto.prescriptionId}" not found`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: prescription.patientId,
        encounterId: prescription.encounterId,
        authorId: pharmacistId,
        tenantId,
        type: 'CUSTOM',
        title: `Pharmacist Validation — ${dto.result}`,
        content: JSON.stringify({
          documentType: 'PHARMACIST_VALIDATION',
          prescriptionId: dto.prescriptionId,
          result: dto.result,
          notes: dto.notes,
          drugInteractionWarnings: dto.drugInteractionWarnings,
          doseAlerts: dto.doseAlerts,
          allergyConcerns: dto.allergyConcerns,
          validatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      prescriptionId: dto.prescriptionId,
      result: dto.result,
      validatedAt: doc.createdAt,
    };
  }

  async getPendingPrescriptions(tenantId: string) {
    // Get active prescriptions that haven't been validated
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
        items: { where: { status: 'ACTIVE' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check which ones have validation docs
    const validatedDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Pharmacist Validation' },
      },
      select: { content: true },
    });

    const validatedPrescriptionIds = new Set(
      validatedDocs
        .map((d) => {
          const c = JSON.parse(d.content ?? '{}');
          return c.prescriptionId as string;
        })
        .filter(Boolean),
    );

    return prescriptions.filter((p) => !validatedPrescriptionIds.has(p.id));
  }

  async createIntervention(tenantId: string, pharmacistId: string, dto: CreateInterventionDto) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id: dto.prescriptionId, tenantId },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription "${dto.prescriptionId}" not found`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: prescription.patientId,
        encounterId: prescription.encounterId,
        authorId: pharmacistId,
        tenantId,
        type: 'CUSTOM',
        title: `Pharmacist Intervention — ${dto.type}`,
        content: JSON.stringify({
          documentType: 'PHARMACIST_INTERVENTION',
          prescriptionId: dto.prescriptionId,
          prescriptionItemId: dto.prescriptionItemId,
          type: dto.type,
          description: dto.description,
          recommendation: dto.recommendation,
          justification: dto.justification,
          outcome: dto.outcome ?? 'PENDING',
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, type: dto.type, outcome: dto.outcome ?? 'PENDING', createdAt: doc.createdAt };
  }

  async getInterventionHistory(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Pharmacist Intervention' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
      take: 100,
    });

    return docs.map((d) => ({
      id: d.id,
      ...JSON.parse(d.content ?? '{}'),
      pharmacist: d.author,
      patient: d.patient,
      createdAt: d.createdAt,
    }));
  }

  async getPharmacyValidationQueue(tenantId: string) {
    // Get active prescriptions that haven't been validated yet
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
        items: { where: { status: 'ACTIVE' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check which prescriptions already have validation documents
    const validatedDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Pharmacist Validation' },
      },
      select: { content: true },
    });

    const validatedPrescriptionIds = new Set(
      validatedDocs
        .map((d) => {
          const c = JSON.parse(d.content ?? '{}');
          return c.prescriptionId as string;
        })
        .filter(Boolean),
    );

    const pendingQueue = prescriptions.filter((p) => !validatedPrescriptionIds.has(p.id));

    // Prioritize: requiresDoubleCheck first, then by creation time (oldest first)
    const sorted = pendingQueue.sort((a, b) => {
      if (a.requiresDoubleCheck && !b.requiresDoubleCheck) return -1;
      if (!a.requiresDoubleCheck && b.requiresDoubleCheck) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      queue: sorted.map((p) => ({
        prescriptionId: p.id,
        patient: p.patient,
        prescriber: p.doctor,
        itemCount: p.items.length,
        requiresDoubleCheck: p.requiresDoubleCheck,
        hasHighAlertMedication: p.items.some((i: { isHighAlert: boolean }) => i.isHighAlert),
        hasAntibiotic: p.items.some((i: { isAntibiotic: boolean }) => i.isAntibiotic),
        waitingMinutes: Math.round((Date.now() - p.createdAt.getTime()) / (1000 * 60)),
        createdAt: p.createdAt,
      })),
      totalPending: sorted.length,
      highPriority: sorted.filter((p) => p.requiresDoubleCheck).length,
    };
  }

  async validatePrescriptionFull(
    tenantId: string,
    pharmacistId: string,
    prescriptionId: string,
    dto: ValidatePrescriptionDto,
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
      include: {
        patient: { select: { id: true, fullName: true } },
        items: { where: { status: 'ACTIVE' } },
        doctor: { select: { id: true, name: true } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription "${prescriptionId}" not found`);
    }

    // Create validation document
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: prescription.patientId,
        encounterId: prescription.encounterId,
        authorId: pharmacistId,
        tenantId,
        type: 'CUSTOM',
        title: `Pharmacist Validation — ${dto.result}`,
        content: JSON.stringify({
          documentType: 'PHARMACIST_VALIDATION',
          prescriptionId,
          prescriberId: prescription.doctorId,
          prescriberName: prescription.doctor.name,
          patientName: prescription.patient.fullName,
          itemCount: prescription.items.length,
          result: dto.result,
          notes: dto.notes,
          drugInteractionWarnings: dto.drugInteractionWarnings ?? [],
          doseAlerts: dto.doseAlerts ?? [],
          allergyConcerns: dto.allergyConcerns ?? [],
          validatedAt: new Date().toISOString(),
          validationDetails: {
            totalItemsReviewed: prescription.items.length,
            highAlertItems: prescription.items.filter((i: { isHighAlert: boolean }) => i.isHighAlert).length,
            antibioticItems: prescription.items.filter((i: { isAntibiotic: boolean }) => i.isAntibiotic).length,
          },
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    // Update prescription medCheckStatus via raw update (fields may vary by schema version)
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Prescription" SET "medCheckStatus" = $1, "medCheckAt" = $2, "medCheckById" = $3 WHERE "id" = $4`,
        dto.result === 'APPROVED' || dto.result === 'APPROVED_WITH_NOTES' ? 'APPROVED' : 'FLAGGED',
        new Date(),
        pharmacistId,
        prescriptionId,
      );
    } catch {
      // medCheck columns may not exist in current schema version — validation document is the source of truth
    }

    return {
      id: doc.id,
      prescriptionId,
      result: dto.result,
      patient: prescription.patient,
      prescriber: prescription.doctor,
      itemsReviewed: prescription.items.length,
      validatedAt: doc.createdAt,
    };
  }

  async getRenalAlerts(tenantId: string) {
    // Get patients with active prescriptions and check for renal-sensitive medications
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        items: {
          where: { status: 'ACTIVE', medicationName: { not: null } },
        },
      },
    });

    const renalSensitiveDrugs = [
      'metformina', 'metformin',
      'vancomicina', 'vancomycin',
      'gentamicina', 'gentamicin',
      'amicacina', 'amikacin',
      'enoxaparina', 'enoxaparin',
      'levofloxacino', 'levofloxacin',
      'ciprofloxacino', 'ciprofloxacin',
      'alopurinol', 'allopurinol',
      'digoxina', 'digoxin',
      'gabapentina', 'gabapentin',
      'lisinopril', 'enalapril',
    ];

    const alerts: Array<{
      patientId: string;
      patientName: string;
      medication: string;
      dose: string | null;
      route: string | null;
      alert: string;
    }> = [];

    for (const rx of prescriptions) {
      for (const item of rx.items) {
        const medName = (item.medicationName ?? '').toLowerCase();
        const isRenalSensitive = renalSensitiveDrugs.some((d) => medName.includes(d));
        if (isRenalSensitive) {
          alerts.push({
            patientId: rx.patient.id,
            patientName: rx.patient.fullName,
            medication: item.medicationName ?? '',
            dose: item.dose,
            route: item.route,
            alert: `Medicamento ${item.medicationName} requer ajuste renal/hepatico — verificar funcao renal`,
          });
        }
      }
    }

    return alerts;
  }
}
