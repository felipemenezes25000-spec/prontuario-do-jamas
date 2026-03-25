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

  // ─── Pregnancy Medication Alerts (FDA Category) ────────────────────────────

  checkPregnancyRisk(input: {
    medicationName: string;
    activeIngredient?: string;
    patientGender?: string;
    patientAge?: number;
    isPregnant?: boolean;
  }): { alerts: string[]; fdaCategory: string; contraindicated: boolean } {
    const alerts: string[] = [];
    const name = (input.medicationName + ' ' + (input.activeIngredient ?? '')).toLowerCase();

    // FDA Category X drugs (contraindicated in pregnancy)
    const categoryX: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /\b(metotrexato|methotrexate)\b/i, name: 'Metotrexato' },
      { pattern: /\b(isotretino[ií]na|isotretinoin)\b/i, name: 'Isotretinoina' },
      { pattern: /\b(varfarina|warfarin)\b/i, name: 'Varfarina' },
      { pattern: /\b(misoprostol)\b/i, name: 'Misoprostol' },
      { pattern: /\b(atorvastatina|sinvastatina|rosuvastatina|statin)\b/i, name: 'Estatinas' },
      { pattern: /\b(enalapril|captopril|losartana|valsartana|ramipril)\b/i, name: 'IECA/BRA' },
      { pattern: /\b(talidomida|thalidomide)\b/i, name: 'Talidomida' },
      { pattern: /\b(finasterida|dutasterida)\b/i, name: 'Finasterida/Dutasterida' },
    ];

    // FDA Category D drugs (evidence of risk)
    const categoryD: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /\b([aá]cido valpr[oó]ico|valproato|divalproex)\b/i, name: 'Valproato' },
      { pattern: /\b(fenitoina|phenytoin)\b/i, name: 'Fenitoina' },
      { pattern: /\b(carbamazepina)\b/i, name: 'Carbamazepina' },
      { pattern: /\b(l[ií]tio|lithium)\b/i, name: 'Lítio' },
      { pattern: /\b(tetraciclina|doxiciclina)\b/i, name: 'Tetraciclinas' },
      { pattern: /\b(gentamicina|amicacina|tobramicina)\b/i, name: 'Aminoglicosídeos' },
    ];

    let fdaCategory = 'B'; // default safe
    let contraindicated = false;

    for (const drug of categoryX) {
      if (drug.pattern.test(name)) {
        fdaCategory = 'X';
        contraindicated = true;
        if (input.isPregnant) {
          alerts.push(`CONTRAINDICADO NA GRAVIDEZ: ${drug.name} (FDA Cat. X). Substituição obrigatória.`);
        }
        if (input.patientGender === 'F' && input.patientAge && input.patientAge >= 12 && input.patientAge <= 50) {
          alerts.push(`${drug.name} (FDA Cat. X): Paciente feminina em idade fértil. Verificar gravidez antes de prescrever.`);
        }
        break;
      }
    }

    if (fdaCategory !== 'X') {
      for (const drug of categoryD) {
        if (drug.pattern.test(name)) {
          fdaCategory = 'D';
          if (input.isPregnant) {
            alerts.push(`RISCO NA GRAVIDEZ: ${drug.name} (FDA Cat. D). Usar apenas se benefício superar risco. Documentar justificativa.`);
          }
          if (input.patientGender === 'F' && input.patientAge && input.patientAge >= 12 && input.patientAge <= 50) {
            alerts.push(`${drug.name} (FDA Cat. D): Paciente feminina em idade fértil. Orientar contracepção.`);
          }
          break;
        }
      }
    }

    return { alerts, fdaCategory, contraindicated };
  }

  // ─── Lactation Alerts ─────────────────────────────────────────────────────

  checkLactationRisk(input: { medicationName: string; activeIngredient?: string }): {
    alerts: string[];
    riskLevel: string;
  } {
    const name = (input.medicationName + ' ' + (input.activeIngredient ?? '')).toLowerCase();
    const alerts: string[] = [];

    const contraindicated: Array<{ pattern: RegExp; name: string; reason: string }> = [
      { pattern: /\b(metotrexato)\b/i, name: 'Metotrexato', reason: 'Citotóxico — presente no leite' },
      { pattern: /\b(ciclofosfamida)\b/i, name: 'Ciclofosfamida', reason: 'Citotóxico — presente no leite' },
      { pattern: /\b(amiodarona)\b/i, name: 'Amiodarona', reason: 'Meia-vida longa, acúmulo de iodo' },
      { pattern: /\b(l[ií]tio)\b/i, name: 'Lítio', reason: 'Toxicidade neonatal' },
      { pattern: /\b(ergotamina)\b/i, name: 'Ergotamina', reason: 'Vasospasmo e convulsões neonatais' },
    ];

    for (const drug of contraindicated) {
      if (drug.pattern.test(name)) {
        alerts.push(`CONTRAINDICADO NA LACTAÇÃO: ${drug.name} — ${drug.reason}`);
        return { alerts, riskLevel: 'CONTRAINDICATED' };
      }
    }

    const caution: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /\b(benzodiazep[ií]nico|diazepam|alprazolam|clonazepam)\b/i, name: 'Benzodiazepínicos' },
      { pattern: /\b(code[ií]na|tramadol)\b/i, name: 'Opioides fracos' },
      { pattern: /\b(fluconazol)\b/i, name: 'Fluconazol' },
    ];

    for (const drug of caution) {
      if (drug.pattern.test(name)) {
        alerts.push(`CAUTELA NA LACTAÇÃO: ${drug.name} — monitorar lactente para sedação/efeitos adversos`);
        return { alerts, riskLevel: 'CAUTION' };
      }
    }

    return { alerts: [], riskLevel: 'SAFE' };
  }

  // ─── Renal Dose Adjustment (Cockcroft-Gault/CKD-EPI) ─────────────────────

  checkRenalDoseAdjustment(input: {
    medicationName: string;
    dose?: string;
    patientAge?: number;
    patientWeight?: number;
    patientGender?: string;
    serumCreatinine?: number;
  }): { alerts: string[]; creatinineClearance?: number; adjustmentNeeded: boolean } {
    const alerts: string[] = [];

    if (!input.serumCreatinine || !input.patientAge || !input.patientWeight) {
      return { alerts: ['Dados insuficientes para cálculo da função renal (peso, idade, creatinina)'], adjustmentNeeded: false };
    }

    // Cockcroft-Gault
    const isFemale = input.patientGender === 'F';
    let crcl = ((140 - input.patientAge) * input.patientWeight) / (72 * input.serumCreatinine);
    if (isFemale) crcl *= 0.85;
    crcl = Math.round(crcl * 10) / 10;

    const renalDrugs: Array<{ pattern: RegExp; name: string; adjustments: Record<string, string> }> = [
      {
        pattern: /\b(metformina)\b/i,
        name: 'Metformina',
        adjustments: { '30': 'CONTRAINDICADA', '45': 'Reduzir para 500mg 2x/dia', '60': 'Dose usual' },
      },
      {
        pattern: /\b(enoxaparina)\b/i,
        name: 'Enoxaparina',
        adjustments: { '30': 'Reduzir dose pela metade (1x/dia)', '60': 'Dose usual' },
      },
      {
        pattern: /\b(vancomicina)\b/i,
        name: 'Vancomicina',
        adjustments: { '30': 'Espaçar intervalos, monitorar nível sérico', '50': 'Ajustar intervalo', '80': 'Dose usual' },
      },
      {
        pattern: /\b(levofloxacino|ciprofloxacino)\b/i,
        name: 'Fluoroquinolonas',
        adjustments: { '30': 'Reduzir dose 50%', '50': 'Ajustar intervalo', '80': 'Dose usual' },
      },
      {
        pattern: /\b(gabapentina|pregabalina)\b/i,
        name: 'Gabapentina/Pregabalina',
        adjustments: { '15': 'Dose máxima muito reduzida', '30': 'Reduzir 50%', '60': 'Reduzir 25%', '80': 'Dose usual' },
      },
    ];

    const name = (input.medicationName + ' ' + (input.dose ?? '')).toLowerCase();
    let adjustmentNeeded = false;

    for (const drug of renalDrugs) {
      if (drug.pattern.test(name)) {
        const thresholds = Object.keys(drug.adjustments).map(Number).sort((a, b) => a - b);
        for (const threshold of thresholds) {
          if (crcl < threshold) {
            alerts.push(`${drug.name}: CrCl ${crcl} mL/min — ${drug.adjustments[threshold.toString()]}`);
            adjustmentNeeded = true;
            break;
          }
        }
        if (!adjustmentNeeded) {
          alerts.push(`${drug.name}: CrCl ${crcl} mL/min — Dose usual permitida`);
        }
        break;
      }
    }

    if (crcl < 30) {
      alerts.push(`CrCl ${crcl} mL/min: Insuficiência renal severa. Revisar todas as doses de medicamentos eliminados via renal.`);
      adjustmentNeeded = true;
    }

    return { alerts, creatinineClearance: crcl, adjustmentNeeded };
  }

  // ─── Hepatic Dose Adjustment (Child-Pugh) ─────────────────────────────────

  checkHepaticDoseAdjustment(input: {
    medicationName: string;
    childPughClass?: 'A' | 'B' | 'C';
  }): { alerts: string[]; adjustmentNeeded: boolean } {
    const alerts: string[] = [];
    if (!input.childPughClass) return { alerts: [], adjustmentNeeded: false };

    const hepatotoxicDrugs: Array<{ pattern: RegExp; name: string; classB: string; classC: string }> = [
      { pattern: /\b(paracetamol|acetaminofeno)\b/i, name: 'Paracetamol', classB: 'Máximo 2g/dia', classC: 'Evitar ou máximo 1g/dia' },
      { pattern: /\b(metotrexato)\b/i, name: 'Metotrexato', classB: 'Reduzir dose', classC: 'CONTRAINDICADO' },
      { pattern: /\b(rifampicina)\b/i, name: 'Rifampicina', classB: 'Monitorar função hepática', classC: 'Evitar' },
      { pattern: /\b(isoniazida)\b/i, name: 'Isoniazida', classB: 'Monitorar TGO/TGP semanal', classC: 'Evitar' },
      { pattern: /\b(amiodarona)\b/i, name: 'Amiodarona', classB: 'Dose reduzida com monitoramento', classC: 'Evitar' },
    ];

    const name = input.medicationName.toLowerCase();
    let adjustmentNeeded = false;

    for (const drug of hepatotoxicDrugs) {
      if (drug.pattern.test(name)) {
        if (input.childPughClass === 'B') {
          alerts.push(`${drug.name}: Child-Pugh B — ${drug.classB}`);
          adjustmentNeeded = true;
        } else if (input.childPughClass === 'C') {
          alerts.push(`${drug.name}: Child-Pugh C — ${drug.classC}`);
          adjustmentNeeded = true;
        }
        break;
      }
    }

    return { alerts, adjustmentNeeded };
  }

  // ─── Food-Drug Interaction Alerts ─────────────────────────────────────────

  checkFoodDrugInteractions(input: { medicationName: string }): {
    interactions: Array<{ food: string; effect: string; recommendation: string }>;
  } {
    const name = input.medicationName.toLowerCase();
    const interactions: Array<{ food: string; effect: string; recommendation: string }> = [];

    const foodDrugDb: Array<{ pattern: RegExp; interactions: Array<{ food: string; effect: string; recommendation: string }> }> = [
      {
        pattern: /\b(varfarina|warfarin)\b/i,
        interactions: [
          { food: 'Alimentos ricos em Vitamina K (brócolis, espinafre, couve)', effect: 'Redução do efeito anticoagulante', recommendation: 'Manter dieta constante. Não alterar consumo de vegetais verdes abruptamente.' },
          { food: 'Cranberry/mirtilo em grande quantidade', effect: 'Potencialização do efeito anticoagulante', recommendation: 'Evitar consumo excessivo. Monitorar INR.' },
        ],
      },
      {
        pattern: /\b(ciprofloxacin[oa]?|levofloxacin[oa]?)\b/i,
        interactions: [
          { food: 'Laticínios (leite, queijo, iogurte)', effect: 'Redução da absorção em até 40%', recommendation: 'Tomar 2h antes ou 6h após laticínios.' },
          { food: 'Suplementos de cálcio, ferro, zinco', effect: 'Quelação — redução da absorção', recommendation: 'Separar administração por pelo menos 2 horas.' },
        ],
      },
      {
        pattern: /\b(imaob|tranilcipromina|fenelzina|selegilina)\b/i,
        interactions: [
          { food: 'Alimentos ricos em tiramina (queijos curados, embutidos, vinho)', effect: 'Crise hipertensiva potencialmente fatal', recommendation: 'Dieta restrita em tiramina OBRIGATÓRIA durante tratamento.' },
        ],
      },
      {
        pattern: /\b(levotiroxina)\b/i,
        interactions: [
          { food: 'Café, soja, fibras, cálcio', effect: 'Redução da absorção', recommendation: 'Tomar em jejum, 30-60 min antes do café da manhã.' },
        ],
      },
      {
        pattern: /\b(sinvastatina|atorvastatina|lovastatina)\b/i,
        interactions: [
          { food: 'Suco de grapefruit/toranja', effect: 'Aumento dos níveis séricos (inibição CYP3A4)', recommendation: 'Evitar grapefruit durante tratamento.' },
        ],
      },
    ];

    for (const entry of foodDrugDb) {
      if (entry.pattern.test(name)) {
        interactions.push(...entry.interactions);
      }
    }

    return { interactions };
  }

  // ─── Generic/Brand Equivalence ─────────────────────────────────────────────

  getGenericEquivalence(medicationName: string): {
    brand: string;
    generic: string;
    alternatives: Array<{ name: string; type: string; estimatedPrice: number }>;
  } {
    const equivalenceDb: Record<string, { generic: string; alternatives: Array<{ name: string; type: string; estimatedPrice: number }> }> = {
      'losartana': { generic: 'Losartana Potássica', alternatives: [{ name: 'Cozaar', type: 'Referência', estimatedPrice: 85 }, { name: 'Losartana Genérico', type: 'Genérico', estimatedPrice: 15 }, { name: 'Losartan Similar', type: 'Similar', estimatedPrice: 22 }] },
      'omeprazol': { generic: 'Omeprazol', alternatives: [{ name: 'Losec/Prilosec', type: 'Referência', estimatedPrice: 120 }, { name: 'Omeprazol Genérico', type: 'Genérico', estimatedPrice: 12 }] },
      'amoxicilina': { generic: 'Amoxicilina', alternatives: [{ name: 'Amoxil', type: 'Referência', estimatedPrice: 45 }, { name: 'Amoxicilina Genérico', type: 'Genérico', estimatedPrice: 18 }] },
      'atorvastatina': { generic: 'Atorvastatina Cálcica', alternatives: [{ name: 'Lipitor', type: 'Referência', estimatedPrice: 150 }, { name: 'Atorvastatina Genérico', type: 'Genérico', estimatedPrice: 25 }] },
      'metformina': { generic: 'Cloridrato de Metformina', alternatives: [{ name: 'Glifage', type: 'Referência', estimatedPrice: 55 }, { name: 'Metformina Genérico', type: 'Genérico', estimatedPrice: 10 }] },
    };

    const key = medicationName.toLowerCase().trim();
    const match = Object.entries(equivalenceDb).find(([k]) => key.includes(k));

    if (match) {
      return { brand: medicationName, generic: match[1].generic, alternatives: match[1].alternatives };
    }

    return { brand: medicationName, generic: medicationName, alternatives: [] };
  }

  // ─── PCA Prescription ─────────────────────────────────────────────────────

  validatePCA(input: {
    medication: string;
    demandDose: number;
    demandDoseUnit: string;
    lockoutMinutes: number;
    maxHourlyDose: number;
    basalRate?: number;
    concentration: string;
  }): { valid: boolean; alerts: string[]; summary: string } {
    const alerts: string[] = [];

    if (input.lockoutMinutes < 5) {
      alerts.push('Intervalo de bloqueio muito curto (< 5 min). Risco de sobredose.');
    }
    if (input.lockoutMinutes > 30) {
      alerts.push('Intervalo de bloqueio longo (> 30 min). Pode resultar em analgesia insuficiente.');
    }

    const maxDosesPerHour = 60 / input.lockoutMinutes;
    const maxHourlyFromDemand = maxDosesPerHour * input.demandDose;
    const totalMaxHourly = maxHourlyFromDemand + (input.basalRate ?? 0);

    if (totalMaxHourly > input.maxHourlyDose) {
      alerts.push(`Dose máxima horária calculada (${totalMaxHourly.toFixed(1)} ${input.demandDoseUnit}) excede o limite configurado (${input.maxHourlyDose} ${input.demandDoseUnit}).`);
    }

    if (input.basalRate && input.basalRate > 0) {
      alerts.push('PCA com taxa basal: monitorização contínua de SpO2 e FR obrigatória. Risco aumentado de depressão respiratória.');
    }

    return {
      valid: alerts.filter((a) => a.includes('sobredose') || a.includes('excede')).length === 0,
      alerts,
      summary: `PCA ${input.medication}: Demanda ${input.demandDose}${input.demandDoseUnit} a cada ${input.lockoutMinutes}min. Max ${input.maxHourlyDose}${input.demandDoseUnit}/h. ${input.basalRate ? `Basal: ${input.basalRate}${input.demandDoseUnit}/h.` : 'Sem infusão basal.'}`,
    };
  }

  // ─── AI: Pharmacogenomics ─────────────────────────────────────────────────

  getPharmacogenomicRecommendation(input: {
    medicationName: string;
    cyp2d6Status?: 'POOR' | 'INTERMEDIATE' | 'NORMAL' | 'ULTRARAPID';
    cyp2c19Status?: 'POOR' | 'INTERMEDIATE' | 'NORMAL' | 'ULTRARAPID';
  }): { alerts: string[]; doseAdjustment: string; metabolizerInfo: string } {
    const alerts: string[] = [];
    const name = input.medicationName.toLowerCase();

    // CYP2D6-dependent drugs
    const cyp2d6Drugs = ['code[ií]na', 'tramadol', 'tamoxifeno', 'amitriptilina', 'nortriptilina', 'metoprolol', 'carvedilol'];
    const isCYP2D6 = cyp2d6Drugs.some((d) => new RegExp(d, 'i').test(name));

    // CYP2C19-dependent drugs
    const cyp2c19Drugs = ['clopidogrel', 'omeprazol', 'esomeprazol', 'lansoprazol', 'voriconazol', 'escitalopram', 'sertralina'];
    const isCYP2C19 = cyp2c19Drugs.some((d) => name.includes(d));

    let doseAdjustment = 'Dose padrão';
    let metabolizerInfo = '';

    if (isCYP2D6 && input.cyp2d6Status) {
      metabolizerInfo = `CYP2D6: ${input.cyp2d6Status}`;
      switch (input.cyp2d6Status) {
        case 'POOR':
          doseAdjustment = 'Reduzir dose em 50% ou considerar alternativa';
          alerts.push(`Metabolizador lento CYP2D6: ${input.medicationName} terá níveis elevados. Risco de toxicidade.`);
          break;
        case 'ULTRARAPID':
          doseAdjustment = 'Aumentar dose ou considerar alternativa';
          alerts.push(`Metabolizador ultrarrápido CYP2D6: ${input.medicationName} pode ter eficácia reduzida.`);
          if (/code[ií]na/i.test(name)) {
            alerts.push('ALERTA: Codeína em metabolizador ultrarrápido CYP2D6 — risco de toxicidade por excesso de morfina.');
            doseAdjustment = 'CONTRAINDICADO — usar alternativa analgésica';
          }
          break;
        case 'INTERMEDIATE':
          doseAdjustment = 'Considerar redução de 25%';
          break;
      }
    }

    if (isCYP2C19 && input.cyp2c19Status) {
      metabolizerInfo = `CYP2C19: ${input.cyp2c19Status}`;
      switch (input.cyp2c19Status) {
        case 'POOR':
          if (name.includes('clopidogrel')) {
            alerts.push('Metabolizador lento CYP2C19: Clopidogrel terá ativação reduzida. Considerar prasugrel ou ticagrelor.');
            doseAdjustment = 'Substituir por prasugrel ou ticagrelor';
          } else {
            doseAdjustment = 'Reduzir dose em 50%';
          }
          break;
        case 'ULTRARAPID':
          doseAdjustment = 'Considerar aumento de dose';
          break;
      }
    }

    return { alerts, doseAdjustment, metabolizerInfo };
  }

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
