import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

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
  ) {}

  /**
   * Generate SOAP note from transcription and patient context using GPT-4o
   */
  async generateSOAP(
    transcription: string,
    patientContext?: PatientContext | Record<string, unknown>,
    doctorSpecialty?: string,
  ): Promise<SOAPNote> {
    const startTime = Date.now();
    this.logger.log(
      `generateSOAP called - transcriptionLength: ${transcription.length}`,
    );

    try {
      const ctx = patientContext ?? {};
      const patientInfo = this.buildPatientInfoBlock(ctx);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema especializado em documentação médica brasileira. Sua tarefa é gerar uma nota SOAP completa e profissional a partir de uma transcrição de consulta médica.

${doctorSpecialty ? `Especialidade do médico: ${doctorSpecialty}` : ''}

${patientInfo}

Siga rigorosamente as normas do CFM/CRM para documentação clínica.

Retorne um JSON com a seguinte estrutura:
{
  "subjective": "Seção Subjetivo - Queixa principal, HDA (história da doença atual), antecedentes relevantes, relato do paciente em suas próprias palavras. Use aspas para citações diretas do paciente.",
  "objective": "Seção Objetivo - Exame físico, sinais vitais, dados mensuráveis, achados clínicos objetivos. Seja factual e preciso. NÃO inclua interpretações.",
  "assessment": "Seção Avaliação - Hipóteses diagnósticas com códigos CID-10, diagnósticos diferenciais, correlação clínico-laboratorial, raciocínio clínico.",
  "plan": "Seção Plano - Conduta terapêutica, exames solicitados, encaminhamentos, orientações, retorno. Seja específico e acionável.",
  "diagnosisCodes": ["CID-10 codes relevantes, ex: J06.9"],
  "suggestedExams": ["exames sugeridos com base na avaliação"],
  "suggestedMedications": [{"name": "nome", "dose": "dose", "route": "via", "frequency": "frequência", "duration": "duração"}]
}

Regras:
- Toda terminologia deve estar em português brasileiro médico
- Códigos CID-10 devem ser válidos
- O Objetivo deve conter APENAS dados mensuráveis/observáveis
- O Subjetivo deve refletir a perspectiva do paciente
- A Avaliação deve incluir diagnósticos diferenciais quando apropriado
- O Plano deve ser acionável e específico
- Se informação não estiver disponível na transcrição, não invente — omita ou indique "não relatado"
- Considere alergias e medicações em uso ao sugerir medicamentos`,
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

      const parsed = JSON.parse(content);

      return {
        subjective: parsed.subjective ?? '',
        objective: parsed.objective ?? '',
        assessment: parsed.assessment ?? '',
        plan: parsed.plan ?? '',
        diagnosisCodes: parsed.diagnosisCodes ?? [],
        suggestedExams: parsed.suggestedExams ?? [],
        suggestedMedications: parsed.suggestedMedications ?? [],
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for generateSOAP, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<SOAPNote>(
          transcription,
          `Gere uma nota SOAP completa em português brasileiro médico a partir da transcrição. Retorne JSON com subjective, objective, assessment, plan, diagnosisCodes (CID-10), suggestedExams, suggestedMedications (array de {name, dose, route, frequency, duration}). Não invente dados ausentes.`,
        );
        return {
          subjective: result.subjective ?? '',
          objective: result.objective ?? '',
          assessment: result.assessment ?? '',
          plan: result.plan ?? '',
          diagnosisCodes: result.diagnosisCodes ?? [],
          suggestedExams: result.suggestedExams ?? [],
          suggestedMedications: result.suggestedMedications ?? [],
        };
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

  private buildPatientInfoBlock(ctx: PatientContext | Record<string, unknown>): string {
    const parts: string[] = [];
    if (ctx.name) parts.push(`Nome: ${ctx.name}`);
    if (ctx.age) parts.push(`Idade: ${ctx.age} anos`);
    if (ctx.gender) parts.push(`Sexo: ${ctx.gender}`);
    if (Array.isArray(ctx.allergies) && ctx.allergies.length > 0)
      parts.push(`Alergias conhecidas: ${ctx.allergies.join(', ')}`);
    if (Array.isArray(ctx.conditions) && ctx.conditions.length > 0)
      parts.push(`Condições pré-existentes: ${ctx.conditions.join(', ')}`);
    if (Array.isArray(ctx.medications) && ctx.medications.length > 0)
      parts.push(`Medicações em uso: ${ctx.medications.join(', ')}`);
    if (ctx.lastEncounterSummary)
      parts.push(`Resumo último atendimento: ${ctx.lastEncounterSummary}`);

    return parts.length > 0
      ? `Dados do paciente:\n${parts.join('\n')}`
      : 'Dados do paciente: não disponíveis';
  }
}
