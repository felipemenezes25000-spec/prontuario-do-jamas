import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BreakTheGlassReason,
  BreakTheGlassStatus,
  BreakTheGlassEventResponseDto,
  BreakTheGlassAlertsResponseDto,
} from './dto/break-the-glass.dto';

interface BreakTheGlassEvent {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  patientId: string;
  patientName: string;
  reason: BreakTheGlassReason;
  justification: string;
  status: BreakTheGlassStatus;
  accessGrantedAt: Date;
  expiresAt: Date;
  reviewedById?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  actionsPerformed: string[];
}

@Injectable()
export class BreakTheGlassService {
  private readonly logger = new Logger(BreakTheGlassService.name);
  private readonly events = new Map<string, BreakTheGlassEvent>();

  async requestAccess(
    tenantId: string,
    userId: string,
    userRole: string,
    patientId: string,
    reason: BreakTheGlassReason,
    justification: string,
    durationMinutes = 60,
  ): Promise<BreakTheGlassEventResponseDto> {
    this.logger.warn(
      `BREAK-THE-GLASS: User ${userId} (${userRole}) requesting emergency access to patient ${patientId}. Reason: ${reason}`,
    );

    const event: BreakTheGlassEvent = {
      id: randomUUID(),
      tenantId,
      userId,
      userName: 'Profissional (stub)',
      userRole,
      patientId,
      patientName: 'Paciente (stub)',
      reason,
      justification,
      status: BreakTheGlassStatus.ACTIVE,
      accessGrantedAt: new Date(),
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
      actionsPerformed: [],
    };

    this.events.set(event.id, event);

    // In production: send notification to DPO, create audit log entry
    this.logger.warn(`BREAK-THE-GLASS GRANTED: Event ${event.id} — Access until ${event.expiresAt.toISOString()}`);

    return this.toResponse(event);
  }

  async listEvents(tenantId: string): Promise<BreakTheGlassEventResponseDto[]> {
    return Array.from(this.events.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.accessGrantedAt.getTime() - a.accessGrantedAt.getTime())
      .map((e) => this.toResponse(e));
  }

  async getEvent(tenantId: string, eventId: string): Promise<BreakTheGlassEventResponseDto> {
    const event = this.events.get(eventId);
    if (!event || event.tenantId !== tenantId) {
      throw new NotFoundException(`Break-the-glass event ${eventId} not found`);
    }
    return this.toResponse(event);
  }

  async getAlerts(_tenantId: string): Promise<BreakTheGlassAlertsResponseDto> {
    const allEvents = Array.from(this.events.values());
    const unreviewed = allEvents.filter(
      (e) => e.status === BreakTheGlassStatus.ACTIVE || e.status === BreakTheGlassStatus.EXPIRED,
    );

    return {
      alerts: unreviewed.map((e) => ({
        eventId: e.id,
        userId: e.userId,
        userName: e.userName,
        patientName: e.patientName,
        reason: e.reason,
        accessGrantedAt: e.accessGrantedAt,
        requiresReview: true,
        flagReason:
          e.reason === BreakTheGlassReason.OTHER
            ? 'Motivo genérico — requer análise do DPO'
            : undefined,
      })),
      totalUnreviewed: unreviewed.length,
    };
  }

  private toResponse(event: BreakTheGlassEvent): BreakTheGlassEventResponseDto {
    // Check if expired
    if (event.status === BreakTheGlassStatus.ACTIVE && event.expiresAt < new Date()) {
      event.status = BreakTheGlassStatus.EXPIRED;
    }
    return {
      id: event.id,
      userId: event.userId,
      userName: event.userName,
      userRole: event.userRole,
      patientId: event.patientId,
      patientName: event.patientName,
      reason: event.reason,
      justification: event.justification,
      status: event.status,
      accessGrantedAt: event.accessGrantedAt,
      expiresAt: event.expiresAt,
      reviewedById: event.reviewedById,
      reviewedAt: event.reviewedAt,
      reviewNotes: event.reviewNotes,
      actionsPerformed: event.actionsPerformed,
    };
  }
}
