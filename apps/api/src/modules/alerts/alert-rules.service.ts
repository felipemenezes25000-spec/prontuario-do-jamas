import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from './dto/create-alert-rule.dto';
import type { ClinicalAlertRule } from '@prisma/client';

/** Maps rule field names to VitalSigns model field names */
const FIELD_MAP: Record<string, string> = {
  spo2: 'oxygenSaturation',
  systolicBp: 'systolicBP',
  diastolicBp: 'diastolicBP',
  heartRate: 'heartRate',
  respiratoryRate: 'respiratoryRate',
  temperature: 'temperature',
  gcs: 'gcs',
  glucose: 'glucoseLevel',
  painScale: 'painScale',
};

@Injectable()
export class AlertRulesService {
  private readonly logger = new Logger(AlertRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  // =========================================================================
  // CRUD
  // =========================================================================

  async findAll(tenantId: string) {
    return this.prisma.clinicalAlertRule.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { field: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.clinicalAlertRule.findUnique({
      where: { id },
    });
    if (!rule) {
      throw new NotFoundException(`Alert rule with ID "${id}" not found`);
    }
    return rule;
  }

  async create(tenantId: string, dto: CreateAlertRuleDto) {
    return this.prisma.clinicalAlertRule.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        field: dto.field,
        operator: dto.operator,
        value: dto.value,
        value2: dto.value2,
        severity: dto.severity,
        message: dto.message,
        action: dto.action,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAlertRuleDto) {
    await this.findById(id);
    return this.prisma.clinicalAlertRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.field !== undefined && { field: dto.field }),
        ...(dto.operator !== undefined && { operator: dto.operator }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.value2 !== undefined && { value2: dto.value2 }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.message !== undefined && { message: dto.message }),
        ...(dto.action !== undefined && { action: dto.action }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.clinicalAlertRule.delete({ where: { id } });
  }

  // =========================================================================
  // EVALUATION ENGINE
  // =========================================================================

  /**
   * Evaluate all active rules against a set of vital signs.
   * Creates ClinicalAlert records for any triggered rules.
   */
  async evaluateVitals(
    vitals: Record<string, number | null | undefined>,
    patientId: string,
    encounterId: string | undefined,
    tenantId: string,
  ): Promise<void> {
    const rules = await this.prisma.clinicalAlertRule.findMany({
      where: { tenantId, isActive: true },
    });

    const triggered: ClinicalAlertRule[] = [];

    for (const rule of rules) {
      const vitalFieldName = FIELD_MAP[rule.field] ?? rule.field;
      const rawValue = vitals[vitalFieldName];
      if (rawValue === null || rawValue === undefined) continue;

      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) continue;

      if (this.evaluateCondition(rule, numericValue)) {
        triggered.push(rule);
      }
    }

    if (triggered.length === 0) return;

    this.logger.log(
      `Vitals evaluation triggered ${triggered.length} alert(s) for patient ${patientId}`,
    );

    // Create alerts in parallel
    await Promise.all(
      triggered.map((rule) =>
        this.alertsService.create(tenantId, {
          patientId,
          encounterId,
          type: 'VITAL_SIGN',
          severity: rule.severity,
          title: rule.name,
          message: rule.message,
          details: {
            ruleId: rule.id,
            field: rule.field,
            operator: rule.operator,
            threshold: rule.value,
            suggestedAction: rule.action,
          },
          source: 'CLINICAL_RULE',
        }),
      ),
    );
  }

  /**
   * Evaluate a single rule condition against a numeric value.
   */
  private evaluateCondition(
    rule: ClinicalAlertRule,
    value: number,
  ): boolean {
    switch (rule.operator) {
      case 'lt':
        return value < rule.value;
      case 'gt':
        return value > rule.value;
      case 'lte':
        return value <= rule.value;
      case 'gte':
        return value >= rule.value;
      case 'eq':
        return value === rule.value;
      case 'between':
        return (
          rule.value2 !== null &&
          rule.value2 !== undefined &&
          value >= rule.value &&
          value <= rule.value2
        );
      default:
        return false;
    }
  }
}
