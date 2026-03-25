import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterWoundDto,
  UpdateWoundEvolutionDto,
  RegisterPhotoDto,
  CreateDressingPlanDto,
} from './dto/create-wound-care.dto';

@Injectable()
export class WoundCareService {
  constructor(private readonly prisma: PrismaService) {}

  async registerWound(tenantId: string, authorId: string, dto: RegisterWoundDto) {
    const areaCm2 = dto.lengthCm && dto.widthCm ? dto.lengthCm * dto.widthCm : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `Wound — ${dto.classification} — ${dto.location}`,
        content: JSON.stringify({
          documentType: 'WOUND_CARE',
          classification: dto.classification,
          location: dto.location,
          etiology: dto.etiology,
          lengthCm: dto.lengthCm,
          widthCm: dto.widthCm,
          depthCm: dto.depthCm,
          underminingCm: dto.underminingCm,
          tunnelingCm: dto.tunnelingCm,
          areaCm2,
          woundBedTissue: dto.woundBedTissue,
          tissuePercentages: dto.tissuePercentages,
          exudateAmount: dto.exudateAmount,
          exudateType: dto.exudateType,
          periwoundCondition: dto.periwoundCondition,
          painLevel: dto.painLevel,
          odor: dto.odor,
          observations: dto.observations,
          evolutions: [],
          photos: [],
          dressingPlan: null,
          registeredAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, classification: dto.classification, location: dto.location, areaCm2, createdAt: doc.createdAt };
  }

  private async getWoundDoc(tenantId: string, woundId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: woundId, tenantId, type: 'CUSTOM' },
    });
    if (!doc) throw new NotFoundException(`Wound with ID "${woundId}" not found`);
    return doc;
  }

  async updateEvolution(tenantId: string, authorId: string, woundId: string, dto: UpdateWoundEvolutionDto) {
    const doc = await this.getWoundDoc(tenantId, woundId);
    const existing = JSON.parse(doc.content ?? '{}');
    const evolutions = existing.evolutions ?? [];
    const areaCm2 = dto.lengthCm && dto.widthCm ? dto.lengthCm * dto.widthCm : undefined;

    evolutions.push({
      authorId,
      ...dto,
      areaCm2,
      recordedAt: new Date().toISOString(),
    });

    await this.prisma.clinicalDocument.update({
      where: { id: woundId },
      data: {
        content: JSON.stringify({
          ...existing,
          classification: dto.classification ?? existing.classification,
          evolutions,
        }),
      },
    });

    return { id: woundId, evolutionCount: evolutions.length };
  }

  async registerPhoto(tenantId: string, authorId: string, woundId: string, dto: RegisterPhotoDto) {
    const doc = await this.getWoundDoc(tenantId, woundId);
    const existing = JSON.parse(doc.content ?? '{}');
    const photos = existing.photos ?? [];

    photos.push({
      authorId,
      photoUrl: dto.photoUrl,
      description: dto.description,
      takenAt: dto.takenAt ?? new Date().toISOString(),
    });

    await this.prisma.clinicalDocument.update({
      where: { id: woundId },
      data: { content: JSON.stringify({ ...existing, photos }) },
    });

    return { id: woundId, photoCount: photos.length };
  }

  async createDressingPlan(tenantId: string, authorId: string, woundId: string, dto: CreateDressingPlanDto) {
    const doc = await this.getWoundDoc(tenantId, woundId);
    const existing = JSON.parse(doc.content ?? '{}');

    const dressingPlan = {
      authorId,
      ...dto,
      createdAt: new Date().toISOString(),
    };

    await this.prisma.clinicalDocument.update({
      where: { id: woundId },
      data: { content: JSON.stringify({ ...existing, dressingPlan }) },
    });

    return { id: woundId, dressingPlan };
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: 'Wound' },
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      ...JSON.parse(d.content ?? '{}'),
      author: d.author,
      createdAt: d.createdAt,
    }));
  }
}
