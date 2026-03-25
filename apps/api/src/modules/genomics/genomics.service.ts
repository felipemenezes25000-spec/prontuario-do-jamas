import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterVariantsDto,
  PrecisionMedicineDto,
  VariantClassification,
} from './dto/genomics.dto';

export interface GenomicProfile {
  id: string;
  patientId: string;
  testName: string;
  labReference: string | null;
  variants: Array<{
    gene: string;
    variant: string;
    chromosome: string | null;
    position: number | null;
    referenceAllele: string | null;
    alternateAllele: string | null;
    classification: string;
    zygosity: string | null;
    dbSnpId: string | null;
    clinVarId: string | null;
    associatedConditions: string[];
  }>;
  tenantId: string;
  createdById: string;
  createdAt: Date;
}

// Known pharmacogenomic gene-drug interactions
const PHARMACOGENOMIC_DB: Array<{
  gene: string;
  drug: string;
  impact: string;
  recommendation: string;
  evidenceLevel: string;
}> = [
  { gene: 'CYP2D6', drug: 'Codeine', impact: 'Poor metabolizers have reduced analgesic effect', recommendation: 'Consider alternative analgesic', evidenceLevel: '1A' },
  { gene: 'CYP2D6', drug: 'Tamoxifen', impact: 'Poor metabolizers have reduced efficacy', recommendation: 'Consider aromatase inhibitor', evidenceLevel: '1A' },
  { gene: 'CYP2C19', drug: 'Clopidogrel', impact: 'Poor metabolizers have reduced antiplatelet effect', recommendation: 'Consider prasugrel or ticagrelor', evidenceLevel: '1A' },
  { gene: 'CYP2C19', drug: 'Omeprazole', impact: 'Rapid metabolizers may need higher dose', recommendation: 'Increase dose or use rabeprazole', evidenceLevel: '1A' },
  { gene: 'CYP2C9', drug: 'Warfarin', impact: 'Poor metabolizers at increased bleeding risk', recommendation: 'Reduce initial dose', evidenceLevel: '1A' },
  { gene: 'VKORC1', drug: 'Warfarin', impact: 'Variant affects warfarin sensitivity', recommendation: 'Use pharmacogenomic dosing algorithm', evidenceLevel: '1A' },
  { gene: 'HLA-B*5701', drug: 'Abacavir', impact: 'Hypersensitivity reaction risk', recommendation: 'Do NOT prescribe abacavir', evidenceLevel: '1A' },
  { gene: 'HLA-B*1502', drug: 'Carbamazepine', impact: 'Stevens-Johnson syndrome risk', recommendation: 'Do NOT prescribe carbamazepine', evidenceLevel: '1A' },
  { gene: 'TPMT', drug: 'Azathioprine', impact: 'Poor metabolizers at risk for myelosuppression', recommendation: 'Reduce dose by 50-90%', evidenceLevel: '1A' },
  { gene: 'DPYD', drug: '5-Fluorouracil', impact: 'DPD deficiency risk for severe toxicity', recommendation: 'Reduce dose or avoid', evidenceLevel: '1A' },
  { gene: 'UGT1A1', drug: 'Irinotecan', impact: 'Poor metabolizers at risk for neutropenia', recommendation: 'Reduce starting dose', evidenceLevel: '1B' },
  { gene: 'SLCO1B1', drug: 'Simvastatin', impact: 'Increased myopathy risk', recommendation: 'Use lower dose or alternative statin', evidenceLevel: '1A' },
];

@Injectable()
export class GenomicsService {
  private profiles: GenomicProfile[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async registerVariants(tenantId: string, userId: string, dto: RegisterVariantsDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Also create an ExamResult for tracking
    const examResult = await this.prisma.examResult.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        examName: dto.testName,
        examType: 'GENETIC',
        requestedById: userId,
        requestedAt: new Date(),
        status: 'COMPLETED',
        completedAt: new Date(),
        labResults: dto.variants as never,
      },
    });

    const profile: GenomicProfile = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      testName: dto.testName,
      labReference: dto.labReference ?? null,
      variants: dto.variants.map((v) => ({
        gene: v.gene,
        variant: v.variant,
        chromosome: v.chromosome ?? null,
        position: v.position ?? null,
        referenceAllele: v.referenceAllele ?? null,
        alternateAllele: v.alternateAllele ?? null,
        classification: v.classification,
        zygosity: v.zygosity ?? null,
        dbSnpId: v.dbSnpId ?? null,
        clinVarId: v.clinVarId ?? null,
        associatedConditions: v.associatedConditions ?? [],
      })),
      tenantId,
      createdById: userId,
      createdAt: new Date(),
    };

    this.profiles.push(profile);

    return { profile, examResultId: examResult.id };
  }

  async getPatientProfile(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const profiles = this.profiles.filter(
      (p) => p.patientId === patientId && p.tenantId === tenantId,
    );

    // Aggregate all variants
    const allVariants = profiles.flatMap((p) => p.variants);
    const pathogenicVariants = allVariants.filter(
      (v) => v.classification === VariantClassification.PATHOGENIC ||
        v.classification === VariantClassification.LIKELY_PATHOGENIC,
    );

    // Get unique genes
    const genes = [...new Set(allVariants.map((v) => v.gene))];

    return {
      patientId,
      patientName: patient.fullName,
      totalTests: profiles.length,
      totalVariants: allVariants.length,
      pathogenicCount: pathogenicVariants.length,
      genes,
      tests: profiles.map((p) => ({
        id: p.id,
        testName: p.testName,
        labReference: p.labReference,
        variantCount: p.variants.length,
        date: p.createdAt.toISOString(),
      })),
      variants: allVariants,
      pharmacogenomicGenes: genes.filter((g) =>
        PHARMACOGENOMIC_DB.some((db) => db.gene === g),
      ),
    };
  }

  async getDrugGeneInteractions(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const profiles = this.profiles.filter(
      (p) => p.patientId === patientId && p.tenantId === tenantId,
    );

    const patientGenes = new Set(
      profiles.flatMap((p) => p.variants.map((v) => v.gene)),
    );

    const interactions = PHARMACOGENOMIC_DB.filter((db) => patientGenes.has(db.gene));

    return {
      patientId,
      patientName: patient.fullName,
      interactionsFound: interactions.length,
      alerts: interactions.map((interaction) => {
        const variant = profiles
          .flatMap((p) => p.variants)
          .find((v) => v.gene === interaction.gene);

        return {
          gene: interaction.gene,
          drug: interaction.drug,
          variant: variant?.variant ?? 'Unknown',
          classification: variant?.classification ?? 'Unknown',
          impact: interaction.impact,
          recommendation: interaction.recommendation,
          evidenceLevel: interaction.evidenceLevel,
          severity: interaction.evidenceLevel === '1A' ? 'HIGH' : 'MEDIUM',
        };
      }),
    };
  }

  async getPrecisionMedicineRecommendations(tenantId: string, userId: string, dto: PrecisionMedicineDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const profiles = this.profiles.filter(
      (p) => p.patientId === dto.patientId && p.tenantId === tenantId,
    );

    const allVariants = profiles.flatMap((p) => p.variants);
    const pathogenic = allVariants.filter(
      (v) => v.classification === VariantClassification.PATHOGENIC ||
        v.classification === VariantClassification.LIKELY_PATHOGENIC,
    );

    // Get active conditions
    const conditions = await this.prisma.chronicCondition.findMany({
      where: { patientId: dto.patientId, status: 'ACTIVE' },
    });

    // Build recommendations based on genomic profile + conditions
    const recommendations: Array<{
      type: string;
      gene: string;
      recommendation: string;
      evidence: string;
      priority: string;
    }> = [];

    for (const variant of pathogenic) {
      if (variant.associatedConditions.length > 0) {
        recommendations.push({
          type: 'SCREENING',
          gene: variant.gene,
          recommendation: `Pathogenic variant in ${variant.gene} (${variant.variant}) — consider screening for: ${variant.associatedConditions.join(', ')}`,
          evidence: 'Variant classified as pathogenic',
          priority: 'HIGH',
        });
      }
    }

    // Drug-gene recommendations
    const drugGeneAlerts = PHARMACOGENOMIC_DB.filter((db) =>
      allVariants.some((v) => v.gene === db.gene),
    );

    for (const alert of drugGeneAlerts) {
      if (dto.drug && !alert.drug.toLowerCase().includes(dto.drug.toLowerCase())) continue;
      recommendations.push({
        type: 'PHARMACOGENOMIC',
        gene: alert.gene,
        recommendation: `${alert.drug}: ${alert.recommendation}`,
        evidence: `CPIC Level ${alert.evidenceLevel}`,
        priority: alert.evidenceLevel === '1A' ? 'HIGH' : 'MEDIUM',
      });
    }

    return {
      patientId: dto.patientId,
      patientName: patient.fullName,
      genomicProfileAvailable: profiles.length > 0,
      totalVariants: allVariants.length,
      pathogenicVariants: pathogenic.length,
      activeConditions: conditions.length,
      recommendations,
      disclaimer: 'Recommendations are based on available genomic data and current clinical guidelines. Clinical judgment should always be applied.',
    };
  }
}
