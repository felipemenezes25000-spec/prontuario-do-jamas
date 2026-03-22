import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface TriageClassification {
  suggestedLevel: string;
  confidence: number;
  reasoning: string;
  discriminators: string[];
  maxWaitTimeMinutes: number;
}

export interface RedFlagResult {
  hasRedFlags: boolean;
  flags: Array<{
    flag: string;
    severity: string;
    recommendation: string;
  }>;
}

@Injectable()
export class TriageAiService {
  private readonly logger = new Logger(TriageAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Classify triage level based on symptoms, vitals, and demographics using Manchester Protocol
   */
  async classifyTriage(
    symptoms: string[],
    vitals?: Record<string, number>,
    patientAge?: number,
    patientGender?: string,
  ): Promise<TriageClassification> {
    const startTime = Date.now();
    this.logger.log(
      `classifyTriage called - symptoms: ${symptoms.length}, hasVitals: ${!!vitals}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de classificação de risco baseado no Protocolo de Manchester adaptado para o Brasil.

Classifique o paciente em uma das seguintes categorias:
- VERMELHO (Emergência): Risco imediato de vida. Atendimento imediato (0 min).
- LARANJA (Muito Urgente): Risco de perda de membro ou órgão. Até 10 minutos.
- AMARELO (Urgente): Condição que pode piorar. Até 60 minutos.
- VERDE (Pouco Urgente): Condição estável. Até 120 minutos.
- AZUL (Não Urgente): Condição crônica/menor. Até 240 minutos.

Considere:
- Sinais vitais e seus limites normais por faixa etária
- Discriminadores do Protocolo de Manchester
- Populações especiais: idosos, crianças, gestantes
- Via aérea, respiração, circulação, consciência (ABCDE)

Retorne JSON:
{
  "suggestedLevel": "VERMELHO|LARANJA|AMARELO|VERDE|AZUL",
  "confidence": 0.0-1.0,
  "reasoning": "justificativa clínica detalhada para a classificação",
  "discriminators": ["discriminadores de Manchester identificados"],
  "maxWaitTimeMinutes": número
}

IMPORTANTE: Na dúvida, classifique para CIMA (mais urgente). A segurança do paciente é prioridade.`,
          },
          {
            role: 'user',
            content: `Sintomas: ${symptoms.join(', ')}
${patientAge != null ? `Idade: ${patientAge} anos` : ''}
${patientGender ? `Sexo: ${patientGender}` : ''}
${vitals ? `Sinais vitais: ${JSON.stringify(vitals)}` : 'Sinais vitais: não aferidos'}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `classifyTriage completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);
      const levelWaitMap: Record<string, number> = {
        VERMELHO: 0,
        LARANJA: 10,
        AMARELO: 60,
        VERDE: 120,
        AZUL: 240,
      };

      const level = parsed.suggestedLevel ?? 'AMARELO';

      return {
        suggestedLevel: level,
        confidence: parsed.confidence ?? 0.7,
        reasoning: parsed.reasoning ?? '',
        discriminators: parsed.discriminators ?? [],
        maxWaitTimeMinutes:
          parsed.maxWaitTimeMinutes ?? levelWaitMap[level] ?? 60,
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for classifyTriage, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const geminiResult = await this.gemini.generateJson<TriageClassification>(
          `Sintomas: ${symptoms.join(', ')}
${patientAge != null ? `Idade: ${patientAge} anos` : ''}
${patientGender ? `Sexo: ${patientGender}` : ''}
${vitals ? `Sinais vitais: ${JSON.stringify(vitals)}` : 'Sinais vitais: não aferidos'}`,
          `Classifique o paciente pelo Protocolo de Manchester em VERMELHO/LARANJA/AMARELO/VERDE/AZUL. Retorne JSON com suggestedLevel, confidence, reasoning, discriminators, maxWaitTimeMinutes. Na dúvida, classifique para CIMA.`,
        );
        const latency = Date.now() - startTime;
        this.logger.log(`classifyTriage Gemini fallback completed - latency: ${latency}ms`);
        return geminiResult;
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for classifyTriage after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        // Default to AMARELO (urgent) on error for safety
        return {
          suggestedLevel: 'AMARELO',
          confidence: 0,
          reasoning:
            'Erro no sistema de classificação. Classificação padrão AMARELO aplicada por segurança. Avalie clinicamente.',
          discriminators: [],
          maxWaitTimeMinutes: 60,
        };
      }
    }
  }

  /**
   * Detect critical red flags in clinical data
   */
  async detectRedFlags(data: {
    symptoms?: string[];
    vitals?: Record<string, number>;
    history?: string[];
  }): Promise<RedFlagResult> {
    const startTime = Date.now();
    this.logger.log('detectRedFlags called');

    // First, check hardcoded critical patterns for immediate detection (no API latency)
    const immediateFlags = this.checkImmediateRedFlags(data);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de detecção de sinais de alerta (red flags) médicos.
Analise os dados clínicos e identifique TODOS os sinais de alerta presentes.

Red flags conhecidos incluem (mas não se limitam a):
- Dor torácica com irradiação para braço/mandíbula (IAM)
- Cefaleia súbita e intensa ("a pior da vida") (HSA)
- Glasgow < 8 (rebaixamento grave de consciência)
- SpO2 < 90% (hipoxemia grave)
- PAS < 90 mmHg (hipotensão/choque)
- Febre + rigidez de nuca (meningite)
- Dor abdominal + defesa + rigidez (abdome agudo)
- Dispneia súbita + dor torácica pleurítica (TEP)
- Déficit neurológico focal súbito (AVC)
- Hemorragia ativa não controlada
- Anafilaxia (urticária + dispneia + hipotensão)
- Trauma com mecanismo de alta energia
- Gestante com sangramento vaginal + dor
- Criança com fontanela abaulada + febre
- Idoso com confusão aguda + febre (sepse)

Retorne JSON:
{
  "hasRedFlags": true/false,
  "flags": [
    {
      "flag": "descrição do red flag",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "recommendation": "ação recomendada"
    }
  ]
}

Seja sensível — não perca red flags. Melhor alertar do que omitir.`,
          },
          {
            role: 'user',
            content: `Sintomas: ${data.symptoms?.join(', ') || 'não informados'}
Sinais vitais: ${data.vitals ? JSON.stringify(data.vitals) : 'não aferidos'}
Histórico: ${data.history?.join(', ') || 'não informado'}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `detectRedFlags completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);
      const aiFlags: RedFlagResult['flags'] = parsed.flags ?? [];

      // Merge immediate flags with AI flags, avoiding duplicates
      const allFlags = [...immediateFlags];
      for (const aiFlag of aiFlags) {
        const isDuplicate = allFlags.some(
          (f) =>
            f.flag.toLowerCase().includes(aiFlag.flag.toLowerCase().slice(0, 20)),
        );
        if (!isDuplicate) {
          allFlags.push(aiFlag);
        }
      }

      return {
        hasRedFlags: allFlags.length > 0,
        flags: allFlags,
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for detectRedFlags, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const geminiResult = await this.gemini.generateJson<RedFlagResult>(
          `Sintomas: ${data.symptoms?.join(', ') || 'não informados'}
Sinais vitais: ${data.vitals ? JSON.stringify(data.vitals) : 'não aferidos'}
Histórico: ${data.history?.join(', ') || 'não informado'}`,
          `Detecte red flags médicos. Retorne JSON com hasRedFlags (boolean) e flags (array de {flag, severity: LOW|MEDIUM|HIGH|CRITICAL, recommendation}). Seja sensível — melhor alertar do que omitir.`,
        );
        const allFlags = [...immediateFlags, ...(geminiResult.flags ?? [])];
        return { hasRedFlags: allFlags.length > 0, flags: allFlags };
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for detectRedFlags after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        // Return immediate flags even if both AI providers fail
        return {
          hasRedFlags: immediateFlags.length > 0,
          flags: immediateFlags,
        };
      }
    }
  }

  /**
   * Hardcoded critical pattern checks for immediate red flag detection (no API latency)
   */
  private checkImmediateRedFlags(data: {
    symptoms?: string[];
    vitals?: Record<string, number>;
    history?: string[];
  }): RedFlagResult['flags'] {
    const flags: RedFlagResult['flags'] = [];
    const vitals = data.vitals ?? {};

    if (vitals.oxygenSaturation != null && vitals.oxygenSaturation < 90) {
      flags.push({
        flag: 'SpO2 < 90% — Hipoxemia grave',
        severity: 'CRITICAL',
        recommendation:
          'Oxigenoterapia imediata. Considerar IOT se rebaixamento.',
      });
    }

    if (vitals.systolicBP != null && vitals.systolicBP < 90) {
      flags.push({
        flag: 'PAS < 90 mmHg — Hipotensão/choque',
        severity: 'CRITICAL',
        recommendation:
          'Acesso venoso calibroso, reposição volêmica, monitorização contínua.',
      });
    }

    if (vitals.heartRate != null && vitals.heartRate > 150) {
      flags.push({
        flag: 'FC > 150 bpm — Taquicardia grave',
        severity: 'HIGH',
        recommendation: 'ECG imediato, monitorização, avaliar causa.',
      });
    }

    if (vitals.heartRate != null && vitals.heartRate < 40) {
      flags.push({
        flag: 'FC < 40 bpm — Bradicardia grave',
        severity: 'CRITICAL',
        recommendation:
          'ECG imediato, atropina se sintomático, marca-passo transcutâneo.',
      });
    }

    if (vitals.temperature != null && vitals.temperature >= 40) {
      flags.push({
        flag: 'Temperatura >= 40°C — Hipertermia',
        severity: 'HIGH',
        recommendation:
          'Medidas de resfriamento, antitérmico IV, investigar foco.',
      });
    }

    if (vitals.glasgowComaScale != null && vitals.glasgowComaScale < 8) {
      flags.push({
        flag: 'Glasgow < 8 — Rebaixamento grave de consciência',
        severity: 'CRITICAL',
        recommendation:
          'Proteger via aérea (IOT), TC de crânio, avaliação neurológica.',
      });
    }

    if (vitals.respiratoryRate != null && vitals.respiratoryRate > 30) {
      flags.push({
        flag: 'FR > 30 irpm — Taquipneia grave',
        severity: 'HIGH',
        recommendation:
          'Oximetria, gasometria, radiografia de tórax, suporte ventilatório.',
      });
    }

    // Symptom-based checks
    const symptomsText = (data.symptoms ?? [])
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (
      symptomsText.includes('dor toracica') &&
      (symptomsText.includes('irradia') || symptomsText.includes('braco'))
    ) {
      flags.push({
        flag: 'Dor torácica com irradiação — Suspeita de SCA/IAM',
        severity: 'CRITICAL',
        recommendation:
          'ECG em 10 min, troponina, AAS, acesso venoso, monitorização.',
      });
    }

    if (
      symptomsText.includes('cefaleia') &&
      (symptomsText.includes('subita') ||
        symptomsText.includes('pior da vida') ||
        symptomsText.includes('intensa'))
    ) {
      flags.push({
        flag: 'Cefaleia súbita intensa — Suspeita de HSA',
        severity: 'CRITICAL',
        recommendation: 'TC de crânio sem contraste urgente, avaliação neurológica.',
      });
    }

    return flags;
  }
}
