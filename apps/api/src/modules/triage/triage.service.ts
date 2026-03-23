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
          flowchartCode: dto.flowchartCode,
          discriminatorPath: dto.discriminatorPath ?? undefined,
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

  // ── Manchester Flowcharts ──────────────────────────────────────────────

  async getFlowcharts(tenantId: string) {
    return this.prisma.manchesterFlowchart.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
        isActive: true,
      },
    });
  }

  async getFlowchartByCode(code: string, tenantId: string) {
    const flowchart = await this.prisma.manchesterFlowchart.findFirst({
      where: { code, tenantId, isActive: true },
    });

    if (!flowchart) {
      throw new NotFoundException(`Manchester flowchart "${code}" not found`);
    }

    return flowchart;
  }

  async suggestFlowchart(chiefComplaint: string, tenantId: string) {
    // Simple keyword-based suggestion — maps common Portuguese complaints to flowchart codes
    const complaintLower = chiefComplaint.toLowerCase();
    const keywordMap: Array<{ keywords: string[]; code: string }> = [
      { keywords: ['dor no peito', 'dor torácica', 'dor precordial', 'aperto no peito'], code: 'DOR_TORACICA' },
      { keywords: ['falta de ar', 'dispneia', 'dificuldade respirar', 'falta ar'], code: 'DISPNEIA' },
      { keywords: ['dor abdominal', 'dor na barriga', 'dor abdome', 'cólica'], code: 'DOR_ABDOMINAL' },
      { keywords: ['dor de cabeça', 'cefaleia', 'enxaqueca', 'cefaléia'], code: 'CEFALEIA' },
      { keywords: ['febre', 'temperatura alta', 'febril'], code: 'FEBRE' },
      { keywords: ['trauma', 'fratura', 'torção', 'lesão', 'bateu', 'caiu'], code: 'TRAUMA_EXTREMIDADE' },
      { keywords: ['dor lombar', 'lombalgia', 'dor nas costas'], code: 'DOR_LOMBAR' },
      { keywords: ['mal estar', 'mal-estar', 'indisposição', 'fraqueza'], code: 'MAL_ESTAR' },
      { keywords: ['vômito', 'vomito', 'náusea', 'nausea', 'ânsia'], code: 'VOMITOS' },
      { keywords: ['diarreia', 'diarréia', 'fezes líquidas'], code: 'DIARREIA' },
      { keywords: ['desmai', 'síncope', 'sincope', 'perda de consciência'], code: 'SINCOPE' },
      { keywords: ['convulsão', 'convulsao', 'epilepsia', 'crise convulsiva'], code: 'CONVULSAO' },
      { keywords: ['sangramento', 'hemorragia', 'sangue'], code: 'SANGRAMENTO' },
      { keywords: ['queimadura', 'queimou', 'escaldadura'], code: 'QUEIMADURA' },
      { keywords: ['alergia', 'alérgica', 'alérgico', 'urticária', 'anafilaxia'], code: 'REACAO_ALERGICA' },
    ];

    for (const entry of keywordMap) {
      if (entry.keywords.some((kw) => complaintLower.includes(kw))) {
        const flowchart = await this.prisma.manchesterFlowchart.findFirst({
          where: { code: entry.code, tenantId, isActive: true },
          select: { id: true, name: true, code: true, category: true },
        });
        if (flowchart) {
          return { suggested: flowchart, confidence: 0.85 };
        }
      }
    }

    return { suggested: null, confidence: 0 };
  }
}
