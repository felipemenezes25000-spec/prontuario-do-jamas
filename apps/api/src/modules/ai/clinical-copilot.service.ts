import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface CopilotSuggestion {
  type: string;
  text: string;
  confidence: number;
  source: string;
  actionable: boolean;
}

@Injectable()
export class ClinicalCopilotService {
  private readonly logger = new Logger(ClinicalCopilotService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
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
            content: `Você é um copiloto clínico inteligente que auxilia médicos durante a consulta em tempo real.
Com base na transcrição atual da consulta e no histórico do paciente, gere sugestões úteis.

Tipos de sugestões a considerar:
1. "warning" — Alertas de segurança (interações medicamentosas, alergias, contraindicações)
2. "suggestion" — Sugestões clínicas (exames a solicitar, diagnósticos diferenciais, protocolos)
3. "info" — Informações relevantes (exames preventivos em atraso, vacinas, rastreamentos por idade/sexo)
4. "reminder" — Lembretes (renovação de receitas, retornos pendentes, resultados de exames aguardando)

Analise especificamente:
- Exames preventivos que podem estar em atraso (mamografia, colonoscopia, PSA, HbA1c, etc.) com base em idade/sexo/condições
- Medicamentos mencionados na consulta vs alergias/medicações do paciente
- Sintomas que possam indicar diagnósticos não mencionados
- Protocolos clínicos aplicáveis
- Renovação de receitas de uso contínuo
- Vacinação em dia

Retorne JSON:
{
  "suggestions": [
    {
      "type": "warning|suggestion|info|reminder",
      "text": "texto da sugestão, claro e conciso",
      "confidence": 0.0-1.0,
      "source": "fonte ou base da sugestão (ex: 'Protocolo MS 2024', 'Histórico do paciente', 'Interação medicamentosa')",
      "actionable": true/false
    }
  ]
}

Limite: máximo 8 sugestões, priorizadas por relevância e urgência.
Coloque warnings primeiro, depois suggestions, info, reminders.`,
          },
          {
            role: 'user',
            content: `Transcrição atual da consulta:
${transcription}

Dados do atendimento:
${JSON.stringify(encounter, null, 2)}

Histórico do paciente:
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

      const parsed = JSON.parse(content);
      return parsed.suggestions ?? [];
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for getSuggestions, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const geminiResult = await this.gemini.generateJson<{ suggestions: CopilotSuggestion[] }>(
          `Transcrição atual da consulta:\n${transcription}\n\nDados do atendimento:\n${JSON.stringify(encounter, null, 2)}\n\nHistórico do paciente:\n${JSON.stringify(patientHistory, null, 2)}`,
          `Você é um copiloto clínico. Gere sugestões (warning, suggestion, info, reminder) para o médico. Retorne JSON com "suggestions" array de {type, text, confidence, source, actionable}. Máximo 8 sugestões.`,
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
}
