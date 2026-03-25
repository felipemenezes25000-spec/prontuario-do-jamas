import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEducationContentDto } from './patient-education.dto';

interface EducationContent {
  id: string;
  title: string;
  body: string;
  contentType: string;
  relatedConditions: string[];
  language: string;
  mediaUrl?: string;
  difficultyLevel: string;
  viewCount: number;
  createdAt: string;
}

@Injectable()
export class PatientEducationService {
  constructor(private readonly prisma: PrismaService) {}

  async listContent(
    tenantId: string,
    options: { condition?: string; contentType?: string; page?: number; pageSize?: number },
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: 'EDUCATION:' },
      status: 'SIGNED',
    };

    if (options.condition) {
      where.content = { contains: options.condition };
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const edu = JSON.parse(d.content ?? '{}') as EducationContent;
      return {
        id: d.id,
        title: edu.title,
        contentType: edu.contentType,
        relatedConditions: edu.relatedConditions,
        difficultyLevel: edu.difficultyLevel,
        viewCount: edu.viewCount,
        createdAt: edu.createdAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getContent(tenantId: string, contentId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: contentId, tenantId, type: 'CUSTOM', title: { startsWith: 'EDUCATION:' } },
    });
    if (!doc) throw new NotFoundException('Conteúdo educativo não encontrado.');

    const edu = JSON.parse(doc.content ?? '{}') as EducationContent;
    edu.viewCount = (edu.viewCount ?? 0) + 1;

    await this.prisma.clinicalDocument.update({
      where: { id: contentId },
      data: { content: JSON.stringify(edu) },
    });

    return { contentId: doc.id, title: edu.title, body: edu.body, contentType: edu.contentType, relatedConditions: edu.relatedConditions, language: edu.language, mediaUrl: edu.mediaUrl, difficultyLevel: edu.difficultyLevel, viewCount: edu.viewCount, createdAt: edu.createdAt };
  }

  async createContent(tenantId: string, userEmail: string, dto: CreateEducationContentDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });
    if (!user) throw new ForbiddenException('Usuário não encontrado.');

    const edu: EducationContent = {
      id: crypto.randomUUID(),
      title: dto.title,
      body: dto.body,
      contentType: dto.contentType,
      relatedConditions: dto.relatedConditions,
      language: dto.language ?? 'pt-BR',
      mediaUrl: dto.mediaUrl,
      difficultyLevel: dto.difficultyLevel ?? 'BASIC',
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: (await this.prisma.patient.findFirst({ where: { tenantId }, select: { id: true } }))?.id ?? user.id,
        authorId: user.id,
        type: 'CUSTOM',
        title: `EDUCATION: ${dto.title}`,
        content: JSON.stringify(edu),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, title: dto.title, contentType: dto.contentType };
  }

  async getRecommendedContent(tenantId: string, patientId: string) {
    // Get patient conditions
    const conditions = await this.prisma.chronicCondition.findMany({
      where: { patientId, status: 'ACTIVE' },
      select: { cidCode: true, cidDescription: true },
    });

    const conditionTerms = conditions
      .flatMap((c) => [c.cidCode, c.cidDescription])
      .filter(Boolean) as string[];

    if (conditionTerms.length === 0) {
      return { patientId, recommendations: [], message: 'Nenhuma condição ativa encontrada para recomendações.' };
    }

    // Find education content matching patient conditions
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'EDUCATION:' },
        status: 'SIGNED',
        OR: conditionTerms.map((term) => ({ content: { contains: term } })),
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true },
    });

    const recommendations = docs.map((d) => {
      const edu = JSON.parse(d.content ?? '{}') as EducationContent;
      return {
        id: d.id,
        title: edu.title,
        contentType: edu.contentType,
        difficultyLevel: edu.difficultyLevel,
        matchedConditions: conditionTerms.filter((t) => d.content?.includes(t)),
      };
    });

    return { patientId, recommendations };
  }
}
