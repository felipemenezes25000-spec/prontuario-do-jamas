import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecordEcgDto,
  EchocardiogramDto,
  CatheterizationDto,
  HolterDto,
  StressTestDto,
} from './dto/cardiology.dto';

export interface CardiologyRecord {
  id: string;
  patientId: string;
  encounterId: string | null;
  examResultId: string;
  type: 'ECG' | 'ECHO' | 'CATHETERIZATION' | 'HOLTER' | 'STRESS_TEST';
  data: Record<string, unknown>;
  tenantId: string;
  performedById: string;
  createdAt: Date;
}

@Injectable()
export class CardiologyService {
  private records: CardiologyRecord[] = [];

  constructor(private readonly prisma: PrismaService) {}

  private async createRecord(
    tenantId: string,
    userId: string,
    patientId: string,
    encounterId: string | undefined,
    type: CardiologyRecord['type'],
    examName: string,
    data: Record<string, unknown>,
    interpretation: string,
  ): Promise<CardiologyRecord> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const examResult = await this.prisma.examResult.create({
      data: {
        patientId,
        encounterId,
        examName,
        examType: 'FUNCTIONAL',
        requestedById: userId,
        requestedAt: new Date(),
        status: 'COMPLETED',
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: userId,
        radiologistReport: interpretation,
        labResults: data as never,
      },
    });

    const record: CardiologyRecord = {
      id: crypto.randomUUID(),
      patientId,
      encounterId: encounterId ?? null,
      examResultId: examResult.id,
      type,
      data,
      tenantId,
      performedById: userId,
      createdAt: new Date(),
    };

    this.records.push(record);
    return record;
  }

  async recordEcg(tenantId: string, userId: string, dto: RecordEcgDto) {
    return this.createRecord(
      tenantId,
      userId,
      dto.patientId,
      dto.encounterId,
      'ECG',
      'Eletrocardiograma (ECG)',
      {
        heartRate: dto.heartRate,
        rhythm: dto.rhythm,
        axis: dto.axis,
        prInterval: dto.prInterval,
        qrsDuration: dto.qrsDuration,
        qtcInterval: dto.qtcInterval,
        stChanges: dto.stChanges,
        findings: dto.findings,
        isNormal: dto.isNormal,
        fileUrl: dto.fileUrl,
      },
      dto.interpretation,
    );
  }

  async recordEcho(tenantId: string, userId: string, dto: EchocardiogramDto) {
    return this.createRecord(
      tenantId,
      userId,
      dto.patientId,
      dto.encounterId,
      'ECHO',
      'Ecocardiograma',
      {
        lvef: dto.lvef,
        lvedd: dto.lvedd,
        lvesd: dto.lvesd,
        leftAtrium: dto.leftAtrium,
        aorticRoot: dto.aorticRoot,
        rvFunction: dto.rvFunction,
        valvularFindings: dto.valvularFindings,
        pericardialEffusion: dto.pericardialEffusion,
        wallMotion: dto.wallMotion,
        diastolicFunction: dto.diastolicFunction,
      },
      dto.impression,
    );
  }

  async recordCatheterization(tenantId: string, userId: string, dto: CatheterizationDto) {
    return this.createRecord(
      tenantId,
      userId,
      dto.patientId,
      dto.encounterId,
      'CATHETERIZATION',
      'Cateterismo Cardiaco',
      {
        accessSite: dto.accessSite,
        coronaryFindings: dto.coronaryFindings,
        lvef: dto.lvef,
        interventions: dto.interventions,
        stentsPlaced: dto.stentsPlaced,
        hemodynamicData: dto.hemodynamicData,
        contrastVolumeMl: dto.contrastVolumeMl,
        fluoroscopyTimeMin: dto.fluoroscopyTimeMin,
        complications: dto.complications,
      },
      dto.impression,
    );
  }

  async recordHolter(tenantId: string, userId: string, dto: HolterDto) {
    return this.createRecord(
      tenantId,
      userId,
      dto.patientId,
      dto.encounterId,
      'HOLTER',
      'Holter 24h',
      {
        durationHours: dto.durationHours,
        totalBeats: dto.totalBeats,
        minHr: dto.minHr,
        maxHr: dto.maxHr,
        meanHr: dto.meanHr,
        sveCount: dto.sveCount,
        veCount: dto.veCount,
        pauseCount: dto.pauseCount,
        afEpisodes: dto.afEpisodes,
        stEvents: dto.stEvents,
      },
      dto.interpretation,
    );
  }

  async recordStressTest(tenantId: string, userId: string, dto: StressTestDto) {
    return this.createRecord(
      tenantId,
      userId,
      dto.patientId,
      dto.encounterId,
      'STRESS_TEST',
      'Teste Ergometrico',
      {
        protocol: dto.protocol,
        durationMin: dto.durationMin,
        restingHr: dto.restingHr,
        peakHr: dto.peakHr,
        targetHr: dto.targetHr,
        percentTargetHr: dto.percentTargetHr,
        metsAchieved: dto.metsAchieved,
        restingBp: dto.restingBp,
        peakBp: dto.peakBp,
        stChanges: dto.stChanges,
        symptoms: dto.symptoms,
        stopReason: dto.stopReason,
        result: dto.result,
      },
      dto.interpretation,
    );
  }

  // ─── Cardiovascular Risk Scores ──────────────────────────────────────

  async calculateFramingham(
    _tenantId: string,
    params: { age: number; gender: string; totalCholesterol: number; hdl: number; systolicBP: number; smoker: boolean; diabetic: boolean; bpTreated: boolean },
  ) {
    const { age, gender, totalCholesterol, hdl, systolicBP, smoker, diabetic, bpTreated } = params;
    // Simplified Framingham Risk Score calculation (stub with realistic values)
    let points = 0;
    if (gender === 'M') {
      if (age >= 60) points += 11; else if (age >= 55) points += 10; else if (age >= 50) points += 8; else if (age >= 45) points += 6; else if (age >= 40) points += 3;
      if (totalCholesterol >= 280) points += 3; else if (totalCholesterol >= 240) points += 2; else if (totalCholesterol >= 200) points += 1;
      if (hdl < 40) points += 2; else if (hdl < 50) points += 1;
      if (systolicBP >= 160) points += bpTreated ? 3 : 2; else if (systolicBP >= 140) points += bpTreated ? 2 : 1;
      if (smoker) points += 4;
      if (diabetic) points += 3;
    } else {
      if (age >= 60) points += 8; else if (age >= 55) points += 7; else if (age >= 50) points += 5; else if (age >= 45) points += 3;
      if (totalCholesterol >= 280) points += 3; else if (totalCholesterol >= 240) points += 2;
      if (hdl < 40) points += 2; else if (hdl < 50) points += 1;
      if (systolicBP >= 160) points += bpTreated ? 4 : 3; else if (systolicBP >= 140) points += bpTreated ? 3 : 2;
      if (smoker) points += 3;
      if (diabetic) points += 4;
    }
    const risk10y = Math.min(Math.max(points * 1.5, 1), 50);
    let riskCategory = 'BAIXO';
    if (risk10y >= 20) riskCategory = 'ALTO';
    else if (risk10y >= 10) riskCategory = 'INTERMEDIÁRIO';

    return {
      score: points,
      risk10Year: Math.round(risk10y * 10) / 10,
      riskCategory,
      interpretation: `Risco cardiovascular em 10 anos: ${Math.round(risk10y)}% (${riskCategory})`,
      recommendation: risk10y >= 20
        ? 'Alto risco — considerar estatina e AAS. Meta LDL < 70 mg/dL.'
        : risk10y >= 10
        ? 'Risco intermediário — considerar estatina se LDL > 100. Intensificar mudanças de estilo de vida.'
        : 'Baixo risco — manter estilo de vida saudável. Reavaliar em 5 anos.',
    };
  }

  async calculateAscvd(
    _tenantId: string,
    params: { age: number; gender: string; race: string; totalCholesterol: number; hdl: number; systolicBP: number; bpTreated: boolean; diabetic: boolean; smoker: boolean },
  ) {
    const { age, gender, totalCholesterol, hdl, systolicBP, diabetic, smoker } = params;
    // Simplified ASCVD pooled cohort equations (stub)
    let base = 0.05;
    base += (age - 40) * 0.002;
    base += (totalCholesterol - 170) * 0.0001;
    base -= (hdl - 50) * 0.0003;
    base += (systolicBP - 120) * 0.0005;
    if (diabetic) base += 0.04;
    if (smoker) base += 0.03;
    if (gender === 'M') base += 0.02;
    const risk = Math.min(Math.max(base * 100, 0.5), 50);

    return {
      risk10Year: Math.round(risk * 10) / 10,
      riskCategory: risk >= 20 ? 'HIGH' : risk >= 7.5 ? 'BORDERLINE_HIGH' : risk >= 5 ? 'BORDERLINE' : 'LOW',
      statinBenefit: risk >= 7.5,
      aspirinConsider: risk >= 10 && age >= 50,
      interpretation: `Risco ASCVD em 10 anos: ${Math.round(risk * 10) / 10}%`,
    };
  }

  async calculateChadsVasc(
    _tenantId: string,
    params: { chf: boolean; hypertension: boolean; age: number; diabetes: boolean; stroke: boolean; vascularDisease: boolean; gender: string },
  ) {
    const { chf, hypertension, age, diabetes, stroke, vascularDisease, gender } = params;
    let score = 0;
    if (chf) score += 1;
    if (hypertension) score += 1;
    if (age >= 75) score += 2; else if (age >= 65) score += 1;
    if (diabetes) score += 1;
    if (stroke) score += 2;
    if (vascularDisease) score += 1;
    if (gender === 'F') score += 1;

    const riskPerYear: Record<number, number> = { 0: 0, 1: 1.3, 2: 2.2, 3: 3.2, 4: 4.0, 5: 6.7, 6: 9.8, 7: 9.6, 8: 6.7, 9: 15.2 };
    const annualRisk = riskPerYear[Math.min(score, 9)] ?? 15.2;

    let anticoagulation = 'Nenhuma';
    if (score >= 2) anticoagulation = 'Anticoagulação oral recomendada (DOACs preferencialmente)';
    else if (score === 1 && gender === 'M') anticoagulation = 'Considerar anticoagulação oral';

    return {
      score,
      annualStrokeRisk: annualRisk,
      recommendation: anticoagulation,
      interpretation: `CHA₂DS₂-VASc = ${score}. Risco anual de AVC: ${annualRisk}%.`,
      factors: {
        chf: chf ? 1 : 0,
        hypertension: hypertension ? 1 : 0,
        age: age >= 75 ? 2 : age >= 65 ? 1 : 0,
        diabetes: diabetes ? 1 : 0,
        stroke: stroke ? 2 : 0,
        vascularDisease: vascularDisease ? 1 : 0,
        femaleSex: gender === 'F' ? 1 : 0,
      },
    };
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const records = this.records.filter(
      (r) => r.patientId === patientId && r.tenantId === tenantId,
    );

    const byType = {
      ecgs: records.filter((r) => r.type === 'ECG'),
      echocardiograms: records.filter((r) => r.type === 'ECHO'),
      catheterizations: records.filter((r) => r.type === 'CATHETERIZATION'),
      holters: records.filter((r) => r.type === 'HOLTER'),
      stressTests: records.filter((r) => r.type === 'STRESS_TEST'),
    };

    return {
      patientId,
      patientName: patient.fullName,
      totalRecords: records.length,
      ...byType,
    };
  }
}
