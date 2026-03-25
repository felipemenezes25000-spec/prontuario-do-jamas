import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DispenseDto, RestockRequestDto } from './dto/create-pyxis.dto';

@Injectable()
export class PyxisIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDispense(tenantId: string, userId: string, dto: DispenseDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: `Pyxis Dispense — ${dto.medicationName}`,
        content: JSON.stringify({
          documentType: 'PYXIS_TRANSACTION',
          transactionType: 'DISPENSE',
          medicationName: dto.medicationName,
          quantity: dto.quantity,
          prescriptionItemId: dto.prescriptionItemId,
          lotNumber: dto.lotNumber,
          cabinetId: dto.cabinetId,
          drawerId: dto.drawerId,
          observations: dto.observations,
          dispensedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      transactionType: 'DISPENSE',
      medicationName: dto.medicationName,
      quantity: dto.quantity,
      dispensedAt: doc.createdAt,
    };
  }

  async getInventory(tenantId: string, cabinetId?: string) {
    // Get all pyxis transactions to compute inventory
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Pyxis' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const inventory: Record<
      string,
      { medicationName: string; currentStock: number; cabinetId: string | null; lastTransaction: string }
    > = {};

    for (const doc of docs) {
      const content = JSON.parse(doc.content ?? '{}');
      if (cabinetId && content.cabinetId !== cabinetId) continue;

      const key = `${content.medicationName}:${content.cabinetId ?? 'default'}`;
      if (!inventory[key]) {
        inventory[key] = {
          medicationName: content.medicationName,
          currentStock: 0,
          cabinetId: content.cabinetId ?? null,
          lastTransaction: doc.createdAt.toISOString(),
        };
      }

      if (content.transactionType === 'RESTOCK') {
        inventory[key].currentStock += content.quantity ?? 0;
      } else if (content.transactionType === 'DISPENSE') {
        inventory[key].currentStock -= content.quantity ?? 0;
      }
    }

    return Object.values(inventory).map((item) => ({
      ...item,
      status:
        item.currentStock <= 0
          ? 'OUT_OF_STOCK'
          : item.currentStock <= 5
            ? 'LOW_STOCK'
            : 'AVAILABLE',
    }));
  }

  async createRestockRequest(tenantId: string, userId: string, dto: RestockRequestDto) {
    // Use a dummy patientId since restock is not patient-specific
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: userId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: `Pyxis Restock — ${dto.medicationName}`,
        content: JSON.stringify({
          documentType: 'PYXIS_TRANSACTION',
          transactionType: 'RESTOCK',
          medicationName: dto.medicationName,
          quantity: dto.quantity,
          cabinetId: dto.cabinetId,
          priority: dto.priority ?? 'NORMAL',
          notes: dto.notes,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, medicationName: dto.medicationName, quantity: dto.quantity, status: 'PENDING' };
  }

  async getTransactions(tenantId: string, cabinetId?: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Pyxis' },
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
      take: 100,
    });

    const transactions = docs.map((d) => ({
      id: d.id,
      ...JSON.parse(d.content ?? '{}'),
      user: d.author,
      createdAt: d.createdAt,
    }));

    if (cabinetId) {
      return transactions.filter((t) => t.cabinetId === cabinetId);
    }

    return transactions;
  }
}
