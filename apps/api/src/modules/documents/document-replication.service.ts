import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

export interface DocumentMetadataTemplate {
  found: boolean;
  template: Record<string, unknown>;
  sourceDocumentId: string | null;
  sourceDate: Date | null;
}

export interface PatientCommonData {
  medications: string[];
  diagnoses: string[];
  allergies: Array<{
    id: string;
    substance: string;
    type: string;
    severity: string;
    reaction: string | null;
  }>;
  conditions: Array<{
    id: string;
    cidCode: string | null;
    cidDescription: string | null;
    status: string;
    severity: string | null;
    currentTreatment: string | null;
  }>;
  insurance: {
    provider: string | null;
    plan: string | null;
    number: string | null;
  };
}

export interface HistorySuggestion {
  field: string;
  value: string;
  source: string;
  confidence: number;
}

export interface SuggestFromHistoryResult {
  suggestions: HistorySuggestion[];
}

@Injectable()
export class DocumentReplicationService {
  private readonly logger = new Logger(DocumentReplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds the most recent document of the same type for a patient
   * and returns a metadata template for pre-filling new documents.
   */
  async getLastDocumentMetadata(
    tenantId: string,
    patientId: string,
    documentType: DocumentType,
  ): Promise<DocumentMetadataTemplate> {
    const emptyResult: DocumentMetadataTemplate = {
      found: false,
      template: {},
      sourceDocumentId: null,
      sourceDate: null,
    };

    // Find the most recent ClinicalDocument of this type
    const lastDocument = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        type: documentType,
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    if (!lastDocument) {
      return emptyResult;
    }

    const template: Record<string, unknown> = {
      title: lastDocument.title,
      content: lastDocument.content,
      templateId: lastDocument.templateId,
      templateName: lastDocument.template?.name ?? null,
      author: lastDocument.author,
    };

    // Enrich based on document type
    switch (documentType) {
      case 'RECEITA':
        await this.enrichWithPrescriptionData(tenantId, patientId, template);
        break;
      case 'LAUDO':
      case 'ENCAMINHAMENTO':
        await this.enrichWithClinicalNoteData(tenantId, patientId, template);
        break;
      case 'ATESTADO':
      case 'RELATORIO':
      case 'SUMARIO_ALTA':
        await this.enrichWithClinicalNoteData(tenantId, patientId, template);
        break;
      default:
        break;
    }

    return {
      found: true,
      template,
      sourceDocumentId: lastDocument.id,
      sourceDate: lastDocument.createdAt,
    };
  }

  /**
   * Aggregates common data across a patient's records:
   * top medications, diagnoses, allergies, chronic conditions, insurance.
   */
  async getPatientCommonData(
    tenantId: string,
    patientId: string,
  ): Promise<PatientCommonData> {
    const [
      prescriptionItems,
      clinicalNotes,
      allergies,
      conditions,
      patient,
    ] = await Promise.all([
      // Top medications from recent prescriptions
      this.prisma.prescriptionItem.findMany({
        where: {
          prescription: {
            tenantId,
            patientId,
            status: { not: 'CANCELLED' },
          },
          medicationName: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          medicationName: true,
          dose: true,
          route: true,
          frequency: true,
        },
      }),

      // Recent clinical notes for diagnosis codes
      this.prisma.clinicalNote.findMany({
        where: {
          encounter: {
            tenantId,
            patientId,
          },
          diagnosisCodes: { isEmpty: false },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          diagnosisCodes: true,
        },
      }),

      // All active allergies
      this.prisma.allergy.findMany({
        where: {
          patientId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          substance: true,
          type: true,
          severity: true,
          reaction: true,
        },
      }),

      // All active chronic conditions
      this.prisma.chronicCondition.findMany({
        where: {
          patientId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          cidCode: true,
          cidDescription: true,
          status: true,
          severity: true,
          currentTreatment: true,
        },
      }),

      // Patient insurance info
      this.prisma.patient.findFirst({
        where: { id: patientId, tenantId },
        select: {
          insuranceProvider: true,
          insurancePlan: true,
          insuranceNumber: true,
        },
      }),
    ]);

    // Aggregate top 5 medications by frequency
    const medicationCounts = new Map<string, number>();
    for (const item of prescriptionItems) {
      if (item.medicationName) {
        const key = item.medicationName;
        medicationCounts.set(key, (medicationCounts.get(key) ?? 0) + 1);
      }
    }
    const topMedications = [...medicationCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Aggregate top 5 diagnoses by frequency
    const diagnosisCounts = new Map<string, number>();
    for (const note of clinicalNotes) {
      for (const code of note.diagnosisCodes) {
        diagnosisCounts.set(code, (diagnosisCounts.get(code) ?? 0) + 1);
      }
    }
    const topDiagnoses = [...diagnosisCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    return {
      medications: topMedications,
      diagnoses: topDiagnoses,
      allergies,
      conditions,
      insurance: {
        provider: patient?.insuranceProvider ?? null,
        plan: patient?.insurancePlan ?? null,
        number: patient?.insuranceNumber ?? null,
      },
    };
  }

  /**
   * Lightweight suggestion based on a context string.
   * Searches patient's document history for field-level matches.
   */
  async suggestFromHistory(
    tenantId: string,
    patientId: string,
    context: string,
  ): Promise<SuggestFromHistoryResult> {
    const suggestions: HistorySuggestion[] = [];
    const contextLower = context.toLowerCase();

    // Search clinical notes for matching content
    const recentNotes = await this.prisma.clinicalNote.findMany({
      where: {
        encounter: {
          tenantId,
          patientId,
        },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        diagnosisCodes: true,
        createdAt: true,
      },
    });

    for (const note of recentNotes) {
      const noteDate = note.createdAt.toISOString().split('T')[0];
      const source = `Nota clínica ${note.type} de ${noteDate}`;

      if (note.subjective && note.subjective.toLowerCase().includes(contextLower)) {
        suggestions.push({
          field: 'subjective',
          value: note.subjective,
          source,
          confidence: 0.8,
        });
      }
      if (note.assessment && note.assessment.toLowerCase().includes(contextLower)) {
        suggestions.push({
          field: 'assessment',
          value: note.assessment,
          source,
          confidence: 0.7,
        });
      }
      if (note.plan && note.plan.toLowerCase().includes(contextLower)) {
        suggestions.push({
          field: 'plan',
          value: note.plan,
          source,
          confidence: 0.6,
        });
      }
      if (note.diagnosisCodes.length > 0) {
        const codesStr = note.diagnosisCodes.join(', ');
        if (codesStr.toLowerCase().includes(contextLower)) {
          suggestions.push({
            field: 'diagnosisCodes',
            value: codesStr,
            source,
            confidence: 0.9,
          });
        }
      }
    }

    // Search recent prescriptions for matching medication names
    const recentPrescriptions = await this.prisma.prescriptionItem.findMany({
      where: {
        prescription: {
          tenantId,
          patientId,
          status: { not: 'CANCELLED' },
        },
        medicationName: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        medicationName: true,
        dose: true,
        route: true,
        frequency: true,
        createdAt: true,
      },
    });

    for (const item of recentPrescriptions) {
      if (
        item.medicationName &&
        item.medicationName.toLowerCase().includes(contextLower)
      ) {
        const parts = [
          item.medicationName,
          item.dose,
          item.route,
          item.frequency,
        ].filter(Boolean);

        suggestions.push({
          field: 'medication',
          value: parts.join(' — '),
          source: `Prescrição de ${item.createdAt.toISOString().split('T')[0]}`,
          confidence: 0.85,
        });
      }
    }

    // Search clinical documents for matching content
    const recentDocuments = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        status: { not: 'VOIDED' },
        content: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    for (const doc of recentDocuments) {
      if (doc.content && doc.content.toLowerCase().includes(contextLower)) {
        suggestions.push({
          field: 'content',
          value: doc.content.substring(0, 500),
          source: `${doc.title} (${doc.type}) de ${doc.createdAt.toISOString().split('T')[0]}`,
          confidence: 0.5,
        });
      }
    }

    // Sort by confidence descending, limit results
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return {
      suggestions: suggestions.slice(0, 10),
    };
  }

  // ---- Private enrichment helpers ----

  private async enrichWithPrescriptionData(
    tenantId: string,
    patientId: string,
    template: Record<string, unknown>,
  ): Promise<void> {
    const lastPrescription = await this.prisma.prescription.findFirst({
      where: {
        tenantId,
        patientId,
        status: { not: 'CANCELLED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: {
            medicationName: true,
            activeIngredient: true,
            concentration: true,
            pharmaceuticalForm: true,
            dose: true,
            doseUnit: true,
            route: true,
            frequency: true,
            duration: true,
            durationUnit: true,
            specialInstructions: true,
            examName: true,
            examCode: true,
            examType: true,
            examJustification: true,
          },
        },
      },
    });

    if (lastPrescription) {
      template.lastPrescriptionId = lastPrescription.id;
      template.lastPrescriptionType = lastPrescription.type;
      template.lastPrescriptionDate = lastPrescription.createdAt;
      template.medications = lastPrescription.items
        .filter((item) => item.medicationName !== null)
        .map((item) => ({
          medicationName: item.medicationName,
          activeIngredient: item.activeIngredient,
          concentration: item.concentration,
          pharmaceuticalForm: item.pharmaceuticalForm,
          dose: item.dose,
          doseUnit: item.doseUnit,
          route: item.route,
          frequency: item.frequency,
          duration: item.duration,
          durationUnit: item.durationUnit,
          specialInstructions: item.specialInstructions,
        }));
      template.exams = lastPrescription.items
        .filter((item) => item.examName !== null)
        .map((item) => ({
          examName: item.examName,
          examCode: item.examCode,
          examType: item.examType,
          examJustification: item.examJustification,
        }));
    }
  }

  private async enrichWithClinicalNoteData(
    tenantId: string,
    patientId: string,
    template: Record<string, unknown>,
  ): Promise<void> {
    const lastNote = await this.prisma.clinicalNote.findFirst({
      where: {
        encounter: {
          tenantId,
          patientId,
        },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        subjective: true,
        assessment: true,
        plan: true,
        diagnosisCodes: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
      },
    });

    if (lastNote) {
      template.lastNoteId = lastNote.id;
      template.lastNoteType = lastNote.type;
      template.lastNoteDate = lastNote.createdAt;
      template.diagnosisCodes = lastNote.diagnosisCodes;
      template.lastComplaint = lastNote.subjective;
      template.lastAssessment = lastNote.assessment;
      template.lastPlan = lastNote.plan;
      template.attendingDoctor = lastNote.author;
    }
  }
}
