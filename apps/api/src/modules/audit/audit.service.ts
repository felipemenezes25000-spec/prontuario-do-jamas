import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    tenantId?: string;
    userId?: string;
    patientId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        patientId: data.patientId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        previousData: (data.previousData as any) ?? undefined,
        newData: (data.newData as any) ?? undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
      },
    });
  }

  async findAll(
    tenantId: string,
    pagination: PaginationQueryDto,
    filters?: {
      userId?: string;
      action?: AuditAction;
      entity?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;

    if (filters?.dateFrom || filters?.dateTo) {
      where.timestamp = {};
      if (filters?.dateFrom) {
        (where.timestamp as Record<string, unknown>).gte = new Date(filters.dateFrom);
      }
      if (filters?.dateTo) {
        (where.timestamp as Record<string, unknown>).lte = new Date(filters.dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findByUser(userId: string, pagination: PaginationQueryDto) {
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findByPatient(patientId: string, pagination: PaginationQueryDto) {
    const where = { patientId };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
