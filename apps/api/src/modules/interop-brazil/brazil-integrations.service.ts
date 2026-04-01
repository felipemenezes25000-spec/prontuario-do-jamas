import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SinanNotificationDto,
  NotifiableDisease,
  NotificationFrequency,
  SinanStatus,
  CadsusResultDto,
  CadsusRegistrationDto,
  CnesEstablishmentDto,
  CnesProfessionalDto,
  BPADto,
  APACDto,
  AIHDto,
  SUSBillingExportDto,
  SUSBillingType,
  SUSBillingStatus,
  NotivisaDto,
  NotivisaStatus,
  DeathCertificateDto,
  BirthCertificateDto,
} from './dto/brazil-integrations.dto';

/**
 * Comprehensive list of compulsory notifiable diseases in Brazil (Portaria MS).
 * CID-10 code -> disease info.
 */
const NOTIFIABLE_DISEASES: NotifiableDisease[] = [
  // Immediate notification
  { code: 'A00', name: 'Colera', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A20', name: 'Peste', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A22', name: 'Antraz / Carbunculo', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A75', name: 'Tifo Epidemico', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A78', name: 'Febre Q', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A80', name: 'Poliomielite', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A82', name: 'Raiva Humana', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A90', name: 'Dengue', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A91', name: 'Dengue Hemorragica', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A92.0', name: 'Febre de Chikungunya', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A92.8', name: 'Zika Virus', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A95', name: 'Febre Amarela', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A96.0', name: 'Febre Hemorragica Junin', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A98.3', name: 'Hantavirose', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A98.4', name: 'Ebola', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'B03', name: 'Variola', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'B05', name: 'Sarampo', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'B06', name: 'Rubeola', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A33', name: 'Tetano Neonatal', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A35', name: 'Tetano Acidental', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A36', name: 'Difteria', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A37', name: 'Coqueluche', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'J09', name: 'Influenza por novo subtipo', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'U04', name: 'SARS', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'U07.1', name: 'COVID-19', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'T65.1', name: 'Intoxicacao Exogena (agrotoxicos)', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },

  // Weekly notification
  { code: 'A15', name: 'Tuberculose Pulmonar', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A16', name: 'Tuberculose Respiratoria', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A17', name: 'Tuberculose do Sistema Nervoso', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A19', name: 'Tuberculose Miliar', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A27', name: 'Leptospirose', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A30', name: 'Hanseniase', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A39', name: 'Meningite Meningococica', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'A50', name: 'Sifilis Congenita', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A51', name: 'Sifilis Precoce', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A52', name: 'Sifilis Tardia', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A53', name: 'Sifilis Adquirida', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B15', name: 'Hepatite A', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B16', name: 'Hepatite B Aguda', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B17.1', name: 'Hepatite C Aguda', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B18.1', name: 'Hepatite B Cronica', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B18.2', name: 'Hepatite C Cronica', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B20', name: 'HIV / AIDS', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B50', name: 'Malaria por P. falciparum', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B51', name: 'Malaria por P. vivax', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B54', name: 'Malaria nao especificada', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B55', name: 'Leishmaniose Visceral', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B55.1', name: 'Leishmaniose Tegumentar', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'B57', name: 'Doenca de Chagas Aguda', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'B65', name: 'Esquistossomose', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'P35.0', name: 'Sindrome da Rubeola Congenita', frequency: NotificationFrequency.IMMEDIATE, isCompulsory: true },
  { code: 'G00', name: 'Meningite Bacteriana', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'A01', name: 'Febre Tifoide', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'X85', name: 'Violencia Domestica / Sexual', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
  { code: 'Y09', name: 'Violencia Interpessoal', frequency: NotificationFrequency.WEEKLY, isCompulsory: true },
];

/** Map for O(1) disease lookup by CID-10 code */
const NOTIFIABLE_DISEASES_MAP = new Map<string, NotifiableDisease>(
  NOTIFIABLE_DISEASES.map((d) => [d.code, d]),
);

@Injectable()
export class BrazilIntegrationsService {
  private readonly logger = new Logger(BrazilIntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── SINAN ──────────────────────────────────────────────────────────────────

  async createNotification(tenantId: string, dto: SinanNotificationDto) {
    this.logger.log(`[SINAN] Creating notification for disease ${dto.diseaseCode}, patient ${dto.patientId}`);

    const disease = this.autoDetectNotifiable(dto.diseaseCode);

    return {
      id: crypto.randomUUID(),
      tenantId,
      ...dto,
      disease: disease.disease,
      isCompulsory: disease.isCompulsory,
      frequency: disease.frequency,
      status: SinanStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
  }

  getNotifiableDiseases(): NotifiableDisease[] {
    return NOTIFIABLE_DISEASES;
  }

  autoDetectNotifiable(cidCode: string): {
    cidCode: string;
    isNotifiable: boolean;
    isCompulsory: boolean;
    frequency: NotificationFrequency | null;
    disease: NotifiableDisease | null;
  } {
    // Exact match first
    let disease = NOTIFIABLE_DISEASES_MAP.get(cidCode) ?? null;

    // Try matching base code (e.g., A90.1 -> A90)
    if (!disease && cidCode.includes('.')) {
      const baseCode = cidCode.split('.')[0];
      disease = NOTIFIABLE_DISEASES_MAP.get(baseCode) ?? null;
    }

    // Try prefix match for range codes (e.g., A15.3 matches A15)
    if (!disease) {
      const baseCode = cidCode.replace(/\.\d+$/, '');
      for (const [code, d] of NOTIFIABLE_DISEASES_MAP) {
        if (code === baseCode || baseCode.startsWith(code)) {
          disease = d;
          break;
        }
      }
    }

    return {
      cidCode,
      isNotifiable: disease !== null,
      isCompulsory: disease?.isCompulsory ?? false,
      frequency: disease?.frequency ?? null,
      disease,
    };
  }

  async submitToSINAN(tenantId: string, notificationId: string) {
    this.logger.log(`[SINAN] Submitting notification ${notificationId} to SINAN`);

    // In production, this would call the SINAN web service / API
    return {
      notificationId,
      status: SinanStatus.SENT,
      protocol: `SINAN-${new Date().getFullYear()}-${notificationId.slice(0, 8).toUpperCase()}`,
      submittedAt: new Date().toISOString(),
    };
  }

  async getNotificationStatus(tenantId: string, notificationId: string) {
    this.logger.log(`[SINAN] Checking status for notification ${notificationId}`);

    return {
      notificationId,
      status: SinanStatus.SENT,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ─── CADSUS / CNS ──────────────────────────────────────────────────────────

  async lookupByCPF(tenantId: string, cpf: string): Promise<CadsusResultDto | null> {
    this.logger.log(`[CADSUS] Lookup by CPF: ${cpf.slice(0, 3)}***`);

    // In production, this would call the CADSUS web service (CadSUSService SOAP/REST)
    return null;
  }

  async lookupByCNS(tenantId: string, cns: string): Promise<CadsusResultDto | null> {
    this.logger.log(`[CADSUS] Lookup by CNS: ${cns.slice(0, 3)}***`);

    if (!this.validateCNS(cns)) {
      throw new BadRequestException('Invalid CNS number (modulo 11 check failed)');
    }

    // In production, this would call the CADSUS web service
    return null;
  }

  async lookupByName(
    tenantId: string,
    fullName: string,
    _birthDate: string,
    _motherName: string,
  ): Promise<CadsusResultDto[]> {
    this.logger.log(`[CADSUS] Lookup by name: ${fullName}`);

    // In production, this would call the CADSUS web service
    return [];
  }

  async registerPatient(tenantId: string, dto: CadsusRegistrationDto): Promise<{ cns: string; status: string }> {
    this.logger.log(`[CADSUS] Registering patient: ${dto.fullName}`);

    // In production, this would call the CADSUS registration web service
    return {
      cns: '000000000000000',
      status: 'PENDING',
    };
  }

  /**
   * Validates a CNS (Cartao Nacional de Saude) number using the modulo 11 algorithm.
   *
   * CNS numbers are 15 digits. There are two valid formats:
   * - Starting with 1 or 2: definitive CNS (mod 11 of first 11 digits)
   * - Starting with 7, 8, or 9: provisional CNS (different mod 11 variant)
   */
  validateCNS(cns: string): boolean {
    if (!/^\d{15}$/.test(cns)) {
      return false;
    }

    const firstDigit = cns[0];

    if (firstDigit === '1' || firstDigit === '2') {
      // Definitive CNS — mod 11 validation on first 15 digits
      let sum = 0;
      for (let i = 0; i < 11; i++) {
        sum += parseInt(cns[i], 10) * (15 - i);
      }
      const remainder = sum % 11;
      let checkDigit = 11 - remainder;

      if (checkDigit === 11) {
        checkDigit = 0;
      }

      if (checkDigit === 10) {
        // When check digit is 10, add weight to sum and recalculate
        sum += 2;
        const newRemainder = sum % 11;
        checkDigit = 11 - newRemainder;
        if (checkDigit === 11) {
          checkDigit = 0;
        }
      }

      // Reconstruct and compare: first 11 digits + "00" padding + 2-digit check
      const expected = cns.slice(0, 11) + '00' + checkDigit.toString().padStart(2, '0');
      return cns === expected;
    }

    if (firstDigit === '7' || firstDigit === '8' || firstDigit === '9') {
      // Provisional CNS — sum of all 15 digits weighted, must be divisible by 11
      let sum = 0;
      for (let i = 0; i < 15; i++) {
        sum += parseInt(cns[i], 10) * (15 - i);
      }
      return sum % 11 === 0;
    }

    return false;
  }

  // ─── CNES ───────────────────────────────────────────────────────────────────

  async lookupEstablishment(tenantId: string, cnesCode: string): Promise<CnesEstablishmentDto | null> {
    this.logger.log(`[CNES] Lookup establishment: ${cnesCode}`);

    // In production, this would call the CNES web service (DataSUS API)
    return null;
  }

  async lookupProfessional(tenantId: string, crm: string): Promise<CnesProfessionalDto | null> {
    this.logger.log(`[CNES] Lookup professional by CRM: ${crm}`);

    // In production, this would call the CNES web service
    return null;
  }

  async validateCRM(crm: string, state: string): Promise<{ valid: boolean; professional: string | null }> {
    this.logger.log(`[CNES] Validating CRM: ${crm}/${state}`);

    // In production, this would call the CFM (Conselho Federal de Medicina) API
    return { valid: false, professional: null };
  }

  async getEstablishmentServices(tenantId: string, cnesCode: string): Promise<string[]> {
    this.logger.log(`[CNES] Getting services for establishment: ${cnesCode}`);

    // In production, this would call the CNES web service
    return [];
  }

  // ─── SUS Billing ────────────────────────────────────────────────────────────

  async generateBPA(tenantId: string, dto: BPADto) {
    this.logger.log(`[SUS-BPA] Generating ${dto.type} for competence ${dto.competence}`);

    const totalProcedures = dto.procedures.reduce((sum, p) => sum + p.quantity, 0);

    return {
      id: crypto.randomUUID(),
      tenantId,
      type: dto.type,
      competence: dto.competence,
      establishmentCNES: dto.establishmentCNES,
      totalProcedures,
      procedureCount: dto.procedures.length,
      status: SUSBillingStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
  }

  async generateAPAC(tenantId: string, dto: APACDto) {
    this.logger.log(`[SUS-APAC] Generating APAC ${dto.apacNumber}`);

    return {
      id: crypto.randomUUID(),
      tenantId,
      apacNumber: dto.apacNumber,
      type: dto.type,
      patientCNS: dto.patientCNS,
      mainProcedure: dto.mainProcedure,
      diagnosis: dto.diagnosis,
      status: SUSBillingStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
  }

  async generateAIH(tenantId: string, dto: AIHDto) {
    this.logger.log(`[SUS-AIH] Generating AIH ${dto.aihNumber}`);

    return {
      id: crypto.randomUUID(),
      tenantId,
      aihNumber: dto.aihNumber,
      type: dto.type,
      patientCNS: dto.patientCNS,
      mainDiagnosis: dto.mainDiagnosis,
      outcome: dto.outcome,
      totalDays: dto.totalDays,
      icuDays: dto.icuDays ?? 0,
      procedureCount: dto.procedures.length,
      status: SUSBillingStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
  }

  async validateBilling(tenantId: string, billingId: string, type: SUSBillingType) {
    this.logger.log(`[SUS] Validating ${type} billing ${billingId}`);

    // In production, this would run SIGTAP validation rules
    return {
      billingId,
      type,
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      validatedAt: new Date().toISOString(),
    };
  }

  async exportToSIA(tenantId: string, dto: SUSBillingExportDto) {
    this.logger.log(`[SUS-SIA] Exporting ${dto.type} for competence ${dto.competence} in ${dto.format} format`);

    if (dto.type !== SUSBillingType.BPA && dto.type !== SUSBillingType.APAC) {
      throw new BadRequestException('SIA export only supports BPA and APAC billing types');
    }

    return {
      id: crypto.randomUUID(),
      tenantId,
      type: dto.type,
      competence: dto.competence,
      format: dto.format,
      recordCount: dto.records.length,
      totalValue: dto.totalValue,
      status: SUSBillingStatus.EXPORTED,
      exportedAt: new Date().toISOString(),
      fileName: `SIA_${dto.type}_${dto.competence.replace('-', '')}.${dto.format.toLowerCase()}`,
    };
  }

  async exportToSIH(tenantId: string, dto: SUSBillingExportDto) {
    this.logger.log(`[SUS-SIH] Exporting AIH for competence ${dto.competence} in ${dto.format} format`);

    if (dto.type !== SUSBillingType.AIH) {
      throw new BadRequestException('SIH export only supports AIH billing type');
    }

    return {
      id: crypto.randomUUID(),
      tenantId,
      type: dto.type,
      competence: dto.competence,
      format: dto.format,
      recordCount: dto.records.length,
      totalValue: dto.totalValue,
      status: SUSBillingStatus.EXPORTED,
      exportedAt: new Date().toISOString(),
      fileName: `SIH_AIH_${dto.competence.replace('-', '')}.${dto.format.toLowerCase()}`,
    };
  }

  async getProcessingStatus(tenantId: string, exportId: string) {
    this.logger.log(`[SUS] Checking processing status for export ${exportId}`);

    return {
      exportId,
      status: SUSBillingStatus.SUBMITTED,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ─── NOTIVISA ───────────────────────────────────────────────────────────────

  async createReport(tenantId: string, dto: NotivisaDto) {
    this.logger.log(`[NOTIVISA] Creating ${dto.type} report for patient ${dto.patientId}`);

    return {
      id: crypto.randomUUID(),
      tenantId,
      type: dto.type,
      patientId: dto.patientId,
      product: dto.product,
      severity: dto.severity,
      causality: dto.causality,
      status: NotivisaStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
  }

  async submitReport(tenantId: string, reportId: string) {
    this.logger.log(`[NOTIVISA] Submitting report ${reportId}`);

    // In production, this would call the NOTIVISA ANVISA web service
    return {
      reportId,
      status: NotivisaStatus.SUBMITTED,
      protocol: `NOTIVISA-${new Date().getFullYear()}-${reportId.slice(0, 8).toUpperCase()}`,
      submittedAt: new Date().toISOString(),
    };
  }

  async getReportStatus(tenantId: string, reportId: string) {
    this.logger.log(`[NOTIVISA] Checking status for report ${reportId}`);

    return {
      reportId,
      status: NotivisaStatus.SUBMITTED,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ─── SIM (Mortalidade) ─────────────────────────────────────────────────────

  async generateDeathCertificate(tenantId: string, dto: DeathCertificateDto) {
    this.logger.log(`[SIM] Generating death certificate for patient ${dto.patientId}`);

    const causeChainValid = this.validateCauseChain(dto.immediateCause, dto.antecedentCauses);

    return {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      dateOfDeath: dto.dateOfDeath,
      placeOfDeath: dto.placeOfDeath,
      immediateCause: dto.immediateCause,
      antecedentCauses: dto.antecedentCauses,
      contributingConditions: dto.contributingConditions ?? [],
      mannerOfDeath: dto.mannerOfDeath,
      autopsyPerformed: dto.autopsyPerformed,
      physician: dto.physician,
      municipality: dto.municipality,
      causeChainValid: causeChainValid.valid,
      causeChainWarnings: causeChainValid.warnings,
      doNumber: `DO-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Validates the death cause chain according to WHO/MS rules.
   *
   * Rules:
   * - Immediate cause (Part I, line a) is required
   * - Antecedent causes (lines b, c, d) should form a logical causal sequence
   * - Maximum of 4 causes in Part I (a + 3 antecedent)
   * - All codes must be valid CID-10 format
   */
  validateCauseChain(
    immediateCause: string,
    antecedentCauses: string[],
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const cidPattern = /^[A-Z]\d{2}(\.\d{1,2})?$/;

    if (!cidPattern.test(immediateCause)) {
      warnings.push(`Immediate cause "${immediateCause}" is not a valid CID-10 code`);
    }

    if (antecedentCauses.length > 3) {
      warnings.push('Part I should have at most 4 lines (1 immediate + 3 antecedent causes)');
    }

    for (const [index, cause] of antecedentCauses.entries()) {
      if (!cidPattern.test(cause)) {
        warnings.push(`Antecedent cause at position ${index + 1} ("${cause}") is not a valid CID-10 code`);
      }
    }

    // Check for ill-defined causes (R00-R99) as underlying cause
    const underlyingCause = antecedentCauses.length > 0
      ? antecedentCauses[antecedentCauses.length - 1]
      : immediateCause;

    if (/^R\d{2}/.test(underlyingCause)) {
      warnings.push(
        `Underlying cause "${underlyingCause}" is in Chapter XVIII (ill-defined causes). ` +
        'Consider specifying a more precise diagnosis.',
      );
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  // ─── SINASC (Nascidos Vivos) ───────────────────────────────────────────────

  async generateBirthCertificate(tenantId: string, dto: BirthCertificateDto) {
    this.logger.log(`[SINASC] Generating birth certificate for newborn ${dto.newbornId}`);

    const alerts: string[] = [];

    if (dto.birthWeight < 2500) {
      alerts.push('Low birth weight (< 2500g)');
    }
    if (dto.gestationalAge < 37) {
      alerts.push('Preterm birth (< 37 weeks)');
    }
    if (dto.apgar5 < 7) {
      alerts.push('Low Apgar at 5 minutes (< 7)');
    }
    if (dto.congenitalAnomalies && dto.congenitalAnomalies.length > 0) {
      alerts.push(`Congenital anomalies detected: ${dto.congenitalAnomalies.join(', ')}`);
    }
    if ((dto.numberOfPrenatalVisits ?? 0) < 6) {
      alerts.push('Inadequate prenatal care (< 6 visits)');
    }

    return {
      id: crypto.randomUUID(),
      tenantId,
      motherId: dto.motherId,
      newbornId: dto.newbornId,
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      gestationalAge: dto.gestationalAge,
      birthWeight: dto.birthWeight,
      apgar1: dto.apgar1,
      apgar5: dto.apgar5,
      deliveryType: dto.deliveryType,
      presentation: dto.presentation,
      birthPlace: dto.birthPlace,
      congenitalAnomalies: dto.congenitalAnomalies ?? [],
      numberOfPrenatalVisits: dto.numberOfPrenatalVisits ?? 0,
      physicianCRM: dto.physicianCRM,
      alerts,
      dnNumber: `DN-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
  }
}
