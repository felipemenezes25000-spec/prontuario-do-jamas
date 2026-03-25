import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordGrowthDto, RecordVaccinationDto, RecordDevelopmentDto } from './dto/create-pediatrics.dto';

@Injectable()
export class PediatricsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[PEDIATRICS:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async recordGrowth(tenantId: string, dto: RecordGrowthDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'GROWTH',
        'Dados de Crescimento',
        {
          weight: dto.weight,
          height: dto.height,
          headCircumference: dto.headCircumference,
          ageInMonths: dto.ageInMonths,
          notes: dto.notes,
          recordedAt: new Date().toISOString(),
        },
        dto.encounterId,
      ),
    });
  }

  async getGrowthChart(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[PEDIATRICS:GROWTH]' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((doc) => {
      const content = doc.content ? JSON.parse(doc.content) : {};
      return {
        id: doc.id,
        date: doc.createdAt,
        weight: content.weight,
        height: content.height,
        headCircumference: content.headCircumference,
        ageInMonths: content.ageInMonths,
      };
    });
  }

  async recordVaccination(tenantId: string, dto: RecordVaccinationDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'VACCINATION',
        `Vacinação - ${dto.vaccineName}`,
        {
          vaccineName: dto.vaccineName,
          manufacturer: dto.manufacturer,
          lot: dto.lot,
          dose: dto.dose,
          site: dto.site,
          route: dto.route,
          administeredAt: dto.administeredAt ?? new Date().toISOString(),
          nextDoseDate: dto.nextDoseDate,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async recordDevelopment(tenantId: string, dto: RecordDevelopmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'DEVELOPMENT',
        'Marcos do Desenvolvimento',
        {
          ageInMonths: dto.ageInMonths,
          motorMilestones: dto.motorMilestones,
          languageMilestones: dto.languageMilestones,
          socialMilestones: dto.socialMilestones,
          cognitiveMilestones: dto.cognitiveMilestones,
          denverResult: dto.denverResult,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  calculateDose(medication: string, weightKg: number, ageInMonths?: number) {
    // Common pediatric dose references (mg/kg/day)
    const doseTable: Record<string, { minDosePerKg: number; maxDosePerKg: number; unit: string; frequency: string }> = {
      amoxicillin: { minDosePerKg: 25, maxDosePerKg: 50, unit: 'mg', frequency: '8/8h' },
      ibuprofen: { minDosePerKg: 5, maxDosePerKg: 10, unit: 'mg', frequency: '6/6h' },
      paracetamol: { minDosePerKg: 10, maxDosePerKg: 15, unit: 'mg', frequency: '6/6h' },
      dipirona: { minDosePerKg: 10, maxDosePerKg: 25, unit: 'mg', frequency: '6/6h' },
      azithromycin: { minDosePerKg: 10, maxDosePerKg: 10, unit: 'mg', frequency: '24/24h' },
      cephalexin: { minDosePerKg: 25, maxDosePerKg: 50, unit: 'mg', frequency: '6/6h' },
      prednisolone: { minDosePerKg: 1, maxDosePerKg: 2, unit: 'mg', frequency: '24/24h' },
    };

    const key = medication.toLowerCase().trim();
    const ref = doseTable[key];

    if (!ref) {
      return {
        medication,
        weightKg,
        ageInMonths,
        found: false,
        message: `Medicamento "${medication}" não encontrado na tabela de referência pediátrica. Consulte a bula.`,
      };
    }

    return {
      medication,
      weightKg,
      ageInMonths,
      found: true,
      minDosePerDay: Math.round(ref.minDosePerKg * weightKg * 10) / 10,
      maxDosePerDay: Math.round(ref.maxDosePerKg * weightKg * 10) / 10,
      unit: ref.unit,
      frequency: ref.frequency,
      minDosePerKg: ref.minDosePerKg,
      maxDosePerKg: ref.maxDosePerKg,
      disclaimer: 'Valores de referência. Sempre confirme com a bula e considere condições clínicas do paciente.',
    };
  }
}
