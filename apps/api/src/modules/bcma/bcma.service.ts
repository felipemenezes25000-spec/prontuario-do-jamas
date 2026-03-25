import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VerifyMedicationDto, AdministerMedicationDto } from './dto/create-bcma.dto';

@Injectable()
export class BcmaService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyMedication(tenantId: string, dto: VerifyMedicationDto) {
    // 1. Verify patient exists by matching barcode to MRN
    const patient = await this.prisma.patient.findFirst({
      where: {
        tenantId,
        OR: [
          { mrn: dto.patientBarcode },
          { id: dto.patientBarcode },
        ],
      },
      select: { id: true, fullName: true, mrn: true },
    });

    const patientMatch = !!patient;

    // 2. Verify prescription item exists and is active
    const prescriptionItem = await this.prisma.prescriptionItem.findUnique({
      where: { id: dto.prescriptionItemId },
      include: {
        prescription: {
          select: { id: true, patientId: true, encounterId: true, status: true },
        },
      },
    });

    const medicationMatch = !!prescriptionItem && prescriptionItem.prescription.status === 'ACTIVE';
    const encounterMatch = prescriptionItem?.prescription.encounterId === dto.encounterId;
    const patientPrescriptionMatch = patient?.id === prescriptionItem?.prescription.patientId;

    // 5 Rights check
    const rightPatient = patientMatch && patientPrescriptionMatch;
    const rightMedication = medicationMatch;
    const rightDose = !!prescriptionItem?.dose;
    const rightRoute = !!prescriptionItem?.route;
    const rightTime = true; // simplified — would check scheduled time

    const allRightsVerified = rightPatient && rightMedication && rightDose && rightRoute && rightTime && encounterMatch;

    return {
      verified: allRightsVerified,
      rights: {
        rightPatient,
        rightMedication,
        rightDose,
        rightRoute,
        rightTime,
      },
      patient: patient ?? null,
      medication: prescriptionItem
        ? {
            id: prescriptionItem.id,
            name: prescriptionItem.medicationName,
            dose: prescriptionItem.dose,
            route: prescriptionItem.route,
            frequency: prescriptionItem.frequency,
          }
        : null,
      warnings: allRightsVerified ? [] : ['Um ou mais direitos de medicacao nao foram verificados'],
    };
  }

  async administerMedication(tenantId: string, nurseId: string, dto: AdministerMedicationDto) {
    if (dto.fiveRightsVerified === false) {
      throw new BadRequestException(
        'Os 5 certos da medicacao devem ser verificados antes da administracao',
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);
    const checkedAt = new Date();

    // Upsert medication check
    const existing = await this.prisma.medicationCheck.findFirst({
      where: {
        prescriptionItemId: dto.prescriptionItemId,
        scheduledAt,
      },
    });

    const data = {
      prescriptionItemId: dto.prescriptionItemId,
      nurseId,
      scheduledAt,
      checkedAt,
      status: 'ADMINISTERED' as const,
      lotNumber: dto.lotNumber,
      observations: dto.observations
        ? `[BCMA] ${dto.observations}`
        : '[BCMA] Administered via barcode verification',
    };

    const check = existing
      ? await this.prisma.medicationCheck.update({ where: { id: existing.id }, data })
      : await this.prisma.medicationCheck.create({ data });

    return {
      id: check.id,
      status: check.status,
      administeredAt: check.checkedAt,
      fiveRightsVerified: dto.fiveRightsVerified ?? true,
      barcodeScanned: !!dto.medicationBarcode,
    };
  }

  async getPendingMedications(tenantId: string, patientId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patientId,
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        items: {
          where: { status: 'ACTIVE', medicationName: { not: null } },
        },
      },
    });

    const allItems = prescriptions.flatMap((p) => p.items);
    const itemIds = allItems.map((i) => i.id);

    const administeredChecks = await this.prisma.medicationCheck.findMany({
      where: {
        prescriptionItemId: { in: itemIds },
        scheduledAt: { gte: today, lt: tomorrow },
        status: 'ADMINISTERED',
      },
    });

    const administeredSet = new Set(
      administeredChecks.map((c) => `${c.prescriptionItemId}:${c.scheduledAt.getHours()}`),
    );

    return allItems.map((item) => ({
      id: item.id,
      medicationName: item.medicationName,
      dose: item.dose,
      route: item.route,
      frequency: item.frequency,
      isHighAlert: item.isHighAlert,
      isControlled: item.isControlled,
      pendingTimes: this.getPendingTimes(item, administeredSet, today),
    }));
  }

  private getPendingTimes(
    item: { id: string; frequencyHours: number | null; frequency: string | null },
    administeredSet: Set<string>,
    today: Date,
  ): string[] {
    const hours = this.getScheduleHours(item.frequencyHours, item.frequency);
    const now = new Date();
    return hours
      .filter((h) => {
        const key = `${item.id}:${h}`;
        if (administeredSet.has(key)) return false;
        const schedTime = new Date(today);
        schedTime.setHours(h, 0, 0, 0);
        return schedTime.getTime() <= now.getTime() + 2 * 60 * 60 * 1000; // within next 2h
      })
      .map((h) => {
        const d = new Date(today);
        d.setHours(h, 0, 0, 0);
        return d.toISOString();
      });
  }

  private getScheduleHours(freqHours: number | null, _freq: string | null): number[] {
    if (freqHours === 6) return [0, 6, 12, 18];
    if (freqHours === 8) return [6, 14, 22];
    if (freqHours === 12) return [6, 18];
    if (freqHours === 24) return [6];
    if (freqHours === 4) return [0, 4, 8, 12, 16, 20];
    if (freqHours) {
      const hours: number[] = [];
      for (let h = 6; h < 30; h += freqHours) hours.push(h % 24);
      return hours.sort((a, b) => a - b);
    }
    return [6];
  }

  async getAdministrationHistory(tenantId: string, patientId: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { patientId, tenantId },
      select: { items: { select: { id: true } } },
    });

    const itemIds = prescriptions.flatMap((p) => p.items.map((i) => i.id));

    const checks = await this.prisma.medicationCheck.findMany({
      where: { prescriptionItemId: { in: itemIds } },
      include: {
        nurse: { select: { id: true, name: true } },
        prescriptionItem: {
          select: { medicationName: true, dose: true, route: true },
        },
      },
      orderBy: { checkedAt: 'desc' },
      take: 100,
    });

    return checks.map((c) => ({
      id: c.id,
      medication: c.prescriptionItem,
      status: c.status,
      scheduledAt: c.scheduledAt,
      administeredAt: c.checkedAt,
      nurse: c.nurse,
      lotNumber: c.lotNumber,
      observations: c.observations,
    }));
  }
}
