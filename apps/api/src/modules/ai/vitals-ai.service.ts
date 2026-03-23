import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface ParsedVitals {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  gcs?: number;
  painScale?: number;
  painLocation?: string;
  weight?: number;
  height?: number;
  glucoseLevel?: number;
  confidence: number;
  summary: string;
}

const VITALS_PARSE_PROMPT = `Voce e um assistente medico especializado em extracao de sinais vitais.
Dado um texto ditado por um profissional de saude, extraia os sinais vitais mencionados.

Campos possiveis:
- systolicBP: pressao arterial sistolica em mmHg (inteiro)
- diastolicBP: pressao arterial diastolica em mmHg (inteiro)
- heartRate: frequencia cardiaca em bpm (inteiro)
- respiratoryRate: frequencia respiratoria em irpm (inteiro)
- temperature: temperatura em graus Celsius (decimal, ex: 36.5)
- oxygenSaturation: saturacao de O2 em % (inteiro)
- gcs: escala de coma de Glasgow (inteiro 3-15)
- painScale: escala de dor (inteiro 0-10)
- painLocation: local da dor (texto)
- weight: peso em kg (decimal)
- height: altura em cm (inteiro)
- glucoseLevel: glicemia em mg/dL (inteiro)
- confidence: 0.0 a 1.0
- summary: resumo formatado dos sinais vitais (ex: "PA 120x80, FC 78, FR 18, Tax 36.5, SpO2 97%")

Regras de conversao:
- "12 por 8" ou "12/8" = systolicBP: 120, diastolicBP: 80
- "13 por 9" = systolicBP: 130, diastolicBP: 90
- "pressao 14 por 9" = systolicBP: 140, diastolicBP: 90
- "saturacao 97" ou "sat 97" ou "sato2 97" = oxygenSaturation: 97
- "frequencia 80" ou "FC 80" = heartRate: 80
- "temperatura 37 e meio" = temperature: 37.5
- "37 e 8" ou "37,8" = temperature: 37.8
- "glicemia 110" ou "dextro 110" ou "HGT 110" = glucoseLevel: 110
- "Glasgow 15" ou "GCS 15" = gcs: 15
- "dor 7 de 10" ou "EVA 7" = painScale: 7
- "peso 72 quilos" = weight: 72
- "altura 1 metro e 70" ou "170 centimetros" = height: 170

Retorne APENAS os campos detectados (nao inclua campos com valor null/undefined).

Retorne JSON:
{
  "systolicBP": ...,
  "diastolicBP": ...,
  ...outros campos detectados...
  "confidence": 0.0-1.0,
  "summary": "..."
}`;

@Injectable()
export class VitalsAiService {
  private readonly logger = new Logger(VitalsAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  async parseVoiceVitals(text: string): Promise<ParsedVitals> {
    const startTime = Date.now();
    this.logger.log(`parseVoiceVitals called - textLength: ${text.length}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: VITALS_PARSE_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { confidence: 0, summary: '' };
      }

      const parsed = JSON.parse(content) as ParsedVitals;
      this.logger.log(
        `parseVoiceVitals completed in ${Date.now() - startTime}ms — summary: "${parsed.summary}"`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `parseVoiceVitals failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      try {
        const geminiResult = await this.gemini.generateJson<ParsedVitals>(
          VITALS_PARSE_PROMPT,
          text,
        );
        if (geminiResult) return geminiResult;
      } catch (fallbackError) {
        this.logger.warn(
          `Gemini fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }

      return { confidence: 0, summary: '' };
    }
  }
}
