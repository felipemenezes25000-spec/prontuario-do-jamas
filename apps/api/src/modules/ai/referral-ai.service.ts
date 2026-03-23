import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface ParsedReferral {
  specialty: string;
  reason: string;
  urgency: string;
  cidCode?: string;
  clinicalSummary?: string;
  questionsForSpecialist?: string;
  confidence: number;
}

const REFERRAL_PARSE_PROMPT = `Voce e um assistente medico especializado em encaminhamentos/referencias medicas brasileiras.
Dado um texto ditado por um medico, extraia as informacoes para gerar um encaminhamento.

Extraia:
- specialty: especialidade de destino (ex: "Cardiologia", "Ortopedia", "Neurologia")
- reason: motivo do encaminhamento (descricao clinica formal)
- urgency: ROTINA (padrao), PRIORITARIO ou URGENTE
- cidCode: codigo CID-10 se mencionado ou inferivel
- clinicalSummary: resumo clinico breve para o especialista
- questionsForSpecialist: perguntas ou pontos de atencao para o especialista (opcional)
- confidence: 0.0 a 1.0

Regras:
- "encaminhar para cardio" = specialty: "Cardiologia"
- "referencia para orto" = specialty: "Ortopedia"
- Se urgencia nao for mencionada, use ROTINA
- O motivo (reason) deve ser clinico e formal
- Gere um clinicalSummary com dados relevantes mencionados no texto
- Se o medico fizer perguntas especificas ("quero saber se precisa operar"), coloque em questionsForSpecialist

Especialidades comuns (normalizar):
- "cardio" → "Cardiologia"
- "orto" → "Ortopedia"
- "neuro" → "Neurologia"
- "gastro" → "Gastroenterologia"
- "pneumo" → "Pneumologia"
- "nefro" → "Nefrologia"
- "endocrino" → "Endocrinologia"
- "reumato" → "Reumatologia"
- "dermato" → "Dermatologia"
- "oftalmo" → "Oftalmologia"
- "otorrino" → "Otorrinolaringologia"
- "uro" → "Urologia"
- "gine" → "Ginecologia"
- "psiq" → "Psiquiatria"

Retorne JSON:
{
  "specialty": "...",
  "reason": "...",
  "urgency": "...",
  "cidCode": "...",
  "clinicalSummary": "...",
  "questionsForSpecialist": "...",
  "confidence": 0.0-1.0
}`;

@Injectable()
export class ReferralAiService {
  private readonly logger = new Logger(ReferralAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  async parseVoiceReferral(text: string): Promise<ParsedReferral> {
    const startTime = Date.now();
    this.logger.log(`parseVoiceReferral called - textLength: ${text.length}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: REFERRAL_PARSE_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.defaultReferral();
      }

      const parsed = JSON.parse(content) as ParsedReferral;
      this.logger.log(
        `parseVoiceReferral completed in ${Date.now() - startTime}ms — specialty: ${parsed.specialty}, urgency: ${parsed.urgency}`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `parseVoiceReferral failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      try {
        const geminiResult = await this.gemini.generateJson<ParsedReferral>(
          REFERRAL_PARSE_PROMPT,
          text,
        );
        if (geminiResult) return geminiResult;
      } catch (fallbackError) {
        this.logger.warn(
          `Gemini fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }

      return this.defaultReferral();
    }
  }

  private defaultReferral(): ParsedReferral {
    return {
      specialty: '',
      reason: '',
      urgency: 'ROTINA',
      confidence: 0,
    };
  }
}
