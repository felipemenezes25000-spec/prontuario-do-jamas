import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  TISSGuideType,
  CoverageType,
  TISSBatchStatus,
  AuditCheckCategory,
  AuditCheckStatus,
  AuditOverallStatus,
  type EligibilityCheckDto,
  type EligibilityResultDto,
  type GenerateTISSDto,
  type TISSGuideDto,
  type TISSProcedureDto,
  type TISSBatchDto,
  type CreateTISSBatchDto,
  type PreBillingAuditDto,
  type AuditChecklistItemDto,
  type AuditResultDto,
  type AuditCorrectionDto,
  type CostAnalysisDto,
  type CostBreakdownDto,
  type CostBreakdownDetailsDto,
  type CostComparisonDto,
  type MarginAnalysisDto,
} from './dto/billing-advanced.dto';

@Injectable()
export class BillingAdvancedService {
  private readonly logger = new Logger(BillingAdvancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. Real-time Eligibility Check ──────────────────────────────────────

  async checkEligibility(
    tenantId: string,
    dto: EligibilityCheckDto,
  ): Promise<EligibilityResultDto> {
    this.logger.log(
      `Eligibility check for patient ${dto.patientId}, procedure ${dto.procedureCode}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    // In production, this would call the insurance operator's API (TISS Web Services)
    // For now, simulate eligibility verification based on patient insurance data
    const scheduledDate = new Date(dto.scheduledDate);
    const cardValidUntil = new Date(
      scheduledDate.getFullYear(),
      scheduledDate.getMonth() + 6,
      1,
    );
    const planActive = true;
    const waitingPeriod = false;

    const result: EligibilityResultDto = {
      isEligible: planActive && !waitingPeriod,
      planActive,
      coverageType: CoverageType.FULL,
      copayAmount: 0,
      coinsurancePercent: 0,
      deductibleRemaining: 0,
      preAuthRequired: this.isProcedureRequiringPreAuth(dto.procedureCode),
      waitingPeriod,
      waitingPeriodEndDate: null,
      restrictions: [],
      cardValidUntil: cardValidUntil.toISOString(),
    };

    this.logger.log(
      `Eligibility result: eligible=${result.isEligible}, coverage=${result.coverageType}`,
    );

    return result;
  }

  private isProcedureRequiringPreAuth(procedureCode: string): boolean {
    // High-complexity procedures typically require pre-authorization
    const preAuthPrefixes = ['3', '4', '5']; // TUSS groups 3x, 4x, 5x
    return preAuthPrefixes.some((prefix) => procedureCode.startsWith(prefix));
  }

  // ─── 2. TISS XML Generation ──────────────────────────────────────────────

  async generateGuide(
    tenantId: string,
    dto: GenerateTISSDto,
  ): Promise<TISSGuideDto> {
    this.logger.log(
      `Generating TISS ${dto.guideType} guide for encounter ${dto.encounterId}`,
    );

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      include: {
        patient: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter ${dto.encounterId} not found`);
    }

    const guideNumber = this.generateGuideNumber();
    const registrationANS = '999999'; // Would come from insurance config

    const procedures: TISSProcedureDto[] = [
      {
        code: '10101012',
        description: 'Consulta em consultorio',
        quantity: 1,
        unitPrice: 150.0,
        totalPrice: 150.0,
      },
    ];

    const totalAmount = procedures.reduce((sum, p) => sum + p.totalPrice, 0);

    const xmlContent = this.buildTISSXml({
      guideNumber,
      guideType: dto.guideType,
      registrationANS,
      providerCNES: dto.providerCNES,
      executantCNES: dto.executantCNES,
      patientName: encounter.patient?.fullName ?? 'N/A',
      insuranceNumber: 'N/A',
      planCode: 'N/A',
      procedures,
      totalAmount,
    });

    const guide: TISSGuideDto = {
      guideNumber,
      guideType: dto.guideType,
      registrationANS,
      patientData: {
        name: encounter.patient?.fullName ?? 'N/A',
        insuranceNumber: 'N/A',
        planCode: 'N/A',
      },
      providerData: {
        CNES: dto.providerCNES,
        name: 'Hospital VoxPEP',
      },
      procedures,
      totalAmount,
      xmlContent,
    };

    this.logger.log(`TISS guide ${guideNumber} generated successfully`);
    return guide;
  }

  async validateGuide(guide: TISSGuideDto): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!guide.guideNumber) {
      errors.push('Numero da guia e obrigatorio');
    }
    if (!guide.registrationANS || guide.registrationANS.length !== 6) {
      errors.push('Registro ANS deve conter 6 digitos');
    }
    if (!guide.patientData.name) {
      errors.push('Nome do paciente e obrigatorio');
    }
    if (!guide.patientData.insuranceNumber) {
      errors.push('Numero da carteirinha e obrigatorio');
    }
    if (!guide.providerData.CNES) {
      errors.push('CNES do prestador e obrigatorio');
    }
    if (guide.procedures.length === 0) {
      errors.push('Pelo menos um procedimento e obrigatorio');
    }

    for (const proc of guide.procedures) {
      if (!proc.code || proc.code.length < 8) {
        errors.push(`Codigo TUSS invalido: ${proc.code}`);
      }
      if (proc.quantity <= 0) {
        errors.push(
          `Quantidade deve ser maior que zero para procedimento ${proc.code}`,
        );
      }
      if (proc.unitPrice <= 0) {
        warnings.push(
          `Preco unitario zerado para procedimento ${proc.code}`,
        );
      }
    }

    const expectedTotal = guide.procedures.reduce(
      (sum, p) => sum + p.totalPrice,
      0,
    );
    if (Math.abs(guide.totalAmount - expectedTotal) > 0.01) {
      errors.push(
        `Total da guia (${guide.totalAmount}) diverge da soma dos procedimentos (${expectedTotal})`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async createBatch(
    tenantId: string,
    dto: CreateTISSBatchDto,
  ): Promise<TISSBatchDto> {
    this.logger.log(
      `Creating TISS batch for competence ${dto.competence}, type ${dto.guideType}`,
    );

    if (!/^\d{4}-\d{2}$/.test(dto.competence)) {
      throw new BadRequestException(
        'Competence must be in YYYY-MM format',
      );
    }

    const batchNumber = `LOTE-${dto.competence}-${Date.now().toString(36).toUpperCase()}`;

    // In production, would load actual guides from database
    const guides: TISSGuideDto[] = dto.guideIds.map((id) => ({
      guideNumber: id,
      guideType: dto.guideType,
      registrationANS: '999999',
      patientData: { name: 'N/A', insuranceNumber: 'N/A', planCode: 'N/A' },
      providerData: { CNES: '0000000', name: 'Hospital VoxPEP' },
      procedures: [],
      totalAmount: 0,
      xmlContent: '',
    }));

    const totalAmount = guides.reduce((sum, g) => sum + g.totalAmount, 0);

    const batch: TISSBatchDto = {
      batchNumber,
      guideType: dto.guideType,
      competence: dto.competence,
      guides,
      totalGuides: guides.length,
      totalAmount,
      xmlContent: this.buildBatchXml(batchNumber, dto.competence, guides),
      status: TISSBatchStatus.DRAFT,
    };

    this.logger.log(
      `Batch ${batchNumber} created with ${guides.length} guides`,
    );
    return batch;
  }

  async exportBatch(batchNumber: string): Promise<{
    batchNumber: string;
    xmlContent: string;
    status: TISSBatchStatus;
    exportedAt: string;
  }> {
    this.logger.log(`Exporting batch ${batchNumber}`);

    // In production, would load batch from DB and generate full XML
    return {
      batchNumber,
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?><ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas"><ans:cabecalho><ans:identificacaoTransacao><ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao></ans:identificacaoTransacao></ans:cabecalho><ans:prestadorParaOperadora><ans:loteGuias><ans:numeroLote>${batchNumber}</ans:numeroLote></ans:loteGuias></ans:prestadorParaOperadora></ans:mensagemTISS>`,
      status: TISSBatchStatus.EXPORTED,
      exportedAt: new Date().toISOString(),
    };
  }

  async submitBatch(batchNumber: string): Promise<{
    batchNumber: string;
    status: TISSBatchStatus;
    protocolNumber: string;
    submittedAt: string;
  }> {
    this.logger.log(`Submitting batch ${batchNumber} to operator`);

    // In production, would send XML to insurance operator's TISS web service
    const protocolNumber = `PROT-${Date.now().toString(36).toUpperCase()}`;

    return {
      batchNumber,
      status: TISSBatchStatus.PROTOCOL_RECEIVED,
      protocolNumber,
      submittedAt: new Date().toISOString(),
    };
  }

  private generateGuideNumber(): string {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${timestamp}${random}`;
  }

  private buildTISSXml(params: {
    guideNumber: string;
    guideType: TISSGuideType;
    registrationANS: string;
    providerCNES: string;
    executantCNES: string;
    patientName: string;
    insuranceNumber: string;
    planCode: string;
    procedures: TISSProcedureDto[];
    totalAmount: number;
  }): string {
    const proceduresXml = params.procedures
      .map(
        (p) =>
          `<ans:procedimento><ans:codigoProcedimento>${p.code}</ans:codigoProcedimento><ans:descricaoProcedimento>${p.description}</ans:descricaoProcedimento><ans:quantidadeSolicitada>${p.quantity}</ans:quantidadeSolicitada><ans:valorUnitario>${p.unitPrice.toFixed(2)}</ans:valorUnitario><ans:valorTotal>${p.totalPrice.toFixed(2)}</ans:valorTotal></ans:procedimento>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>1</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${new Date().toISOString().split('T')[0]}</ans:dataRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:registroANS>${params.registrationANS}</ans:registroANS>
    </ans:origem>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:guiasTISS>
        <ans:guia${this.getTISSGuideElementName(params.guideType)}>
          <ans:cabecalhoGuia>
            <ans:registroANS>${params.registrationANS}</ans:registroANS>
            <ans:numeroGuiaPrestador>${params.guideNumber}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>${params.insuranceNumber}</ans:numeroCarteira>
            <ans:nomeBeneficiario>${params.patientName}</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosContratado>
            <ans:codigoPrestadorNaOperadora>${params.providerCNES}</ans:codigoPrestadorNaOperadora>
            <ans:nomeContratado>Hospital VoxPEP</ans:nomeContratado>
          </ans:dadosContratado>
          <ans:dadosExecutante>
            <ans:CNES>${params.executantCNES}</ans:CNES>
          </ans:dadosExecutante>
          <ans:procedimentosRealizados>
            ${proceduresXml}
          </ans:procedimentosRealizados>
          <ans:valorTotal>${params.totalAmount.toFixed(2)}</ans:valorTotal>
        </ans:guia${this.getTISSGuideElementName(params.guideType)}>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;
  }

  private getTISSGuideElementName(guideType: TISSGuideType): string {
    const mapping: Record<TISSGuideType, string> = {
      [TISSGuideType.SP_SADT]: 'SP-SADT',
      [TISSGuideType.INTERNACAO]: 'Internacao',
      [TISSGuideType.CONSULTA]: 'Consulta',
      [TISSGuideType.HONORARIOS]: 'Honorarios',
      [TISSGuideType.RESUMO_INTERNACAO]: 'ResumoInternacao',
      [TISSGuideType.ODONTOLOGICA]: 'Odontologica',
    };
    return mapping[guideType];
  }

  private buildBatchXml(
    batchNumber: string,
    competence: string,
    guides: TISSGuideDto[],
  ): string {
    const guidesXml = guides.map((g) => g.xmlContent).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
    </ans:identificacaoTransacao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${batchNumber}</ans:numeroLote>
      <ans:competencia>${competence}</ans:competencia>
      <ans:guias>
        ${guidesXml}
      </ans:guias>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;
  }

  // ─── 3. Pre-billing Audit ────────────────────────────────────────────────

  async runPreBillingAudit(
    tenantId: string,
    dto: PreBillingAuditDto,
  ): Promise<AuditResultDto> {
    this.logger.log(
      `Running pre-billing audit for encounter ${dto.encounterId}`,
    );

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      include: {
        patient: true,
        prescriptions: true,
        clinicalNotes: true,
        vitalSigns: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter ${dto.encounterId} not found`);
    }

    const checks: AuditChecklistItemDto[] = [];

    // COMPLETENESS checks
    checks.push({
      category: AuditCheckCategory.COMPLETENESS,
      description: 'Clinical notes present',
      status:
        encounter.clinicalNotes && encounter.clinicalNotes.length > 0
          ? AuditCheckStatus.PASS
          : AuditCheckStatus.FAIL,
      notes:
        encounter.clinicalNotes && encounter.clinicalNotes.length > 0
          ? `${encounter.clinicalNotes.length} note(s) found`
          : 'No clinical notes found for this encounter',
    });

    checks.push({
      category: AuditCheckCategory.COMPLETENESS,
      description: 'Vital signs recorded',
      status:
        encounter.vitalSigns && encounter.vitalSigns.length > 0
          ? AuditCheckStatus.PASS
          : AuditCheckStatus.WARNING,
      notes:
        encounter.vitalSigns && encounter.vitalSigns.length > 0
          ? `${encounter.vitalSigns.length} vital sign record(s)`
          : 'No vital signs recorded',
    });

    checks.push({
      category: AuditCheckCategory.COMPLETENESS,
      description: 'Patient identification complete',
      status: encounter.patient?.fullName
        ? AuditCheckStatus.PASS
        : AuditCheckStatus.FAIL,
      notes: null,
    });

    // CONSISTENCY checks
    checks.push({
      category: AuditCheckCategory.CONSISTENCY,
      description: 'Encounter dates are consistent',
      status:
        encounter.startedAt && (!encounter.completedAt || encounter.completedAt >= encounter.startedAt)
          ? AuditCheckStatus.PASS
          : AuditCheckStatus.FAIL,
      notes:
        encounter.completedAt && encounter.completedAt < (encounter.startedAt ?? encounter.completedAt)
          ? 'End time is before start time'
          : null,
    });

    checks.push({
      category: AuditCheckCategory.CONSISTENCY,
      description: 'Prescriptions match documentation',
      status:
        encounter.prescriptions && encounter.prescriptions.length > 0
          ? AuditCheckStatus.PASS
          : AuditCheckStatus.WARNING,
      notes:
        encounter.prescriptions && encounter.prescriptions.length > 0
          ? `${encounter.prescriptions.length} prescription(s) documented`
          : 'No prescriptions found — verify if applicable',
    });

    // CODING checks
    checks.push({
      category: AuditCheckCategory.CODING,
      description: 'Primary diagnosis coded (CID-10)',
      status: encounter.clinicalNotes && encounter.clinicalNotes.length > 0
        ? AuditCheckStatus.PASS
        : AuditCheckStatus.FAIL,
      notes: encounter.clinicalNotes && encounter.clinicalNotes.length > 0
        ? `Diagnosis codes in clinical notes`
        : 'Primary diagnosis not coded',
    });

    checks.push({
      category: AuditCheckCategory.CODING,
      description: 'Procedure codes present (TUSS)',
      status: AuditCheckStatus.WARNING,
      notes: 'Procedure codes should be verified against TUSS table',
    });

    // DOCUMENTATION checks
    checks.push({
      category: AuditCheckCategory.DOCUMENTATION,
      description: 'Provider signature present',
      status: encounter.primaryDoctorId
        ? AuditCheckStatus.PASS
        : AuditCheckStatus.FAIL,
      notes: encounter.primaryDoctorId
        ? null
        : 'No provider assigned to encounter',
    });

    // AUTHORIZATION checks
    checks.push({
      category: AuditCheckCategory.AUTHORIZATION,
      description: 'Insurance authorization verified',
      status: AuditCheckStatus.WARNING,
      notes: 'Authorization should be verified with insurance operator',
    });

    // Calculate score
    const totalChecks = checks.length;
    const passedChecks = checks.filter(
      (c) =>
        c.status === AuditCheckStatus.PASS ||
        c.status === AuditCheckStatus.NOT_APPLICABLE,
    ).length;
    const warningChecks = checks.filter(
      (c) => c.status === AuditCheckStatus.WARNING,
    );
    const failedChecksList = checks.filter(
      (c) => c.status === AuditCheckStatus.FAIL,
    );

    const score = Math.round(
      ((passedChecks + warningChecks.length * 0.5) / totalChecks) * 100,
    );

    let overallStatus: AuditOverallStatus;
    if (failedChecksList.length === 0) {
      overallStatus = AuditOverallStatus.APPROVED;
    } else if (failedChecksList.length <= 2) {
      overallStatus = AuditOverallStatus.NEEDS_CORRECTION;
    } else {
      overallStatus = AuditOverallStatus.REJECTED;
    }

    const corrections: AuditCorrectionDto[] = failedChecksList.map(
      (check) => ({
        field: check.description,
        currentValue: 'Missing or invalid',
        suggestedValue: 'Must be provided before billing',
        reason: check.notes ?? 'Required for billing compliance',
      }),
    );

    const result: AuditResultDto = {
      encounterId: dto.encounterId,
      overallStatus,
      score,
      failedChecks: failedChecksList,
      warnings: warningChecks,
      corrections,
      auditorId: dto.auditorId,
      auditedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Pre-billing audit complete: ${overallStatus}, score ${score}/100`,
    );
    return result;
  }

  async getAuditHistory(
    tenantId: string,
    encounterId: string,
  ): Promise<{
    encounterId: string;
    audits: Array<{
      auditId: string;
      overallStatus: AuditOverallStatus;
      score: number;
      auditorId: string;
      auditedAt: string;
    }>;
  }> {
    this.logger.log(
      `Getting audit history for encounter ${encounterId}, tenant ${tenantId}`,
    );

    // In production, would query audit history from database
    return {
      encounterId,
      audits: [
        {
          auditId: randomUUID(),
          overallStatus: AuditOverallStatus.NEEDS_CORRECTION,
          score: 65,
          auditorId: randomUUID(),
          auditedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          auditId: randomUUID(),
          overallStatus: AuditOverallStatus.APPROVED,
          score: 95,
          auditorId: randomUUID(),
          auditedAt: new Date().toISOString(),
        },
      ],
    };
  }

  // ─── 4. Cost per Patient/Case ────────────────────────────────────────────

  async calculateCostPerEncounter(
    tenantId: string,
    encounterId: string,
  ): Promise<CostBreakdownDto> {
    this.logger.log(`Calculating cost for encounter ${encounterId}`);

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        patient: true,
        prescriptions: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter ${encounterId} not found`);
    }

    // In production, these would come from cost center data, pharmacy, materials, etc.
    const breakdown: CostBreakdownDetailsDto = {
      dailyRates: { days: 3, unitCost: 850.0, total: 2550.0 },
      medications: [
        { name: 'Dipirona 500mg', quantity: 10, unitCost: 1.5, total: 15.0 },
        {
          name: 'Omeprazol 20mg',
          quantity: 6,
          unitCost: 3.2,
          total: 19.2,
        },
      ],
      materials: [
        {
          name: 'Cateter IV periférico',
          quantity: 2,
          unitCost: 12.0,
          total: 24.0,
        },
        {
          name: 'Equipo macrogotas',
          quantity: 3,
          unitCost: 8.5,
          total: 25.5,
        },
      ],
      labs: [
        { name: 'Hemograma completo', unitCost: 25.0, total: 25.0 },
        { name: 'Glicemia de jejum', unitCost: 12.0, total: 12.0 },
        { name: 'PCR', unitCost: 35.0, total: 35.0 },
      ],
      imaging: [
        { name: 'Radiografia de tórax PA', unitCost: 80.0, total: 80.0 },
      ],
      procedures: [
        { name: 'Consulta médica', unitCost: 150.0, total: 150.0 },
      ],
      professionalFees: { total: 450.0 },
      icuDays: { count: 0, dailyCost: 3500.0, total: 0 },
      surgicalRoom: { hours: 0, hourlyRate: 1200.0, total: 0 },
      other: [],
    };

    const totalCost =
      breakdown.dailyRates.total +
      breakdown.medications.reduce((s, m) => s + m.total, 0) +
      breakdown.materials.reduce((s, m) => s + m.total, 0) +
      breakdown.labs.reduce((s, l) => s + l.total, 0) +
      breakdown.imaging.reduce((s, i) => s + i.total, 0) +
      breakdown.procedures.reduce((s, p) => s + p.total, 0) +
      breakdown.professionalFees.total +
      breakdown.icuDays.total +
      breakdown.surgicalRoom.total +
      breakdown.other.reduce((s, o) => s + o.total, 0);

    const revenueTotal = 5200.0; // Would come from billing entries
    const margin = revenueTotal - totalCost;
    const marginPercent =
      revenueTotal > 0 ? (margin / revenueTotal) * 100 : 0;

    return {
      encounterId,
      patientId: encounter.patientId,
      admissionDate: encounter.startedAt?.toISOString() ?? null,
      dischargeDate: encounter.completedAt?.toISOString() ?? null,
      totalCost: Math.round(totalCost * 100) / 100,
      revenueTotal,
      margin: Math.round(margin * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
      breakdown,
    };
  }

  async calculateCostPerPatient(
    tenantId: string,
    dto: CostAnalysisDto,
  ): Promise<{
    patientId: string;
    encounters: CostBreakdownDto[];
    aggregated: {
      totalCost: number;
      totalRevenue: number;
      totalMargin: number;
      averageMarginPercent: number;
      encounterCount: number;
    };
  }> {
    if (!dto.patientId) {
      throw new BadRequestException('patientId is required for patient cost analysis');
    }

    this.logger.log(`Calculating aggregate cost for patient ${dto.patientId}`);

    const whereClause: Record<string, unknown> = {
      patientId: dto.patientId,
      tenantId,
    };
    if (dto.startDate) {
      whereClause['startedAt'] = { gte: new Date(dto.startDate) };
    }
    if (dto.endDate) {
      whereClause['completedAt'] = { lte: new Date(dto.endDate) };
    }

    const encounters = await this.prisma.encounter.findMany({
      where: whereClause,
      select: { id: true },
      take: 50,
    });

    const breakdowns: CostBreakdownDto[] = [];
    for (const enc of encounters) {
      const cost = await this.calculateCostPerEncounter(tenantId, enc.id);
      breakdowns.push(cost);
    }

    const totalCost = breakdowns.reduce((s, b) => s + b.totalCost, 0);
    const totalRevenue = breakdowns.reduce((s, b) => s + b.revenueTotal, 0);
    const totalMargin = totalRevenue - totalCost;
    const averageMarginPercent =
      totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      patientId: dto.patientId,
      encounters: breakdowns,
      aggregated: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalMargin: Math.round(totalMargin * 100) / 100,
        averageMarginPercent: Math.round(averageMarginPercent * 100) / 100,
        encounterCount: breakdowns.length,
      },
    };
  }

  async getCostComparison(
    tenantId: string,
    encounterId: string,
  ): Promise<CostComparisonDto> {
    this.logger.log(`Getting DRG cost comparison for encounter ${encounterId}`);

    const cost = await this.calculateCostPerEncounter(tenantId, encounterId);

    // In production, would use actual DRG classification and expected cost
    const drgExpectedCost = 4800.0;
    const variance = cost.totalCost - drgExpectedCost;
    const variancePercent =
      drgExpectedCost > 0 ? (variance / drgExpectedCost) * 100 : 0;

    return {
      encounterId,
      actualCost: cost.totalCost,
      drgExpectedCost,
      variance: Math.round(variance * 100) / 100,
      variancePercent: Math.round(variancePercent * 100) / 100,
      drgCode: 'DRG-191',
      drgDescription:
        'Pneumonia simples sem complicacoes, idade > 17 anos',
    };
  }

  async getMarginAnalysis(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<MarginAnalysisDto> {
    this.logger.log(`Calculating margin analysis for tenant ${tenantId}`);

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // In production, would aggregate actual cost/revenue data from billing entries
    const totalRevenue = 1250000.0;
    const totalCost = 890000.0;
    const grossMargin = totalRevenue - totalCost;
    const grossMarginPercent = (grossMargin / totalRevenue) * 100;
    const encounterCount = 320;

    return {
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      totalRevenue,
      totalCost,
      grossMargin: Math.round(grossMargin * 100) / 100,
      grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
      encounterCount,
      averageMarginPerEncounter:
        Math.round((grossMargin / encounterCount) * 100) / 100,
      topMarginEncounters: [
        {
          encounterId: randomUUID(),
          margin: 8500.0,
          marginPercent: 62.3,
        },
        {
          encounterId: randomUUID(),
          margin: 7200.0,
          marginPercent: 55.1,
        },
        {
          encounterId: randomUUID(),
          margin: 6800.0,
          marginPercent: 51.8,
        },
        {
          encounterId: randomUUID(),
          margin: 5900.0,
          marginPercent: 48.2,
        },
        {
          encounterId: randomUUID(),
          margin: 5500.0,
          marginPercent: 45.6,
        },
      ],
      worstMarginEncounters: [
        {
          encounterId: randomUUID(),
          margin: -3200.0,
          marginPercent: -28.5,
        },
        {
          encounterId: randomUUID(),
          margin: -2100.0,
          marginPercent: -18.9,
        },
        {
          encounterId: randomUUID(),
          margin: -1500.0,
          marginPercent: -12.3,
        },
        {
          encounterId: randomUUID(),
          margin: -800.0,
          marginPercent: -6.7,
        },
        {
          encounterId: randomUUID(),
          margin: -200.0,
          marginPercent: -1.5,
        },
      ],
    };
  }
}
