import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealStatusDto } from './dto/update-appeal-status.dto';
import { AppealStatus } from '@prisma/client';

interface AppealFilters {
  status?: AppealStatus;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AppealsService {
  private readonly logger = new Logger(AppealsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a billing appeal linked to a BillingEntry.
   * Auto-generates appealNumber with format REC-{YYYYMMDD}-{sequence}
   */
  async createAppeal(tenantId: string, userId: string, dto: CreateAppealDto) {
    // Verify billing entry exists and belongs to tenant
    const billingEntry = await this.prisma.billingEntry.findFirst({
      where: { id: dto.billingEntryId, tenantId },
    });

    if (!billingEntry) {
      throw new NotFoundException(
        `Billing entry with ID "${dto.billingEntryId}" not found`,
      );
    }

    const appealNumber = await this.generateAppealNumber(tenantId);

    const appeal = await this.prisma.billingAppeal.create({
      data: {
        tenantId,
        billingEntryId: dto.billingEntryId,
        appealNumber,
        glosedItemCodes: dto.glosedItemCodes,
        glosedAmount: dto.glosedAmount,
        appealedAmount: dto.appealedAmount,
        justification: dto.justification,
        supportingDocs: dto.supportingDocs ?? [],
        createdById: userId,
      },
      include: {
        billingEntry: {
          select: { id: true, guideNumber: true, totalAmount: true, status: true },
        },
      },
    });

    this.logger.log(
      `Appeal ${appealNumber} created for billing entry ${dto.billingEntryId}`,
    );

    return appeal;
  }

  /**
   * List appeals with pagination and optional status filter
   */
  async findAppeals(tenantId: string, filters: AppealFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.billingAppeal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          billingEntry: {
            select: {
              id: true,
              guideNumber: true,
              totalAmount: true,
              insuranceProvider: true,
            },
          },
        },
      }),
      this.prisma.billingAppeal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single appeal by ID with billing entry details
   */
  async findAppealById(tenantId: string, id: string) {
    const appeal = await this.prisma.billingAppeal.findFirst({
      where: { id, tenantId },
      include: {
        billingEntry: {
          include: {
            patient: { select: { id: true, fullName: true, mrn: true } },
            encounter: { select: { id: true, type: true, status: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal with ID "${id}" not found`);
    }

    return appeal;
  }

  /**
   * Update appeal status. Sets resolvedAt when status is terminal.
   */
  async updateAppealStatus(
    tenantId: string,
    id: string,
    dto: UpdateAppealStatusDto,
  ) {
    const appeal = await this.findAppealById(tenantId, id);

    const data: Record<string, unknown> = { status: dto.status };

    if (dto.resolution) {
      data.resolution = dto.resolution;
    }

    if (dto.recoveredAmount !== undefined) {
      data.recoveredAmount = dto.recoveredAmount;
    }

    // Set submittedAt when first submitted
    if (dto.status === AppealStatus.SUBMITTED && !appeal.submittedAt) {
      data.submittedAt = new Date();
    }

    // Set resolvedAt for terminal statuses
    const terminalStatuses: AppealStatus[] = [
      AppealStatus.ACCEPTED,
      AppealStatus.PARTIALLY_ACCEPTED,
      AppealStatus.REJECTED,
    ];
    if (terminalStatuses.includes(dto.status)) {
      data.resolvedAt = new Date();
    }

    const updated = await this.prisma.billingAppeal.update({
      where: { id },
      data,
      include: {
        billingEntry: {
          select: { id: true, guideNumber: true, totalAmount: true },
        },
      },
    });

    this.logger.log(
      `Appeal ${appeal.appealNumber} status updated to ${dto.status}`,
    );

    return updated;
  }

  /**
   * Generate AI justification text (stub).
   * Returns a formatted template based on glosa reason and billing data.
   */
  async generateAIJustification(tenantId: string, appealId: string) {
    const appeal = await this.prisma.billingAppeal.findFirst({
      where: { id: appealId, tenantId },
      include: {
        billingEntry: {
          include: {
            patient: { select: { fullName: true, mrn: true } },
            encounter: { select: { type: true, createdAt: true } },
          },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal with ID "${appealId}" not found`);
    }

    const guideNumber = appeal.billingEntry.guideNumber ?? 'N/A';
    const codes = appeal.glosedItemCodes.join(', ');
    const patientName = appeal.billingEntry.patient.fullName;
    const encounterDate = appeal.billingEntry.encounter.createdAt
      .toLocaleDateString('pt-BR');
    const glosedAmount = Number(appeal.glosedAmount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const appealedAmount = Number(appeal.appealedAmount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const aiJustification = `Recurso de Glosa - Guia ${guideNumber}

Prezados Senhores,

Vimos por meio deste interpor RECURSO DE GLOSA referente aos procedimentos ${codes}, realizados no paciente ${patientName} (Prontuario: ${appeal.billingEntry.patient.mrn}), em atendimento realizado em ${encounterDate}.

O(s) procedimento(s) ${codes} foi(ram) realizado(s) conforme indicacao clinica do paciente, com registro em prontuario eletronico, estando em conformidade com as diretrizes da ANS e do CFM.

Valor glosado: ${glosedAmount}
Valor em recurso: ${appealedAmount}

Justificativa tecnica:
${appeal.justification}

Os procedimentos estao em conformidade com:
- Rol de Procedimentos e Eventos em Saude da ANS
- Diretrizes clinicas aplicaveis ao caso
- Registro completo em prontuario eletronico com documentacao de suporte

Solicitamos a revisao da glosa e a consequente liberacao do pagamento dos procedimentos acima descritos, conforme legislacao vigente (Lei 9.656/98 e RN 395/2016 da ANS).

Atenciosamente,
Equipe Medica`;

    // Persist the AI justification
    await this.prisma.billingAppeal.update({
      where: { id: appealId },
      data: { aiJustification },
    });

    this.logger.log(
      `AI justification generated for appeal ${appeal.appealNumber}`,
    );

    return { aiJustification };
  }

  /**
   * Generate sequential appeal number: REC-{YYYYMMDD}-{sequence}
   */
  private async generateAppealNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `REC-${dateStr}-`;

    const lastAppeal = await this.prisma.billingAppeal.findFirst({
      where: {
        tenantId,
        appealNumber: { startsWith: prefix },
      },
      orderBy: { appealNumber: 'desc' },
      select: { appealNumber: true },
    });

    let sequence = 1;
    if (lastAppeal) {
      const lastSeq = parseInt(lastAppeal.appealNumber.split('-').pop() ?? '0', 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}
