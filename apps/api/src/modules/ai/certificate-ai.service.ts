import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface ParsedCertificate {
  days: number;
  cidCode?: string;
  cidDescription?: string;
  justification: string;
  certificateType: string;
  restrictions?: string;
  confidence: number;
}

const CERTIFICATE_PARSE_PROMPT = `Voce e um assistente medico especializado em atestados medicos brasileiros.
Dado um texto ditado por um medico, extraia as informacoes para gerar um atestado.

Extraia:
- days: numero de dias de afastamento (inteiro)
- cidCode: codigo CID-10 (ex: "J06.9", "M54.5") — se mencionado ou se voce conseguir inferir
- cidDescription: descricao do CID-10
- justification: texto de justificativa medica para o atestado (formal, em terceira pessoa)
- certificateType: AFASTAMENTO (mais comum), COMPARECIMENTO, APTIDAO, ACOMPANHANTE ou OBITO
- restrictions: restricoes adicionais se mencionadas (ex: "evitar esforco fisico")
- confidence: 0.0 a 1.0

Regras:
- "atestado de 3 dias" = days: 3, certificateType: AFASTAMENTO
- "atestado de comparecimento" = certificateType: COMPARECIMENTO, days: 0
- Se nao mencionar CID, tente inferir pelo contexto clinico
- A justificativa deve ser formal: "Atesto para os devidos fins que o(a) paciente necessita de afastamento de suas atividades por N dias..."
- "5 dias por gripe" → days: 5, cidCode: "J11", cidDescription: "Influenza devida a virus nao identificado"

Retorne JSON:
{
  "days": N,
  "cidCode": "...",
  "cidDescription": "...",
  "justification": "...",
  "certificateType": "...",
  "restrictions": "...",
  "confidence": 0.0-1.0
}`;

@Injectable()
export class CertificateAiService {
  private readonly logger = new Logger(CertificateAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  async parseVoiceCertificate(text: string): Promise<ParsedCertificate> {
    const startTime = Date.now();
    this.logger.log(`parseVoiceCertificate called - textLength: ${text.length}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: CERTIFICATE_PARSE_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.defaultCertificate();
      }

      const parsed = JSON.parse(content) as ParsedCertificate;
      this.logger.log(
        `parseVoiceCertificate completed in ${Date.now() - startTime}ms — type: ${parsed.certificateType}, days: ${parsed.days}`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `parseVoiceCertificate failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      try {
        const geminiResult = await this.gemini.generateJson<ParsedCertificate>(
          CERTIFICATE_PARSE_PROMPT,
          text,
        );
        if (geminiResult) return geminiResult;
      } catch (fallbackError) {
        this.logger.warn(
          `Gemini fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }

      return this.defaultCertificate();
    }
  }

  private defaultCertificate(): ParsedCertificate {
    return {
      days: 1,
      justification: '',
      certificateType: 'AFASTAMENTO',
      confidence: 0,
    };
  }
}
