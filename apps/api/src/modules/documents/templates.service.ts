import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
        variables: (dto.variables as any) ?? undefined,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.documentTemplate.findMany({
      where: { tenantId, isActive: true },
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
      data: dto as any,
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
