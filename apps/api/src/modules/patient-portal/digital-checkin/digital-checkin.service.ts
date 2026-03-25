import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCheckinDto, SubmitAnamnesisDto, SubmitConsentDto } from './digital-checkin.dto';

interface CheckinRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  tenantId: string;
  status: string;
  confirmedAddress?: string;
  confirmedPhone?: string;
  insuranceCardPhoto?: string;
  geolocation?: string;
  anamnesis?: Record<string, unknown>;
  consents: Array<{ consentType: string; accepted: boolean; acceptedAt: string; ipAddress?: string }>;
  checkedInAt: string;
  completedAt?: string;
}

@Injectable()
export class DigitalCheckinService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(tenantId: string, userEmail: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException('Nenhum registro de paciente vinculado a esta conta.');
    }
    return patient.id;
  }

  async createCheckin(tenantId: string, userEmail: string, dto: CreateCheckinDto) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: dto.appointmentId, tenantId, patientId, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado ou já foi realizado.');
    }

    // Store checkin as a JSON clinical document
    const checkinData: CheckinRecord = {
      id: crypto.randomUUID(),
      appointmentId: dto.appointmentId,
      patientId,
      tenantId,
      status: 'CHECKED_IN',
      confirmedAddress: dto.confirmedAddress,
      confirmedPhone: dto.confirmedPhone,
      insuranceCardPhoto: dto.insuranceCardPhoto,
      geolocation: dto.geolocation,
      consents: [],
      checkedInAt: new Date().toISOString(),
    };

    const document = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        encounterId: appointment.encounterId,
        authorId: (await this.prisma.user.findFirst({ where: { tenantId, email: userEmail }, select: { id: true } }))!.id,
        type: 'CUSTOM',
        title: `Check-in Digital — ${new Date().toLocaleDateString('pt-BR')}`,
        content: JSON.stringify(checkinData),
        status: 'DRAFT',
      },
    });

    // Update appointment status
    await this.prisma.appointment.update({
      where: { id: dto.appointmentId },
      data: { status: 'WAITING' },
    });

    return { checkinId: document.id, status: 'CHECKED_IN', appointmentId: dto.appointmentId };
  }

  async submitAnamnesis(tenantId: string, userEmail: string, checkinId: string, dto: SubmitAnamnesisDto) {
    await this.resolvePatientId(tenantId, userEmail);

    const document = await this.prisma.clinicalDocument.findFirst({
      where: { id: checkinId, tenantId },
    });
    if (!document) {
      throw new NotFoundException('Check-in não encontrado.');
    }

    const checkinData = JSON.parse(document.content ?? '{}') as CheckinRecord;
    checkinData.anamnesis = {
      chiefComplaint: dto.chiefComplaint,
      symptomsDuration: dto.symptomsDuration,
      currentMedications: dto.currentMedications,
      recentChanges: dto.recentChanges,
      ...dto.additionalData,
      submittedAt: new Date().toISOString(),
    };
    checkinData.status = 'ANAMNESIS_COMPLETED';

    await this.prisma.clinicalDocument.update({
      where: { id: checkinId },
      data: { content: JSON.stringify(checkinData) },
    });

    return { checkinId, status: 'ANAMNESIS_COMPLETED' };
  }

  async submitConsent(tenantId: string, userEmail: string, checkinId: string, dto: SubmitConsentDto) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const document = await this.prisma.clinicalDocument.findFirst({
      where: { id: checkinId, tenantId },
    });
    if (!document) {
      throw new NotFoundException('Check-in não encontrado.');
    }

    const checkinData = JSON.parse(document.content ?? '{}') as CheckinRecord;
    checkinData.consents.push({
      consentType: dto.consentType,
      accepted: dto.accepted,
      acceptedAt: new Date().toISOString(),
      ipAddress: dto.ipAddress,
    });

    // Also create a formal consent record
    await this.prisma.consentRecord.create({
      data: {
        tenantId,
        patientId,
        type: dto.consentType as 'TREATMENT' | 'LGPD_GENERAL' | 'LGPD_SENSITIVE' | 'TELEMEDICINE',
        granted: dto.accepted,
        grantedAt: dto.accepted ? new Date() : undefined,
        revokedAt: !dto.accepted ? new Date() : undefined,
        ipAddress: dto.ipAddress,
      },
    });

    await this.prisma.clinicalDocument.update({
      where: { id: checkinId },
      data: { content: JSON.stringify(checkinData) },
    });

    return { checkinId, consentType: dto.consentType, accepted: dto.accepted };
  }

  async getCheckinStatus(tenantId: string, userEmail: string, checkinId: string) {
    await this.resolvePatientId(tenantId, userEmail);

    const document = await this.prisma.clinicalDocument.findFirst({
      where: { id: checkinId, tenantId },
    });
    if (!document) {
      throw new NotFoundException('Check-in não encontrado.');
    }

    const checkinData = JSON.parse(document.content ?? '{}') as CheckinRecord;

    return {
      checkinId,
      status: checkinData.status,
      hasAnamnesis: !!checkinData.anamnesis,
      consentsGiven: checkinData.consents.length,
      checkedInAt: checkinData.checkedInAt,
    };
  }
}
