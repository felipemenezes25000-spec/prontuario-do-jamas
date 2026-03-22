import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ControlledSchedule, MedicationRoute, MedCheckStatus } from '@prisma/client';

// ─── Result Interfaces ──────────────────────────────────────────────────────

export interface ControlledSubstanceResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  requiredRecipeType: string;
}

export interface AntimicrobialResult {
  valid: boolean;
  warnings: string[];
  requiresCulture: boolean;
}

export interface ScheduleResult {
  times: Date[];
  intervalHours: number;
}

export interface DoubleCheckResult {
  requiresDoubleCheck: boolean;
  reason: string;
  alertLevel: 'HIGH' | 'CRITICAL';
}

export interface SafetyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  controlledSubstance: ControlledSubstanceResult | null;
  antimicrobial: AntimicrobialResult | null;
  doubleCheck: DoubleCheckResult | null;
}

// ─── Input Interfaces ───────────────────────────────────────────────────────

export interface ControlledSubstanceInput {
  medicationName: string;
  activeIngredient?: string;
  isControlled?: boolean;
  controlType?: ControlledSchedule;
  durationDays?: number;
  patientGender?: string;
  patientAge?: number;
}

export interface AntimicrobialInput {
  medicationName: string;
  activeIngredient?: string;
  isAntimicrobial?: boolean;
  durationDays?: number;
  frequency?: string;
  dose?: string;
  indication?: string;
}

export interface ScheduleInput {
  frequency: string;
  startTime: string;
  medicationName?: string;
}

export interface DoubleCheckInput {
  medicationName: string;
  route?: MedicationRoute;
  concentration?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RECIPE_TYPES: Record<string, string> = {
  A1: 'Receita Amarela (Notificação de Receita A)',
  A2: 'Receita Amarela (Notificação de Receita A)',
  A3: 'Receita Amarela (Notificação de Receita A)',
  B1: 'Receita Azul (Notificação de Receita B)',
  B2: 'Receita Azul (Notificação de Receita B)',
  C1: 'Receita Branca Especial (2 vias, retenção)',
  C2: 'Receita Branca Especial + Termo de Consentimento',
  C3: 'Receita Branca Especial (2 vias)',
  C4: 'Receita Branca Especial (2 vias)',
  C5: 'Receita Branca Especial (2 vias)',
};

const MAX_SUPPLY_DAYS: Record<string, number> = {
  A1: 30,
  A2: 30,
  A3: 30,
  B1: 60,
  B2: 30,
  C1: 60,
  C2: 60,
  C3: 60,
  C4: 60,
  C5: 60,
};

const HIGH_ALERT_PATTERNS: Array<{
  pattern: RegExp;
  reason: string;
  alertLevel: 'HIGH' | 'CRITICAL';
  routeRestriction?: MedicationRoute;
}> = [
  {
    pattern: /\binsulin[ae]?\b/i,
    reason: 'Insulina — risco de hipoglicemia grave',
    alertLevel: 'CRITICAL',
  },
  {
    pattern: /\bheparin[ae]?\b/i,
    reason: 'Heparina — risco de sangramento',
    alertLevel: 'CRITICAL',
  },
  {
    pattern: /\b(cloreto\s+de\s+pot[aá]ssio|kcl)\b/i,
    reason: 'Cloreto de potássio concentrado — risco de arritmia fatal',
    alertLevel: 'CRITICAL',
  },
  {
    pattern: /\b(cloreto\s+de\s+s[oó]dio|nacl)\b/i,
    reason: 'Cloreto de sódio hipertônico (>0,9%) — risco de hipernatremia',
    alertLevel: 'HIGH',
  },
  {
    pattern: /\bsulfato\s+de\s+magn[eé]sio\b/i,
    reason: 'Sulfato de magnésio IV — risco de depressão respiratória',
    alertLevel: 'CRITICAL',
    routeRestriction: MedicationRoute.IV,
  },
  {
    pattern: /\b(quimioter[aá]pic[oa]|antineopl[aá]sic[oa]|metotrexato|ciclofosfamida|cisplatina|doxorrubicina|vincristina|carboplatina|paclitaxel|fluorouracil|5-fu)\b/i,
    reason: 'Agente quimioterápico — alto risco de toxicidade',
    alertLevel: 'CRITICAL',
  },
  {
    pattern: /\b(morfina|fentanil|fentanila)\b/i,
    reason: 'Opioide IV — risco de depressão respiratória',
    alertLevel: 'CRITICAL',
    routeRestriction: MedicationRoute.IV,
  },
  {
    pattern: /\b(norepinefrina|noradrenalina|dopamina|dobutamina)\b/i,
    reason: 'Vasopressor — requer monitorização contínua',
    alertLevel: 'CRITICAL',
  },
  {
    pattern: /\b(pancur[oô]nio|atrac[uú]rio|cisatrac[uú]rio|rocur[oô]nio|succinilcolina|suxamet[oô]nio)\b/i,
    reason: 'Bloqueador neuromuscular — risco de parada respiratória',
    alertLevel: 'CRITICAL',
  },
  {
    pattern: /\b(midazolam|propofol)\b/i,
    reason: 'Sedativo IV — risco de depressão respiratória',
    alertLevel: 'CRITICAL',
    routeRestriction: MedicationRoute.IV,
  },
];

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class PrescriptionSafetyService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Portaria 344/98 Validation
  // ──────────────────────────────────────────────────────────────────────────

  validateControlledSubstance(input: ControlledSubstanceInput): ControlledSubstanceResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!input.isControlled || !input.controlType) {
      return {
        valid: true,
        warnings: [],
        errors: [],
        requiredRecipeType: 'Receita Simples',
      };
    }

    const schedule = input.controlType;
    const requiredRecipeType = RECIPE_TYPES[schedule] ?? 'Receita Simples';
    const maxDays = MAX_SUPPLY_DAYS[schedule];

    // Duration check
    if (maxDays && input.durationDays && input.durationDays > maxDays) {
      errors.push(
        `Portaria 344/98: Duração máxima para substância ${schedule} é de ${maxDays} dias. ` +
        `Prescrito: ${input.durationDays} dias.`,
      );
    }

    // Schedule-specific rules
    switch (schedule) {
      case 'A1':
      case 'A2':
        warnings.push(
          `Substância entorpecente (Lista ${schedule}): Requer Notificação de Receita A (amarela). ` +
          'Quantidade máxima para 30 dias de tratamento.',
        );
        break;

      case 'B1':
        warnings.push(
          'Substância psicotrópica (Lista B1): Requer Notificação de Receita B (azul). ' +
          'Quantidade máxima para 60 dias de tratamento.',
        );
        break;

      case 'B2':
        warnings.push(
          'Substância anorexígena (Lista B2): Requer Notificação de Receita B. ' +
          'Quantidade máxima para 30 dias de tratamento.',
        );
        break;

      case 'C1':
        warnings.push(
          'Substância controlada (Lista C1): Requer Receita Branca Especial em 2 vias com retenção.',
        );
        break;

      case 'C2':
        warnings.push(
          'Retinóide de uso sistêmico (Lista C2): Requer Receita Branca Especial + Termo de Consentimento.',
        );
        if (input.patientGender === 'F') {
          const isFertileAge = input.patientAge !== undefined &&
            input.patientAge >= 12 && input.patientAge <= 55;
          if (isFertileAge) {
            errors.push(
              'Retinóide (Lista C2): Paciente do sexo feminino em idade fértil. ' +
              'Obrigatório apresentar teste de gravidez negativo (beta-HCG) antes do início e mensalmente.',
            );
          }
          warnings.push(
            'Retinóide (Lista C2): Para pacientes do sexo feminino, é necessário reconhecimento de ' +
            'teste de gravidez negativo.',
          );
        }
        break;

      case 'C5':
        warnings.push(
          'Anabolizante (Lista C5): Requer Receita Branca Especial. ' +
          'Quantidade máxima para 60 dias de tratamento.',
        );
        break;

      default:
        if (schedule === 'C3' || schedule === 'C4') {
          warnings.push(
            `Substância controlada (Lista ${schedule}): Requer Receita Branca Especial em 2 vias.`,
          );
        }
        break;
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      requiredRecipeType,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RDC 471/2021 — Antimicrobial Validation
  // ──────────────────────────────────────────────────────────────────────────

  validateAntimicrobial(input: AntimicrobialInput): AntimicrobialResult {
    const warnings: string[] = [];
    let requiresCulture = false;

    if (!input.isAntimicrobial) {
      return { valid: true, warnings: [], requiresCulture: false };
    }

    const DEFAULT_MAX_DURATION = 14;

    // Duration check
    if (input.durationDays && input.durationDays > DEFAULT_MAX_DURATION) {
      warnings.push(
        `RDC 471/2021: Duração do antimicrobiano excede ${DEFAULT_MAX_DURATION} dias ` +
        `(prescrito: ${input.durationDays} dias). Necessária justificativa clínica para extensão.`,
      );
    }

    if (!input.durationDays) {
      warnings.push(
        'RDC 471/2021: Recomenda-se especificar a duração do tratamento antimicrobiano.',
      );
    }

    // Culture recommendation
    requiresCulture = true;
    warnings.push(
      'RDC 471/2021: Recomenda-se solicitar cultura e antibiograma antes ou junto ao início do antimicrobiano.',
    );

    // Indication/diagnosis required
    if (!input.indication) {
      warnings.push(
        'RDC 471/2021: É obrigatório informar a indicação/diagnóstico para prescrição de antimicrobianos.',
      );
    }

    // Dose validation reminder
    if (!input.dose) {
      warnings.push(
        'RDC 471/2021: Verifique se a dose está dentro da faixa terapêutica recomendada.',
      );
    }

    return {
      valid: true,
      warnings,
      requiresCulture,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Automatic Scheduling (Aprazamento)
  // ──────────────────────────────────────────────────────────────────────────

  generateSchedule(input: ScheduleInput): ScheduleResult {
    const intervalHours = this.parseFrequencyToHours(input.frequency);

    if (intervalHours <= 0 || intervalHours > 24) {
      throw new BadRequestException(
        `Frequência inválida: "${input.frequency}". Use formatos como "8/8h", "12/12h", "6/6h", "1x/dia", "2x/dia", "3x/dia", "4x/dia".`,
      );
    }

    const [startH, startM] = input.startTime.split(':').map(Number);
    if (
      isNaN(startH) || isNaN(startM) ||
      startH < 0 || startH > 23 ||
      startM < 0 || startM > 59
    ) {
      throw new BadRequestException(
        `Horário inicial inválido: "${input.startTime}". Use o formato HH:mm.`,
      );
    }

    const now = new Date();
    const baseDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startH,
      startM,
      0,
      0,
    );

    const times: Date[] = [];
    const totalMinutesIn24h = 24 * 60;
    const intervalMinutes = intervalHours * 60;
    let elapsedMinutes = 0;

    while (elapsedMinutes < totalMinutesIn24h) {
      const time = new Date(baseDate.getTime() + elapsedMinutes * 60 * 1000);
      times.push(time);
      elapsedMinutes += intervalMinutes;
    }

    return { times, intervalHours };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Double-Check for High-Alert Medications
  // ──────────────────────────────────────────────────────────────────────────

  requiresDoubleCheck(input: DoubleCheckInput): DoubleCheckResult {
    const nameToCheck = `${input.medicationName} ${input.concentration ?? ''}`.trim();

    for (const entry of HIGH_ALERT_PATTERNS) {
      if (!entry.pattern.test(nameToCheck)) {
        continue;
      }

      // If route restriction exists, only match when route matches
      if (entry.routeRestriction && input.route && input.route !== entry.routeRestriction) {
        continue;
      }

      // Special case: NaCl only if > 0.9%
      if (/nacl|cloreto\s+de\s+s[oó]dio/i.test(nameToCheck)) {
        const concMatch = (input.concentration ?? '').match(/([\d,.]+)\s*%/);
        if (concMatch) {
          const pct = parseFloat(concMatch[1].replace(',', '.'));
          if (pct <= 0.9) {
            continue;
          }
        } else {
          // No concentration specified — warn anyway
        }
      }

      return {
        requiresDoubleCheck: true,
        reason: entry.reason,
        alertLevel: entry.alertLevel,
      };
    }

    return {
      requiresDoubleCheck: false,
      reason: '',
      alertLevel: 'HIGH',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Combined Safety Validation
  // ──────────────────────────────────────────────────────────────────────────

  validateSafety(input: {
    medicationName: string;
    activeIngredient?: string;
    concentration?: string;
    route?: MedicationRoute;
    frequency?: string;
    durationDays?: number;
    isControlled?: boolean;
    controlType?: ControlledSchedule;
    isAntimicrobial?: boolean;
    patientGender?: string;
    patientAge?: number;
  }): SafetyValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // 1) Controlled substance
    const controlledResult = this.validateControlledSubstance({
      medicationName: input.medicationName,
      activeIngredient: input.activeIngredient,
      isControlled: input.isControlled,
      controlType: input.controlType,
      durationDays: input.durationDays,
      patientGender: input.patientGender,
      patientAge: input.patientAge,
    });

    allErrors.push(...controlledResult.errors);
    allWarnings.push(...controlledResult.warnings);

    // 2) Antimicrobial
    const antimicrobialResult = this.validateAntimicrobial({
      medicationName: input.medicationName,
      activeIngredient: input.activeIngredient,
      isAntimicrobial: input.isAntimicrobial,
      durationDays: input.durationDays,
      frequency: input.frequency,
    });

    allWarnings.push(...antimicrobialResult.warnings);

    // 3) Double-check
    const doubleCheckResult = this.requiresDoubleCheck({
      medicationName: input.medicationName,
      route: input.route,
      concentration: input.concentration,
    });

    if (doubleCheckResult.requiresDoubleCheck) {
      allWarnings.push(
        `Medicamento de alto alerta: ${doubleCheckResult.reason}. Dupla checagem obrigatória.`,
      );
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      controlledSubstance: input.isControlled ? controlledResult : null,
      antimicrobial: input.isAntimicrobial ? antimicrobialResult : null,
      doubleCheck: doubleCheckResult.requiresDoubleCheck ? doubleCheckResult : null,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // First-Check (Checagem Simples — Enfermeiro)
  // ──────────────────────────────────────────────────────────────────────────

  async firstCheck(prescriptionId: string, nurseId: string, nurseRole: string): Promise<unknown> {
    if (nurseRole !== 'NURSE' && nurseRole !== 'NURSE_TECH' && nurseRole !== 'PHARMACIST') {
      throw new ForbiddenException(
        'Apenas enfermeiros, técnicos de enfermagem ou farmacêuticos podem realizar a primeira checagem.',
      );
    }

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescrição com ID "${prescriptionId}" não encontrada.`);
    }

    if (prescription.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Apenas prescrições com status ACTIVE podem ser checadas.',
      );
    }

    // Create FIRST_CHECK medication check entries for all items
    const now = new Date();
    const checks = await this.prisma.$transaction(
      prescription.items.map((item) =>
        this.prisma.medicationCheck.create({
          data: {
            prescriptionItemId: item.id,
            nurseId,
            scheduledAt: now,
            checkedAt: now,
            status: MedCheckStatus.FIRST_CHECK,
            observations: 'Primeira checagem realizada',
          },
        }),
      ),
    );

    return {
      prescriptionId,
      checkedBy: nurseId,
      checkedAt: now,
      status: 'FIRST_CHECK',
      itemsChecked: checks.length,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Double-Check (Dupla Checagem — Segundo Enfermeiro/Farmacêutico)
  // ──────────────────────────────────────────────────────────────────────────

  async doubleCheck(prescriptionId: string, checkerId: string, checkerRole: string): Promise<unknown> {
    if (checkerRole !== 'NURSE' && checkerRole !== 'NURSE_TECH' && checkerRole !== 'PHARMACIST') {
      throw new ForbiddenException(
        'Apenas enfermeiros, técnicos de enfermagem ou farmacêuticos podem realizar a dupla checagem.',
      );
    }

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: {
          include: {
            medicationChecks: {
              where: { status: MedCheckStatus.FIRST_CHECK },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescrição com ID "${prescriptionId}" não encontrada.`);
    }

    if (prescription.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Apenas prescrições com status ACTIVE podem receber dupla checagem.',
      );
    }

    if (!prescription.requiresDoubleCheck) {
      throw new BadRequestException(
        'Esta prescrição não requer dupla checagem.',
      );
    }

    if (prescription.doubleCheckedAt) {
      throw new BadRequestException(
        'Esta prescrição já foi duplamente checada.',
      );
    }

    // Verify first check exists
    const hasFirstCheck = prescription.items.some(
      (item) => item.medicationChecks.length > 0,
    );

    if (!hasFirstCheck) {
      throw new BadRequestException(
        'A primeira checagem deve ser realizada antes da dupla checagem.',
      );
    }

    // Verify different person
    const firstCheckNurseId = prescription.items
      .flatMap((item) => item.medicationChecks)
      .find((check) => check.status === MedCheckStatus.FIRST_CHECK)?.nurseId;

    if (firstCheckNurseId === checkerId) {
      throw new BadRequestException(
        'A dupla checagem deve ser realizada por um profissional diferente da primeira checagem.',
      );
    }

    // Update prescription with double-check info
    const updated = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        doubleCheckedById: checkerId,
        doubleCheckedAt: new Date(),
      },
      include: {
        doubleCheckedBy: { select: { id: true, name: true } },
      },
    });

    return {
      prescriptionId,
      doubleCheckedBy: updated.doubleCheckedBy,
      doubleCheckedAt: updated.doubleCheckedAt,
      status: 'DOUBLE_CHECKED',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private parseFrequencyToHours(frequency: string): number {
    const trimmed = frequency.trim().toLowerCase();

    // Pattern: "8/8h", "12/12h", "6/6h", "4/4h"
    const intervalMatch = trimmed.match(/^(\d+)\/\d+\s*h$/);
    if (intervalMatch) {
      return parseInt(intervalMatch[1], 10);
    }

    // Pattern: "1x/dia" → 24h, "2x/dia" → 12h, "3x/dia" → 8h, "4x/dia" → 6h
    const timesPerDayMatch = trimmed.match(/^(\d+)\s*x\s*\/?\s*dia$/);
    if (timesPerDayMatch) {
      const timesPerDay = parseInt(timesPerDayMatch[1], 10);
      if (timesPerDay > 0) {
        return 24 / timesPerDay;
      }
    }

    // Pattern: "de 8 em 8 horas"
    const deEmMatch = trimmed.match(/^de\s+(\d+)\s+em\s+\d+\s+hora/);
    if (deEmMatch) {
      return parseInt(deEmMatch[1], 10);
    }

    // Pattern: "a cada 8h", "a cada 12 horas"
    const aCadaMatch = trimmed.match(/^a\s+cada\s+(\d+)\s*h/);
    if (aCadaMatch) {
      return parseInt(aCadaMatch[1], 10);
    }

    return 0;
  }
}
