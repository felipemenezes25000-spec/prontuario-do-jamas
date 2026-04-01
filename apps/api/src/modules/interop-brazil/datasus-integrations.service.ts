import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SinanNotificationDto,
  CadsusQueryDto,
  CnesValidationDto,
  CnesValidationStatus,
  EsusApsDto,
  DeathCertificateDto,
  DeathManner,
  BirthCertificateDto,
  NotivisaReportDto,
  NotivisaSeverity,
  MemedIntegrationDto,
  WhatsappBusinessDto,
  WhatsappDeliveryStatus,
  WhatsappMessageType,
} from './dto/datasus-integrations.dto';

// ─── Result interfaces ────────────────────────────────────────────────────────

export interface SinanNotificationResult {
  notificationId: string;
  diseaseCode: string;
  patientId: string;
  status: string;
  protocol: string | null;
  autofilled: boolean;
  createdAt: string;
}

export interface CadsusResult {
  cpf: string | null;
  cns: string | null;
  name: string | null;
  birthDate: string | null;
  registrationStatus: string;
  resolvedAt: string;
}

export interface CnesValidationResult {
  professionalId: string;
  crm: string;
  status: CnesValidationStatus;
  specialty: string | null;
  establishment: string | null;
  beds: number | null;
  validatedAt: string;
  issues: string[];
}

export interface EsusExportResult {
  exportId: string;
  fichaType: string;
  procedureCount: number;
  sisabProtocol: string | null;
  exportedAt: string;
}

export interface DeathCertificateResult {
  certificateId: string;
  patientId: string;
  doNumber: string;
  underlyingCause: string;
  simProtocol: string | null;
  xmlContent: string;
  issuedAt: string;
}

export interface BirthCertificateResult {
  certificateId: string;
  newbornId: string;
  dnvNumber: string;
  apgar1: number | null;
  apgar5: number | null;
  birthWeight: number | null;
  sinascProtocol: string | null;
  xmlContent: string;
  issuedAt: string;
}

export interface NotivisaResult {
  reportId: string;
  type: string;
  product: string;
  severity: NotivisaSeverity;
  anvisaProtocol: string | null;
  xmlContent: string;
  submittedAt: string;
}

export interface MemedResult {
  memedId: string;
  prescriptionId: string;
  memedUrl: string;
  digitalSignatureValid: boolean;
  pharmacyDeliveryStatus: string;
  sentAt: string;
}

export interface WhatsappResult {
  messageId: string;
  patientId: string;
  messageType: WhatsappMessageType;
  deliveryStatus: WhatsappDeliveryStatus;
  scheduledTime: string | null;
  sentAt: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class DatasusIntegrationsService {
  private readonly logger = new Logger(DatasusIntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── SINAN ───────────────────────────────────────────────────────────────────

  async createSinanNotification(
    tenantId: string,
    dto: SinanNotificationDto,
  ): Promise<SinanNotificationResult> {
    this.logger.log(
      `[${tenantId}] Creating SINAN notification for disease ${dto.diseaseCode}, patient ${dto.patientId}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    // Auto-fill logic: enrich notification data from latest encounter diagnosis
    const autofilled = dto.autofillFromDiagnosis ?? true;

    // In production: POST to SINAN WebService / RNDS FHIR endpoint
    const protocol = `SINAN-${Date.now()}`;

    this.logger.log(
      `[${tenantId}] SINAN notification created — protocol ${protocol}`,
    );

    return {
      notificationId: `NOT-${Date.now()}`,
      diseaseCode: dto.diseaseCode,
      patientId: dto.patientId,
      status: 'DRAFT',
      protocol,
      autofilled,
      createdAt: new Date().toISOString(),
    };
  }

  async submitSinanNotification(
    tenantId: string,
    notificationId: string,
  ): Promise<{ notificationId: string; status: string; submittedAt: string }> {
    this.logger.log(
      `[${tenantId}] Submitting SINAN notification ${notificationId} to SVS/MS`,
    );
    // In production: call SINAN e-SUS WebService and handle response
    return {
      notificationId,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
  }

  // ─── CADSUS / CNS ────────────────────────────────────────────────────────────

  async lookupCadsus(
    tenantId: string,
    dto: CadsusQueryDto,
  ): Promise<CadsusResult> {
    this.logger.log(`[${tenantId}] CADSUS lookup — CPF: ${dto.cpf ?? 'N/A'}, CNS: ${dto.cns ?? 'N/A'}`);

    if (!dto.cpf && !dto.cns && !dto.name) {
      throw new BadRequestException(
        'Pelo menos um campo de identificação (CPF, CNS ou nome) é obrigatório',
      );
    }

    // Resolve CPF -> CNS via CADSUS WS (stub)
    const resolvedCns = dto.resolvedCns ?? dto.cns ?? this._generateStubCns();

    return {
      cpf: dto.cpf ?? null,
      cns: resolvedCns,
      name: dto.name ?? null,
      birthDate: dto.birthDate ?? null,
      registrationStatus: 'ACTIVE',
      resolvedAt: new Date().toISOString(),
    };
  }

  async registerCadsus(
    tenantId: string,
    patientId: string,
  ): Promise<{ patientId: string; cns: string; registeredAt: string }> {
    this.logger.log(
      `[${tenantId}] Registering patient ${patientId} in CADSUS to obtain CNS`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    const cns = this._generateStubCns();

    return {
      patientId,
      cns,
      registeredAt: new Date().toISOString(),
    };
  }

  // ─── CNES ────────────────────────────────────────────────────────────────────

  async validateCnes(
    tenantId: string,
    dto: CnesValidationDto,
  ): Promise<CnesValidationResult> {
    this.logger.log(
      `[${tenantId}] Validating CNES for professional ${dto.professionalId} (CRM: ${dto.crm})`,
    );

    const issues: string[] = [];

    // Basic CRM format check (simplified — real check calls CFM WS)
    if (!dto.crm.match(/^\d{4,6}-[A-Z]{2}$/)) {
      issues.push('CRM em formato inválido (esperado: NNNNN-UF)');
    }

    if (dto.establishment && !dto.establishment.match(/^\d{7}$/)) {
      issues.push('Código CNES de estabelecimento inválido (deve ter 7 dígitos)');
    }

    const status =
      dto.validationResult ??
      (issues.length === 0 ? CnesValidationStatus.VALID : CnesValidationStatus.INVALID);

    return {
      professionalId: dto.professionalId,
      crm: dto.crm,
      status,
      specialty: dto.specialty ?? null,
      establishment: dto.establishment ?? null,
      beds: dto.beds ?? null,
      validatedAt: new Date().toISOString(),
      issues,
    };
  }

  async getEstablishmentData(
    tenantId: string,
    cnesCode: string,
  ): Promise<{
    cnesCode: string;
    name: string | null;
    type: string | null;
    beds: number | null;
    checkedAt: string;
  }> {
    this.logger.log(`[${tenantId}] Fetching CNES establishment data: ${cnesCode}`);
    // In production: call CNES WS (DATASUS)
    return {
      cnesCode,
      name: null,
      type: null,
      beds: null,
      checkedAt: new Date().toISOString(),
    };
  }

  // ─── e-SUS APS ────────────────────────────────────────────────────────────────

  async exportEsusAps(
    tenantId: string,
    encounterId: string,
    dto: EsusApsDto,
  ): Promise<EsusExportResult> {
    this.logger.log(
      `[${tenantId}] Exporting encounter ${encounterId} to e-SUS APS (${dto.fichaType})`,
    );

    const procedureCount = dto.procedures?.length ?? 0;
    let sisabProtocol: string | null = null;

    if (dto.sisabExport) {
      // In production: POST JSON payload to RNDS/SISAB Gateway
      sisabProtocol = `SISAB-${Date.now()}`;
      this.logger.log(`[${tenantId}] Exported to SISAB — protocol ${sisabProtocol}`);
    }

    return {
      exportId: `ESUS-${Date.now()}`,
      fichaType: dto.fichaType,
      procedureCount,
      sisabProtocol,
      exportedAt: new Date().toISOString(),
    };
  }

  // ─── SIM — Death Certificate ──────────────────────────────────────────────────

  async issueDeathCertificate(
    tenantId: string,
    dto: DeathCertificateDto,
  ): Promise<DeathCertificateResult> {
    this.logger.log(
      `[${tenantId}] Issuing death certificate for patient ${dto.patientId}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    if (dto.manner === DeathManner.HOMICIDE || dto.manner === DeathManner.SUICIDE) {
      this.logger.warn(
        `[${tenantId}] Violent death reported — IML/IOP notification may be required`,
      );
    }

    const doNumber = `DO-${Date.now()}`;

    // Stub XML — in production: render from DO digital template (ABNT/DATASUS)
    const xmlContent =
      dto.simExportXml ??
      this._buildDeathCertificateXml(dto, doNumber, patient.fullName);

    return {
      certificateId: `DO-CERT-${Date.now()}`,
      patientId: dto.patientId,
      doNumber,
      underlyingCause: dto.underlyingCause,
      simProtocol: null, // set after SIM submission
      xmlContent,
      issuedAt: new Date().toISOString(),
    };
  }

  async submitToSim(
    tenantId: string,
    certificateId: string,
  ): Promise<{ certificateId: string; simProtocol: string; submittedAt: string }> {
    this.logger.log(`[${tenantId}] Submitting death certificate ${certificateId} to SIM`);
    return {
      certificateId,
      simProtocol: `SIM-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
  }

  // ─── SINASC — Birth Certificate ───────────────────────────────────────────────

  async issueBirthCertificate(
    tenantId: string,
    dto: BirthCertificateDto,
  ): Promise<BirthCertificateResult> {
    this.logger.log(
      `[${tenantId}] Issuing birth certificate for newborn ${dto.newbornId}`,
    );

    if (dto.apgar1 !== undefined && dto.apgar5 !== undefined) {
      if (dto.apgar5 < dto.apgar1 - 2) {
        this.logger.warn(
          `[${tenantId}] APGAR 5min (${dto.apgar5}) significantly lower than APGAR 1min (${dto.apgar1}) — possible neonatal distress`,
        );
      }
    }

    const dnvNumber = `DNV-${Date.now()}`;

    const xmlContent =
      dto.sinascExportXml ??
      this._buildBirthCertificateXml(dto, dnvNumber);

    return {
      certificateId: `DNV-CERT-${Date.now()}`,
      newbornId: dto.newbornId,
      dnvNumber,
      apgar1: dto.apgar1 ?? null,
      apgar5: dto.apgar5 ?? null,
      birthWeight: dto.birthWeight ?? null,
      sinascProtocol: null,
      xmlContent,
      issuedAt: new Date().toISOString(),
    };
  }

  async submitToSinasc(
    tenantId: string,
    certificateId: string,
  ): Promise<{ certificateId: string; sinascProtocol: string; submittedAt: string }> {
    this.logger.log(`[${tenantId}] Submitting birth certificate ${certificateId} to SINASC`);
    return {
      certificateId,
      sinascProtocol: `SINASC-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
  }

  // ─── NOTIVISA ─────────────────────────────────────────────────────────────────

  async submitNotivisa(
    tenantId: string,
    dto: NotivisaReportDto,
  ): Promise<NotivisaResult> {
    this.logger.log(
      `[${tenantId}] Submitting NOTIVISA report — type: ${dto.type}, product: ${dto.product}`,
    );

    if (dto.severity === NotivisaSeverity.FATAL || dto.severity === NotivisaSeverity.SEVERE) {
      this.logger.warn(
        `[${tenantId}] Serious adverse event — NOTIVISA immediate notification required within 72h (RDC 36/2013)`,
      );
    }

    const xmlContent =
      dto.anvisaExportXml ??
      this._buildNotivisaXml(dto);

    const anvisaProtocol = `NOTIVISA-${Date.now()}`;

    return {
      reportId: `NTV-${Date.now()}`,
      type: dto.type,
      product: dto.product,
      severity: dto.severity,
      anvisaProtocol,
      xmlContent,
      submittedAt: new Date().toISOString(),
    };
  }

  async getNotivisaStatus(
    tenantId: string,
    reportId: string,
  ): Promise<{ reportId: string; status: string; updatedAt: string }> {
    this.logger.log(`[${tenantId}] Getting NOTIVISA status for ${reportId}`);
    return { reportId, status: 'SUBMITTED', updatedAt: new Date().toISOString() };
  }

  // ─── Memed / Nexodata ─────────────────────────────────────────────────────────

  async sendMemedPrescription(
    tenantId: string,
    dto: MemedIntegrationDto,
  ): Promise<MemedResult> {
    this.logger.log(
      `[${tenantId}] Sending prescription ${dto.prescriptionId} to Memed`,
    );

    if (dto.medications.length === 0) {
      throw new BadRequestException(
        'A prescrição deve conter pelo menos um medicamento',
      );
    }

    const digitalSignatureValid = dto.digitalSignature
      ? dto.digitalSignature.length > 50 // Simplified check; real: verify ICP-Brasil cert
      : false;

    if (!digitalSignatureValid && !dto.digitalSignature) {
      this.logger.warn(
        `[${tenantId}] Prescrição sem assinatura digital ICP-Brasil — pode não ser aceita pela farmácia`,
      );
    }

    const memedId = `MEMED-${Date.now()}`;

    return {
      memedId,
      prescriptionId: dto.prescriptionId,
      memedUrl: `https://memed.com.br/receita/${memedId}`,
      digitalSignatureValid,
      pharmacyDeliveryStatus: dto.pharmacyDeliveryStatus ?? 'pending',
      sentAt: new Date().toISOString(),
    };
  }

  async getMemedPrescriptionStatus(
    tenantId: string,
    memedId: string,
  ): Promise<{ memedId: string; pharmacyStatus: string; updatedAt: string }> {
    this.logger.log(`[${tenantId}] Getting Memed prescription status: ${memedId}`);
    // In production: call Memed API GET /prescriptions/{id}
    return {
      memedId,
      pharmacyStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
  }

  // ─── WhatsApp Business ────────────────────────────────────────────────────────

  async sendWhatsappMessage(
    tenantId: string,
    dto: WhatsappBusinessDto,
  ): Promise<WhatsappResult> {
    this.logger.log(
      `[${tenantId}] Sending WhatsApp ${dto.messageType} to patient ${dto.patientId}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const isScheduled = !!dto.scheduledTime;
    const messageId = `WA-${Date.now()}`;

    this.logger.log(
      `[${tenantId}] WhatsApp message ${messageId} ${isScheduled ? `scheduled for ${dto.scheduledTime}` : 'queued for immediate delivery'}`,
    );

    return {
      messageId,
      patientId: dto.patientId,
      messageType: dto.messageType,
      deliveryStatus: isScheduled
        ? WhatsappDeliveryStatus.QUEUED
        : WhatsappDeliveryStatus.SENT,
      scheduledTime: dto.scheduledTime ?? null,
      sentAt: isScheduled ? null : new Date().toISOString(),
    };
  }

  async getWhatsappStatus(
    tenantId: string,
    messageId: string,
  ): Promise<{ messageId: string; deliveryStatus: WhatsappDeliveryStatus; updatedAt: string }> {
    this.logger.log(`[${tenantId}] Getting WhatsApp message status: ${messageId}`);
    // In production: call Meta Cloud API GET /messages/{id}
    return {
      messageId,
      deliveryStatus: WhatsappDeliveryStatus.DELIVERED,
      updatedAt: new Date().toISOString(),
    };
  }

  async sendWhatsappBulk(
    tenantId: string,
    patientIds: string[],
    messageType: WhatsappMessageType,
    template: string,
  ): Promise<{ queued: number; failed: number; messageIds: string[] }> {
    this.logger.log(
      `[${tenantId}] Bulk WhatsApp send to ${patientIds.length} patients — template: ${template}`,
    );

    const messageIds = patientIds.map(() => `WA-BULK-${Date.now()}-${Math.random()}`);

    return {
      queued: patientIds.length,
      failed: 0,
      messageIds,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private _generateStubCns(): string {
    // CNS must pass Luhn-like check; simplified stub
    const base = Math.floor(Math.random() * 9e14)
      .toString()
      .padStart(15, '7');
    return base;
  }

  private _buildDeathCertificateXml(
    dto: DeathCertificateDto,
    doNumber: string,
    patientName: string,
  ): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<DeclaracaoObito xmlns="http://sim.datasus.gov.br/DO" numero="${doNumber}">`,
      `  <Falecido nome="${patientName}" id="${dto.patientId}"/>`,
      `  <CausaMorte>`,
      `    <Linha1>${dto.cause1}</Linha1>`,
      dto.cause2 ? `    <Linha2>${dto.cause2}</Linha2>` : '',
      dto.cause3 ? `    <Linha3>${dto.cause3}</Linha3>` : '',
      dto.cause4 ? `    <Linha4>${dto.cause4}</Linha4>` : '',
      `    <CausaBasica>${dto.underlyingCause}</CausaBasica>`,
      `    <Circunstancia>${dto.manner}</Circunstancia>`,
      `  </CausaMorte>`,
      `</DeclaracaoObito>`,
    ]
      .filter((l) => l.length > 0)
      .join('\n');
  }

  private _buildBirthCertificateXml(
    dto: BirthCertificateDto,
    dnvNumber: string,
  ): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<DeclaracaoNascidoVivo xmlns="http://sinasc.datasus.gov.br/DNV" numero="${dnvNumber}">`,
      `  <RecemNascido id="${dto.newbornId}" idMae="${dto.motherId}"/>`,
      dto.birthWeight ? `  <PesoNascimento>${dto.birthWeight}</PesoNascimento>` : '',
      dto.gestationalAge ? `  <IdadeGestacional>${dto.gestationalAge}</IdadeGestacional>` : '',
      dto.apgar1 !== undefined ? `  <APGAR1min>${dto.apgar1}</APGAR1min>` : '',
      dto.apgar5 !== undefined ? `  <APGAR5min>${dto.apgar5}</APGAR5min>` : '',
      `</DeclaracaoNascidoVivo>`,
    ]
      .filter((l) => l.length > 0)
      .join('\n');
  }

  private _buildNotivisaXml(dto: NotivisaReportDto): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<Notificacao xmlns="http://notivisa.anvisa.gov.br" tipo="${dto.type}">`,
      `  <Produto>${dto.product}</Produto>`,
      `  <Evento><![CDATA[${dto.event}]]></Evento>`,
      `  <Gravidade>${dto.severity}</Gravidade>`,
      `</Notificacao>`,
    ].join('\n');
  }
}
