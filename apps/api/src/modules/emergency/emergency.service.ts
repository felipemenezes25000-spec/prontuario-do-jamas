import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTriageDto, UpdateEmergencyStatusDto, ActivateProtocolDto } from './dto/create-triage.dto';
import { ReclassifyRiskDto, CalculateNedocsDto } from './dto/emergency-advanced.dto';

@Injectable()
export class EmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[EMERGENCY:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createTriage(tenantId: string, dto: CreateTriageDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'TRIAGE',
        `Triagem Manchester - ${dto.manchesterLevel}`,
        {
          manchesterLevel: dto.manchesterLevel,
          chiefComplaint: dto.chiefComplaint,
          painScale: dto.painScale,
          vitalSigns: dto.vitalSigns,
          notes: dto.notes,
          doorTime: dto.doorTime ?? new Date().toISOString(),
          triageTime: new Date().toISOString(),
        },
        dto.encounterId,
      ),
    });
  }

  async getBoard(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const board = { waiting: [] as typeof docs, inTreatment: [] as typeof docs, observation: [] as typeof docs, other: [] as typeof docs };

    for (const doc of docs) {
      const content = this.parseContent(doc.content);
      const status = content.currentStatus ?? content.manchesterLevel;
      if (status === 'WAITING' || status === 'IN_TRIAGE') board.waiting.push(doc);
      else if (status === 'IN_TREATMENT') board.inTreatment.push(doc);
      else if (status === 'OBSERVATION') board.observation.push(doc);
      else board.other.push(doc);
    }

    return board;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateEmergencyStatusDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${id}" not found`);

    const content = this.parseContent(doc.content);
    content.currentStatus = dto.status;
    const history = Array.isArray(content.statusHistory) ? content.statusHistory : [];
    history.push({ status: dto.status, notes: dto.notes, location: dto.location, at: new Date().toISOString() });
    content.statusHistory = history;

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: { content: JSON.stringify(content) },
    });
  }

  async getMetrics(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        createdAt: { gte: today },
      },
    });

    let totalWaitMinutes = 0;
    let triageCount = 0;

    for (const doc of docs) {
      const content = this.parseContent(doc.content);
      if (content.doorTime && content.triageTime) {
        const wait = (new Date(String(content.triageTime)).getTime() - new Date(String(content.doorTime)).getTime()) / 60000;
        totalWaitMinutes += wait;
        triageCount++;
      }
    }

    return {
      totalPatients: docs.length,
      averageWaitMinutes: triageCount > 0 ? Math.round(totalWaitMinutes / triageCount) : 0,
      triageCount,
      date: today.toISOString(),
    };
  }

  async activateProtocol(tenantId: string, id: string, dto: ActivateProtocolDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${id}" not found`);

    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'PROTOCOL',
        `Protocolo ${dto.protocolType} ativado`,
        {
          protocolType: dto.protocolType,
          parentEmergencyId: id,
          protocolData: dto.protocolData,
          notes: dto.notes,
          activatedAt: new Date().toISOString(),
        },
      ),
    });
  }

  // ─── Reclassificação de Risco ──────────────────────────────────────────────

  async reclassifyRisk(tenantId: string, encounterId: string, dto: ReclassifyRiskDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: encounterId, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${encounterId}" not found`);

    const content = this.parseContent(doc.content);
    const previousLevel = content.manchesterLevel as string;

    const reclassHistory = Array.isArray(content.reclassHistory) ? content.reclassHistory : [];
    reclassHistory.push({
      previousLevel,
      newLevel: dto.newManchesterLevel,
      justification: dto.justification,
      authorId: dto.authorId,
      at: new Date().toISOString(),
    });

    content.manchesterLevel = dto.newManchesterLevel;
    content.reclassHistory = reclassHistory;
    if (dto.chiefComplaint) content.chiefComplaint = dto.chiefComplaint;
    if (dto.painScale) content.painScale = dto.painScale;

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: encounterId },
      data: { content: JSON.stringify(content) },
    });

    return {
      id: updated.id,
      previousLevel,
      newLevel: dto.newManchesterLevel,
      reclassHistory,
    };
  }

  // ─── Fast Track ────────────────────────────────────────────────────────────

  async assignFastTrack(tenantId: string, encounterId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: encounterId, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${encounterId}" not found`);

    const content = this.parseContent(doc.content);
    const manchesterLevel = content.manchesterLevel as string;

    const fastTrackEligible = ['GREEN', 'BLUE'].includes(manchesterLevel);

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: encounterId },
      data: {
        content: JSON.stringify({
          ...content,
          fastTrack: true,
          fastTrackAssignedAt: new Date().toISOString(),
          fastTrackEligible,
        }),
      },
    });

    return {
      id: updated.id,
      fastTrack: true,
      eligible: fastTrackEligible,
      manchesterLevel,
      message: fastTrackEligible
        ? 'Paciente encaminhado para Fast Track'
        : `Nível Manchester ${manchesterLevel} não elegível para Fast Track — verificar com médico`,
    };
  }

  // ─── NEDOCS ────────────────────────────────────────────────────────────────

  async calculateNedocs(tenantId: string, dto: CalculateNedocsDto) {
    // NEDOCS formula: N = −20 + 0.93(P/B) + 0.93(A/B) + 19.5(V/B) + 0.00634(L × W) + 0.00594(R × W)
    // Where: P = total ED patients, B = total ED beds, A = admitted waiting bed,
    //        V = on ventilator, L = longest wait (hours), W = total ED patients, R = admissions last hour
    const P = dto.totalEdPatients;
    const B = dto.totalEdBeds;
    const A = dto.admittedWaitingBed;
    const V = dto.ventilatorsInUse;
    const L = dto.longestWaitHours;
    const W = dto.totalEdPatients;
    const R = dto.admissionsLastHour;

    const nedocsScore = Math.round(
      (-20 + 0.93 * (P / B) + 0.93 * (A / B) + 19.5 * (V / B) + 0.00634 * (L * W) + 0.00594 * (R * W)) * 10,
    ) / 10;

    let level: string;
    let recommendation: string;
    if (nedocsScore <= 20) { level = 'NOT_BUSY'; recommendation = 'Pronto-socorro não congestionado'; }
    else if (nedocsScore <= 60) { level = 'BUSY'; recommendation = 'Pronto-socorro movimentado — monitorar'; }
    else if (nedocsScore <= 100) { level = 'EXTREMELY_BUSY'; recommendation = 'Pronto-socorro muito movimentado — ativar plano de contingência'; }
    else { level = 'OVERCROWDED'; recommendation = 'SUPERLOTAÇÃO CRÍTICA — acionar plano de crise imediatamente'; }

    const record = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        'SYSTEM',
        'SYSTEM',
        'NEDOCS',
        `NEDOCS Score: ${nedocsScore} — ${level}`,
        { ...dto, nedocsScore, level, recommendation, calculatedAt: new Date().toISOString() },
      ),
    });

    return { id: record.id, nedocsScore, level, recommendation, inputs: dto };
  }

  private parseContent(content: string | null): Record<string, unknown> {
    if (!content) return {};
    try { return JSON.parse(content); } catch { return {}; }
  }
}
