import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendMessageDto } from './patient-messaging.dto';

interface MessageThread {
  threadId: string;
  subject: string;
  participantIds: string[];
  messages: MessageEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageEntry {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  attachmentUrl?: string;
  readAt?: string;
  sentAt: string;
}

@Injectable()
export class PatientMessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientAndUser(tenantId: string, userEmail: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true, name: true, role: true },
    });
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.');
    }
    return { userId: user.id, userName: user.name, userRole: user.role, patientId: patient?.id };
  }

  async sendMessage(tenantId: string, userEmail: string, dto: SendMessageDto) {
    const { userId, userName, userRole } = await this.resolvePatientAndUser(tenantId, userEmail);

    if (dto.threadId) {
      // Add to existing thread
      const existingDoc = await this.prisma.clinicalDocument.findFirst({
        where: { id: dto.threadId, tenantId, type: 'CUSTOM' },
      });
      if (!existingDoc) {
        throw new NotFoundException('Thread não encontrada.');
      }

      const thread = JSON.parse(existingDoc.content ?? '{}') as MessageThread;
      const newMessage: MessageEntry = {
        id: crypto.randomUUID(),
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        body: dto.body,
        attachmentUrl: dto.attachmentUrl,
        sentAt: new Date().toISOString(),
      };
      thread.messages.push(newMessage);
      thread.updatedAt = new Date().toISOString();

      await this.prisma.clinicalDocument.update({
        where: { id: dto.threadId },
        data: { content: JSON.stringify(thread) },
      });

      return { threadId: dto.threadId, messageId: newMessage.id };
    }

    // Create new thread
    const threadId = crypto.randomUUID();
    const thread: MessageThread = {
      threadId,
      subject: dto.subject ?? 'Nova mensagem',
      participantIds: [userId, dto.recipientId].filter(Boolean) as string[],
      messages: [
        {
          id: crypto.randomUUID(),
          senderId: userId,
          senderName: userName,
          senderRole: userRole,
          body: dto.body,
          attachmentUrl: dto.attachmentUrl,
          sentAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: (await this.prisma.patient.findFirst({ where: { tenantId, email: userEmail, isActive: true }, select: { id: true } }))?.id ?? userId,
        authorId: userId,
        type: 'CUSTOM',
        title: `MSG: ${thread.subject}`,
        content: JSON.stringify(thread),
        status: 'DRAFT',
      },
    });

    return { threadId: doc.id, messageId: thread.messages[0].id };
  }

  async getInbox(
    tenantId: string,
    userEmail: string,
    options: { page?: number; pageSize?: number },
  ) {
    const { userId } = await this.resolvePatientAndUser(tenantId, userEmail);

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          type: 'CUSTOM',
          title: { startsWith: 'MSG:' },
          OR: [
            { authorId: userId },
            { content: { contains: userId } },
          ],
        },
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          type: 'CUSTOM',
          title: { startsWith: 'MSG:' },
          OR: [{ authorId: userId }, { content: { contains: userId } }],
        },
      }),
    ]);

    const threads = data.map((d) => {
      const thread = JSON.parse(d.content ?? '{}') as MessageThread;
      const lastMessage = thread.messages[thread.messages.length - 1];
      return {
        threadId: d.id,
        subject: thread.subject,
        lastMessage: lastMessage?.body?.substring(0, 100),
        lastMessageAt: lastMessage?.sentAt,
        messageCount: thread.messages.length,
        updatedAt: d.updatedAt,
      };
    });

    return { data: threads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getThread(tenantId: string, userEmail: string, threadId: string) {
    await this.resolvePatientAndUser(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: threadId, tenantId, type: 'CUSTOM', title: { startsWith: 'MSG:' } },
    });
    if (!doc) {
      throw new NotFoundException('Thread não encontrada.');
    }

    const thread = JSON.parse(doc.content ?? '{}') as MessageThread;
    return { threadId: doc.id, subject: thread.subject, participantIds: thread.participantIds, messages: thread.messages, createdAt: thread.createdAt, updatedAt: thread.updatedAt };
  }

  async markAsRead(tenantId: string, userEmail: string, messageId: string) {
    const { userId } = await this.resolvePatientAndUser(tenantId, userEmail);

    // Find the document containing this message
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, type: 'CUSTOM', title: { startsWith: 'MSG:' }, content: { contains: messageId } },
      take: 1,
    });

    if (docs.length === 0) {
      throw new NotFoundException('Mensagem não encontrada.');
    }

    const doc = docs[0];
    const thread = JSON.parse(doc.content ?? '{}') as MessageThread;
    const message = thread.messages.find((m) => m.id === messageId);
    if (message && message.senderId !== userId) {
      message.readAt = new Date().toISOString();
      await this.prisma.clinicalDocument.update({
        where: { id: doc.id },
        data: { content: JSON.stringify(thread) },
      });
    }

    return { messageId, readAt: message?.readAt };
  }
}
