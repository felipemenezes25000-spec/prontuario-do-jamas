import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSepsisScreeningDto,
  ActivateBundleDto,
  UpdateBundleItemDto,
} from './dto/create-sepsis.dto';

const DEFAULT_BUNDLE_ITEMS: Record<string, string[]> = {
  HOUR_1: [
    'Measure lactate level',
    'Obtain blood cultures before antibiotics',
    'Administer broad-spectrum antibiotics',
    'Begin rapid fluid resuscitation (30mL/kg crystalloid)',
    'Apply vasopressors if MAP < 65 mmHg after fluids',
  ],
  HOUR_3: [
    'Repeat lactate if initial > 2 mmol/L',
    'Reassess volume status and tissue perfusion',
    'Re-evaluate antibiotic therapy',
  ],
  HOUR_6: [
    'Repeat lactate if initial was elevated',
    'Reassess volume status',
    'Reassess vasopressor requirements',
  ],
};

@Injectable()
export class SepsisService {
  constructor(private readonly prisma: PrismaService) {}

  async createScreening(tenantId: string, authorId: string, dto: CreateSepsisScreeningDto) {
    const isPositive = this.evaluateScreening(dto.tool, dto.totalScore);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `Sepsis Screening — ${dto.tool} (Score: ${dto.totalScore})`,
        content: JSON.stringify({
          documentType: 'SEPSIS_SCREENING',
          tool: dto.tool,
          criteria: dto.criteria,
          totalScore: dto.totalScore,
          isPositive,
          suspectedSource: dto.suspectedSource,
          lactateMmolL: dto.lactateMmolL,
          observations: dto.observations,
          bundles: [],
          screenedAt: new Date().toISOString(),
          status: isPositive ? 'ACTIVE' : 'NEGATIVE',
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      tool: dto.tool,
      totalScore: dto.totalScore,
      isPositive,
      createdAt: doc.createdAt,
    };
  }

  private evaluateScreening(tool: string, score: number): boolean {
    switch (tool) {
      case 'QSOFA': return score >= 2;
      case 'SOFA': return score >= 2;
      case 'SIRS': return score >= 2;
      case 'NEWS2': return score >= 5;
      default: return score >= 2;
    }
  }

  async activateBundle(tenantId: string, authorId: string, screeningId: string, dto: ActivateBundleDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: screeningId, tenantId },
    });
    if (!doc) throw new NotFoundException(`Sepsis screening "${screeningId}" not found`);

    const existing = JSON.parse(doc.content ?? '{}');
    const bundles = existing.bundles ?? [];
    const defaultItems = DEFAULT_BUNDLE_ITEMS[dto.bundleType] ?? [];
    const itemNames = dto.items ?? defaultItems;

    const bundle = {
      bundleType: dto.bundleType,
      activatedAt: new Date().toISOString(),
      activatedBy: authorId,
      items: itemNames.map((name: string) => ({
        name,
        status: 'PENDING',
        completedAt: null,
        notes: null,
      })),
    };

    bundles.push(bundle);

    await this.prisma.clinicalDocument.update({
      where: { id: screeningId },
      data: { content: JSON.stringify({ ...existing, bundles }) },
    });

    return { id: screeningId, bundle };
  }

  async updateBundleItem(tenantId: string, authorId: string, screeningId: string, dto: UpdateBundleItemDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: screeningId, tenantId },
    });
    if (!doc) throw new NotFoundException(`Sepsis screening "${screeningId}" not found`);

    const existing = JSON.parse(doc.content ?? '{}');
    const bundles = existing.bundles ?? [];

    let updated = false;
    for (const bundle of bundles) {
      for (const item of bundle.items) {
        if (item.name === dto.itemName) {
          item.status = dto.status;
          item.completedAt = dto.completedAt ?? (dto.status === 'COMPLETED' ? new Date().toISOString() : null);
          item.notes = dto.notes ?? item.notes;
          item.completedBy = authorId;
          updated = true;
        }
      }
    }

    if (!updated) throw new NotFoundException(`Bundle item "${dto.itemName}" not found`);

    await this.prisma.clinicalDocument.update({
      where: { id: screeningId },
      data: { content: JSON.stringify({ ...existing, bundles }) },
    });

    return { id: screeningId, updatedItem: dto.itemName, status: dto.status };
  }

  async getActiveCases(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Sepsis Screening' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return docs
      .map((d) => {
        const content = JSON.parse(d.content ?? '{}');
        return {
          id: d.id,
          patient: d.patient,
          author: d.author,
          ...content,
          createdAt: d.createdAt,
        };
      })
      .filter((d) => d.status === 'ACTIVE');
  }

  async getComplianceDashboard(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Sepsis Screening' },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    let totalScreenings = 0;
    let positiveScreenings = 0;
    let totalBundleItems = 0;
    let completedBundleItems = 0;

    for (const doc of docs) {
      const content = JSON.parse(doc.content ?? '{}');
      totalScreenings++;
      if (content.isPositive) positiveScreenings++;

      for (const bundle of content.bundles ?? []) {
        for (const item of bundle.items ?? []) {
          totalBundleItems++;
          if (item.status === 'COMPLETED') completedBundleItems++;
        }
      }
    }

    const complianceRate = totalBundleItems > 0
      ? Math.round((completedBundleItems / totalBundleItems) * 100)
      : 0;

    return {
      period: '30d',
      totalScreenings,
      positiveScreenings,
      positiveRate: totalScreenings > 0 ? Math.round((positiveScreenings / totalScreenings) * 100) : 0,
      totalBundleItems,
      completedBundleItems,
      complianceRate,
    };
  }
}
