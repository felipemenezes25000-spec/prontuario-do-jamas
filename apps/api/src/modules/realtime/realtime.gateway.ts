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

  // Vital signs recorded
  emitVitalSigns(patientId: string, encounterId: string, vitals: any) {
    this.server.to(`patient:${patientId}`).emit('vitals:new', vitals);
    if (encounterId) {
      this.server.to(`encounter:${encounterId}`).emit('vitals:new', vitals);
    }
  }

  // New clinical alert
  emitAlert(tenantId: string, patientId: string, alert: any) {
    this.server.to(`tenant:${tenantId}`).emit('alert:new', alert);
    this.server.to(`patient:${patientId}`).emit('alert:new', alert);
  }

  // Prescription updated
  emitPrescriptionUpdate(encounterId: string, prescription: any) {
    this.server.to(`encounter:${encounterId}`).emit('prescription:updated', prescription);
  }

  // Medication checked by nurse
  emitMedicationCheck(encounterId: string, check: any) {
    this.server.to(`encounter:${encounterId}`).emit('medication:checked', check);
  }

  // Bed status changed
  emitBedUpdate(tenantId: string, ward: string, bed: any) {
    this.server.to(`ward:${ward}`).emit('bed:updated', bed);
    this.server.to(`tenant:${tenantId}`).emit('bed:updated', bed);
  }

  // Voice transcription streaming (partial results)
  emitTranscriptionPartial(userId: string, text: string) {
    this.server.to(`user:${userId}`).emit('transcription:partial', { text });
  }

  emitTranscriptionComplete(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('transcription:complete', data);
  }

  // Triage queue updated
  emitTriageQueueUpdate(tenantId: string, queue: any) {
    this.server.to(`tenant:${tenantId}`).emit('triage:queue-updated', queue);
  }

  // Notification for specific user
  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Encounter status changed
  emitEncounterStatusChange(tenantId: string, encounter: any) {
    this.server.to(`tenant:${tenantId}`).emit('encounter:status-changed', encounter);
  }
}
