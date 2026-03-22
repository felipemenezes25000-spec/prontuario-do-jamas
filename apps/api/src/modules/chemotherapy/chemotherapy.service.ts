import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleStatusDto } from './dto/update-cycle-status.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ChemoCycleStatus, Prisma } from '@prisma/client';

@Injectable()
export class ChemotherapyService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // BSA Calculation (DuBois formula)
  // ---------------------------------------------------------------------------

  /**
   * Calculates Body Surface Area using the DuBois formula.
   * BSA (m^2) = 0.007184 * weight(kg)^0.425 * height(cm)^0.725
   */
  static calculateBSA(weight: number, height: number): number {
    if (weight <= 0 || height <= 0) {
      throw new BadRequestException(
        'Weight and height must be positive numbers',
      );
    }
    return (
      0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725)
    );
  }

  // ---------------------------------------------------------------------------
  // Protocols
  // ---------------------------------------------------------------------------

  async createProtocol(tenantId: string, dto: CreateProtocolDto) {
    return this.prisma.chemotherapyProtocol.create({
      data: {
        tenantId,
        name: dto.name,
        nameEn: dto.nameEn,
        regimen: dto.regimen,
        indication: dto.indication,
        drugs: dto.drugs as unknown as Prisma.InputJsonValue,
        premedications: dto.premedications
          ? (dto.premedications as unknown as Prisma.InputJsonValue)
          : undefined,
        cycleDays: dto.cycleDays,
        maxCycles: dto.maxCycles,
        emetogenicRisk: dto.emetogenicRisk,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findProtocols(tenantId: string, pagination: PaginationQueryDto) {
    const where = { tenantId };

    const [data, total] = await Promise.all([
      this.prisma.chemotherapyProtocol.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { cycles: true } },
        },
      }),
      this.prisma.chemotherapyProtocol.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findProtocolById(tenantId: string, id: string) {
    const protocol = await this.prisma.chemotherapyProtocol.findFirst({
      where: { id, tenantId },
      include: {
        cycles: {
          orderBy: { cycleNumber: 'asc' },
          include: {
            patient: { select: { id: true, fullName: true, mrn: true } },
          },
        },
      },
    });

    if (!protocol) {
      throw new NotFoundException(
        `Chemotherapy protocol with ID "${id}" not found`,
      );
    }

    return protocol;
  }

  // ---------------------------------------------------------------------------
  // Cycles
  // ---------------------------------------------------------------------------

  async createCycle(tenantId: string, dto: CreateCycleDto) {
    // Validate protocol exists
    const protocol = await this.prisma.chemotherapyProtocol.findFirst({
      where: { id: dto.protocolId, tenantId },
    });

    if (!protocol) {
      throw new NotFoundException(
        `Protocol with ID "${dto.protocolId}" not found`,
      );
    }

    // Validate cycle number does not exceed maxCycles
    if (dto.cycleNumber > protocol.maxCycles) {
      throw new BadRequestException(
        `Cycle number ${dto.cycleNumber} exceeds maximum cycles (${protocol.maxCycles}) for this protocol`,
      );
    }

    // Calculate BSA if weight and height provided
    let bsa: number | undefined;
    let adjustedDoses: Record<string, unknown>[] | undefined;

    if (dto.weight && dto.height) {
      bsa = ChemotherapyService.calculateBSA(dto.weight, dto.height);

      // Calculate adjusted doses based on BSA
      const drugs = protocol.drugs as unknown as Array<{
        name: string;
        dose: number;
        unit: string;
        route?: string;
        day?: number;
        infusionTime?: string;
      }>;

      adjustedDoses = drugs.map((drug) => ({
        name: drug.name,
        originalDose: drug.dose,
        unit: drug.unit,
        adjustedDose: parseFloat((drug.dose * bsa!).toFixed(2)),
        route: drug.route,
        day: drug.day,
        infusionTime: drug.infusionTime,
      }));
    }

    return this.prisma.chemotherapyCycle.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        protocolId: dto.protocolId,
        cycleNumber: dto.cycleNumber,
        scheduledDate: new Date(dto.scheduledDate),
        weight: dto.weight,
        height: dto.height,
        bsa: bsa ? parseFloat(bsa.toFixed(4)) : undefined,
        adjustedDoses: adjustedDoses
          ? (adjustedDoses as unknown as Prisma.InputJsonValue)
          : undefined,
        nurseNotes: dto.nurseNotes,
        doctorNotes: dto.doctorNotes,
      },
      include: {
        protocol: { select: { id: true, name: true, regimen: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });
  }

  async findCyclesByPatient(tenantId: string, patientId: string) {
    return this.prisma.chemotherapyCycle.findMany({
      where: { tenantId, patientId },
      include: {
        protocol: {
          select: { id: true, name: true, regimen: true, maxCycles: true },
        },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
      orderBy: [{ scheduledDate: 'desc' }, { cycleNumber: 'asc' }],
    });
  }

  async updateCycleStatus(
    tenantId: string,
    cycleId: string,
    dto: UpdateCycleStatusDto,
  ) {
    const cycle = await this.prisma.chemotherapyCycle.findFirst({
      where: { id: cycleId, tenantId },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Chemotherapy cycle with ID "${cycleId}" not found`,
      );
    }

    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === ChemoCycleStatus.IN_PROGRESS) {
      data.startedAt = new Date();
    }

    if (
      dto.status === ChemoCycleStatus.COMPLETED ||
      dto.status === ChemoCycleStatus.CANCELLED
    ) {
      data.completedAt = new Date();
    }

    if (dto.toxicities) {
      data.toxicities = dto.toxicities as unknown as Prisma.InputJsonValue;
    }

    if (dto.labResults) {
      data.labResults = dto.labResults as unknown as Prisma.InputJsonValue;
    }

    if (dto.nurseNotes !== undefined) {
      data.nurseNotes = dto.nurseNotes;
    }

    if (dto.doctorNotes !== undefined) {
      data.doctorNotes = dto.doctorNotes;
    }

    return this.prisma.chemotherapyCycle.update({
      where: { id: cycleId },
      data,
      include: {
        protocol: { select: { id: true, name: true, regimen: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });
  }
}
