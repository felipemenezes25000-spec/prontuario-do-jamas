import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AgentTaskStatus,
  AgentType,
  AgentTaskResponseDto,
  AgentTaskListResponseDto,
  AgentDefinitionDto,
  AgentMetricsResponseDto,
  ConsultationPrepResponseDto,
  PreFilledFormResponseDto,
  PatientSummaryAgentResponseDto,
} from './dto/agentic-ai.dto';

// ─── Internal Types ──────────────────────────────────────────────────────────

interface AgentTask {
  id: string;
  tenantId: string;
  userId: string;
  type: AgentType;
  status: AgentTaskStatus;
  patientId?: string;
  encounterId?: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface AgentConfig {
  agentType: AgentType;
  name: string;
  description: string;
  enabled: boolean;
  autoExecute: boolean;
  priority: number;
  timeoutSeconds: number;
  customPrompt?: string;
}

// ─── Default Agent Definitions ───────────────────────────────────────────────

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    agentType: AgentType.PRE_VISIT_PREP,
    name: 'Preparação de Consulta',
    description: 'Reúne automaticamente resultados de exames, histórico, medicações e recomendações antes da consulta',
    enabled: true,
    autoExecute: true,
    priority: 8,
    timeoutSeconds: 30,
  },
  {
    agentType: AgentType.FOLLOW_UP,
    name: 'Acompanhamento Pós-Consulta',
    description: 'Agenda e gerencia contato pós-consulta com paciente, monitora adesão e escala se necessário',
    enabled: true,
    autoExecute: false,
    priority: 6,
    timeoutSeconds: 20,
  },
  {
    agentType: AgentType.INBOX_TRIAGE,
    name: 'Triagem de Mensagens',
    description: 'Classifica e prioriza mensagens de pacientes, sugere respostas e identifica urgências',
    enabled: true,
    autoExecute: true,
    priority: 9,
    timeoutSeconds: 15,
  },
  {
    agentType: AgentType.PRIOR_AUTH,
    name: 'Autorização Prévia',
    description: 'Gera justificativa clínica e preenche formulários de autorização para convênios',
    enabled: true,
    autoExecute: false,
    priority: 7,
    timeoutSeconds: 45,
  },
  {
    agentType: AgentType.REFERRAL,
    name: 'Encaminhamento Inteligente',
    description: 'Identifica necessidade de referência, seleciona especialista e gera carta de encaminhamento',
    enabled: true,
    autoExecute: false,
    priority: 7,
    timeoutSeconds: 25,
  },
  {
    agentType: AgentType.SUMMARIZE,
    name: 'Resumo do Paciente',
    description: 'Cria resumo clínico abrangente do paciente para handoff, referência ou revisão',
    enabled: true,
    autoExecute: false,
    priority: 5,
    timeoutSeconds: 20,
  },
  {
    agentType: AgentType.PRE_FILL_FORM,
    name: 'Preenchimento de Formulários',
    description: 'Preenche automaticamente formulários clínicos com dados do paciente e sugestões de IA',
    enabled: true,
    autoExecute: true,
    priority: 6,
    timeoutSeconds: 10,
  },
];

// ─── Agent execution mock results ────────────────────────────────────────────

type AgentResultGenerator = (patientId: string, params: Record<string, unknown>) => Record<string, unknown>;

const AGENT_EXECUTORS: Record<string, AgentResultGenerator> = {
  [AgentType.PRE_VISIT_PREP]: (patientId, _params) => ({
    patientId,
    recentLabResults: [
      { name: 'Hemoglobina', value: '12.5 g/dL', date: '2026-03-20', abnormal: false },
      { name: 'Glicose jejum', value: '126 mg/dL', date: '2026-03-20', abnormal: true },
      { name: 'Creatinina', value: '0.9 mg/dL', date: '2026-03-20', abnormal: false },
      { name: 'HbA1c', value: '7.2%', date: '2026-03-18', abnormal: true },
      { name: 'Colesterol total', value: '210 mg/dL', date: '2026-03-18', abnormal: true },
    ],
    activeProblems: [
      { condition: 'Hipertensão arterial sistêmica', cidCode: 'I10', since: '2022-05-10' },
      { condition: 'Diabetes mellitus tipo 2', cidCode: 'E11', since: '2023-01-15' },
      { condition: 'Dislipidemia', cidCode: 'E78.5', since: '2024-06-20' },
    ],
    currentMedications: [
      { name: 'Losartana 50mg', dose: '50mg', frequency: '1x ao dia', lastRefill: '2026-03-01' },
      { name: 'Metformina 850mg', dose: '850mg', frequency: '2x ao dia', lastRefill: '2026-03-01' },
      { name: 'Sinvastatina 20mg', dose: '20mg', frequency: '1x à noite', lastRefill: '2026-02-15' },
    ],
    pendingOrders: [
      { type: 'LABORATORY', description: 'Microalbuminúria', orderedAt: '2026-03-15' },
      { type: 'IMAGING', description: 'Fundo de olho', orderedAt: '2026-02-10' },
    ],
    aiRecommendations: [
      'Considerar ajuste de metformina — HbA1c 7.2% (acima do alvo de 7.0%)',
      'Solicitar fundo de olho — pendente desde fevereiro',
      'Verificar adesão — sinvastatina sem refill há 38 dias',
      'Colesterol total elevado — avaliar intensificação da estatina',
    ],
    riskAlerts: [
      'Risco cardiovascular moderado-alto (ASCVD score estimado: 12.5%)',
      'Microalbuminúria pendente — rastreio de nefropatia diabética em atraso',
    ],
  }),

  [AgentType.FOLLOW_UP]: (patientId, params) => ({
    patientId,
    encounterId: params['encounterId'] ?? randomUUID(),
    scheduledContact: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    contactMethod: 'WhatsApp',
    questions: [
      'Está tomando os medicamentos prescritos corretamente?',
      'Apresentou algum efeito colateral?',
      'Houve melhora dos sintomas?',
      'Conseguiu realizar os exames solicitados?',
      'Está conseguindo seguir as orientações dietéticas?',
    ],
    escalationRules: [
      { condition: 'Febre > 38.5°C', action: 'Contato telefônico imediato' },
      { condition: 'Efeito colateral grave', action: 'Agendar retorno de urgência' },
      { condition: 'Piora dos sintomas', action: 'Notificar médico assistente' },
    ],
    reminderSchedule: [
      { day: 1, type: 'medicamento', message: 'Lembre-se de tomar a metformina no café da manhã e jantar' },
      { day: 3, type: 'questionário', message: 'Questionário de acompanhamento enviado' },
      { day: 7, type: 'exames', message: 'Lembrete: realizar exames solicitados' },
    ],
  }),

  [AgentType.INBOX_TRIAGE]: (_patientId, _params) => ({
    totalMessages: 18,
    triaged: 18,
    categories: {
      urgent: 2,
      routine: 8,
      administrative: 5,
      informational: 3,
    },
    urgent: [
      {
        messageId: randomUUID(),
        patientName: 'Maria Oliveira',
        subject: 'Dor no peito intensa desde ontem',
        urgencyReason: 'Sintoma cardíaco agudo — possível emergência',
        suggestedResponse: 'Sra. Maria, dor torácica intensa requer avaliação imediata. Procure o PS mais próximo ou ligue 192 (SAMU).',
        suggestedAction: 'ESCALATE_EMERGENCY',
      },
      {
        messageId: randomUUID(),
        patientName: 'Pedro Santos',
        subject: 'Glicemia 350 mg/dL',
        urgencyReason: 'Hiperglicemia severa em paciente diabético',
        suggestedResponse: 'Sr. Pedro, glicemia de 350 é preocupante. Tome a medicação prescrita e procure atendimento médico hoje.',
        suggestedAction: 'SCHEDULE_URGENT',
      },
    ],
    routine: [
      {
        messageId: randomUUID(),
        patientName: 'Carlos Mendes',
        subject: 'Dúvida sobre horário da metformina',
        suggestedResponse: 'Sr. Carlos, a metformina deve ser tomada junto ou logo após as refeições. Mantenha 850mg no almoço e jantar.',
      },
    ],
    estimatedTimeSaved: 45, // minutes
  }),

  [AgentType.PRIOR_AUTH]: (patientId, params) => ({
    taskId: randomUUID(),
    patientId,
    encounterId: params['encounterId'] ?? randomUUID(),
    formGenerated: true,
    clinicalJustification:
      'Paciente com diagnóstico de neoplasia maligna de mama (C50.9), confirmado por biópsia ' +
      '(AP: carcinoma ductal invasivo, grau II). Estadiamento T2N1M0 (IIB). ' +
      'Indicação de quimioterapia neoadjuvante conforme protocolo AC-T.',
    supportingDocuments: [
      'Laudo anatomopatológico (20/03/2026)',
      'Estadiamento (TC tórax + abdome + cintilografia)',
      'Parecer de junta médica oncológica (18/03/2026)',
    ],
    insuranceInfo: {
      plan: 'Unimed Ouro',
      authorization: 'Quimioterapia neoadjuvante',
      procedureCodes: ['0304010394', '0304010408'],
    },
    submissionStatus: 'SUBMITTED',
    estimatedResponseTime: '5-10 dias úteis',
    approvalProbability: 0.92,
  }),

  [AgentType.REFERRAL]: (patientId, params) => ({
    patientId,
    recommendedSpecialty: (params['focusAreas'] as string[] | undefined)?.[0] ?? 'Nefrologia',
    reasoning:
      'TFG estimada: 38 mL/min (CKD-EPI). Proteinúria 800 mg/24h. ' +
      'KDIGO recomenda encaminhamento para TFG < 45 ou proteinúria > 500.',
    suggestedSpecialists: [
      { name: 'Dra. Fernanda Costa', specialty: 'Nefrologia', availability: '10/04/2026', rating: 4.8 },
      { name: 'Dr. Ricardo Lima', specialty: 'Nefrologia', availability: '15/04/2026', rating: 4.6 },
    ],
    referralLetter:
      'Prezado(a) colega nefrologista,\n\n' +
      'Encaminho para avaliação de DRC.\nTFG: 38 mL/min | Proteinúria: 800 mg/24h | Cr: 1.8\n' +
      'Comorbidades: HAS, DM2.\nMedicamentos: Losartana 50mg, Metformina 850mg.\n\n' +
      'Atenciosamente.',
    urgency: 'PRIORITÁRIO',
  }),

  [AgentType.SUMMARIZE]: (patientId, _params) => ({
    patientId,
    summary:
      'Paciente masculino, 61 anos, com HAS e DM2 em tratamento. Última consulta em 15/03/2026 com ' +
      'glicemia 126 (acima do alvo), PA 140/90 mmHg. HbA1c 7.2%. Sem complicações microvasculares documentadas. ' +
      'Alergia a dipirona. Em uso de losartana, metformina e sinvastatina.',
    demographics: { name: 'João da Silva', age: '61 anos', gender: 'Masculino', bloodType: 'O+' },
    problemList: [
      { condition: 'Hipertensão arterial sistêmica (I10)', status: 'ACTIVE' },
      { condition: 'Diabetes mellitus tipo 2 (E11)', status: 'ACTIVE' },
      { condition: 'Dislipidemia (E78.5)', status: 'ACTIVE' },
    ],
    medicationList: [
      { name: 'Losartana', dose: '50mg 1x/dia' },
      { name: 'Metformina', dose: '850mg 2x/dia' },
      { name: 'Sinvastatina', dose: '20mg 1x/noite' },
    ],
    recentEncounters: [
      { date: '2026-03-15', type: 'CONSULTATION', summary: 'Retorno — glicemia e PA acima do alvo' },
      { date: '2026-01-10', type: 'CONSULTATION', summary: 'Rotina — adicionada sinvastatina' },
    ],
    allergyList: [{ substance: 'Dipirona', severity: 'MODERATE', reaction: 'Exantema urticariforme' }],
  }),

  [AgentType.PRE_FILL_FORM]: (patientId, params) => ({
    patientId,
    formType: (params['parameters'] as Record<string, string> | undefined)?.['formType'] ?? 'admission',
    prefilledFields: {
      patientName: 'João da Silva',
      birthDate: '1965-03-15',
      cpf: '123.456.789-00',
      bloodType: 'O_POS',
      allergies: ['Dipirona — reação moderada'],
      currentMedications: ['Losartana 50mg', 'Metformina 850mg', 'Sinvastatina 20mg'],
      mainDiagnosis: 'Hipertensão arterial sistêmica',
      emergencyContact: 'Maria da Silva — (11) 99999-1234',
    },
    confidence: 0.92,
    suggestedValues: {
      chiefComplaint: 'Retorno para acompanhamento de HAS e DM2',
      admissionReason: 'Acompanhamento ambulatorial',
    },
  }),
};

@Injectable()
export class AgenticAiService {
  private readonly logger = new Logger(AgenticAiService.name);
  private readonly tasks = new Map<string, AgentTask>();
  private readonly agentConfigs: Map<string, AgentConfig>;

  constructor() {
    this.agentConfigs = new Map(DEFAULT_AGENTS.map((a) => [a.agentType, { ...a }]));
  }

  // ─── List All Available Agents ───────────────────────────────────────────

  async listAgents(tenantId: string): Promise<AgentDefinitionDto[]> {
    this.logger.log(`Listing agents for tenant ${tenantId}`);

    return Array.from(this.agentConfigs.values()).map((config) => {
      const tasks = Array.from(this.tasks.values()).filter(
        (t) => t.tenantId === tenantId && t.type === config.agentType,
      );
      const completed = tasks.filter((t) => t.status === AgentTaskStatus.COMPLETED);

      return {
        agentType: config.agentType,
        name: config.name,
        description: config.description,
        enabled: config.enabled,
        autoExecute: config.autoExecute,
        priority: config.priority,
        timeoutSeconds: config.timeoutSeconds,
        customPrompt: config.customPrompt,
        totalExecutions: tasks.length,
        avgDurationMs: completed.length > 0
          ? Math.round(completed.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()), 0) / completed.length)
          : 0,
        successRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) / 100 : 1.0,
      };
    });
  }

  // ─── Execute Agent by Type ───────────────────────────────────────────────

  async executeAgent(
    tenantId: string,
    userId: string,
    agentType: AgentType,
    patientId: string,
    encounterId?: string,
    focusAreas?: string[],
    parameters?: Record<string, string>,
  ): Promise<AgentTaskResponseDto> {
    const config = this.agentConfigs.get(agentType);
    if (!config) {
      throw new NotFoundException(`Agent type "${agentType}" not found`);
    }
    if (!config.enabled) {
      throw new BadRequestException(`Agent "${config.name}" is currently disabled`);
    }

    this.logger.log(`Executing agent ${agentType} for patient ${patientId}`);

    const task = this.createTask(tenantId, userId, agentType, {
      patientId,
      encounterId,
      focusAreas,
      parameters,
    });
    task.patientId = patientId;
    task.encounterId = encounterId;

    // Execute the agent
    const executor = AGENT_EXECUTORS[agentType];
    if (executor) {
      task.result = executor(patientId, { encounterId, focusAreas, parameters }) as Record<string, unknown>;
      task.status = AgentTaskStatus.COMPLETED;
      task.completedAt = new Date();
    } else {
      task.status = AgentTaskStatus.FAILED;
      task.error = `No executor configured for agent type: ${agentType}`;
      task.completedAt = new Date();
    }

    return this.toResponse(task);
  }

  // ─── Update Agent Configuration ──────────────────────────────────────────

  async updateAgentConfig(
    tenantId: string,
    agentType: AgentType,
    updates: {
      enabled?: boolean;
      autoExecute?: boolean;
      priority?: number;
      timeoutSeconds?: number;
      customPrompt?: string;
    },
  ): Promise<AgentDefinitionDto> {
    const config = this.agentConfigs.get(agentType);
    if (!config) {
      throw new NotFoundException(`Agent type "${agentType}" not found`);
    }

    this.logger.log(`Updating config for agent ${agentType}: ${JSON.stringify(updates)}`);

    if (updates.enabled !== undefined) config.enabled = updates.enabled;
    if (updates.autoExecute !== undefined) config.autoExecute = updates.autoExecute;
    if (updates.priority !== undefined) config.priority = updates.priority;
    if (updates.timeoutSeconds !== undefined) config.timeoutSeconds = updates.timeoutSeconds;
    if (updates.customPrompt !== undefined) config.customPrompt = updates.customPrompt;

    const tasks = Array.from(this.tasks.values()).filter(
      (t) => t.tenantId === tenantId && t.type === agentType,
    );
    const completed = tasks.filter((t) => t.status === AgentTaskStatus.COMPLETED);

    return {
      agentType: config.agentType,
      name: config.name,
      description: config.description,
      enabled: config.enabled,
      autoExecute: config.autoExecute,
      priority: config.priority,
      timeoutSeconds: config.timeoutSeconds,
      customPrompt: config.customPrompt,
      totalExecutions: tasks.length,
      avgDurationMs: completed.length > 0
        ? Math.round(completed.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()), 0) / completed.length)
        : 0,
      successRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) / 100 : 1.0,
    };
  }

  // ─── List Tasks with Pagination ──────────────────────────────────────────

  async listTasks(
    tenantId: string,
    agentType?: AgentType,
    status?: AgentTaskStatus,
    patientId?: string,
    page = 1,
    limit = 20,
  ): Promise<AgentTaskListResponseDto> {
    let tasks = Array.from(this.tasks.values())
      .filter((t) => t.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (agentType) tasks = tasks.filter((t) => t.type === agentType);
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (patientId) tasks = tasks.filter((t) => t.patientId === patientId);

    const total = tasks.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = tasks.slice(offset, offset + limit).map((t) => this.toResponse(t));

    return { items, total, page, limit, totalPages };
  }

  // ─── Get Task Details ────────────────────────────────────────────────────

  async getTask(tenantId: string, taskId: string): Promise<AgentTaskResponseDto> {
    const task = this.tasks.get(taskId);
    if (!task || task.tenantId !== tenantId) {
      throw new NotFoundException(`Agent task ${taskId} not found`);
    }
    return this.toResponse(task);
  }

  // ─── Agent Performance Metrics ───────────────────────────────────────────

  async getMetrics(tenantId: string): Promise<AgentMetricsResponseDto> {
    const allTasks = Array.from(this.tasks.values()).filter((t) => t.tenantId === tenantId);
    const completed = allTasks.filter((t) => t.status === AgentTaskStatus.COMPLETED);
    const failed = allTasks.filter((t) => t.status === AgentTaskStatus.FAILED);

    const now = Date.now();
    const last24h = allTasks.filter((t) => now - t.createdAt.getTime() < 24 * 3600 * 1000);
    const last7d = allTasks.filter((t) => now - t.createdAt.getTime() < 7 * 24 * 3600 * 1000);

    const byAgent = Array.from(this.agentConfigs.values()).map((config) => {
      const agentTasks = allTasks.filter((t) => t.type === config.agentType);
      const agentCompleted = agentTasks.filter((t) => t.status === AgentTaskStatus.COMPLETED);
      return {
        agentType: config.agentType,
        totalTasks: agentTasks.length,
        completedTasks: agentCompleted.length,
        avgDurationMs: agentCompleted.length > 0
          ? Math.round(agentCompleted.reduce((s, t) => s + (t.completedAt!.getTime() - t.createdAt.getTime()), 0) / agentCompleted.length)
          : 0,
        successRate: agentTasks.length > 0 ? Math.round((agentCompleted.length / agentTasks.length) * 100) / 100 : 1.0,
      };
    });

    // Estimate time saved: ~3 min per completed task
    const timeSavedMinutes = completed.length * 3;

    return {
      totalTasks: allTasks.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      avgDurationMs: completed.length > 0
        ? Math.round(completed.reduce((s, t) => s + (t.completedAt!.getTime() - t.createdAt.getTime()), 0) / completed.length)
        : 0,
      successRate: allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) / 100 : 1.0,
      byAgent,
      timeSavedHours: Math.round((timeSavedMinutes / 60) * 10) / 10,
      tasksLast24h: last24h.length,
      tasksLast7d: last7d.length,
    };
  }

  // ─── Legacy Methods (backward compatibility) ─────────────────────────────

  async prepareConsultation(
    tenantId: string,
    userId: string,
    patientId: string,
    encounterId: string,
    focusAreas?: string[],
  ): Promise<ConsultationPrepResponseDto> {
    const taskResp = await this.executeAgent(
      tenantId, userId, AgentType.PRE_VISIT_PREP, patientId, encounterId, focusAreas,
    );
    return { taskId: taskResp.id, ...taskResp.result } as ConsultationPrepResponseDto;
  }

  async preFillForm(
    tenantId: string,
    userId: string,
    patientId: string,
    formType: string,
    encounterId?: string,
  ): Promise<PreFilledFormResponseDto> {
    const taskResp = await this.executeAgent(
      tenantId, userId, AgentType.PRE_FILL_FORM, patientId, encounterId, undefined, { formType },
    );
    return { taskId: taskResp.id, formType, ...taskResp.result } as PreFilledFormResponseDto;
  }

  async summarizePatient(
    tenantId: string,
    userId: string,
    patientId: string,
    _summaryType = 'comprehensive',
    _fromDate?: string,
  ): Promise<PatientSummaryAgentResponseDto> {
    const taskResp = await this.executeAgent(
      tenantId, userId, AgentType.SUMMARIZE, patientId,
    );
    return { taskId: taskResp.id, ...taskResp.result } as PatientSummaryAgentResponseDto;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private createTask(
    tenantId: string,
    userId: string,
    type: AgentType,
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
    const durationMs = task.completedAt
      ? task.completedAt.getTime() - task.createdAt.getTime()
      : Date.now() - task.createdAt.getTime();

    return {
      id: task.id,
      type: task.type as AgentType,
      status: task.status,
      patientId: task.patientId,
      encounterId: task.encounterId,
      result: task.result,
      error: task.error,
      durationMs,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
  }
}
