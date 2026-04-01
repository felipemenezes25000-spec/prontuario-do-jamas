import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PhlebotomyPriority,
  CollectionStatus,
  CreatePhlebotomyItemDto,
  PhlebotomyWorklistDto,
  PhlebotomyItemDto,
  UpdateCollectionStatusDto,
  CreateReflexRuleEnhancedDto,
  ReflexRuleDto,
  ReflexTriggerCondition,
  ReflexTestResultDto,
  EvaluateReflexDto,
  ABGInputDto,
  ABGInterpretationDto,
  PrimaryDisorder,
  CompensationStatus,
  OxygenationStatus,
  RecordPOCTestDto,
  POCTestRecord,
  POCQCStatus,
} from './dto/lis-lab-enhanced.dto';

@Injectable()
export class LisLabEnhancedService {
  // In-memory stores (production would use dedicated Prisma models)
  private phlebotomyItems: (PhlebotomyItemDto & { unit: string; tenantId: string; createdAt: Date })[] = [];
  private reflexRules: ReflexRuleDto[] = [];
  private pocTests: POCTestRecord[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Phlebotomy Worklist
  // ═══════════════════════════════════════════════════════════════════════════

  async generatePhlebotomyWorklist(
    tenantId: string,
    unit?: string,
    date?: string,
  ): Promise<PhlebotomyWorklistDto> {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const targetUnit = unit ?? 'ALL';

    let items = this.phlebotomyItems.filter((i) => i.tenantId === tenantId);

    if (unit) {
      items = items.filter((i) => i.unit === unit);
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      items = items.filter((i) => {
        const created = i.createdAt;
        return created >= dayStart && created <= dayEnd;
      });
    }

    // Sort: STAT first, then TIMED, then ROUTINE; within same priority sort by scheduledTime
    const priorityOrder: Record<PhlebotomyPriority, number> = {
      [PhlebotomyPriority.STAT]: 0,
      [PhlebotomyPriority.TIMED]: 1,
      [PhlebotomyPriority.ROUTINE]: 2,
    };

    const sorted = [...items].sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Infinity;
      const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Infinity;
      return timeA - timeB;
    });

    return {
      date: targetDate,
      unit: targetUnit,
      items: sorted.map(({ tenantId: _t, createdAt: _c, unit: _u, ...rest }) => rest),
    };
  }

  async addPhlebotomyItem(
    tenantId: string,
    dto: CreatePhlebotomyItemDto,
  ): Promise<PhlebotomyItemDto> {
    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const item: PhlebotomyItemDto & { unit: string; tenantId: string; createdAt: Date } = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      patientName: dto.patientName,
      room: dto.room,
      bed: dto.bed,
      orderedTests: dto.orderedTests,
      priority: dto.priority,
      fastingRequired: dto.fastingRequired,
      specialInstructions: dto.specialInstructions,
      scheduledTime: dto.scheduledTime,
      collectorId: dto.collectorId,
      collectionStatus: CollectionStatus.PENDING,
      unit: dto.unit,
      tenantId,
      createdAt: new Date(),
    };

    this.phlebotomyItems.push(item);
    return item;
  }

  async updateCollectionStatus(
    tenantId: string,
    itemId: string,
    dto: UpdateCollectionStatusDto,
  ): Promise<PhlebotomyItemDto> {
    const item = this.phlebotomyItems.find(
      (i) => i.id === itemId && i.tenantId === tenantId,
    );
    if (!item) {
      throw new NotFoundException(`Phlebotomy item "${itemId}" not found`);
    }

    if (dto.status === CollectionStatus.FAILED && !dto.failureReason) {
      throw new BadRequestException('Failure reason is required when marking collection as FAILED');
    }

    item.collectionStatus = dto.status;
    if (dto.collectorId) item.collectorId = dto.collectorId;
    if (dto.failureReason) item.failureReason = dto.failureReason;
    if (dto.status === CollectionStatus.COLLECTED) {
      item.collectionTimestamp = new Date().toISOString();
      if (dto.collectorId) item.collectorId = dto.collectorId;
    }

    return item;
  }

  async markCollected(
    tenantId: string,
    itemId: string,
    collectorId: string,
  ): Promise<PhlebotomyItemDto> {
    return this.updateCollectionStatus(tenantId, itemId, {
      status: CollectionStatus.COLLECTED,
      collectorId,
    });
  }

  async markFailed(
    tenantId: string,
    itemId: string,
    failureReason: string,
  ): Promise<PhlebotomyItemDto> {
    return this.updateCollectionStatus(tenantId, itemId, {
      status: CollectionStatus.FAILED,
      failureReason,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reflex Testing
  // ═══════════════════════════════════════════════════════════════════════════

  getReflexRules(tenantId: string): ReflexRuleDto[] {
    return this.reflexRules.filter((r) => r.tenantId === tenantId);
  }

  createReflexRule(tenantId: string, dto: CreateReflexRuleEnhancedDto): ReflexRuleDto {
    if (
      (dto.triggerCondition === ReflexTriggerCondition.ABOVE ||
        dto.triggerCondition === ReflexTriggerCondition.BELOW) &&
      dto.triggerValue === undefined
    ) {
      throw new BadRequestException(
        'triggerValue is required for ABOVE/BELOW conditions',
      );
    }

    const rule: ReflexRuleDto = {
      id: crypto.randomUUID(),
      triggerTest: dto.triggerTest,
      triggerCondition: dto.triggerCondition,
      triggerValue: dto.triggerValue ?? null,
      reflexTest: dto.reflexTest,
      isActive: dto.isActive,
      description: dto.description ?? null,
      tenantId,
      createdAt: new Date(),
    };

    this.reflexRules.push(rule);
    return rule;
  }

  evaluateReflexTrigger(
    tenantId: string,
    dto: EvaluateReflexDto,
  ): ReflexTestResultDto[] {
    const activeRules = this.reflexRules.filter(
      (r) => r.tenantId === tenantId && r.isActive && r.triggerTest === dto.testName,
    );

    const triggered: ReflexTestResultDto[] = [];

    for (const rule of activeRules) {
      let shouldTrigger = false;

      switch (rule.triggerCondition) {
        case ReflexTriggerCondition.ABOVE: {
          const numericResult = parseFloat(dto.resultValue);
          if (!isNaN(numericResult) && rule.triggerValue !== null && numericResult > rule.triggerValue) {
            shouldTrigger = true;
          }
          break;
        }
        case ReflexTriggerCondition.BELOW: {
          const numericResult = parseFloat(dto.resultValue);
          if (!isNaN(numericResult) && rule.triggerValue !== null && numericResult < rule.triggerValue) {
            shouldTrigger = true;
          }
          break;
        }
        case ReflexTriggerCondition.ABNORMAL: {
          // Any non-normal flag — treat non-empty result with H/L/A flags or out-of-range as abnormal
          const lower = dto.resultValue.toLowerCase();
          if (
            lower.includes('abnormal') ||
            lower.includes('high') ||
            lower.includes('low') ||
            lower.includes('h') ||
            lower.includes('l')
          ) {
            shouldTrigger = true;
          }
          break;
        }
        case ReflexTriggerCondition.POSITIVE: {
          const lower = dto.resultValue.toLowerCase();
          if (
            lower === 'positive' ||
            lower === 'positivo' ||
            lower === 'detected' ||
            lower === 'reactive' ||
            lower === 'reagente'
          ) {
            shouldTrigger = true;
          }
          break;
        }
      }

      if (shouldTrigger) {
        triggered.push({
          originalTest: dto.testName,
          originalResult: dto.resultValue,
          triggeredTest: rule.reflexTest,
          triggeredAutomatically: true,
          ruleId: rule.id,
        });
      }
    }

    return triggered;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ABG Interpretation (Arterial Blood Gas)
  // ═══════════════════════════════════════════════════════════════════════════

  interpretABG(dto: ABGInputDto): ABGInterpretationDto {
    const interpretationParts: string[] = [];

    // Step 1: Check pH — determine acidemia vs alkalemia
    let primaryDisorder: PrimaryDisorder = PrimaryDisorder.NORMAL;
    let compensation: CompensationStatus = CompensationStatus.UNCOMPENSATED;
    let expectedCompensation = 'N/A';
    let mixedDisorder = false;

    if (dto.pH < 7.35) {
      // Acidemia — determine respiratory vs metabolic
      if (dto.pCO2 > 45 && dto.HCO3 < 22) {
        // Both abnormal — mixed acidosis
        primaryDisorder = PrimaryDisorder.RESPIRATORY_ACIDOSIS;
        mixedDisorder = true;
        interpretationParts.push('Mixed respiratory and metabolic acidosis');
      } else if (dto.pCO2 > 45) {
        // Step 2: Respiratory acidosis
        primaryDisorder = PrimaryDisorder.RESPIRATORY_ACIDOSIS;
        // Expected HCO3 compensation: acute = +1 per 10 mmHg rise; chronic = +3.5 per 10
        const acuteExpected = 24 + ((dto.pCO2 - 40) / 10) * 1;
        const chronicExpected = 24 + ((dto.pCO2 - 40) / 10) * 3.5;
        expectedCompensation = `Expected HCO3: ${acuteExpected.toFixed(1)} (acute) to ${chronicExpected.toFixed(1)} (chronic)`;

        if (dto.HCO3 >= chronicExpected - 2 && dto.HCO3 <= chronicExpected + 2) {
          compensation = CompensationStatus.FULLY_COMPENSATED;
        } else if (dto.HCO3 >= acuteExpected - 2) {
          compensation = CompensationStatus.PARTIALLY_COMPENSATED;
        } else {
          compensation = CompensationStatus.UNCOMPENSATED;
        }
      } else if (dto.HCO3 < 22) {
        // Step 2: Metabolic acidosis
        primaryDisorder = PrimaryDisorder.METABOLIC_ACIDOSIS;
        // Step 3: Winter's formula — expected pCO2 = 1.5 × HCO3 + 8 ± 2
        const expectedPCO2 = 1.5 * dto.HCO3 + 8;
        expectedCompensation = `Expected pCO2 (Winter's): ${expectedPCO2.toFixed(1)} ± 2 mmHg`;

        if (dto.pCO2 >= expectedPCO2 - 2 && dto.pCO2 <= expectedPCO2 + 2) {
          compensation = CompensationStatus.FULLY_COMPENSATED;
        } else if (dto.pCO2 < expectedPCO2 + 2 && dto.pCO2 > expectedPCO2 - 5) {
          compensation = CompensationStatus.PARTIALLY_COMPENSATED;
          if (dto.pCO2 < expectedPCO2 - 2) {
            mixedDisorder = true;
            interpretationParts.push('Concomitant respiratory alkalosis suspected (pCO2 lower than expected)');
          }
        } else {
          compensation = CompensationStatus.UNCOMPENSATED;
          if (dto.pCO2 > expectedPCO2 + 2) {
            mixedDisorder = true;
            interpretationParts.push('Concomitant respiratory acidosis suspected (pCO2 higher than expected)');
          }
        }
      }
    } else if (dto.pH > 7.45) {
      // Alkalemia
      if (dto.pCO2 < 35 && dto.HCO3 > 26) {
        primaryDisorder = PrimaryDisorder.RESPIRATORY_ALKALOSIS;
        mixedDisorder = true;
        interpretationParts.push('Mixed respiratory and metabolic alkalosis');
      } else if (dto.pCO2 < 35) {
        primaryDisorder = PrimaryDisorder.RESPIRATORY_ALKALOSIS;
        const acuteExpected = 24 - ((40 - dto.pCO2) / 10) * 2;
        const chronicExpected = 24 - ((40 - dto.pCO2) / 10) * 5;
        expectedCompensation = `Expected HCO3: ${chronicExpected.toFixed(1)} (chronic) to ${acuteExpected.toFixed(1)} (acute)`;

        if (dto.HCO3 <= chronicExpected + 2 && dto.HCO3 >= chronicExpected - 2) {
          compensation = CompensationStatus.FULLY_COMPENSATED;
        } else if (dto.HCO3 <= acuteExpected + 2) {
          compensation = CompensationStatus.PARTIALLY_COMPENSATED;
        } else {
          compensation = CompensationStatus.UNCOMPENSATED;
        }
      } else if (dto.HCO3 > 26) {
        primaryDisorder = PrimaryDisorder.METABOLIC_ALKALOSIS;
        const expectedPCO2 = 0.7 * dto.HCO3 + 21;
        expectedCompensation = `Expected pCO2: ${expectedPCO2.toFixed(1)} ± 2 mmHg`;

        if (Math.abs(dto.pCO2 - expectedPCO2) <= 2) {
          compensation = CompensationStatus.FULLY_COMPENSATED;
        } else if (Math.abs(dto.pCO2 - expectedPCO2) <= 5) {
          compensation = CompensationStatus.PARTIALLY_COMPENSATED;
        } else {
          compensation = CompensationStatus.UNCOMPENSATED;
          mixedDisorder = true;
          interpretationParts.push('Mixed disorder probable — pCO2 not matching expected compensation');
        }
      }
    } else {
      primaryDisorder = PrimaryDisorder.NORMAL;
      compensation = CompensationStatus.FULLY_COMPENSATED;
      expectedCompensation = 'Normal acid-base balance';
    }

    // Step 4: Anion gap = Na - (Cl + HCO3)
    let anionGap: number | null = null;
    let correctedAnionGap: number | null = null;
    let deltaRatio: number | null = null;

    if (dto.sodium !== undefined && dto.chloride !== undefined) {
      anionGap = dto.sodium - (dto.chloride + dto.HCO3);
      interpretationParts.push(`Anion gap: ${anionGap.toFixed(1)} mEq/L (normal: 8-12)`);

      // Correct for albumin: corrected AG = AG + 2.5 × (4.0 - albumin)
      if (dto.albumin !== undefined) {
        correctedAnionGap = anionGap + 2.5 * (4.0 - dto.albumin);
        interpretationParts.push(
          `Albumin-corrected anion gap: ${correctedAnionGap.toFixed(1)} mEq/L`,
        );
      }

      // Step 5: Delta ratio (delta-delta) for mixed disorders
      const effectiveAG = correctedAnionGap ?? anionGap;
      if (effectiveAG > 12) {
        const deltaAG = effectiveAG - 12;
        const deltaHCO3 = 24 - dto.HCO3;
        if (deltaHCO3 > 0) {
          deltaRatio = deltaAG / deltaHCO3;
          deltaRatio = Math.round(deltaRatio * 100) / 100;
          interpretationParts.push(`Delta ratio: ${deltaRatio.toFixed(2)}`);

          if (deltaRatio < 1) {
            mixedDisorder = true;
            interpretationParts.push(
              'Delta ratio < 1: concomitant non-anion-gap (hyperchloremic) metabolic acidosis',
            );
          } else if (deltaRatio > 2) {
            mixedDisorder = true;
            interpretationParts.push(
              'Delta ratio > 2: concomitant metabolic alkalosis',
            );
          } else {
            interpretationParts.push('Delta ratio 1-2: pure anion gap metabolic acidosis');
          }
        }

        interpretationParts.push(
          'Elevated anion gap — consider: lactic acidosis, ketoacidosis, uremia, toxic ingestion (MUDPILES)',
        );
      }
    }

    // Lactate assessment
    if (dto.lactate !== undefined) {
      if (dto.lactate > 4) {
        interpretationParts.push(`Lactate ${dto.lactate} mmol/L — severe hyperlactatemia`);
      } else if (dto.lactate > 2) {
        interpretationParts.push(`Lactate ${dto.lactate} mmol/L — elevated (hyperlactatemia)`);
      }
    }

    // Step 6: Oxygenation assessment
    let oxygenation: OxygenationStatus = OxygenationStatus.NORMAL;
    let pFRatio: number | null = null;
    let aAGradient: number | null = null;

    if (dto.pO2 < 60) {
      oxygenation = OxygenationStatus.SEVERE_HYPOXEMIA;
      interpretationParts.push('Severe hypoxemia (PaO2 < 60 mmHg) — supplemental O2 indicated');
    } else if (dto.pO2 < 80) {
      oxygenation = OxygenationStatus.MODERATE_HYPOXEMIA;
      interpretationParts.push('Moderate hypoxemia (PaO2 60-80 mmHg)');
    } else if (dto.pO2 < 90) {
      oxygenation = OxygenationStatus.MILD_HYPOXEMIA;
      interpretationParts.push('Mild hypoxemia (PaO2 80-90 mmHg)');
    } else {
      oxygenation = OxygenationStatus.NORMAL;
    }

    // P/F ratio
    if (dto.FiO2 !== undefined && dto.FiO2 > 0) {
      pFRatio = Math.round(dto.pO2 / dto.FiO2);
      interpretationParts.push(`P/F ratio: ${pFRatio}`);
      if (pFRatio < 100) {
        interpretationParts.push('P/F < 100: severe ARDS');
      } else if (pFRatio < 200) {
        interpretationParts.push('P/F < 200: moderate ARDS');
      } else if (pFRatio < 300) {
        interpretationParts.push('P/F < 300: mild ARDS / acute lung injury');
      }
    }

    // A-a gradient = PAO2 - PaO2; PAO2 = FiO2 × (Patm - PH2O) - PaCO2/RQ
    if (dto.FiO2 !== undefined) {
      const patm = 760; // sea level
      const pH2O = 47;
      const rq = 0.8;
      const pAlveolarO2 = dto.FiO2 * (patm - pH2O) - dto.pCO2 / rq;
      aAGradient = Math.round((pAlveolarO2 - dto.pO2) * 10) / 10;
      interpretationParts.push(`A-a gradient: ${aAGradient} mmHg`);
      if (aAGradient > 20) {
        interpretationParts.push('Elevated A-a gradient — consider V/Q mismatch, shunt, or diffusion impairment');
      }
    }

    // Critical alerts
    if (dto.pH < 7.10) {
      interpretationParts.push('CRITICAL: pH < 7.10 — severe acidemia, risk of cardiovascular collapse');
    }
    if (dto.pH > 7.60) {
      interpretationParts.push('CRITICAL: pH > 7.60 — severe alkalemia');
    }

    const disorderLabel = primaryDisorder.replace(/_/g, ' ').toLowerCase();
    const compensationLabel = compensation.replace(/_/g, ' ').toLowerCase();
    const summary = primaryDisorder === PrimaryDisorder.NORMAL
      ? 'Normal acid-base balance. No primary disorder detected.'
      : `Primary disorder: ${disorderLabel}. Compensation: ${compensationLabel}.${mixedDisorder ? ' Mixed disorder detected.' : ''} ${interpretationParts.join('. ')}.`;

    return {
      primaryDisorder,
      compensation,
      expectedCompensation,
      mixedDisorder,
      anionGap,
      correctedAnionGap,
      deltaRatio,
      oxygenation,
      pFRatio,
      aAGradient,
      interpretation: summary,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POC Testing (Point of Care)
  // ═══════════════════════════════════════════════════════════════════════════

  async recordPOCTest(tenantId: string, dto: RecordPOCTestDto): Promise<POCTestRecord> {
    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    if (dto.qcStatus === POCQCStatus.FAILED) {
      throw new BadRequestException(
        'Cannot record POC test with FAILED QC status. Run quality control and retry.',
      );
    }

    const record: POCTestRecord = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      testType: dto.testType,
      deviceId: dto.deviceId,
      operatorId: dto.operatorId,
      result: dto.result,
      unit: dto.unit,
      referenceRange: dto.referenceRange ?? null,
      qcStatus: dto.qcStatus,
      lotNumber: dto.lotNumber ?? null,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      location: dto.location,
      timestamp: new Date(),
      tenantId,
    };

    this.pocTests.push(record);
    return record;
  }

  getPOCHistory(tenantId: string, patientId: string): POCTestRecord[] {
    return this.pocTests
      .filter((t) => t.tenantId === tenantId && t.patientId === patientId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  validatePOCQualityControl(
    tenantId: string,
    deviceId: string,
  ): { valid: boolean; lastQCDate: Date | null; message: string } {
    const deviceTests = this.pocTests
      .filter((t) => t.tenantId === tenantId && t.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (deviceTests.length === 0) {
      return {
        valid: false,
        lastQCDate: null,
        message: 'No POC tests recorded for this device. QC status unknown.',
      };
    }

    const latestTest = deviceTests[0];

    // Check if reagent is expired
    if (latestTest.expiryDate && latestTest.expiryDate < new Date()) {
      return {
        valid: false,
        lastQCDate: latestTest.timestamp,
        message: 'Reagent lot has expired. Replace reagents and re-run QC.',
      };
    }

    // Check if latest QC passed
    if (latestTest.qcStatus === POCQCStatus.FAILED) {
      return {
        valid: false,
        lastQCDate: latestTest.timestamp,
        message: 'Latest QC failed. Device requires maintenance or recalibration.',
      };
    }

    // Check if QC is within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (latestTest.timestamp < twentyFourHoursAgo) {
      return {
        valid: false,
        lastQCDate: latestTest.timestamp,
        message: 'QC expired — last QC was more than 24 hours ago. Re-run QC before testing.',
      };
    }

    return {
      valid: true,
      lastQCDate: latestTest.timestamp,
      message: 'QC valid. Device cleared for patient testing.',
    };
  }
}
