import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EquipmentStatus,
  MaintenanceType,
  EquipmentResponseDto,
  MaintenanceEventResponseDto,
  MaintenanceCalendarResponseDto,
  OverdueMaintenanceResponseDto,
} from './dto/equipment-maintenance.dto';

interface Equipment {
  id: string;
  tenantId: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNumber?: string;
  anvisaRegistration?: string;
  location?: string;
  department?: string;
  status: EquipmentStatus;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  preventiveIntervalDays?: number;
  lastMaintenanceAt?: Date;
  nextMaintenanceAt?: Date;
  createdAt: Date;
}

interface MaintenanceEvent {
  id: string;
  tenantId: string;
  equipmentId: string;
  type: MaintenanceType;
  description: string;
  technician?: string;
  serviceProvider?: string;
  cost?: number;
  partsReplaced?: string;
  performedAt: Date;
  performedById: string;
  nextScheduledDate?: Date;
}

@Injectable()
export class EquipmentMaintenanceService {
  private readonly logger = new Logger(EquipmentMaintenanceService.name);
  private readonly equipment = new Map<string, Equipment>();
  private readonly events = new Map<string, MaintenanceEvent>();

  async registerEquipment(
    tenantId: string,
    dto: {
      name: string;
      model: string;
      manufacturer: string;
      serialNumber?: string;
      anvisaRegistration?: string;
      location?: string;
      department?: string;
      purchaseDate?: string;
      warrantyExpiry?: string;
      preventiveIntervalDays?: number;
    },
  ): Promise<EquipmentResponseDto> {
    const eq: Equipment = {
      id: randomUUID(),
      tenantId,
      name: dto.name,
      model: dto.model,
      manufacturer: dto.manufacturer,
      serialNumber: dto.serialNumber,
      anvisaRegistration: dto.anvisaRegistration,
      location: dto.location,
      department: dto.department,
      status: EquipmentStatus.OPERATIONAL,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
      preventiveIntervalDays: dto.preventiveIntervalDays,
      nextMaintenanceAt: dto.preventiveIntervalDays
        ? new Date(Date.now() + dto.preventiveIntervalDays * 24 * 60 * 60 * 1000)
        : undefined,
      createdAt: new Date(),
    };

    this.equipment.set(eq.id, eq);
    this.logger.log(`Registered equipment: ${eq.name} (${eq.id})`);

    return this.toEquipmentResponse(eq);
  }

  async recordMaintenance(
    tenantId: string,
    userId: string,
    equipmentId: string,
    dto: {
      type: MaintenanceType;
      description: string;
      technician?: string;
      serviceProvider?: string;
      cost?: number;
      partsReplaced?: string;
      nextScheduledDate?: string;
    },
  ): Promise<MaintenanceEventResponseDto> {
    const eq = this.getEquipmentOrThrow(tenantId, equipmentId);

    const event: MaintenanceEvent = {
      id: randomUUID(),
      tenantId,
      equipmentId,
      type: dto.type,
      description: dto.description,
      technician: dto.technician,
      serviceProvider: dto.serviceProvider,
      cost: dto.cost,
      partsReplaced: dto.partsReplaced,
      performedAt: new Date(),
      performedById: userId,
      nextScheduledDate: dto.nextScheduledDate ? new Date(dto.nextScheduledDate) : undefined,
    };

    this.events.set(event.id, event);
    eq.lastMaintenanceAt = event.performedAt;
    if (event.nextScheduledDate) eq.nextMaintenanceAt = event.nextScheduledDate;

    return {
      id: event.id,
      equipmentId: event.equipmentId,
      type: event.type,
      description: event.description,
      technician: event.technician,
      cost: event.cost,
      performedAt: event.performedAt,
      nextScheduledDate: event.nextScheduledDate,
    };
  }

  async getCalendar(_tenantId: string): Promise<MaintenanceCalendarResponseDto> {
    return {
      items: [
        {
          equipmentId: randomUUID(),
          equipmentName: 'Ventilador Mecânico Puritan Bennett 840',
          type: MaintenanceType.PREVENTIVE,
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          department: 'UTI',
          overdue: false,
        },
        {
          equipmentId: randomUUID(),
          equipmentName: 'Monitor Multiparamétrico Philips MX800',
          type: MaintenanceType.CALIBRATION,
          scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          department: 'Centro Cirúrgico',
          overdue: true,
        },
        {
          equipmentId: randomUUID(),
          equipmentName: 'Bomba de Infusão Braun Space',
          type: MaintenanceType.PREVENTIVE,
          scheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          department: 'Enfermaria',
          overdue: false,
        },
      ],
    };
  }

  async getHistory(
    tenantId: string,
    equipmentId: string,
  ): Promise<MaintenanceEventResponseDto[]> {
    this.getEquipmentOrThrow(tenantId, equipmentId);

    return Array.from(this.events.values())
      .filter((e) => e.equipmentId === equipmentId && e.tenantId === tenantId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
      .map((e) => ({
        id: e.id,
        equipmentId: e.equipmentId,
        type: e.type,
        description: e.description,
        technician: e.technician,
        cost: e.cost,
        performedAt: e.performedAt,
        nextScheduledDate: e.nextScheduledDate,
      }));
  }

  async recordCalibration(
    tenantId: string,
    userId: string,
    equipmentId: string,
    dto: {
      standard: string;
      result: string;
      certificate?: string;
      nextCalibrationDate?: string;
      calibratedBy?: string;
    },
  ): Promise<MaintenanceEventResponseDto> {
    return this.recordMaintenance(tenantId, userId, equipmentId, {
      type: MaintenanceType.CALIBRATION,
      description: `Calibração — Padrão: ${dto.standard}, Resultado: ${dto.result}${dto.certificate ? `, Certificado: ${dto.certificate}` : ''}`,
      technician: dto.calibratedBy,
      nextScheduledDate: dto.nextCalibrationDate,
    });
  }

  async getOverdue(_tenantId: string): Promise<OverdueMaintenanceResponseDto> {
    return {
      alerts: [
        {
          equipmentId: randomUUID(),
          equipmentName: 'Monitor Multiparamétrico Philips MX800',
          type: 'CALIBRATION',
          scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          daysOverdue: 2,
          department: 'Centro Cirúrgico',
        },
        {
          equipmentId: randomUUID(),
          equipmentName: 'Desfibrilador Zoll R Series',
          type: 'PREVENTIVE',
          scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          daysOverdue: 5,
          department: 'Pronto Socorro',
        },
      ],
      totalOverdue: 2,
    };
  }

  private getEquipmentOrThrow(tenantId: string, equipmentId: string): Equipment {
    const eq = this.equipment.get(equipmentId);
    if (!eq || eq.tenantId !== tenantId) {
      throw new NotFoundException(`Equipment ${equipmentId} not found`);
    }
    return eq;
  }

  private toEquipmentResponse(eq: Equipment): EquipmentResponseDto {
    return {
      id: eq.id,
      name: eq.name,
      model: eq.model,
      manufacturer: eq.manufacturer,
      serialNumber: eq.serialNumber,
      status: eq.status,
      location: eq.location,
      department: eq.department,
      lastMaintenanceAt: eq.lastMaintenanceAt,
      nextMaintenanceAt: eq.nextMaintenanceAt,
      createdAt: eq.createdAt,
    };
  }
}
