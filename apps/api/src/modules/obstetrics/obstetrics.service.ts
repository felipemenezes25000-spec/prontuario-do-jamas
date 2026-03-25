import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePrenatalCardDto,
  RecordPartogramDto,
  RecordUltrasoundDto,
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
