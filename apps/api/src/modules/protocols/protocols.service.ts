import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProtocolDto, TriggerCriterionDto } from './dto/create-protocol.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';

export interface MatchedProtocol {
  protocol: {
    id: string;
    name: string;
    category: string;
    priority: number;
    description: string;
  };
  matchedCriteria: TriggerCriterionDto[];
  recommendedActions: Array<{ type: string; params: Record<string, unknown> }>;
}

@Injectable()
export class ProtocolsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProtocol(tenantId: string, dto: CreateProtocolDto) {
    return this.prisma.clinicalProtocol.create({
      data: {
        tenantId,
        name: dto.name,
        nameEn: dto.nameEn,
        description: dto.description,
        category: dto.category,
        triggerCriteria: JSON.parse(JSON.stringify(dto.triggerCriteria)) as Prisma.InputJsonValue,
        actions: JSON.parse(JSON.stringify(dto.actions)) as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findProtocols(
    tenantId: string,
    filters?: { category?: string; isActive?: boolean },
  ) {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.clinicalProtocol.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async findProtocolById(tenantId: string, id: string) {
    const protocol = await this.prisma.clinicalProtocol.findFirst({
      where: { id, tenantId },
    });

    if (!protocol) {
      throw new NotFoundException(`Protocol with ID "${id}" not found`);
    }

    return protocol;
  }

  async updateProtocol(tenantId: string, id: string, dto: UpdateProtocolDto) {
    await this.findProtocolById(tenantId, id);

    const data: Prisma.ClinicalProtocolUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.triggerCriteria !== undefined) {
      data.triggerCriteria = JSON.parse(JSON.stringify(dto.triggerCriteria)) as Prisma.InputJsonValue;
    }
    if (dto.actions !== undefined) {
      data.actions = JSON.parse(JSON.stringify(dto.actions)) as Prisma.InputJsonValue;
    }
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.clinicalProtocol.update({
      where: { id },
      data,
    });
  }

  async toggleProtocol(tenantId: string, id: string) {
    const protocol = await this.findProtocolById(tenantId, id);

    return this.prisma.clinicalProtocol.update({
      where: { id },
      data: { isActive: !protocol.isActive },
    });
  }

  async evaluateTriggers(
    tenantId: string,
    encounterData: Record<string, unknown>,
  ): Promise<{ matchedProtocols: MatchedProtocol[] }> {
    const activeProtocols = await this.prisma.clinicalProtocol.findMany({
      where: { tenantId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    const matchedProtocols: MatchedProtocol[] = [];

    for (const protocol of activeProtocols) {
      const criteria = protocol.triggerCriteria as unknown as TriggerCriterionDto[];

      if (!Array.isArray(criteria) || criteria.length === 0) {
        continue;
      }

      const matchedCriteria: TriggerCriterionDto[] = [];

      for (const criterion of criteria) {
        const fieldValue = encounterData[criterion.field];
        if (fieldValue === undefined || fieldValue === null) {
          continue;
        }

        if (this.evaluateCriterion(fieldValue, criterion.operator, criterion.value)) {
          matchedCriteria.push(criterion);
        }
      }

      // Protocol matches if ALL criteria are satisfied
      if (matchedCriteria.length === criteria.length) {
        const actions = protocol.actions as unknown as Array<{
          type: string;
          params: Record<string, unknown>;
        }>;

        matchedProtocols.push({
          protocol: {
            id: protocol.id,
            name: protocol.name,
            category: protocol.category,
            priority: protocol.priority,
            description: protocol.description,
          },
          matchedCriteria,
          recommendedActions: Array.isArray(actions) ? actions : [],
        });
      }
    }

    return { matchedProtocols };
  }

  private evaluateCriterion(
    fieldValue: unknown,
    operator: string,
    criterionValue: unknown,
  ): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === criterionValue;

      case 'neq':
        return fieldValue !== criterionValue;

      case 'gt':
        return Number(fieldValue) > Number(criterionValue);

      case 'gte':
        return Number(fieldValue) >= Number(criterionValue);

      case 'lt':
        return Number(fieldValue) < Number(criterionValue);

      case 'lte':
        return Number(fieldValue) <= Number(criterionValue);

      case 'contains':
        return typeof fieldValue === 'string' &&
          typeof criterionValue === 'string' &&
          fieldValue.toLowerCase().includes(criterionValue.toLowerCase());

      case 'in':
        return Array.isArray(criterionValue) && criterionValue.includes(fieldValue);

      default:
        return false;
    }
  }
}
