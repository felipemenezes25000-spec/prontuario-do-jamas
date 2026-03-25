import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  TransferRequestStatus,
  TransferUrgency,
  TransferRequestResponseDto,
  AvailableBedsResponseDto,
  TransferDashboardResponseDto,
} from './dto/transfer-center.dto';

interface TransferRequest {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  admissionId: string;
  originFacility: string;
  destinationFacility: string;
  urgency: TransferUrgency;
  clinicalReason: string;
  requiredSpecialty?: string;
  requiredBedType?: string;
  transportRequirements?: string;
  clinicalSummary?: string;
  status: TransferRequestStatus;
  requestedById: string;
  requestedAt: Date;
  acceptedById?: string;
  rejectionReason?: string;
  decidedAt?: Date;
}

@Injectable()
export class TransferCenterService {
  private readonly logger = new Logger(TransferCenterService.name);
  private readonly requests = new Map<string, TransferRequest>();

  async createRequest(
    tenantId: string,
    userId: string,
    dto: {
      patientId: string;
      admissionId: string;
      destinationFacility: string;
      urgency: TransferUrgency;
      clinicalReason: string;
      requiredSpecialty?: string;
      requiredBedType?: string;
      transportRequirements?: string;
      clinicalSummary?: string;
    },
  ): Promise<TransferRequestResponseDto> {
    const req: TransferRequest = {
      id: randomUUID(),
      tenantId,
      patientId: dto.patientId,
      patientName: 'Paciente (stub)',
      admissionId: dto.admissionId,
      originFacility: 'Hospital Atual',
      destinationFacility: dto.destinationFacility,
      urgency: dto.urgency,
      clinicalReason: dto.clinicalReason,
      requiredSpecialty: dto.requiredSpecialty,
      requiredBedType: dto.requiredBedType,
      transportRequirements: dto.transportRequirements,
      clinicalSummary: dto.clinicalSummary,
      status: TransferRequestStatus.PENDING,
      requestedById: userId,
      requestedAt: new Date(),
    };
    this.requests.set(req.id, req);
    this.logger.log(`Transfer request created: ${req.id} -> ${dto.destinationFacility}`);
    return this.toResponse(req);
  }

  async listRequests(tenantId: string): Promise<TransferRequestResponseDto[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .map((r) => this.toResponse(r));
  }

  async acceptTransfer(
    tenantId: string,
    userId: string,
    transferId: string,
    _reason?: string,
    _assignedBed?: string,
  ): Promise<TransferRequestResponseDto> {
    const req = this.getOrThrow(tenantId, transferId);
    req.status = TransferRequestStatus.ACCEPTED;
    req.acceptedById = userId;
    req.decidedAt = new Date();
    this.logger.log(`Transfer ${transferId} accepted`);
    return this.toResponse(req);
  }

  async rejectTransfer(
    tenantId: string,
    userId: string,
    transferId: string,
    reason?: string,
  ): Promise<TransferRequestResponseDto> {
    const req = this.getOrThrow(tenantId, transferId);
    req.status = TransferRequestStatus.REJECTED;
    req.rejectionReason = reason;
    req.decidedAt = new Date();
    this.logger.log(`Transfer ${transferId} rejected: ${reason}`);
    return this.toResponse(req);
  }

  async getAvailableBeds(_tenantId: string): Promise<AvailableBedsResponseDto> {
    return {
      facilities: [
        {
          facilityName: 'Hospital Central',
          facilityId: randomUUID(),
          beds: [
            { bedId: randomUUID(), ward: 'Ala A', room: '101', bedNumber: '1', type: 'WARD', status: 'AVAILABLE' },
            { bedId: randomUUID(), ward: 'UTI', room: '201', bedNumber: '3', type: 'ICU', status: 'AVAILABLE' },
          ],
          totalAvailable: 2,
        },
        {
          facilityName: 'Hospital Referência',
          facilityId: randomUUID(),
          beds: [
            { bedId: randomUUID(), ward: 'Ala B', room: '305', bedNumber: '2', type: 'WARD', status: 'AVAILABLE' },
          ],
          totalAvailable: 1,
        },
      ],
    };
  }

  async getDashboard(_tenantId: string): Promise<TransferDashboardResponseDto> {
    return {
      pendingRequests: 4,
      activeTransfers: 2,
      completedToday: 6,
      rejectedToday: 1,
      avgResponseTimeMinutes: 45,
      byUrgency: { ELECTIVE: 3, URGENT: 2, EMERGENCY: 1 },
      recentTransfers: [
        {
          id: randomUUID(),
          patientName: 'João Silva',
          origin: 'Hospital Atual',
          destination: 'Hospital Central',
          status: TransferRequestStatus.ACCEPTED,
          urgency: TransferUrgency.URGENT,
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ],
    };
  }

  private getOrThrow(tenantId: string, id: string): TransferRequest {
    const req = this.requests.get(id);
    if (!req || req.tenantId !== tenantId) {
      throw new NotFoundException(`Transfer request ${id} not found`);
    }
    return req;
  }

  private toResponse(req: TransferRequest): TransferRequestResponseDto {
    return {
      id: req.id,
      patientId: req.patientId,
      patientName: req.patientName,
      originFacility: req.originFacility,
      destinationFacility: req.destinationFacility,
      status: req.status,
      urgency: req.urgency,
      clinicalReason: req.clinicalReason,
      requiredSpecialty: req.requiredSpecialty,
      requiredBedType: req.requiredBedType,
      transportRequirements: req.transportRequirements,
      acceptedById: req.acceptedById,
      rejectionReason: req.rejectionReason,
      requestedById: req.requestedById,
      requestedAt: req.requestedAt,
      decidedAt: req.decidedAt,
    };
  }
}
