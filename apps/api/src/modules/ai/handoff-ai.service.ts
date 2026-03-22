import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface HandoffCriticalItem {
  patient: string;
  item: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface HandoffPendingTask {
  patient: string;
  task: string;
  dueAt?: string;
}

export interface HandoffSummaryResult {
  summary: string;
  criticalItems: HandoffCriticalItem[];
  pendingTasks: HandoffPendingTask[];
}

export interface HandoffPatientData {
  name: string;
  bed: string;
  diagnosis: string;
  currentMedications: string[];
  recentVitals: any;
  pendingOrders: string[];
  alerts: string[];
  nursingNotes: string[];
  significantEvents: string[];
}

@Injectable()
export class HandoffAiService {
  private readonly logger = new Logger(HandoffAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Generate shift handoff summary for a ward/unit
   */
  async generateHandoffSummary(data: {
    ward: string;
    shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    patients: HandoffPatientData[];
  }): Promise<HandoffSummaryResult> {
    const startTime = Date.now();
    this.logger.log(
      `generateHandoffSummary called - ward: ${data.ward}, shift: ${data.shift}, patients: ${data.patients.length}`,
    );

    const shiftNames: Record<string, string> = {
      MORNING: 'Manhã (07h-13h)',
      AFTERNOON: 'Tarde (13h-19h)',
      NIGHT: 'Noite (19h-07h)',
    };

    const systemPrompt = `Você é um sistema especializado em gerar relatórios de passagem de plantão (handoff) hospitalar.

Gere um relatório completo e organizado para a passagem de plantão com as seguintes características:

1. RESUMO GERAL: Visão geral da unidade, número de pacientes, eventos significativos do turno
2. POR PACIENTE (ordenado por prioridade - pacientes críticos primeiro):
   - Estado atual e evolução durante o turno
   - Alterações significativas em sinais vitais
   - Medicações relevantes e próximas doses
   - Pendências e ordens em aberto
   - Alertas e precauções

3. ITENS CRÍTICOS: Ações que o próximo turno DEVE realizar com urgência
4. TAREFAS PENDENTES: Itens que ficaram pendentes e precisam de acompanhamento

Formato de saída JSON:
{
  "summary": "texto completo do relatório de passagem de plantão em formato legível",
  "criticalItems": [
    { "patient": "nome", "item": "descrição do item crítico", "urgency": "HIGH|MEDIUM|LOW" }
  ],
  "pendingTasks": [
    { "patient": "nome", "task": "descrição da tarefa", "dueAt": "horário previsto ou null" }
  ]
}

Priorize segurança do paciente. Destaque:
- Pacientes instáveis ou em deterioração
- Medicamentos de alto risco (vasoativos, anticoagulantes, insulina)
- Exames pendentes com resultado urgente
- Procedimentos agendados
- Restrições e isolamentos`;

    const userPrompt = `Unidade: ${data.ward}
Turno: ${shiftNames[data.shift] ?? data.shift}
Número de pacientes: ${data.patients.length}

Dados dos pacientes:
${data.patients
  .map(
    (p, i) => `
--- Paciente ${i + 1}: ${p.name} (Leito: ${p.bed}) ---
Diagnóstico: ${p.diagnosis}
Medicações atuais: ${p.currentMedications.length > 0 ? p.currentMedications.join(', ') : 'Nenhuma'}
Sinais vitais recentes: ${p.recentVitals ? JSON.stringify(p.recentVitals) : 'Não disponíveis'}
Ordens pendentes: ${p.pendingOrders.length > 0 ? p.pendingOrders.join(', ') : 'Nenhuma'}
Alertas: ${p.alerts.length > 0 ? p.alerts.join(', ') : 'Nenhum'}
Notas de enfermagem: ${p.nursingNotes.length > 0 ? p.nursingNotes.join(' | ') : 'Nenhuma'}
Eventos significativos: ${p.significantEvents.length > 0 ? p.significantEvents.join(' | ') : 'Nenhum'}`,
  )
  .join('\n')}`;

    try {
      return await this.callOpenAIHandoff(systemPrompt, userPrompt, startTime);
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateHandoffSummary, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        return await this.gemini.generateJson<HandoffSummaryResult>(
          userPrompt,
          systemPrompt,
        );
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for generateHandoffSummary: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return {
          summary:
            'Erro ao gerar relatório de passagem de plantão. Por favor, elabore manualmente.',
          criticalItems: [],
          pendingTasks: [],
        };
      }
    }
  }

  private async callOpenAIHandoff(
    systemPrompt: string,
    userPrompt: string,
    startTime: number,
  ): Promise<HandoffSummaryResult> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(
      `generateHandoffSummary completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
    );

    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary ?? '',
      criticalItems: parsed.criticalItems ?? [],
      pendingTasks: parsed.pendingTasks ?? [],
    };
  }
}
