import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { PatientContextBuilder } from './patient-context.builder';
import { AiCacheService } from './ai-cache.service';
import { getSpecialtyPrompt } from './prompts';
import { createHash } from 'crypto';

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosisCodes: string[];
  suggestedExams: string[];
  suggestedMedications: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
}

export interface PatientContext {
  name?: string;
  age?: number;
  gender?: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  lastEncounterSummary?: string;
}

@Injectable()
export class SoapGeneratorService {
  private readonly logger = new Logger(SoapGeneratorService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
    private readonly patientContextBuilder: PatientContextBuilder,
    private readonly aiCache: AiCacheService,
  ) {}

  /**
   * Generate SOAP note from transcription and patient context using GPT-4o.
   * Now supports specialty-specific prompts and RAG-lite patient context.
   */
  async generateSOAP(
    transcription: string,
    patientContext?: PatientContext | Record<string, unknown>,
    doctorSpecialty?: string,
    patientId?: string,
  ): Promise<SOAPNote> {
    const startTime = Date.now();
    this.logger.log(
      `generateSOAP called - transcriptionLength: ${transcription.length}, specialty: ${doctorSpecialty ?? 'none'}, patientId: ${patientId ?? 'none'}`,
    );

    // Check cache
    const cacheKey = this.buildCacheKey(transcription, doctorSpecialty, patientId);
    const cached = await this.aiCache.get<SOAPNote>(cacheKey);
    if (cached) {
      this.logger.log('generateSOAP returning cached result');
      return cached;
    }

    try {
      // Build patient context from DB if patientId is provided and no context was given
      let patientInfo: string;
      if (patientId && (!patientContext || Object.keys(patientContext).length === 0)) {
        patientInfo = await this.patientContextBuilder.build(patientId);
      } else {
        const ctx = patientContext ?? {};
        patientInfo = this.buildPatientInfoBlock(ctx);
      }

      // Get specialty-specific prompt
      const specialtyPrompt = getSpecialtyPrompt(doctorSpecialty);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${specialtyPrompt.systemPrompt}

Voce e um sistema especializado em documentacao medica brasileira. Sua tarefa e gerar uma nota SOAP completa e profissional a partir de uma transcricao de consulta medica.

Especialidade: ${specialtyPrompt.name}
Orientacao especifica: ${specialtyPrompt.soapGuidance}

${patientInfo}

Siga rigorosamente as normas do CFM/CRM para documentacao clinica.

Retorne um JSON com a seguinte estrutura:
{
  "subjective": "Secao Subjetivo - Queixa principal, HDA (historia da doenca atual), antecedentes relevantes, relato do paciente em suas proprias palavras. Use aspas para citacoes diretas do paciente.",
  "objective": "Secao Objetivo - Exame fisico, sinais vitais, dados mensuraveis, achados clinicos objetivos. Seja factual e preciso. NAO inclua interpretacoes.",
  "assessment": "Secao Avaliacao - Hipoteses diagnosticas com codigos CID-10, diagnosticos diferenciais, correlacao clinico-laboratorial, raciocinio clinico.",
  "plan": "Secao Plano - Conduta terapeutica, exames solicitados, encaminhamentos, orientacoes, retorno. Seja especifico e acionavel.",
  "diagnosisCodes": ["CID-10 codes relevantes, ex: J06.9"],
  "suggestedExams": ["exames sugeridos com base na avaliacao"],
  "suggestedMedications": [{"name": "nome", "dose": "dose", "route": "via", "frequency": "frequencia", "duration": "duracao"}]
}

Regras:
- Toda terminologia deve estar em portugues brasileiro medico
- Codigos CID-10 devem ser validos
- O Objetivo deve conter APENAS dados mensuraveis/observaveis
- O Subjetivo deve refletir a perspectiva do paciente
- A Avaliacao deve incluir diagnosticos diferenciais quando apropriado
- O Plano deve ser acionavel e especifico
- Se informacao nao estiver disponivel na transcricao, nao invente — omita ou indique "nao relatado"
- Considere alergias e medicacoes em uso ao sugerir medicamentos
- Aplique as orientacoes da especialidade acima para enriquecer a avaliacao`,
          },
          { role: 'user', content: transcription },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `generateSOAP completed - model: gpt-4o, latency: ${latency}ms, inputLength: ${transcription.length}, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content) as Record<string, unknown>;

      const result: SOAPNote = {
        subjective: (parsed.subjective as string) ?? '',
        objective: (parsed.objective as string) ?? '',
        assessment: (parsed.assessment as string) ?? '',
        plan: (parsed.plan as string) ?? '',
        diagnosisCodes: (parsed.diagnosisCodes as string[]) ?? [],
        suggestedExams: (parsed.suggestedExams as string[]) ?? [],
        suggestedMedications:
          (parsed.suggestedMedications as SOAPNote['suggestedMedications']) ?? [],
      };

      // Cache for 10 minutes
      await this.aiCache.set(cacheKey, result, 600);

      return result;
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateSOAP, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const specialtyPrompt = getSpecialtyPrompt(doctorSpecialty);
        const result = await this.gemini.generateJson<SOAPNote>(
          transcription,
          `${specialtyPrompt.systemPrompt} Gere uma nota SOAP completa em portugues brasileiro medico a partir da transcricao. ${specialtyPrompt.soapGuidance} Retorne JSON com subjective, objective, assessment, plan, diagnosisCodes (CID-10), suggestedExams, suggestedMedications (array de {name, dose, route, frequency, duration}). Nao invente dados ausentes.`,
        );
        const soapResult: SOAPNote = {
          subjective: result.subjective ?? '',
          objective: result.objective ?? '',
          assessment: result.assessment ?? '',
          plan: result.plan ?? '',
          diagnosisCodes: result.diagnosisCodes ?? [],
          suggestedExams: result.suggestedExams ?? [],
          suggestedMedications: result.suggestedMedications ?? [],
        };

        await this.aiCache.set(cacheKey, soapResult, 600);
        return soapResult;
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for generateSOAP after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return {
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          diagnosisCodes: [],
          suggestedExams: [],
          suggestedMedications: [],
        };
      }
    }
  }

  /**
   * Stream SOAP generation via OpenAI streaming API.
   * Yields partial text chunks for SSE streaming.
   */
  async *streamSOAP(
    transcription: string,
    doctorSpecialty?: string,
    patientId?: string,
  ): AsyncGenerator<string> {
    let patientInfo = 'Dados do paciente: nao disponiveis';
    if (patientId) {
      patientInfo = await this.patientContextBuilder.build(patientId);
    }

    const specialtyPrompt = getSpecialtyPrompt(doctorSpecialty);

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `${specialtyPrompt.systemPrompt}

Voce e um sistema especializado em documentacao medica brasileira. Gere uma nota SOAP completa.

Especialidade: ${specialtyPrompt.name}
Orientacao: ${specialtyPrompt.soapGuidance}

${patientInfo}

Retorne um JSON com: subjective, objective, assessment, plan, diagnosisCodes, suggestedExams, suggestedMedications.
Siga normas do CFM/CRM. Terminologia em portugues brasileiro medico. Nao invente dados ausentes.`,
        },
        { role: 'user', content: transcription },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  private buildPatientInfoBlock(
    ctx: PatientContext | Record<string, unknown>,
  ): string {
    const parts: string[] = [];
    if (ctx.name) parts.push(`Nome: ${ctx.name}`);
    if (ctx.age) parts.push(`Idade: ${ctx.age} anos`);
    if (ctx.gender) parts.push(`Sexo: ${ctx.gender}`);
    if (Array.isArray(ctx.allergies) && ctx.allergies.length > 0)
      parts.push(`Alergias conhecidas: ${(ctx.allergies as string[]).join(', ')}`);
    if (Array.isArray(ctx.conditions) && ctx.conditions.length > 0)
      parts.push(
        `Condicoes pre-existentes: ${(ctx.conditions as string[]).join(', ')}`,
      );
    if (Array.isArray(ctx.medications) && ctx.medications.length > 0)
      parts.push(
        `Medicacoes em uso: ${(ctx.medications as string[]).join(', ')}`,
      );
    if (ctx.lastEncounterSummary)
      parts.push(`Resumo ultimo atendimento: ${ctx.lastEncounterSummary}`);

    return parts.length > 0
      ? `Dados do paciente:\n${parts.join('\n')}`
      : 'Dados do paciente: nao disponiveis';
  }

  private buildCacheKey(
    transcription: string,
    specialty?: string,
    patientId?: string,
  ): string {
    const hash = createHash('sha256')
      .update(`${transcription}|${specialty ?? ''}|${patientId ?? ''}`)
      .digest('hex')
      .slice(0, 16);
    return `soap:${hash}`;
  }
}
