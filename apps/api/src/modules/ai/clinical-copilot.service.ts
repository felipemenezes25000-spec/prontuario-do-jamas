import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { PatientContextBuilder } from './patient-context.builder';
import { AiCacheService } from './ai-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

export interface CopilotSuggestion {
  type: string;
  text: string;
  confidence: number;
  source: string;
  actionable: boolean;
}

export interface ProactiveSuggestion {
  text: string;
  field: string;
  reason: string;
}

@Injectable()
export class ClinicalCopilotService {
  private readonly logger = new Logger(ClinicalCopilotService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
    private readonly patientContextBuilder: PatientContextBuilder,
    private readonly aiCache: AiCacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get AI suggestions based on encounter context, transcription, and patient history
   */
  async getSuggestions(
    encounter: Record<string, unknown>,
    transcription: string,
    patientHistory: Record<string, unknown>,
  ): Promise<CopilotSuggestion[]> {
    const startTime = Date.now();
    this.logger.log(
      `getSuggestions called - encounterId: ${encounter.id}, transcriptionLength: ${transcription.length}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Voce e um copiloto clinico inteligente que auxilia medicos durante a consulta em tempo real.
Com base na transcricao atual da consulta e no historico do paciente, gere sugestoes uteis.

Tipos de sugestoes a considerar:
1. "warning" — Alertas de seguranca (interacoes medicamentosas, alergias, contraindicacoes)
2. "suggestion" — Sugestoes clinicas (exames a solicitar, diagnosticos diferenciais, protocolos)
3. "info" — Informacoes relevantes (exames preventivos em atraso, vacinas, rastreamentos por idade/sexo)
4. "reminder" — Lembretes (renovacao de receitas, retornos pendentes, resultados de exames aguardando)

Analise especificamente:
- Exames preventivos que podem estar em atraso (mamografia, colonoscopia, PSA, HbA1c, etc.) com base em idade/sexo/condicoes
- Medicamentos mencionados na consulta vs alergias/medicacoes do paciente
- Sintomas que possam indicar diagnosticos nao mencionados
- Protocolos clinicos aplicaveis
- Renovacao de receitas de uso continuo
- Vacinacao em dia

Retorne JSON:
{
  "suggestions": [
    {
      "type": "warning|suggestion|info|reminder",
      "text": "texto da sugestao, claro e conciso",
      "confidence": 0.0-1.0,
      "source": "fonte ou base da sugestao (ex: 'Protocolo MS 2024', 'Historico do paciente', 'Interacao medicamentosa')",
      "actionable": true/false
    }
  ]
}

Limite: maximo 8 sugestoes, priorizadas por relevancia e urgencia.
Coloque warnings primeiro, depois suggestions, info, reminders.`,
          },
          {
            role: 'user',
            content: `Transcricao atual da consulta:
${transcription}

Dados do atendimento:
${JSON.stringify(encounter, null, 2)}

Historico do paciente:
${JSON.stringify(patientHistory, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `getSuggestions completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content) as { suggestions?: CopilotSuggestion[] };
      return parsed.suggestions ?? [];
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for getSuggestions, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const geminiResult = await this.gemini.generateJson<{
          suggestions: CopilotSuggestion[];
        }>(
          `Transcricao atual da consulta:\n${transcription}\n\nDados do atendimento:\n${JSON.stringify(encounter, null, 2)}\n\nHistorico do paciente:\n${JSON.stringify(patientHistory, null, 2)}`,
          `Voce e um copiloto clinico. Gere sugestoes (warning, suggestion, info, reminder) para o medico. Retorne JSON com "suggestions" array de {type, text, confidence, source, actionable}. Maximo 8 sugestoes.`,
        );
        return geminiResult.suggestions ?? [];
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for getSuggestions after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return [];
      }
    }
  }

  /**
   * Get proactive copilot suggestions based on current text being typed,
   * the encounter context, and patient history (RAG-lite).
   */
  async getProactiveSuggestions(
    encounterId: string,
    currentText: string,
    field: string,
  ): Promise<ProactiveSuggestion[]> {
    const startTime = Date.now();
    this.logger.log(
      `getProactiveSuggestions called - encounterId: ${encounterId}, field: ${field}, textLength: ${currentText.length}`,
    );

    // Check cache
    const cacheKey = this.buildProactiveCacheKey(encounterId, currentText, field);
    const cached = await this.aiCache.get<ProactiveSuggestion[]>(cacheKey);
    if (cached) {
      this.logger.log('getProactiveSuggestions returning cached result');
      return cached;
    }

    try {
      // Load encounter to get patient context
      const encounter = await this.prisma.encounter.findUnique({
        where: { id: encounterId },
        select: {
          patientId: true,
          chiefComplaint: true,
          type: true,
        },
      });

      let patientContext = 'Dados do paciente: nao disponiveis';
      if (encounter?.patientId) {
        patientContext = await this.patientContextBuilder.build(
          encounter.patientId,
        );
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Voce e um copiloto clinico proativo. O medico esta digitando no campo "${field}" de uma nota clinica.
Com base no texto atual e no contexto do paciente, sugira 2-3 complementos curtos e relevantes.

${patientContext}

Queixa principal: ${encounter?.chiefComplaint ?? 'nao informada'}
Tipo de atendimento: ${encounter?.type ?? 'nao informado'}

Retorne JSON:
{
  "suggestions": [
    {
      "text": "sugestao curta e direta (maximo 100 caracteres)",
      "field": "${field}",
      "reason": "justificativa breve"
    }
  ]
}

Regras:
- Maximo 3 sugestoes
- Cada sugestao deve ser clinicamente relevante ao campo e ao contexto
- Use terminologia medica em portugues brasileiro
- Considere alergias, medicacoes e condicoes do paciente
- Sugestoes devem complementar o que o medico ja escreveu, nao repetir`,
          },
          {
            role: 'user',
            content: `Campo: ${field}\nTexto atual:\n${currentText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `getProactiveSuggestions completed - latency: ${latency}ms`,
      );

      const parsed = JSON.parse(content) as {
        suggestions?: ProactiveSuggestion[];
      };
      const suggestions = parsed.suggestions ?? [];

      // Cache for 60 seconds
      await this.aiCache.set(cacheKey, suggestions, 60);

      return suggestions;
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for getProactiveSuggestions, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const geminiResult = await this.gemini.generateJson<{
          suggestions: ProactiveSuggestion[];
        }>(
          `Campo: ${field}\nTexto atual:\n${currentText}`,
          `Voce e um copiloto clinico proativo. Sugira 2-3 complementos curtos e relevantes para o campo "${field}". Retorne JSON com "suggestions" array de {text, field, reason}. Maximo 3 sugestoes.`,
        );
        return geminiResult.suggestions ?? [];
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for getProactiveSuggestions after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return [];
      }
    }
  }

  private buildProactiveCacheKey(
    encounterId: string,
    text: string,
    field: string,
  ): string {
    const hash = createHash('sha256')
      .update(`${encounterId}|${field}|${text}`)
      .digest('hex')
      .slice(0, 16);
    return `copilot:proactive:${hash}`;
  }
}
