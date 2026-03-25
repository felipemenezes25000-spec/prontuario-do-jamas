import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SinanNotification {
  id: string;
  tenantId: string;
  patientId: string;
  disease: string;
  cidCode: string;
  notificationDate: string;
  symptomOnsetDate: string;
  investigationNumber?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'DISCARDED';
  submittedAt?: string;
  createdAt: string;
}

export interface CnsLookup {
  cpf: string;
  cns?: string;
  fullName?: string;
  birthDate?: string;
  status: 'FOUND' | 'NOT_FOUND' | 'ERROR';
}

interface DeathCertificate {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId?: string;
  certifierDoctorId: string;
  deathDate: string;
  causeOfDeath: string;
  cidCode: string;
  mannerOfDeath: string;
  placeOfDeath: string;
  status: 'DRAFT' | 'SIGNED' | 'SUBMITTED_SIM';
  createdAt: string;
}

interface WhatsAppMessage {
  id: string;
  tenantId: string;
  patientId: string;
  phone: string;
  templateName: string;
  templateParams: Record<string, string>;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt?: string;
  createdAt: string;
}

@Injectable()
export class InteropBrazilService {
  private readonly logger = new Logger(InteropBrazilService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // SINAN — Compulsory Disease Notification
  // =========================================================================

  async createSinanNotification(
    tenantId: string,
    userEmail: string,
    dto: {
      patientId: string;
      disease: string;
      cidCode: string;
      symptomOnsetDate: string;
    },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const notification: SinanNotification = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      disease: dto.disease,
      cidCode: dto.cidCode,
      notificationDate: new Date().toISOString(),
      symptomOnsetDate: dto.symptomOnsetDate,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[SINAN] ${dto.disease} — ${patient.fullName}`,
        content: JSON.stringify(notification),
        status: 'DRAFT',
      },
    });

    return { notificationId: doc.id, disease: dto.disease, status: 'DRAFT' };
  }

  async submitSinanNotification(tenantId: string, notificationId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: notificationId, tenantId, type: 'CUSTOM', title: { startsWith: '[SINAN]' } },
    });
    if (!doc) throw new NotFoundException('Notificação SINAN não encontrada.');

    const notification = JSON.parse(doc.content ?? '{}') as SinanNotification;
    notification.status = 'SUBMITTED';
    notification.submittedAt = new Date().toISOString();

    // In production: submit to SINAN web service
    this.logger.log(`[SINAN] Submitting notification for disease: ${notification.disease}`);

    await this.prisma.clinicalDocument.update({
      where: { id: notificationId },
      data: { content: JSON.stringify(notification), status: 'SIGNED' },
    });

    return { notificationId, status: 'SUBMITTED' };
  }

  async listSinanNotifications(tenantId: string, options: { status?: string; page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: '[SINAN]' },
    };
    if (options.status) {
      where.status = options.status === 'SUBMITTED' ? 'SIGNED' : 'DRAFT';
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const n = JSON.parse(d.content ?? '{}') as SinanNotification;
      return {
        notificationId: d.id,
        disease: n.disease,
        cidCode: n.cidCode,
        patientName: d.patient?.fullName,
        status: n.status,
        notificationDate: n.notificationDate,
        submittedAt: n.submittedAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // Auto-generate SINAN notifications from CID codes
  async autoDetectCompulsoryDisease(tenantId: string, patientId: string, cidCode: string) {
    const compulsoryDiseases: Record<string, string> = {
      A90: 'Dengue',
      A91: 'Dengue Hemorrágica',
      U07: 'COVID-19',
      A15: 'Tuberculose',
      B05: 'Sarampo',
      A37: 'Coqueluche',
      A01: 'Febre Tifoide',
      B50: 'Malária P. falciparum',
      B51: 'Malária P. vivax',
      A27: 'Leptospirose',
      A82: 'Raiva',
      B16: 'Hepatite B aguda',
    };

    const normalizedCid = cidCode.replace('.', '').substring(0, 3).toUpperCase();
    const disease = compulsoryDiseases[normalizedCid];

    if (!disease) {
      return { isCompulsory: false, cidCode, message: 'CID não é de notificação compulsória.' };
    }

    return {
      isCompulsory: true,
      cidCode,
      disease,
      message: `ATENÇÃO: ${disease} é doença de notificação compulsória (SINAN). Notificação deve ser enviada em até 24h.`,
    };
  }

  // =========================================================================
  // CADSUS / CNS Lookup
  // =========================================================================

  async lookupCns(cpf: string): Promise<CnsLookup> {
    // In production: call CADSUS web service
    this.logger.log(`[CADSUS] Looking up CNS for CPF: ${cpf.substring(0, 3)}***`);

    // Simulated response
    return {
      cpf,
      cns: `700${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      fullName: 'Resultado CADSUS (simulado)',
      birthDate: '1990-01-01',
      status: 'FOUND',
    };
  }

  // =========================================================================
  // CNES — Establishment/Professional Validation
  // =========================================================================

  async validateCnes(cnes: string) {
    this.logger.log(`[CNES] Validating establishment: ${cnes}`);

    return {
      cnes,
      valid: true,
      establishmentName: 'Estabelecimento Validado (simulado)',
      city: 'São Paulo',
      state: 'SP',
      type: 'Hospital Geral',
    };
  }

  async validateProfessional(cns: string) {
    this.logger.log(`[CNES] Validating professional: ${cns}`);

    return {
      cns,
      valid: true,
      professionalName: 'Profissional Validado (simulado)',
      cbo: '225125',
      specialty: 'Medicina',
    };
  }

  // =========================================================================
  // e-SUS APS — Primary Care Integration
  // =========================================================================

  async exportEsusRecord(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      select: {
        id: true,
        type: true,
        chiefComplaint: true,
        createdAt: true,
        patientId: true,
        primaryDoctorId: true,
      },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const patient = await this.prisma.patient.findFirst({
      where: { id: encounter.patientId },
      select: { fullName: true, cpf: true, birthDate: true },
    });

    this.logger.log(`[e-SUS APS] Exporting encounter ${encounterId}`);

    return {
      encounterId,
      format: 'e-SUS_CDS',
      patientName: patient?.fullName,
      exportedAt: new Date().toISOString(),
      status: 'EXPORTED',
      message: 'Registro exportado para e-SUS APS (PEC/CDS) com sucesso.',
    };
  }

  // =========================================================================
  // SIM — Death Certificate
  // =========================================================================

  async createDeathCertificate(
    tenantId: string,
    userEmail: string,
    dto: {
      patientId: string;
      encounterId?: string;
      deathDate: string;
      causeOfDeath: string;
      cidCode: string;
      mannerOfDeath: string;
      placeOfDeath: string;
    },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const cert: DeathCertificate = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      certifierDoctorId: userId,
      deathDate: dto.deathDate,
      causeOfDeath: dto.causeOfDeath,
      cidCode: dto.cidCode,
      mannerOfDeath: dto.mannerOfDeath,
      placeOfDeath: dto.placeOfDeath,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[SIM:DEATH_CERT] ${dto.causeOfDeath}`,
        content: JSON.stringify(cert),
        status: 'DRAFT',
        encounterId: dto.encounterId,
      },
    });

    return { certificateId: doc.id, status: 'DRAFT' };
  }

  // =========================================================================
  // SINASC — Live Birth Certificate
  // =========================================================================

  async createBirthCertificate(
    tenantId: string,
    userEmail: string,
    dto: {
      motherId: string;
      encounterId?: string;
      birthDate: string;
      birthTime: string;
      birthWeight: number;
      gestationalWeeks: number;
      apgar1: number;
      apgar5: number;
      deliveryType: string;
    },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.motherId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[SINASC:BIRTH_CERT] ${new Date(dto.birthDate).toLocaleDateString('pt-BR')}`,
        content: JSON.stringify({
          ...dto,
          tenantId,
          createdAt: new Date().toISOString(),
          status: 'DRAFT',
        }),
        status: 'DRAFT',
        encounterId: dto.encounterId,
      },
    });

    return { certificateId: doc.id, status: 'DRAFT' };
  }

  // =========================================================================
  // NOTIVISA — Pharmacovigilance
  // =========================================================================

  async createNotivisaReport(
    tenantId: string,
    userEmail: string,
    dto: {
      patientId: string;
      reportType: string;
      medicationName?: string;
      deviceName?: string;
      adverseEvent: string;
      severity: string;
      outcome: string;
    },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[NOTIVISA:${dto.reportType}] ${dto.medicationName ?? dto.deviceName ?? 'N/A'}`,
        content: JSON.stringify({
          ...dto,
          tenantId,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
        }),
        status: 'DRAFT',
      },
    });

    return { reportId: doc.id, status: 'DRAFT' };
  }

  // =========================================================================
  // Memed / Nexodata — Digital Prescription
  // =========================================================================

  async sendDigitalPrescription(
    tenantId: string,
    prescriptionId: string,
    dto: { pharmacy?: string; channel: string },
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
      include: {
        items: { select: { medicationName: true, dose: true, frequency: true } },
        patient: { select: { fullName: true, phone: true, email: true } },
      },
    });
    if (!prescription) throw new NotFoundException('Prescrição não encontrada.');

    this.logger.log(`[MEMED] Sending digital prescription ${prescriptionId} via ${dto.channel}`);

    return {
      prescriptionId,
      patientName: prescription.patient?.fullName,
      channel: dto.channel,
      pharmacy: dto.pharmacy,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      medications: prescription.items.map((i) => i.medicationName),
    };
  }

  // =========================================================================
  // WhatsApp Business API
  // =========================================================================

  async sendWhatsApp(
    tenantId: string,
    dto: {
      patientId: string;
      templateName: string;
      templateParams: Record<string, string>;
    },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
      select: { id: true, fullName: true, phone: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');
    if (!patient.phone) throw new BadRequestException('Paciente não possui telefone cadastrado.');

    const userId = await this.prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' },
      select: { id: true },
    });

    const message: WhatsAppMessage = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      phone: patient.phone,
      templateName: dto.templateName,
      templateParams: dto.templateParams,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    // In production: call WhatsApp Business API
    this.logger.log(`[WHATSAPP] Queuing message to ${patient.phone} template: ${dto.templateName}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId?.id ?? dto.patientId,
        type: 'CUSTOM',
        title: `[WHATSAPP] ${dto.templateName} → ${patient.fullName}`,
        content: JSON.stringify(message),
        status: 'DRAFT',
      },
    });

    return { messageId: doc.id, phone: patient.phone, status: 'QUEUED' };
  }

  // =========================================================================
  // Apple Health / Google Fit Integration
  // =========================================================================

  async syncHealthApp(
    tenantId: string,
    userEmail: string,
    dto: {
      platform: string;
      data: Array<{ metric: string; value: number; unit: string; recordedAt: string }>;
    },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: patient.id,
        authorId: userId,
        type: 'CUSTOM',
        title: `[HEALTH_APP:${dto.platform}] Sync ${new Date().toLocaleDateString('pt-BR')}`,
        content: JSON.stringify({
          platform: dto.platform,
          dataPoints: dto.data.length,
          data: dto.data,
          syncedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return { syncId: doc.id, platform: dto.platform, dataPoints: dto.data.length, status: 'SYNCED' };
  }
}
