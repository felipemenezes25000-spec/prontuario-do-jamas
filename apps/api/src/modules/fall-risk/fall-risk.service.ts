import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMorseAssessmentDto,
  CreateBradenAssessmentDto,
  CreatePreventionPlanDto,
} from './dto/create-fall-risk.dto';

@Injectable()
export class FallRiskService {
  constructor(private readonly prisma: PrismaService) {}

  async createMorseAssessment(
    tenantId: string,
    authorId: string,
    dto: CreateMorseAssessmentDto,
  ) {
    const totalScore = dto.items.reduce((sum, item) => sum + item.score, 0);
    const riskLevel =
      totalScore >= 45 ? 'HIGH' : totalScore >= 25 ? 'MODERATE' : 'LOW';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Morse Fall Scale Assessment',
        content: JSON.stringify({
          assessmentType: 'MORSE_FALL_SCALE',
          items: dto.items,
          totalScore,
          riskLevel,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    // Create alert if high risk
    if (riskLevel === 'HIGH' || riskLevel === 'MODERATE') {
      await this.prisma.clinicalDocument.create({
        data: {
          patientId: dto.patientId,
          encounterId: dto.encounterId,
          authorId,
          tenantId,
          type: 'CUSTOM',
          title: `ALERTA: Risco de Queda ${riskLevel} (Morse: ${totalScore})`,
          content: JSON.stringify({
            alertType: 'FALL_RISK',
            riskLevel,
            score: totalScore,
            scale: 'MORSE',
            active: true,
          }),
          generatedByAI: false,
          status: 'FINAL',
        },
      });
    }

    return {
      id: doc.id,
      totalScore,
      riskLevel,
      items: dto.items,
      observations: dto.observations,
      createdAt: doc.createdAt,
    };
  }

  async createBradenAssessment(
    tenantId: string,
    authorId: string,
    dto: CreateBradenAssessmentDto,
  ) {
    const totalScore = dto.items.reduce((sum, item) => sum + item.score, 0);
    // Braden: lower = higher risk. <=9 very high, 10-12 high, 13-14 moderate, 15-18 mild, >=19 no risk
    const riskLevel =
      totalScore <= 9
        ? 'VERY_HIGH'
        : totalScore <= 12
          ? 'HIGH'
          : totalScore <= 14
            ? 'MODERATE'
            : totalScore <= 18
              ? 'MILD'
              : 'NO_RISK';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Braden Scale Assessment',
        content: JSON.stringify({
          assessmentType: 'BRADEN_SCALE',
          items: dto.items,
          totalScore,
          riskLevel,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      totalScore,
      riskLevel,
      items: dto.items,
      observations: dto.observations,
      createdAt: doc.createdAt,
    };
  }

  async getPatientRiskHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: {
          in: ['Morse Fall Scale Assessment', 'Braden Scale Assessment'],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      author: doc.author,
      createdAt: doc.createdAt,
    }));
  }

  async getActiveAlerts(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: 'ALERTA: Risco de Queda' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      ...JSON.parse(doc.content ?? '{}'),
      createdAt: doc.createdAt,
    }));
  }

  // ─── VTE Prevention Protocol (Caprini/Padua) ─────────────────────────────

  async assessVteRisk(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      tool: 'CAPRINI' | 'PADUA';
      items: Array<{ criterion: string; score: number; present: boolean }>;
      observations?: string;
    },
  ) {
    const totalScore = dto.items.filter((i) => i.present).reduce((s, i) => s + i.score, 0);

    let riskLevel: string;
    let prophylaxis: string;
    if (dto.tool === 'CAPRINI') {
      riskLevel = totalScore >= 5 ? 'HIGH' : totalScore >= 3 ? 'MODERATE' : totalScore >= 1 ? 'LOW' : 'VERY_LOW';
      prophylaxis = totalScore >= 5
        ? 'Heparina SC + meias compressivas pneumaticas'
        : totalScore >= 3
          ? 'Heparina SC profilatica'
          : 'Deambulacao precoce + meias elasticas';
    } else {
      riskLevel = totalScore >= 4 ? 'HIGH' : 'LOW';
      prophylaxis = totalScore >= 4
        ? 'Heparina SC profilatica (enoxaparina 40mg/dia ou HNF 5000UI 12/12h)'
        : 'Deambulacao precoce. Profilaxia mecanica se imobilizado.';
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `VTE_ASSESSMENT:${dto.tool}:Score ${totalScore}:${riskLevel}`,
        content: JSON.stringify({
          assessmentType: 'VTE_RISK',
          tool: dto.tool,
          items: dto.items,
          totalScore,
          riskLevel,
          prophylaxis,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    // Alert if high risk and no prophylaxis prescribed
    if (riskLevel === 'HIGH') {
      await this.prisma.clinicalDocument.create({
        data: {
          patientId: dto.patientId,
          encounterId: dto.encounterId,
          authorId,
          tenantId,
          type: 'CUSTOM',
          title: `ALERTA: Risco VTE ${riskLevel} (${dto.tool}: ${totalScore}) — Profilaxia obrigatoria`,
          content: JSON.stringify({
            alertType: 'VTE_RISK',
            riskLevel,
            score: totalScore,
            tool: dto.tool,
            prophylaxis,
            active: true,
          }),
          generatedByAI: false,
          status: 'FINAL',
        },
      });
    }

    return { id: doc.id, tool: dto.tool, totalScore, riskLevel, prophylaxis };
  }

  // ─── SSI Prevention Protocol ────────────────────────────────────────────────

  async recordSsiPrevention(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      surgeryType: string;
      checklist: {
        prophylacticAtbAdministered: boolean;
        atbTimingMinutesBeforeIncision?: number;
        atbName?: string;
        trichotomyMethod?: string; // CLIPPER, RAZOR, NONE
        normothermiaMainained: boolean;
        temperatureAtEnd?: number;
        glycemiaControlled: boolean;
        glycemiaValue?: number;
        skinPrepSolution?: string;
        drainPlacement?: boolean;
      };
    },
  ) {
    const checklist = dto.checklist;
    const complianceItems: Array<{ item: string; compliant: boolean; detail: string }> = [];

    // ATB timing check
    const atbTimingOk = checklist.prophylacticAtbAdministered &&
      checklist.atbTimingMinutesBeforeIncision !== undefined &&
      checklist.atbTimingMinutesBeforeIncision >= 30 &&
      checklist.atbTimingMinutesBeforeIncision <= 60;

    complianceItems.push({
      item: 'ATB profilatico no tempo correto (30-60min antes)',
      compliant: atbTimingOk,
      detail: checklist.prophylacticAtbAdministered
        ? `${checklist.atbName ?? 'ATB'} administrado ${checklist.atbTimingMinutesBeforeIncision}min antes`
        : 'ATB nao administrado',
    });

    // Trichotomy
    complianceItems.push({
      item: 'Tricotomia com clipper (nao lamina)',
      compliant: checklist.trichotomyMethod === 'CLIPPER' || checklist.trichotomyMethod === 'NONE',
      detail: checklist.trichotomyMethod ?? 'Nao informado',
    });

    // Normothermia
    complianceItems.push({
      item: 'Normotermia mantida (>36C)',
      compliant: checklist.normothermiaMainained,
      detail: checklist.temperatureAtEnd ? `Temp final: ${checklist.temperatureAtEnd}C` : 'Nao aferida',
    });

    // Glycemia
    complianceItems.push({
      item: 'Glicemia controlada (<180mg/dL)',
      compliant: checklist.glycemiaControlled,
      detail: checklist.glycemiaValue ? `Glicemia: ${checklist.glycemiaValue} mg/dL` : 'Nao aferida',
    });

    const totalCompliant = complianceItems.filter((i) => i.compliant).length;
    const complianceRate = Math.round((totalCompliant / complianceItems.length) * 100);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `SSI_PREVENTION:${dto.surgeryType}:${complianceRate}%`,
        content: JSON.stringify({
          documentType: 'SSI_PREVENTION',
          surgeryType: dto.surgeryType,
          checklist: dto.checklist,
          complianceItems,
          complianceRate,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, complianceRate, complianceItems };
  }

  async createPreventionPlan(
    tenantId: string,
    authorId: string,
    assessmentId: string,
    dto: CreatePreventionPlanDto,
  ) {
    const assessment = await this.prisma.clinicalDocument.findFirst({
      where: { id: assessmentId, tenantId },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID "${assessmentId}" not found`,
      );
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: assessment.patientId,
        encounterId: assessment.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Fall Prevention Plan',
        content: JSON.stringify({
          documentType: 'FALL_PREVENTION_PLAN',
          assessmentId,
          interventions: dto.interventions,
          additionalNotes: dto.additionalNotes,
          repositioningIntervalHours: dto.repositioningIntervalHours,
          fallPrecautionSignage: dto.fallPrecautionSignage,
          bedAlarmActive: dto.bedAlarmActive,
          nonSlipFootwear: dto.nonSlipFootwear,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      assessmentId,
      ...dto,
      createdAt: doc.createdAt,
    };
  }
}
