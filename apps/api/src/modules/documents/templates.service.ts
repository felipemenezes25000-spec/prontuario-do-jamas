import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createdById: string, dto: CreateTemplateDto) {
    return this.prisma.documentTemplate.create({
      data: {
        tenantId,
        createdById,
        name: dto.name,
        type: dto.type,
        category: dto.category,
        content: dto.content,
        variables: dto.variables !== undefined ? (dto.variables as unknown as Prisma.InputJsonValue) : undefined,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAll(tenantId: string, options: { type?: string; category?: string; isActive?: boolean } = {}) {
    const { type, category } = options;
    // Default to showing only active templates unless caller explicitly passes isActive=false
    const isActive = options.isActive !== undefined ? options.isActive : true;

    const where: Record<string, unknown> = { tenantId, isActive };
    if (type) where.type = type;
    if (category) where.category = category;

    return this.prisma.documentTemplate.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findById(id);
    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        content: dto.content,
        variables: dto.variables !== undefined ? (dto.variables as unknown as Prisma.InputJsonValue) : undefined,
        isActive: dto.isActive,
        isDefault: dto.isDefault,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
