import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateChargeCaptureDto, UpdateChargeDto } from './charge-capture.dto';

export interface ChargeItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  codingSystem?: string;
  source: 'MANUAL' | 'AUTO_CAPTURED';
}

interface ChargeRecord {
  id: string;
  encounterId: string;
  tenantId: string;
  items: ChargeItem[];
  totalAmount: number;
  status: 'CAPTURED' | 'REVIEWED' | 'BILLED' | 'VOIDED';
  notes?: string;
  capturedAt: string;
  billedAt?: string;
}

@Injectable()
export class ChargeCaptureService {
  constructor(private readonly prisma: PrismaService) {}

  async captureCharges(tenantId: string, userEmail: string, dto: CreateChargeCaptureDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      include: {
        clinicalNotes: { select: { procedureCodes: true, type: true } },
        prescriptions: {
          include: { items: { select: { procedureName: true, procedureCode: true, examName: true, examCode: true } } },
        },
        examResults: { select: { examName: true, examCode: true, examType: true } },
      },
    });

    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    let items: ChargeItem[] = [];

    if (dto.autoCapture) {
      // Auto-capture from documentation
      // Consultation charge
      items.push({
        code: '1.01.01.01-8',
        description: `Consulta — ${encounter.type}`,
        quantity: 1,
        unitPrice: 150.00,
        total: 150.00,
        codingSystem: 'CBHPM',
        source: 'AUTO_CAPTURED',
      });

      // Capture procedures from prescriptions
      for (const rx of encounter.prescriptions) {
        for (const item of rx.items) {
          if (item.procedureName) {
            items.push({
              code: item.procedureCode ?? 'PENDING',
              description: item.procedureName,
              quantity: 1,
              unitPrice: 0,
              total: 0,
              source: 'AUTO_CAPTURED',
            });
          }
          if (item.examName) {
            items.push({
              code: item.examCode ?? 'PENDING',
              description: item.examName,
              quantity: 1,
              unitPrice: 0,
              total: 0,
              source: 'AUTO_CAPTURED',
            });
          }
        }
      }

      // Capture exams
      for (const exam of encounter.examResults) {
        items.push({
          code: exam.examCode ?? 'PENDING',
          description: exam.examName,
          quantity: 1,
          unitPrice: 0,
          total: 0,
          source: 'AUTO_CAPTURED',
        });
      }
    }

    // Add manual items
    if (dto.items) {
      for (const item of dto.items) {
        items.push({
          ...item,
          total: item.quantity * item.unitPrice,
          source: 'MANUAL',
        });
      }
    }

    // Deduplicate by code
    const seen = new Set<string>();
    items = items.filter((item) => {
      const key = `${item.code}-${item.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const totalAmount = items.reduce((s, i) => s + i.total, 0);

    const charge: ChargeRecord = {
      id: crypto.randomUUID(),
      encounterId: dto.encounterId,
      tenantId,
      items,
      totalAmount,
      status: 'CAPTURED',
      capturedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: encounter.patientId,
        authorId: user!.id,
        encounterId: dto.encounterId,
        type: 'CUSTOM',
        title: `CHARGE: ${encounter.type} — R$ ${totalAmount.toFixed(2)}`,
        content: JSON.stringify(charge),
        status: 'DRAFT',
      },
    });

    return { chargeId: doc.id, itemCount: items.length, totalAmount, status: 'CAPTURED' };
  }

  async getChargesForEncounter(tenantId: string, encounterId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, encounterId, type: 'CUSTOM', title: { startsWith: 'CHARGE:' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    });

    return docs.map((d) => {
      const charge = JSON.parse(d.content ?? '{}') as ChargeRecord;
      return { chargeId: d.id, ...charge };
    });
  }

  async updateCharge(tenantId: string, chargeId: string, dto: UpdateChargeDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: chargeId, tenantId, type: 'CUSTOM', title: { startsWith: 'CHARGE:' } },
    });
    if (!doc) throw new NotFoundException('Charge não encontrado.');

    const charge = JSON.parse(doc.content ?? '{}') as ChargeRecord;

    if (dto.items) {
      charge.items = dto.items.map((i) => ({
        ...i,
        total: i.quantity * i.unitPrice,
        source: 'MANUAL' as const,
      }));
      charge.totalAmount = charge.items.reduce((s, i) => s + i.total, 0);
    }
    if (dto.notes) charge.notes = dto.notes;
    if (dto.status) {
      charge.status = dto.status as ChargeRecord['status'];
      if (dto.status === 'BILLED') charge.billedAt = new Date().toISOString();
    }

    await this.prisma.clinicalDocument.update({
      where: { id: chargeId },
      data: {
        content: JSON.stringify(charge),
        title: `CHARGE: R$ ${charge.totalAmount.toFixed(2)}`,
      },
    });

    return { chargeId, status: charge.status, totalAmount: charge.totalAmount };
  }

  async getUnbilledCharges(tenantId: string, options: { page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      type: 'CUSTOM' as const,
      title: { startsWith: 'CHARGE:' },
      status: 'DRAFT' as const,
    };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, content: true, createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const charge = JSON.parse(d.content ?? '{}') as ChargeRecord;
      return {
        chargeId: d.id,
        encounterId: charge.encounterId,
        patientName: d.patient?.fullName,
        totalAmount: charge.totalAmount,
        itemCount: charge.items.length,
        status: charge.status,
        capturedAt: charge.capturedAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
