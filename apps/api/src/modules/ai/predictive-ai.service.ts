import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface ReadmissionRiskResult {
  risk: number;
  factors: string[];
  recommendations: string[];
}

export interface DeteriorationRiskResult {
  risk: number;
  earlyWarningScore: number;
  alerts: string[];
  recommendations: string[];
}

export interface LengthOfStayResult {
  predictedDays: number;
  confidence: number;
  factors: string[];
}

@Injectable()
export class PredictiveAiService {
  private readonly logger = new Logger(PredictiveAiService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Predict readmission risk (0-100) based on HOSPITAL/LACE scores methodology
   */
  async predictReadmissionRisk(patient: {
    age: number;
    gender: string;
    diagnoses: string[];
    previousAdmissions: number;
    lastAdmissionDate?: string;
    comorbidities: string[];
    socialFactors: { livesAlone?: boolean; lowIncome?: boolean };
  }): Promise<ReadmissionRiskResult> {
    const startTime = Date.now();
    this.logger.log(
      `predictReadmissionRisk called - age: ${patient.age}, diagnoses: ${patient.diagnoses.length}`,
    );

    const systemPrompt = `Você é um sistema de análise preditiva hospitalar especializado em risco de readmissão.

Analise os dados do paciente e calcule o risco de readmissão em 30 dias usando a metodologia do LACE Index adaptada:
- L (Length of stay): duração da internação
- A (Acuity of admission): gravidade na admissão
- C (Comorbidities): comorbidades (Charlson Comorbidity Index)
- E (Emergency department visits): visitas ao PS nos últimos 6 meses

Também considere:
- Idade (idosos > 65 anos têm risco aumentado)
- Número de internações prévias
- Fatores sociais (mora sozinho, baixa renda, falta de rede de apoio)
- Complexidade dos diagnósticos
- Polifarmácia e adesão ao tratamento

Retorne JSON:
{
  "risk": 0-100 (porcentagem de risco de readmissão em 30 dias),
  "factors": ["fator de risco 1", "fator de risco 2"],
  "recommendations": ["recomendação 1 para reduzir risco", "recomendação 2"]
}

Seja objetivo e baseado em evidências. Fatores devem ser específicos ao paciente.`;

    const userPrompt = `Dados do paciente:
Idade: ${patient.age} anos
Sexo: ${patient.gender}
Diagnósticos: ${patient.diagnoses.join(', ')}
Internações prévias: ${patient.previousAdmissions}
${patient.lastAdmissionDate ? `Última internação: ${patient.lastAdmissionDate}` : ''}
Comorbidades: ${patient.comorbidities.length > 0 ? patient.comorbidities.join(', ') : 'Nenhuma informada'}
Mora sozinho: ${patient.socialFactors.livesAlone ? 'Sim' : 'Não/Não informado'}
Baixa renda: ${patient.socialFactors.lowIncome ? 'Sim' : 'Não/Não informado'}`;

    try {
      return await this.callOpenAIReadmission(systemPrompt, userPrompt, startTime);
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for predictReadmissionRisk, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        return await this.gemini.generateJson<ReadmissionRiskResult>(
          userPrompt,
          systemPrompt,
        );
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for predictReadmissionRisk: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return {
          risk: -1,
          factors: ['Não foi possível calcular o risco — ambos os provedores de IA falharam.'],
          recommendations: ['Avaliação clínica manual recomendada.'],
        };
      }
    }
  }

  private async callOpenAIReadmission(
    systemPrompt: string,
    userPrompt: string,
    startTime: number,
  ): Promise<ReadmissionRiskResult> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(
      `predictReadmissionRisk completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
    );

    const parsed = JSON.parse(content);
    return {
      risk: parsed.risk ?? -1,
      factors: parsed.factors ?? [],
      recommendations: parsed.recommendations ?? [],
    };
  }

  /**
   * Predict clinical deterioration risk using Modified Early Warning Score (MEWS)
   */
  async predictDeteriorationRisk(vitals: {
    current: any;
    trends: any[];
    age: number;
    diagnoses: string[];
  }): Promise<DeteriorationRiskResult> {
    const startTime = Date.now();
    this.logger.log(
      `predictDeteriorationRisk called - age: ${vitals.age}, trendPoints: ${vitals.trends.length}`,
    );

    // Calculate MEWS from current vitals first (deterministic)
    const mews = this.calculateMEWS(vitals.current);

    const systemPrompt = `Você é um sistema de detecção precoce de deterioração clínica hospitalar.

Analise os sinais vitais atuais, tendências das últimas 24 horas e dados do paciente para avaliar risco de deterioração.

Use o Modified Early Warning Score (MEWS) como base:
- Frequência cardíaca
- Pressão arterial sistólica
- Frequência respiratória
- Temperatura
- Nível de consciência (AVPU)

Além do MEWS calculado (${mews}), analise:
- Tendências dos sinais vitais (piorando, estável, melhorando)
- Velocidade de mudança (deterioração rápida é mais preocupante)
- Contexto clínico (diagnósticos que predispõem a deterioração)
- Padrões que precedem parada cardiorrespiratória
- Sinais de sepse (qSOFA)

Retorne JSON:
{
  "risk": 0-100 (porcentagem de risco de deterioração nas próximas 12h),
  "earlyWarningScore": ${mews},
  "alerts": ["alerta específico 1", "alerta 2"],
  "recommendations": ["ação recomendada 1", "ação 2"]
}

MEWS >= 5 = CRÍTICO (acionar time de resposta rápida)
MEWS 3-4 = ALTO (aumentar frequência de monitorização)
MEWS 1-2 = MODERADO (monitorização padrão)
MEWS 0 = BAIXO`;

    const userPrompt = `Sinais vitais atuais: ${JSON.stringify(vitals.current)}
Tendências (últimas 24h): ${JSON.stringify(vitals.trends)}
Idade: ${vitals.age} anos
Diagnósticos: ${vitals.diagnoses.join(', ')}
MEWS calculado: ${mews}`;

    try {
      return await this.callOpenAIDeterioration(systemPrompt, userPrompt, startTime, mews);
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for predictDeteriorationRisk, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<DeteriorationRiskResult>(
          userPrompt,
          systemPrompt,
        );
        return { ...result, earlyWarningScore: mews };
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for predictDeteriorationRisk: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        // Return MEWS-based default response
        return {
          risk: mews >= 5 ? 80 : mews >= 3 ? 50 : mews >= 1 ? 20 : 5,
          earlyWarningScore: mews,
          alerts:
            mews >= 5
              ? ['MEWS >= 5 — Acionar time de resposta rápida']
              : mews >= 3
                ? ['MEWS elevado — Aumentar frequência de monitorização']
                : [],
          recommendations: [
            'Avaliação clínica manual recomendada — análise AI indisponível.',
          ],
        };
      }
    }
  }

  private async callOpenAIDeterioration(
    systemPrompt: string,
    userPrompt: string,
    startTime: number,
    mews: number,
  ): Promise<DeteriorationRiskResult> {
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
      `predictDeteriorationRisk completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
    );

    const parsed = JSON.parse(content);
    return {
      risk: parsed.risk ?? 0,
      earlyWarningScore: mews,
      alerts: parsed.alerts ?? [],
      recommendations: parsed.recommendations ?? [],
    };
  }

  /**
   * Calculate Modified Early Warning Score from vital signs
   */
  private calculateMEWS(vitals: any): number {
    if (!vitals) return 0;

    let score = 0;

    // Systolic BP
    const sbp = vitals.systolicBP ?? vitals.systolicBp ?? vitals.sbp;
    if (sbp != null) {
      if (sbp <= 70) score += 3;
      else if (sbp <= 80) score += 2;
      else if (sbp <= 100) score += 1;
      else if (sbp <= 199) score += 0;
      else score += 2;
    }

    // Heart rate
    const hr = vitals.heartRate ?? vitals.hr ?? vitals.pulse;
    if (hr != null) {
      if (hr < 40) score += 2;
      else if (hr < 51) score += 1;
      else if (hr <= 100) score += 0;
      else if (hr <= 110) score += 1;
      else if (hr <= 129) score += 2;
      else score += 3;
    }

    // Respiratory rate
    const rr = vitals.respiratoryRate ?? vitals.rr;
    if (rr != null) {
      if (rr < 9) score += 2;
      else if (rr <= 14) score += 0;
      else if (rr <= 20) score += 1;
      else if (rr <= 29) score += 2;
      else score += 3;
    }

    // Temperature
    const temp = vitals.temperature ?? vitals.temp;
    if (temp != null) {
      if (temp < 35) score += 2;
      else if (temp < 36) score += 1;
      else if (temp <= 38) score += 0;
      else if (temp <= 38.4) score += 1;
      else score += 2;
    }

    // Consciousness (AVPU): A=0, V=1, P=2, U=3
    const avpu = vitals.consciousness ?? vitals.avpu;
    if (avpu != null) {
      const avpuStr = String(avpu).toUpperCase();
      if (avpuStr === 'V' || avpuStr === 'VOICE') score += 1;
      else if (avpuStr === 'P' || avpuStr === 'PAIN') score += 2;
      else if (avpuStr === 'U' || avpuStr === 'UNRESPONSIVE') score += 3;
    }

    return score;
  }

  /**
   * Predict length of stay based on diagnosis and patient factors
   */
  async predictLengthOfStay(admission: {
    diagnosis: string;
    age: number;
    comorbidities: string[];
    surgicalProcedure?: string;
    admissionType: string;
  }): Promise<LengthOfStayResult> {
    const startTime = Date.now();
    this.logger.log(
      `predictLengthOfStay called - diagnosis: ${admission.diagnosis.slice(0, 50)}, age: ${admission.age}`,
    );

    const systemPrompt = `Você é um sistema de previsão de tempo de internação hospitalar.

Com base no diagnóstico, perfil do paciente e tipo de admissão, preveja o tempo estimado de internação em dias.

Considere:
- Diagnóstico principal e complexidade
- Idade do paciente (idosos geralmente têm internações mais longas)
- Comorbidades (cada comorbidade pode aumentar o tempo de internação)
- Tipo de procedimento cirúrgico (se aplicável)
- Tipo de admissão (emergência vs eletiva)
- Dados epidemiológicos brasileiros quando disponíveis

Retorne JSON:
{
  "predictedDays": número de dias estimado,
  "confidence": 0.0-1.0 (confiança na previsão),
  "factors": ["fator que influencia 1", "fator 2"]
}

Seja conservador na confiança quando houver muitas variáveis desconhecidas.`;

    const userPrompt = `Diagnóstico: ${admission.diagnosis}
Idade: ${admission.age} anos
Comorbidades: ${admission.comorbidities.length > 0 ? admission.comorbidities.join(', ') : 'Nenhuma informada'}
${admission.surgicalProcedure ? `Procedimento cirúrgico: ${admission.surgicalProcedure}` : 'Sem procedimento cirúrgico planejado'}
Tipo de admissão: ${admission.admissionType}`;

    try {
      return await this.callOpenAILengthOfStay(systemPrompt, userPrompt, startTime);
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for predictLengthOfStay, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        return await this.gemini.generateJson<LengthOfStayResult>(
          userPrompt,
          systemPrompt,
        );
      } catch (fallbackError) {
        this.logger.error(
          `Both AI providers failed for predictLengthOfStay: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return {
          predictedDays: -1,
          confidence: 0,
          factors: ['Não foi possível calcular — ambos os provedores de IA falharam.'],
        };
      }
    }
  }

  private async callOpenAILengthOfStay(
    systemPrompt: string,
    userPrompt: string,
    startTime: number,
  ): Promise<LengthOfStayResult> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(
      `predictLengthOfStay completed - model: gpt-4o, latency: ${latency}ms, outputLength: ${content.length}`,
    );

    const parsed = JSON.parse(content);
    return {
      predictedDays: parsed.predictedDays ?? -1,
      confidence: parsed.confidence ?? 0,
      factors: parsed.factors ?? [],
    };
  }
}
