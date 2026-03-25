import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRadiologyOrderDto,
  CreateRadiologyReportDto,
  IncidentalFindingFollowUpDto,
  RadiologyOrderStatus,
  RadiologyPriority,
} from './dto/ris-pacs.dto';
import {
  PrepProtocolExamType,
  ArchiveStudyDto,
  ArchiveTier,
  Request3DReconstructionDto,
  RequestTeleradiologyDto,
} from './dto/ris-pacs-advanced.dto';

export interface RadiologyOrder {
  id: string;
  patientId: string;
  encounterId: string | null;
  examResultId: string;
  procedureName: string;
  procedureCode: string | null;
  modality: string;
  priority: string;
  clinicalIndication: string | null;
  bodyPart: string | null;
  laterality: string | null;
  contrastRequired: boolean;
  instructions: string | null;
  scheduledAt: Date | null;
  status: string;
  accessionNumber: string;
  studyInstanceUid: string;
  tenantId: string;
  requestedById: string;
  createdAt: Date;
}

export interface RadiologyReport {
  id: string;
  orderId: string;
  findings: string;
  impression: string;
  technique: string | null;
  comparison: string | null;
  templateId: string | null;
  measurements: Record<string, unknown> | null;
  incidentalFindings: string[];
  classificationCategory: string | null;
  reportedById: string;
  createdAt: Date;
}

export interface IncidentalFollowUp {
  id: string;
  reportId: string;
  findingDescription: string;
  recommendedAction: string;
  priority: string;
  dueDate: Date | null;
  assignedPhysicianId: string | null;
  status: string;
  createdAt: Date;
}

@Injectable()
export class RisPacsService {
  private orders: RadiologyOrder[] = [];
  private reports: RadiologyReport[] = [];
  private followUps: IncidentalFollowUp[] = [];
  private accessionCounter = 1000;
  private archives: Array<{ id: string; studyId: string; tenantId: string; tier: string; reason: string | null; archivedAt: Date; retrievedAt: Date | null }> = [];
  private reconstructionRequests: Array<{ id: string; studyId: string; tenantId: string; status: string; createdAt: Date } & Request3DReconstructionDto> = [];
  private teleradiologyRequests: Array<{ id: string; studyId: string; tenantId: string; status: string; createdAt: Date } & RequestTeleradiologyDto> = [];

  constructor(private readonly prisma: PrismaService) {}

  private generateAccessionNumber(): string {
    this.accessionCounter++;
    return `RAD-${new Date().getFullYear()}-${String(this.accessionCounter).padStart(6, '0')}`;
  }

  private generateStudyUid(): string {
    const timestamp = Date.now();
    return `1.2.840.113619.2.55.3.${timestamp}.${Math.floor(Math.random() * 100000)}`;
  }

  async createOrder(tenantId: string, userId: string, dto: CreateRadiologyOrderDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Create an ExamResult entry for tracking
    const examResult = await this.prisma.examResult.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        examName: dto.procedureName,
        examCode: dto.procedureCode,
        examType: 'IMAGING',
        imageModality: this.mapModality(dto.modality),
        requestedById: userId,
        requestedAt: new Date(),
        status: 'REQUESTED',
      },
    });

    const order: RadiologyOrder = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      examResultId: examResult.id,
      procedureName: dto.procedureName,
      procedureCode: dto.procedureCode ?? null,
      modality: dto.modality,
      priority: dto.priority ?? RadiologyPriority.ROUTINE,
      clinicalIndication: dto.clinicalIndication ?? null,
      bodyPart: dto.bodyPart ?? null,
      laterality: dto.laterality ?? null,
      contrastRequired: dto.contrastRequired ?? false,
      instructions: dto.instructions ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      status: RadiologyOrderStatus.ORDERED,
      accessionNumber: this.generateAccessionNumber(),
      studyInstanceUid: this.generateStudyUid(),
      tenantId,
      requestedById: userId,
      createdAt: new Date(),
    };

    this.orders.push(order);
    return order;
  }

  private mapModality(modality: string): 'XRAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'PET' | 'SCINTIGRAPHY' | 'MAMMOGRAPHY' | 'ANGIOGRAPHY' | 'FLUOROSCOPY' | 'ECHOCARDIOGRAPHY' | 'ENDOSCOPY' | 'DENSITOMETRY' | 'OTHER' | undefined {
    const map: Record<string, 'XRAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'PET' | 'SCINTIGRAPHY' | 'MAMMOGRAPHY' | 'ANGIOGRAPHY' | 'FLUOROSCOPY' | 'OTHER'> = {
      CR: 'XRAY',
      DX: 'XRAY',
      CT: 'CT',
      MR: 'MRI',
      US: 'ULTRASOUND',
      NM: 'SCINTIGRAPHY',
      PT: 'PET',
      XA: 'ANGIOGRAPHY',
      MG: 'MAMMOGRAPHY',
      RF: 'FLUOROSCOPY',
      OT: 'OTHER',
    };
    return map[modality];
  }

  async getWorklist(tenantId: string, modality?: string, date?: string) {
    let filtered = this.orders.filter(
      (o) => o.tenantId === tenantId &&
        [RadiologyOrderStatus.ORDERED, RadiologyOrderStatus.SCHEDULED].includes(o.status as RadiologyOrderStatus),
    );

    if (modality) {
      filtered = filtered.filter((o) => o.modality === modality);
    }

    if (date) {
      const targetDate = new Date(date).toDateString();
      filtered = filtered.filter((o) => {
        const orderDate = o.scheduledAt ?? o.createdAt;
        return orderDate.toDateString() === targetDate;
      });
    }

    // Enrich with patient info
    const enriched = await Promise.all(
      filtered.map(async (order) => {
        const patient = await this.prisma.patient.findUnique({
          where: { id: order.patientId },
          select: { id: true, fullName: true, mrn: true, birthDate: true, gender: true },
        });
        return {
          ...order,
          patient,
          // DICOM Modality Worklist attributes
          dicomWorklist: {
            scheduledProcedureStepSequence: {
              scheduledStationAETitle: 'VOXPEP_' + order.modality,
              scheduledProcedureStepStartDate: (order.scheduledAt ?? order.createdAt).toISOString().split('T')[0],
              modality: order.modality,
              scheduledProcedureStepDescription: order.procedureName,
            },
            requestedProcedureDescription: order.procedureName,
            accessionNumber: order.accessionNumber,
            studyInstanceUID: order.studyInstanceUid,
          },
        };
      }),
    );

    return enriched;
  }

  async createReport(tenantId: string, userId: string, dto: CreateRadiologyReportDto) {
    const order = this.orders.find((o) => o.id === dto.orderId && o.tenantId === tenantId);
    if (!order) {
      throw new NotFoundException(`Radiology order "${dto.orderId}" not found`);
    }

    const report: RadiologyReport = {
      id: crypto.randomUUID(),
      orderId: dto.orderId,
      findings: dto.findings,
      impression: dto.impression,
      technique: dto.technique ?? null,
      comparison: dto.comparison ?? null,
      templateId: dto.templateId ?? null,
      measurements: dto.measurements ?? null,
      incidentalFindings: dto.incidentalFindings ?? [],
      classificationCategory: dto.classificationCategory ?? null,
      reportedById: userId,
      createdAt: new Date(),
    };

    this.reports.push(report);

    // Update exam result with report
    await this.prisma.examResult.update({
      where: { id: order.examResultId },
      data: {
        radiologistReport: `FINDINGS:\n${dto.findings}\n\nIMPRESSION:\n${dto.impression}`,
        status: 'COMPLETED',
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: userId,
      },
    });

    order.status = RadiologyOrderStatus.COMPLETED;

    return report;
  }

  async getReport(tenantId: string, reportId: string) {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new NotFoundException(`Report "${reportId}" not found`);
    }

    const order = this.orders.find((o) => o.id === report.orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundException(`Report "${reportId}" not found`);
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: order.patientId },
      select: { id: true, fullName: true, mrn: true, birthDate: true, gender: true },
    });

    return {
      ...report,
      order: {
        id: order.id,
        procedureName: order.procedureName,
        modality: order.modality,
        accessionNumber: order.accessionNumber,
        bodyPart: order.bodyPart,
      },
      patient,
    };
  }

  async addFollowUp(tenantId: string, reportId: string, dto: IncidentalFindingFollowUpDto) {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new NotFoundException(`Report "${reportId}" not found`);
    }

    const followUp: IncidentalFollowUp = {
      id: crypto.randomUUID(),
      reportId,
      findingDescription: dto.findingDescription,
      recommendedAction: dto.recommendedAction,
      priority: dto.priority ?? 'ROUTINE',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      assignedPhysicianId: dto.assignedPhysicianId ?? null,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.followUps.push(followUp);
    return followUp;
  }

  async getViewerMetadata(tenantId: string, studyId: string) {
    const order = this.orders.find(
      (o) => (o.studyInstanceUid === studyId || o.id === studyId) && o.tenantId === tenantId,
    );
    if (!order) {
      throw new NotFoundException(`Study "${studyId}" not found`);
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: order.patientId },
      select: { id: true, fullName: true, mrn: true, birthDate: true, gender: true },
    });

    return {
      studyInstanceUID: order.studyInstanceUid,
      accessionNumber: order.accessionNumber,
      modality: order.modality,
      procedureName: order.procedureName,
      patient,
      studyDate: (order.scheduledAt ?? order.createdAt).toISOString(),
      // WADO-RS endpoints (would point to actual PACS in production)
      wadoRsEndpoint: `/wado-rs/studies/${order.studyInstanceUid}`,
      wadoUriEndpoint: `/wado?requestType=WADO&studyUID=${order.studyInstanceUid}`,
      viewerUrl: `/viewer/${order.studyInstanceUid}`,
      report: this.reports.find((r) => r.orderId === order.id) ?? null,
    };
  }

  async getPatientImagingHistory(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const orders = this.orders.filter(
      (o) => o.patientId === patientId && o.tenantId === tenantId,
    );

    return {
      patientId,
      totalStudies: orders.length,
      studies: orders
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((order) => ({
          ...order,
          report: this.reports.find((r) => r.orderId === order.id) ?? null,
          followUps: this.followUps.filter((f) =>
            this.reports.some((r) => r.orderId === order.id && r.id === f.reportId),
          ),
        })),
    };
  }

  // ─── Prep Protocols ──────────────────────────────────────────────────────

  getPrepProtocol(tenantId: string, examType: PrepProtocolExamType) {
    const protocols: Record<PrepProtocolExamType, { title: string; steps: string[]; fastingHours: number; contraindications: string[]; notes: string }> = {
      [PrepProtocolExamType.CT_ABDOMEN]: {
        title: 'Preparo para TC de Abdome com Contraste',
        steps: ['Jejum de 4h para contraste oral/IV', 'Hidratação IV (500 mL SF 0,9% em 30 min antes)', 'Verificar função renal (creatinina/TFG)', 'Suspender metformina 48h antes se TFG < 60', 'Remover objetos metálicos'],
        fastingHours: 4,
        contraindications: ['Alergia ao contraste iodado', 'TFG < 30 mL/min/1,73m²', 'Gravidez (relativo)'],
        notes: 'Pré-medicação com corticoide em caso de alergia prévia ao contraste',
      },
      [PrepProtocolExamType.CT_PELVIS]: {
        title: 'Preparo para TC de Pelve',
        steps: ['Jejum de 4h', 'Ingestão de 1L de água 1h antes (bexiga cheia)', 'Contraste oral 1h antes se necessário', 'Verificar creatinina'],
        fastingHours: 4,
        contraindications: ['Alergia ao contraste iodado', 'TFG < 30'],
        notes: 'Bexiga cheia melhora visualização dos órgãos pélvicos',
      },
      [PrepProtocolExamType.CT_COLONOSCOPY]: {
        title: 'Preparo para Colonoscopia Virtual (CT)',
        steps: ['Dieta sem resíduos 24h antes', 'Laxante no dia anterior (polietilenoglicol)', 'Marcação de bário residual opcional', 'Jejum de 6h', 'Insuflação colônica com CO2 durante o exame'],
        fastingHours: 6,
        contraindications: ['Obstrução intestinal suspeita', 'Perfuração intestinal', 'Colite aguda grave'],
        notes: 'Sem necessidade de sedação. Desconforto abdominal leve é esperado.',
      },
      [PrepProtocolExamType.MRI_BRAIN]: {
        title: 'Preparo para RM de Crânio',
        steps: ['Remover objetos metálicos', 'Verificar implantes metálicos/marca-passo', 'Triagem de segurança RM obrigatória', 'Cláustrofobia: avaliar sedação', 'Contraste (gadolínio): verificar TFG se insuficiência renal'],
        fastingHours: 0,
        contraindications: ['Marca-passo não RM-compatível', 'Implante coclear não RM-compatível', 'Clipe de aneurisma não RM-compatível', 'Corpo estranho metálico intraocular'],
        notes: 'Gadolínio contraindicado em FBR (fibrose nefrogênica sistêmica) — TFG < 30',
      },
      [PrepProtocolExamType.MRI_ABDOMEN]: {
        title: 'Preparo para RM de Abdome',
        steps: ['Jejum de 4-6h', 'Remover objetos metálicos', 'Triagem de segurança RM', 'Suspender ferrofluido 24h antes se aplicável', 'Contraste gadolínio: verificar função renal'],
        fastingHours: 4,
        contraindications: ['Marca-passo não compatível', 'Implantes ferromagnéticos', 'TFG < 30 para gadolínio'],
        notes: 'Apneia em múltiplos momentos durante o exame — cooperação do paciente essencial',
      },
      [PrepProtocolExamType.MAMMOGRAPHY]: {
        title: 'Preparo para Mamografia',
        steps: ['Não usar desodorante, talco ou creme nas axilas no dia do exame', 'Preferencialmente 1ª ou 2ª semana do ciclo menstrual', 'Trazer exames anteriores se disponíveis', 'Informar cirurgias mamárias ou implantes'],
        fastingHours: 0,
        contraindications: ['Gravidez (relativo — usar se benefício superar risco)'],
        notes: 'Dor leve durante a compressão é normal',
      },
      [PrepProtocolExamType.PET_CT]: {
        title: 'Preparo para PET-CT com FDG',
        steps: ['Jejum de 6h (somente água)', 'Glicemia < 200 mg/dL na chegada', 'Evitar exercícios intensos 24h antes', 'Repouso completo 1h após injeção do FDG', 'Hidratação abundante após o exame'],
        fastingHours: 6,
        contraindications: ['Glicemia > 200 mg/dL (reagendar)', 'Gravidez', 'Amamentação (suspender 24h)'],
        notes: 'Diabéticos insulino-dependentes: protocolo específico de preparo',
      },
      [PrepProtocolExamType.NUCLEAR_MEDICINE]: {
        title: 'Preparo para Medicina Nuclear',
        steps: ['Verificar protocolo específico por radiofármaco', 'Jejum conforme protocolo do exame', 'Suspender medicamentos interferentes', 'Hidratação pós-exame para excreção do radiofármaco'],
        fastingHours: 4,
        contraindications: ['Gravidez', 'Amamentação (depende do radiofármaco)'],
        notes: 'Instruções de radioprotecção para familiares após o exame',
      },
      [PrepProtocolExamType.ANGIOGRAPHY]: {
        title: 'Preparo para Angiografia',
        steps: ['Jejum de 6-8h', 'Tricotomia da área de acesso', 'Verificar coagulação (INR, plaquetas)', 'Suspender anticoagulantes conforme protocolo', 'Verificar TFG (contraste iodado)', 'Acesso venoso periférico calibroso'],
        fastingHours: 6,
        contraindications: ['INR > 2.0 para procedimentos elétivos', 'Alergia ao contraste iodado não pré-medicada', 'TFG < 30'],
        notes: 'Monitoramento por 4-6h após o procedimento',
      },
      [PrepProtocolExamType.ULTRASOUND_PELVIS]: {
        title: 'Preparo para Ultrassonografia Pélvica',
        steps: ['Bexiga cheia (ingerir 1L de água 1h antes e não urinar)', 'Não é necessário jejum', 'Trazer exames anteriores'],
        fastingHours: 0,
        contraindications: [],
        notes: 'Para US transvaginal: bexiga vazia e consentimento da paciente',
      },
      [PrepProtocolExamType.BARIUM_SWALLOW]: {
        title: 'Preparo para Trânsito Esofagogástrico (Bário)',
        steps: ['Jejum de 8h', 'Suspender antiácidos 24h antes', 'Não fumar no dia do exame', 'Informar alergias'],
        fastingHours: 8,
        contraindications: ['Suspeita de perfuração (usar contraste hidrossolúvel)', 'Disfagia grave com risco de aspiração'],
        notes: 'Fezes claras (brancas) normais por 1-3 dias após o exame',
      },
    };

    const protocol = protocols[examType];
    if (!protocol) {
      throw new BadRequestException(`Prep protocol for exam type "${examType}" not found`);
    }

    return { examType, tenantId, ...protocol };
  }

  // ─── PACS Archive ─────────────────────────────────────────────────────────

  async archiveStudy(tenantId: string, studyId: string, dto: ArchiveStudyDto) {
    const order = this.orders.find((o) => o.id === studyId && o.tenantId === tenantId);
    if (!order) throw new NotFoundException(`Study "${studyId}" not found`);

    const existing = this.archives.find((a) => a.studyId === studyId && a.tenantId === tenantId);
    if (existing) {
      existing.tier = dto.tier;
      existing.reason = dto.reason ?? null;
      existing.archivedAt = new Date();
      return { ...existing, action: 'UPDATED' };
    }

    const archive = {
      id: crypto.randomUUID(),
      studyId,
      tenantId,
      tier: dto.tier,
      reason: dto.reason ?? null,
      archivedAt: new Date(),
      retrievedAt: null,
    };
    this.archives.push(archive);
    return { ...archive, action: 'ARCHIVED', estimatedRetrievalMinutes: dto.tier === ArchiveTier.OFFLINE ? 120 : dto.tier === ArchiveTier.NEARLINE ? 15 : 0 };
  }

  async retrieveStudy(tenantId: string, studyId: string) {
    const order = this.orders.find((o) => o.id === studyId && o.tenantId === tenantId);
    if (!order) throw new NotFoundException(`Study "${studyId}" not found`);

    const archive = this.archives.find((a) => a.studyId === studyId && a.tenantId === tenantId);
    if (!archive) {
      return { studyId, status: 'ONLINE', message: 'Estudo já disponível online' };
    }

    archive.retrievedAt = new Date();
    const previousTier = archive.tier;
    archive.tier = ArchiveTier.ONLINE;

    return {
      studyId,
      previousTier,
      currentTier: ArchiveTier.ONLINE,
      retrievedAt: archive.retrievedAt,
      message: 'Estudo restaurado para acesso online',
    };
  }

  // ─── 3D Reconstruction ────────────────────────────────────────────────────

  async request3DReconstruction(tenantId: string, studyId: string, dto: Request3DReconstructionDto) {
    const order = this.orders.find((o) => o.id === studyId && o.tenantId === tenantId);
    if (!order) throw new NotFoundException(`Study "${studyId}" not found`);

    if (!['CT', 'MR'].includes(order.modality)) {
      throw new BadRequestException(`3D reconstruction only supported for CT and MR. Current modality: ${order.modality}`);
    }

    const request = {
      id: crypto.randomUUID(),
      studyId,
      tenantId,
      status: 'QUEUED',
      createdAt: new Date(),
      ...dto,
    };
    this.reconstructionRequests.push(request as typeof this.reconstructionRequests[number]);

    const estimatedMinutes = dto.reconstructionType === 'CINEMATIC' ? 60 : dto.reconstructionType === 'VRT' ? 15 : 10;
    return {
      ...request,
      modality: order.modality,
      accessionNumber: order.accessionNumber,
      estimatedMinutes,
      message: `Reconstrução 3D ${dto.reconstructionType} solicitada`,
    };
  }

  // ─── Tele-radiology ───────────────────────────────────────────────────────

  async requestTeleradiology(tenantId: string, studyId: string, dto: RequestTeleradiologyDto) {
    const order = this.orders.find((o) => o.id === studyId && o.tenantId === tenantId);
    if (!order) throw new NotFoundException(`Study "${studyId}" not found`);

    const request = {
      id: crypto.randomUUID(),
      studyId,
      tenantId,
      status: 'SENT',
      createdAt: new Date(),
      ...dto,
    };
    this.teleradiologyRequests.push(request as typeof this.teleradiologyRequests[number]);

    const sla = dto.urgent ? 30 : 240;
    return {
      ...request,
      accessionNumber: order.accessionNumber,
      slaTurnAroundMinutes: sla,
      message: `Tele-radiologia solicitada para ${dto.specialty} — SLA ${sla} min`,
    };
  }
}
