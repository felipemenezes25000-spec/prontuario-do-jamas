import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface StructuredMedicalData {
  symptoms: Array<{
    name: string;
    severity?: string;
    duration?: string;
    onset?: string;
    location?: string;
    aggravatingFactor?: string;
  }>;
  negatives: string[];
  medications: Array<{
    name: string;
    dose?: string;
    doseUnit?: string;
    frequency?: string;
    route?: string;
    duration?: string;
  }>;
  diagnoses: Array<{
    name: string;
    icdCode?: string;
    confidence: number;
  }>;
  procedures: Array<{ name: string; code?: string }>;
  vitalSigns: Record<string, number | string>;
  allergies: Array<{ substance: string; reaction?: string; severity?: string }>;
  labValues: Array<{ name: string; value: string; unit?: string }>;
  exams: Array<{
    name: string;
    code?: string;
    urgency?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  }>;
  redFlags: Array<{
    flag: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: string;
  }>;
}

@Injectable()
export class MedicalNerService {
  private readonly logger = new Logger(MedicalNerService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Extract medical entities from free text using GPT-4o NER
   */
  async extractEntities(text: string): Promise<StructuredMedicalData> {
    const startTime = Date.now();
    this.logger.log(`extractEntities called - textLength: ${text.length}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de NER (Named Entity Recognition) médico especializado em português brasileiro.
Extraia TODAS as entidades médicas do texto fornecido e retorne em JSON estruturado.

Categorias para extrair:
- symptoms: [{name, onset, duration, severity, location, aggravatingFactor}]
- negatives: [string] (sintomas negados pelo paciente, ex: "nega febre", "sem vômitos")
- vitalSigns: objeto com chaves como systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScale, weight, height, glucoseLevel (valores numéricos ou string)
- diagnoses: [{name, icdCode (código CID-10 válido, ex: J06.9, I10, E11.9), confidence (0-1)}]
- medications: [{name, dose, doseUnit (mg, g, mL, UI), route (VO, IV, IM, SC, SL, TOP, INH, REC), frequency, duration}]
- exams: [{name, code, urgency (ROUTINE|URGENT|EMERGENCY)}]
- procedures: [{name, code}]
- allergies: [{substance, reaction, severity}]
- labValues: [{name, value, unit}]
- redFlags: [{flag, urgency (LOW|MEDIUM|HIGH|CRITICAL), recommendation}]

Regras:
- CID-10 codes devem ser válidos
- Doses devem incluir unidade
- Se não encontrar entidades de alguma categoria, retorne array vazio ou objeto vazio
- Seja preciso — não invente dados que não estão no texto
- Para vitalSigns, retorne {} se nenhum sinal vital for mencionado`,
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `extractEntities completed - model: gpt-4o, latency: ${latency}ms, inputLength: ${text.length}, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);

      return {
        symptoms: parsed.symptoms ?? [],
        negatives: parsed.negatives ?? [],
        medications: parsed.medications ?? [],
        diagnoses: parsed.diagnoses ?? [],
        procedures: parsed.procedures ?? [],
        vitalSigns: parsed.vitalSigns ?? {},
        allergies: parsed.allergies ?? [],
        labValues: parsed.labValues ?? [],
        exams: parsed.exams ?? [],
        redFlags: parsed.redFlags ?? [],
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for extractEntities, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<StructuredMedicalData>(
          text,
          `Extraia entidades médicas do texto em português. Retorne JSON com: symptoms, negatives, medications, diagnoses (com icdCode CID-10), procedures, vitalSigns, allergies, labValues, exams, redFlags. Arrays vazios ou {} se não encontrar.`,
        );
        return {
          symptoms: result.symptoms ?? [],
          negatives: result.negatives ?? [],
          medications: result.medications ?? [],
          diagnoses: result.diagnoses ?? [],
          procedures: result.procedures ?? [],
          vitalSigns: result.vitalSigns ?? {},
          allergies: result.allergies ?? [],
          labValues: result.labValues ?? [],
          exams: result.exams ?? [],
          redFlags: result.redFlags ?? [],
        };
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for extractEntities after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return {
          symptoms: [],
          negatives: [],
          medications: [],
          diagnoses: [],
          procedures: [],
          vitalSigns: {},
          allergies: [],
          labValues: [],
          exams: [],
          redFlags: [],
        };
      }
    }
  }
}
