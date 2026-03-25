import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AgentTaskStatus,
  AgentTaskType,
  AgentTaskResponseDto,
  ConsultationPrepResponseDto,
  PreFilledFormResponseDto,
  PatientSummaryAgentResponseDto,
} from './dto/agentic-ai.dto';

interface AgentTask {
  id: string;
  tenantId: string;
  userId: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class AgenticAiService {
  private readonly logger = new Logger(AgenticAiService.name);
  private readonly tasks = new Map<string, AgentTask>();

  async prepareConsultation(
    tenantId: string,
    userId: string,
    patientId: string,
    encounterId: string,
    focusAreas?: string[],
  ): Promise<ConsultationPrepResponseDto> {
    this.logger.log(`Preparing consultation for patient ${patientId}`);

    const task = this.createTask(tenantId, userId, AgentTaskType.PREPARE_CONSULTATION, {
      patientId,
      encounterId,
      focusAreas,
    });

    // Stub: In production, agent would query Prisma for real patient data
    const result: ConsultationPrepResponseDto = {
      taskId: task.id,
      recentLabResults: [
        { name: 'Hemoglobina', value: '12.5 g/dL', date: '2026-03-20', abnormal: false },
        { name: 'Glicose jejum', value: '126 mg/dL', date: '2026-03-20', abnormal: true },
        { name: 'Creatinina', value: '0.9 mg/dL', date: '2026-03-20', abnormal: false },
      ],
      activeProblems: [
        { condition: 'Hipertensão arterial sistêmica', cidCode: 'I10', since: '2022-05-10' },
        { condition: 'Diabetes mellitus tipo 2', cidCode: 'E11', since: '2023-01-15' },
      ],
      currentMedications: [
        { name: 'Losartana 50mg', dose: '50mg', frequency: '1x ao dia' },
        { name: 'Metformina 850mg', dose: '850mg', frequency: '2x ao dia' },
      ],
      pendingOrders: [
        { type: 'LABORATORY', description: 'HbA1c - Hemoglobina glicada', orderedAt: '2026-03-15' },
      ],
      aiRecommendations: [
        'Considerar ajuste de metformina — glicose de jejum acima do alvo',
        'Solicitar fundo de olho — último exame há 14 meses',
        'Verificar adesão medicamentosa — PA não controlada nas últimas 2 visitas',
      ],
      riskAlerts: [
        'Risco cardiovascular moderado-alto (ASCVD score estimado)',
      ],
    };

    task.result = result as unknown as Record<string, unknown>;
    task.status = AgentTaskStatus.COMPLETED;
    task.completedAt = new Date();

    return result;
  }

  async preFillForm(
    tenantId: string,
    userId: string,
    patientId: string,
    formType: string,
    encounterId?: string,
  ): Promise<PreFilledFormResponseDto> {
    this.logger.log(`Pre-filling form ${formType} for patient ${patientId}`);

    const task = this.createTask(tenantId, userId, AgentTaskType.PRE_FILL_FORM, {
      patientId,
      formType,
      encounterId,
    });

    const result: PreFilledFormResponseDto = {
      taskId: task.id,
      formType,
      prefilledFields: {
        patientName: 'João da Silva',
        birthDate: '1965-03-15',
        cpf: '123.456.789-00',
        bloodType: 'O_POS',
        allergies: ['Dipirona — reação alérgica moderada'],
        currentMedications: ['Losartana 50mg', 'Metformina 850mg'],
        mainDiagnosis: 'Hipertensão arterial sistêmica',
      },
      confidence: 0.92,
      suggestedValues: {
        chiefComplaint: 'Retorno para acompanhamento de HAS e DM2',
      },
    };

    task.result = result as unknown as Record<string, unknown>;
    task.status = AgentTaskStatus.COMPLETED;
    task.completedAt = new Date();

    return result;
  }

  async summarizePatient(
    tenantId: string,
    userId: string,
    patientId: string,
    summaryType = 'comprehensive',
    fromDate?: string,
  ): Promise<PatientSummaryAgentResponseDto> {
    this.logger.log(`Summarizing patient ${patientId}, type=${summaryType}`);

    const task = this.createTask(tenantId, userId, AgentTaskType.SUMMARIZE_PATIENT, {
      patientId,
      summaryType,
      fromDate,
    });

    const result: PatientSummaryAgentResponseDto = {
      taskId: task.id,
      patientId,
      summary:
        'Paciente masculino, 61 anos, com hipertensão arterial sistêmica e diabetes mellitus tipo 2 ' +
        'diagnosticados em 2022 e 2023, respectivamente. Em uso regular de losartana 50mg e metformina 850mg. ' +
        'Última consulta em 15/03/2026 evidenciou glicemia de jejum de 126 mg/dL (acima do alvo). ' +
        'PA de 140/90 mmHg. Sem complicações microvasculares documentadas até o momento. ' +
        'Alergia conhecida a dipirona.',
      demographics: {
        name: 'João da Silva',
        age: '61 anos',
        gender: 'Masculino',
        bloodType: 'O+',
      },
      problemList: [
        { condition: 'Hipertensão arterial sistêmica (I10)', status: 'ACTIVE' },
        { condition: 'Diabetes mellitus tipo 2 (E11)', status: 'ACTIVE' },
      ],
      medicationList: [
        { name: 'Losartana', dose: '50mg 1x/dia' },
        { name: 'Metformina', dose: '850mg 2x/dia' },
      ],
      recentEncounters: [
        {
          date: '2026-03-15',
          type: 'CONSULTATION',
          summary: 'Retorno — glicemia discretamente elevada, PA limítrofe',
        },
        {
          date: '2026-01-10',
          type: 'CONSULTATION',
          summary: 'Consulta de rotina — sem intercorrências',
        },
      ],
      allergyList: [{ substance: 'Dipirona', severity: 'MODERATE' }],
    };

    task.result = result as unknown as Record<string, unknown>;
    task.status = AgentTaskStatus.COMPLETED;
    task.completedAt = new Date();

    return result;
  }

  async listTasks(tenantId: string): Promise<AgentTaskResponseDto[]> {
    return Array.from(this.tasks.values())
      .filter((t) => t.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => this.toResponse(t));
  }

  async getTask(tenantId: string, taskId: string): Promise<AgentTaskResponseDto> {
    const task = this.tasks.get(taskId);
    if (!task || task.tenantId !== tenantId) {
      throw new NotFoundException(`Agent task ${taskId} not found`);
    }
    return this.toResponse(task);
  }

  private createTask(
    tenantId: string,
    userId: string,
    type: AgentTaskType,
    input: Record<string, unknown>,
  ): AgentTask {
    const task: AgentTask = {
      id: randomUUID(),
      tenantId,
      userId,
      type,
      status: AgentTaskStatus.RUNNING,
      input,
      createdAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  private toResponse(task: AgentTask): AgentTaskResponseDto {
    return {
      id: task.id,
      type: task.type,
      status: task.status,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
  }
}
