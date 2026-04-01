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
  CreatePanicValueAlertDto,
  PanicValueStatus,
  Gender,
  InterpretBloodGasDto,
  CreatePathologyReportDto,
  CreateMicrobiologyResultDto,
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
  private panicAlerts: Array<{
    id: string;
    tenantId: string;
    patientId: string;
    encounterId: string | null;
    analyte: string;
    value: string;
    unit: string | null;
    referenceRange: string;
    responsiblePhysicianId: string | null;
    detectedById: string | null;
    examResultId: string | null;
    status: PanicValueStatus;
    acknowledgedById: string | null;
    acknowledgedAt: Date | null;
    createdAt: Date;
  }> = [];

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

  // ─── Reference Ranges ─────────────────────────────────────────────────────

  async getReferenceRanges(
    tenantId: string,
    examCode: string,
    age: number,
    gender: Gender,
  ) {
    // Comprehensive age/sex-specific reference ranges for common lab tests
    interface RefRange {
      analyte: string;
      unit: string;
      ranges: Array<{
        ageMin: number;
        ageMax: number;
        gender: Gender | 'ALL';
        low: number;
        high: number;
        criticalLow?: number;
        criticalHigh?: number;
      }>;
    }

    const referenceDatabase: Record<string, RefRange> = {
      HGB: {
        analyte: 'Hemoglobin',
        unit: 'g/dL',
        ranges: [
          { ageMin: 0, ageMax: 0.08, gender: 'ALL', low: 14.0, high: 22.0, criticalLow: 7.0, criticalHigh: 25.0 },
          { ageMin: 0.08, ageMax: 1, gender: 'ALL', low: 9.5, high: 14.0, criticalLow: 7.0, criticalHigh: 20.0 },
          { ageMin: 1, ageMax: 6, gender: 'ALL', low: 11.0, high: 14.0, criticalLow: 7.0, criticalHigh: 20.0 },
          { ageMin: 6, ageMax: 18, gender: 'ALL', low: 11.5, high: 15.5, criticalLow: 7.0, criticalHigh: 20.0 },
          { ageMin: 18, ageMax: 200, gender: Gender.MALE, low: 13.5, high: 17.5, criticalLow: 7.0, criticalHigh: 20.0 },
          { ageMin: 18, ageMax: 200, gender: Gender.FEMALE, low: 12.0, high: 16.0, criticalLow: 7.0, criticalHigh: 20.0 },
        ],
      },
      K: {
        analyte: 'Potassium',
        unit: 'mEq/L',
        ranges: [
          { ageMin: 0, ageMax: 0.08, gender: 'ALL', low: 3.7, high: 5.9, criticalLow: 2.5, criticalHigh: 6.5 },
          { ageMin: 0.08, ageMax: 1, gender: 'ALL', low: 3.5, high: 5.5, criticalLow: 2.5, criticalHigh: 6.5 },
          { ageMin: 1, ageMax: 18, gender: 'ALL', low: 3.4, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5 },
          { ageMin: 18, ageMax: 200, gender: 'ALL', low: 3.5, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5 },
        ],
      },
      NA: {
        analyte: 'Sodium',
        unit: 'mEq/L',
        ranges: [
          { ageMin: 0, ageMax: 1, gender: 'ALL', low: 133, high: 146, criticalLow: 120, criticalHigh: 160 },
          { ageMin: 1, ageMax: 200, gender: 'ALL', low: 136, high: 145, criticalLow: 120, criticalHigh: 160 },
        ],
      },
      GLU: {
        analyte: 'Glucose (fasting)',
        unit: 'mg/dL',
        ranges: [
          { ageMin: 0, ageMax: 0.08, gender: 'ALL', low: 40, high: 80, criticalLow: 30, criticalHigh: 400 },
          { ageMin: 0.08, ageMax: 18, gender: 'ALL', low: 60, high: 100, criticalLow: 40, criticalHigh: 400 },
          { ageMin: 18, ageMax: 200, gender: 'ALL', low: 70, high: 99, criticalLow: 40, criticalHigh: 500 },
        ],
      },
      CREAT: {
        analyte: 'Creatinine',
        unit: 'mg/dL',
        ranges: [
          { ageMin: 0, ageMax: 1, gender: 'ALL', low: 0.2, high: 0.5 },
          { ageMin: 1, ageMax: 12, gender: 'ALL', low: 0.3, high: 0.7 },
          { ageMin: 12, ageMax: 18, gender: 'ALL', low: 0.5, high: 1.0 },
          { ageMin: 18, ageMax: 200, gender: Gender.MALE, low: 0.7, high: 1.3 },
          { ageMin: 18, ageMax: 200, gender: Gender.FEMALE, low: 0.6, high: 1.1 },
        ],
      },
      TSH: {
        analyte: 'TSH',
        unit: 'mIU/L',
        ranges: [
          { ageMin: 0, ageMax: 0.02, gender: 'ALL', low: 1.0, high: 39.0 },
          { ageMin: 0.02, ageMax: 1, gender: 'ALL', low: 0.7, high: 6.4 },
          { ageMin: 1, ageMax: 18, gender: 'ALL', low: 0.5, high: 4.5 },
          { ageMin: 18, ageMax: 200, gender: 'ALL', low: 0.4, high: 4.0 },
        ],
      },
      WBC: {
        analyte: 'White Blood Cells',
        unit: '/mm3',
        ranges: [
          { ageMin: 0, ageMax: 0.08, gender: 'ALL', low: 9000, high: 30000, criticalLow: 2000, criticalHigh: 50000 },
          { ageMin: 0.08, ageMax: 2, gender: 'ALL', low: 6000, high: 17500, criticalLow: 2000, criticalHigh: 30000 },
          { ageMin: 2, ageMax: 18, gender: 'ALL', low: 5000, high: 14500, criticalLow: 2000, criticalHigh: 30000 },
          { ageMin: 18, ageMax: 200, gender: 'ALL', low: 4500, high: 11000, criticalLow: 2000, criticalHigh: 30000 },
        ],
      },
      PLT: {
        analyte: 'Platelets',
        unit: 'x10^3/uL',
        ranges: [
          { ageMin: 0, ageMax: 200, gender: 'ALL', low: 150, high: 400, criticalLow: 50, criticalHigh: 1000 },
        ],
      },
      TROP: {
        analyte: 'Troponin I (High-Sensitivity)',
        unit: 'ng/L',
        ranges: [
          { ageMin: 18, ageMax: 200, gender: Gender.MALE, low: 0, high: 34 },
          { ageMin: 18, ageMax: 200, gender: Gender.FEMALE, low: 0, high: 16 },
        ],
      },
      CA: {
        analyte: 'Calcium (total)',
        unit: 'mg/dL',
        ranges: [
          { ageMin: 0, ageMax: 1, gender: 'ALL', low: 8.8, high: 11.3, criticalLow: 6.0, criticalHigh: 14.0 },
          { ageMin: 1, ageMax: 200, gender: 'ALL', low: 8.5, high: 10.5, criticalLow: 6.0, criticalHigh: 14.0 },
        ],
      },
    };

    const ageInYears = age;
    const refData = referenceDatabase[examCode.toUpperCase()];
    if (!refData) {
      return {
        examCode,
        found: false,
        message: `Reference range for exam code "${examCode}" not found in database`,
        availableCodes: Object.keys(referenceDatabase),
      };
    }

    // Find the matching range for age + gender
    const matchingRange = refData.ranges.find(
      (r) =>
        ageInYears >= r.ageMin &&
        ageInYears < r.ageMax &&
        (r.gender === 'ALL' || r.gender === gender),
    );

    if (!matchingRange) {
      return {
        examCode,
        analyte: refData.analyte,
        found: false,
        message: `No reference range found for age=${age} gender=${gender}`,
      };
    }

    return {
      examCode,
      analyte: refData.analyte,
      unit: refData.unit,
      found: true,
      age,
      gender,
      referenceLow: matchingRange.low,
      referenceHigh: matchingRange.high,
      criticalLow: matchingRange.criticalLow ?? null,
      criticalHigh: matchingRange.criticalHigh ?? null,
      rangeText: `${matchingRange.low} - ${matchingRange.high} ${refData.unit}`,
    };
  }

  // ─── Panic Value Alert ─────────────────────────────────────────────────────

  /**
   * Critical value alert with mandatory read-back acknowledgment.
   * PANIC VALUES: K+ >6.5, Hb <7, Platelets <20k, Glucose <40 or >500, etc.
   */
  async createPanicValueAlert(tenantId: string, dto: CreatePanicValueAlertDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Known panic value thresholds for validation/severity
    const panicThresholds: Record<string, { criticalLow?: number; criticalHigh?: number; unit: string }> = {
      potassium: { criticalLow: 2.5, criticalHigh: 6.5, unit: 'mEq/L' },
      hemoglobin: { criticalLow: 7.0, criticalHigh: 20.0, unit: 'g/dL' },
      glucose: { criticalLow: 40, criticalHigh: 500, unit: 'mg/dL' },
      platelets: { criticalLow: 20, criticalHigh: 1000, unit: 'x10^3/uL' },
      sodium: { criticalLow: 120, criticalHigh: 160, unit: 'mEq/L' },
      calcium: { criticalLow: 6.0, criticalHigh: 14.0, unit: 'mg/dL' },
      troponin: { criticalHigh: 0.04, unit: 'ng/mL' },
      inr: { criticalHigh: 5.0, unit: '' },
      lactate: { criticalHigh: 4.0, unit: 'mmol/L' },
    };

    const numValue = parseFloat(String(dto.value).replace(',', '.'));
    const analyteKey = dto.analyte.toLowerCase();
    const threshold = panicThresholds[analyteKey];
    let severity: 'CRITICAL' | 'HIGH' = 'CRITICAL';
    if (threshold && !isNaN(numValue)) {
      const isAboveCritical = threshold.criticalHigh !== undefined && numValue > threshold.criticalHigh;
      const isBelowCritical = threshold.criticalLow !== undefined && numValue < threshold.criticalLow;
      severity = isAboveCritical || isBelowCritical ? 'CRITICAL' : 'HIGH';
    }

    const alert = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      analyte: dto.analyte,
      value: dto.value,
      unit: dto.unit ?? null,
      referenceRange: dto.referenceRange,
      responsiblePhysicianId: dto.responsiblePhysicianId ?? null,
      detectedById: dto.detectedById ?? null,
      examResultId: dto.examResultId ?? null,
      status: PanicValueStatus.PENDING,
      acknowledgedById: null,
      acknowledgedAt: null,
      createdAt: new Date(),
    };

    this.panicAlerts.push(alert);

    // Persist as clinical document for audit trail
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: dto.detectedById ?? 'SYSTEM',
        type: 'CUSTOM',
        title: `[LIS:PANIC_VALUE] ${dto.analyte} = ${dto.value} ${dto.unit ?? ''}`,
        content: JSON.stringify({
          ...alert,
          severity,
          panicThreshold: threshold ?? null,
        }),
        status: 'FINAL',
        generatedByAI: false,
      },
    });

    return {
      ...alert,
      severity,
      message: `VALOR CRITICO: ${dto.analyte} = ${dto.value} ${dto.unit ?? ''} (Ref: ${dto.referenceRange}). Notificacao obrigatoria ao medico responsavel.`,
      requiresAcknowledgment: true,
      escalationMinutes: 15,
    };
  }

  /**
   * Read-back acknowledgment for panic value.
   * Records who acknowledged, when, completing the mandatory notification loop.
   */
  async acknowledgePanicValue(tenantId: string, alertId: string, userId: string) {
    const alert = this.panicAlerts.find(
      (a) => a.id === alertId && a.tenantId === tenantId,
    );
    if (!alert) {
      throw new NotFoundException(`Panic value alert "${alertId}" not found`);
    }

    if (alert.status === PanicValueStatus.ACKNOWLEDGED) {
      throw new BadRequestException('Alert already acknowledged');
    }

    alert.status = PanicValueStatus.ACKNOWLEDGED;
    alert.acknowledgedById = userId;
    alert.acknowledgedAt = new Date();

    // Update clinical document
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId: alert.patientId,
        title: { contains: '[LIS:PANIC_VALUE]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const matchingDoc = docs.find((d) => {
      const content = typeof d.content === 'string' ? d.content : JSON.stringify(d.content);
      return content.includes(alertId);
    });

    if (matchingDoc) {
      const existingContent = typeof matchingDoc.content === 'string'
        ? JSON.parse(matchingDoc.content)
        : matchingDoc.content;
      await this.prisma.clinicalDocument.update({
        where: { id: matchingDoc.id },
        data: {
          content: JSON.stringify({
            ...existingContent,
            acknowledgedById: userId,
            acknowledgedAt: alert.acknowledgedAt.toISOString(),
            status: PanicValueStatus.ACKNOWLEDGED,
          }),
        },
      });
    }

    const responseTimeSec = Math.round(
      (alert.acknowledgedAt.getTime() - alert.createdAt.getTime()) / 1000,
    );

    return {
      alertId,
      status: PanicValueStatus.ACKNOWLEDGED,
      acknowledgedById: userId,
      acknowledgedAt: alert.acknowledgedAt.toISOString(),
      responseTimeSeconds: responseTimeSec,
      responseTimeFormatted: responseTimeSec > 60
        ? `${Math.floor(responseTimeSec / 60)}min ${responseTimeSec % 60}s`
        : `${responseTimeSec}s`,
      withinSla: responseTimeSec <= 900, // 15 minutes SLA
    };
  }

  // ─── Lab Trend ─────────────────────────────────────────────────────────────

  /**
   * Returns trend chart data for a specific lab test over a given period.
   */
  async getLabTrend(
    tenantId: string,
    patientId: string,
    examCode: string,
    months: number,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const exams = await this.prisma.examResult.findMany({
      where: {
        patientId,
        status: { in: ['COMPLETED', 'REVIEWED'] },
        completedAt: { gte: cutoff },
      },
      orderBy: { completedAt: 'asc' },
    });

    const dataPoints: Array<{
      date: string;
      value: number;
      unit: string;
      flag: string | null;
    }> = [];

    for (const exam of exams) {
      const results = exam.labResults as unknown as Array<{
        analyte: string;
        analyteCode?: string;
        value: string;
        unit?: string;
        flag?: string;
      }>;
      if (!Array.isArray(results)) continue;

      for (const r of results) {
        const matchByCode = r.analyteCode?.toUpperCase() === examCode.toUpperCase();
        const matchByName = r.analyte.toLowerCase().includes(examCode.toLowerCase());
        if (!matchByCode && !matchByName) continue;

        const numVal = parseFloat(String(r.value).replace(',', '.'));
        if (isNaN(numVal)) continue;

        dataPoints.push({
          date: (exam.completedAt ?? exam.createdAt).toISOString(),
          value: numVal,
          unit: r.unit ?? '',
          flag: r.flag ?? null,
        });
      }
    }

    // Calculate statistics
    const values = dataPoints.map((p) => p.value);
    const stats = values.length > 0
      ? {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
          latest: values[values.length - 1],
          trend: values.length >= 2
            ? values[values.length - 1] > values[values.length - 2]
              ? 'INCREASING'
              : values[values.length - 1] < values[values.length - 2]
                ? 'DECREASING'
                : 'STABLE'
            : 'INSUFFICIENT_DATA',
        }
      : null;

    return {
      patientId,
      examCode,
      periodMonths: months,
      totalDataPoints: dataPoints.length,
      dataPoints,
      statistics: stats,
    };
  }

  // ─── Check Delta Value ─────────────────────────────────────────────────────

  /**
   * Compare a specific result with previous results; alert if variation exceeds threshold.
   */
  async checkDeltaValue(tenantId: string, resultId: string) {
    const exam = await this.prisma.examResult.findUnique({ where: { id: resultId } });
    if (!exam) {
      throw new NotFoundException(`Exam result "${resultId}" not found`);
    }

    const labResults = exam.labResults as unknown as Array<{
      analyte: string;
      value: string;
      unit?: string;
    }>;
    if (!Array.isArray(labResults) || labResults.length === 0) {
      throw new BadRequestException('No lab results for delta check');
    }

    // Thresholds for delta check (percentage change that triggers an alert)
    const deltaThresholds: Record<string, number> = {
      hemoglobin: 25,
      hematocrit: 25,
      potassium: 30,
      sodium: 10,
      calcium: 20,
      creatinine: 50,
      glucose: 50,
      platelets: 50,
      wbc: 75,
      albumin: 30,
      troponin: 100,
    };

    // Get previous results for this patient
    const previousExams = await this.prisma.examResult.findMany({
      where: {
        patientId: exam.patientId,
        status: { in: ['COMPLETED', 'REVIEWED'] },
        id: { not: resultId },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    const deltaChecks: Array<{
      analyte: string;
      currentValue: number;
      previousValue: number;
      percentChange: number;
      threshold: number;
      flagged: boolean;
      previousDate: string;
    }> = [];

    for (const r of labResults) {
      const currentVal = parseFloat(String(r.value).replace(',', '.'));
      if (isNaN(currentVal)) continue;

      // Find most recent prior value for this analyte
      for (const prevExam of previousExams) {
        const prevResults = prevExam.labResults as unknown as Array<{
          analyte: string;
          value: string;
        }>;
        if (!Array.isArray(prevResults)) continue;

        const prevResult = prevResults.find(
          (pr) => pr.analyte.toLowerCase() === r.analyte.toLowerCase(),
        );
        if (!prevResult) continue;

        const prevVal = parseFloat(String(prevResult.value).replace(',', '.'));
        if (isNaN(prevVal) || prevVal === 0) continue;

        const pctChange = Math.round(
          Math.abs((currentVal - prevVal) / prevVal) * 10000,
        ) / 100;
        const threshold = deltaThresholds[r.analyte.toLowerCase()] ?? 50;

        deltaChecks.push({
          analyte: r.analyte,
          currentValue: currentVal,
          previousValue: prevVal,
          percentChange: pctChange,
          threshold,
          flagged: pctChange > threshold,
          previousDate: (prevExam.completedAt ?? prevExam.createdAt).toISOString(),
        });
        break; // Only compare with most recent previous
      }
    }

    const flaggedCount = deltaChecks.filter((d) => d.flagged).length;
    return {
      resultId,
      patientId: exam.patientId,
      totalAnalytes: deltaChecks.length,
      flaggedCount,
      deltaChecks,
      recommendation: flaggedCount > 0
        ? 'VERIFICAR: Variacao significativa detectada. Possivel troca de amostra ou alteracao clinica aguda.'
        : 'Delta check dentro dos limites aceitaveis.',
    };
  }

  // ─── Quality Control — Westgard Rules ──────────────────────────────────────

  /**
   * Full Levey-Jennings QC with Westgard multi-rule check.
   */
  async runQualityControl(tenantId: string, dto: QualityControlEntryDto) {
    const zScore = (dto.measuredValue - dto.expectedMean) / dto.expectedSd;

    // Retrieve recent QC entries for this analyzer + analyte + level (for multi-rule checks)
    const recentEntries = this.qcEntries
      .filter(
        (e) =>
          e.analyzerId === dto.analyzerId &&
          e.analyte === dto.analyte &&
          e.level === dto.level,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 11); // need up to 12 consecutive points for 10x rule

    // Westgard rules evaluation
    const rules: Record<string, boolean> = {};

    // 1-2s: Warning rule — one point exceeds +-2SD
    rules['1_2s_warning'] = Math.abs(zScore) > 2;

    // 1-3s: Reject — one point exceeds +-3SD
    rules['1_3s_reject'] = Math.abs(zScore) > 3;

    // 2-2s: Reject — two consecutive points exceed +-2SD in the same direction
    if (recentEntries.length >= 1) {
      const prevZ = recentEntries[0].zScore;
      rules['2_2s_reject'] =
        Math.abs(zScore) > 2 &&
        Math.abs(prevZ) > 2 &&
        Math.sign(zScore) === Math.sign(prevZ);
    } else {
      rules['2_2s_reject'] = false;
    }

    // R-4s: Reject — range of two consecutive exceeds 4SD
    if (recentEntries.length >= 1) {
      rules['R_4s_reject'] = Math.abs(zScore - recentEntries[0].zScore) > 4;
    } else {
      rules['R_4s_reject'] = false;
    }

    // 4-1s: Reject — four consecutive points exceed +-1SD in the same direction
    if (recentEntries.length >= 3) {
      const last3 = recentEntries.slice(0, 3).map((e) => e.zScore);
      const allSameDirection = [zScore, ...last3].every((z) => z > 1) ||
        [zScore, ...last3].every((z) => z < -1);
      rules['4_1s_reject'] = allSameDirection;
    } else {
      rules['4_1s_reject'] = false;
    }

    // 10x: Reject — ten consecutive points on the same side of the mean
    if (recentEntries.length >= 9) {
      const last9 = recentEntries.slice(0, 9).map((e) => e.zScore);
      const allPositive = [zScore, ...last9].every((z) => z > 0);
      const allNegative = [zScore, ...last9].every((z) => z < 0);
      rules['10x_reject'] = allPositive || allNegative;
    } else {
      rules['10x_reject'] = false;
    }

    const anyReject = rules['1_3s_reject'] || rules['2_2s_reject'] ||
      rules['R_4s_reject'] || rules['4_1s_reject'] || rules['10x_reject'];
    const isAccepted = !anyReject;

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
      westgardRules: rules,
      status: isAccepted ? 'ACCEPTED' : 'REJECTED',
      violatedRules: Object.entries(rules)
        .filter(([, val]) => val)
        .map(([key]) => key),
      recommendation: anyReject
        ? 'PARAR: Controle de qualidade fora. Verificar calibracao, reagentes e manutenção do analisador antes de liberar resultados.'
        : 'CQ aceito. Resultados podem ser liberados.',
    };
  }

  // ─── Institutional Antibiogram ─────────────────────────────────────────────

  /**
   * Compiles institutional sensitivity data from microbiology results over a period.
   */
  async getInstitutionalAntibiogram(tenantId: string, period: string) {
    // period format: "2025" or "2025-Q1" or "2025-01"
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[LIS:MICROBIOLOGY]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Parse all microbiology results
    interface ParsedResult {
      organism: string;
      antibiotic: string;
      result: string;
    }

    const allResults: ParsedResult[] = [];
    for (const doc of docs) {
      try {
        const content = typeof doc.content === 'string'
          ? JSON.parse(doc.content)
          : doc.content;
        if (!content.organism || !content.antibiogram) continue;

        // Filter by period
        const docDate = doc.createdAt.toISOString();
        if (period.length === 4 && !docDate.startsWith(period)) continue;
        if (period.includes('Q')) {
          const year = period.split('-')[0];
          const quarter = parseInt(period.split('Q')[1], 10);
          const month = doc.createdAt.getMonth();
          const quarterMonth = Math.floor(month / 3) + 1;
          if (!docDate.startsWith(year) || quarterMonth !== quarter) continue;
        }
        if (period.length === 7 && !docDate.startsWith(period)) continue;

        for (const entry of content.antibiogram) {
          allResults.push({
            organism: content.organism,
            antibiotic: entry.antibiotic,
            result: entry.result,
          });
        }
      } catch {
        // Skip malformed documents
      }
    }

    // Compile sensitivity rates
    const matrix: Record<string, Record<string, { S: number; I: number; R: number; total: number }>> = {};

    for (const r of allResults) {
      if (!matrix[r.organism]) matrix[r.organism] = {};
      if (!matrix[r.organism][r.antibiotic]) {
        matrix[r.organism][r.antibiotic] = { S: 0, I: 0, R: 0, total: 0 };
      }
      const cell = matrix[r.organism][r.antibiotic];
      if (r.result === 'S') cell.S++;
      else if (r.result === 'I') cell.I++;
      else if (r.result === 'R') cell.R++;
      cell.total++;
    }

    // Build output table
    const organisms = Object.keys(matrix).sort();
    const allAntibiotics = [...new Set(allResults.map((r) => r.antibiotic))].sort();

    const table = organisms.map((org) => ({
      organism: org,
      totalIsolates: Object.values(matrix[org]).reduce((sum, v) => sum + v.total, 0) / allAntibiotics.length || 0,
      antibiotics: allAntibiotics.map((ab) => {
        const cell = matrix[org][ab];
        if (!cell) return { antibiotic: ab, sensitivityRate: null, tested: 0 };
        return {
          antibiotic: ab,
          sensitive: cell.S,
          intermediate: cell.I,
          resistant: cell.R,
          tested: cell.total,
          sensitivityRate: cell.total > 0
            ? Math.round((cell.S / cell.total) * 100)
            : null,
        };
      }),
    }));

    return {
      period,
      tenantId,
      totalIsolates: allResults.length,
      organisms: organisms.length,
      antibiotics: allAntibiotics,
      table,
      generatedAt: new Date().toISOString(),
      disclaimer: 'Antibiograma institucional — uso interno. Amostra pode nao ser representativa.',
    };
  }

  // ─── Blood Gas Interpretation ──────────────────────────────────────────────

  /**
   * Full ABG interpretation: primary disorder, compensation, anion gap, oxygenation.
   */
  async interpretBloodGas(tenantId: string, dto: InterpretBloodGasDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const interpretations: string[] = [];
    const alerts: string[] = [];

    // Step 1: Evaluate pH
    let primaryDisorder = 'Normal';
    if (dto.ph < 7.35) {
      primaryDisorder = 'Acidemia';
    } else if (dto.ph > 7.45) {
      primaryDisorder = 'Alkalemia';
    }

    // Step 2: Determine respiratory vs metabolic
    let disorderType = '';
    let compensation = '';

    if (dto.ph < 7.35) {
      if (dto.pCO2 > 45) {
        disorderType = 'Acidose Respiratoria';
        // Expected HCO3 compensation
        const expectedHCO3Acute = 24 + ((dto.pCO2 - 40) / 10) * 1;
        const expectedHCO3Chronic = 24 + ((dto.pCO2 - 40) / 10) * 3.5;
        if (dto.hco3 > expectedHCO3Chronic + 2) {
          compensation = 'Compensacao metabolica acima do esperado — disturbio misto';
        } else if (dto.hco3 >= expectedHCO3Acute - 2 && dto.hco3 <= expectedHCO3Chronic + 2) {
          compensation = 'Compensacao metabolica adequada';
        } else {
          compensation = 'Compensacao metabolica insuficiente — possivel disturbio misto';
        }
      } else if (dto.hco3 < 22) {
        disorderType = 'Acidose Metabolica';
        // Expected pCO2 by Winter's formula
        const expectedPCO2 = 1.5 * dto.hco3 + 8;
        if (dto.pCO2 < expectedPCO2 - 2) {
          compensation = 'Hiperventilacao alem do esperado — alcalose respiratoria concomitante';
        } else if (dto.pCO2 > expectedPCO2 + 2) {
          compensation = 'Hipoventilacao — acidose respiratoria concomitante';
        } else {
          compensation = 'Compensacao respiratoria adequada (Winter)';
        }
      }
    } else if (dto.ph > 7.45) {
      if (dto.pCO2 < 35) {
        disorderType = 'Alcalose Respiratoria';
        const expectedHCO3Acute = 24 - ((40 - dto.pCO2) / 10) * 2;
        const expectedHCO3Chronic = 24 - ((40 - dto.pCO2) / 10) * 5;
        if (dto.hco3 < expectedHCO3Chronic - 2) {
          compensation = 'Compensacao metabolica acima do esperado — disturbio misto';
        } else if (dto.hco3 >= expectedHCO3Chronic - 2 && dto.hco3 <= expectedHCO3Acute + 2) {
          compensation = 'Compensacao metabolica adequada';
        } else {
          compensation = 'Compensacao metabolica insuficiente';
        }
      } else if (dto.hco3 > 26) {
        disorderType = 'Alcalose Metabolica';
        const expectedPCO2 = 0.7 * dto.hco3 + 21;
        if (Math.abs(dto.pCO2 - expectedPCO2) <= 2) {
          compensation = 'Compensacao respiratoria adequada';
        } else {
          compensation = 'Disturbio misto provavel';
        }
      }
    } else {
      disorderType = 'Equilibrio acido-base normal';
      compensation = 'Sem necessidade de compensacao';
    }

    interpretations.push(`Disturbio primario: ${primaryDisorder}`);
    interpretations.push(`Tipo: ${disorderType}`);
    interpretations.push(`Compensacao: ${compensation}`);

    // Step 3: Anion gap (if sodium and chloride available)
    let anionGap: number | null = null;
    let correctedAnionGap: number | null = null;
    if (dto.sodium !== undefined && dto.chloride !== undefined) {
      anionGap = dto.sodium - dto.chloride - dto.hco3;
      interpretations.push(`Anion Gap: ${anionGap} mEq/L (normal: 8-12)`);

      if (anionGap > 12) {
        interpretations.push('Anion Gap elevado — investigar: cetoacidose, acidose latica, uremia, intoxicacao (MUDPILES)');

        // Delta-delta ratio
        const deltaAG = anionGap - 12;
        const deltaHCO3 = 24 - dto.hco3;
        if (deltaHCO3 > 0) {
          const deltaDelta = deltaAG / deltaHCO3;
          if (deltaDelta < 1) {
            interpretations.push('Delta-Delta < 1: Acidose metabolica hiperclorémica concomitante');
          } else if (deltaDelta > 2) {
            interpretations.push('Delta-Delta > 2: Alcalose metabolica concomitante');
          } else {
            interpretations.push('Delta-Delta 1-2: Acidose AG pura');
          }
          correctedAnionGap = Math.round(deltaDelta * 100) / 100;
        }
      }
    }

    // Step 4: Oxygenation assessment
    let oxygenationStatus = '';
    if (dto.sampleType === 'ARTERIAL') {
      if (dto.pO2 < 60) {
        oxygenationStatus = 'Hipoxemia (PaO2 < 60 mmHg)';
        alerts.push('HIPOXEMIA — considerar suporte de O2');
      } else if (dto.pO2 < 80) {
        oxygenationStatus = 'PaO2 levemente reduzido';
      } else {
        oxygenationStatus = 'Oxigenacao adequada';
      }

      // P/F ratio if FiO2 provided
      if (dto.fiO2 !== undefined && dto.fiO2 > 0) {
        const pfRatio = Math.round(dto.pO2 / dto.fiO2);
        interpretations.push(`P/F Ratio: ${pfRatio}`);
        if (pfRatio < 100) {
          alerts.push('P/F < 100: SDRA GRAVE');
        } else if (pfRatio < 200) {
          alerts.push('P/F < 200: SDRA Moderada');
        } else if (pfRatio < 300) {
          alerts.push('P/F < 300: SDRA Leve / Injuria pulmonar');
        }
      }

      // A-a gradient
      if (dto.fiO2 !== undefined) {
        const pAlveolar = (dto.fiO2 * (760 - 47)) - (dto.pCO2 / 0.8);
        const aAGradient = Math.round((pAlveolar - dto.pO2) * 10) / 10;
        interpretations.push(`Gradiente A-a: ${aAGradient} mmHg`);
        if (aAGradient > 20) {
          interpretations.push('Gradiente A-a elevado — investigar shunt ou V/Q mismatch');
        }
      }
    }

    // Step 5: Critical alerts
    if (dto.ph < 7.10) alerts.push('pH CRITICO < 7.10 — Acidemia grave, risco de colapso cardiovascular');
    if (dto.ph > 7.60) alerts.push('pH CRITICO > 7.60 — Alcalemia grave');
    if (dto.potassium !== undefined && dto.potassium > 6.5) alerts.push(`HIPERCALEMIA CRITICA: K+ = ${dto.potassium} mEq/L`);
    if (dto.potassium !== undefined && dto.potassium < 2.5) alerts.push(`HIPOCALEMIA CRITICA: K+ = ${dto.potassium} mEq/L`);
    if (dto.lactate !== undefined && dto.lactate > 4) alerts.push(`LACTATO ELEVADO: ${dto.lactate} mmol/L — investigar hipoperfusão`);
    if (dto.lactate !== undefined && dto.lactate > 2 && dto.lactate <= 4) interpretations.push(`Lactato moderadamente elevado: ${dto.lactate} mmol/L`);

    if (oxygenationStatus) interpretations.push(`Oxigenacao: ${oxygenationStatus}`);

    // Persist interpretation
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: 'AI_SYSTEM',
        type: 'CUSTOM',
        title: `[LIS:BLOOD_GAS] Gasometria ${dto.sampleType}`,
        content: JSON.stringify({
          input: dto,
          primaryDisorder,
          disorderType,
          compensation,
          anionGap,
          correctedAnionGap,
          oxygenationStatus,
          interpretations,
          alerts,
        }),
        status: 'DRAFT',
        generatedByAI: true,
      },
    });

    return {
      documentId: doc.id,
      patientId: dto.patientId,
      sampleType: dto.sampleType,
      values: {
        ph: dto.ph,
        pCO2: dto.pCO2,
        pO2: dto.pO2,
        hco3: dto.hco3,
        baseExcess: dto.baseExcess ?? null,
        saO2: dto.saO2 ?? null,
        lactate: dto.lactate ?? null,
      },
      primaryDisorder,
      disorderType,
      compensation,
      anionGap,
      correctedAnionGap,
      oxygenationStatus: oxygenationStatus || null,
      interpretations,
      alerts,
      disclaimer: 'Interpretacao assistida por IA — correlacionar com contexto clinico. Revisao medica obrigatoria.',
    };
  }

  // ─── Pathology Report ──────────────────────────────────────────────────────

  async createPathologyReport(tenantId: string, dto: CreatePathologyReportDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const reportId = crypto.randomUUID();

    const reportContent = {
      id: reportId,
      reportType: dto.reportType,
      specimenSite: dto.specimenSite,
      clinicalHistory: dto.clinicalHistory,
      macroscopy: dto.macroscopy,
      microscopy: dto.microscopy,
      ihqResults: dto.ihqResults ?? [],
      specialStains: dto.specialStains ?? [],
      diagnosis: dto.diagnosis,
      staging: dto.staging ?? null,
      marginStatus: dto.marginStatus ?? null,
      comment: dto.comment ?? null,
      pathologistId: dto.pathologistId,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: dto.pathologistId,
        type: 'CUSTOM',
        title: `[LIS:PATHOLOGY] ${dto.reportType} — ${dto.specimenSite}`,
        content: JSON.stringify(reportContent),
        status: 'FINAL',
        generatedByAI: false,
      },
    });

    return {
      documentId: doc.id,
      ...reportContent,
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Microbiology Result ───────────────────────────────────────────────────

  async createMicrobiologyResult(tenantId: string, dto: CreateMicrobiologyResultDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const resultId = crypto.randomUUID();

    // Determine if this requires urgent notification
    const isMultiDrugResistant = dto.antibiogram
      ? dto.antibiogram.filter((a) => a.result === 'R').length >=
        Math.ceil(dto.antibiogram.length * 0.5)
      : false;

    const isCriticalOrganism = dto.organism
      ? [
          'MRSA', 'VRE', 'KPC', 'NDM', 'ESBL',
          'Candida auris', 'Clostridioides difficile',
          'Neisseria meningitidis', 'Mycobacterium tuberculosis',
        ].some((o) => dto.organism!.toUpperCase().includes(o.toUpperCase()))
      : false;

    const isBloodCulturePositive =
      dto.sampleSource === 'BLOOD' &&
      dto.cultureResult.toLowerCase().includes('positive');

    const alerts: string[] = [];
    if (isMultiDrugResistant) alerts.push('ORGANISMO MULTIRRESISTENTE — notificar CCIH');
    if (isCriticalOrganism) alerts.push(`ORGANISMO CRITICO: ${dto.organism} — precauções de isolamento`);
    if (isBloodCulturePositive) alerts.push('HEMOCULTURA POSITIVA — notificação urgente ao médico');

    const resultContent = {
      id: resultId,
      sampleSource: dto.sampleSource,
      cultureResult: dto.cultureResult,
      organism: dto.organism ?? null,
      colonyCount: dto.colonyCount ?? null,
      gramStain: dto.gramStain ?? null,
      antibiogram: dto.antibiogram ?? [],
      incubationDays: dto.incubationDays ?? null,
      notes: dto.notes ?? null,
      microbiologistId: dto.microbiologistId,
      isMultiDrugResistant,
      isCriticalOrganism,
      alerts,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: dto.microbiologistId,
        type: 'CUSTOM',
        title: `[LIS:MICROBIOLOGY] ${dto.sampleSource} — ${dto.organism ?? dto.cultureResult}`,
        content: JSON.stringify(resultContent),
        status: 'FINAL',
        generatedByAI: false,
      },
    });

    // Build sensitivity summary
    const sensitivitySummary = dto.antibiogram
      ? {
          totalTested: dto.antibiogram.length,
          sensitive: dto.antibiogram.filter((a) => a.result === 'S').length,
          intermediate: dto.antibiogram.filter((a) => a.result === 'I').length,
          resistant: dto.antibiogram.filter((a) => a.result === 'R').length,
          bestOptions: dto.antibiogram
            .filter((a) => a.result === 'S')
            .map((a) => a.antibiotic),
        }
      : null;

    return {
      documentId: doc.id,
      ...resultContent,
      sensitivitySummary,
      createdAt: new Date().toISOString(),
    };
  }
}
