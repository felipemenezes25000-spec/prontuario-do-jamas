import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  HousekeepingStatus,
  HousekeepingType,
  HousekeepingResponseDto,
  LaundryOrderResponseDto,
  CompanionResponseDto,
  HospitalityDashboardResponseDto,
} from './dto/hospitality.dto';

interface HousekeepingRequest {
  id: string;
  tenantId: string;
  location: string;
  room?: string;
  bedId?: string;
  type: HousekeepingType;
  status: HousekeepingStatus;
  priority?: string;
  notes?: string;
  assignedTo?: string;
  requestedById: string;
  requestedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class HospitalityService {
  private readonly logger = new Logger(HospitalityService.name);
  private readonly housekeeping = new Map<string, HousekeepingRequest>();

  async createHousekeepingRequest(
    tenantId: string,
    userId: string,
    location: string,
    type: HousekeepingType,
    room?: string,
    bedId?: string,
    priority?: string,
    notes?: string,
  ): Promise<HousekeepingResponseDto> {
    const req: HousekeepingRequest = {
      id: randomUUID(),
      tenantId,
      location,
      room,
      bedId,
      type,
      status: HousekeepingStatus.PENDING,
      priority,
      notes,
      requestedById: userId,
      requestedAt: new Date(),
    };
    this.housekeeping.set(req.id, req);
    this.logger.log(`Housekeeping request created: ${req.id} (${type} at ${location})`);
    return this.toHousekeepingResponse(req);
  }

  async getHousekeepingQueue(tenantId: string): Promise<HousekeepingResponseDto[]> {
    return Array.from(this.housekeeping.values())
      .filter((r) => r.tenantId === tenantId && r.status !== HousekeepingStatus.COMPLETED && r.status !== HousekeepingStatus.CANCELLED)
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime())
      .map((r) => this.toHousekeepingResponse(r));
  }

  async updateHousekeepingStatus(
    tenantId: string,
    requestId: string,
    status: HousekeepingStatus,
    notes?: string,
    assignedTo?: string,
  ): Promise<HousekeepingResponseDto> {
    const req = this.housekeeping.get(requestId);
    if (!req || req.tenantId !== tenantId) {
      throw new NotFoundException(`Housekeeping request ${requestId} not found`);
    }
    req.status = status;
    if (notes) req.notes = notes;
    if (assignedTo) req.assignedTo = assignedTo;
    if (status === HousekeepingStatus.COMPLETED) req.completedAt = new Date();
    return this.toHousekeepingResponse(req);
  }

  async createLaundryOrder(
    tenantId: string,
    userId: string,
    location: string,
    itemType: string,
    quantity = 1,
    _notes?: string,
  ): Promise<LaundryOrderResponseDto> {
    this.logger.log(`Laundry order: ${quantity}x ${itemType} from ${location}`);
    return {
      id: randomUUID(),
      location,
      itemType,
      quantity,
      status: 'PENDING',
      orderedAt: new Date(),
    };
  }

  async registerCompanion(
    tenantId: string,
    userId: string,
    patientId: string,
    companionName: string,
    companionCpf: string,
    relationship?: string,
    phone?: string,
    badgeNumber?: string,
  ): Promise<CompanionResponseDto> {
    this.logger.log(`Registering companion ${companionName} for patient ${patientId}`);
    return {
      id: randomUUID(),
      patientId,
      companionName,
      companionCpf,
      relationship,
      badgeNumber: badgeNumber ?? `ACOMP-${Date.now().toString(36).toUpperCase()}`,
      registeredAt: new Date(),
    };
  }

  async getDashboard(_tenantId: string): Promise<HospitalityDashboardResponseDto> {
    return {
      pendingRequests: 7,
      inProgressRequests: 3,
      completedToday: 24,
      avgCompletionTimeMinutes: 35,
      laundryOrdersToday: 12,
      activeCompanions: 45,
      requestsByType: {
        TERMINAL: 8,
        CONCURRENT: 12,
        DISCHARGE: 6,
        EMERGENCY: 1,
      },
    };
  }

  private toHousekeepingResponse(req: HousekeepingRequest): HousekeepingResponseDto {
    return {
      id: req.id,
      location: req.location,
      room: req.room,
      type: req.type,
      status: req.status,
      assignedTo: req.assignedTo,
      notes: req.notes,
      requestedAt: req.requestedAt,
      completedAt: req.completedAt,
    };
  }
}
