import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface ParsedPrescription {
  items: Array<{
    medicationName: string;
    dose?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    confidence: number;
  }>;
}

export interface MedicationSuggestion {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  reason: string;
  confidence: number;
}

export interface SafetyCheckResult {
  safe: boolean;
  warnings: Array<{
    type: string;
    severity: string;
    message: string;
    items: string[];
  }>;
}

@Injectable()
export class PrescriptionAiService {
  private readonly logger = new Logger(PrescriptionAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Parse voice prescription text into structured items using GPT-4o
   */
  async parseVoicePrescription(text: string): Promise<ParsedPrescription> {
    const startTime = Date.now();
    this.logger.log(
      `parseVoicePrescription called - textLength: ${text.length}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um parser de prescrições médicas em português brasileiro.
Dado um texto ditado por um médico, extraia todos os itens de prescrição em formato estruturado.

Retorne JSON:
{
  "items": [
    {
      "medicationName": "nome comercial ou genérico do medicamento",
      "dose": "dose com unidade (ex: 500mg, 1g, 10mL)",
      "route": "via de administração (VO, IV, IM, SC, SL, TOP, INH, REC, VR, OFT, OTO, NAS)",
      "frequency": "frequência (ex: 8/8h, 12/12h, 1x/dia, SOS)",
      "duration": "duração (ex: 7 dias, 14 dias, uso contínuo)",
      "instructions": "instruções especiais (ex: tomar em jejum, antes das refeições)",
      "confidence": 0.0-1.0
    }
  ]
}

Regras:
- Interprete abreviações médicas comuns (dipirona = dipirona sódica, amoxi = amoxicilina)
- Se a via não for mencionada, infira com base no medicamento (comprimido = VO, pomada = TOP)
- Se a dose não for clara, indique confidence baixo
- Não invente medicamentos que não foram mencionados`,
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `parseVoicePrescription completed - model: gpt-4o, latency: ${latency}ms, inputLength: ${text.length}, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);
      return { items: parsed.items ?? [] };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for parseVoicePrescription, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<ParsedPrescription>(
          text,
          `Você é um parser de prescrições médicas em português brasileiro. Extraia itens de prescrição do texto ditado. Retorne JSON com "items" array de {medicationName, dose, route, frequency, duration, instructions, confidence}.`,
        );
        return { items: result.items ?? [] };
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for parseVoicePrescription after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return { items: [] };
      }
    }
  }

  /**
   * Suggest medications based on diagnosis and patient profile
   */
  async suggestMedications(
    diagnosis: string,
    patientAge?: number,
    patientWeight?: number,
    allergies?: string[],
    currentMeds?: string[],
  ): Promise<MedicationSuggestion[]> {
    const startTime = Date.now();
    this.logger.log(`suggestMedications called - diagnosis: ${diagnosis}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de suporte à decisão clínica para prescrição médica no Brasil.
Baseado no diagnóstico e perfil do paciente, sugira medicamentos apropriados seguindo protocolos clínicos brasileiros.

Considere:
- Medicamentos disponíveis no Brasil (ANVISA)
- Protocolos do Ministério da Saúde e RENAME quando aplicável
- Ajuste de dose por idade e peso
- Alergias e medicamentos em uso (interações)
- Preferência por genéricos quando disponíveis

Retorne JSON:
{
  "suggestions": [
    {
      "medicationName": "nome do medicamento",
      "dose": "dose recomendada",
      "route": "via",
      "frequency": "frequência",
      "reason": "justificativa clínica",
      "confidence": 0.0-1.0
    }
  ]
}

IMPORTANTE: Estas são SUGESTÕES para o médico avaliar. Não substitui o julgamento clínico.`,
          },
          {
            role: 'user',
            content: `Diagnóstico: ${diagnosis}
${patientAge != null ? `Idade: ${patientAge} anos` : ''}
${patientWeight != null ? `Peso: ${patientWeight} kg` : ''}
${allergies?.length ? `Alergias: ${allergies.join(', ')}` : ''}
${currentMeds?.length ? `Medicamentos em uso: ${currentMeds.join(', ')}` : ''}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `suggestMedications completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);
      return parsed.suggestions ?? [];
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for suggestMedications, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<{ suggestions: MedicationSuggestion[] }>(
          `Diagnóstico: ${diagnosis}\n${patientAge != null ? `Idade: ${patientAge} anos` : ''}\n${patientWeight != null ? `Peso: ${patientWeight} kg` : ''}\n${allergies?.length ? `Alergias: ${allergies.join(', ')}` : ''}\n${currentMeds?.length ? `Medicamentos em uso: ${currentMeds.join(', ')}` : ''}`,
          `Sugira medicamentos para o diagnóstico seguindo protocolos brasileiros. Retorne JSON com "suggestions" array de {medicationName, dose, route, frequency, reason, confidence}.`,
        );
        return result.suggestions ?? [];
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for suggestMedications after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return [];
      }
    }
  }

  /**
   * Check prescription safety: interactions, allergy conflicts, dose limits
   */
  async checkSafety(
    items: Array<{ medicationName: string; dose?: string }>,
    patient: {
      id: string;
      allergies?: string[];
      age?: number;
      weight?: number;
      conditions?: string[];
      currentMedications?: string[];
      pregnant?: boolean;
      breastfeeding?: boolean;
    },
  ): Promise<SafetyCheckResult> {
    const startTime = Date.now();
    this.logger.log(
      `checkSafety called - items: ${items.length}, patientId: ${patient.id}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de checagem de segurança de prescrições médicas.
Analise a prescrição e verifique TODOS os seguintes critérios:

1. INTERAÇÕES MEDICAMENTOSAS: entre os medicamentos prescritos e entre prescritos + medicamentos em uso
2. ALERGIAS: reatividade cruzada com alergias conhecidas do paciente
3. DOSE MÁXIMA: se a dose excede limites seguros para idade/peso
4. CONTRAINDICAÇÕES: por idade, condições pré-existentes, gravidez
5. CATEGORIA DE RISCO NA GRAVIDEZ: se paciente gestante
6. CRITÉRIOS DE BEERS: se paciente idoso (>= 65 anos), avaliar medicamentos potencialmente inapropriados
7. DUPLICIDADE TERAPÊUTICA: medicamentos da mesma classe sem justificativa

Retorne JSON:
{
  "safe": true/false,
  "warnings": [
    {
      "type": "interaction|allergy|overdose|contraindication|pregnancy|beers|duplicate",
      "severity": "low|medium|high|critical",
      "message": "descrição clara do alerta",
      "items": ["medicamentos envolvidos"]
    }
  ]
}

Se não houver problemas, retorne safe: true com warnings vazio.
Seja conservador — é melhor alertar do que omitir um risco.`,
          },
          {
            role: 'user',
            content: `Prescrição:
${items.map((i) => `- ${i.medicationName}${i.dose ? ` ${i.dose}` : ''}`).join('\n')}

Paciente:
${patient.age != null ? `Idade: ${patient.age} anos` : ''}
${patient.weight != null ? `Peso: ${patient.weight} kg` : ''}
${patient.allergies?.length ? `Alergias: ${patient.allergies.join(', ')}` : 'Alergias: nenhuma conhecida'}
${patient.conditions?.length ? `Condições: ${patient.conditions.join(', ')}` : ''}
${patient.currentMedications?.length ? `Medicamentos em uso: ${patient.currentMedications.join(', ')}` : ''}
${patient.pregnant ? 'Gestante: sim' : ''}
${patient.breastfeeding ? 'Lactante: sim' : ''}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `checkSafety completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);
      return {
        safe: parsed.safe ?? true,
        warnings: parsed.warnings ?? [],
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for checkSafety, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<SafetyCheckResult>(
          `Prescrição:\n${items.map((i) => `- ${i.medicationName}${i.dose ? ` ${i.dose}` : ''}`).join('\n')}\n\nPaciente:\n${patient.age != null ? `Idade: ${patient.age} anos` : ''}\n${patient.allergies?.length ? `Alergias: ${patient.allergies.join(', ')}` : ''}\n${patient.currentMedications?.length ? `Medicamentos em uso: ${patient.currentMedications.join(', ')}` : ''}`,
          `Verifique segurança da prescrição: interações, alergias, dose máxima, contraindicações. Retorne JSON com "safe" (boolean) e "warnings" array de {type, severity, message, items}. Seja conservador.`,
        );
        return { safe: result.safe ?? true, warnings: result.warnings ?? [] };
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for checkSafety after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        // On error, return unsafe to be conservative
        return {
          safe: false,
          warnings: [
            {
              type: 'system_error',
              severity: 'high',
              message:
                'Não foi possível verificar a segurança da prescrição. Revise manualmente.',
              items: items.map((i) => i.medicationName),
            },
          ],
        };
      }
    }
  }
}
