import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

@Injectable()
export class PatientSummaryAiService {
  private readonly logger = new Logger(PatientSummaryAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Generate a concise patient summary from comprehensive patient data
   */
  async generateSummary(patient: Record<string, unknown>): Promise<string> {
    const startTime = Date.now();
    this.logger.log(
      `generateSummary called - patientId: ${patient.id}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de resumo clínico para médicos.
Gere um resumo CONCISO (3-5 frases) do paciente que permita ao médico ter uma visão rápida antes da consulta.

O resumo deve incluir, quando disponível:
1. Dados demográficos relevantes (idade, sexo)
2. Condições crônicas e diagnósticos principais
3. Alergias importantes
4. Medicações em uso contínuo
5. Último atendimento e motivo
6. Fatores de risco relevantes
7. Pendências ou itens de atenção (exames atrasados, retornos perdidos)

Formato:
- Texto corrido, objetivo, em português brasileiro médico
- 3-5 frases no máximo
- Destaque urgências ou itens que requerem atenção imediata com [ATENÇÃO:]
- Não repita informações
- Se dados forem insuficientes, resuma o que houver sem inventar

Exemplo:
"Paciente feminina, 62 anos, portadora de DM2 (HbA1c 8.2% em jan/2026), HAS e dislipidemia. Em uso de metformina 850mg 2x/dia, losartana 50mg/dia e sinvastatina 20mg/dia. Alérgica a sulfa e AINEs. Último atendimento em 15/02/2026 por descompensação glicêmica. [ATENÇÃO: Fundo de olho atrasado — último em 2024. Creatinina em elevação progressiva (1.4 -> 1.8 mg/dL nos últimos 6 meses)]."`,
          },
          {
            role: 'user',
            content: `Dados do paciente:\n${JSON.stringify(patient, null, 2)}`,
          },
        ],
        temperature: 0.2,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '';
      this.logger.log(
        `generateSummary completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      return content;
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateSummary, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        return await this.gemini.generateText(
          `Dados do paciente:\n${JSON.stringify(patient, null, 2)}`,
          `Gere um resumo clínico CONCISO (3-5 frases) do paciente em português brasileiro médico. Inclua: dados demográficos, condições crônicas, alergias, medicações, último atendimento, fatores de risco. Destaque urgências com [ATENÇÃO:].`,
        );
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for generateSummary after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return 'Erro ao gerar resumo do paciente. Consulte o prontuário completo.';
      }
    }
  }
}
