import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePrenatalCardDto,
  RecordPartogramDto,
  RecordUltrasoundDto,
  CreateObstetricHistoryDto,
} from './dto/create-obstetrics.dto';

@Injectable()
export class ObstetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[OBSTETRICS:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createPrenatalCard(tenantId: string, dto: CreatePrenatalCardDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'PRENATAL_CARD',
        'Cartão de Pré-Natal',
        {
          lmp: dto.lmp,
          edd: dto.edd,
          gravida: dto.gravida,
          para: dto.para,
          abortions: dto.abortions,
          cesareanCount: dto.cesareanCount,
          bloodType: dto.bloodType,
          riskClassification: dto.riskClassification,
          riskFactors: dto.riskFactors,
          labResults: dto.labResults,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async recordPartogram(tenantId: string, dto: RecordPartogramDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'PARTOGRAM',
        'Partograma',
        {
          cervicalDilation: dto.cervicalDilation,
          fetalStation: dto.fetalStation,
          contractionFrequency: dto.contractionFrequency,
          contractionDuration: dto.contractionDuration,
          fetalHeartRate: dto.fetalHeartRate,
          amnioticFluid: dto.amnioticFluid,
          maternalVitals: dto.maternalVitals,
          notes: dto.notes,
          recordedAt: new Date().toISOString(),
        },
        dto.encounterId,
      ),
    });
  }

  async recordUltrasound(tenantId: string, dto: RecordUltrasoundDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ULTRASOUND',
        `Ultrassom Obstétrico - IG ${dto.gestationalAge ?? 'N/A'} sem`,
        {
          gestationalAge: dto.gestationalAge,
          estimatedFetalWeight: dto.estimatedFetalWeight,
          presentation: dto.presentation,
          placentaLocation: dto.placentaLocation,
          amnioticFluidIndex: dto.amnioticFluidIndex,
          biometry: dto.biometry,
          doppler: dto.doppler,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  // =========================================================================
  // GPAC Obstetric History
  // =========================================================================

  async saveObstetricHistory(tenantId: string, userEmail: string, dto: CreateObstetricHistoryDto) {
    const gpacLabel = `G${dto.gravida}P${dto.para}A${dto.abortions}C${dto.cesareans}`;

    // Upsert: find existing obstetric history for patient, update if exists
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId: dto.patientId,
        title: { startsWith: '[OBSTETRIC_HISTORY]' },
        status: { not: 'VOIDED' },
      },
    });

    const content = JSON.stringify({
      gravida: dto.gravida,
      para: dto.para,
      abortions: dto.abortions,
      cesareans: dto.cesareans,
      livingChildren: dto.livingChildren,
      lastMenstrualPeriod: dto.lastMenstrualPeriod,
      notes: dto.notes,
      gpac: gpacLabel,
      updatedAt: new Date().toISOString(),
    });

    if (existing) {
      return this.prisma.clinicalDocument.update({
        where: { id: existing.id },
        data: {
          title: `[OBSTETRIC_HISTORY] ${gpacLabel}`,
          content,
        },
        include: { author: { select: { id: true, name: true, role: true } } },
      });
    }

    // Resolve author by email
    const author = await this.prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true },
    });

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: author?.id ?? 'SYSTEM',
        type: 'CUSTOM' as const,
        title: `[OBSTETRIC_HISTORY] ${gpacLabel}`,
        content,
        status: 'FINAL' as const,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async getObstetricHistory(tenantId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[OBSTETRIC_HISTORY]' },
        status: { not: 'VOIDED' },
      },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    if (!doc) {
      return null;
    }

    const parsed = doc.content ? JSON.parse(doc.content) : {};
    return {
      id: doc.id,
      gravida: parsed.gravida ?? 0,
      para: parsed.para ?? 0,
      abortions: parsed.abortions ?? 0,
      cesareans: parsed.cesareans ?? 0,
      livingChildren: parsed.livingChildren ?? 0,
      lastMenstrualPeriod: parsed.lastMenstrualPeriod ?? null,
      notes: parsed.notes ?? null,
      gpac: parsed.gpac ?? null,
      author: doc.author,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[OBSTETRICS:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async getRiskClassification(tenantId: string, patientId: string) {
    const prenatalCards = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[OBSTETRICS:PRENATAL_CARD]' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (prenatalCards.length === 0) {
      return { patientId, riskClassification: null, message: 'Nenhum cartão de pré-natal encontrado' };
    }

    const content = prenatalCards[0].content ? JSON.parse(prenatalCards[0].content) : {};

    return {
      patientId,
      riskClassification: content.riskClassification ?? 'HABITUAL',
      riskFactors: content.riskFactors ?? {},
      edd: content.edd,
      lastUpdated: prenatalCards[0].updatedAt,
    };
  }
}
