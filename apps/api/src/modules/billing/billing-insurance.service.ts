import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EligibilityCheckDto,
  EligibilityStatus,
  PriceTableDto,
  PriceTableType,
  HospitalBillDto,
  PrivatePayBudgetDto,
  PreBillingAuditDto,
  TissGuideDto,
  TissGuideType,
  TissSubmissionStatus,
  TissBatchDto,
  GlosaManagementDto,
  GlosaAppealStatus,
  SusBillingDto,
  SusBillingType,
  CostPerCaseDto,
} from './dto/billing-insurance.dto';

// ─── Result interfaces (exported for controller return types) ─────────────────

export interface EligibilityResult {
  patientId: string;
  insuranceCardNumber: string;
  planCode: string;
  status: EligibilityStatus;
  coverage: number;
  waitingPeriodDays: number;
  expirationDate: string | null;
  restrictions: string[];
  checkedAt: string;
}

export interface TissGuideResult {
  guideId: string;
  guideType: TissGuideType;
  xmlContent: string;
  validationErrors: string[];
  submissionStatus: TissSubmissionStatus;
  generatedAt: string;
}

export interface TissBatchResult {
  batchId: string;
  guideCount: number;
  submissionDate: string;
  protocol: string;
  status: TissSubmissionStatus;
}

export interface GlosaResult {
  glosaId: string;
  billId: string;
  totalGlosedAmount: number;
  appealStatus: GlosaAppealStatus;
  appealDeadline: string | null;
  createdAt: string;
}

export interface SusBillingResult {
  exportId: string;
  type: SusBillingType;
  competence: string;
  procedureCount: number;
  exportFile: string;
  generatedAt: string;
}

export interface CostPerCaseResult {
  admissionId: string;
  breakdown: {
    materials: number;
    medications: number;
    staffing: number;
    hospitality: number;
    exams: number;
  };
  totalCost: number;
  revenue: number;
  margin: number;
  marginPercent: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BillingInsuranceService {
  private readonly logger = new Logger(BillingInsuranceService.name);

  /**
   * In-memory price-table store — in production this would be backed by a
   * dedicated database table. Keyed by `${tableType}:${version}`.
   */
  private readonly priceTables = new Map<string, PriceTableDto>();

  constructor(private readonly prisma: PrismaService) {}

  // ─── Eligibility ────────────────────────────────────────────────────────────

  async checkEligibility(
    tenantId: string,
    dto: EligibilityCheckDto,
  ): Promise<EligibilityResult> {
    this.logger.log(
      `[${tenantId}] Checking eligibility for patient ${dto.patientId}, plan ${dto.planCode}`,
    );

    // Verify patient exists in tenant scope
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    // Simulate TISS WebService response — in production call operator WS
    const status = dto.checkResult ?? EligibilityStatus.ACTIVE;
    const coverage = dto.coverage ?? 100;
    const waitingPeriodDays = dto.waitingPeriod ?? 0;
    const restrictions: string[] = [];

    if (status === EligibilityStatus.INACTIVE) {
      restrictions.push('Plano inativo ou suspenso');
    }
    if (waitingPeriodDays > 0) {
      restrictions.push(`Carência de ${waitingPeriodDays} dias para este procedimento`);
    }

    const result: EligibilityResult = {
      patientId: dto.patientId,
      insuranceCardNumber: dto.insuranceCardNumber,
      planCode: dto.planCode,
      status,
      coverage,
      waitingPeriodDays,
      expirationDate: null,
      restrictions,
      checkedAt: new Date().toISOString(),
    };

    this.logger.log(
      `[${tenantId}] Eligibility result for patient ${dto.patientId}: ${status}`,
    );

    return result;
  }

  // ─── Price Tables ────────────────────────────────────────────────────────────

  upsertPriceTable(tenantId: string, dto: PriceTableDto): PriceTableDto {
    this.logger.log(
      `[${tenantId}] Upserting price table ${dto.tableType} v${dto.version} (${dto.procedures.length} procedures)`,
    );
    const key = `${tenantId}:${dto.tableType}:${dto.version}`;
    this.priceTables.set(key, dto);
    return dto;
  }

  getPriceTable(
    tenantId: string,
    tableType: PriceTableType,
    version: string,
  ): PriceTableDto {
    const key = `${tenantId}:${tableType}:${version}`;
    const table = this.priceTables.get(key);
    if (!table) {
      throw new NotFoundException(
        `Price table ${tableType} v${version} not found for tenant ${tenantId}`,
      );
    }
    return table;
  }

  listPriceTables(tenantId: string): string[] {
    const prefix = `${tenantId}:`;
    return Array.from(this.priceTables.keys())
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }

  lookupProcedurePrice(
    tenantId: string,
    tableType: PriceTableType,
    version: string,
    procedureCode: string,
  ): number {
    const table = this.getPriceTable(tenantId, tableType, version);
    const proc = table.procedures.find((p) => p.code === procedureCode);
    if (!proc) {
      throw new NotFoundException(
        `Procedure ${procedureCode} not found in table ${tableType} v${version}`,
      );
    }
    return proc.price;
  }

  // ─── Hospital Bill ───────────────────────────────────────────────────────────

  async createHospitalBill(
    tenantId: string,
    dto: HospitalBillDto,
  ): Promise<{ billId: string; totalAmount: number; costCenter: string | null; createdAt: string }> {
    this.logger.log(
      `[${tenantId}] Creating hospital bill for admission ${dto.admissionId}`,
    );

    const sum = (items: Array<{ quantity: number; unitPrice: number }> | undefined): number =>
      (items ?? []).reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

    const dailyTotal = (dto.dailyRates ?? []).reduce(
      (acc, r) => acc + r.subtotal,
      0,
    );
    const totalAmount =
      dailyTotal +
      sum(dto.fees) +
      sum(dto.materials) +
      sum(dto.medications) +
      sum(dto.honorariums) +
      sum(dto.exams);

    // Persist as a BillingEntry — full itemization stored in JSON
    const entry = await this.prisma.billingEntry.create({
      data: {
        tenantId,
        patientId: dto.admissionId, // admission links to patient
        encounterId: dto.admissionId,
        totalAmount,
        items: {
          dailyRates: dto.dailyRates ?? [],
          fees: dto.fees ?? [],
          materials: dto.materials ?? [],
          medications: dto.medications ?? [],
          honorariums: dto.honorariums ?? [],
          exams: dto.exams ?? [],
          costCenter: dto.costCenter ?? null,
        } as never,
      },
      select: { id: true, totalAmount: true, createdAt: true },
    });

    return {
      billId: entry.id,
      totalAmount: Number(entry.totalAmount),
      costCenter: dto.costCenter ?? null,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  // ─── Private Pay Budget ──────────────────────────────────────────────────────

  async createPrivatePayBudget(
    tenantId: string,
    dto: PrivatePayBudgetDto,
  ): Promise<{
    budgetId: string;
    totalAmount: number;
    paymentMethod: string;
    installments: number;
    approved: boolean;
    validUntil: string;
  }> {
    this.logger.log(
      `[${tenantId}] Creating private-pay budget for patient ${dto.patientId}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    return {
      budgetId: `BDG-${Date.now()}`,
      totalAmount: dto.totalAmount,
      paymentMethod: dto.paymentMethod,
      installments: dto.installments ?? 1,
      approved: dto.approved ?? false,
      validUntil: validUntil.toISOString(),
    };
  }

  async approvePrivatePayBudget(
    tenantId: string,
    budgetId: string,
  ): Promise<{ budgetId: string; approved: boolean; approvedAt: string }> {
    this.logger.log(`[${tenantId}] Approving private-pay budget ${budgetId}`);
    // In production: update DB record + trigger payment gateway
    return {
      budgetId,
      approved: true,
      approvedAt: new Date().toISOString(),
    };
  }

  // ─── Pre-Billing Audit ───────────────────────────────────────────────────────

  async runPreBillingAudit(
    tenantId: string,
    dto: PreBillingAuditDto,
  ): Promise<{
    auditId: string;
    billId: string;
    passed: boolean;
    issueCount: number;
    issues: string[];
    auditedAt: string;
  }> {
    this.logger.log(
      `[${tenantId}] Running pre-billing audit for bill ${dto.billId} by ${dto.auditor}`,
    );

    const issues = dto.issues ?? [];

    // Simple automated checks
    if (dto.completenessChecklist) {
      for (const [field, passed] of Object.entries(dto.completenessChecklist)) {
        if (!passed) issues.push(`Campo obrigatório ausente: ${field}`);
      }
    }
    if (dto.consistencyChecklist) {
      for (const [field, passed] of Object.entries(dto.consistencyChecklist)) {
        if (!passed) issues.push(`Inconsistência detectada: ${field}`);
      }
    }

    return {
      auditId: `AUD-${Date.now()}`,
      billId: dto.billId,
      passed: issues.length === 0,
      issueCount: issues.length,
      issues,
      auditedAt: new Date().toISOString(),
    };
  }

  // ─── TISS Guide Generation ───────────────────────────────────────────────────

  generateTissGuide(
    tenantId: string,
    encounterId: string,
    guideType: TissGuideType,
  ): TissGuideResult {
    this.logger.log(
      `[${tenantId}] Generating TISS guide (${guideType}) for encounter ${encounterId}`,
    );

    // Stub XML — in production: populate from clinical data + TISS 3.x XSD
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">`,
      `  <ans:cabecalho>`,
      `    <ans:identificacaoTransacao>`,
      `      <ans:tipoTransacao>SOLICITACAO_PROCEDIMENTO</ans:tipoTransacao>`,
      `      <ans:sequencialTransacao>1</ans:sequencialTransacao>`,
      `      <ans:dataRegistroTransacao>${new Date().toISOString().slice(0, 10)}</ans:dataRegistroTransacao>`,
      `      <ans:horaRegistroTransacao>${new Date().toISOString().slice(11, 19)}</ans:horaRegistroTransacao>`,
      `    </ans:identificacaoTransacao>`,
      `  </ans:cabecalho>`,
      `  <!-- Encounter: ${encounterId} -->`,
      `  <!-- Guide Type: ${guideType} -->`,
      `</ans:mensagemTISS>`,
    ].join('\n');

    return {
      guideId: `TISS-${Date.now()}`,
      guideType,
      xmlContent: xml,
      validationErrors: [],
      submissionStatus: TissSubmissionStatus.PENDING,
      generatedAt: new Date().toISOString(),
    };
  }

  async validateTissGuide(dto: TissGuideDto): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = dto.validationErrors ?? [];
    const warnings: string[] = [];

    if (!dto.xmlContent || dto.xmlContent.trim().length === 0) {
      errors.push('Conteúdo XML vazio ou ausente');
    } else if (!dto.xmlContent.includes('mensagemTISS')) {
      errors.push('XML não contém elemento raiz mensagemTISS (namespace ANS)');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ─── TISS Batch ───────────────────────────────────────────────────────────────

  async submitTissBatch(
    tenantId: string,
    dto: TissBatchDto,
  ): Promise<TissBatchResult> {
    this.logger.log(
      `[${tenantId}] Submitting TISS batch ${dto.batchId} with ${dto.guides.length} guides`,
    );

    if (dto.guides.length === 0) {
      throw new BadRequestException('O lote TISS deve conter pelo menos uma guia');
    }

    const protocol = `ANS-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

    return {
      batchId: dto.batchId,
      guideCount: dto.guides.length,
      submissionDate: dto.submissionDate ?? new Date().toISOString(),
      protocol,
      status: TissSubmissionStatus.SUBMITTED,
    };
  }

  async getTissBatchStatus(
    tenantId: string,
    batchId: string,
  ): Promise<{ batchId: string; status: TissSubmissionStatus; checkedAt: string }> {
    this.logger.log(`[${tenantId}] Checking TISS batch status: ${batchId}`);
    // In production: call operator WS to query protocol status
    return {
      batchId,
      status: TissSubmissionStatus.SUBMITTED,
      checkedAt: new Date().toISOString(),
    };
  }

  // ─── Glosa Management ────────────────────────────────────────────────────────

  async registerGlosa(
    tenantId: string,
    dto: GlosaManagementDto,
  ): Promise<GlosaResult> {
    this.logger.log(
      `[${tenantId}] Registering glosa for bill ${dto.billId} — ${dto.glosedItems.length} items`,
    );

    const totalGlosedAmount = dto.glosedItems.reduce(
      (acc, item) => acc + item.amount,
      0,
    );

    return {
      glosaId: `GLO-${Date.now()}`,
      billId: dto.billId,
      totalGlosedAmount,
      appealStatus: dto.appealStatus ?? GlosaAppealStatus.OPEN,
      appealDeadline: dto.appealDeadline ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  async submitGlosaAppeal(
    tenantId: string,
    glosaId: string,
    justification: string,
  ): Promise<{ glosaId: string; appealStatus: GlosaAppealStatus; submittedAt: string }> {
    this.logger.log(
      `[${tenantId}] Submitting glosa appeal for ${glosaId}`,
    );

    if (!justification || justification.trim().length < 20) {
      throw new BadRequestException(
        'A justificativa do recurso deve ter pelo menos 20 caracteres',
      );
    }

    return {
      glosaId,
      appealStatus: GlosaAppealStatus.UNDER_REVIEW,
      submittedAt: new Date().toISOString(),
    };
  }

  async listGlosas(
    tenantId: string,
    filters: { billId?: string; appealStatus?: GlosaAppealStatus } = {},
  ): Promise<{ glosaId: string; billId: string; appealStatus: string; totalGlosedAmount: number }[]> {
    this.logger.log(`[${tenantId}] Listing glosas with filters: ${JSON.stringify(filters)}`);
    // In production: query glosa table with tenant scope + filters
    return [];
  }

  // ─── SUS Billing ─────────────────────────────────────────────────────────────

  async generateSusBilling(
    tenantId: string,
    dto: SusBillingDto,
  ): Promise<SusBillingResult> {
    this.logger.log(
      `[${tenantId}] Generating SUS billing ${dto.type} for competence ${dto.competence}`,
    );

    if (!dto.competence.match(/^\d{4}-\d{2}$/)) {
      throw new BadRequestException(
        'Competência deve estar no formato YYYY-MM (ex: 2024-03)',
      );
    }

    // Stub DATASUS .rem file content
    let exportContent: string;
    if (dto.type === SusBillingType.BPA_I || dto.type === SusBillingType.BPA_C) {
      exportContent = this._buildBpaFile(dto);
    } else if (dto.type === SusBillingType.AIH) {
      exportContent = this._buildAihFile(dto);
    } else {
      exportContent = this._buildApacFile(dto);
    }

    return {
      exportId: `SUS-${dto.type}-${Date.now()}`,
      type: dto.type,
      competence: dto.competence,
      procedureCount: dto.procedures.length,
      exportFile: exportContent,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Cost Per Case ────────────────────────────────────────────────────────────

  async analyzeCostPerCase(
    tenantId: string,
    dto: CostPerCaseDto,
  ): Promise<CostPerCaseResult> {
    this.logger.log(
      `[${tenantId}] Analyzing cost per case for admission ${dto.admissionId}`,
    );

    const breakdown = {
      materials: dto.materials ?? 0,
      medications: dto.medications ?? 0,
      staffing: dto.staffing ?? 0,
      hospitality: dto.hospitality ?? 0,
      exams: dto.exams ?? 0,
    };

    const totalCost =
      dto.totalCost ??
      Object.values(breakdown).reduce((a, b) => a + b, 0);

    const revenue = dto.revenue ?? 0;
    const margin = dto.margin ?? revenue - totalCost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    return {
      admissionId: dto.admissionId,
      breakdown,
      totalCost,
      revenue,
      margin,
      marginPercent: Math.round(marginPercent * 100) / 100,
    };
  }

  async getCostDashboard(
    tenantId: string,
    options: { startDate?: string; endDate?: string; costCenter?: string } = {},
  ): Promise<{
    avgCostPerCase: number;
    avgMargin: number;
    totalRevenue: number;
    totalCost: number;
    caseCount: number;
  }> {
    this.logger.log(`[${tenantId}] Generating cost dashboard`);
    // In production: aggregate from billing_entries + cost_tracking tables
    void options;
    return {
      avgCostPerCase: 0,
      avgMargin: 0,
      totalRevenue: 0,
      totalCost: 0,
      caseCount: 0,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private _buildBpaFile(dto: SusBillingDto): string {
    const [year, month] = dto.competence.split('-');
    const lines: string[] = [
      `#BPA#${year}${month}##########`,
      ...dto.procedures.map(
        (p, i) =>
          `02${(i + 1).toString().padStart(7, '0')}${p.sigtapCode}${p.quantity.toString().padStart(6, '0')}${p.cid10.padEnd(4, ' ')}`,
      ),
    ];
    return lines.join('\r\n');
  }

  private _buildAihFile(dto: SusBillingDto): string {
    return `AIH;${dto.competence};${dto.procedures.map((p) => p.sigtapCode).join(',')}`;
  }

  private _buildApacFile(dto: SusBillingDto): string {
    return `APAC;${dto.competence};${dto.procedures.map((p) => p.sigtapCode).join(',')}`;
  }
}
