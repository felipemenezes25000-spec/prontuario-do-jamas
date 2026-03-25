import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSkinAssessmentDto,
  RegisterWoundDto,
  UpdateWoundEvolutionDto,
  CreateRepositioningScheduleDto,
} from './dto/create-pressure-injury.dto';

@Injectable()
export class PressureInjuryService {
  constructor(private readonly prisma: PrismaService) {}

  async createSkinAssessment(
    tenantId: string,
    authorId: string,
    dto: CreateSkinAssessmentDto,
  ) {
    const bradenTotal = dto.bradenItems.reduce((s, i) => s + i.score, 0);
    const riskLevel =
      bradenTotal <= 9
        ? 'VERY_HIGH'
        : bradenTotal <= 12
          ? 'HIGH'
          : bradenTotal <= 14
            ? 'MODERATE'
            : bradenTotal <= 18
              ? 'MILD'
              : 'NO_RISK';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Skin Assessment — Pressure Injury Prevention',
        content: JSON.stringify({
          documentType: 'SKIN_ASSESSMENT',
          bradenItems: dto.bradenItems,
          bradenTotal,
          riskLevel,
          skinIntegrityNotes: dto.skinIntegrityNotes,
          areasOfConcern: dto.areasOfConcern,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, bradenTotal, riskLevel, createdAt: doc.createdAt };
  }

  async registerWound(
    tenantId: string,
    authorId: string,
    dto: RegisterWoundDto,
  ) {
    const areaCm2 =
      dto.lengthCm && dto.widthCm ? dto.lengthCm * dto.widthCm : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `Pressure Injury — ${dto.stage} — ${dto.location}`,
        content: JSON.stringify({
          documentType: 'PRESSURE_INJURY_WOUND',
          stage: dto.stage,
          location: dto.location,
          locationDescription: dto.locationDescription,
          lengthCm: dto.lengthCm,
          widthCm: dto.widthCm,
          depthCm: dto.depthCm,
          areaCm2,
          woundBedTissue: dto.woundBedTissue,
          exudateAmount: dto.exudateAmount,
          exudateType: dto.exudateType,
          periwoundCondition: dto.periwoundCondition,
          observations: dto.observations,
          evolutions: [],
          registeredAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, stage: dto.stage, location: dto.location, areaCm2, createdAt: doc.createdAt };
  }

  async updateWoundEvolution(
    tenantId: string,
    authorId: string,
    woundId: string,
    dto: UpdateWoundEvolutionDto,
  ) {
    const wound = await this.prisma.clinicalDocument.findFirst({
      where: { id: woundId, tenantId },
    });

    if (!wound) {
      throw new NotFoundException(`Wound with ID "${woundId}" not found`);
    }

    const existing = JSON.parse(wound.content ?? '{}');
    const evolutions = existing.evolutions ?? [];
    const areaCm2 =
      dto.lengthCm && dto.widthCm ? dto.lengthCm * dto.widthCm : undefined;

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
          stage: dto.stage ?? existing.stage,
          evolutions,
        }),
      },
    });

    return { id: woundId, evolutionCount: evolutions.length, latestEvolution: evolutions[evolutions.length - 1] };
  }

  async createRepositioningSchedule(
    tenantId: string,
    authorId: string,
    dto: CreateRepositioningScheduleDto,
  ) {
    const defaultPositions = [
      'Decubito Dorsal',
      'Decubito Lateral Esquerdo',
      'Decubito Lateral Direito',
      'Semi-Fowler',
    ];

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Repositioning Schedule',
        content: JSON.stringify({
          documentType: 'REPOSITIONING_SCHEDULE',
          intervalHours: dto.intervalHours,
          startAt: dto.startAt ?? new Date().toISOString(),
          positions: dto.positions ?? defaultPositions,
          specialInstructions: dto.specialInstructions,
          active: true,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, intervalHours: dto.intervalHours, createdAt: doc.createdAt };
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        OR: [
          { title: { startsWith: 'Skin Assessment' } },
          { title: { startsWith: 'Pressure Injury' } },
          { title: 'Repositioning Schedule' },
        ],
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
