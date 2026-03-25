import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRuleDto,
  UpdateRuleDto,
  EvaluateRulesDto,
} from './dto/create-cds-engine.dto';

interface CdsRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  condition: Record<string, unknown>;
  action: string;
  alertMessage?: string;
  active: boolean;
  specialties?: string[];
}

@Injectable()
export class CdsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(tenantId: string, authorId: string, dto: CreateRuleDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: authorId, // rules are tenant-level, not patient-specific
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `CDS Rule — ${dto.category} — ${dto.name}`,
        content: JSON.stringify({
          documentType: 'CDS_RULE',
          name: dto.name,
          description: dto.description,
          category: dto.category,
          severity: dto.severity,
          condition: dto.condition,
          action: dto.action,
          alertMessage: dto.alertMessage,
          active: dto.active ?? true,
          specialties: dto.specialties,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, name: dto.name, category: dto.category, active: dto.active ?? true };
  }

  async listRules(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'CDS Rule' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      ...JSON.parse(d.content ?? '{}'),
    }));
  }

  async updateRule(tenantId: string, ruleId: string, dto: UpdateRuleDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: ruleId, tenantId },
    });
    if (!doc) throw new NotFoundException(`Rule "${ruleId}" not found`);

    const existing = JSON.parse(doc.content ?? '{}');
    const updated = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    };

    // Update the title if name changed
    const title = dto.name
      ? `CDS Rule — ${existing.category} — ${dto.name}`
      : doc.title;

    await this.prisma.clinicalDocument.update({
      where: { id: ruleId },
      data: { content: JSON.stringify(updated), title },
    });

    return { id: ruleId, ...updated };
  }

  async evaluateRules(tenantId: string, authorId: string, dto: EvaluateRulesDto) {
    // 1. Get all active rules
    const ruleDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'CDS Rule' },
      },
    });

    const rules: (CdsRule & { id: string })[] = ruleDocs.map((d) => ({
      id: d.id,
      ...JSON.parse(d.content ?? '{}'),
    }));
    const activeRules = rules.filter((r) => r.active);

    // 2. Get patient context (vitals, allergies, prescriptions)
    const [vitals, allergies, prescriptions] = await Promise.all([
      this.prisma.vitalSigns.findFirst({
        where: { encounterId: dto.encounterId },
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.allergy.findMany({
        where: { patientId: dto.patientId, status: 'ACTIVE' },
      }),
      this.prisma.prescription.findMany({
        where: { encounterId: dto.encounterId, status: 'ACTIVE' },
        include: { items: { where: { status: 'ACTIVE' } } },
      }),
    ]);

    const context = {
      ...(dto.context ?? {}),
      vitals: vitals
        ? {
            systolicBp: vitals.systolicBP,
            diastolicBp: vitals.diastolicBP,
            heartRate: vitals.heartRate,
            temperature: vitals.temperature,
            oxygenSaturation: vitals.oxygenSaturation,
            respiratoryRate: vitals.respiratoryRate,
          }
        : null,
      allergyCount: allergies.length,
      activeMedicationCount: prescriptions.flatMap((p) => p.items).length,
    };

    // 3. Evaluate each rule
    const triggeredAlerts: Array<{
      ruleId: string;
      ruleName: string;
      category: string;
      severity: string;
      message: string;
      action: string;
    }> = [];

    for (const rule of activeRules) {
      const triggered = this.evaluateCondition(rule.condition, context);
      if (triggered) {
        triggeredAlerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          message: rule.alertMessage ?? rule.description,
          action: rule.action,
        });
      }
    }

    return {
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      rulesEvaluated: activeRules.length,
      alertsTriggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    context: Record<string, unknown>,
  ): boolean {
    const field = condition['field'] as string;
    const operator = condition['operator'] as string;
    const threshold = condition['value'] as number;

    if (!field || !operator || threshold === undefined) return false;

    // Navigate nested fields (e.g., "vitals.systolicBp")
    const parts = field.split('.');
    let value: unknown = context;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }

    if (typeof value !== 'number') return false;

    switch (operator) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  async getPatientAlerts(tenantId: string, patientId: string) {
    // Get the latest encounter for the patient
    const encounter = await this.prisma.encounter.findFirst({
      where: { patientId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!encounter) return { alerts: [] };

    return this.evaluateRules(tenantId, patientId, {
      patientId,
      encounterId: encounter.id,
    });
  }
}
