import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpecialtiesEnhancedService {
  private readonly logger = new Logger(SpecialtiesEnhancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Cardiology ─────────────────────────────────────────────────────────

  async createCardiologyAssessment(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      assessmentType: 'ECG' | 'ECHO' | 'CATH' | 'RISK_SCORE';
      ecg?: {
        rhythm: string;
        rate: number;
        axis: string;
        prInterval?: number;
        qrsDuration?: number;
        qtcInterval?: number;
        stChanges?: string;
        interpretation: string;
      };
      echo?: {
        lvef: number;
        lveddMm?: number;
        lvesdMm?: number;
        wallMotionAbnormality?: string;
        valvularFindings?: string[];
        diastolicFunction?: string;
        pericardialEffusion?: boolean;
        interpretation: string;
      };
      cath?: {
        accessSite: string;
        coronaryFindings: Array<{ vessel: string; stenosisPercent: number; intervention?: string }>;
        lvEndDiastolicPressure?: number;
        conclusion: string;
      };
      framinghamRisk?: { age: number; totalCholesterol: number; hdl: number; systolicBP: number; smoker: boolean; diabetes: boolean; gender: string };
      ascvdRisk?: { age: number; totalCholesterol: number; hdl: number; systolicBP: number; bpTreated: boolean; smoker: boolean; diabetes: boolean; gender: string; race: string };
      chads2vasc?: { chf: boolean; hypertension: boolean; age75: boolean; diabetes: boolean; stroke: boolean; vascular: boolean; age65to74: boolean; female: boolean };
    },
  ) {
    // Calculate scores if provided
    let framinghamResult: Record<string, unknown> | undefined;
    if (dto.framinghamRisk) {
      const f = dto.framinghamRisk;
      const isMale = f.gender === 'M';
      let points = 0;
      if (isMale) {
        if (f.age >= 70) points += 14;
        else if (f.age >= 60) points += 11;
        else if (f.age >= 50) points += 8;
        else if (f.age >= 40) points += 5;
        else if (f.age >= 35) points += 2;
        if (f.totalCholesterol >= 280) points += 3;
        else if (f.totalCholesterol >= 240) points += 2;
        else if (f.totalCholesterol >= 200) points += 1;
        if (f.hdl < 40) points += 2;
        else if (f.hdl < 50) points += 1;
        if (f.systolicBP >= 160) points += 3;
        else if (f.systolicBP >= 140) points += 2;
        else if (f.systolicBP >= 120) points += 1;
        if (f.smoker) points += 4;
        if (f.diabetes) points += 3;
      } else {
        if (f.age >= 70) points += 16;
        else if (f.age >= 60) points += 12;
        else if (f.age >= 50) points += 8;
        else if (f.age >= 40) points += 4;
        else if (f.age >= 35) points += 0;
        if (f.totalCholesterol >= 280) points += 5;
        else if (f.totalCholesterol >= 240) points += 3;
        else if (f.totalCholesterol >= 200) points += 1;
        if (f.hdl < 40) points += 2;
        else if (f.hdl < 50) points += 1;
        if (f.systolicBP >= 160) points += 4;
        else if (f.systolicBP >= 140) points += 3;
        else if (f.systolicBP >= 120) points += 1;
        if (f.smoker) points += 3;
        if (f.diabetes) points += 4;
      }
      const riskLevel = points >= 20 ? 'HIGH' : points >= 12 ? 'MODERATE' : 'LOW';
      framinghamResult = { points, riskLevel, interpretation: `Framingham: ${points} pontos — Risco ${riskLevel}` };
    }

    let ascvdResult: Record<string, unknown> | undefined;
    if (dto.ascvdRisk) {
      const a = dto.ascvdRisk;
      const lnAge = Math.log(a.age);
      const lnTC = Math.log(a.totalCholesterol);
      const lnHDL = Math.log(a.hdl);
      const lnSBP = Math.log(a.systolicBP);
      const isMale = a.gender === 'M';
      let risk: number;
      if (isMale) {
        const s = 12.344 * lnAge + 11.853 * lnTC - 2.664 * lnHDL + (a.bpTreated ? 1.916 : 1.764) * lnSBP + (a.smoker ? 7.837 : 0) + (a.diabetes ? 0.658 : 0);
        risk = 1 - Math.pow(0.9144, Math.exp(s - 61.18));
      } else {
        const s = 17.114 * lnAge + 0.94 * lnTC - 18.92 * lnHDL + (a.bpTreated ? 29.291 : 27.82) * lnSBP + (a.smoker ? 0.691 : 0) + (a.diabetes ? 0.874 : 0);
        risk = 1 - Math.pow(0.9665, Math.exp(s - 86.61));
      }
      const riskPercent = Math.min(Math.max(Math.round(risk * 1000) / 10, 0), 100);
      ascvdResult = {
        riskPercent,
        riskLevel: riskPercent >= 20 ? 'HIGH' : riskPercent >= 7.5 ? 'BORDERLINE_HIGH' : riskPercent >= 5 ? 'BORDERLINE' : 'LOW',
        statinRecommendation: riskPercent >= 7.5 ? 'Estatina de alta intensidade recomendada' : riskPercent >= 5 ? 'Considerar estatina — discutir com paciente' : 'Modificação de estilo de vida',
      };
    }

    let chads2vascResult: Record<string, unknown> | undefined;
    if (dto.chads2vasc) {
      const c = dto.chads2vasc;
      let score = 0;
      if (c.chf) score += 1;
      if (c.hypertension) score += 1;
      if (c.age75) score += 2;
      if (c.diabetes) score += 1;
      if (c.stroke) score += 2;
      if (c.vascular) score += 1;
      if (c.age65to74) score += 1;
      if (c.female) score += 1;
      const annualStrokeRisk = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2];
      chads2vascResult = {
        score,
        annualStrokeRiskPercent: annualStrokeRisk[Math.min(score, 9)],
        anticoagulation: score >= 2 ? 'Anticoagulação oral indicada' : score === 1 ? 'Considerar anticoagulação' : 'Sem indicação de anticoagulação',
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:CARDIOLOGY:${dto.assessmentType}]`,
        content: JSON.stringify({
          documentType: 'CARDIOLOGY_ASSESSMENT',
          assessmentType: dto.assessmentType,
          ecg: dto.ecg,
          echo: dto.echo,
          cath: dto.cath,
          framingham: framinghamResult,
          ascvd: ascvdResult,
          chads2vasc: chads2vascResult,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, assessmentType: dto.assessmentType, framingham: framinghamResult, ascvd: ascvdResult, chads2vasc: chads2vascResult, createdAt: doc.createdAt };
  }

  // ─── Nephrology ────────────────────────────────────────────────────────

  async createNephrologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      creatinine: number;
      age: number;
      gender: string;
      race?: string;
      dialysis?: {
        type: 'HD' | 'PD';
        frequency: string;
        duration: number;
        dryWeight: number;
        accessType: string;
        accessLocation: string;
        ktV?: number;
        urr?: number;
      };
      access?: {
        type: 'FAV' | 'PTFE' | 'CDL' | 'PERMCATH';
        location: string;
        createdAt: string;
        status: string;
        complications?: string[];
      };
    },
  ) {
    // CKD-EPI calculation
    const isFemale = dto.gender === 'F';
    const k = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.329 : -0.411;
    const scr_k = dto.creatinine / k;
    const gfr = 141 * Math.pow(Math.min(scr_k, 1), alpha) * Math.pow(Math.max(scr_k, 1), -1.209) * Math.pow(0.993, dto.age) * (isFemale ? 1.018 : 1);
    const roundedGfr = Math.round(gfr * 10) / 10;

    let stage = 'G1';
    if (roundedGfr < 15) stage = 'G5';
    else if (roundedGfr < 30) stage = 'G4';
    else if (roundedGfr < 45) stage = 'G3b';
    else if (roundedGfr < 60) stage = 'G3a';
    else if (roundedGfr < 90) stage = 'G2';

    // Kt/V interpretation
    let ktVInterpretation: string | undefined;
    if (dto.dialysis?.ktV !== undefined) {
      const ktV = dto.dialysis.ktV;
      ktVInterpretation = ktV >= 1.4 ? 'Adequado (meta >= 1.4 para HD)' : ktV >= 1.2 ? 'Aceitavel (minimo 1.2)' : 'Inadequado — ajustar prescricao dialitica';
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:NEPHROLOGY] GFR ${roundedGfr} ${stage}`,
        content: JSON.stringify({
          documentType: 'NEPHROLOGY_RECORD',
          ckdEpi: { gfr: roundedGfr, unit: 'mL/min/1.73m2', stage, referToNephrology: roundedGfr < 45, dialysisPlanning: roundedGfr < 20 },
          dialysis: dto.dialysis ? { ...dto.dialysis, ktVInterpretation } : undefined,
          access: dto.access,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, gfr: roundedGfr, stage, ktVInterpretation, createdAt: doc.createdAt };
  }

  // ─── Neurology ─────────────────────────────────────────────────────────

  async createNeurologyAssessment(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      assessmentType: 'NIHSS' | 'MRANKIN' | 'EDSS' | 'EEG' | 'EMG';
      nihss?: {
        consciousness: number;
        gazeDeviation: number;
        visualFields: number;
        facialPalsy: number;
        motorArmLeft: number;
        motorArmRight: number;
        motorLegLeft: number;
        motorLegRight: number;
        limbAtaxia: number;
        sensory: number;
        language: number;
        dysarthria: number;
        neglect: number;
      };
      mRankinScore?: number;
      edss?: { pyramidal: number; cerebellar: number; brainstem: number; sensory: number; bowelBladder: number; visual: number; cerebral: number; ambulation: number };
      eeg?: { findings: string; interpretation: string; recommendation: string };
      emg?: { findings: string; nerveConduction: string; interpretation: string };
    },
  ) {
    let nihssResult: Record<string, unknown> | undefined;
    if (dto.nihss) {
      const n = dto.nihss;
      const total = n.consciousness + n.gazeDeviation + n.visualFields + n.facialPalsy +
        n.motorArmLeft + n.motorArmRight + n.motorLegLeft + n.motorLegRight +
        n.limbAtaxia + n.sensory + n.language + n.dysarthria + n.neglect;
      nihssResult = {
        totalScore: total,
        severity: total === 0 ? 'Sem deficit' : total <= 4 ? 'AVC leve' : total <= 15 ? 'AVC moderado' : total <= 20 ? 'AVC moderado-grave' : 'AVC grave',
        thrombolysisEligible: total >= 4 && total <= 25,
        thrombectomyConsideration: total >= 6,
      };
    }

    let mRankinResult: Record<string, unknown> | undefined;
    if (dto.mRankinScore !== undefined) {
      const descriptions: Record<number, string> = {
        0: 'Sem sintomas',
        1: 'Sem incapacidade significativa',
        2: 'Incapacidade leve',
        3: 'Incapacidade moderada',
        4: 'Incapacidade moderadamente grave',
        5: 'Incapacidade grave — acamado',
        6: 'Obito',
      };
      mRankinResult = {
        score: dto.mRankinScore,
        description: descriptions[dto.mRankinScore] ?? 'Score invalido',
        functionalOutcome: dto.mRankinScore <= 2 ? 'FAVORABLE' : 'UNFAVORABLE',
      };
    }

    let edssResult: Record<string, unknown> | undefined;
    if (dto.edss) {
      const e = dto.edss;
      const max = Math.max(e.pyramidal, e.cerebellar, e.brainstem, e.sensory, e.bowelBladder, e.visual, e.cerebral);
      let edss = max;
      if (e.ambulation >= 2) edss = Math.max(edss, 4.0 + (e.ambulation - 2) * 0.5);
      const score = Math.round(edss * 2) / 2;
      edssResult = {
        score,
        interpretation: score <= 3.5 ? 'Incapacidade leve' : score <= 6.0 ? 'Incapacidade moderada' : 'Incapacidade grave',
        ambulatory: score < 7.0,
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:NEUROLOGY:${dto.assessmentType}]`,
        content: JSON.stringify({
          documentType: 'NEUROLOGY_ASSESSMENT',
          assessmentType: dto.assessmentType,
          nihss: nihssResult,
          mRankin: mRankinResult,
          edss: edssResult,
          eeg: dto.eeg,
          emg: dto.emg,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, assessmentType: dto.assessmentType, nihss: nihssResult, mRankin: mRankinResult, edss: edssResult, createdAt: doc.createdAt };
  }

  // ─── Orthopedics ───────────────────────────────────────────────────────

  async createOrthopedicsRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      bone: string;
      segment: string;
      type: string;
      group?: string;
      immobilization?: { type: string; location: string; duration: string; material: string };
      dvtProphylaxis?: { indicated: boolean; regimen?: string; duration?: string; contraindications?: string[] };
    },
  ) {
    const aoClassification = `${dto.bone}${dto.segment}.${dto.type}${dto.group ? `.${dto.group}` : ''}`;
    const typeDescription: Record<string, string> = { A: 'Extra-articular', B: 'Articular parcial', C: 'Articular completa' };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:ORTHOPEDICS] AO ${aoClassification}`,
        content: JSON.stringify({
          documentType: 'ORTHOPEDICS_RECORD',
          aoClassification,
          bone: dto.bone,
          segment: dto.segment,
          fractureType: typeDescription[dto.type] ?? dto.type,
          immobilization: dto.immobilization,
          dvtProphylaxis: dto.dvtProphylaxis ?? {
            indicated: true,
            regimen: 'Enoxaparina 40mg SC 1x/dia por 14 dias',
            riskAssessment: 'Alto risco — fratura de extremidade',
            contraindications: ['Sangramento ativo', 'Plaquetas < 50.000', 'HIT'],
          },
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, aoClassification, createdAt: doc.createdAt };
  }

  // ─── Gynecology ────────────────────────────────────────────────────────

  async createGynecologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      recordType: 'PAP_SMEAR' | 'COLPOSCOPY' | 'BOTH';
      papResult?: string;
      colposcopy?: { findings: string; biopsySites?: string[]; schillerTest?: string; endocervicalCurettage?: boolean; recommendation: string };
    },
  ) {
    const bethesda: Record<string, { category: string; recommendation: string }> = {
      NILM: { category: 'Negativo para lesao intraepitelial', recommendation: 'Rastreamento de rotina conforme faixa etaria' },
      ASCUS: { category: 'Celulas escamosas atipicas de significado indeterminado', recommendation: 'Repetir citologia em 6 meses OU teste HPV reflexo' },
      ASCH: { category: 'Celulas escamosas atipicas, nao se pode excluir HSIL', recommendation: 'Colposcopia imediata' },
      LSIL: { category: 'Lesao intraepitelial escamosa de baixo grau', recommendation: 'Colposcopia' },
      HSIL: { category: 'Lesao intraepitelial escamosa de alto grau', recommendation: 'Colposcopia + biopsia dirigida' },
      SCC: { category: 'Carcinoma de celulas escamosas', recommendation: 'Colposcopia + biopsia urgente + encaminhamento oncologia' },
      AGC: { category: 'Celulas glandulares atipicas', recommendation: 'Colposcopia + curetagem endocervical' },
    };

    const papClassification = dto.papResult ? (bethesda[dto.papResult] ?? { category: 'Resultado nao reconhecido', recommendation: 'Reavaliar amostra' }) : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:GYNECOLOGY:${dto.recordType}]`,
        content: JSON.stringify({
          documentType: 'GYNECOLOGY_RECORD',
          recordType: dto.recordType,
          papSmear: dto.papResult ? { result: dto.papResult, bethesdaCategory: papClassification?.category, recommendation: papClassification?.recommendation, system: 'Bethesda 2014' } : undefined,
          colposcopy: dto.colposcopy,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, recordType: dto.recordType, papClassification, createdAt: doc.createdAt };
  }

  // ─── Prenatal ──────────────────────────────────────────────────────────

  async createPrenatalRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      lmp: string; // Last menstrual period
      edd?: string; // Estimated due date
      currentGA?: { weeks: number; days: number };
      visits: Array<{
        date: string;
        gaWeeks: number;
        weight: number;
        bp: string;
        fundalHeight?: number;
        fetalHR?: number;
        presentation?: string;
        edema?: string;
        complaints?: string;
        notes?: string;
      }>;
      ultrasounds?: Array<{ date: string; gaWeeks: number; biometry: string; findings: string; estimatedWeight?: number }>;
      vaccines?: Array<{ name: string; dose: string; date: string; lot?: string }>;
      labs?: Array<{ name: string; result: string; date: string; normal: boolean }>;
      riskClassification: 'HABITUAL' | 'HIGH_RISK';
      riskFactors?: string[];
    },
  ) {
    // Calculate EDD from LMP if not provided (Naegele's rule)
    const lmpDate = new Date(dto.lmp);
    const calculatedEdd = dto.edd ?? new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Calculate current GA if not provided
    const now = new Date();
    const diffMs = now.getTime() - lmpDate.getTime();
    const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const currentGA = dto.currentGA ?? { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PRENATAL] IG ${currentGA.weeks}s${currentGA.days}d — ${dto.riskClassification}`,
        content: JSON.stringify({
          documentType: 'PRENATAL_RECORD',
          lmp: dto.lmp,
          edd: calculatedEdd,
          currentGA,
          visits: dto.visits,
          totalVisits: dto.visits.length,
          ultrasounds: dto.ultrasounds,
          vaccines: dto.vaccines,
          labs: dto.labs,
          riskClassification: dto.riskClassification,
          riskFactors: dto.riskFactors,
          minimumVisitsExpected: currentGA.weeks < 28 ? 'Mensal' : currentGA.weeks < 36 ? 'Quinzenal' : 'Semanal',
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, currentGA, edd: calculatedEdd, riskClassification: dto.riskClassification, totalVisits: dto.visits.length, createdAt: doc.createdAt };
  }

  // ─── Partogram ─────────────────────────────────────────────────────────

  async createPartogram(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      entries: Array<{
        time: string;
        cervicalDilation: number; // cm
        fetalDescent: number; // De Lee station
        contractionsIn10Min: number;
        contractionDuration: number; // seconds
        fetalHeartRate: number;
        amnioticFluid?: string; // CLEAR, MECONIUM_THIN, MECONIUM_THICK, ABSENT
        maternalBP?: string;
        maternalPulse?: number;
        maternalTemp?: number;
        medications?: string[];
        observations?: string;
      }>;
      laborStart: string;
      membraneRupture?: string;
      amniotiFluidType?: string;
    },
  ) {
    // Analyze partogram for alerts
    const alerts: string[] = [];
    const latestEntry = dto.entries[dto.entries.length - 1];
    if (latestEntry) {
      if (latestEntry.fetalHeartRate < 110 || latestEntry.fetalHeartRate > 160) {
        alerts.push(`FCF anormal: ${latestEntry.fetalHeartRate} bpm (Normal: 110-160)`);
      }
      if (latestEntry.amnioticFluid === 'MECONIUM_THICK') {
        alerts.push('Liquido amniotico meconial espesso — risco de aspiracao');
      }
    }

    // Check for labor arrest (no dilation progress in 4h active phase)
    if (dto.entries.length >= 4) {
      const last4 = dto.entries.slice(-4);
      const firstDil = last4[0].cervicalDilation;
      const lastDil = last4[last4.length - 1].cervicalDilation;
      if (firstDil >= 4 && lastDil - firstDil < 1) {
        alerts.push('Possivel parada de progressao — sem avanco de dilatacao em multiplas avaliacoes');
      }
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PARTOGRAM] Dilatacao ${latestEntry?.cervicalDilation ?? 0}cm`,
        content: JSON.stringify({
          documentType: 'PARTOGRAM',
          laborStart: dto.laborStart,
          membraneRupture: dto.membraneRupture,
          amnioticFluidType: dto.amniotiFluidType,
          entries: dto.entries,
          totalEntries: dto.entries.length,
          currentDilation: latestEntry?.cervicalDilation,
          currentDescent: latestEntry?.fetalDescent,
          currentFHR: latestEntry?.fetalHeartRate,
          alerts,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, currentDilation: latestEntry?.cervicalDilation, alerts, createdAt: doc.createdAt };
  }

  // ─── Pediatrics ────────────────────────────────────────────────────────

  async createPediatricsAssessment(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      ageMonths: number;
      weight: number;
      height: number;
      headCircumference?: number;
      denverII?: {
        grossMotor: Array<{ milestone: string; achieved: boolean }>;
        fineMotor: Array<{ milestone: string; achieved: boolean }>;
        language: Array<{ milestone: string; achieved: boolean }>;
        personalSocial: Array<{ milestone: string; achieved: boolean }>;
      };
      growthPercentiles?: { weightPercentile: number; heightPercentile: number; hcPercentile?: number; bmiPercentile?: number };
      vaccines?: Array<{ name: string; dose: string; date: string; status: 'ADMINISTERED' | 'PENDING' | 'DELAYED' }>;
    },
  ) {
    // Analyze Denver II for delays
    const delays: string[] = [];
    if (dto.denverII) {
      const domains = [
        { name: 'Motor grosso', items: dto.denverII.grossMotor },
        { name: 'Motor fino', items: dto.denverII.fineMotor },
        { name: 'Linguagem', items: dto.denverII.language },
        { name: 'Pessoal-social', items: dto.denverII.personalSocial },
      ];
      for (const domain of domains) {
        const notAchieved = domain.items.filter((m) => !m.achieved).length;
        const total = domain.items.length;
        if (total > 0 && notAchieved / total > 0.25) {
          delays.push(`${domain.name}: ${notAchieved}/${total} marcos nao atingidos — possivel atraso`);
        }
      }
    }

    // Growth alerts
    const growthAlerts: string[] = [];
    if (dto.growthPercentiles) {
      const gp = dto.growthPercentiles;
      if (gp.weightPercentile < 3) growthAlerts.push('Peso abaixo do percentil 3 — desnutricao');
      else if (gp.weightPercentile < 10) growthAlerts.push('Peso entre p3-p10 — monitorar');
      if (gp.heightPercentile < 3) growthAlerts.push('Estatura abaixo do percentil 3 — baixa estatura');
      if (gp.bmiPercentile !== undefined && gp.bmiPercentile > 97) growthAlerts.push('IMC > p97 — obesidade');
      if (gp.hcPercentile !== undefined && (gp.hcPercentile < 3 || gp.hcPercentile > 97)) {
        growthAlerts.push(`Perimetro cefalico ${gp.hcPercentile < 3 ? 'microcefalia' : 'macrocefalia'}`);
      }
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PEDIATRICS] ${dto.ageMonths}m`,
        content: JSON.stringify({
          documentType: 'PEDIATRICS_ASSESSMENT',
          ageMonths: dto.ageMonths,
          anthropometry: { weight: dto.weight, height: dto.height, headCircumference: dto.headCircumference },
          growthPercentiles: dto.growthPercentiles,
          denverII: dto.denverII,
          developmentalDelays: delays,
          growthAlerts,
          vaccines: dto.vaccines,
          pendingVaccines: dto.vaccines?.filter((v) => v.status !== 'ADMINISTERED').length ?? 0,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, delays, growthAlerts, createdAt: doc.createdAt };
  }

  // ─── Neonatology ───────────────────────────────────────────────────────

  async createNeonatologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      apgar: { min1: number; min5: number; min10?: number };
      gestationalAge?: { method: 'CAPURRO' | 'NEW_BALLARD'; score?: number; weeks: number };
      birthWeight: number;
      birthLength: number;
      headCircumference: number;
      classification?: string;
      phototherapy?: { indicated: boolean; bilirubinLevel?: number; hoursOfLife?: number; type?: string };
      npt?: { type: 'ENTERAL' | 'PARENTERAL' | 'MIXED'; volume?: number; caloricDensity?: number };
      complications?: string[];
    },
  ) {
    // Weight classification
    let weightClassification: string;
    if (dto.birthWeight < 1000) weightClassification = 'Extremo baixo peso (< 1000g)';
    else if (dto.birthWeight < 1500) weightClassification = 'Muito baixo peso (< 1500g)';
    else if (dto.birthWeight < 2500) weightClassification = 'Baixo peso (< 2500g)';
    else if (dto.birthWeight <= 4000) weightClassification = 'Peso adequado';
    else weightClassification = 'Macrossomia (> 4000g)';

    // Apgar interpretation
    const apgarInterpretation = dto.apgar.min5 >= 7 ? 'Boa vitalidade' : dto.apgar.min5 >= 4 ? 'Asfixia moderada' : 'Asfixia grave';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:NEONATOLOGY] Apgar ${dto.apgar.min1}/${dto.apgar.min5} ${dto.birthWeight}g`,
        content: JSON.stringify({
          documentType: 'NEONATOLOGY_RECORD',
          apgar: { ...dto.apgar, interpretation: apgarInterpretation },
          gestationalAge: dto.gestationalAge,
          anthropometry: { birthWeight: dto.birthWeight, birthLength: dto.birthLength, headCircumference: dto.headCircumference },
          weightClassification,
          classification: dto.classification,
          phototherapy: dto.phototherapy,
          npt: dto.npt,
          complications: dto.complications,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, apgarInterpretation, weightClassification, createdAt: doc.createdAt };
  }

  // ─── Psychiatry ────────────────────────────────────────────────────────

  async createPsychiatryAssessment(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      phq9?: { items: number[]; totalScore?: number };
      gad7?: { items: number[]; totalScore?: number };
      mini?: { modulesAssessed: string[]; positiveDiagnoses: string[] };
      csrs?: { ideation: number; intensity: number; behavior: number; riskLevel: string };
      ptsd?: { items: number[]; totalScore?: number };
      mentalStatusExam?: {
        appearance: string;
        behavior: string;
        speech: string;
        mood: string;
        affect: string;
        thoughtProcess: string;
        thoughtContent: string;
        perception: string;
        cognition: string;
        insight: string;
        judgment: string;
      };
    },
  ) {
    // PHQ-9 scoring
    let phq9Result: Record<string, unknown> | undefined;
    if (dto.phq9) {
      const total = dto.phq9.totalScore ?? dto.phq9.items.reduce((s, v) => s + v, 0);
      phq9Result = {
        totalScore: total,
        severity: total <= 4 ? 'Minima' : total <= 9 ? 'Leve' : total <= 14 ? 'Moderada' : total <= 19 ? 'Moderadamente grave' : 'Grave',
        suicidalIdeationItem: dto.phq9.items[8] > 0,
        treatment: total >= 15 ? 'Antidepressivo + psicoterapia' : total >= 10 ? 'Considerar antidepressivo e/ou psicoterapia' : total >= 5 ? 'Monitorar, psicoterapia' : 'Sem tratamento especifico',
      };
    }

    // GAD-7 scoring
    let gad7Result: Record<string, unknown> | undefined;
    if (dto.gad7) {
      const total = dto.gad7.totalScore ?? dto.gad7.items.reduce((s, v) => s + v, 0);
      gad7Result = {
        totalScore: total,
        severity: total <= 4 ? 'Minima' : total <= 9 ? 'Leve' : total <= 14 ? 'Moderada' : 'Grave',
        treatment: total >= 10 ? 'Considerar ansiolitico/ISRS + psicoterapia (TCC)' : total >= 5 ? 'Monitorar, psicoterapia' : 'Sem tratamento especifico',
      };
    }

    // Suicide risk assessment
    let suicideRisk: Record<string, unknown> | undefined;
    if (dto.csrs) {
      suicideRisk = {
        ...dto.csrs,
        protocol: dto.csrs.riskLevel === 'HIGH' || dto.csrs.behavior > 0
          ? 'Internacao psiquiatrica involuntaria se necessario. Vigilancia continua. Ambiente seguro.'
          : dto.csrs.riskLevel === 'MODERATE'
            ? 'Contrato de seguranca. Consulta psiquiatrica em 48h. Orientar familia.'
            : 'Monitoramento ambulatorial. Plano de seguranca.',
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PSYCHIATRY] PHQ9:${phq9Result?.totalScore ?? 'N/A'} GAD7:${gad7Result?.totalScore ?? 'N/A'}`,
        content: JSON.stringify({
          documentType: 'PSYCHIATRY_ASSESSMENT',
          phq9: phq9Result,
          gad7: gad7Result,
          mini: dto.mini,
          suicideRisk,
          ptsd: dto.ptsd ? { totalScore: dto.ptsd.totalScore ?? dto.ptsd.items.reduce((s, v) => s + v, 0), items: dto.ptsd.items } : undefined,
          mentalStatusExam: dto.mentalStatusExam,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, phq9: phq9Result, gad7: gad7Result, suicideRisk, createdAt: doc.createdAt };
  }

  // ─── Dermatology ───────────────────────────────────────────────────────

  async createDermatologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      photoDocumentation?: Array<{ location: string; description: string; imageUrl?: string; size?: string }>;
      dermoscopy?: Array<{ location: string; pattern: string; abcdeScore?: Record<string, number>; recommendation: string }>;
      nevusMapping?: {
        totalNevi: number;
        atypicalNevi: number;
        bodyRegions: Array<{ region: string; neviCount: number; atypical: number; description?: string }>;
      };
    },
  ) {
    let melanomRisk = 'BAIXO';
    if (dto.nevusMapping) {
      if (dto.nevusMapping.atypicalNevi >= 5) melanomRisk = 'ALTO';
      else if (dto.nevusMapping.atypicalNevi >= 2 || dto.nevusMapping.totalNevi > 50) melanomRisk = 'MODERADO';
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:DERMATOLOGY] Nevos:${dto.nevusMapping?.totalNevi ?? 0} Atipicos:${dto.nevusMapping?.atypicalNevi ?? 0}`,
        content: JSON.stringify({
          documentType: 'DERMATOLOGY_RECORD',
          photoDocumentation: dto.photoDocumentation,
          dermoscopy: dto.dermoscopy,
          nevusMapping: dto.nevusMapping,
          melanomRiskScore: melanomRisk,
          nextMappingDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, melanomRisk, createdAt: doc.createdAt };
  }

  // ─── Ophthalmology ─────────────────────────────────────────────────────

  async createOphthalmologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      snellen?: { rightEye: string; leftEye: string; corrected: boolean };
      tonometry?: { rightEye: number; leftEye: number; method: string };
      oct?: { findings: string; interpretation: string };
      visualFields?: { findings: string; interpretation: string; meanDeviation?: number };
    },
  ) {
    // Parse Snellen acuity
    let snellenResult: Record<string, unknown> | undefined;
    if (dto.snellen) {
      const parseAcuity = (v: string) => {
        const parts = v.split('/');
        return parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : 0;
      };
      const odDec = parseAcuity(dto.snellen.rightEye);
      const osDec = parseAcuity(dto.snellen.leftEye);
      snellenResult = {
        rightEye: { snellen: dto.snellen.rightEye, decimal: Math.round(odDec * 100) / 100, logMAR: Math.round(-Math.log10(odDec || 0.01) * 100) / 100 },
        leftEye: { snellen: dto.snellen.leftEye, decimal: Math.round(osDec * 100) / 100, logMAR: Math.round(-Math.log10(osDec || 0.01) * 100) / 100 },
        corrected: dto.snellen.corrected,
        legallyBlind: odDec < 0.1 && osDec < 0.1,
        drivingEligible: Math.max(odDec, osDec) >= 0.5,
      };
    }

    // Tonometry alerts
    let tonometryAlerts: string[] | undefined;
    if (dto.tonometry) {
      tonometryAlerts = [];
      if (dto.tonometry.rightEye > 21) tonometryAlerts.push(`PIO OD elevada: ${dto.tonometry.rightEye} mmHg (normal < 21)`);
      if (dto.tonometry.leftEye > 21) tonometryAlerts.push(`PIO OE elevada: ${dto.tonometry.leftEye} mmHg (normal < 21)`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:OPHTHALMOLOGY]`,
        content: JSON.stringify({
          documentType: 'OPHTHALMOLOGY_RECORD',
          snellen: snellenResult,
          tonometry: dto.tonometry ? { ...dto.tonometry, alerts: tonometryAlerts } : undefined,
          oct: dto.oct,
          visualFields: dto.visualFields,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, snellen: snellenResult, tonometryAlerts, createdAt: doc.createdAt };
  }

  // ─── ENT ───────────────────────────────────────────────────────────────

  async createENTRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      audiometry?: { rightEar: number[]; leftEar: number[]; frequencies: number[] };
      impedance?: { rightEar: string; leftEar: string; tympanogramType: string };
      bera?: { findings: string; thresholdRight: number; thresholdLeft: number; interpretation: string };
      nasofibroscopy?: { findings: string; larynxFindings?: string; interpretation: string };
    },
  ) {
    // Audiometry classification
    let audiometryResult: Record<string, unknown> | undefined;
    if (dto.audiometry) {
      const avgRight = dto.audiometry.rightEar.reduce((s, v) => s + v, 0) / dto.audiometry.rightEar.length;
      const avgLeft = dto.audiometry.leftEar.reduce((s, v) => s + v, 0) / dto.audiometry.leftEar.length;
      const classify = (avg: number) => {
        if (avg <= 25) return 'Normal';
        if (avg <= 40) return 'Perda leve';
        if (avg <= 55) return 'Perda moderada';
        if (avg <= 70) return 'Perda moderadamente severa';
        if (avg <= 90) return 'Perda severa';
        return 'Perda profunda';
      };
      audiometryResult = {
        rightEar: { thresholds: dto.audiometry.rightEar, pta: Math.round(avgRight), classification: classify(avgRight) },
        leftEar: { thresholds: dto.audiometry.leftEar, pta: Math.round(avgLeft), classification: classify(avgLeft) },
        frequencies: dto.audiometry.frequencies,
        hearingAidRecommended: avgRight > 40 || avgLeft > 40,
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:ENT]`,
        content: JSON.stringify({
          documentType: 'ENT_RECORD',
          audiometry: audiometryResult,
          impedance: dto.impedance,
          bera: dto.bera,
          nasofibroscopy: dto.nasofibroscopy,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, audiometry: audiometryResult, createdAt: doc.createdAt };
  }

  // ─── Endocrinology ─────────────────────────────────────────────────────

  async createEndocrinologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      insulinProtocol?: { currentGlycemia: number; weight: number; type: string };
      hba1cTracking?: Array<{ date: string; value: number }>;
      thyroid?: { tsh: number; freeT4: number; freeT3?: number; antiTPO?: number; interpretation: string };
    },
  ) {
    // Insulin protocol calculation
    let insulinResult: Record<string, unknown> | undefined;
    if (dto.insulinProtocol) {
      const { currentGlycemia, weight } = dto.insulinProtocol;
      const slidingScale = [
        { range: '< 70 mg/dL', action: 'Suspender insulina. Glicose 15g VO ou IV', dose: 0 },
        { range: '70-139', action: 'Sem correcao', dose: 0 },
        { range: '140-179', action: 'Insulina regular SC', dose: 2 },
        { range: '180-219', action: 'Insulina regular SC', dose: 4 },
        { range: '220-259', action: 'Insulina regular SC', dose: 6 },
        { range: '260-299', action: 'Insulina regular SC', dose: 8 },
        { range: '300-349', action: 'Insulina regular SC', dose: 10 },
        { range: '>= 350', action: 'Insulina regular SC + avisar plantonista', dose: 12 },
      ];
      const basalDose = Math.round(weight * 0.2);
      let correctionDose = 0;
      if (currentGlycemia >= 350) correctionDose = 12;
      else if (currentGlycemia >= 300) correctionDose = 10;
      else if (currentGlycemia >= 260) correctionDose = 8;
      else if (currentGlycemia >= 220) correctionDose = 6;
      else if (currentGlycemia >= 180) correctionDose = 4;
      else if (currentGlycemia >= 140) correctionDose = 2;
      insulinResult = {
        currentGlycemia,
        basalInsulin: { type: 'Glargina', dose: basalDose, timing: '22h', unit: 'UI' },
        correctionDose: { type: 'Regular', dose: correctionDose, unit: 'UI' },
        slidingScale,
      };
    }

    // HbA1c trend analysis
    let hba1cAnalysis: Record<string, unknown> | undefined;
    if (dto.hba1cTracking && dto.hba1cTracking.length > 0) {
      const latest = dto.hba1cTracking[dto.hba1cTracking.length - 1];
      const atTarget = latest.value < 7.0;
      const trend = dto.hba1cTracking.length >= 2
        ? latest.value < dto.hba1cTracking[dto.hba1cTracking.length - 2].value ? 'IMPROVING' : 'WORSENING'
        : 'INSUFFICIENT_DATA';
      hba1cAnalysis = { latestValue: latest.value, atTarget, trend, target: '< 7.0%', history: dto.hba1cTracking };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:ENDOCRINOLOGY]`,
        content: JSON.stringify({
          documentType: 'ENDOCRINOLOGY_RECORD',
          insulinProtocol: insulinResult,
          hba1cAnalysis,
          thyroid: dto.thyroid,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, insulinResult, hba1cAnalysis, createdAt: doc.createdAt };
  }

  // ─── Rheumatology ──────────────────────────────────────────────────────

  async createRheumatologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      das28?: { tenderJoints: number; swollenJoints: number; esr: number; patientGlobalAssessment: number };
      haq?: { items: number[]; totalScore?: number };
      basdai?: { items: number[]; totalScore?: number };
      jointHomunculus?: Array<{ joint: string; tender: boolean; swollen: boolean; restricted: boolean }>;
    },
  ) {
    let das28Result: Record<string, unknown> | undefined;
    if (dto.das28) {
      const { tenderJoints, swollenJoints, esr, patientGlobalAssessment } = dto.das28;
      const das28Score = 0.56 * Math.sqrt(tenderJoints) + 0.28 * Math.sqrt(swollenJoints) + 0.70 * Math.log(esr) + 0.014 * patientGlobalAssessment;
      const rounded = Math.round(das28Score * 100) / 100;
      das28Result = {
        score: rounded,
        diseaseActivity: rounded > 5.1 ? 'Alta atividade' : rounded > 3.2 ? 'Atividade moderada' : rounded > 2.6 ? 'Baixa atividade' : 'Remissao',
        treatmentEscalation: rounded > 3.2,
      };
    }

    let haqResult: Record<string, unknown> | undefined;
    if (dto.haq) {
      const total = dto.haq.totalScore ?? (dto.haq.items.reduce((s, v) => s + v, 0) / dto.haq.items.length);
      haqResult = {
        score: Math.round(total * 100) / 100,
        functionalStatus: total <= 0.5 ? 'Funcional' : total <= 1.25 ? 'Dificuldade leve a moderada' : total <= 2 ? 'Dificuldade moderada a grave' : 'Incapacidade grave',
      };
    }

    let basdaiResult: Record<string, unknown> | undefined;
    if (dto.basdai) {
      const items = dto.basdai.items;
      const total = dto.basdai.totalScore ?? (items.length >= 6 ? (items[0] + items[1] + items[2] + items[3] + (items[4] + items[5]) / 2) / 5 : items.reduce((s, v) => s + v, 0) / items.length);
      const rounded = Math.round(total * 10) / 10;
      basdaiResult = {
        score: rounded,
        diseaseActivity: rounded >= 4 ? 'Atividade alta — considerar terapia biologica' : 'Atividade baixa',
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:RHEUMATOLOGY] DAS28:${das28Result?.score ?? 'N/A'}`,
        content: JSON.stringify({
          documentType: 'RHEUMATOLOGY_RECORD',
          das28: das28Result,
          haq: haqResult,
          basdai: basdaiResult,
          jointHomunculus: dto.jointHomunculus,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, das28: das28Result, haq: haqResult, basdai: basdaiResult, createdAt: doc.createdAt };
  }

  // ─── Pulmonology ───────────────────────────────────────────────────────

  async createPulmonologyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      spirometry?: { fev1: number; fvc: number; fev1Predicted: number; age: number };
      catScore?: number; // COPD Assessment Test 0-40
      actScore?: number; // Asthma Control Test 5-25
    },
  ) {
    let spirometryResult: Record<string, unknown> | undefined;
    if (dto.spirometry) {
      const { fev1, fvc, fev1Predicted } = dto.spirometry;
      const ratio = fev1 / fvc;
      const fev1Percent = (fev1 / fev1Predicted) * 100;
      let goldStage = '';
      let pattern = 'Normal';
      if (ratio < 0.7) {
        pattern = 'Obstrutivo';
        if (fev1Percent >= 80) goldStage = 'GOLD 1 (Leve)';
        else if (fev1Percent >= 50) goldStage = 'GOLD 2 (Moderado)';
        else if (fev1Percent >= 30) goldStage = 'GOLD 3 (Grave)';
        else goldStage = 'GOLD 4 (Muito grave)';
      } else if (fev1Percent < 80) {
        pattern = 'Restritivo (sugestivo)';
      }
      spirometryResult = {
        fev1, fvc,
        fev1FvcRatio: Math.round(ratio * 1000) / 1000,
        fev1PercentPredicted: Math.round(fev1Percent * 10) / 10,
        pattern,
        goldStage: goldStage || undefined,
      };
    }

    let catInterpretation: string | undefined;
    if (dto.catScore !== undefined) {
      catInterpretation = dto.catScore < 10 ? 'Baixo impacto' : dto.catScore < 20 ? 'Medio impacto' : dto.catScore < 30 ? 'Alto impacto' : 'Muito alto impacto';
    }

    let actInterpretation: string | undefined;
    if (dto.actScore !== undefined) {
      actInterpretation = dto.actScore >= 20 ? 'Controlada' : dto.actScore >= 16 ? 'Parcialmente controlada' : 'Nao controlada';
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PULMONOLOGY]`,
        content: JSON.stringify({
          documentType: 'PULMONOLOGY_RECORD',
          spirometry: spirometryResult,
          cat: dto.catScore !== undefined ? { score: dto.catScore, interpretation: catInterpretation } : undefined,
          act: dto.actScore !== undefined ? { score: dto.actScore, interpretation: actInterpretation } : undefined,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, spirometry: spirometryResult, catInterpretation, actInterpretation, createdAt: doc.createdAt };
  }

  // ─── Nutrition ─────────────────────────────────────────────────────────

  async createNutritionAssessment(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      nrs2002?: { nutritionalStatus: number; diseaseSeverity: number; age70plus: boolean };
      sga?: { weightLoss: string; dietaryIntake: string; giSymptoms: string; functionalCapacity: string; physicalExam: string; classification: 'A' | 'B' | 'C' };
      mealPlan?: { type: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; restrictions: string[] };
      anthropometry?: { weight: number; height: number; bmi: number; armCircumference?: number; tricepsFold?: number };
    },
  ) {
    let nrs2002Result: Record<string, unknown> | undefined;
    if (dto.nrs2002) {
      const total = dto.nrs2002.nutritionalStatus + dto.nrs2002.diseaseSeverity + (dto.nrs2002.age70plus ? 1 : 0);
      nrs2002Result = {
        totalScore: total,
        atRisk: total >= 3,
        recommendation: total >= 3 ? 'Iniciar terapia nutricional' : 'Reavaliar semanalmente',
      };
    }

    let sgaResult: Record<string, unknown> | undefined;
    if (dto.sga) {
      sgaResult = {
        classification: dto.sga.classification,
        description: { A: 'Bem nutrido', B: 'Desnutricao moderada', C: 'Desnutricao grave' }[dto.sga.classification],
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:NUTRITION]`,
        content: JSON.stringify({
          documentType: 'NUTRITION_ASSESSMENT',
          nrs2002: nrs2002Result,
          sga: sgaResult,
          mealPlan: dto.mealPlan,
          anthropometry: dto.anthropometry,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, nrs2002: nrs2002Result, sga: sgaResult, createdAt: doc.createdAt };
  }

  // ─── Physiotherapy ─────────────────────────────────────────────────────

  async createPhysiotherapyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      mrc?: Array<{ muscleGroup: string; side: string; grade: number }>;
      goniometry?: Array<{ joint: string; movement: string; activeROM: number; passiveROM: number; normalROM: number }>;
      sixMinWalk?: { distance: number; restStops: number; initialSpO2: number; finalSpO2: number; initialHR: number; maxHR: number; borgScale: number };
      barthel?: { items: Array<{ activity: string; score: number }>; totalScore?: number };
      fim?: { items: Array<{ category: string; score: number }>; totalScore?: number };
      rehabPlan?: { goals: string[]; interventions: string[]; frequency: string; duration: string };
    },
  ) {
    // MRC sum score for ICU-acquired weakness
    let mrcSum: Record<string, unknown> | undefined;
    if (dto.mrc) {
      const totalMRC = dto.mrc.reduce((s, m) => s + m.grade, 0);
      mrcSum = {
        totalScore: totalMRC,
        maxScore: dto.mrc.length * 5,
        icuAcquiredWeakness: totalMRC < 48,
        interpretation: totalMRC < 36 ? 'Fraqueza grave' : totalMRC < 48 ? 'Fraqueza muscular adquirida em UTI' : 'Forca preservada',
      };
    }

    // 6MWT interpretation
    let sixMWTResult: Record<string, unknown> | undefined;
    if (dto.sixMinWalk) {
      const smw = dto.sixMinWalk;
      sixMWTResult = {
        ...smw,
        desaturation: smw.finalSpO2 < smw.initialSpO2 - 4,
        belowExpected: smw.distance < 350,
        interpretation: smw.distance >= 450 ? 'Capacidade funcional preservada' : smw.distance >= 350 ? 'Limitacao leve' : 'Limitacao significativa',
      };
    }

    // Barthel index
    let barthelResult: Record<string, unknown> | undefined;
    if (dto.barthel) {
      const total = dto.barthel.totalScore ?? dto.barthel.items.reduce((s, i) => s + i.score, 0);
      barthelResult = {
        totalScore: total,
        dependencyLevel: total <= 20 ? 'Total' : total <= 60 ? 'Grave' : total <= 90 ? 'Moderada' : total < 100 ? 'Leve' : 'Independente',
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PHYSIOTHERAPY]`,
        content: JSON.stringify({
          documentType: 'PHYSIOTHERAPY_RECORD',
          mrc: mrcSum,
          goniometry: dto.goniometry,
          sixMinuteWalk: sixMWTResult,
          barthel: barthelResult,
          fim: dto.fim,
          rehabPlan: dto.rehabPlan,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, mrc: mrcSum, sixMinuteWalk: sixMWTResult, barthel: barthelResult, createdAt: doc.createdAt };
  }

  // ─── Speech Therapy ────────────────────────────────────────────────────

  async createSpeechTherapyRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      swallowingAssessment?: {
        oralPhase: string;
        pharyngealPhase: string;
        consistenciesTested: Array<{ consistency: string; safe: boolean; signs: string[] }>;
        aspiration: boolean;
        recommendation: string;
      };
      fois?: number; // Functional Oral Intake Scale 1-7
      voiceTherapy?: { diagnosis: string; therapy: string; progress: string };
      languageTherapy?: { diagnosis: string; therapy: string; progress: string };
    },
  ) {
    const foisDescriptions: Record<number, string> = {
      1: 'Nada por via oral',
      2: 'Dependente de via alternativa, minima VO',
      3: 'Dependente de via alternativa, VO consistente',
      4: 'VO total de uma unica consistencia',
      5: 'VO total, multiplas consistencias com preparo especial',
      6: 'VO total sem preparo especial, restricoes',
      7: 'VO total sem restricoes',
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:SPEECH_THERAPY] FOIS:${dto.fois ?? 'N/A'}`,
        content: JSON.stringify({
          documentType: 'SPEECH_THERAPY_RECORD',
          swallowingAssessment: dto.swallowingAssessment,
          fois: dto.fois ? { level: dto.fois, description: foisDescriptions[dto.fois] ?? 'Nivel invalido' } : undefined,
          voiceTherapy: dto.voiceTherapy,
          languageTherapy: dto.languageTherapy,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, fois: dto.fois, createdAt: doc.createdAt };
  }

  // ─── Occupational Therapy ──────────────────────────────────────────────

  async createOTRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      adlAssessment?: Array<{ activity: string; independenceLevel: string; notes?: string }>;
      katzIndex?: { bathing: number; dressing: number; toileting: number; transferring: number; continence: number; feeding: number };
      assistiveTechnology?: Array<{ device: string; purpose: string; prescribed: boolean; training: string }>;
      homeAdaptation?: Array<{ area: string; modification: string; priority: string; status: string }>;
    },
  ) {
    // Katz index calculation
    let katzResult: Record<string, unknown> | undefined;
    if (dto.katzIndex) {
      const k = dto.katzIndex;
      const total = k.bathing + k.dressing + k.toileting + k.transferring + k.continence + k.feeding;
      katzResult = {
        totalScore: total,
        maxScore: 6,
        classification: total === 6 ? 'Independente' : total >= 4 ? 'Dependencia parcial' : total >= 2 ? 'Dependencia importante' : 'Dependencia total',
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:OT] Katz:${katzResult?.totalScore ?? 'N/A'}`,
        content: JSON.stringify({
          documentType: 'OT_RECORD',
          adlAssessment: dto.adlAssessment,
          katzIndex: katzResult,
          assistiveTechnology: dto.assistiveTechnology,
          homeAdaptation: dto.homeAdaptation,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, katzIndex: katzResult, createdAt: doc.createdAt };
  }

  // ─── Social Work ───────────────────────────────────────────────────────

  async createSocialWorkRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      socioeconomic?: { familyIncome: number; householdMembers: number; housingType: string; sanitation: boolean; bolsaFamilia: boolean; sus: boolean };
      supportNetwork?: { primaryCaregiver?: string; familySupport: string; communitySupport?: string };
      vulnerability?: { factors: string[]; riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' };
      referrals?: Array<{ service: string; type: 'CRAS' | 'CREAS' | 'CAPS' | 'OTHER'; reason: string; status: string }>;
    },
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:SOCIAL_WORK] Vuln:${dto.vulnerability?.riskLevel ?? 'N/A'}`,
        content: JSON.stringify({
          documentType: 'SOCIAL_WORK_RECORD',
          socioeconomic: dto.socioeconomic,
          supportNetwork: dto.supportNetwork,
          vulnerability: dto.vulnerability,
          referrals: dto.referrals,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, vulnerability: dto.vulnerability, createdAt: doc.createdAt };
  }

  // ─── Palliative Care ───────────────────────────────────────────────────

  async createPalliativeCareRecord(
    tenantId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      authorId: string;
      pps?: number; // Palliative Performance Scale 0-100
      esas?: { pain: number; tiredness: number; nausea: number; depression: number; anxiety: number; drowsiness: number; appetite: number; wellbeing: number; dyspnea: number; other?: { symptom: string; score: number } };
      karnofsky?: number; // 0-100
      advanceDirectives?: { hasDirective: boolean; documentDate?: string; healthcareProxy?: string; preferences: string[]; dnr?: boolean; comfortCareOnly?: boolean };
      endOfLifePlan?: { goals: string[]; symptomManagement: string; familyMeeting: boolean; spiritualCare?: string; location: string };
    },
  ) {
    // PPS interpretation
    let ppsInterpretation: string | undefined;
    if (dto.pps !== undefined) {
      if (dto.pps >= 70) ppsInterpretation = 'Transitorio — ainda possivel tratamento ativo';
      else if (dto.pps >= 40) ppsInterpretation = 'Estavel — cuidados paliativos indicados';
      else if (dto.pps >= 20) ppsInterpretation = 'Fase de declinio — prognostico reservado';
      else ppsInterpretation = 'Fase terminal — conforto e dignidade';
    }

    // ESAS total symptom burden
    let esasResult: Record<string, unknown> | undefined;
    if (dto.esas) {
      const e = dto.esas;
      const total = e.pain + e.tiredness + e.nausea + e.depression + e.anxiety + e.drowsiness + e.appetite + e.wellbeing + e.dyspnea;
      esasResult = {
        ...e,
        totalSymptomBurden: total,
        highestSymptom: Object.entries(e).filter(([k]) => k !== 'other').reduce((a, [k, v]) => (typeof v === 'number' && v > (a.score ?? 0) ? { symptom: k, score: v } : a), { symptom: '', score: 0 }),
        needsIntervention: total > 45 || e.pain >= 7,
      };
    }

    // Karnofsky interpretation
    let karnofskyInterpretation: string | undefined;
    if (dto.karnofsky !== undefined) {
      if (dto.karnofsky >= 80) karnofskyInterpretation = 'Capaz de atividades normais';
      else if (dto.karnofsky >= 50) karnofskyInterpretation = 'Incapaz de trabalhar, autocuidado possivel';
      else if (dto.karnofsky >= 20) karnofskyInterpretation = 'Requer assistencia consideravel';
      else karnofskyInterpretation = 'Muito debilitado — cuidados terminais';
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: dto.authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SPECIALTY:PALLIATIVE_CARE] PPS:${dto.pps ?? 'N/A'} KPS:${dto.karnofsky ?? 'N/A'}`,
        content: JSON.stringify({
          documentType: 'PALLIATIVE_CARE_RECORD',
          pps: dto.pps !== undefined ? { score: dto.pps, interpretation: ppsInterpretation } : undefined,
          esas: esasResult,
          karnofsky: dto.karnofsky !== undefined ? { score: dto.karnofsky, interpretation: karnofskyInterpretation } : undefined,
          advanceDirectives: dto.advanceDirectives,
          endOfLifePlan: dto.endOfLifePlan,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, ppsInterpretation, karnofskyInterpretation, esas: esasResult, createdAt: doc.createdAt };
  }

  // ─── Generic query for any specialty record ────────────────────────────

  async getSpecialtyRecords(tenantId: string, patientId: string, specialty?: string) {
    const titleFilter = specialty ? `[SPECIALTY:${specialty.toUpperCase()}` : '[SPECIALTY:';

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: titleFilter },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
      },
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
