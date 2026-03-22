import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AppointmentConfirmationData {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  location: string;
}

interface AppointmentReminderData {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
}

interface PrescriptionLinkData {
  patientName: string;
  pdfUrl: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly enabled: boolean;
  private readonly token: string;
  private readonly phoneId: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('WHATSAPP_TOKEN') ?? '';
    this.phoneId = this.config.get<string>('WHATSAPP_PHONE_ID') ?? '';
    this.enabled = !!this.token && !!this.phoneId;
    if (!this.enabled) {
      this.logger.warn(
        'WhatsApp not configured — messages will be logged only',
      );
    }
  }

  async sendAppointmentConfirmation(
    phone: string,
    data: AppointmentConfirmationData,
  ): Promise<void> {
    const msg = `Olá ${data.patientName}! Sua consulta com Dr(a). ${data.doctorName} está confirmada para ${data.date} às ${data.time} no(a) ${data.location}.`;

    if (!this.enabled) {
      this.logger.log(`[WHATSAPP STUB] To: ${phone} | ${msg}`);
      return;
    }

    await this.sendMessage(phone, msg);
  }

  async sendAppointmentReminder(
    phone: string,
    data: AppointmentReminderData,
  ): Promise<void> {
    const msg = `Lembrete: ${data.patientName}, sua consulta com Dr(a). ${data.doctorName} é amanhã, ${data.date} às ${data.time}. Confirme sua presença.`;

    if (!this.enabled) {
      this.logger.log(`[WHATSAPP STUB] To: ${phone} | ${msg}`);
      return;
    }

    await this.sendMessage(phone, msg);
  }

  async sendPrescriptionLink(
    phone: string,
    data: PrescriptionLinkData,
  ): Promise<void> {
    const msg = `Olá ${data.patientName}! Sua receita está disponível em: ${data.pdfUrl}`;

    if (!this.enabled) {
      this.logger.log(`[WHATSAPP STUB] To: ${phone} | ${msg}`);
      return;
    }

    await this.sendMessage(phone, msg);
  }

  private async sendMessage(phone: string, text: string): Promise<void> {
    const url = `https://graph.facebook.com/v18.0/${this.phoneId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `WhatsApp API error: ${response.status} — ${errorBody}`,
      );
    }
  }
}
