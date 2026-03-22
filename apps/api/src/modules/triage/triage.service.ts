import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTriageDto, UpdateTriageDto } from './dto/create-triage.dto';

@Injectable()
export class TriageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(nurseId: string, dto: CreateTriageDto) {
    return this.prisma.$transaction(async (tx) => {
      const triage = await tx.triageAssessment.create({
        data: {
          encounterId: dto.encounterId,
          nurseId,
          protocol: dto.protocol ?? 'MANCHESTER',
          chiefComplaint: dto.chiefComplaint,
          symptomOnset: dto.symptomOnset,
          symptomDuration: dto.symptomDuration,
          painScale: dto.painScale,
          painLocation: dto.painLocation,
          painCharacter: dto.painCharacter,
          selectedDiscriminator: dto.selectedDiscriminator,
          level: dto.level,
          levelDescription: dto.levelDescription,
          maxWaitTimeMinutes: dto.maxWaitTimeMinutes,
          reassessmentTimeMinutes: dto.reassessmentTimeMinutes,
          vitalSignsId: dto.vitalSignsId,
          voiceTranscriptionId: dto.voiceTranscriptionId,
          completedAt: new Date(),
        },
      });

      // Update encounter triage level and status
      await tx.encounter.update({
        where: { id: dto.encounterId },
        data: {
          triageLevel: dto.level,
          triagedAt: new Date(),
          triageNurseId: nurseId,
          status: 'WAITING',
        },
      });

      return triage;
    });
  }

  async findByEncounter(encounterId: string) {
    const triage = await this.prisma.triageAssessment.findUnique({
      where: { encounterId },
      include: {
        nurse: { select: { id: true, name: true } },
        vitalSigns: true,
      },
    });

    if (!triage) {
      throw new NotFoundException(
        `Triage assessment for encounter "${encounterId}" not found`,
      );
    }

    return triage;
  }

  async update(encounterId: string, dto: UpdateTriageDto) {
    const existing = await this.prisma.triageAssessment.findUnique({
      where: { encounterId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Triage assessment for encounter "${encounterId}" not found`,
      );
    }

    const data: Record<string, unknown> = { ...dto };

    if (dto.level && dto.level !== existing.level) {
      data.overriddenByNurse = true;

      // Also update encounter
      await this.prisma.encounter.update({
        where: { id: encounterId },
        data: { triageLevel: dto.level },
      });
    }

    return this.prisma.triageAssessment.update({
      where: { encounterId },
      data,
    });
  }

  async getWaitingQueue(tenantId: string) {
    const triageLevelOrder = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'];

    const encounters = await this.prisma.encounter.findMany({
      where: {
        tenantId,
        status: { in: ['WAITING', 'IN_TRIAGE'] },
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, birthDate: true } },
        triageAssessment: {
          include: {
            nurse: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Sort by triage level priority, then by creation time
    return encounters.sort((a, b) => {
      const aLevel = a.triageLevel
        ? triageLevelOrder.indexOf(a.triageLevel)
        : triageLevelOrder.length;
      const bLevel = b.triageLevel
        ? triageLevelOrder.indexOf(b.triageLevel)
        : triageLevelOrder.length;

      if (aLevel !== bLevel) return aLevel - bLevel;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
}
