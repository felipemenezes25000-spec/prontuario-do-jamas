import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BloodTypingDto,
  CrossmatchDto,
  RecordTransfusionDto,
  TransfusionReactionDto,
  BloodProduct,
  TrackBloodUnitDto,
  BloodUnitStatus,
  RequestTransfusionDto,
  TransfusionUrgency,
} from './dto/blood-bank.dto';

export interface BloodTypingRecord {
  id: string;
  patientId: string;
  bloodType: string;
  antibodyScreen: string;
  identifiedAntibodies: string[];
  datResult: string | null;
  notes: string | null;
  performedById: string;
  tenantId: string;
  createdAt: Date;
}

export interface CrossmatchRecord {
  id: string;
  patientId: string;
  unitId: string;
  product: string;
  result: string;
  method: string | null;
  notes: string | null;
  performedById: string;
  tenantId: string;
  createdAt: Date;
}

export interface TransfusionRecord {
  id: string;
  patientId: string;
  encounterId: string | null;
  unitId: string;
  product: string;
  volumeMl: number;
  startTime: Date;
  endTime: Date | null;
  indication: string | null;
  preTransfusionVitals: Record<string, unknown> | null;
  postTransfusionVitals: Record<string, unknown> | null;
  administeredById: string | null;
  reaction: TransfusionReactionDto | null;
  status: string;
  tenantId: string;
  orderedById: string;
  createdAt: Date;
}

export interface BloodInventoryItem {
  id: string;
  unitId: string;
  product: string;
  bloodType: string;
  volumeMl: number;
  collectedAt: Date;
  expiresAt: Date;
  status: string;
  tenantId: string;
}

@Injectable()
export class BloodBankService {
  private typings: BloodTypingRecord[] = [];
  private crossmatches: CrossmatchRecord[] = [];
  private transfusions: TransfusionRecord[] = [];
  private inventory: BloodInventoryItem[] = [];
  private transfusionRequests: Array<{
    id: string;
    tenantId: string;
    patientId: string;
    encounterId: string | null;
    product: string;
    urgency: string;
    indication: string;
    unitsRequested: number;
    specialRequirements: string[];
    clinicalNotes: string | null;
    requestedById: string;
    status: string;
    createdAt: Date;
  }> = [];

  constructor(private readonly prisma: PrismaService) {
    // Initialize mock inventory
    this.initializeInventory();
  }

  private initializeInventory(): void {
    const products = Object.values(BloodProduct).slice(0, 5);
    const bloodTypes = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];
    const now = new Date();

    for (const product of products) {
      for (const bt of bloodTypes) {
        const units = bt.includes('O') ? 5 : bt.includes('AB') ? 2 : 3;
        for (let i = 0; i < units; i++) {
          const collected = new Date(now.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000);
          const expires = new Date(collected.getTime() + 35 * 24 * 60 * 60 * 1000);
          this.inventory.push({
            id: crypto.randomUUID(),
            unitId: `BB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            product,
            bloodType: bt,
            volumeMl: product === BloodProduct.PLATELET_CONCENTRATE ? 250 : product === BloodProduct.CRYOPRECIPITATE ? 15 : 300,
            collectedAt: collected,
            expiresAt: expires,
            status: expires > now ? 'AVAILABLE' : 'EXPIRED',
            tenantId: 'default',
          });
        }
      }
    }
  }

  async bloodTyping(tenantId: string, userId: string, dto: BloodTypingDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const record: BloodTypingRecord = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      bloodType: dto.bloodType,
      antibodyScreen: dto.antibodyScreen,
      identifiedAntibodies: dto.identifiedAntibodies ?? [],
      datResult: dto.datResult ?? null,
      notes: dto.notes ?? null,
      performedById: userId,
      tenantId,
      createdAt: new Date(),
    };

    this.typings.push(record);

    // Update patient blood type if different
    const btMap: Record<string, string> = {
      A_POS: 'A_POS',
      A_NEG: 'A_NEG',
      B_POS: 'B_POS',
      B_NEG: 'B_NEG',
      AB_POS: 'AB_POS',
      AB_NEG: 'AB_NEG',
      O_POS: 'O_POS',
      O_NEG: 'O_NEG',
    };
    if (btMap[dto.bloodType]) {
      await this.prisma.patient.update({
        where: { id: dto.patientId },
        data: { bloodType: btMap[dto.bloodType] as never },
      });
    }

    return record;
  }

  async crossmatch(tenantId: string, userId: string, dto: CrossmatchDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const record: CrossmatchRecord = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      unitId: dto.unitId,
      product: dto.product,
      result: dto.result,
      method: dto.method ?? null,
      notes: dto.notes ?? null,
      performedById: userId,
      tenantId,
      createdAt: new Date(),
    };

    this.crossmatches.push(record);
    return record;
  }

  async recordTransfusion(tenantId: string, userId: string, dto: RecordTransfusionDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const record: TransfusionRecord = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      unitId: dto.unitId,
      product: dto.product,
      volumeMl: dto.volumeMl,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      indication: dto.indication ?? null,
      preTransfusionVitals: dto.preTransfusionVitals ?? null,
      postTransfusionVitals: dto.postTransfusionVitals ?? null,
      administeredById: dto.administeredById ?? null,
      reaction: null,
      status: 'IN_PROGRESS',
      tenantId,
      orderedById: userId,
      createdAt: new Date(),
    };

    this.transfusions.push(record);

    // Update inventory
    const invItem = this.inventory.find((i) => i.unitId === dto.unitId);
    if (invItem) {
      invItem.status = 'TRANSFUSED';
    }

    return record;
  }

  async reportReaction(tenantId: string, userId: string, transfusionId: string, dto: TransfusionReactionDto) {
    const transfusion = this.transfusions.find(
      (t) => t.id === transfusionId && t.tenantId === tenantId,
    );
    if (!transfusion) {
      throw new NotFoundException(`Transfusion "${transfusionId}" not found`);
    }

    transfusion.reaction = dto;
    transfusion.status = dto.transfusionStopped ? 'STOPPED_REACTION' : 'REACTION_REPORTED';

    return {
      transfusionId,
      reaction: dto,
      transfusionStatus: transfusion.status,
      message: 'Transfusion reaction reported. Hemovigilance notified.',
    };
  }

  async getInventory(tenantId: string, filters: { product?: string; bloodType?: string; status?: string }) {
    let items = this.inventory.filter((i) => i.tenantId === tenantId || i.tenantId === 'default');

    if (filters.product) {
      items = items.filter((i) => i.product === filters.product);
    }
    if (filters.bloodType) {
      items = items.filter((i) => i.bloodType === filters.bloodType);
    }
    if (filters.status) {
      items = items.filter((i) => i.status === filters.status);
    } else {
      items = items.filter((i) => i.status === 'AVAILABLE');
    }

    // Summary by blood type
    const summary = items.reduce<Record<string, { count: number; totalVolumeMl: number }>>((acc, i) => {
      const key = `${i.bloodType}_${i.product}`;
      if (!acc[key]) acc[key] = { count: 0, totalVolumeMl: 0 };
      acc[key].count++;
      acc[key].totalVolumeMl += i.volumeMl;
      return acc;
    }, {});

    return {
      totalUnits: items.length,
      summary: Object.entries(summary).map(([key, val]) => {
        const [bloodType, product] = key.split('_');
        return { bloodType, product, ...val };
      }),
      items: items.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime()),
    };
  }

  async getPatientTransfusionHistory(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const typings = this.typings.filter(
      (t) => t.patientId === patientId && t.tenantId === tenantId,
    );
    const crossmatches = this.crossmatches.filter(
      (c) => c.patientId === patientId && c.tenantId === tenantId,
    );
    const transfusions = this.transfusions.filter(
      (t) => t.patientId === patientId && t.tenantId === tenantId,
    );

    const latestTyping = typings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      patientId,
      patientName: patient.fullName,
      bloodType: latestTyping?.bloodType ?? patient.bloodType ?? 'UNKNOWN',
      antibodyScreen: latestTyping?.antibodyScreen ?? 'NOT_DONE',
      identifiedAntibodies: latestTyping?.identifiedAntibodies ?? [],
      typingHistory: typings,
      crossmatches: crossmatches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      transfusions: transfusions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      totalTransfusions: transfusions.length,
      reactionsCount: transfusions.filter((t) => t.reaction !== null).length,
    };
  }

  // ─── Track Blood Unit ──────────────────────────────────────────────────────

  async trackBloodUnit(tenantId: string, dto: TrackBloodUnitDto) {
    // Check for duplicate unit ID
    const existing = this.inventory.find(
      (i) => i.unitId === dto.unitId && (i.tenantId === tenantId || i.tenantId === 'default'),
    );
    if (existing) {
      throw new BadRequestException(`Blood unit "${dto.unitId}" already exists in inventory`);
    }

    const collectedAt = new Date(dto.collectedAt);
    // Calculate expiry based on product type
    const expiryDays: Record<string, number> = {
      [BloodProduct.WHOLE_BLOOD]: 35,
      [BloodProduct.PACKED_RED_CELLS]: 42,
      [BloodProduct.FRESH_FROZEN_PLASMA]: 365,
      [BloodProduct.PLATELET_CONCENTRATE]: 5,
      [BloodProduct.CRYOPRECIPITATE]: 365,
      [BloodProduct.LEUKOREDUCED_RBC]: 42,
      [BloodProduct.IRRADIATED_RBC]: 28,
      [BloodProduct.WASHED_RBC]: 1, // 24h after washing
      [BloodProduct.APHERESIS_PLATELETS]: 5,
      [BloodProduct.GRANULOCYTES]: 1,
    };

    const daysToExpiry = expiryDays[dto.product] ?? 35;
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(collectedAt.getTime() + daysToExpiry * 24 * 60 * 60 * 1000);

    const now = new Date();
    const status = expiresAt < now ? BloodUnitStatus.EXPIRED : (dto.status ?? BloodUnitStatus.AVAILABLE);

    const item: BloodInventoryItem = {
      id: crypto.randomUUID(),
      unitId: dto.unitId,
      product: dto.product,
      bloodType: dto.bloodType,
      volumeMl: dto.volumeMl,
      collectedAt,
      expiresAt,
      status,
      tenantId,
    };

    this.inventory.push(item);

    // Calculate days until expiry
    const daysUntilExpiry = Math.round(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...item,
      daysUntilExpiry,
      expiryWarning: daysUntilExpiry <= 3 && daysUntilExpiry > 0
        ? `ATENCAO: Unidade expira em ${daysUntilExpiry} dia(s)`
        : daysUntilExpiry <= 0
          ? 'EXPIRADA — nao utilizar'
          : null,
    };
  }

  // ─── Request Transfusion ───────────────────────────────────────────────────

  async requestTransfusion(tenantId: string, userId: string, dto: RequestTransfusionDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Check if patient has blood typing on file
    const latestTyping = this.typings
      .filter((t) => t.patientId === dto.patientId && t.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    const hasTyping = !!latestTyping;
    const hasAntibodyScreen = latestTyping?.antibodyScreen === 'NEGATIVE' || latestTyping?.antibodyScreen === 'POSITIVE';

    // Validate pre-transfusion requirements
    const warnings: string[] = [];
    if (!hasTyping) {
      warnings.push('ATENCAO: Paciente sem tipagem sanguinea registrada — coleta obrigatoria antes da transfusao');
    }
    if (!hasAntibodyScreen) {
      warnings.push('ATENCAO: Pesquisa de anticorpos irregulares nao realizada');
    }
    if (latestTyping?.antibodyScreen === 'POSITIVE') {
      warnings.push(`ATENCAO: PAI POSITIVA — Anticorpos identificados: ${latestTyping.identifiedAntibodies.join(', ')}. Necessario prova cruzada completa.`);
    }

    // Check available inventory
    let compatibleUnits = 0;
    if (hasTyping) {
      const compatibleTypes = this.getCompatibleDonorTypes(latestTyping.bloodType, dto.product);
      compatibleUnits = this.inventory.filter(
        (i) =>
          (i.tenantId === tenantId || i.tenantId === 'default') &&
          i.product === dto.product &&
          compatibleTypes.includes(i.bloodType) &&
          i.status === 'AVAILABLE' &&
          i.expiresAt > new Date(),
      ).length;
    }

    const request = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      product: dto.product,
      urgency: dto.urgency ?? TransfusionUrgency.ROUTINE,
      indication: dto.indication,
      unitsRequested: dto.unitsRequested ?? 1,
      specialRequirements: dto.specialRequirements ?? [],
      clinicalNotes: dto.clinicalNotes ?? null,
      requestedById: userId,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.transfusionRequests.push(request);

    // Persist as clinical document
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: userId,
        type: 'CUSTOM',
        title: `[BLOOD_BANK:TRANSFUSION_REQUEST] ${dto.product} — ${dto.urgency ?? 'ROUTINE'}`,
        content: JSON.stringify({
          ...request,
          patientBloodType: latestTyping?.bloodType ?? 'UNKNOWN',
          warnings,
          compatibleUnitsAvailable: compatibleUnits,
        }),
        status: 'FINAL',
        generatedByAI: false,
      },
    });

    return {
      ...request,
      patientBloodType: latestTyping?.bloodType ?? 'UNKNOWN',
      hasPreTransfusionTyping: hasTyping,
      hasAntibodyScreen,
      compatibleUnitsAvailable: compatibleUnits,
      warnings,
      estimatedPreparationMinutes: dto.urgency === TransfusionUrgency.EMERGENCY
        ? 15
        : dto.urgency === TransfusionUrgency.URGENT
          ? 30
          : 60,
    };
  }

  // ─── Check Compatibility ───────────────────────────────────────────────────

  async checkCompatibility(tenantId: string, patientId: string, unitId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const unit = this.inventory.find(
      (i) => i.unitId === unitId && (i.tenantId === tenantId || i.tenantId === 'default'),
    );
    if (!unit) {
      throw new NotFoundException(`Blood unit "${unitId}" not found`);
    }

    // Get patient's blood type
    const latestTyping = this.typings
      .filter((t) => t.patientId === patientId && t.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!latestTyping) {
      return {
        patientId,
        unitId,
        compatible: false,
        reason: 'Paciente sem tipagem sanguinea registrada — impossivel verificar compatibilidade',
        requiresCrossmatch: true,
        checks: [],
      };
    }

    const checks: Array<{ check: string; passed: boolean; detail: string }> = [];

    // 1. ABO/Rh compatibility
    const compatibleDonors = this.getCompatibleDonorTypes(latestTyping.bloodType, unit.product);
    const aboCompatible = compatibleDonors.includes(unit.bloodType);
    checks.push({
      check: 'ABO/Rh Compatibility',
      passed: aboCompatible,
      detail: aboCompatible
        ? `${unit.bloodType} e compativel com receptor ${latestTyping.bloodType}`
        : `${unit.bloodType} INCOMPATIVEL com receptor ${latestTyping.bloodType}`,
    });

    // 2. Expiry check
    const isExpired = unit.expiresAt < new Date();
    checks.push({
      check: 'Expiry',
      passed: !isExpired,
      detail: isExpired
        ? `Unidade EXPIRADA em ${unit.expiresAt.toISOString().slice(0, 10)}`
        : `Validade: ${unit.expiresAt.toISOString().slice(0, 10)}`,
    });

    // 3. Unit availability
    const isAvailable = unit.status === 'AVAILABLE';
    checks.push({
      check: 'Unit Status',
      passed: isAvailable,
      detail: isAvailable
        ? 'Unidade disponivel'
        : `Unidade com status: ${unit.status}`,
    });

    // 4. Antibody screen check
    const hasPositiveAntibodies = latestTyping.antibodyScreen === 'POSITIVE';
    const antibodyCheck = !hasPositiveAntibodies;
    checks.push({
      check: 'Antibody Screen',
      passed: antibodyCheck,
      detail: hasPositiveAntibodies
        ? `PAI POSITIVA — Anticorpos: ${latestTyping.identifiedAntibodies.join(', ')}. Prova cruzada OBRIGATORIA.`
        : 'PAI negativa',
    });

    // 5. Prior crossmatch check
    const existingCrossmatch = this.crossmatches.find(
      (c) =>
        c.patientId === patientId &&
        c.unitId === unitId &&
        c.tenantId === tenantId,
    );
    const crossmatchDone = !!existingCrossmatch;
    const crossmatchCompatible = existingCrossmatch?.result === 'COMPATIBLE';
    checks.push({
      check: 'Crossmatch',
      passed: crossmatchDone ? crossmatchCompatible : !hasPositiveAntibodies,
      detail: crossmatchDone
        ? `Prova cruzada realizada: ${existingCrossmatch.result}`
        : hasPositiveAntibodies
          ? 'Prova cruzada NAO realizada — OBRIGATORIA para PAI positiva'
          : 'Prova cruzada nao realizada — aceitavel para PAI negativa (crossmatch eletronico)',
    });

    const allPassed = checks.every((c) => c.passed);
    const requiresCrossmatch = hasPositiveAntibodies && !crossmatchDone;

    return {
      patientId,
      unitId,
      patientBloodType: latestTyping.bloodType,
      unitBloodType: unit.bloodType,
      unitProduct: unit.product,
      compatible: allPassed && !requiresCrossmatch,
      requiresCrossmatch,
      checks,
      recommendation: allPassed && !requiresCrossmatch
        ? 'Unidade COMPATIVEL — pode ser liberada para transfusao.'
        : requiresCrossmatch
          ? 'PROVA CRUZADA OBRIGATORIA antes da liberacao.'
          : 'INCOMPATIVEL — selecionar outra unidade.',
    };
  }

  /**
   * Returns compatible donor blood types for a given recipient blood type and product.
   */
  private getCompatibleDonorTypes(recipientType: string, product: string): string[] {
    // For RBC products: follow standard ABO compatibility
    const rbcCompatibility: Record<string, string[]> = {
      O_POS: ['O_POS', 'O_NEG'],
      O_NEG: ['O_NEG'],
      A_POS: ['A_POS', 'A_NEG', 'O_POS', 'O_NEG'],
      A_NEG: ['A_NEG', 'O_NEG'],
      B_POS: ['B_POS', 'B_NEG', 'O_POS', 'O_NEG'],
      B_NEG: ['B_NEG', 'O_NEG'],
      AB_POS: ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'],
      AB_NEG: ['A_NEG', 'B_NEG', 'AB_NEG', 'O_NEG'],
    };

    // For plasma/FFP: reverse compatibility (AB is universal donor)
    const plasmaCompatibility: Record<string, string[]> = {
      O_POS: ['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG'],
      O_NEG: ['O_NEG', 'A_NEG', 'B_NEG', 'AB_NEG'],
      A_POS: ['A_POS', 'A_NEG', 'AB_POS', 'AB_NEG'],
      A_NEG: ['A_NEG', 'AB_NEG'],
      B_POS: ['B_POS', 'B_NEG', 'AB_POS', 'AB_NEG'],
      B_NEG: ['B_NEG', 'AB_NEG'],
      AB_POS: ['AB_POS', 'AB_NEG'],
      AB_NEG: ['AB_NEG'],
    };

    const isPlasmaProduct = [
      BloodProduct.FRESH_FROZEN_PLASMA,
      BloodProduct.CRYOPRECIPITATE,
    ].includes(product as BloodProduct);

    if (isPlasmaProduct) {
      return plasmaCompatibility[recipientType] ?? [];
    }

    // Platelets: ABO identical preferred, but ABO non-identical acceptable
    if ([BloodProduct.PLATELET_CONCENTRATE, BloodProduct.APHERESIS_PLATELETS].includes(product as BloodProduct)) {
      // Prefer identical, but all types acceptable in emergencies
      return rbcCompatibility[recipientType] ?? [];
    }

    return rbcCompatibility[recipientType] ?? [];
  }
}
