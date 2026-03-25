import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNutritionAssessmentDto, CreateDietPlanDto, UpdateNutritionDto } from './dto/create-nutrition.dto';

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[NUTRITION:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreateNutritionAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        `Avaliação Nutricional - ${dto.tool}`,
        {
          tool: dto.tool,
          score: dto.score,
          weight: dto.weight,
          height: dto.height,
          bmi: dto.bmi,
          anthropometry: dto.anthropometry,
          labResults: dto.labResults,
          diagnosis: dto.diagnosis,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createDietPlan(tenantId: string, dto: CreateDietPlanDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'DIET_PLAN',
        `Plano Dietético - ${dto.dietType}`,
        {
          dietType: dto.dietType,
          calories: dto.calories,
          macros: dto.macros,
          restrictions: dto.restrictions,
          supplements: dto.supplements,
          schedule: dto.schedule,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[NUTRITION:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateNutritionDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[NUTRITION:' } },
    });
    if (!doc) throw new NotFoundException(`Nutrition record "${id}" not found`);

    const content = doc.content ? JSON.parse(doc.content) : {};
    const updated = { ...content, ...dto.data, updatedNotes: dto.notes };

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: { content: JSON.stringify(updated) },
    });
  }
}
