import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateNptDto, CreateNptOrderDto } from './dto/create-parenteral-nutrition.dto';

@Injectable()
export class ParenteralNutritionService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateFormulation(dto: CalculateNptDto) {
    const weight = dto.weightKg;
    const totalCalories = weight * dto.caloricTargetPerKg;
    const totalProtein = weight * dto.proteinTargetPerKg;
    const lipidPct = dto.lipidPercentage ?? 30;

    // Protein: 4 kcal/g
    const proteinCalories = totalProtein * 4;

    // Non-protein calories
    const nonProteinCalories = totalCalories - proteinCalories;

    // Lipids: 9 kcal/g (for lipid emulsion, ~10 kcal/g for 20% intralipid)
    const lipidCalories = nonProteinCalories * (lipidPct / 100);
    const lipidsG = lipidCalories / 10; // 20% lipid emulsion

    // Glucose: 3.4 kcal/g
    const glucoseCalories = nonProteinCalories - lipidCalories;
    const glucoseG = glucoseCalories / 3.4;

    // Volume estimation: ~1mL per kcal as rough guide
    const estimatedVolumeMl = dto.volumeLimitMl ?? Math.round(totalCalories * 1.2);

    // GIR calculation: mg/kg/min
    const gir = (glucoseG * 1000) / (weight * 24 * 60);

    // Infusion rate
    const infusionRateMlH = Math.round((estimatedVolumeMl / 24) * 10) / 10;

    // Osmolarity estimation
    const osmolarityEstimate = Math.round(
      (glucoseG * 5) + (totalProtein * 10) + 300, // rough
    );

    const type = dto.type ?? (osmolarityEstimate > 900 ? 'TPN' : 'PPN');

    return {
      patientId: dto.patientId,
      weightKg: weight,
      type,
      totalCalories: Math.round(totalCalories),
      proteinG: Math.round(totalProtein * 10) / 10,
      glucoseG: Math.round(glucoseG * 10) / 10,
      lipidsG: Math.round(lipidsG * 10) / 10,
      estimatedVolumeMl: Math.round(estimatedVolumeMl),
      infusionRateMlH,
      gir: Math.round(gir * 100) / 100,
      osmolarityEstimate,
      recommendation: osmolarityEstimate > 900
        ? 'Central venous access required (osmolarity > 900 mOsm/L)'
        : 'Peripheral access may be used (osmolarity <= 900 mOsm/L)',
      caloricBreakdown: {
        proteinKcal: Math.round(proteinCalories),
        glucoseKcal: Math.round(glucoseCalories),
        lipidKcal: Math.round(lipidCalories),
      },
    };
  }

  async createOrder(tenantId: string, authorId: string, dto: CreateNptOrderDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `NPT Order — ${dto.type}`,
        content: JSON.stringify({
          documentType: 'NPT_ORDER',
          type: dto.type,
          totalVolumeMl: dto.totalVolumeMl,
          infusionRateMlH: dto.infusionRateMlH,
          totalCalories: dto.totalCalories,
          aminoAcidsG: dto.aminoAcidsG,
          glucoseG: dto.glucoseG,
          lipidsG: dto.lipidsG,
          electrolytes: {
            sodiumMeq: dto.sodiumMeq,
            potassiumMeq: dto.potassiumMeq,
            calciumMeq: dto.calciumMeq,
            magnesiumMeq: dto.magnesiumMeq,
            phosphateMmol: dto.phosphateMmol,
          },
          traceElements: dto.traceElements ?? true,
          multivitamins: dto.multivitamins ?? true,
          specialInstructions: dto.specialInstructions,
          status: 'ACTIVE',
          orderedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, type: dto.type, status: 'ACTIVE', createdAt: doc.createdAt };
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: 'NPT Order' },
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    return docs.map((d) => ({
      id: d.id,
      ...JSON.parse(d.content ?? '{}'),
      author: d.author,
      createdAt: d.createdAt,
    }));
  }

  async checkStability(tenantId: string, orderId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!doc) throw new NotFoundException(`NPT Order "${orderId}" not found`);

    const content = JSON.parse(doc.content ?? '{}');
    const warnings: string[] = [];

    // Calcium-phosphate precipitation check
    const calcium = content.electrolytes?.calciumMeq ?? 0;
    const phosphate = content.electrolytes?.phosphateMmol ?? 0;
    if (calcium * phosphate > 72) {
      warnings.push(
        'CRITICAL: Calcium-phosphate product exceeds 72 — high precipitation risk. Reduce calcium or phosphate.',
      );
    }

    // pH/glucose concentration
    const glucoseConc = content.glucoseG / (content.totalVolumeMl / 1000);
    if (glucoseConc > 250) {
      warnings.push(
        `High glucose concentration (${Math.round(glucoseConc)} g/L) — requires central access`,
      );
    }

    // Lipid stability
    if (content.lipidsG > 0) {
      const lipidConc = content.lipidsG / (content.totalVolumeMl / 1000);
      if (lipidConc > 50) {
        warnings.push('Lipid concentration may affect emulsion stability');
      }
    }

    const stable = warnings.filter((w) => w.startsWith('CRITICAL')).length === 0;

    return {
      orderId,
      stable,
      warnings,
      recommendation: stable
        ? 'Formulacao estavel — proceder com preparo'
        : 'Formulacao instavel — revisar prescricao',
    };
  }
}
