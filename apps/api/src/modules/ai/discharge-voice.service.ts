import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface ParsedDischarge {
  dischargeType: string;
  condition: string;
  followUpDays?: number;
  instructions: string;
  followUpSpecialty?: string;
  warningSignals?: string[];
  homeMedications?: string[];
  restrictions?: string[];
  confidence: number;
}

const DISCHARGE_PARSE_PROMPT = `Voce e um assistente medico especializado em altas hospitalares brasileiras.
Dado um texto ditado por um medico, extraia as informacoes para processar a alta do paciente.

Extraia:
- dischargeType: CURADO, MELHORADO (mais comum), INALTERADO, AGRAVADO, OBITO, TRANSFERENCIA, EVASAO, A_PEDIDO
- condition: ESTAVEL, INSTAVEL, GRAVE ou CRITICO
- followUpDays: dias para retorno (inteiro, opcional)
- instructions: orientacoes detalhadas para o paciente (texto formal)
- followUpSpecialty: especialidade para retorno (ex: "Clinica Geral", "Cardiologia")
- warningSignals: sinais de alerta para retorno ao PS (array de strings)
- homeMedications: medicacoes para continuar em casa (array de strings)
- restrictions: restricoes de atividade (array de strings)
- confidence: 0.0 a 1.0

Regras:
- "alta melhorado" = dischargeType: MELHORADO, condition: ESTAVEL
- "alta com retorno em 7 dias" = followUpDays: 7
- Se nao mencionar tipo, use MELHORADO
- Se nao mencionar condicao, use ESTAVEL
- As orientacoes devem ser completas e em linguagem acessivel ao paciente
- Inclua sinais de alerta comuns para a condicao detectada
- "alta a pedido" = dischargeType: A_PEDIDO (paciente assina TCLE)
- "transferencia para UTI" = dischargeType: TRANSFERENCIA

Retorne JSON:
{
  "dischargeType": "...",
  "condition": "...",
  "followUpDays": N,
  "instructions": "...",
  "followUpSpecialty": "...",
  "warningSignals": ["..."],
  "homeMedications": ["..."],
  "restrictions": ["..."],
  "confidence": 0.0-1.0
}`;

@Injectable()
export class DischargeVoiceService {
  private readonly logger = new Logger(DischargeVoiceService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  async parseVoiceDischarge(text: string): Promise<ParsedDischarge> {
    const startTime = Date.now();
    this.logger.log(`parseVoiceDischarge called - textLength: ${text.length}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: DISCHARGE_PARSE_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.defaultDischarge();
      }

      const parsed = JSON.parse(content) as ParsedDischarge;
      this.logger.log(
        `parseVoiceDischarge completed in ${Date.now() - startTime}ms — type: ${parsed.dischargeType}, condition: ${parsed.condition}`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `parseVoiceDischarge failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      try {
        const geminiResult = await this.gemini.generateJson<ParsedDischarge>(
          DISCHARGE_PARSE_PROMPT,
          text,
        );
        if (geminiResult) return geminiResult;
      } catch (fallbackError) {
        this.logger.warn(
          `Gemini fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }

      return this.defaultDischarge();
    }
  }

  private defaultDischarge(): ParsedDischarge {
    return {
      dischargeType: 'MELHORADO',
      condition: 'ESTAVEL',
      instructions: '',
      confidence: 0,
    };
  }
}
