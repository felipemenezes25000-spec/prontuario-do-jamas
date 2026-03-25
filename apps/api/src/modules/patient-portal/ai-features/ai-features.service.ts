import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface ChatbotSession {
  id: string;
  patientId: string;
  tenantId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  triageResult?: {
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    suggestedSpecialty?: string;
    recommendation: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface HealthCoachPlan {
  id: string;
  patientId: string;
  tenantId: string;
  goals: Array<{
    id: string;
    category: string;
    description: string;
    target: string;
    progress: number;
    startDate: string;
    targetDate: string;
  }>;
  recommendations: string[];
  weeklyCheckIns: Array<{
    week: number;
    date: string;
    adherence: number;
    notes: string;
  }>;
  createdAt: string;
}

@Injectable()
export class AiFeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(tenantId: string, userEmail: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException('Nenhum registro de paciente vinculado a esta conta.');
    }
    return patient.id;
  }

  // =========================================================================
  // Pre-consultation Triage Chatbot
  // =========================================================================

  async startTriageChatbot(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const session: ChatbotSession = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      messages: [
        {
          role: 'assistant',
          content: 'Olá! Sou o assistente de triagem do VoxPEP. Descreva seus sintomas principais para que eu possa orientá-lo sobre a melhor especialidade e urgência do atendimento.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[AI:TRIAGE_CHAT] Sessão ${new Date().toLocaleDateString('pt-BR')}`,
        content: JSON.stringify(session),
        status: 'DRAFT',
      },
    });

    return {
      sessionId: doc.id,
      message: session.messages[0].content,
    };
  }

  async sendTriageMessage(tenantId: string, userEmail: string, sessionId: string, message: string) {
    await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: sessionId, tenantId, type: 'CUSTOM', title: { startsWith: '[AI:TRIAGE_CHAT]' } },
    });
    if (!doc) throw new NotFoundException('Sessão de triagem não encontrada.');

    const session = JSON.parse(doc.content ?? '{}') as ChatbotSession;

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // AI triage logic (in production, this calls GPT-4o)
    const triageResponse = this.generateTriageResponse(session.messages);

    session.messages.push({
      role: 'assistant',
      content: triageResponse.message,
      timestamp: new Date().toISOString(),
    });

    if (triageResponse.triageResult) {
      session.triageResult = triageResponse.triageResult;
      session.completedAt = new Date().toISOString();
    }

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify(session) },
    });

    return {
      sessionId,
      message: triageResponse.message,
      triageResult: triageResponse.triageResult ?? null,
      isComplete: !!triageResponse.triageResult,
    };
  }

  private generateTriageResponse(messages: ChatbotSession['messages']): {
    message: string;
    triageResult?: ChatbotSession['triageResult'];
  } {
    const userMessages = messages.filter((m) => m.role === 'user');
    const messageCount = userMessages.length;
    const lastMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() ?? '';

    // Simplified triage logic — in production this calls GPT-4o
    const emergencyKeywords = ['dor no peito', 'falta de ar', 'desmaio', 'convulsão', 'sangramento intenso', 'avc', 'derrame'];
    const highKeywords = ['febre alta', 'dor forte', 'vômito persistente', 'diarreia intensa'];

    if (emergencyKeywords.some((k) => lastMessage.includes(k))) {
      return {
        message: 'Seus sintomas indicam uma situação de EMERGÊNCIA. Procure um pronto-socorro imediatamente ou ligue 192 (SAMU).',
        triageResult: {
          urgency: 'EMERGENCY',
          recommendation: 'Procurar pronto-socorro imediatamente.',
        },
      };
    }

    if (messageCount >= 3) {
      const isHigh = highKeywords.some((k) => lastMessage.includes(k));
      return {
        message: isHigh
          ? 'Baseado nos seus sintomas, recomendo atendimento médico em até 24 horas. Posso agendar uma consulta para você?'
          : 'Entendi seus sintomas. Recomendo uma consulta de rotina. Posso ajudar a agendar um horário?',
        triageResult: {
          urgency: isHigh ? 'HIGH' : 'MEDIUM',
          suggestedSpecialty: 'Clínica Geral',
          recommendation: isHigh
            ? 'Atendimento médico em até 24h.'
            : 'Consulta de rotina recomendada.',
        },
      };
    }

    const followUpQuestions = [
      'Há quanto tempo você está com esses sintomas?',
      'Os sintomas estão piorando, melhorando ou estáveis? Tem febre, dor, náusea ou outro sintoma associado?',
    ];

    return {
      message: followUpQuestions[messageCount - 1] ?? 'Pode me dar mais detalhes sobre seus sintomas?',
    };
  }

  // =========================================================================
  // Patient-friendly Medical Record Summary
  // =========================================================================

  async getPatientSummary(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const [patient, conditions, recentEncounters, activePrescriptions, recentVitals] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: patientId, tenantId },
        select: {
          fullName: true,
          birthDate: true,
          bloodType: true,
          allergies: { where: { status: 'ACTIVE' }, select: { substance: true, severity: true, reaction: true } },
        },
      }),
      this.prisma.chronicCondition.findMany({
        where: { patientId, status: 'ACTIVE' },
        select: { cidDescription: true, diagnosedAt: true },
      }),
      this.prisma.encounter.findMany({
        where: { patientId, tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { type: true, chiefComplaint: true, createdAt: true, primaryDoctor: { select: { name: true } } },
      }),
      this.prisma.prescription.findMany({
        where: { patientId, tenantId, status: 'ACTIVE' },
        include: { items: { select: { medicationName: true, dose: true, frequency: true } } },
      }),
      this.prisma.vitalSigns.findMany({
        where: { patientId },
        take: 1,
        orderBy: { recordedAt: 'desc' },
        select: { systolicBP: true, diastolicBP: true, heartRate: true, temperature: true, recordedAt: true },
      }),
    ]);

    // Generate patient-friendly summary (in production calls GPT-4o)
    const summaryParts: string[] = [];

    if (patient) {
      summaryParts.push(`Resumo de saúde de ${patient.fullName}`);

      if (patient.allergies.length > 0) {
        summaryParts.push(`\nAlergias: ${patient.allergies.map((a) => a.substance).join(', ')}`);
      }
    }

    if (conditions.length > 0) {
      summaryParts.push(`\nCondições ativas: ${conditions.map((c) => c.cidDescription).join(', ')}`);
    }

    if (activePrescriptions.length > 0) {
      summaryParts.push('\nMedicamentos em uso:');
      activePrescriptions.forEach((p) => {
        p.items.forEach((item) => {
          summaryParts.push(`  - ${item.medicationName} ${item.dose ?? ''} — ${item.frequency ?? ''}`);
        });
      });
    }

    if (recentVitals.length > 0) {
      const v = recentVitals[0];
      summaryParts.push(`\nÚltimos sinais vitais (${new Date(v.recordedAt).toLocaleDateString('pt-BR')}):`);
      if (v.systolicBP && v.diastolicBP) summaryParts.push(`  PA: ${v.systolicBP}/${v.diastolicBP} mmHg`);
      if (v.heartRate) summaryParts.push(`  FC: ${v.heartRate} bpm`);
      if (v.temperature) summaryParts.push(`  Temp: ${Number(v.temperature).toFixed(1)} °C`);
    }

    if (recentEncounters.length > 0) {
      summaryParts.push('\nÚltimas consultas:');
      recentEncounters.forEach((e) => {
        summaryParts.push(`  - ${new Date(e.createdAt).toLocaleDateString('pt-BR')}: ${e.chiefComplaint ?? e.type} (Dr(a). ${e.primaryDoctor?.name ?? 'N/A'})`);
      });
    }

    return {
      patientId,
      summary: summaryParts.join('\n'),
      allergies: patient?.allergies ?? [],
      conditions,
      activeMedications: activePrescriptions.flatMap((p) =>
        p.items.map((i) => ({ name: i.medicationName, dose: i.dose, frequency: i.frequency })),
      ),
      recentEncounters: recentEncounters.map((e) => ({
        type: e.type,
        complaint: e.chiefComplaint,
        date: e.createdAt,
        doctor: e.primaryDoctor?.name,
      })),
    };
  }

  // =========================================================================
  // Personalized Health Coach
  // =========================================================================

  async getHealthCoachPlan(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const existingDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: '[AI:HEALTH_COACH]' },
        status: 'SIGNED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingDoc) {
      const plan = JSON.parse(existingDoc.content ?? '{}') as HealthCoachPlan;
      return { planId: existingDoc.id, ...plan };
    }

    return { planId: null, message: 'Nenhum plano de saúde ativo. Solicite a criação de um plano personalizado.' };
  }

  async createHealthCoachPlan(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    // Gather patient data for plan generation
    const [conditions, _vitals, _diary] = await Promise.all([
      this.prisma.chronicCondition.findMany({
        where: { patientId, status: 'ACTIVE' },
        select: { cidDescription: true },
      }),
      this.prisma.vitalSigns.findMany({
        where: { patientId },
        take: 5,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          patientId,
          type: 'CUSTOM',
          title: { startsWith: '[DIARY:' },
          status: { not: 'VOIDED' },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Generate personalized plan (in production calls GPT-4o)
    const goals: HealthCoachPlan['goals'] = [];

    if (conditions.some((c) => c.cidDescription?.toLowerCase().includes('hipertens'))) {
      goals.push({
        id: crypto.randomUUID(),
        category: 'BLOOD_PRESSURE',
        description: 'Controlar pressão arterial',
        target: 'PA < 140/90 mmHg',
        progress: 0,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      });
    }

    if (conditions.some((c) => c.cidDescription?.toLowerCase().includes('diabet'))) {
      goals.push({
        id: crypto.randomUUID(),
        category: 'GLUCOSE',
        description: 'Controlar glicemia',
        target: 'Glicemia jejum < 130 mg/dL',
        progress: 0,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      });
    }

    // Default exercise and wellbeing goals
    goals.push(
      {
        id: crypto.randomUUID(),
        category: 'EXERCISE',
        description: 'Atividade física regular',
        target: '150 min/semana de atividade moderada',
        progress: 0,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        category: 'WELLBEING',
        description: 'Monitorar bem-estar',
        target: 'Registro diário de humor e sintomas',
        progress: 0,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      },
    );

    const plan: HealthCoachPlan = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      goals,
      recommendations: [
        'Mantenha uma alimentação equilibrada com frutas, verduras e grãos integrais.',
        'Beba pelo menos 2 litros de água por dia.',
        'Registre seus sinais vitais diariamente no Diário de Saúde.',
        'Respeite os horários dos medicamentos.',
        'Durma de 7 a 9 horas por noite.',
      ],
      weeklyCheckIns: [],
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[AI:HEALTH_COACH] Plano ${new Date().toLocaleDateString('pt-BR')}`,
        content: JSON.stringify(plan),
        status: 'SIGNED',
      },
    });

    return { planId: doc.id, goals: plan.goals, recommendations: plan.recommendations };
  }

  async updateGoalProgress(
    tenantId: string,
    userEmail: string,
    planId: string,
    goalId: string,
    progress: number,
  ) {
    await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: planId, tenantId, type: 'CUSTOM', title: { startsWith: '[AI:HEALTH_COACH]' } },
    });
    if (!doc) throw new NotFoundException('Plano de saúde não encontrado.');

    const plan = JSON.parse(doc.content ?? '{}') as HealthCoachPlan;
    const goal = plan.goals.find((g) => g.id === goalId);
    if (!goal) throw new NotFoundException('Meta não encontrada.');

    goal.progress = Math.min(100, Math.max(0, progress));

    await this.prisma.clinicalDocument.update({
      where: { id: planId },
      data: { content: JSON.stringify(plan) },
    });

    return { planId, goalId, progress: goal.progress };
  }
}
