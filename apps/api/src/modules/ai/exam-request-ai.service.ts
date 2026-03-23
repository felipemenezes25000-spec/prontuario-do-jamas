import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import type { ParsedExamItem } from './dto/exam-request-ai.dto';

export interface ParsedExamRequest {
  items: ParsedExamItem[];
  suggestedIndication: string;
}

const EXAM_PARSE_PROMPT = `Voce e um assistente medico especializado em solicitacoes de exames.
Dado um texto ditado por um medico, extraia os exames solicitados com seus detalhes.

Para cada exame, identifique:
- examName: nome do exame (padronizado, ex: "Hemograma completo", "Raio-X de torax PA e perfil")
- examType: LABORATORIAL, IMAGEM, FUNCIONAL, ANATOMOPATOLOGICO ou OUTRO
- tussCode: codigo TUSS se voce souber (opcional)
- urgency: ROTINA (padrao), URGENTE ou EMERGENCIA
- clinicalIndication: indicacao clinica especifica para o exame
- confidence: 0.0 a 1.0

Tambem sugira uma indicacao clinica geral (suggestedIndication) baseada no contexto.

Regras:
- "hemograma" = "Hemograma completo" (LABORATORIAL)
- "RX torax" ou "raio x de torax" = "Raio-X de torax PA e perfil" (IMAGEM)
- "ECG" ou "eletro" = "Eletrocardiograma" (FUNCIONAL)
- "ultrassom" ou "eco" pode ser varios exames — infira pelo contexto
- "PCR" = "Proteina C Reativa" (LABORATORIAL), nao confundir com exame de PCR molecular
- Se urgencia nao for mencionada, use ROTINA

Retorne JSON:
{
  "items": [...],
  "suggestedIndication": "..."
}`;

@Injectable()
export class ExamRequestAiService {
  private readonly logger = new Logger(ExamRequestAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  async parseVoiceExamRequest(text: string, clinicalIndication?: string): Promise<ParsedExamRequest> {
    const startTime = Date.now();
    this.logger.log(`parseVoiceExamRequest called - textLength: ${text.length}`);

    const userMessage = clinicalIndication
      ? `Texto: "${text}"\nIndicacao clinica adicional: "${clinicalIndication}"`
      : `Texto: "${text}"`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: EXAM_PARSE_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { items: [], suggestedIndication: '' };
      }

      const parsed = JSON.parse(content) as ParsedExamRequest;
      this.logger.log(
        `parseVoiceExamRequest completed in ${Date.now() - startTime}ms — ${parsed.items.length} exams found`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `parseVoiceExamRequest failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Fallback to Gemini
      try {
        const geminiResult = await this.gemini.generateJson<ParsedExamRequest>(
          EXAM_PARSE_PROMPT,
          userMessage,
        );
        if (geminiResult) return geminiResult;
      } catch (fallbackError) {
        this.logger.warn(
          `Gemini fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }

      return { items: [], suggestedIndication: '' };
    }
  }
}
