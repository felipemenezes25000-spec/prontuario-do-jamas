import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { NEWSScoreService } from './news-score.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class VitalSignsService {
  private readonly logger = new Logger(VitalSignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly newsScoreService: NEWSScoreService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(recordedById: string, dto: CreateVitalSignsDto) {
    // Auto-calculate BMI
    let bmi: number | undefined;
    if (dto.weight && dto.height) {
      const heightInMeters = dto.height / 100;
      bmi = parseFloat((dto.weight / (heightInMeters * heightInMeters)).toFixed(2));
    }

    // Auto-calculate MAP (Mean Arterial Pressure)
    let meanArterialPressure: number | undefined;
    if (dto.systolicBP && dto.diastolicBP) {
      meanArterialPressure = parseFloat(
        ((dto.diastolicBP * 2 + dto.systolicBP) / 3).toFixed(1),
      );
    }

    // Auto-calculate GCS total
    let gcs: number | undefined;
    if (dto.gcsEye && dto.gcsVerbal && dto.gcsMotor) {
      gcs = dto.gcsEye + dto.gcsVerbal + dto.gcsMotor;
    }

    // Calculate NEWS score
    const newsResult = this.newsScoreService.calculateNEWS({
      respiratoryRate: dto.respiratoryRate,
      oxygenSaturation: dto.oxygenSaturation,
      oxygenSupplementation: dto.oxygenSupplementation,
      temperature: dto.temperature,
      systolicBP: dto.systolicBP,
      heartRate: dto.heartRate,
      gcs,
    });

    const vitalSigns = await this.prisma.vitalSigns.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        recordedById,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        systolicBP: dto.systolicBP,
        diastolicBP: dto.diastolicBP,
        meanArterialPressure,
        heartRate: dto.heartRate,
        heartRhythm: dto.heartRhythm,
        respiratoryRate: dto.respiratoryRate,
        respiratoryPattern: dto.respiratoryPattern,
        temperature: dto.temperature,
        temperatureMethod: dto.temperatureMethod,
        oxygenSaturation: dto.oxygenSaturation,
        oxygenSupplementation: dto.oxygenSupplementation,
        fiO2: dto.fiO2,
        painScale: dto.painScale,
        painLocation: dto.painLocation,
        painType: dto.painType,
        weight: dto.weight,
        height: dto.height,
        bmi,
        headCircumference: dto.headCircumference,
        abdominalCircumference: dto.abdominalCircumference,
        glucoseLevel: dto.glucoseLevel,
        glucoseContext: dto.glucoseContext,
        gcs,
        gcsEye: dto.gcsEye,
        gcsVerbal: dto.gcsVerbal,
        gcsMotor: dto.gcsMotor,
        pupilLeft: dto.pupilLeft,
        pupilRight: dto.pupilRight,
        pupilReactivity: dto.pupilReactivity,
        capillaryRefill: dto.capillaryRefill,
        edema: dto.edema,
        edemaLocation: dto.edemaLocation,
        diuresis24h: dto.diuresis24h,
        newsScore: newsResult.totalScore,
        newsClassification: newsResult.classification,
        source: dto.source ?? 'MANUAL',
        deviceId: dto.deviceId,
      },
    });

    // If NEWS >= 7 — create ClinicalAlert and emit Socket.IO event
    if (newsResult.totalScore >= 7) {
      await this.createHighNEWSAlert(dto.patientId, dto.encounterId, newsResult.totalScore);
    }

    return { ...vitalSigns, newsResult };
  }

  private async createHighNEWSAlert(
    patientId: string,
    encounterId: string | undefined,
    newsScore: number,
  ) {
    try {
      // Find patient to get tenantId
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { tenantId: true, fullName: true },
      });

      if (!patient) return;

      const alert = await this.prisma.clinicalAlert.create({
        data: {
          tenantId: patient.tenantId,
          patientId,
          encounterId,
          type: 'DETERIORATION',
          severity: 'CRITICAL',
          title: `NEWS Score Crítico: ${newsScore}`,
          message: `Acionar Time de Resposta Rápida (TRR) — Paciente ${patient.fullName} com NEWS = ${newsScore}`,
          source: 'CLINICAL_RULE',
          triggeredAt: new Date(),
        },
      });

      // Emit real-time alert
      this.realtimeGateway.emitAlert(patient.tenantId, patientId, alert);

      this.logger.warn(
        `HIGH NEWS alert created for patient ${patientId}: score=${newsScore}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create NEWS alert for patient ${patientId}`, error);
    }
  }

  async findByPatient(patientId: string, pagination: PaginationQueryDto) {
    const where = { patientId };

    const [data, total] = await Promise.all([
      this.prisma.vitalSigns.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { recordedAt: 'desc' },
        include: {
          recordedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.vitalSigns.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.vitalSigns.findMany({
      where: { encounterId },
      orderBy: { recordedAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    const vitalSigns = await this.prisma.vitalSigns.findUnique({
      where: { id },
      include: {
        recordedBy: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });

    if (!vitalSigns) {
      throw new NotFoundException(`Vital signs with ID "${id}" not found`);
    }

    return vitalSigns;
  }

  async getLatest(patientId: string) {
    const latest = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return latest ?? null;
  }

  async getTrends(patientId: string, count = 20) {
    return this.prisma.vitalSigns.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: count,
      select: {
        id: true,
        recordedAt: true,
        systolicBP: true,
        diastolicBP: true,
        meanArterialPressure: true,
        heartRate: true,
        respiratoryRate: true,
        temperature: true,
        oxygenSaturation: true,
        painScale: true,
        weight: true,
        bmi: true,
        glucoseLevel: true,
        gcs: true,
        newsScore: true,
        newsClassification: true,
      },
    });
  }
}
