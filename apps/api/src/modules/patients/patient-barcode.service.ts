import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PrintLabelsDto,
  BarcodeResultDto,
  QrCodeResultDto,
  PrintLabelResultDto,
  BarcodeFormat,
} from './dto/patient-barcode.dto';

function generateJobId(): string {
  return `JOB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

@Injectable()
export class PatientBarcodeService {
  private readonly logger = new Logger(PatientBarcodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // getBarcode — CODE128 barcode data for patient MRN
  // =========================================================================

  async getBarcode(tenantId: string, patientId: string): Promise<BarcodeResultDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        cpf: true,
        birthDate: true,
        bloodType: true,
        gender: true,
      },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const highRisk = await this.prisma.allergy.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
        severity: { in: ['SEVERE', 'LIFE_THREATENING'] },
      },
      select: { substance: true },
    });

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      fullName: patient.fullName,
      barcodeData: patient.mrn,
      barcodeFormat: BarcodeFormat.CODE128,
      allergyAlert: highRisk.length > 0,
    };
  }

  // =========================================================================
  // getQrCode — QR code JSON payload for patient identification
  // =========================================================================

  async getQrCode(tenantId: string, patientId: string): Promise<QrCodeResultDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        cpf: true,
        birthDate: true,
        bloodType: true,
        gender: true,
      },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE' },
      select: { substance: true, severity: true },
    });

    const highRisk = allergies.filter(
      (a) => a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING',
    );

    const payload = {
      version: 1,
      id: patient.id,
      mrn: patient.mrn,
      name: patient.fullName,
      birthDate: patient.birthDate?.toISOString().split('T')[0] ?? null,
      bloodType: patient.bloodType ?? null,
      gender: patient.gender,
      allergyAlert: highRisk.length > 0,
      allergyCount: allergies.length,
      highRiskAllergies: highRisk.map((a) => a.substance),
    };

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      fullName: patient.fullName,
      qrData: JSON.stringify(payload),
      payload,
      allergyAlert: highRisk.length > 0,
      highRiskAllergies: highRisk.map((a) => a.substance),
    };
  }

  // =========================================================================
  // printLabels — Queue label print job
  // =========================================================================

  async printLabels(
    tenantId: string,
    patientId: string,
    dto: PrintLabelsDto,
  ): Promise<PrintLabelResultDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true, mrn: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const jobId = generateJobId();
    this.logger.log(
      `Label print job ${jobId} queued: patient=${patientId} labels=${dto.labelTypes.join(',')} copies=${dto.copies ?? 1}`,
    );

    // TODO: Enqueue to BullMQ label-print queue with patient data + printer info

    return {
      patientId: patient.id,
      labelsRequested: dto.labelTypes,
      copies: dto.copies ?? 1,
      printerName: dto.printerName ?? null,
      jobId,
      status: 'QUEUED',
      generatedAt: new Date().toISOString(),
    };
  }
}
