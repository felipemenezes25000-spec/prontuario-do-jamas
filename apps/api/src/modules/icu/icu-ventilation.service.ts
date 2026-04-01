import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MechanicalVentilationDto,
  WeaningProtocolDto,
  DialysisCrrtDto,
  SbtResultEnum,
} from './dto/icu-ventilation.dto';

@Injectable()
export class IcuVentilationService {
  private readonly logger = new Logger(IcuVentilationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private computeDerivedVentParams(dto: MechanicalVentilationDto) {
    const drivingPressure =
      dto.drivingPressure ??
      (dto.plateauPressure !== undefined ? dto.plateauPressure - dto.peep : null);

    const pfRatio = dto.pfRatio ?? null;

    const ARDSClassification =
      pfRatio === null
        ? null
        : pfRatio < 100
          ? 'ARDS Grave'
          : pfRatio < 200
            ? 'ARDS Moderado'
            : pfRatio < 300
              ? 'ARDS Leve'
              : 'Sem critério ARDS';

    const lungProtectiveAlert =
      dto.tidalVolume !== undefined && drivingPressure !== null
        ? drivingPressure > 15 || dto.tidalVolume > 8
          ? 'Alerta: parâmetros não protetores de pulmão — considerar reduzir VC e/ou pressão de driving'
          : null
        : null;

    return { drivingPressure, pfRatio, ARDSClassification, lungProtectiveAlert };
  }

  // ─── Mechanical Ventilation CRUD ────────────────────────────────────────────

  async createVentilationRecord(
    tenantId: string,
    authorId: string,
    dto: MechanicalVentilationDto,
  ) {
    this.logger.log(`Ventilation record patient=${dto.patientId} mode=${dto.mode}`);

    const derived = this.computeDerivedVentParams(dto);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:VENT] Ventilação Mecânica — ${dto.mode} | FiO2 ${dto.fio2}% PEEP ${dto.peep}`,
        content: JSON.stringify({ ...dto, ...derived }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      mode: dto.mode,
      fio2: dto.fio2,
      peep: dto.peep,
      ...derived,
      recordedAt: dto.recordedAt,
      createdAt: doc.createdAt,
    };
  }

  async listVentilationRecords(patientId: string, limit = 20) {
    const exists = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Patient ${patientId} not found`);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: '[ICU:VENT]' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }

  async getLatestVentilationRecord(patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { patientId, type: 'CUSTOM', title: { contains: '[ICU:VENT]' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    if (!doc) throw new NotFoundException(`No ventilation record for patient ${patientId}`);
    return {
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
      ...(JSON.parse(doc.content as string) as Record<string, unknown>),
    };
  }

  // ─── Weaning Trial ───────────────────────────────────────────────────────────

  async recordWeaningTrial(
    tenantId: string,
    authorId: string,
    dto: WeaningProtocolDto,
  ) {
    this.logger.log(`Weaning trial patient=${dto.patientId} result=${dto.sbtResult}`);

    const allCriteriaMet = Object.values(dto.sbtCriteria).every(Boolean);
    const successProbability =
      dto.sbtResult === SbtResultEnum.PASSED && dto.extubationCriteria
        ? 'Alta'
        : dto.sbtResult === SbtResultEnum.PASSED && !dto.extubationCriteria
          ? 'Moderada'
          : 'Baixa';

    const rsbiInterpretation =
      dto.rsbi !== undefined
        ? dto.rsbi < 80
          ? 'Favorável'
          : dto.rsbi < 105
            ? 'Limítrofe'
            : 'Desfavorável'
        : null;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:WEANING] TER — ${dto.sbtResult} | Extubação: ${dto.extubationCriteria ? 'Critérios atendidos' : 'NÃO atendidos'}`,
        content: JSON.stringify({ ...dto, allCriteriaMet, successProbability, rsbiInterpretation }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      allCriteriaMet,
      sbtResult: dto.sbtResult,
      extubationCriteria: dto.extubationCriteria,
      successProbability,
      rsbi: dto.rsbi,
      rsbiInterpretation,
      recommendation:
        dto.sbtResult === SbtResultEnum.PASSED && dto.extubationCriteria
          ? 'Considerar extubação — critérios TER e extubação atendidos'
          : dto.sbtResult === SbtResultEnum.FAILED
            ? `TER falhou: ${dto.failureReason ?? 'motivo não especificado'} — manter ventilação e reavalie amanhã`
            : 'TER aprovado mas critérios de extubação incompletos',
      postExtubationPlan: dto.postExtubationPlan,
      createdAt: doc.createdAt,
    };
  }

  // ─── Dialysis / CRRT CRUD ────────────────────────────────────────────────────

  async createDialysisPrescription(
    tenantId: string,
    authorId: string,
    dto: DialysisCrrtDto,
  ) {
    this.logger.log(`Dialysis prescription patient=${dto.patientId} modality=${dto.modality}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:DIALYSIS] ${dto.modality} | UF ${dto.ultrafiltration} mL/h | Acesso: ${dto.access}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      modality: dto.modality,
      access: dto.access,
      anticoagulation: dto.anticoagulation,
      bloodFlow: dto.bloodFlow,
      dialysateFlow: dto.dialysateFlow,
      ultrafiltration: dto.ultrafiltration,
      duration: dto.duration,
      ktv: dto.ktv,
      createdAt: doc.createdAt,
    };
  }

  async listDialysisPrescriptions(patientId: string, limit = 20) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: '[ICU:DIALYSIS]' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }
}
