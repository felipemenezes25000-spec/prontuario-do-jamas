import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AllergyRecord {
  substance: string;
  severity: string;
}

interface ChronicConditionRecord {
  cidDescription: string | null;
  cidCode: string | null;
}

interface PrescriptionItemRecord {
  medicationName: string | null;
  dose: string | null;
  route: string | null;
  frequency: string | null;
}

interface PrescriptionRecord {
  items: PrescriptionItemRecord[];
}

interface ClinicalNoteRecord {
  assessment: string | null;
}

interface EncounterRecord {
  clinicalNotes: ClinicalNoteRecord[];
}

@Injectable()
export class PatientContextBuilder {
  private readonly logger = new Logger(PatientContextBuilder.name);

  constructor(private readonly prisma: PrismaService) {}

  async build(patientId: string): Promise<string> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          allergies: { where: { status: 'ACTIVE' } },
          chronicConditions: { where: { status: 'ACTIVE' } },
          encounters: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              clinicalNotes: { take: 1, orderBy: { createdAt: 'desc' } },
            },
          },
          prescriptions: {
            where: { status: 'ACTIVE' },
            include: { items: true },
          },
        },
      });

      if (!patient) return 'Dados do paciente: nao disponiveis';

      const age = Math.floor(
        (Date.now() - new Date(patient.birthDate).getTime()) / 31557600000,
      );

      const parts: string[] = [
        `PACIENTE: ${patient.fullName}, ${age} anos, ${patient.gender}`,
      ];

      // Allergies
      const allergies = patient.allergies as AllergyRecord[];
      if (allergies.length > 0) {
        parts.push(
          `ALERGIAS: ${allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')}`,
        );
      } else {
        parts.push('ALERGIAS: NKDA (sem alergias conhecidas)');
      }

      // Chronic conditions
      const conditions = patient.chronicConditions as ChronicConditionRecord[];
      if (conditions.length > 0) {
        parts.push(
          `CONDICOES CRONICAS: ${conditions.map((c) => c.cidDescription ?? c.cidCode ?? 'N/A').join(', ')}`,
        );
      }

      // Active medications
      const prescriptions = patient.prescriptions as PrescriptionRecord[];
      const activeMeds: string[] = [];
      for (const rx of prescriptions) {
        for (const item of rx.items) {
          if (item.medicationName) {
            activeMeds.push(
              [
                item.medicationName,
                item.dose,
                item.route,
                item.frequency,
              ]
                .filter(Boolean)
                .join(' '),
            );
          }
        }
      }
      if (activeMeds.length > 0) {
        parts.push(`MEDICACOES ATIVAS: ${activeMeds.join('; ')}`);
      }

      // Last encounters summary
      const encounters = patient.encounters as EncounterRecord[];
      if (encounters.length > 0) {
        const lastNotes = encounters
          .flatMap((e) => e.clinicalNotes)
          .slice(0, 2);
        if (lastNotes.length > 0) {
          const summaries = lastNotes
            .map((n) => {
              const assessment = n.assessment ?? '';
              return assessment.slice(0, 200);
            })
            .filter(Boolean);
          if (summaries.length > 0) {
            parts.push(`ULTIMAS AVALIACOES: ${summaries.join(' | ')}`);
          }
        }
      }

      return parts.join('\n');
    } catch (error) {
      this.logger.warn(
        `Failed to build patient context: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 'Dados do paciente: nao disponiveis';
    }
  }
}
