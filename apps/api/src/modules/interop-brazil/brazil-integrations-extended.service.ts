import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ESusAttendanceDto,
  ESusExportDto,
  ESusExportStatus,
  ESusFichaType,
  WhatsAppMessageDto,
  WhatsAppMessageStatus,
  WhatsAppMessageDirection,
  WhatsAppBotCommand,
  WhatsAppBotCommandDto,
  WhatsAppTemplateName,
  EprescribingDto,
  EprescribingProvider,
  EprescribingStatus,
  type EprescribingResultDto,
  HealthKitSyncDto,
  HealthKitDataDto,
  HealthDataSource,
  HealthDataType,
  type HealthKitReadingDto,
} from './dto/brazil-integrations-extended.dto';

// ─── In-memory stores (production: Prisma models / external APIs) ────────────

export interface StoredFicha {
  id: string;
  tenantId: string;
  fichaType: ESusFichaType;
  attendance: ESusAttendanceDto;
  valid: boolean;
  validationErrors: string[];
  createdAt: string;
}

export interface StoredExport {
  id: string;
  tenantId: string;
  competence: string;
  fichaCount: number;
  format: string;
  status: ESusExportStatus;
  createdAt: string;
}

export interface StoredWhatsAppMessage {
  id: string;
  tenantId: string;
  patientId: string;
  phoneNumber: string;
  direction: WhatsAppMessageDirection;
  content: string;
  templateName: WhatsAppTemplateName | null;
  status: WhatsAppMessageStatus;
  scheduledAt: string | null;
  sentAt: string;
}

export interface StoredEprescription {
  id: string;
  tenantId: string;
  patientId: string;
  prescriptionId: string;
  provider: EprescribingProvider;
  externalId: string;
  prescriptionUrl: string;
  qrCode: string;
  validUntil: string;
  status: EprescribingStatus;
  createdAt: string;
}

export interface StoredHealthSync {
  id: string;
  tenantId: string;
  patientId: string;
  source: HealthDataSource;
  dataTypes: HealthDataType[];
  enabled: boolean;
  lastSyncAt: string | null;
}

export interface StoredHealthReading {
  id: string;
  tenantId: string;
  patientId: string;
  source: HealthDataSource;
  type: HealthDataType;
  value: number;
  unit: string;
  timestamp: string;
  metadata: Record<string, string>;
}

@Injectable()
export class BrazilIntegrationsExtendedService {
  private readonly logger = new Logger(BrazilIntegrationsExtendedService.name);

  private fichas: StoredFicha[] = [];
  private exports: StoredExport[] = [];
  private whatsappMessages: StoredWhatsAppMessage[] = [];
  private eprescriptions: StoredEprescription[] = [];
  private healthSyncs: StoredHealthSync[] = [];
  private healthReadings: StoredHealthReading[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // e-SUS APS
  // ═══════════════════════════════════════════════════════════════════════════

  async generateFicha(tenantId: string, dto: ESusAttendanceDto): Promise<StoredFicha> {
    this.logger.log(`[e-SUS] Generating ficha ${dto.fichaType} for CNS ${dto.patientCNS.slice(0, 5)}***`);

    const validation = this.validateFichaData(dto);

    const ficha: StoredFicha = {
      id: crypto.randomUUID(),
      tenantId,
      fichaType: dto.fichaType,
      attendance: dto,
      valid: validation.valid,
      validationErrors: validation.errors,
      createdAt: new Date().toISOString(),
    };

    this.fichas.push(ficha);
    return ficha;
  }

  validateFicha(dto: ESusAttendanceDto): { valid: boolean; errors: string[] } {
    return this.validateFichaData(dto);
  }

  async exportToSISAB(tenantId: string, dto: ESusExportDto): Promise<StoredExport> {
    this.logger.log(`[e-SUS] Exporting ${dto.fichas.length} fichas to SISAB for competence ${dto.competence}`);

    const fichasToExport = this.fichas.filter(
      (f) => f.tenantId === tenantId && dto.fichas.includes(f.id),
    );

    const invalidFichas = fichasToExport.filter((f) => !f.valid);
    if (invalidFichas.length > 0) {
      throw new BadRequestException(
        `Cannot export: ${invalidFichas.length} ficha(s) have validation errors`,
      );
    }

    const exportRecord: StoredExport = {
      id: crypto.randomUUID(),
      tenantId,
      competence: dto.competence,
      fichaCount: fichasToExport.length,
      format: dto.format,
      status: ESusExportStatus.EXPORTED,
      createdAt: new Date().toISOString(),
    };

    this.exports.push(exportRecord);

    // In production: generate Thrift/JSON payload and call SISAB web service
    return exportRecord;
  }

  getExportStatus(tenantId: string, exportId: string): StoredExport {
    const record = this.exports.find((e) => e.id === exportId && e.tenantId === tenantId);
    if (!record) {
      throw new NotFoundException(`Export ${exportId} not found`);
    }
    return record;
  }

  private validateFichaData(dto: ESusAttendanceDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!/^\d{15}$/.test(dto.patientCNS)) {
      errors.push('Patient CNS must be exactly 15 digits');
    }
    if (!/^\d{15}$/.test(dto.professionalCNS)) {
      errors.push('Professional CNS must be exactly 15 digits');
    }
    if (!dto.procedureCode || dto.procedureCode.trim().length === 0) {
      errors.push('Procedure code is required');
    }
    if (!dto.cboCode || dto.cboCode.trim().length === 0) {
      errors.push('CBO code is required');
    }
    if (dto.diagnoses.length === 0) {
      errors.push('At least one diagnosis (CID-10) is required');
    }

    return { valid: errors.length === 0, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhatsApp Business API
  // ═══════════════════════════════════════════════════════════════════════════

  async sendTemplateMessage(
    tenantId: string,
    dto: WhatsAppMessageDto,
  ): Promise<StoredWhatsAppMessage> {
    this.logger.log(
      `[WhatsApp] Sending ${dto.templateName} to patient ${dto.patientId}`,
    );

    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const templateContent = this.renderTemplate(dto.templateName, dto.templateParams);

    const message: StoredWhatsAppMessage = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      phoneNumber: dto.phoneNumber,
      direction: WhatsAppMessageDirection.OUTBOUND,
      content: templateContent,
      templateName: dto.templateName,
      status: dto.scheduledAt ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.SENT,
      scheduledAt: dto.scheduledAt ?? null,
      sentAt: new Date().toISOString(),
    };

    this.whatsappMessages.push(message);

    // In production: call WhatsApp Business API via Meta Cloud API
    return message;
  }

  async processInboundMessage(
    tenantId: string,
    patientId: string,
    phoneNumber: string,
    content: string,
  ): Promise<StoredWhatsAppMessage> {
    this.logger.log(`[WhatsApp] Inbound message from ${phoneNumber.slice(0, 6)}***`);

    const message: StoredWhatsAppMessage = {
      id: crypto.randomUUID(),
      tenantId,
      patientId,
      phoneNumber,
      direction: WhatsAppMessageDirection.INBOUND,
      content,
      templateName: null,
      status: WhatsAppMessageStatus.DELIVERED,
      scheduledAt: null,
      sentAt: new Date().toISOString(),
    };

    this.whatsappMessages.push(message);
    return message;
  }

  handleBotCommand(
    tenantId: string,
    dto: WhatsAppBotCommandDto,
  ): { command: WhatsAppBotCommand; response: string; actionRequired: boolean; actionType: string | null } {
    this.logger.log(`[WhatsApp Bot] Command ${dto.command} from patient ${dto.patientId}`);

    const responses: Record<WhatsAppBotCommand, { response: string; actionRequired: boolean; actionType: string | null }> = {
      [WhatsAppBotCommand.AGENDAR]: {
        response:
          'Para agendar uma consulta, por favor informe:\n' +
          '1. Especialidade desejada\n' +
          '2. Data preferida\n' +
          '3. Turno (manhã/tarde)\n\n' +
          'Ou digite *FALAR_ATENDENTE* para falar com nossa equipe.',
        actionRequired: true,
        actionType: 'SCHEDULE_APPOINTMENT',
      },
      [WhatsAppBotCommand.CANCELAR]: {
        response:
          'Para cancelar sua consulta, confirme o cancelamento respondendo *SIM*.\n' +
          'Caso queira reagendar, digite *AGENDAR*.',
        actionRequired: true,
        actionType: 'CANCEL_APPOINTMENT',
      },
      [WhatsAppBotCommand.RESULTADOS]: {
        response:
          'Seus resultados de exames estão sendo consultados. ' +
          'Você receberá uma notificação quando estiverem disponíveis.\n\n' +
          'Para resultados já liberados, acesse o Portal do Paciente.',
        actionRequired: false,
        actionType: 'CHECK_LAB_RESULTS',
      },
      [WhatsAppBotCommand.RECEITA]: {
        response:
          'Para acessar sua receita digital, utilize o QR Code enviado ' +
          'anteriormente ou acesse o Portal do Paciente.\n\n' +
          'Se precisar de uma nova via, digite *FALAR_ATENDENTE*.',
        actionRequired: false,
        actionType: 'GET_PRESCRIPTION',
      },
      [WhatsAppBotCommand.FALAR_ATENDENTE]: {
        response:
          'Transferindo você para um atendente. ' +
          'Aguarde, por favor. Tempo estimado: 2 minutos.',
        actionRequired: true,
        actionType: 'TRANSFER_TO_AGENT',
      },
    };

    return {
      command: dto.command,
      ...responses[dto.command],
    };
  }

  getConversationHistory(
    tenantId: string,
    patientId: string,
    limit = 50,
  ): StoredWhatsAppMessage[] {
    return this.whatsappMessages
      .filter((m) => m.tenantId === tenantId && m.patientId === patientId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  async scheduleReminder(
    tenantId: string,
    dto: WhatsAppMessageDto,
  ): Promise<StoredWhatsAppMessage> {
    if (!dto.scheduledAt) {
      throw new BadRequestException('scheduledAt is required for scheduled reminders');
    }

    this.logger.log(
      `[WhatsApp] Scheduling ${dto.templateName} for patient ${dto.patientId} at ${dto.scheduledAt}`,
    );

    return this.sendTemplateMessage(tenantId, dto);
  }

  private renderTemplate(
    templateName: WhatsAppTemplateName,
    params: Record<string, string>,
  ): string {
    const templates: Record<WhatsAppTemplateName, string> = {
      [WhatsAppTemplateName.APPOINTMENT_REMINDER]:
        `Olá {{patientName}}! Lembramos que sua consulta com {{doctorName}} está marcada para {{date}} às {{time}}. Confirme respondendo SIM ou cancele respondendo NAO.`,
      [WhatsAppTemplateName.APPOINTMENT_CONFIRMATION]:
        `Consulta confirmada! {{patientName}}, sua consulta com {{doctorName}} em {{date}} às {{time}} foi confirmada.`,
      [WhatsAppTemplateName.LAB_RESULTS_READY]:
        `{{patientName}}, seus resultados de exames estão disponíveis. Acesse o Portal do Paciente ou retire na recepção.`,
      [WhatsAppTemplateName.PRESCRIPTION_READY]:
        `{{patientName}}, sua receita digital está pronta. Apresente o QR Code na farmácia.`,
      [WhatsAppTemplateName.VACCINATION_REMINDER]:
        `{{patientName}}, sua vacina {{vaccineName}} está prevista para {{date}}. Compareça ao posto de vacinação.`,
      [WhatsAppTemplateName.FOLLOW_UP]:
        `{{patientName}}, como está se sentindo? Seu retorno está previsto para {{date}}. Agende pelo portal ou responda AGENDAR.`,
      [WhatsAppTemplateName.PAYMENT_DUE]:
        `{{patientName}}, informamos que há um valor pendente de R$ {{amount}}. Para mais detalhes, acesse o portal.`,
      [WhatsAppTemplateName.CUSTOM]:
        params['message'] ?? '',
    };

    let text = templates[templateName];
    for (const [key, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return text;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Memed / Nexodata e-Prescribing
  // ═══════════════════════════════════════════════════════════════════════════

  async createEprescription(
    tenantId: string,
    dto: EprescribingDto,
  ): Promise<EprescribingResultDto> {
    this.logger.log(
      `[e-Prescribing] Creating via ${dto.provider} for patient ${dto.patientId}, CRM ${dto.prescriberId}`,
    );

    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    if (dto.medications.length === 0) {
      throw new BadRequestException('At least one medication is required');
    }

    // In production: call Memed or Nexodata API
    const externalId = `${dto.provider}-${crypto.randomUUID().slice(0, 12)}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // 30-day validity

    const qrPayload = Buffer.from(
      JSON.stringify({ provider: dto.provider, id: externalId, prescriber: dto.prescriberId }),
    ).toString('base64');

    const record: StoredEprescription = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      prescriptionId: dto.prescriptionId,
      provider: dto.provider,
      externalId,
      prescriptionUrl: `https://${dto.provider.toLowerCase()}.com.br/prescription/${externalId}`,
      qrCode: qrPayload,
      validUntil: validUntil.toISOString(),
      status: EprescribingStatus.CREATED,
      createdAt: new Date().toISOString(),
    };

    this.eprescriptions.push(record);

    return {
      externalId: record.externalId,
      prescriptionUrl: record.prescriptionUrl,
      qrCode: record.qrCode,
      validUntil: record.validUntil,
      status: record.status,
    };
  }

  getEprescriptionStatus(
    tenantId: string,
    externalId: string,
  ): EprescribingResultDto {
    const record = this.eprescriptions.find(
      (e) => e.tenantId === tenantId && e.externalId === externalId,
    );
    if (!record) {
      throw new NotFoundException(`E-prescription ${externalId} not found`);
    }

    // Check expiration
    const isExpired = new Date(record.validUntil) < new Date();
    const status = isExpired ? EprescribingStatus.EXPIRED : record.status;

    return {
      externalId: record.externalId,
      prescriptionUrl: record.prescriptionUrl,
      qrCode: record.qrCode,
      validUntil: record.validUntil,
      status,
    };
  }

  cancelEprescription(
    tenantId: string,
    externalId: string,
  ): { externalId: string; status: EprescribingStatus; cancelledAt: string } {
    const record = this.eprescriptions.find(
      (e) => e.tenantId === tenantId && e.externalId === externalId,
    );
    if (!record) {
      throw new NotFoundException(`E-prescription ${externalId} not found`);
    }

    if (record.status === EprescribingStatus.DISPENSED) {
      throw new BadRequestException('Cannot cancel a dispensed prescription');
    }

    record.status = EprescribingStatus.EXPIRED;

    // In production: call Memed/Nexodata cancellation API
    return {
      externalId: record.externalId,
      status: record.status,
      cancelledAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Apple Health / Google Fit / Wearable Integration
  // ═══════════════════════════════════════════════════════════════════════════

  async processHealthData(
    tenantId: string,
    dto: HealthKitDataDto,
  ): Promise<{ processedCount: number; alerts: string[] }> {
    this.logger.log(
      `[HealthKit] Processing ${dto.readings.length} readings from ${dto.source} for patient ${dto.patientId}`,
    );

    const alerts: string[] = [];
    let processedCount = 0;

    for (const reading of dto.readings) {
      const storedReading: StoredHealthReading = {
        id: crypto.randomUUID(),
        tenantId,
        patientId: dto.patientId,
        source: dto.source,
        type: reading.type,
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp,
        metadata: reading.metadata ?? {},
      };

      this.healthReadings.push(storedReading);
      processedCount++;

      // Check for clinically significant values
      const alert = this.checkReadingAlert(reading);
      if (alert) {
        alerts.push(alert);
      }
    }

    // Update sync timestamp
    const sync = this.healthSyncs.find(
      (s) => s.tenantId === tenantId && s.patientId === dto.patientId && s.source === dto.source,
    );
    if (sync) {
      sync.lastSyncAt = dto.syncTimestamp;
    }

    return { processedCount, alerts };
  }

  getPatientHealthData(
    tenantId: string,
    patientId: string,
    dataType?: HealthDataType,
    source?: HealthDataSource,
    startDate?: string,
    endDate?: string,
  ): StoredHealthReading[] {
    let readings = this.healthReadings.filter(
      (r) => r.tenantId === tenantId && r.patientId === patientId,
    );

    if (dataType) {
      readings = readings.filter((r) => r.type === dataType);
    }
    if (source) {
      readings = readings.filter((r) => r.source === source);
    }
    if (startDate) {
      readings = readings.filter((r) => r.timestamp >= startDate);
    }
    if (endDate) {
      readings = readings.filter((r) => r.timestamp <= endDate);
    }

    return readings.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  configureSync(
    tenantId: string,
    dto: HealthKitSyncDto,
  ): StoredHealthSync {
    this.logger.log(
      `[HealthKit] Configuring sync for patient ${dto.patientId}, source ${dto.source}`,
    );

    const existing = this.healthSyncs.find(
      (s) => s.tenantId === tenantId && s.patientId === dto.patientId && s.source === dto.source,
    );

    if (existing) {
      existing.dataTypes = dto.dataTypes;
      existing.enabled = true;
      return existing;
    }

    const sync: StoredHealthSync = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      source: dto.source,
      dataTypes: dto.dataTypes,
      enabled: true,
      lastSyncAt: null,
    };

    this.healthSyncs.push(sync);
    return sync;
  }

  getLatestReadings(
    tenantId: string,
    patientId: string,
  ): Record<string, StoredHealthReading | null> {
    const result: Record<string, StoredHealthReading | null> = {};

    for (const type of Object.values(HealthDataType)) {
      const readings = this.healthReadings
        .filter(
          (r) => r.tenantId === tenantId && r.patientId === patientId && r.type === type,
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      result[type] = readings.length > 0 ? readings[0] : null;
    }

    return result;
  }

  private checkReadingAlert(reading: HealthKitReadingDto): string | null {
    switch (reading.type) {
      case HealthDataType.HEART_RATE:
        if (reading.value > 120) return `Taquicardia detectada: ${reading.value} bpm`;
        if (reading.value < 50) return `Bradicardia detectada: ${reading.value} bpm`;
        break;
      case HealthDataType.BLOOD_GLUCOSE:
        if (reading.value > 250) return `Hiperglicemia severa: ${reading.value} mg/dL`;
        if (reading.value < 70) return `Hipoglicemia: ${reading.value} mg/dL`;
        break;
      case HealthDataType.SPO2:
        if (reading.value < 92) return `SpO2 baixa: ${reading.value}%`;
        break;
      case HealthDataType.TEMPERATURE:
        if (reading.value > 38.5) return `Febre: ${reading.value}°C`;
        if (reading.value < 35) return `Hipotermia: ${reading.value}°C`;
        break;
      default:
        break;
    }
    return null;
  }
}
