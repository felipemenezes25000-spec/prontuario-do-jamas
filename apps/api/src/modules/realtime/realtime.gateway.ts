import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface VitalSignsPayload {
  id: string;
  patientId?: string;
  encounterId?: string;
  [key: string]: unknown;
}

export interface AlertPayload {
  id: string;
  type: string;
  title: string;
  [key: string]: unknown;
}

export interface PrescriptionPayload {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface MedicationCheckPayload {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface BedPayload {
  id: string;
  label: string;
  status: string;
  [key: string]: unknown;
}

export interface TranscriptionCompletePayload {
  text?: string;
  error?: string;
  [key: string]: unknown;
}

export interface TriageQueuePayload {
  queue: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface EncounterStatusPayload {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface NotificationPayload {
  type: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    const userId = client.handshake.query.userId as string;

    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }
    if (userId) {
      client.join(`user:${userId}`);
    }

    this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId}, user: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Join a specific encounter room for real-time updates
  @SubscribeMessage('join:encounter')
  handleJoinEncounter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { encounterId: string },
  ) {
    client.join(`encounter:${data.encounterId}`);
    this.logger.log(`Client ${client.id} joined encounter ${data.encounterId}`);
  }

  @SubscribeMessage('leave:encounter')
  handleLeaveEncounter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { encounterId: string },
  ) {
    client.leave(`encounter:${data.encounterId}`);
  }

  // Join patient room for vitals/alerts
  @SubscribeMessage('join:patient')
  handleJoinPatient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { patientId: string },
  ) {
    client.join(`patient:${data.patientId}`);
  }

  // Join ward room for bed updates
  @SubscribeMessage('join:ward')
  handleJoinWard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ward: string },
  ) {
    client.join(`ward:${data.ward}`);
  }

  // === Emit methods (called by services) ===

  // Vital signs recorded — scoped to patient + encounter rooms
  emitVitalSigns(patientId: string, encounterId: string, vitals: VitalSignsPayload) {
    this.server.to(`patient:${patientId}`).emit('vitals:new', vitals);
    if (encounterId) {
      this.server.to(`encounter:${encounterId}`).emit('vitals:new', vitals);
    }
  }

  // New clinical alert — scoped to tenant + patient rooms
  emitAlert(tenantId: string, patientId: string, alert: AlertPayload) {
    this.server.to(`tenant:${tenantId}`).emit('alert:new', alert);
    this.server.to(`patient:${patientId}`).emit('alert:new', alert);
  }

  // Prescription updated — scoped to encounter room
  emitPrescriptionUpdate(encounterId: string, prescription: PrescriptionPayload) {
    this.server.to(`encounter:${encounterId}`).emit('prescription:updated', prescription);
  }

  // Medication checked by nurse — scoped to encounter room
  emitMedicationCheck(encounterId: string, check: MedicationCheckPayload) {
    this.server.to(`encounter:${encounterId}`).emit('medication:checked', check);
  }

  // Bed status changed — scoped to ward + tenant rooms
  emitBedUpdate(tenantId: string, ward: string, bed: BedPayload) {
    this.server.to(`ward:${ward}`).emit('bed:updated', bed);
    this.server.to(`tenant:${tenantId}`).emit('bed:updated', bed);
  }

  // Voice transcription streaming (partial results) — scoped to user room
  emitTranscriptionPartial(userId: string, text: string) {
    this.server.to(`user:${userId}`).emit('transcription:partial', { text });
  }

  emitTranscriptionComplete(userId: string, data: TranscriptionCompletePayload) {
    this.server.to(`user:${userId}`).emit('transcription:complete', data);
  }

  // Triage queue updated — scoped to tenant room
  emitTriageQueueUpdate(tenantId: string, queue: TriageQueuePayload) {
    this.server.to(`tenant:${tenantId}`).emit('triage:queue-updated', queue);
  }

  // Notification for specific user — scoped to user room
  emitNotification(userId: string, notification: NotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Encounter status changed — scoped to tenant room
  emitEncounterStatusChange(tenantId: string, encounter: EncounterStatusPayload) {
    this.server.to(`tenant:${tenantId}`).emit('encounter:status-changed', encounter);
  }
}
