import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterSampleDto,
  UpdateSampleStatusDto,
  QualityControlEntryDto,
  AutoReleaseDto,
  AnalyzerResultDto,
  SampleStatus,
} from './dto/register-sample.dto';
import {
  CreateReflexRuleDto,
  RequestAddOnDto,
  RecordPocResultDto,
  InterpretLabPanelDto,
  PredictResultDto,
  DetectSampleSwapDto,
} from './dto/lis-advanced.dto';
import {
  MarkCollectedDto,
  PhlebotomyWorklistItem,
  PhlebotomyStats,
  PhlebotomyUrgency,
  TubeNeeded,
} from './dto/phlebotomy.dto';

export interface QcPoint {
  id: string;
  analyzerId: string;
  analyte: string;
  level: string;
  measuredValue: number;
  expectedMean: number;
  expectedSd: number;
  zScore: number;
  isAccepted: boolean;
  lotNumber: string | null;
  createdAt: Date;
}

export interface LabSample {
  id: string;
  barcode: string;
  patientId: string;
  encounterId: string | null;
  sampleType: string;
  status: string;
  collectionSite: string | null;
  collectedAt: Date | null;
  collectorId: string | null;
  examRequestIds: string[];
  notes: string | null;
  rejectionReason: string | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LisService {
  // In-memory stores for data not in Prisma schema (would be separate tables in production)
  private samples: LabSample[] = [];
  private qcEntries: QcPoint[] = [];
  private reflexRules: Array<CreateReflexRuleDto & { id: string; tenantId: string; createdAt: Date }> = [];
  private addOnRequests: Array<{ id: string; tenantId: string; barcode: string; testName: string; testCode: string; patientId: string; encounterId: string | null; justification: string | null; status: string; createdAt: Date }> = [];
  private pocResults: Array<{ id: string; tenantId: string } & Omit<RecordPocResultDto, 'results'> & { results: RecordPocResultDto['results']; createdAt: Date }> = [];

  constructor(private readonly prisma: PrismaService) {}

  async registerSample(tenantId: string, userId: string, dto: RegisterSampleDto) {
    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Check barcode uniqueness within tenant
    const existingSample = this.samples.find(
      (s) => s.barcode === dto.barcode && s.tenantId === tenantId,
    );
    if (existingSample) {
      throw new BadRequestException(`Barcode "${dto.barcode}" already registered`);
    }

    const sample: LabSample = {
      id: crypto.randomUUID(),
      barcode: dto.barcode,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      sampleType: dto.sampleType,
      status: SampleStatus.REGISTERED,
      collectionSite: dto.collectionSite ?? null,
      collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : null,
      collectorId: dto.collectorId ?? null,
      examRequestIds: dto.examRequestIds,
      notes: dto.notes ?? null,
      rejectionReason: null,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.samples.push(sample);

    // Update linked exam results to COLLECTED status
    if (dto.examRequestIds.length > 0) {
      await this.prisma.examResult.updateMany({
        where: { id: { in: dto.examRequestIds } },
        data: { status: 'COLLECTED', collectedAt: new Date() },
      });
    }

    return sample;
  }

  async updateSampleStatus(tenantId: string, id: string, dto: UpdateSampleStatusDto) {
    const sample = this.samples.find((s) => s.id === id && s.tenantId === tenantId);
    if (!sample) {
      throw new NotFoundException(`Sample "${id}" not found`);
    }

    if (dto.status === SampleStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a sample');
    }

    sample.status = dto.status;
    sample.rejectionReason = dto.rejectionReason ?? sample.rejectionReason;
    sample.notes = dto.notes ?? sample.notes;
    sample.updatedAt = new Date();

    // Update linked exams status mapping
    const examStatusMap: Record<string, string> = {
      [SampleStatus.COLLECTED]: 'COLLECTED',
      [SampleStatus.RECEIVED]: 'COLLECTED',
      [SampleStatus.PROCESSING]: 'IN_PROGRESS',
      [SampleStatus.COMPLETED]: 'COMPLETED',
      [SampleStatus.REJECTED]: 'CANCELLED',
    };

    const examStatus = examStatusMap[dto.status];
    if (examStatus && sample.examRequestIds.length > 0) {
      await this.prisma.examResult.updateMany({
        where: { id: { in: sample.examRequestIds } },
        data: { status: examStatus as never },
      });
    }

    return sample;
  }

  async listSamples(
    tenantId: string,
    filters: { status?: string; patientId?: string; barcode?: string; page?: number; pageSize?: number },
  ) {
    let filtered = this.samples.filter((s) => s.tenantId === tenantId);

    if (filters.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }
    if (filters.patientId) {
      filtered = filtered.filter((s) => s.patientId === filters.patientId);
    }
    if (filters.barcode) {
      filtered = filtered.filter((s) => s.barcode.includes(filters.barcode!));
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const total = filtered.length;
    const data = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * pageSize, page * pageSize);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async addQualityControl(tenantId: string, dto: QualityControlEntryDto) {
    const zScore = (dto.measuredValue - dto.expectedMean) / dto.expectedSd;
    const isAccepted = Math.abs(zScore) <= 2; // Westgard 1-2s rule

    const entry: QcPoint = {
      id: crypto.randomUUID(),
      analyzerId: dto.analyzerId,
      analyte: dto.analyte,
      level: dto.level,
      measuredValue: dto.measuredValue,
      expectedMean: dto.expectedMean,
      expectedSd: dto.expectedSd,
      zScore: Math.round(zScore * 100) / 100,
      isAccepted,
      lotNumber: dto.lotNumber ?? null,
      createdAt: new Date(),
    };

    this.qcEntries.push(entry);

    return {
      ...entry,
      westgardRules: {
        '1_2s': Math.abs(zScore) > 2,
        '1_3s': Math.abs(zScore) > 3,
        '2_2s': false, // Would need consecutive points
        'R_4s': false,
      },
      status: isAccepted ? 'ACCEPTED' : 'REJECTED',
    };
  }

  async getQcCharts(analyzerId: string, analyte?: string, days?: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days ?? 30));

    let entries = this.qcEntries.filter(
      (e) => e.analyzerId === analyzerId && e.createdAt >= cutoff,
    );

    if (analyte) {
      entries = entries.filter((e) => e.analyte === analyte);
    }

    const grouped = entries.reduce<Record<string, QcPoint[]>>((acc, e) => {
      const key = `${e.analyte}_${e.level}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {});

    return {
      analyzerId,
      period: { from: cutoff.toISOString(), to: new Date().toISOString() },
      charts: Object.entries(grouped).map(([_key, points]) => ({
        analyte: points[0].analyte,
        level: points[0].level,
        points: points.map((p) => ({
          date: p.createdAt.toISOString(),
          value: p.measuredValue,
          zScore: p.zScore,
          isAccepted: p.isAccepted,
        })),
        mean: points[0].expectedMean,
        sd: points[0].expectedSd,
        totalPoints: points.length,
        rejectedCount: points.filter((p) => !p.isAccepted).length,
      })),
    };
  }

  async autoRelease(tenantId: string, examId: string, dto: AutoReleaseDto) {
    const exam = await this.prisma.examResult.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam "${examId}" not found`);
    }

    if (exam.status !== 'IN_PROGRESS' && exam.status !== 'COLLECTED') {
      throw new BadRequestException(`Exam status "${exam.status}" is not eligible for auto-release`);
    }

    const labResults = exam.labResults as unknown as Array<{
      analyte: string;
      value: string;
      referenceMin?: number;
      referenceMax?: number;
      flag?: string;
    }> | null;

    if (!labResults || !Array.isArray(labResults)) {
      throw new BadRequestException('No lab results available for auto-release check');
    }

    // Check if all results are within normal ranges
    const outOfRange = labResults.filter((r) => {
      const numVal = parseFloat(String(r.value).replace(',', '.'));
      if (isNaN(numVal)) return true;
      if (r.referenceMin !== undefined && numVal < r.referenceMin) return true;
      if (r.referenceMax !== undefined && numVal > r.referenceMax) return true;
      return r.flag === 'CRITICAL';
    });

    const canAutoRelease = outOfRange.length === 0 || dto.forceRelease;

    if (canAutoRelease) {
      await this.prisma.examResult.update({
        where: { id: examId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          reviewedAt: new Date(),
        },
      });

      return {
        released: true,
        examId,
        outOfRangeCount: outOfRange.length,
        forced: dto.forceRelease ?? false,
      };
    }

    return {
      released: false,
      examId,
      outOfRangeCount: outOfRange.length,
      outOfRangeAnalytes: outOfRange.map((r) => r.analyte),
      message: 'Results contain out-of-range values. Manual review required.',
    };
  }

  async deltaCheck(tenantId: string, patientId: string, analyte?: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const recentExams = await this.prisma.examResult.findMany({
      where: {
        patientId,
        status: { in: ['COMPLETED', 'REVIEWED'] },
        labResults: { not: null as unknown as undefined },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    interface AnalyteValue {
      analyte: string;
      value: number;
      unit: string;
      date: string;
    }

    const analyteHistory: Record<string, AnalyteValue[]> = {};

    for (const exam of recentExams) {
      const results = exam.labResults as unknown as Array<{
        analyte: string;
        value: string;
        unit?: string;
      }>;
      if (!Array.isArray(results)) continue;

      for (const r of results) {
        if (analyte && !r.analyte.toLowerCase().includes(analyte.toLowerCase())) continue;
        const numVal = parseFloat(String(r.value).replace(',', '.'));
        if (isNaN(numVal)) continue;

        if (!analyteHistory[r.analyte]) analyteHistory[r.analyte] = [];
        analyteHistory[r.analyte].push({
          analyte: r.analyte,
          value: numVal,
          unit: r.unit ?? '',
          date: (exam.completedAt ?? exam.createdAt).toISOString(),
        });
      }
    }

    const deltaResults = Object.entries(analyteHistory)
      .filter(([, values]) => values.length >= 2)
      .map(([analyteName, values]) => {
        const sorted = values.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const current = sorted[0];
        const previous = sorted[1];
        const absoluteDelta = current.value - previous.value;
        const percentDelta = previous.value !== 0
          ? Math.round(((current.value - previous.value) / previous.value) * 10000) / 100
          : null;

        // Flag significant changes (>50% change is commonly flagged)
        const isFlagged = percentDelta !== null && Math.abs(percentDelta) > 50;

        return {
          analyte: analyteName,
          currentValue: current.value,
          previousValue: previous.value,
          unit: current.unit,
          absoluteDelta: Math.round(absoluteDelta * 100) / 100,
          percentDelta,
          currentDate: current.date,
          previousDate: previous.date,
          isFlagged,
        };
      });

    return {
      patientId,
      totalAnalytes: deltaResults.length,
      flaggedCount: deltaResults.filter((d) => d.isFlagged).length,
      results: deltaResults,
    };
  }

  async getWorklist(tenantId: string, filters: { status?: string; priority?: string; date?: string }) {
    const where: Record<string, unknown> = {
      patient: { tenantId },
      status: { in: ['REQUESTED', 'SCHEDULED', 'COLLECTED', 'IN_PROGRESS'] },
      examType: 'LABORATORY',
    };

    if (filters.status) {
      where.status = filters.status;
    }

    const exams = await this.prisma.examResult.findMany({
      where,
      orderBy: [{ requestedAt: 'asc' }],
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    // Enrich with sample info
    return exams.map((exam) => {
      const sample = this.samples.find((s) => s.examRequestIds.includes(exam.id));
      return {
        ...exam,
        sample: sample
          ? { id: sample.id, barcode: sample.barcode, status: sample.status }
          : null,
      };
    });
  }

  // ─── Reflex Testing ───────────────────────────────────────────────────────

  async createReflexRule(tenantId: string, dto: CreateReflexRuleDto) {
    const rule = { id: crypto.randomUUID(), tenantId, ...dto, createdAt: new Date() };
    this.reflexRules.push(rule);
    return rule;
  }

  async getReflexRules(tenantId: string) {
    return this.reflexRules.filter((r) => r.tenantId === tenantId);
  }

  // ─── Add-on Testing ───────────────────────────────────────────────────────

  async requestAddOn(tenantId: string, dto: RequestAddOnDto) {
    const sample = this.samples.find((s) => s.barcode === dto.barcode && s.tenantId === tenantId);
    if (!sample) {
      throw new NotFoundException(`Sample with barcode "${dto.barcode}" not found`);
    }

    // Stability check: reject add-ons on samples older than 72 h
    const ageHours = sample.collectedAt
      ? (Date.now() - sample.collectedAt.getTime()) / 3_600_000
      : 0;
    if (ageHours > 72) {
      throw new BadRequestException('Sample too old for add-on testing (>72 h from collection)');
    }
    if (sample.status === SampleStatus.REJECTED) {
      throw new BadRequestException('Cannot add test to a rejected sample');
    }

    const request = {
      id: crypto.randomUUID(),
      tenantId,
      barcode: dto.barcode,
      testName: dto.testName,
      testCode: dto.testCode,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      justification: dto.justification ?? null,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.addOnRequests.push(request);
    return { ...request, sampleAge: `${Math.round(ageHours * 10) / 10}h`, sampleStatus: sample.status };
  }

  // ─── POC Testing ──────────────────────────────────────────────────────────

  async recordPocResult(tenantId: string, dto: RecordPocResultDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const record = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      deviceType: dto.deviceType,
      deviceId: dto.deviceId,
      operatorId: dto.operatorId,
      results: dto.results,
      notes: dto.notes ?? null,
      createdAt: new Date(),
    };
    this.pocResults.push(record as typeof this.pocResults[number]);

    // Persist summary as clinical document
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: dto.operatorId,
        type: 'CUSTOM',
        title: `[LIS:POC] ${dto.deviceType} — ${dto.results.map((r) => r.analyte).join(', ')}`,
        content: JSON.stringify({ ...record }),
        status: 'FINAL',
        generatedByAI: false,
      },
    });

    const criticalResults = dto.results.filter((r) => r.flag === 'C');
    return { ...record, criticalCount: criticalResults.length, criticalAnalytes: criticalResults.map((r) => r.analyte) };
  }

  // ─── AI: Lab Panel Interpretation ─────────────────────────────────────────

  async interpretLabPanel(tenantId: string, dto: InterpretLabPanelDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const abnormal = dto.results.filter((r) => {
      const numVal = parseFloat(String(r.value).replace(',', '.'));
      if (isNaN(numVal)) return false;
      if (r.referenceMin !== undefined && numVal < r.referenceMin) return true;
      if (r.referenceMax !== undefined && numVal > r.referenceMax) return true;
      return r.flag === 'C' || r.flag === 'H' || r.flag === 'L';
    });

    // Heuristic interpretation patterns
    const interpretations: string[] = [];
    const rMap: Record<string, number> = {};
    for (const r of dto.results) {
      const v = parseFloat(String(r.value).replace(',', '.'));
      if (!isNaN(v)) rMap[r.analyte.toLowerCase()] = v;
    }

    if (rMap['hemoglobin'] !== undefined && rMap['hemoglobin'] < 12) interpretations.push('Anemia (Hb < 12 g/dL)');
    if (rMap['sodium'] !== undefined && rMap['sodium'] < 135) interpretations.push('Hiponatremia');
    if (rMap['sodium'] !== undefined && rMap['sodium'] > 145) interpretations.push('Hipernatremia');
    if (rMap['potassium'] !== undefined && rMap['potassium'] < 3.5) interpretations.push('Hipocalemia');
    if (rMap['potassium'] !== undefined && rMap['potassium'] > 5.5) interpretations.push('Hipercalemia');
    if (rMap['creatinine'] !== undefined && rMap['creatinine'] > 1.5) interpretations.push('Disfunção renal (creatinina elevada)');
    if (rMap['glucose'] !== undefined && rMap['glucose'] > 200) interpretations.push('Hiperglicemia significativa');
    if (rMap['glucose'] !== undefined && rMap['glucose'] < 70) interpretations.push('Hipoglicemia');
    if (rMap['leucocytes'] !== undefined && rMap['leucocytes'] > 12000) interpretations.push('Leucocitose (possível infecção/inflamação)');
    if (rMap['troponin'] !== undefined && rMap['troponin'] > 0.04) interpretations.push('Troponina elevada — investigar SCA');
    if (rMap['lactate'] !== undefined && rMap['lactate'] > 2) interpretations.push('Hiperlactacidemia — investigar hipoperfusão');
    if (interpretations.length === 0) interpretations.push('Painel dentro dos parâmetros normais');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: 'AI_SYSTEM',
        type: 'CUSTOM',
        title: `[LIS:AI_INTERPRETATION] Interpretação de Painel Laboratorial`,
        content: JSON.stringify({ results: dto.results, interpretations, abnormalCount: abnormal.length, clinicalContext: dto.clinicalContext }),
        status: 'DRAFT',
        generatedByAI: true,
      },
    });

    return {
      documentId: doc.id,
      patientId: dto.patientId,
      totalResults: dto.results.length,
      abnormalCount: abnormal.length,
      abnormalAnalytes: abnormal.map((r) => r.analyte),
      interpretations,
      disclaimer: 'Interpretação assistida por IA — revisão médica obrigatória',
    };
  }

  // ─── AI: Result Prediction ────────────────────────────────────────────────

  async predictResult(tenantId: string, dto: PredictResultDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    // Retrieve historical results for trend analysis
    const recentExams = await this.prisma.examResult.findMany({
      where: { patientId: dto.patientId, status: { in: ['COMPLETED', 'REVIEWED'] } },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    const historicalValues: number[] = [];
    for (const exam of recentExams) {
      const results = exam.labResults as unknown as Array<{ analyte: string; value: string }>;
      if (!Array.isArray(results)) continue;
      for (const r of results) {
        if (r.analyte.toLowerCase().includes(dto.analyte.toLowerCase())) {
          const v = parseFloat(String(r.value).replace(',', '.'));
          if (!isNaN(v)) historicalValues.push(v);
        }
      }
    }

    if (historicalValues.length < 2) {
      return {
        patientId: dto.patientId,
        analyte: dto.analyte,
        prediction: null,
        confidence: 0,
        message: 'Dados históricos insuficientes para predição (mínimo 2 resultados anteriores)',
      };
    }

    // Simple linear trend
    const n = historicalValues.length;
    const mean = historicalValues.reduce((a, b) => a + b, 0) / n;
    const trend = historicalValues[0] - historicalValues[n - 1]; // positive = increasing recently
    const predictedValue = Math.round((historicalValues[0] + trend * 0.5) * 100) / 100;
    const stdDev = Math.sqrt(historicalValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    const confidence = Math.max(0, Math.min(100, Math.round(100 - (stdDev / mean) * 100)));

    return {
      patientId: dto.patientId,
      analyte: dto.analyte,
      historicalValues: historicalValues.slice(0, 5),
      predictedValue,
      trend: trend > 0 ? 'INCREASING' : trend < 0 ? 'DECREASING' : 'STABLE',
      confidence,
      disclaimer: 'Predição estatística — não substitui avaliação clínica',
    };
  }

  // ─── AI: Sample Swap Detection ────────────────────────────────────────────

  async detectSampleSwap(tenantId: string, dto: DetectSampleSwapDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const exam = await this.prisma.examResult.findUnique({ where: { id: dto.examResultId } });
    if (!exam) throw new NotFoundException(`Exam result "${dto.examResultId}" not found`);

    const labResults = exam.labResults as unknown as Array<{ analyte: string; value: string; unit?: string; flag?: string }>;
    if (!Array.isArray(labResults) || labResults.length === 0) {
      throw new BadRequestException('No lab results available for swap detection');
    }

    const swapFlags: string[] = [];

    const rMap: Record<string, number> = {};
    for (const r of labResults) {
      const v = parseFloat(String(r.value).replace(',', '.'));
      if (!isNaN(v)) rMap[r.analyte.toLowerCase()] = v;
    }

    // Demographic plausibility checks
    if (dto.includeDemographicCheck) {
      const patientGender = (patient as { gender?: string }).gender;
      if (patientGender === 'MALE') {
        if (rMap['hemoglobin'] !== undefined && rMap['hemoglobin'] > 0 && rMap['hemoglobin'] < 5)
          swapFlags.push('Hemoglobina implausível para dados demográficos');
        if (rMap['psa'] !== undefined && rMap['psa'] < 0)
          swapFlags.push('PSA inválido');
      }
      if (patientGender === 'FEMALE') {
        if (rMap['testosterone'] !== undefined && rMap['testosterone'] > 10)
          swapFlags.push('Testosterona total > 10 ng/mL incomum para sexo feminino — verificar amostra');
      }
    }

    // Physiological plausibility checks
    if (rMap['sodium'] !== undefined && (rMap['sodium'] < 100 || rMap['sodium'] > 180))
      swapFlags.push(`Sódio fora do intervalo fisiológico viável (${rMap['sodium']} mEq/L)`);
    if (rMap['potassium'] !== undefined && (rMap['potassium'] < 1 || rMap['potassium'] > 10))
      swapFlags.push(`Potássio fora do intervalo fisiológico viável (${rMap['potassium']} mEq/L)`);
    if (rMap['hemoglobin'] !== undefined && (rMap['hemoglobin'] < 2 || rMap['hemoglobin'] > 25))
      swapFlags.push(`Hemoglobina fora do intervalo fisiológico viável (${rMap['hemoglobin']} g/dL)`);
    if (rMap['glucose'] !== undefined && (rMap['glucose'] < 20 || rMap['glucose'] > 2000))
      swapFlags.push(`Glicose fora do intervalo fisiológico viável (${rMap['glucose']} mg/dL)`);
    if (rMap['ph'] !== undefined && (rMap['ph'] < 6.5 || rMap['ph'] > 8.0))
      swapFlags.push(`pH fora do intervalo fisiológico viável (${rMap['ph']})`);

    // Delta-check against prior results
    const prior = await this.prisma.examResult.findMany({
      where: { patientId: dto.patientId, status: { in: ['COMPLETED', 'REVIEWED'] }, id: { not: dto.examResultId } },
      orderBy: { completedAt: 'desc' },
      take: 3,
    });
    for (const prevExam of prior) {
      const prevResults = prevExam.labResults as unknown as Array<{ analyte: string; value: string }>;
      if (!Array.isArray(prevResults)) continue;
      for (const pr of prevResults) {
        const prevV = parseFloat(String(pr.value).replace(',', '.'));
        const currV = rMap[pr.analyte.toLowerCase()];
        if (isNaN(prevV) || currV === undefined) continue;
        const pct = Math.abs((currV - prevV) / (prevV || 1)) * 100;
        if (pct > 200 && Math.abs(currV - prevV) > 5) {
          swapFlags.push(`Delta crítico em ${pr.analyte}: variação de ${Math.round(pct)}% desde o último resultado`);
        }
      }
    }

    const swapSuspected = swapFlags.length > 0;
    return {
      patientId: dto.patientId,
      examResultId: dto.examResultId,
      swapSuspected,
      confidence: swapSuspected ? Math.min(100, swapFlags.length * 30) : 5,
      flags: swapFlags,
      recommendation: swapSuspected
        ? 'REPETIR COLETA — Possível troca de amostra detectada. Verificar identificação do tubo.'
        : 'Nenhuma inconsistência detectada. Amostra provavelmente íntegra.',
    };
  }

  async receiveAnalyzerResults(tenantId: string, dto: AnalyzerResultDto) {
    // Find sample by barcode
    const sample = this.samples.find(
      (s) => s.barcode === dto.barcode && s.tenantId === tenantId,
    );

    if (!sample) {
      throw new NotFoundException(`Sample with barcode "${dto.barcode}" not found`);
    }

    // Update linked exams with results
    const updatedExams: string[] = [];
    for (const examId of sample.examRequestIds) {
      const labResults = dto.results.map((r) => ({
        analyte: r.analyteName,
        analyteCode: r.analyteCode,
        value: r.value,
        unit: r.unit ?? '',
        flag: r.flag ?? null,
      }));

      await this.prisma.examResult.update({
        where: { id: examId },
        data: {
          labResults: labResults as never,
          status: 'IN_PROGRESS',
        },
      });
      updatedExams.push(examId);
    }

    sample.status = SampleStatus.PROCESSING;
    sample.updatedAt = new Date();

    return {
      sampleId: sample.id,
      barcode: dto.barcode,
      analyzerId: dto.analyzerId,
      resultsCount: dto.results.length,
      updatedExams,
      status: 'RESULTS_RECEIVED',
    };
  }

  // ─── Phlebotomy Worklist (Mapa de Coleta) ─────────────────────────────────

  async getPhlebotomyWorklist(
    tenantId: string,
    options: { ward?: string; date?: string; urgentFirst?: boolean },
  ): Promise<{ ward: string; items: PhlebotomyWorklistItem[] }[]> {
    // Get pending samples
    let pendingSamples = this.samples.filter(
      (s) => s.tenantId === tenantId && s.status === SampleStatus.REGISTERED,
    );

    // Filter by date if provided
    if (options.date) {
      const filterDate = new Date(options.date).toISOString().slice(0, 10);
      pendingSamples = pendingSamples.filter(
        (s) => s.createdAt.toISOString().slice(0, 10) === filterDate,
      );
    }

    // Fetch patient data for enrichment
    const patientIds = [...new Set(pendingSamples.map((s) => s.patientId))];
    const patients = patientIds.length > 0
      ? await this.prisma.patient.findMany({
          where: { id: { in: patientIds }, tenantId },
          select: { id: true, fullName: true },
        })
      : [];
    const patientMap = new Map(patients.map((p) => [p.id, p.fullName]));

    // Build worklist items with simulated ward/bed/urgency data
    const URGENCY_PRIORITY: Record<PhlebotomyUrgency, number> = {
      STAT: 0,
      URGENT: 1,
      ROUTINE: 2,
    };

    const TUBE_COLORS: Record<string, string> = {
      BLOOD: 'Roxo (EDTA)',
      URINE: 'Amarelo (Urina)',
      CSF: 'Transparente (LCR)',
      STOOL: 'Marrom',
      SPUTUM: 'Transparente',
      SWAB: 'Transparente',
      TISSUE: 'Formol',
      ASPIRATE: 'Citrato',
      OTHER: 'Cinza',
    };

    const items: PhlebotomyWorklistItem[] = pendingSamples.map((sample, idx) => {
      // Derive urgency heuristically from notes or exam count
      let urgency: PhlebotomyUrgency = 'ROUTINE';
      if (sample.notes?.toUpperCase().includes('STAT') || sample.notes?.toUpperCase().includes('EMERGÊNCIA')) {
        urgency = 'STAT';
      } else if (sample.notes?.toUpperCase().includes('URGENT') || sample.notes?.toUpperCase().includes('URGENTE')) {
        urgency = 'URGENT';
      }

      const ward = sample.collectionSite ?? `Andar ${(idx % 5) + 1}`;
      const room = `${(idx % 20) + 100}`;
      const bed = String.fromCharCode(65 + (idx % 4)); // A, B, C, D

      const tubesNeeded: TubeNeeded[] = [{
        color: TUBE_COLORS[sample.sampleType] ?? 'Cinza',
        sampleType: sample.sampleType,
        examName: sample.examRequestIds.length > 0
          ? `Exame(s): ${sample.examRequestIds.length}`
          : 'Coleta geral',
      }];

      const fastingRequired = sample.notes?.toUpperCase().includes('JEJUM') ?? false;

      return {
        sampleId: sample.id,
        patientId: sample.patientId,
        patientName: patientMap.get(sample.patientId) ?? 'Paciente desconhecido',
        room,
        bed,
        tubesNeeded,
        fastingRequired,
        specialInstructions: sample.notes,
        collectionTime: sample.createdAt.toISOString(),
        urgency,
        ward,
      };
    });

    // Filter by ward
    let filtered = items;
    if (options.ward) {
      filtered = items.filter((i) => i.ward.toLowerCase().includes(options.ward!.toLowerCase()));
    }

    // Sort by urgency if requested (default true)
    if (options.urgentFirst !== false) {
      filtered.sort((a, b) => URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency]);
    }

    // Group by ward
    const wardMap = new Map<string, PhlebotomyWorklistItem[]>();
    for (const item of filtered) {
      const existing = wardMap.get(item.ward);
      if (existing) {
        existing.push(item);
      } else {
        wardMap.set(item.ward, [item]);
      }
    }

    return Array.from(wardMap.entries()).map(([ward, wardItems]) => ({
      ward,
      items: wardItems,
    }));
  }

  async markCollected(
    tenantId: string,
    sampleId: string,
    dto: MarkCollectedDto,
  ): Promise<LabSample> {
    const sample = this.samples.find(
      (s) => s.id === sampleId && s.tenantId === tenantId,
    );
    if (!sample) {
      throw new NotFoundException(`Sample "${sampleId}" not found`);
    }

    if (sample.status !== SampleStatus.REGISTERED) {
      throw new BadRequestException(
        `Sample status is "${sample.status}" — only REGISTERED samples can be marked as collected`,
      );
    }

    sample.status = SampleStatus.COLLECTED;
    sample.collectedAt = new Date(dto.collectedAt);
    sample.collectorId = dto.collectedBy;
    if (dto.notes) {
      sample.notes = dto.notes;
    }
    sample.updatedAt = new Date();

    // Update linked exam results
    if (sample.examRequestIds.length > 0) {
      await this.prisma.examResult.updateMany({
        where: { id: { in: sample.examRequestIds } },
        data: { status: 'COLLECTED', collectedAt: new Date(dto.collectedAt) },
      });
    }

    return sample;
  }

  async getPhlebotomyStats(
    tenantId: string,
    date?: string,
  ): Promise<PhlebotomyStats> {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);

    const daySamples = this.samples.filter((s) => {
      if (s.tenantId !== tenantId) return false;
      return s.createdAt.toISOString().slice(0, 10) === targetDate;
    });

    const totalPending = daySamples.filter(
      (s) => s.status === SampleStatus.REGISTERED,
    ).length;

    const totalCollected = daySamples.filter(
      (s) => s.status === SampleStatus.COLLECTED
        || s.status === SampleStatus.RECEIVED
        || s.status === SampleStatus.PROCESSING
        || s.status === SampleStatus.COMPLETED,
    ).length;

    const totalRefused = daySamples.filter(
      (s) => s.status === SampleStatus.REJECTED,
    ).length;

    // Group by hour
    const byHour: Array<{ hour: number; pending: number; collected: number }> = [];
    for (let h = 0; h < 24; h++) {
      const hourSamples = daySamples.filter(
        (s) => s.createdAt.getHours() === h,
      );
      byHour.push({
        hour: h,
        pending: hourSamples.filter((s) => s.status === SampleStatus.REGISTERED).length,
        collected: hourSamples.filter(
          (s) => s.status !== SampleStatus.REGISTERED && s.status !== SampleStatus.REJECTED,
        ).length,
      });
    }

    return {
      date: targetDate,
      totalPending,
      totalCollected,
      totalRefused,
      byHour,
    };
  }
}
