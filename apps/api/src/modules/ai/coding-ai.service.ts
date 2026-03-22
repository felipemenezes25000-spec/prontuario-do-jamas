import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface CodeSuggestion {
  code: string;
  description: string;
  confidence: number;
}

export interface CodingSuggestions {
  diagnosisCodes: CodeSuggestion[];
  procedureCodes: CodeSuggestion[];
}

@Injectable()
export class CodingAiService {
  private readonly logger = new Logger(CodingAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Given a clinical note (SOAP), suggest relevant CID-10 and TUSS codes
   */
  async suggestCodes(clinicalNote: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    procedures?: string[];
  }): Promise<CodingSuggestions> {
    const startTime = Date.now();
    this.logger.log('suggestCodes called');

    const systemPrompt = `Você é um sistema especializado em codificação médica brasileira.
Analise a nota clínica SOAP fornecida e sugira:
1. Códigos CID-10 (Classificação Internacional de Doenças, 10ª revisão) para os diagnósticos identificados
2. Códigos TUSS (Terminologia Unificada da Saúde Suplementar) para os procedimentos realizados ou solicitados

Para cada código sugerido, forneça:
- O código exato (ex: CID-10: J06.9, TUSS: 10101012)
- Descrição oficial do código
- Nível de confiança (0.0-1.0) baseado na clareza da nota clínica

Considere:
- A tabela TUSS vigente da ANS
- Códigos CID-10 mais específicos possíveis (evite códigos genéricos quando houver informação suficiente)
- Procedimentos mencionados direta ou indiretamente no plano terapêutico

Retorne JSON:
{
  "diagnosisCodes": [{ "code": "X00.0", "description": "...", "confidence": 0.95 }],
  "procedureCodes": [{ "code": "10101012", "description": "...", "confidence": 0.90 }]
}

Ordene por confiança decrescente.`;

    const userPrompt = `Nota Clínica SOAP:
${clinicalNote.subjective ? `Subjetivo: ${clinicalNote.subjective}` : ''}
${clinicalNote.objective ? `Objetivo: ${clinicalNote.objective}` : ''}
${clinicalNote.assessment ? `Avaliação: ${clinicalNote.assessment}` : ''}
${clinicalNote.plan ? `Plano: ${clinicalNote.plan}` : ''}
${clinicalNote.procedures?.length ? `Procedimentos: ${clinicalNote.procedures.join(', ')}` : ''}`;

    try {
      return await this.callOpenAISuggestCodes(systemPrompt, userPrompt, startTime);
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for suggestCodes, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<CodingSuggestions>(
          userPrompt,
          systemPrompt,
        );
        return {
          diagnosisCodes: (result.diagnosisCodes ?? []).sort((a, b) => b.confidence - a.confidence),
          procedureCodes: (result.procedureCodes ?? []).sort((a, b) => b.confidence - a.confidence),
        };
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for suggestCodes: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return { diagnosisCodes: [], procedureCodes: [] };
      }
    }
  }

  private async callOpenAISuggestCodes(
    systemPrompt: string,
    userPrompt: string,
    startTime: number,
  ): Promise<CodingSuggestions> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(
      `suggestCodes completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
    );

    const parsed = JSON.parse(content);
    return {
      diagnosisCodes: (parsed.diagnosisCodes ?? []).sort(
        (a: CodeSuggestion, b: CodeSuggestion) => b.confidence - a.confidence,
      ),
      procedureCodes: (parsed.procedureCodes ?? []).sort(
        (a: CodeSuggestion, b: CodeSuggestion) => b.confidence - a.confidence,
      ),
    };
  }

  /**
   * Given a diagnosis text, find the most likely CID-10 code
   */
  async findCID10(
    diagnosisText: string,
  ): Promise<CodeSuggestion[]> {
    const startTime = Date.now();
    this.logger.log(`findCID10 called - text: ${diagnosisText.slice(0, 80)}`);

    const systemPrompt = `Você é um sistema de busca de códigos CID-10.
Dado um texto descrevendo um diagnóstico em português, retorne os códigos CID-10 mais prováveis.

Retorne JSON:
{
  "codes": [
    { "code": "X00.0", "description": "descrição oficial CID-10", "confidence": 0.95 }
  ]
}

Retorne até 5 códigos, ordenados por relevância. Use códigos CID-10 válidos e descrições oficiais.`;

    const userPrompt = `Diagnóstico: ${diagnosisText}`;

    try {
      return await this.callOpenAIFindCodes(systemPrompt, userPrompt, startTime, 'findCID10');
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for findCID10, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<{ codes: CodeSuggestion[] }>(
          userPrompt,
          systemPrompt,
        );
        return (result.codes ?? []).sort((a, b) => b.confidence - a.confidence);
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for findCID10: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return [];
      }
    }
  }

  /**
   * Given a procedure description, find the most likely TUSS code
   */
  async findTUSS(
    procedureText: string,
  ): Promise<CodeSuggestion[]> {
    const startTime = Date.now();
    this.logger.log(`findTUSS called - text: ${procedureText.slice(0, 80)}`);

    const systemPrompt = `Você é um sistema de busca de códigos TUSS (Terminologia Unificada da Saúde Suplementar).
Dado um texto descrevendo um procedimento médico em português, retorne os códigos TUSS mais prováveis.

A tabela TUSS é mantida pela ANS e contém códigos de 8 dígitos para procedimentos médicos.

Retorne JSON:
{
  "codes": [
    { "code": "10101012", "description": "descrição oficial TUSS", "confidence": 0.90 }
  ]
}

Retorne até 5 códigos, ordenados por relevância. Use códigos TUSS válidos.`;

    const userPrompt = `Procedimento: ${procedureText}`;

    try {
      return await this.callOpenAIFindCodes(systemPrompt, userPrompt, startTime, 'findTUSS');
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for findTUSS, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<{ codes: CodeSuggestion[] }>(
          userPrompt,
          systemPrompt,
        );
        return (result.codes ?? []).sort((a, b) => b.confidence - a.confidence);
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for findTUSS: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return [];
      }
    }
  }

  private async callOpenAIFindCodes(
    systemPrompt: string,
    userPrompt: string,
    startTime: number,
    methodName: string,
  ): Promise<CodeSuggestion[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(
      `${methodName} completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
    );

    const parsed = JSON.parse(content);
    return (parsed.codes ?? []).sort(
      (a: CodeSuggestion, b: CodeSuggestion) => b.confidence - a.confidence,
    );
  }
}
