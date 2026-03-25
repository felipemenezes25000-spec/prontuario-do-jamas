import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BloodTypingDto,
  CrossmatchDto,
  RecordTransfusionDto,
  TransfusionReactionDto,
  BloodProduct,
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
}
