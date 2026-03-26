import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecordInvasiveMonitoringDto,
  RecordVentilationDto,
  HemodynamicReadingsDto,
} from './dto/icu-monitoring.dto';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface HemodynamicAlert {
  parameter: string;
  value: number;
  threshold: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

export interface VentilationAlert {
  parameter: string;
  value: number;
  threshold: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

export interface ArdsClassification {
  classification: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
  pfRatio: number;
  description: string;
}

interface WeaningCriterion {
  criterion: string;
  met: boolean;
  value: string;
  target: string;
}

export interface WeaningReadiness {
  patientId: string;
  ready: boolean;
  criteria: WeaningCriterion[];
  rsbi: number | null;
  recommendation: string;
  assessedAt: string;
}

export interface HemodynamicInterpretation {
  parameter: string;
  value: number;
  unit: string;
  normalRange: string;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class IcuMonitoringService {
  private readonly logger = new Logger(IcuMonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // HEMODYNAMIC MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  async recordInvasiveMonitoring(
    tenantId: string,
    authorId: string,
    dto: RecordInvasiveMonitoringDto,
  ) {
    const readings = { ...dto.readings };
    const alerts: HemodynamicAlert[] = [];

    // Auto-calculate CPP if MAP and ICP are provided
    if (
      readings.mapInvasive !== undefined &&
      readings.icp !== undefined &&
      readings.cpp === undefined
    ) {
      readings.cpp = readings.mapInvasive - readings.icp;
    }

    // Generate clinical alerts
    this.generateHemodynamicAlerts(readings, alerts);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:HEMODYNAMIC] Invasive Monitoring - ${dto.monitoringType}`,
        content: JSON.stringify({
          category: 'ICU_HEMODYNAMIC',
          monitoringType: dto.monitoringType,
          readings,
          alerts,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      monitoringType: dto.monitoringType,
      readings,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  async getHemodynamicHistory(tenantId: string, patientId: string) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:HEMODYNAMIC]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const records = documents.map((doc) => {
      const content = JSON.parse(doc.content as string) as {
        monitoringType: string;
        readings: HemodynamicReadingsDto;
        alerts: HemodynamicAlert[];
        recordedAt: string;
      };
      return {
        id: doc.id,
        monitoringType: content.monitoringType,
        readings: content.readings,
        alerts: content.alerts,
        recordedAt: content.recordedAt,
        createdAt: doc.createdAt,
      };
    });

    // Build trend data: group by parameter over time
    const trends: Record<string, Array<{ time: string; value: number }>> = {};
    const trendKeys = [
      'mapInvasive',
      'cvp',
      'icp',
      'cpp',
      'pawp',
      'cardiacOutput',
      'cardiacIndex',
      'svr',
      'svo2',
    ] as const;

    for (const record of [...records].reverse()) {
      for (const key of trendKeys) {
        const value = record.readings[key];
        if (value !== undefined) {
          if (!trends[key]) trends[key] = [];
          trends[key].push({ time: record.recordedAt, value });
        }
      }
    }

    return { records, trends };
  }

  async getHemodynamicSummary(tenantId: string, patientId: string) {
    const latestDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:HEMODYNAMIC]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestDoc) {
      return { hasData: false, latest: null, interpretations: [], alerts: [] };
    }

    const content = JSON.parse(latestDoc.content as string) as {
      monitoringType: string;
      readings: HemodynamicReadingsDto;
      alerts: HemodynamicAlert[];
      recordedAt: string;
    };

    const interpretations = this.interpretHemodynamics(content.readings);

    return {
      hasData: true,
      latest: {
        id: latestDoc.id,
        monitoringType: content.monitoringType,
        readings: content.readings,
        recordedAt: content.recordedAt,
      },
      interpretations,
      alerts: content.alerts,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VENTILATION
  // ═══════════════════════════════════════════════════════════════════════════

  async recordVentilation(
    tenantId: string,
    authorId: string,
    dto: RecordVentilationDto,
  ) {
    const measurements = { ...dto.measurements };
    const alerts: VentilationAlert[] = [];

    // Auto-calculate driving pressure: Plateau - PEEP
    if (
      measurements.plateauPressure !== undefined &&
      measurements.drivingPressure === undefined
    ) {
      measurements.drivingPressure =
        measurements.plateauPressure - dto.settings.peep;
    }

    // Auto-calculate compliance: Vt / (Plateau - PEEP)
    if (
      measurements.tidalVolumeExpired !== undefined &&
      measurements.plateauPressure !== undefined &&
      measurements.compliance === undefined
    ) {
      const denominator = measurements.plateauPressure - dto.settings.peep;
      if (denominator > 0) {
        measurements.compliance = Math.round(
          measurements.tidalVolumeExpired / denominator,
        );
      }
    }

    // Auto-calculate P/F ratio if PaO2 and FiO2 are available
    if (
      dto.bloodGas?.pao2 !== undefined &&
      measurements.pfRatio === undefined
    ) {
      const fio2Fraction = dto.settings.fio2 / 100;
      if (fio2Fraction > 0) {
        measurements.pfRatio = Math.round(dto.bloodGas.pao2 / fio2Fraction);
      }
    }

    // ARDS classification
    const ardsClassification = this.classifyArds(measurements.pfRatio);

    // Generate ventilation alerts
    this.generateVentilationAlerts(dto, measurements, alerts);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:VENT] Mechanical Ventilation - ${dto.mode}`,
        content: JSON.stringify({
          category: 'ICU_VENTILATION',
          mode: dto.mode,
          settings: dto.settings,
          measurements,
          bloodGas: dto.bloodGas ?? null,
          ardsClassification,
          alerts,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      mode: dto.mode,
      settings: dto.settings,
      measurements,
      bloodGas: dto.bloodGas ?? null,
      ardsClassification,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  async getVentilationHistory(tenantId: string, patientId: string) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:VENT]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    interface VentilationContent {
      mode: string;
      settings: RecordVentilationDto['settings'];
      measurements: RecordVentilationDto['measurements'] & {
        drivingPressure?: number;
        compliance?: number;
        pfRatio?: number;
      };
      bloodGas: RecordVentilationDto['bloodGas'] | null;
      ardsClassification: ArdsClassification;
      alerts: VentilationAlert[];
      recordedAt: string;
    }

    const records = documents.map((doc) => {
      const content = JSON.parse(doc.content as string) as VentilationContent;
      return {
        id: doc.id,
        mode: content.mode,
        settings: content.settings,
        measurements: content.measurements,
        bloodGas: content.bloodGas,
        ardsClassification: content.ardsClassification,
        alerts: content.alerts,
        recordedAt: content.recordedAt,
        createdAt: doc.createdAt,
      };
    });

    // Build weaning trend data
    const weaningTrend = [...records].reverse().map((r) => ({
      time: r.recordedAt,
      fio2: r.settings.fio2,
      peep: r.settings.peep,
      pfRatio: r.measurements.pfRatio ?? null,
      drivingPressure: r.measurements.drivingPressure ?? null,
      compliance: r.measurements.compliance ?? null,
      mode: r.mode,
    }));

    return { records, weaningTrend };
  }

  async getVentilationSummary(tenantId: string, patientId: string) {
    const latestDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:VENT]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestDoc) {
      return {
        hasData: false,
        latest: null,
        ardsClassification: null,
        alerts: [],
      };
    }

    interface VentSummaryContent {
      mode: string;
      settings: RecordVentilationDto['settings'];
      measurements: RecordVentilationDto['measurements'] & {
        drivingPressure?: number;
        compliance?: number;
        pfRatio?: number;
      };
      bloodGas: RecordVentilationDto['bloodGas'] | null;
      ardsClassification: ArdsClassification;
      alerts: VentilationAlert[];
      recordedAt: string;
    }

    const content = JSON.parse(
      latestDoc.content as string,
    ) as VentSummaryContent;

    return {
      hasData: true,
      latest: {
        id: latestDoc.id,
        mode: content.mode,
        settings: content.settings,
        measurements: content.measurements,
        bloodGas: content.bloodGas,
        recordedAt: content.recordedAt,
      },
      ardsClassification: content.ardsClassification,
      alerts: content.alerts,
    };
  }

  async assessWeaningReadiness(
    tenantId: string,
    patientId: string,
  ): Promise<WeaningReadiness> {
    // Get latest ventilation record
    const latestVent = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:VENT]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest hemodynamic record
    const latestHemo = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:HEMODYNAMIC]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const criteria: WeaningCriterion[] = [];
    let rsbi: number | null = null;

    if (!latestVent) {
      return {
        patientId,
        ready: false,
        criteria: [],
        rsbi: null,
        recommendation: 'Sem dados de ventilacao mecanica registrados.',
        assessedAt: new Date().toISOString(),
      };
    }

    interface WeaningVentContent {
      mode: string;
      settings: { fio2: number; peep: number; respiratoryRate?: number };
      measurements: {
        tidalVolumeExpired?: number;
        pfRatio?: number;
        drivingPressure?: number;
        compliance?: number;
      };
      bloodGas: { pao2?: number; paco2?: number; ph?: number } | null;
      recordedAt: string;
    }

    const ventContent = JSON.parse(
      latestVent.content as string,
    ) as WeaningVentContent;

    // Criterion 1: PEEP <= 8
    const peep = ventContent.settings.peep;
    criteria.push({
      criterion: 'PEEP <= 8 cmH2O',
      met: peep <= 8,
      value: `${peep} cmH2O`,
      target: '<= 8 cmH2O',
    });

    // Criterion 2: FiO2 <= 40%
    const fio2 = ventContent.settings.fio2;
    criteria.push({
      criterion: 'FiO2 <= 40%',
      met: fio2 <= 40,
      value: `${fio2}%`,
      target: '<= 40%',
    });

    // Criterion 3: P/F > 200 (if available)
    const pfRatio = ventContent.measurements.pfRatio;
    if (pfRatio !== undefined) {
      criteria.push({
        criterion: 'P/F > 200',
        met: pfRatio > 200,
        value: `${pfRatio}`,
        target: '> 200',
      });
    }

    // Criterion 4: RSBI (RR/Vt in liters) < 105
    const rr = ventContent.settings.respiratoryRate;
    const vtExpired = ventContent.measurements.tidalVolumeExpired;
    if (rr !== undefined && vtExpired !== undefined && vtExpired > 0) {
      const vtLiters = vtExpired / 1000;
      rsbi = Math.round(rr / vtLiters);
      criteria.push({
        criterion: 'RSBI < 105 breaths/min/L',
        met: rsbi < 105,
        value: `${rsbi} breaths/min/L`,
        target: '< 105',
      });
    }

    // Criterion 5: Hemodynamic stability (no high-dose vasopressors)
    if (latestHemo) {
      const hemoContent = JSON.parse(latestHemo.content as string) as {
        readings: HemodynamicReadingsDto;
      };
      const map = hemoContent.readings.mapInvasive;
      const hemodynamicallyStable = map !== undefined && map >= 65;
      criteria.push({
        criterion: 'PAM >= 65 mmHg (estabilidade hemodinamica)',
        met: hemodynamicallyStable,
        value: map !== undefined ? `${map} mmHg` : 'N/A',
        target: '>= 65 mmHg',
      });
    }

    // Criterion 6: Adequate blood gas (if available)
    if (ventContent.bloodGas?.ph !== undefined) {
      const phOk =
        ventContent.bloodGas.ph >= 7.3 && ventContent.bloodGas.ph <= 7.5;
      criteria.push({
        criterion: 'pH 7.30-7.50',
        met: phOk,
        value: `${ventContent.bloodGas.ph}`,
        target: '7.30-7.50',
      });
    }

    const allMet = criteria.every((c) => c.met);
    const metCount = criteria.filter((c) => c.met).length;

    let recommendation: string;
    if (allMet) {
      recommendation =
        'Paciente atende todos os criterios de desmame. Considerar teste de respiracao espontanea (TRE) com PSV 5-7 cmH2O ou tubo-T por 30-120 min.';
    } else if (metCount >= criteria.length * 0.7) {
      recommendation =
        'Paciente atende a maioria dos criterios. Otimizar parametros nao atingidos e reavaliar em 6-12h.';
    } else {
      recommendation =
        'Paciente nao esta pronto para desmame. Manter suporte ventilatorio e reavaliar diariamente.';
    }

    return {
      patientId,
      ready: allMet,
      criteria,
      rsbi,
      recommendation,
      assessedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateHemodynamicAlerts(
    readings: HemodynamicReadingsDto,
    alerts: HemodynamicAlert[],
  ): void {
    // ICP alerts
    if (readings.icp !== undefined && readings.icp > 20) {
      alerts.push({
        parameter: 'ICP',
        value: readings.icp,
        threshold: '> 20 mmHg',
        severity: readings.icp > 25 ? 'CRITICAL' : 'WARNING',
        message: `Hipertensao intracraniana: PIC ${readings.icp} mmHg${readings.icp > 25 ? ' - CRITICO, risco de herniacao' : ''}`,
      });
    }

    // CPP alerts
    if (readings.cpp !== undefined && readings.cpp < 60) {
      alerts.push({
        parameter: 'CPP',
        value: readings.cpp,
        threshold: '< 60 mmHg',
        severity: readings.cpp < 50 ? 'CRITICAL' : 'WARNING',
        message: `Hipoperfusao cerebral: PPC ${readings.cpp} mmHg${readings.cpp < 50 ? ' - CRITICO, risco de isquemia cerebral' : ''}`,
      });
    }

    // CVP alerts
    if (readings.cvp !== undefined) {
      if (readings.cvp > 12) {
        alerts.push({
          parameter: 'CVP',
          value: readings.cvp,
          threshold: '> 12 cmH2O',
          severity: readings.cvp > 15 ? 'CRITICAL' : 'WARNING',
          message: `PVC elevada: ${readings.cvp} cmH2O - Considerar sobrecarga volumica ou disfuncao de VD`,
        });
      }
      if (readings.cvp < 2) {
        alerts.push({
          parameter: 'CVP',
          value: readings.cvp,
          threshold: '< 2 cmH2O',
          severity: 'WARNING',
          message: `PVC baixa: ${readings.cvp} cmH2O - Considerar hipovolemia`,
        });
      }
    }

    // Cardiac Output alerts
    if (readings.cardiacOutput !== undefined && readings.cardiacOutput < 4) {
      alerts.push({
        parameter: 'CO',
        value: readings.cardiacOutput,
        threshold: '< 4 L/min',
        severity: readings.cardiacOutput < 3 ? 'CRITICAL' : 'WARNING',
        message: `Debito cardiaco baixo: ${readings.cardiacOutput} L/min`,
      });
    }

    // Cardiac Index alerts
    if (readings.cardiacIndex !== undefined && readings.cardiacIndex < 2.5) {
      alerts.push({
        parameter: 'CI',
        value: readings.cardiacIndex,
        threshold: '< 2.5 L/min/m2',
        severity: readings.cardiacIndex < 2.0 ? 'CRITICAL' : 'WARNING',
        message: `Indice cardiaco baixo: ${readings.cardiacIndex} L/min/m2${readings.cardiacIndex < 2.0 ? ' - Choque cardiogenico' : ''}`,
      });
    }

    // SVR alerts
    if (readings.svr !== undefined) {
      if (readings.svr < 800) {
        alerts.push({
          parameter: 'SVR',
          value: readings.svr,
          threshold: '< 800 dyn.s/cm5',
          severity: readings.svr < 600 ? 'CRITICAL' : 'WARNING',
          message: `RVS baixa: ${readings.svr} dyn.s/cm5 - Vasodilatacao (choque distributivo?)`,
        });
      }
      if (readings.svr > 1200) {
        alerts.push({
          parameter: 'SVR',
          value: readings.svr,
          threshold: '> 1200 dyn.s/cm5',
          severity: 'WARNING',
          message: `RVS elevada: ${readings.svr} dyn.s/cm5 - Vasoconstricao`,
        });
      }
    }

    // SvO2 alerts
    if (readings.svo2 !== undefined) {
      if (readings.svo2 < 65) {
        alerts.push({
          parameter: 'SvO2',
          value: readings.svo2,
          threshold: '< 65%',
          severity: readings.svo2 < 55 ? 'CRITICAL' : 'WARNING',
          message: `SvO2 baixa: ${readings.svo2}% - Aumento de extracao de O2 / oferta inadequada`,
        });
      }
    }

    // MAP alerts
    if (readings.mapInvasive !== undefined) {
      if (readings.mapInvasive < 65) {
        alerts.push({
          parameter: 'MAP',
          value: readings.mapInvasive,
          threshold: '< 65 mmHg',
          severity: readings.mapInvasive < 55 ? 'CRITICAL' : 'WARNING',
          message: `Hipotensao: PAM ${readings.mapInvasive} mmHg`,
        });
      }
    }
  }

  private generateVentilationAlerts(
    dto: RecordVentilationDto,
    measurements: RecordVentilationDto['measurements'] & {
      drivingPressure?: number;
      pfRatio?: number;
    },
    alerts: VentilationAlert[],
  ): void {
    // Driving pressure > 15
    if (
      measurements.drivingPressure !== undefined &&
      measurements.drivingPressure > 15
    ) {
      alerts.push({
        parameter: 'Driving Pressure',
        value: measurements.drivingPressure,
        threshold: '> 15 cmH2O',
        severity: measurements.drivingPressure > 20 ? 'CRITICAL' : 'WARNING',
        message: `Driving pressure elevada: ${measurements.drivingPressure} cmH2O - Risco de VILI (ventilacao protetora: DP <= 15)`,
      });
    }

    // Plateau > 30
    if (
      measurements.plateauPressure !== undefined &&
      measurements.plateauPressure > 30
    ) {
      alerts.push({
        parameter: 'Plateau Pressure',
        value: measurements.plateauPressure,
        threshold: '> 30 cmH2O',
        severity: measurements.plateauPressure > 35 ? 'CRITICAL' : 'WARNING',
        message: `Pressao de plato elevada: ${measurements.plateauPressure} cmH2O - Risco de barotrauma`,
      });
    }

    // Peak pressure > 40
    if (
      measurements.peakPressure !== undefined &&
      measurements.peakPressure > 40
    ) {
      alerts.push({
        parameter: 'Peak Pressure',
        value: measurements.peakPressure,
        threshold: '> 40 cmH2O',
        severity: 'WARNING',
        message: `Pressao de pico elevada: ${measurements.peakPressure} cmH2O - Avaliar resistencia e compliance`,
      });
    }

    // High FiO2
    if (dto.settings.fio2 > 60) {
      alerts.push({
        parameter: 'FiO2',
        value: dto.settings.fio2,
        threshold: '> 60%',
        severity: dto.settings.fio2 > 80 ? 'CRITICAL' : 'WARNING',
        message: `FiO2 elevada: ${dto.settings.fio2}% - Risco de toxicidade por O2. Titular para SpO2 92-96%`,
      });
    }

    // ARDS classification alert
    if (measurements.pfRatio !== undefined && measurements.pfRatio < 300) {
      const classification = this.classifyArds(measurements.pfRatio);
      if (classification.classification !== 'NONE') {
        alerts.push({
          parameter: 'P/F Ratio',
          value: measurements.pfRatio,
          threshold: '< 300',
          severity:
            classification.classification === 'SEVERE' ? 'CRITICAL' : 'WARNING',
          message: `SDRA ${classification.description}: P/F ${measurements.pfRatio}`,
        });
      }
    }

    // Auto-PEEP
    if (measurements.autopeep !== undefined && measurements.autopeep > 2) {
      alerts.push({
        parameter: 'Auto-PEEP',
        value: measurements.autopeep,
        threshold: '> 2 cmH2O',
        severity: measurements.autopeep > 5 ? 'CRITICAL' : 'WARNING',
        message: `Auto-PEEP: ${measurements.autopeep} cmH2O - Risco de hiperinsuflacao dinamica`,
      });
    }

    // Low compliance
    if (
      measurements.compliance !== undefined &&
      measurements.compliance < 30
    ) {
      alerts.push({
        parameter: 'Compliance',
        value: measurements.compliance,
        threshold: '< 30 mL/cmH2O',
        severity: measurements.compliance < 20 ? 'CRITICAL' : 'WARNING',
        message: `Complacencia reduzida: ${measurements.compliance} mL/cmH2O`,
      });
    }

    // Blood gas alerts
    if (dto.bloodGas) {
      if (dto.bloodGas.lactate !== undefined && dto.bloodGas.lactate > 2) {
        alerts.push({
          parameter: 'Lactate',
          value: dto.bloodGas.lactate,
          threshold: '> 2 mmol/L',
          severity: dto.bloodGas.lactate > 4 ? 'CRITICAL' : 'WARNING',
          message: `Lactato elevado: ${dto.bloodGas.lactate} mmol/L - Avaliar perfusao tecidual`,
        });
      }
      if (dto.bloodGas.ph !== undefined && dto.bloodGas.ph < 7.25) {
        alerts.push({
          parameter: 'pH',
          value: dto.bloodGas.ph,
          threshold: '< 7.25',
          severity: dto.bloodGas.ph < 7.15 ? 'CRITICAL' : 'WARNING',
          message: `Acidemia grave: pH ${dto.bloodGas.ph}`,
        });
      }
    }
  }

  private classifyArds(pfRatio: number | undefined): ArdsClassification {
    if (pfRatio === undefined || pfRatio >= 300) {
      return {
        classification: 'NONE',
        pfRatio: pfRatio ?? 0,
        description: 'Sem criterio de SDRA',
      };
    }
    if (pfRatio >= 200) {
      return {
        classification: 'MILD',
        pfRatio,
        description: 'SDRA Leve (P/F 200-300)',
      };
    }
    if (pfRatio >= 100) {
      return {
        classification: 'MODERATE',
        pfRatio,
        description: 'SDRA Moderada (P/F 100-200)',
      };
    }
    return {
      classification: 'SEVERE',
      pfRatio,
      description: 'SDRA Grave (P/F < 100)',
    };
  }

  private interpretHemodynamics(
    readings: HemodynamicReadingsDto,
  ): HemodynamicInterpretation[] {
    const interpretations: HemodynamicInterpretation[] = [];

    const addInterpretation = (
      parameter: string,
      value: number | undefined,
      unit: string,
      normalRange: string,
      low: number,
      high: number,
      criticalLow?: number,
      criticalHigh?: number,
    ) => {
      if (value === undefined) return;
      let status: HemodynamicInterpretation['status'] = 'NORMAL';
      if (
        (criticalLow !== undefined && value < criticalLow) ||
        (criticalHigh !== undefined && value > criticalHigh)
      ) {
        status = 'CRITICAL';
      } else if (value < low) {
        status = 'LOW';
      } else if (value > high) {
        status = 'HIGH';
      }
      interpretations.push({ parameter, value, unit, normalRange, status });
    };

    addInterpretation('PAM Invasiva', readings.mapInvasive, 'mmHg', '70-105', 65, 105, 55, 120);
    addInterpretation('PVC', readings.cvp, 'cmH2O', '2-8', 2, 8, 0, 15);
    addInterpretation('PIC', readings.icp, 'mmHg', '< 20', 0, 20, undefined, 25);
    addInterpretation('PPC', readings.cpp, 'mmHg', '> 60', 60, 150, 50);
    addInterpretation('POAP', readings.pawp, 'mmHg', '6-12', 6, 12, undefined, 18);
    addInterpretation('DC', readings.cardiacOutput, 'L/min', '4-8', 4, 8, 3);
    addInterpretation('IC', readings.cardiacIndex, 'L/min/m2', '2.5-4.0', 2.5, 4.0, 2.0);
    addInterpretation('RVS', readings.svr, 'dyn.s/cm5', '800-1200', 800, 1200, 600, 1600);
    addInterpretation('RVP', readings.pvr, 'dyn.s/cm5', '< 250', 0, 250);
    addInterpretation('SvO2', readings.svo2, '%', '65-75', 65, 75, 55);

    return interpretations;
  }
}
