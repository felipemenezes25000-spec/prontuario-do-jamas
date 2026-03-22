import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BedStatus } from '@prisma/client';

@Injectable()
export class BedsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    filters?: { ward?: string; floor?: string; status?: BedStatus },
  ) {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.ward) {
      where.ward = filters.ward;
    }
    if (filters?.floor) {
      where.floor = filters.floor;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.bed.findMany({
      where,
      include: {
        currentPatient: {
          select: { id: true, fullName: true, mrn: true },
        },
      },
      orderBy: [{ ward: 'asc' }, { room: 'asc' }, { bedNumber: 'asc' }],
    });
  }

  async findAvailable(tenantId: string) {
    return this.prisma.bed.findMany({
      where: { tenantId, status: 'AVAILABLE' },
      orderBy: [{ ward: 'asc' }, { room: 'asc' }, { bedNumber: 'asc' }],
    });
  }

  async updateStatus(id: string, status: BedStatus) {
    const bed = await this.prisma.bed.findUnique({ where: { id } });
    if (!bed) {
      throw new NotFoundException(`Bed with ID "${id}" not found`);
    }

    return this.prisma.bed.update({
      where: { id },
      data: { status },
    });
  }

  async getOccupancyStats(tenantId: string) {
    const beds = await this.prisma.bed.findMany({
      where: { tenantId },
      select: { status: true, ward: true, type: true },
    });

    const total = beds.length;
    const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
    const available = beds.filter((b) => b.status === 'AVAILABLE').length;
    const cleaning = beds.filter((b) => b.status === 'CLEANING').length;
    const maintenance = beds.filter((b) => b.status === 'MAINTENANCE').length;

    // Stats by ward
    const wardStats: Record<string, { total: number; occupied: number; available: number }> = {};
    for (const bed of beds) {
      const ward = bed.ward;
      if (!wardStats[ward]) {
        wardStats[ward] = { total: 0, occupied: 0, available: 0 };
      }
      const ws = wardStats[ward]!;
      ws.total++;
      if (bed.status === 'OCCUPIED') ws.occupied++;
      if (bed.status === 'AVAILABLE') ws.available++;
    }

    return {
      total,
      occupied,
      available,
      cleaning,
      maintenance,
      occupancyRate: total > 0 ? parseFloat(((occupied / total) * 100).toFixed(1)) : 0,
      byWard: wardStats,
    };
  }
}
