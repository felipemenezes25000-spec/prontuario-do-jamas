import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PartogramDto,
  CardiologyDto,
  NephrologyDto,
  NeurologyDto,
  OrthopedicsDto,
  DermatologyDto,
  OphthalmologyDto,
  EndocrinologyDto,
  PulmonologyDto,
  GoldStage,
} from './dto/specialty-modules.dto';

// ============================================================================
// Helpers
// ============================================================================

function buildDocument(
  tenantId: string,
  authorId: string,
  patientId: string,
  encounterId: string | undefined,
  titleTag: string,
  payload: Record<string, unknown>,
) {
  return {
    patientId,
    encounterId,
    authorId,
    tenantId,
    type: 'CUSTOM' as const,
    title: titleTag,
    content: JSON.stringify(payload),
    status: 'SIGNED' as const,
  };
}

function calculateCkdEpi(creatinineMgDl: number, age: number, gender: string, race?: string): number {
  const isFemale = gender.toUpperCase() === 'F';
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const sexFactor = isFemale ? 1.012 : 1.0;
  const raceFactor = race?.toLowerCase() === 'black' ? 1.159 : 1.0; // legacy coefficient, use with caution
  const scr = creatinineMgDl / kappa;
  const gfr =
    142 *
    Math.pow(Math.min(scr, 1), alpha) *
    Math.pow(Math.max(scr, 1), -1.2) *
    Math.pow(0.9938, age) *
    sexFactor *
    raceFactor;
  return Math.round(gfr * 10) / 10;
}

function classifyCkdStage(gfr: number): string {
  if (gfr >= 90) return 'G1 — Normal ou elevada';
  if (gfr >= 60) return 'G2 — Levemente diminuída';
  if (gfr >= 45) return 'G3a — Leve a moderadamente diminuída';
  if (gfr >= 30) return 'G3b — Moderada a gravemente diminuída';
  if (gfr >= 15) return 'G4 — Gravemente diminuída';
  return 'G5 — Insuficiência renal';
}

function goldStagingToLabel(stage: GoldStage): string {
  const labels: Record<GoldStage, string> = {
    [GoldStage.GOLD_1]: 'GOLD 1 — Leve (FEV1 ≥ 80% previsto)',
    [GoldStage.GOLD_2]: 'GOLD 2 — Moderada (FEV1 50–79% previsto)',
    [GoldStage.GOLD_3]: 'GOLD 3 — Grave (FEV1 30–49% previsto)',
    [GoldStage.GOLD_4]: 'GOLD 4 — Muito grave (FEV1 < 30% previsto)',
  };
  return labels[stage];
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SpecialtyModulesService {
  private readonly logger = new Logger(SpecialtyModulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Obstetrics / Partogram ───────────────────────────────────────────────

  async createPartogram(tenantId: string, authorId: string, dto: PartogramDto) {
    this.logger.log(`Creating partogram for patient ${dto.patientId} — tenant ${tenantId}`);

    // Determine cervical dilation progress (active phase alert at ≥ 4 cm)
    const lastDilation = dto.cervicalDilation.at(-1);
    const lastFhr = dto.fetalHeartRate.at(-1);

    const alerts: string[] = [];
    if (lastFhr && (lastFhr.value < 110 || lastFhr.value > 160)) {
      alerts.push(`Alerta: FCF fora do padrão normal (${lastFhr.value} bpm — normal 110–160)`);
    }
    if (lastDilation && lastDilation.value >= 4) {
      alerts.push('Fase ativa do trabalho de parto (dilatação ≥ 4 cm)');
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:OBSTETRICS:PARTOGRAM]',
        {
          documentType: 'PARTOGRAM',
          cervicalDilation: dto.cervicalDilation,
          fetalDescent: dto.fetalDescent,
          contractions: dto.contractions,
          fetalHeartRate: dto.fetalHeartRate,
          medications: dto.medications,
          partogramGraph: dto.partogramGraph,
          alerts,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, alerts, recordedAt: doc.createdAt };
  }

  async getPartogramHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[SPECIALTY:OBSTETRICS:PARTOGRAM]' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return docs.map((d) => ({ id: d.id, createdAt: d.createdAt, data: JSON.parse(d.content ?? '{}') as Record<string, unknown> }));
  }

  // ─── Cardiology ──────────────────────────────────────────────────────────

  async createCardiologyModule(tenantId: string, authorId: string, dto: CardiologyDto) {
    this.logger.log(`Cardiology record for patient ${dto.patientId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:CARDIOLOGY:MODULE]',
        {
          documentType: 'CARDIOLOGY_MODULE',
          ecgData: dto.ecgData,
          echoReport: dto.echoReport,
          catheterizationRecord: dto.catheterizationRecord,
          framinghamScore: dto.framinghamScore,
          ascvdScore: dto.ascvdScore,
          chadsVascScore: dto.chadsVascScore,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── Nephrology ──────────────────────────────────────────────────────────

  async createNephrologyModule(tenantId: string, authorId: string, dto: NephrologyDto) {
    this.logger.log(`Nephrology record for patient ${dto.patientId}`);

    const gfr = calculateCkdEpi(dto.creatinineMgDl, dto.age, dto.gender, dto.race);
    const ckdStage = classifyCkdStage(gfr);

    // Kt/V adequacy check for latest session
    const latestSession = dto.sessionRecords?.at(-1);
    const ktvAlert =
      latestSession && latestSession.ktv < 1.2
        ? `Alerta: Kt/V inadequado (${latestSession.ktv} — meta ≥ 1.2)`
        : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:NEPHROLOGY:MODULE]',
        {
          documentType: 'NEPHROLOGY_MODULE',
          gfr,
          ckdStage,
          creatinineMgDl: dto.creatinineMgDl,
          dialysisPrescription: dto.dialysisPrescription,
          vascularAccess: dto.vascularAccess,
          vascularAccessDetails: dto.vascularAccessDetails,
          sessionRecords: dto.sessionRecords,
          ktvTarget: dto.ktvTarget,
          ktvAlert,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, gfr, ckdStage, ktvAlert, createdAt: doc.createdAt };
  }

  // ─── Neurology ───────────────────────────────────────────────────────────

  async createNeurologyModule(tenantId: string, authorId: string, dto: NeurologyDto) {
    this.logger.log(`Neurology record for patient ${dto.patientId}`);

    const nihssInterpretation = dto.nihssScore !== undefined
      ? dto.nihssScore === 0
        ? 'Sem déficit neurológico'
        : dto.nihssScore <= 4
          ? 'AVC menor'
          : dto.nihssScore <= 15
            ? 'AVC moderado'
            : dto.nihssScore <= 20
              ? 'AVC moderado-grave'
              : 'AVC grave'
      : undefined;

    const mrankinInterpretation = dto.mrankinScore !== undefined
      ? ['Sem sintomas', 'Sem incapacidade significativa', 'Incapacidade leve', 'Incapacidade moderada', 'Incapacidade moderada-grave', 'Incapacidade grave', 'Óbito'][dto.mrankinScore]
      : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:NEUROLOGY:MODULE]',
        {
          documentType: 'NEUROLOGY_MODULE',
          nihssScore: dto.nihssScore,
          nihssInterpretation,
          mrankinScore: dto.mrankinScore,
          mrankinInterpretation,
          edssScore: dto.edssScore,
          eegReport: dto.eegReport,
          emgReport: dto.emgReport,
          seizureLog: dto.seizureLog,
          neuroimagingFindings: dto.neuroimagingFindings,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, nihssInterpretation, mrankinInterpretation, createdAt: doc.createdAt };
  }

  // ─── Orthopedics ─────────────────────────────────────────────────────────

  async createOrthopedicsModule(tenantId: string, authorId: string, dto: OrthopedicsDto) {
    this.logger.log(`Orthopedics record for patient ${dto.patientId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:ORTHOPEDICS:MODULE]',
        {
          documentType: 'ORTHOPEDICS_MODULE',
          fractureClassificationAO: dto.fractureClassificationAO,
          fractureLocation: dto.fractureLocation,
          fractureGroup: dto.fractureGroup,
          immobilization: dto.immobilization,
          immobilizationDetails: dto.immobilizationDetails,
          traction: dto.traction,
          dvtProphylaxis: dto.dvtProphylaxis,
          dvtProphylaxisDetails: dto.dvtProphylaxisDetails,
          surgicalPlan: dto.surgicalPlan,
          neurovascularAssessment: dto.neurovascularAssessment,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── Dermatology ─────────────────────────────────────────────────────────

  async createDermatologyModule(tenantId: string, authorId: string, dto: DermatologyDto) {
    this.logger.log(`Dermatology record for patient ${dto.patientId}`);

    // Flag any nevi that might need closer review (size > 6mm or asymmetric ABCDE note)
    const flaggedNevi = (dto.nevusMapping ?? []).filter(
      (n) => (n.sizeMm ?? 0) > 6 || (n.abcdeCriteria ?? '').toLowerCase().includes('assimétr'),
    );

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:DERMATOLOGY:MODULE]',
        {
          documentType: 'DERMATOLOGY_MODULE',
          photos: dto.photos,
          dermoscopyDigital: dto.dermoscopyDigital,
          nevusMapping: dto.nevusMapping,
          flaggedNeviIds: flaggedNevi.map((n) => n.id),
          temporalTracking: dto.temporalTracking,
          diagnosis: dto.diagnosis,
          treatmentPlan: dto.treatmentPlan,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, flaggedNeviCount: flaggedNevi.length, createdAt: doc.createdAt };
  }

  // ─── Ophthalmology ───────────────────────────────────────────────────────

  async createOphthalmologyModule(tenantId: string, authorId: string, dto: OphthalmologyDto) {
    this.logger.log(`Ophthalmology record for patient ${dto.patientId}`);

    const iop: Record<string, string> = {};
    if (dto.tonometryOdMmhg !== undefined && dto.tonometryOdMmhg > 21) {
      iop['OD'] = `Pressão elevada: ${dto.tonometryOdMmhg} mmHg (normal ≤ 21)`;
    }
    if (dto.tonometryOsMmhg !== undefined && dto.tonometryOsMmhg > 21) {
      iop['OS'] = `Pressão elevada: ${dto.tonometryOsMmhg} mmHg (normal ≤ 21)`;
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:OPHTHALMOLOGY:MODULE]',
        {
          documentType: 'OPHTHALMOLOGY_MODULE',
          snellenAcuity: dto.snellenAcuity,
          tonometryOdMmhg: dto.tonometryOdMmhg,
          tonometryOsMmhg: dto.tonometryOsMmhg,
          iopAlerts: iop,
          octReport: dto.octReport,
          visualFieldTest: dto.visualFieldTest,
          slitLampFindings: dto.slitLampFindings,
          fundoscopyFindings: dto.fundoscopyFindings,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, iopAlerts: iop, createdAt: doc.createdAt };
  }

  // ─── Endocrinology ───────────────────────────────────────────────────────

  async createEndocrinologyModule(tenantId: string, authorId: string, dto: EndocrinologyDto) {
    this.logger.log(`Endocrinology record for patient ${dto.patientId}`);

    const hba1cAlert =
      dto.hba1c !== undefined && dto.hba1c > 9
        ? `HbA1c elevada (${dto.hba1c}%) — revisar controle glicêmico`
        : undefined;

    const thyroidInterpretation = dto.thyroidInterpretation ?? ((): string | undefined => {
      if (dto.tsh === undefined) return undefined;
      if (dto.tsh < 0.4) return 'TSH suprimido — avaliar hipertireoidismo';
      if (dto.tsh > 4.5) return 'TSH elevado — avaliar hipotireoidismo';
      return 'Função tireoidiana normal';
    })();

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:ENDOCRINOLOGY:MODULE]',
        {
          documentType: 'ENDOCRINOLOGY_MODULE',
          insulinProtocol: dto.insulinProtocol,
          basalInsulinUnits: dto.basalInsulinUnits,
          basalInsulinType: dto.basalInsulinType,
          slidingScale: dto.slidingScale,
          hba1c: dto.hba1c,
          hba1cAlert,
          tsh: dto.tsh,
          freeT4: dto.freeT4,
          freeT3: dto.freeT3,
          thyroidInterpretation,
          glucoseTarget: dto.glucoseTarget,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, hba1cAlert, thyroidInterpretation, createdAt: doc.createdAt };
  }

  // ─── Pulmonology ─────────────────────────────────────────────────────────

  async createPulmonologyModule(tenantId: string, authorId: string, dto: PulmonologyDto) {
    this.logger.log(`Pulmonology record for patient ${dto.patientId}`);

    const goldLabel = dto.goldStaging ? goldStagingToLabel(dto.goldStaging) : undefined;

    const catInterpretation =
      dto.catScore !== undefined
        ? dto.catScore < 10
          ? 'Baixo impacto da DPOC'
          : dto.catScore < 20
            ? 'Impacto moderado da DPOC'
            : dto.catScore < 30
              ? 'Alto impacto da DPOC'
              : 'Impacto muito alto da DPOC'
        : undefined;

    const actInterpretation =
      dto.actScore !== undefined
        ? dto.actScore >= 20
          ? 'Asma bem controlada'
          : dto.actScore >= 16
            ? 'Asma parcialmente controlada'
            : 'Asma não controlada'
        : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: buildDocument(
        tenantId,
        authorId,
        dto.patientId,
        dto.encounterId,
        '[SPECIALTY:PULMONOLOGY:MODULE]',
        {
          documentType: 'PULMONOLOGY_MODULE',
          spirometry: dto.spirometry,
          goldStaging: dto.goldStaging,
          goldLabel,
          catScore: dto.catScore,
          catInterpretation,
          actScore: dto.actScore,
          actInterpretation,
          homeOxygen: dto.homeOxygen,
          oxygenFlowLMin: dto.oxygenFlowLMin,
          oxygenHoursDay: dto.oxygenHoursDay,
          spo2Target: dto.spo2Target,
          inhalerTechniqueAssessment: dto.inhalerTechniqueAssessment,
          recordedAt: new Date().toISOString(),
        },
      ),
    });

    return { id: doc.id, goldLabel, catInterpretation, actInterpretation, createdAt: doc.createdAt };
  }

  // ─── Generic query helper ─────────────────────────────────────────────────

  async getSpecialtyHistory(tenantId: string, patientId: string, specialtyTag: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: specialtyTag } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return docs.map((d) => ({ id: d.id, title: d.title, createdAt: d.createdAt, data: JSON.parse(d.content ?? '{}') as Record<string, unknown> }));
  }
}
