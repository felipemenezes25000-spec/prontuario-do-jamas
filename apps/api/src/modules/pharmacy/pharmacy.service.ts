import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { CreateDrugInventoryDto } from './dto/create-drug-inventory.dto';
import { UpdateDrugInventoryDto } from './dto/update-drug-inventory.dto';
import { InventoryStatus } from '@prisma/client';

@Injectable()
export class PharmacyService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Dispensation
  // ============================================================================

  async getPendingDispensation(tenantId: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
        items: {
          include: {
            dispensations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to prescriptions that have items without dispensations
    return prescriptions.filter((p: { items: Array<{ dispensations: unknown[] }> }) =>
      p.items.some((item: { dispensations: unknown[] }) => item.dispensations.length === 0),
    );
  }

  async dispense(
    pharmacistId: string,
    tenantId: string,
    dto: CreateDispensationDto,
  ) {
    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id: dto.prescriptionItemId },
      include: { prescription: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Prescription item with ID "${dto.prescriptionItemId}" not found`,
      );
    }

    if (item.prescription.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot dispense items from a non-active prescription',
      );
    }

    return this.prisma.dispensation.create({
      data: {
        prescriptionItemId: dto.prescriptionItemId,
        pharmacistId,
        quantity: dto.quantity,
        lot: dto.lot,
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : undefined,
        observations: dto.observations,
        tenantId,
      },
      include: {
        prescriptionItem: true,
        pharmacist: { select: { id: true, name: true } },
      },
    });
  }

  async getDispensationHistory(prescriptionId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID "${prescriptionId}" not found`,
      );
    }

    return this.prisma.dispensation.findMany({
      where: {
        prescriptionItem: {
          prescriptionId,
        },
      },
      include: {
        prescriptionItem: {
          select: {
            id: true,
            medicationName: true,
            dose: true,
            route: true,
            frequency: true,
          },
        },
        pharmacist: { select: { id: true, name: true } },
      },
      orderBy: { dispensedAt: 'desc' },
    });
  }

  // ============================================================================
  // Drug Inventory
  // ============================================================================

  async getInventory(
    tenantId: string,
    filters: {
      status?: InventoryStatus;
      location?: string;
      search?: string;
    },
  ) {
    return this.prisma.drugInventory.findMany({
      where: {
        tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.location ? { location: filters.location } : {}),
        ...(filters.search
          ? {
              drugName: {
                contains: filters.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: { drugName: 'asc' },
    });
  }

  async createInventoryEntry(tenantId: string, dto: CreateDrugInventoryDto) {
    return this.prisma.drugInventory.create({
      data: {
        drugName: dto.drugName,
        drugId: dto.drugId,
        lot: dto.lot,
        expirationDate: new Date(dto.expirationDate),
        quantity: dto.quantity,
        minQuantity: dto.minQuantity ?? 10,
        location: dto.location,
        tenantId,
      },
    });
  }

  async updateInventoryEntry(id: string, dto: UpdateDrugInventoryDto) {
    const entry = await this.prisma.drugInventory.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(
        `Drug inventory entry with ID "${id}" not found`,
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.minQuantity !== undefined) data.minQuantity = dto.minQuantity;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.status !== undefined) data.status = dto.status;

    // Auto-set status based on quantity
    if (dto.quantity !== undefined && dto.status === undefined) {
      const minQty = dto.minQuantity ?? entry.minQuantity;
      if (dto.quantity === 0) {
        data.status = InventoryStatus.OUT_OF_STOCK;
      } else if (dto.quantity <= minQty) {
        data.status = InventoryStatus.LOW_STOCK;
      } else {
        data.status = InventoryStatus.AVAILABLE;
      }
    }

    return this.prisma.drugInventory.update({
      where: { id },
      data,
    });
  }

  async getInventoryAlerts(tenantId: string) {
    const now = new Date();

    const [lowStock, expired] = await Promise.all([
      this.prisma.drugInventory.findMany({
        where: {
          tenantId,
          status: { in: [InventoryStatus.LOW_STOCK, InventoryStatus.OUT_OF_STOCK] },
        },
        orderBy: { quantity: 'asc' },
      }),
      this.prisma.drugInventory.findMany({
        where: {
          tenantId,
          expirationDate: { lte: now },
          status: { not: InventoryStatus.EXPIRED },
        },
        orderBy: { expirationDate: 'asc' },
      }),
    ]);

    // Auto-update expired items
    if (expired.length > 0) {
      await this.prisma.drugInventory.updateMany({
        where: {
          id: { in: expired.map((e: { id: string }) => e.id) },
        },
        data: { status: InventoryStatus.EXPIRED },
      });
    }

    return {
      lowStock,
      expired,
      totalLowStock: lowStock.length,
      totalExpired: expired.length,
    };
  }
}
