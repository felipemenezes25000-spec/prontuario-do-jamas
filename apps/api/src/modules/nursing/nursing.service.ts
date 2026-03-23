import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNursingProcessDto } from './dto/create-nursing-process.dto';
import {
  CreateNursingDiagnosisDto,
  CreateNursingOutcomeDto,
  CreateNursingInterventionDto,
} from './dto/create-nursing-diagnosis.dto';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto';
import { CreateFluidBalanceDto } from './dto/create-fluid-balance.dto';

@Injectable()
export class NursingService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Nursing Process ---

  async createProcess(nurseId: string, dto: CreateNursingProcessDto) {
    return this.prisma.nursingProcess.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        nurseId,
        dataCollectionNotes: dto.dataCollectionNotes,
        dataCollectionVoiceId: dto.dataCollectionVoiceId,
      },
    });
  }

  async findProcessById(id: string) {
    const process = await this.prisma.nursingProcess.findUnique({
      where: { id },
      include: {
        nurse: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
        diagnoses: {
          include: {
            outcomes: true,
            interventions: true,
          },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Nursing process with ID "${id}" not found`);
    }

    return process;
  }

  async addDiagnosis(processId: string, dto: CreateNursingDiagnosisDto) {
    await this.findProcessById(processId);

    return this.prisma.nursingDiagnosis.create({
      data: {
        nursingProcessId: processId,
        nandaCode: dto.nandaCode,
        nandaDomain: dto.nandaDomain,
        nandaClass: dto.nandaClass,
        nandaTitle: dto.nandaTitle,
        relatedFactors: dto.relatedFactors ?? [],
        riskFactors: dto.riskFactors ?? [],
        definingCharacteristics: dto.definingCharacteristics ?? [],
        status: dto.status ?? 'ACTIVE',
        priority: dto.priority,
        aiSuggested: dto.aiSuggested ?? false,
        aiConfidence: dto.aiConfidence,
      },
    });
  }

  async addOutcome(diagnosisId: string, dto: CreateNursingOutcomeDto) {
    const diagnosis = await this.prisma.nursingDiagnosis.findUnique({
      where: { id: diagnosisId },
    });
    if (!diagnosis) {
      throw new NotFoundException(`Nursing diagnosis with ID "${diagnosisId}" not found`);
    }

    return this.prisma.nursingOutcome.create({
      data: {
        nursingDiagnosisId: diagnosisId,
        nocCode: dto.nocCode,
        nocTitle: dto.nocTitle,
        baselineScore: dto.baselineScore,
        targetScore: dto.targetScore,
        currentScore: dto.currentScore,
        evaluationFrequency: dto.evaluationFrequency,
      },
    });
  }

  async addIntervention(diagnosisId: string, dto: CreateNursingInterventionDto) {
    const diagnosis = await this.prisma.nursingDiagnosis.findUnique({
      where: { id: diagnosisId },
    });
    if (!diagnosis) {
      throw new NotFoundException(`Nursing diagnosis with ID "${diagnosisId}" not found`);
    }

    return this.prisma.nursingIntervention.create({
      data: {
        nursingDiagnosisId: diagnosisId,
        nicCode: dto.nicCode,
        nicTitle: dto.nicTitle,
        notes: dto.notes,
        voiceTranscriptionId: dto.voiceTranscriptionId,
      },
    });
  }

  // --- Nursing Notes ---

  async createNote(nurseId: string, dto: CreateNursingNoteDto) {
    return this.prisma.nursingNote.create({
      data: {
        encounterId: dto.encounterId,
        nurseId,
        type: dto.type,
        content: dto.content,
        shift: dto.shift,
        voiceTranscriptionId: dto.voiceTranscriptionId,
      },
    });
  }

  // --- Fluid Balance ---

  async createFluidBalance(nurseId: string, dto: CreateFluidBalanceDto) {
    const intakeOral = dto.intakeOral ?? 0;
    const intakeIV = dto.intakeIV ?? 0;
    const intakeOther = dto.intakeOther ?? 0;
    const intakeTotal = intakeOral + intakeIV + intakeOther;

    const outputUrine = dto.outputUrine ?? 0;
    const outputDrain = dto.outputDrain ?? 0;
    const outputEmesis = dto.outputEmesis ?? 0;
    const outputStool = dto.outputStool ?? 0;
    const outputOther = dto.outputOther ?? 0;
    const outputTotal = outputUrine + outputDrain + outputEmesis + outputStool + outputOther;

    const balance = intakeTotal - outputTotal;

    return this.prisma.fluidBalance.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        nurseId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        period: dto.period,
        intakeOral,
        intakeIV,
        intakeOther,
        intakeTotal,
        outputUrine,
        outputDrain,
        outputEmesis,
        outputStool,
        outputOther,
        outputTotal,
        balance,
      },
    });
  }

  async getFluidBalance(encounterId: string) {
    return this.prisma.fluidBalance.findMany({
      where: { encounterId },
      include: { nurse: { select: { id: true, name: true } } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async getFluidBalanceSummary(encounterId: string) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const records = await this.prisma.fluidBalance.findMany({
      where: {
        encounterId,
        recordedAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const totalInput = records.reduce((sum: number, r: { intakeTotal: number }) => sum + r.intakeTotal, 0);
    const totalOutput = records.reduce((sum: number, r: { outputTotal: number }) => sum + r.outputTotal, 0);
    const balance = totalInput - totalOutput;

    // Group by shift
    const shifts = {
      morning: { input: 0, output: 0, balance: 0 },
      afternoon: { input: 0, output: 0, balance: 0 },
      night: { input: 0, output: 0, balance: 0 },
    };

    for (const record of records) {
      const hour = record.recordedAt.getHours();
      let shift: 'morning' | 'afternoon' | 'night';
      if (hour >= 7 && hour < 13) shift = 'morning';
      else if (hour >= 13 && hour < 19) shift = 'afternoon';
      else shift = 'night';

      shifts[shift].input += record.intakeTotal;
      shifts[shift].output += record.outputTotal;
      shifts[shift].balance += record.balance;
    }

    return {
      totalInput,
      totalOutput,
      balance,
      shifts,
      records,
    };
  }

  // --- Queries ---

  async findByEncounter(encounterId: string) {
    const [processes, notes, fluidBalances] = await Promise.all([
      this.prisma.nursingProcess.findMany({
        where: { encounterId },
        include: {
          nurse: { select: { id: true, name: true } },
          diagnoses: {
            include: { outcomes: true, interventions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.nursingNote.findMany({
        where: { encounterId },
        include: { nurse: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fluidBalance.findMany({
        where: { encounterId },
        include: { nurse: { select: { id: true, name: true } } },
        orderBy: { recordedAt: 'desc' },
      }),
    ]);

    return { processes, notes, fluidBalances };
  }

  async findByPatient(patientId: string) {
    return this.prisma.nursingProcess.findMany({
      where: { patientId },
      include: {
        nurse: { select: { id: true, name: true } },
        diagnoses: {
          include: { outcomes: true, interventions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveProcesses(patientId: string) {
    return this.prisma.nursingProcess.findMany({
      where: { patientId, status: 'IN_PROGRESS' },
      include: {
        nurse: { select: { id: true, name: true } },
        diagnoses: {
          where: { status: 'ACTIVE' },
          include: { outcomes: true, interventions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
