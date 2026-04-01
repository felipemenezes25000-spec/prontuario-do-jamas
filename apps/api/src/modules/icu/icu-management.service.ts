import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InvasiveDeviceDto,
  InvasiveDeviceType,
  PreventionBundleDto,
  PreventionBundleType,
  PronationSessionDto,
  DailyGoalsDto,
  IcuFlowsheetDto,
  EnteralNutritionDto,
} from './dto/icu-management.dto';

// ─── Bundle item defaults ─────────────────────────────────────────────────────

const DEFAULT_BUNDLE_ITEMS: Partial<Record<InvasiveDeviceType, string[]>> = {
  [InvasiveDeviceType.CVC]: [
    'Higiene das mãos realizada',
    'Precauções de barreira máxima',
    'Antissepsia com clorexidina',
    'Sítio de inserção ideal (subclávia preferível)',
    'Revisão diária da necessidade do cateter',
    'Curativo íntegro e limpo',
    'Sem torneiras desnecessárias',
  ],
  [InvasiveDeviceType.TOT]: [
    'Cabeceira a 30-45 graus',
    'Interrupção diária da sedação (IAD)',
    'Teste de respiração espontânea diário (TER)',
    'Profilaxia de TVP administrada',
    'Higiene oral com clorexidina',
    'Pressão do cuff 20-30 cmH2O',
    'Circuito não trocado rotineiramente',
  ],
  [InvasiveDeviceType.SVD]: [
    'Indicação da sonda documentada',
    'Revisão diária da necessidade da sonda',
    'Técnica de inserção asséptica',
    'Sistema de drenagem fechado íntegro',
    'Bolsa coletora abaixo do nível da bexiga',
    'Higiene perineal realizada',
    'Sem irrigação rotineira',
  ],
};

// Device alert thresholds (days)
const DEVICE_ALERT_DAYS: Record<InvasiveDeviceType, number> = {
  [InvasiveDeviceType.CVC]:                    7,
  [InvasiveDeviceType.SVD]:                    7,
  [InvasiveDeviceType.TOT]:                    14,
  [InvasiveDeviceType.ARTERIAL_LINE]:           5,
  [InvasiveDeviceType.DRAIN]:                  10,
  [InvasiveDeviceType.CHEST_TUBE]:             10,
  [InvasiveDeviceType.PICC]:                   30,
  [InvasiveDeviceType.NASOGASTRIC_TUBE]:       14,
  [InvasiveDeviceType.TRACHEOSTOMY]:           30,
  [InvasiveDeviceType.DIALYSIS_CATHETER]:       7,
  [InvasiveDeviceType.EXTERNAL_VENTRICULAR_DRAIN]: 7,
  [InvasiveDeviceType.SWAN_GANZ]:               3,
};

// ─── Title prefixes for filtering ────────────────────────────────────────────

const TITLE_PREFIXES = {
  device:    '[ICU:DEVICE]',
  bundleCvc: '[ICU:BUNDLE:CVC]',
  bundleVap: '[ICU:BUNDLE:VAP]',
  bundleCauti: '[ICU:BUNDLE:CAUTI]',
  bundle:    '[ICU:BUNDLE',
  pronation: '[ICU:PRONATION]',
  goals:     '[ICU:GOALS]',
  flowsheet: '[ICU:FLOWSHEET]',
  nutrition: '[ICU:NUTRITION]',
} as const;

function bundlePrefix(type: PreventionBundleType): string {
  switch (type) {
    case PreventionBundleType.CVC:   return TITLE_PREFIXES.bundleCvc;
    case PreventionBundleType.VAP:   return TITLE_PREFIXES.bundleVap;
    case PreventionBundleType.CAUTI: return TITLE_PREFIXES.bundleCauti;
  }
}

@Injectable()
export class IcuManagementService {
  private readonly logger = new Logger(IcuManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Invasive Devices ────────────────────────────────────────────────────────

  async createInvasiveDevice(tenantId: string, authorId: string, dto: InvasiveDeviceDto) {
    this.logger.log(`Invasive device patient=${dto.patientId} type=${dto.type}`);

    const insertionDate = new Date(dto.insertionDate);
    const today = new Date();
    const daysInPlace = Math.floor(
      (today.getTime() - insertionDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const alertThreshold = DEVICE_ALERT_DAYS[dto.type];
    const infectionRiskAlert =
      daysInPlace >= alertThreshold
        ? `Alerta: dispositivo há ${daysInPlace} dias — limite recomendado ${alertThreshold} dias`
        : null;

    const defaultItems = DEFAULT_BUNDLE_ITEMS[dto.type] ?? [];
    const bundleItems =
      dto.bundleChecklist ??
      defaultItems.map((item) => ({ item, compliant: false }));

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `${TITLE_PREFIXES.device} ${dto.type} | Sítio: ${dto.insertionSite}`,
        content: JSON.stringify({ ...dto, daysInPlace, bundleItems }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      type: dto.type,
      insertionDate: dto.insertionDate,
      insertionSite: dto.insertionSite,
      daysInPlace,
      alertThreshold,
      infectionRiskAlert,
      bundleItems,
      createdAt: doc.createdAt,
    };
  }

  async listInvasiveDevices(patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: TITLE_PREFIXES.device } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    const today = new Date();
    return docs.map((d) => {
      const data = JSON.parse(d.content as string) as Record<string, unknown>;
      const insertionDate = new Date(data['insertionDate'] as string);
      const daysInPlace = Math.floor(
        (today.getTime() - insertionDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const deviceType = data['type'] as InvasiveDeviceType;
      const alertThreshold = DEVICE_ALERT_DAYS[deviceType] ?? 999;
      return {
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
        daysInPlace,
        infectionRiskAlert:
          daysInPlace >= alertThreshold ? `Alerta: dispositivo há ${daysInPlace} dias` : null,
        ...data,
      };
    });
  }

  // ─── Prevention Bundles ──────────────────────────────────────────────────────

  async recordPreventionBundle(tenantId: string, authorId: string, dto: PreventionBundleDto) {
    this.logger.log(`Bundle patient=${dto.patientId} type=${dto.type}`);

    const compliantItems = dto.checklistItems.filter((i) => i.compliant).length;
    const totalItems = dto.checklistItems.length;
    const complianceRate = parseFloat(((compliantItems / totalItems) * 100).toFixed(1));
    const compliant = dto.compliant ?? complianceRate === 100;

    const prefix = bundlePrefix(dto.type);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `${prefix} Bundle ${dto.type} — ${compliant ? 'Conforme' : 'NÃO conforme'} (${complianceRate}%)`,
        content: JSON.stringify({ ...dto, complianceRate, compliant }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      type: dto.type,
      assessmentDate: dto.assessmentDate,
      compliant,
      complianceRate,
      compliantItems,
      totalItems,
      checklistItems: dto.checklistItems,
      createdAt: doc.createdAt,
    };
  }

  async getBundleHistory(patientId: string, type?: PreventionBundleType, limit = 30) {
    const containsPrefix = type ? bundlePrefix(type) : TITLE_PREFIXES.bundle;

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        patientId,
        type: 'CUSTOM',
        title: { contains: containsPrefix },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }

  // ─── Pronation Sessions ──────────────────────────────────────────────────────

  async createPronationSession(tenantId: string, authorId: string, dto: PronationSessionDto) {
    this.logger.log(`Pronation session patient=${dto.patientId}`);

    const pfImprovement =
      dto.pfRatioBefore !== undefined && dto.pfRatioAfter !== undefined
        ? parseFloat((dto.pfRatioAfter - dto.pfRatioBefore).toFixed(1))
        : null;

    const responder =
      dto.responder ??
      (pfImprovement !== null ? pfImprovement >= 20 : undefined);

    let durationHours: number | null = null;
    if (dto.endTime) {
      durationHours = parseFloat(
        (
          (new Date(dto.endTime).getTime() - new Date(dto.startTime).getTime()) /
          (1000 * 60 * 60)
        ).toFixed(1),
      );
    }

    const statusLabel =
      responder === true ? 'Respondedor' : responder === false ? 'Não respondedor' : 'Aguardando avaliação';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `${TITLE_PREFIXES.pronation} Prono — ${durationHours !== null ? `${durationHours}h` : 'Em curso'} | ${statusLabel}`,
        content: JSON.stringify({ ...dto, pfImprovement, responder, durationHours }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      durationHours,
      pfRatioBefore: dto.pfRatioBefore,
      pfRatioAfter: dto.pfRatioAfter,
      pfImprovement,
      responder,
      complications: dto.complications,
      createdAt: doc.createdAt,
    };
  }

  async listPronationSessions(patientId: string, limit = 20) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: TITLE_PREFIXES.pronation } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }

  // ─── Daily Goals ─────────────────────────────────────────────────────────────

  async createDailyGoals(tenantId: string, authorId: string, dto: DailyGoalsDto) {
    this.logger.log(`Daily goals patient=${dto.patientId} date=${dto.goalsDate}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `${TITLE_PREFIXES.goals} Metas Diárias UTI — ${dto.goalsDate}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      goalsDate: dto.goalsDate,
      plan: dto.plan,
      expectedDischarge: dto.expectedDischarge,
      createdAt: doc.createdAt,
    };
  }

  async getDailyGoals(patientId: string, goalsDate?: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: TITLE_PREFIXES.goals } },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    const entries = docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));

    if (goalsDate) {
      return entries.filter((e) => (e as Record<string, unknown>)['goalsDate'] === goalsDate);
    }
    return entries;
  }

  // ─── ICU Flowsheet ───────────────────────────────────────────────────────────

  async createFlowsheetEntry(tenantId: string, authorId: string, dto: IcuFlowsheetDto) {
    this.logger.log(`Flowsheet entry patient=${dto.patientId} ts=${dto.timestamp}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `${TITLE_PREFIXES.flowsheet} Folha de Fluxo UTI — ${dto.timestamp}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      timestamp: dto.timestamp,
      vitals: dto.vitals,
      fluidBalance: dto.fluidBalance,
      medications: dto.medications,
      ventilation: dto.ventilation,
      devices: dto.devices,
      createdAt: doc.createdAt,
    };
  }

  async getFlowsheetEntries(patientId: string, limit = 48) {
    const exists = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Patient ${patientId} not found`);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: TITLE_PREFIXES.flowsheet } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }

  // ─── Enteral Nutrition ───────────────────────────────────────────────────────

  async createEnteralNutrition(tenantId: string, authorId: string, dto: EnteralNutritionDto) {
    this.logger.log(`Enteral nutrition patient=${dto.patientId} formula=${dto.formula}`);

    const dailyCalcVolume = dto.ratePerHour * 24;
    const targetAchievementPercent =
      dto.targetVolume > 0
        ? parseFloat(((dailyCalcVolume / dto.targetVolume) * 100).toFixed(1))
        : null;

    const highResidualWarning =
      dto.gastricResidue !== undefined && dto.gastricResidue > 500
        ? 'Resíduo gástrico elevado (>500 mL) — considerar pausar dieta e rever posição'
        : null;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `${TITLE_PREFIXES.nutrition} Nutrição Enteral — ${dto.formula} | ${dto.ratePerHour} mL/h`,
        content: JSON.stringify({ ...dto, dailyCalcVolume, targetAchievementPercent }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      formula: dto.formula,
      ratePerHour: dto.ratePerHour,
      targetVolume: dto.targetVolume,
      dailyCalcVolume,
      targetAchievementPercent,
      gastricResidue: dto.gastricResidue,
      highResidualWarning,
      pauseReason: dto.pauseReason,
      route: dto.route,
      createdAt: doc.createdAt,
    };
  }

  async listEnteralNutrition(patientId: string, limit = 10) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: TITLE_PREFIXES.nutrition } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }
}
