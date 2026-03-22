import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

@Injectable()
export class DischargeAiService {
  private readonly logger = new Logger(DischargeAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Generate comprehensive discharge summary from admission data
   */
  async generateDischargeSummary(
    admission: Record<string, unknown>,
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log(
      `generateDischargeSummary called - admissionId: ${admission.id}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema especializado em gerar resumos de alta hospitalar conforme normas do CFM e da ANS.

Gere um sumário de alta completo e profissional em português brasileiro com as seguintes seções:

1. IDENTIFICAÇÃO: dados do paciente e internação
2. MOTIVO DA INTERNAÇÃO: queixa principal e diagnóstico de entrada
3. HISTÓRIA DA DOENÇA ATUAL: resumo da evolução durante a internação
4. PROCEDIMENTOS REALIZADOS: cirurgias, exames invasivos, procedimentos
5. ACHADOS SIGNIFICATIVOS: resultados de exames relevantes, intercorrências
6. DIAGNÓSTICOS FINAIS: com códigos CID-10
7. CONDIÇÃO NA ALTA: estado clínico do paciente no momento da alta
8. MEDICAÇÕES DE ALTA: lista completa de medicações prescritas
9. ORIENTAÇÕES: cuidados pós-alta, restrições, sinais de alerta
10. SEGUIMENTO: retornos agendados, encaminhamentos

Formate o texto de forma clara e profissional, adequado para prontuário médico.
Use apenas informações fornecidas — não invente dados.`,
          },
          {
            role: 'user',
            content: `Dados da internação:\n${JSON.stringify(admission, null, 2)}`,
          },
        ],
        temperature: 0.2,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '';
      this.logger.log(
        `generateDischargeSummary completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      return content;
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateDischargeSummary, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        return await this.gemini.generateText(
          `Dados da internação:\n${JSON.stringify(admission, null, 2)}`,
          `Gere um sumário de alta hospitalar completo em português brasileiro conforme normas do CFM/ANS. Seções: identificação, motivo, HDA, procedimentos, achados, diagnósticos finais com CID-10, condição na alta, medicações, orientações, seguimento.`,
        );
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for generateDischargeSummary after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return 'Erro ao gerar sumário de alta. Por favor, elabore manualmente.';
      }
    }
  }

  /**
   * Generate patient-friendly discharge instructions in simple Portuguese
   */
  async generateDischargeInstructions(
    admission: Record<string, unknown>,
    patient: Record<string, unknown>,
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log(
      `generateDischargeInstructions called - admissionId: ${admission.id}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema que gera instruções de alta PARA O PACIENTE.
As instruções devem ser escritas em linguagem SIMPLES e CLARA, sem jargão médico.
O paciente deve conseguir entender facilmente o que fazer em casa.

Estrutura das instruções:

1. RESUMO (2-3 frases sobre o que aconteceu e como o paciente está)

2. SEUS MEDICAMENTOS (tabela simples):
   - Nome do remédio
   - Quanto tomar
   - Quando tomar (horários claros, ex: "às 8h da manhã e às 8h da noite")
   - Por quanto tempo
   - Cuidados especiais (ex: "tomar com alimento", "não pode com leite")

3. CUIDADOS EM CASA:
   - O que fazer (repouso, curativo, dieta)
   - O que NÃO fazer (esforço, banho de imersão, etc.)

4. SINAIS DE ALERTA — VOLTE AO HOSPITAL SE:
   - Lista clara de sinais que indicam retorno ao hospital
   - Use linguagem direta: "Se tiver febre acima de 38°C"

5. RETORNO:
   - Data e local do retorno
   - Exames para levar no retorno

6. CONTATOS ÚTEIS:
   - Telefone do hospital/ambulatório

Regras:
- Linguagem de 5ª série (evite termos técnicos)
- Frases curtas e diretas
- Use "você" e não "o paciente"
- Horários de medicação em formato de relógio (8h, 14h, 20h)
- Destaque os sinais de alerta
- Seja acolhedor mas objetivo`,
          },
          {
            role: 'user',
            content: `Dados da internação: ${JSON.stringify(admission, null, 2)}

Dados do paciente: ${JSON.stringify(patient, null, 2)}`,
          },
        ],
        temperature: 0.3,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '';
      this.logger.log(
        `generateDischargeInstructions completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      return content;
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateDischargeInstructions, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        return await this.gemini.generateText(
          `Dados da internação: ${JSON.stringify(admission, null, 2)}\n\nDados do paciente: ${JSON.stringify(patient, null, 2)}`,
          `Gere instruções de alta PARA O PACIENTE em linguagem SIMPLES (5ª série). Inclua: resumo, medicamentos (nome, dose, horários), cuidados em casa, sinais de alerta para voltar ao hospital, retorno, contatos. Use "você".`,
        );
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for generateDischargeInstructions after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return 'Erro ao gerar instruções de alta. Por favor, elabore manualmente.';
      }
    }
  }
}
