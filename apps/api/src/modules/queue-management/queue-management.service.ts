import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  QueueType,
  TicketStatus,
  QueueTicketResponseDto,
  QueueDisplayResponseDto,
  QueueStatusResponseDto,
  WaitTimeResponseDto,
  QueueMetricsResponseDto,
} from './dto/queue-management.dto';

interface QueueTicket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  patientId?: string;
  patientName?: string;
  queueType: QueueType;
  status: TicketStatus;
  service?: string;
  specialty?: string;
  servicePoint?: string;
  issuedAt: Date;
  calledAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class QueueManagementService {
  private readonly logger = new Logger(QueueManagementService.name);
  private readonly tickets = new Map<string, QueueTicket>();
  private readonly counters = new Map<string, number>();

  async issueTicket(
    tenantId: string,
    queueType: QueueType,
    patientId?: string,
    patientName?: string,
    service?: string,
    specialty?: string,
  ): Promise<QueueTicketResponseDto> {
    const prefix = this.getPrefix(queueType);
    const counterKey = `${tenantId}:${prefix}`;
    const current = (this.counters.get(counterKey) ?? 0) + 1;
    this.counters.set(counterKey, current);

    const ticketNumber = `${prefix}${current.toString().padStart(3, '0')}`;

    const ticket: QueueTicket = {
      id: randomUUID(),
      tenantId,
      ticketNumber,
      patientId,
      patientName,
      queueType,
      status: TicketStatus.WAITING,
      service,
      specialty,
      issuedAt: new Date(),
    };

    this.tickets.set(ticket.id, ticket);
    this.logger.log(`Ticket issued: ${ticketNumber} (${queueType})`);

    const position = this.getPosition(tenantId, ticket);

    return { ...this.toResponse(ticket), positionInQueue: position, estimatedWaitMinutes: position * 8 };
  }

  async callNext(
    tenantId: string,
    userId: string,
    servicePoint: string,
    preferredQueue?: QueueType,
    service?: string,
  ): Promise<QueueTicketResponseDto> {
    let waiting = Array.from(this.tickets.values())
      .filter((t) => t.tenantId === tenantId && t.status === TicketStatus.WAITING)
      .sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());

    // Priority queues first
    const priorityOrder = [QueueType.EMERGENCY, QueueType.ELDERLY, QueueType.PREGNANT, QueueType.DISABILITY, QueueType.PRIORITY, QueueType.GENERAL];
    if (preferredQueue) {
      waiting = waiting.filter((t) => t.queueType === preferredQueue);
    } else {
      waiting.sort((a, b) => priorityOrder.indexOf(a.queueType) - priorityOrder.indexOf(b.queueType));
    }

    if (service) waiting = waiting.filter((t) => !t.service || t.service === service);

    const next = waiting[0];
    if (!next) {
      throw new NotFoundException('Nenhum paciente na fila');
    }

    next.status = TicketStatus.CALLED;
    next.calledAt = new Date();
    next.servicePoint = servicePoint;

    this.logger.log(`Calling ${next.ticketNumber} to ${servicePoint}`);

    return this.toResponse(next);
  }

  async getDisplay(tenantId: string): Promise<QueueDisplayResponseDto> {
    const all = Array.from(this.tickets.values()).filter((t) => t.tenantId === tenantId);

    return {
      currentlyServing: all
        .filter((t) => t.status === TicketStatus.CALLED || t.status === TicketStatus.IN_SERVICE)
        .map((t) => ({
          ticketNumber: t.ticketNumber,
          servicePoint: t.servicePoint ?? 'N/A',
          queueType: t.queueType,
          calledAt: t.calledAt ?? t.issuedAt,
        })),
      nextInLine: all
        .filter((t) => t.status === TicketStatus.WAITING)
        .sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime())
        .slice(0, 5)
        .map((t, i) => ({
          ticketNumber: t.ticketNumber,
          queueType: t.queueType,
          position: i + 1,
        })),
      lastCalled: all
        .filter((t) => t.calledAt)
        .sort((a, b) => (b.calledAt?.getTime() ?? 0) - (a.calledAt?.getTime() ?? 0))
        .slice(0, 5)
        .map((t) => ({
          ticketNumber: t.ticketNumber,
          servicePoint: t.servicePoint ?? 'N/A',
          calledAt: t.calledAt!,
        })),
      updatedAt: new Date(),
    };
  }

  async getStatus(tenantId: string): Promise<QueueStatusResponseDto> {
    const all = Array.from(this.tickets.values()).filter((t) => t.tenantId === tenantId);
    const waiting = all.filter((t) => t.status === TicketStatus.WAITING);
    const serving = all.filter((t) => t.status === TicketStatus.CALLED || t.status === TicketStatus.IN_SERVICE);
    const completed = all.filter((t) => t.status === TicketStatus.COMPLETED);

    const waitingByType: Record<string, number> = {};
    for (const t of waiting) {
      waitingByType[t.queueType] = (waitingByType[t.queueType] ?? 0) + 1;
    }

    return {
      totalWaiting: waiting.length,
      totalServing: serving.length,
      totalCompleted: completed.length,
      waitingByType,
      avgWaitTimeMinutes: 12,
      longestWaitMinutes: waiting.length > 0 ? Math.round((Date.now() - waiting[0].issuedAt.getTime()) / 60000) : 0,
    };
  }

  async getWaitTimes(_tenantId: string): Promise<WaitTimeResponseDto> {
    return {
      estimates: [
        { queueType: QueueType.GENERAL, service: 'Clínica Geral', estimatedMinutes: 25, currentlyWaiting: 8 },
        { queueType: QueueType.PRIORITY, service: 'Clínica Geral', estimatedMinutes: 10, currentlyWaiting: 3 },
        { queueType: QueueType.GENERAL, service: 'Pediatria', estimatedMinutes: 15, currentlyWaiting: 4 },
        { queueType: QueueType.EMERGENCY, service: 'Emergência', estimatedMinutes: 0, currentlyWaiting: 0 },
      ],
      calculatedAt: new Date(),
    };
  }

  async updateTicketStatus(
    tenantId: string,
    ticketId: string,
    status: TicketStatus,
    _notes?: string,
  ): Promise<QueueTicketResponseDto> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket || ticket.tenantId !== tenantId) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    ticket.status = status;
    if (status === TicketStatus.COMPLETED) ticket.completedAt = new Date();
    return this.toResponse(ticket);
  }

  async getMetrics(_tenantId: string): Promise<QueueMetricsResponseDto> {
    return {
      totalTicketsToday: 156,
      avgWaitTimeMinutes: 18,
      avgServiceTimeMinutes: 12,
      noShowRate: 0.08,
      peakHour: '09:00',
      ticketsByHour: { '07': 12, '08': 25, '09': 34, '10': 28, '11': 22, '12': 15, '13': 20 },
      waitTimeByHour: { '07': 5, '08': 12, '09': 25, '10': 22, '11': 18, '12': 10, '13': 15 },
      servicePointEfficiency: { 'Guichê 1': 0.85, 'Guichê 2': 0.78, 'Guichê 3': 0.92 },
    };
  }

  private getPrefix(type: QueueType): string {
    const map: Record<QueueType, string> = {
      GENERAL: 'G',
      PRIORITY: 'P',
      ELDERLY: 'I',
      PREGNANT: 'GE',
      DISABILITY: 'D',
      EMERGENCY: 'E',
    };
    return map[type] ?? 'G';
  }

  private getPosition(tenantId: string, ticket: QueueTicket): number {
    return Array.from(this.tickets.values())
      .filter((t) => t.tenantId === tenantId && t.status === TicketStatus.WAITING && t.issuedAt <= ticket.issuedAt)
      .length;
  }

  private toResponse(ticket: QueueTicket): QueueTicketResponseDto {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      patientId: ticket.patientId,
      patientName: ticket.patientName,
      queueType: ticket.queueType,
      status: ticket.status,
      service: ticket.service,
      servicePoint: ticket.servicePoint,
      issuedAt: ticket.issuedAt,
      calledAt: ticket.calledAt,
      completedAt: ticket.completedAt,
    };
  }
}
