import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InstrumentStatus,
  SterilizationMethod,
  SterilizationResult,
  InstrumentSetResponseDto,
  SterilizationCycleResponseDto,
  SurgicalKitResponseDto,
  InstrumentTraceabilityResponseDto,
  BiologicalIndicatorResponseDto,
  CmeDashboardResponseDto,
} from './dto/cme.dto';

interface InstrumentSet {
  id: string;
  tenantId: string;
  name: string;
  instruments: string[];
  category?: string;
  serialNumber?: string;
  manufacturer?: string;
  status: InstrumentStatus;
  lastSterilizedAt?: Date;
  lastSterilizationCycle?: string;
  createdAt: Date;
}

interface SterilizationCycle {
  id: string;
  tenantId: string;
  instrumentSetId: string;
  method: SterilizationMethod;
  cycleNumber: string;
  temperature: number;
  durationMinutes: number;
  result: SterilizationResult;
  biologicalIndicatorLot?: string;
  chemicalIndicatorResult?: string;
  operatorId: string;
  performedAt: Date;
}

@Injectable()
export class CmeService {
  private readonly logger = new Logger(CmeService.name);
  private readonly instrumentSets = new Map<string, InstrumentSet>();
  private readonly sterilizationCycles = new Map<string, SterilizationCycle>();

  async registerInstrument(
    tenantId: string,
    userId: string,
    name: string,
    instruments: string[],
    category?: string,
    serialNumber?: string,
    manufacturer?: string,
  ): Promise<InstrumentSetResponseDto> {
    this.logger.log(`Registering instrument set: ${name}`);

    const set: InstrumentSet = {
      id: randomUUID(),
      tenantId,
      name,
      instruments,
      category,
      serialNumber,
      manufacturer,
      status: InstrumentStatus.AVAILABLE,
      createdAt: new Date(),
    };

    this.instrumentSets.set(set.id, set);

    return {
      id: set.id,
      name: set.name,
      instruments: set.instruments,
      category: set.category,
      serialNumber: set.serialNumber,
      status: set.status,
      createdAt: set.createdAt,
    };
  }

  async recordSterilization(
    tenantId: string,
    operatorId: string,
    instrumentSetId: string,
    method: SterilizationMethod,
    cycleNumber: string,
    temperature: number,
    durationMinutes: number,
    biologicalIndicatorLot?: string,
    chemicalIndicatorResult?: string,
    result: SterilizationResult = SterilizationResult.APPROVED,
  ): Promise<SterilizationCycleResponseDto> {
    this.logger.log(`Recording sterilization cycle ${cycleNumber} for instrument ${instrumentSetId}`);

    const cycle: SterilizationCycle = {
      id: randomUUID(),
      tenantId,
      instrumentSetId,
      method,
      cycleNumber,
      temperature,
      durationMinutes,
      result,
      biologicalIndicatorLot,
      chemicalIndicatorResult,
      operatorId,
      performedAt: new Date(),
    };

    this.sterilizationCycles.set(cycle.id, cycle);

    // Update instrument set status
    const set = this.instrumentSets.get(instrumentSetId);
    if (set && set.tenantId === tenantId) {
      set.lastSterilizedAt = cycle.performedAt;
      set.lastSterilizationCycle = cycleNumber;
      set.status = result === SterilizationResult.APPROVED
        ? InstrumentStatus.AVAILABLE
        : InstrumentStatus.STERILIZING;
    }

    return cycle;
  }

  async prepareSurgicalKit(
    tenantId: string,
    userId: string,
    surgicalProcedureId: string,
    instrumentSetIds: string[],
    additionalItems?: string[],
    scheduledFor?: string,
  ): Promise<SurgicalKitResponseDto> {
    this.logger.log(`Preparing surgical kit for procedure ${surgicalProcedureId}`);

    const sets = instrumentSetIds
      .map((id) => this.instrumentSets.get(id))
      .filter((s): s is InstrumentSet => s !== undefined && s.tenantId === tenantId)
      .map((s) => ({
        id: s.id,
        name: s.name,
        instruments: s.instruments,
        category: s.category,
        serialNumber: s.serialNumber,
        status: s.status,
        lastSterilizedAt: s.lastSterilizedAt,
        lastSterilizationCycle: s.lastSterilizationCycle,
        createdAt: s.createdAt,
      }));

    return {
      id: randomUUID(),
      surgicalProcedureId,
      instrumentSets: sets,
      additionalItems,
      preparedById: userId,
      preparedAt: new Date(),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    };
  }

  async getInstrumentTracking(
    tenantId: string,
    instrumentId: string,
  ): Promise<InstrumentTraceabilityResponseDto> {
    const set = this.instrumentSets.get(instrumentId);
    if (!set || set.tenantId !== tenantId) {
      throw new NotFoundException(`Instrument set ${instrumentId} not found`);
    }

    const cycles = Array.from(this.sterilizationCycles.values())
      .filter((c) => c.instrumentSetId === instrumentId && c.tenantId === tenantId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

    return {
      instrumentSetId: set.id,
      name: set.name,
      currentStatus: set.status,
      history: [
        { action: 'REGISTERED', performedBy: 'system', performedAt: set.createdAt },
        ...cycles.map((c) => ({
          action: `STERILIZATION_${c.result}`,
          performedBy: c.operatorId,
          performedAt: c.performedAt,
          details: `Método: ${c.method}, Ciclo: ${c.cycleNumber}`,
        })),
      ],
    };
  }

  async getBiologicalIndicators(
    _tenantId: string,
  ): Promise<BiologicalIndicatorResponseDto[]> {
    // Stub — returns mock data
    return [
      {
        id: randomUUID(),
        lot: 'BI-2026-0342',
        cycleId: randomUUID(),
        incubationStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        incubationCompletedAt: new Date(),
        result: 'NEGATIVE',
        readById: randomUUID(),
      },
      {
        id: randomUUID(),
        lot: 'BI-2026-0343',
        cycleId: randomUUID(),
        incubationStartedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        result: 'PENDING',
        readById: randomUUID(),
      },
    ];
  }

  async getDashboard(_tenantId: string): Promise<CmeDashboardResponseDto> {
    return {
      totalInstrumentSets: this.instrumentSets.size || 156,
      sterilizationCyclesToday: 23,
      pendingBiologicalIndicators: 4,
      failedCyclesThisWeek: 1,
      kitsReadyForSurgery: 8,
      instrumentsByStatus: {
        AVAILABLE: 120,
        IN_USE: 25,
        STERILIZING: 8,
        DAMAGED: 2,
        RETIRED: 1,
      },
    };
  }
}
