import { Injectable, Inject, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';

export type VoiceIntent =
  | 'SOAP'
  | 'PRESCRIPTION'
  | 'EXAM_REQUEST'
  | 'CERTIFICATE'
  | 'REFERRAL'
  | 'EVOLUTION'
  | 'VITALS'
  | 'DISCHARGE';

export interface VoiceIntentResult {
  intent: VoiceIntent;
  confidence: number;
  extractedData: Record<string, unknown>;
}

const CLASSIFICATION_PROMPT = `Voce e um classificador de intencoes de comandos de voz medicos.
Dado um texto ditado por um medico durante um atendimento, classifique a intencao principal.

Intencoes possiveis:
- SOAP: o medico esta ditando anamnese, exame fisico, avaliacao ou plano terapeutico
- PRESCRIPTION: o medico esta prescrevendo medicamentos ("prescrever dipirona", "receitar amoxicilina", "medicacao: ...")
- EXAM_REQUEST: o medico esta solicitando exames ("solicitar hemograma", "pedir RX torax", "quero um ECG")
- CERTIFICATE: o medico esta pedindo atestado ("atestado de 3 dias", "afastamento por 5 dias")
- REFERRAL: o medico esta fazendo encaminhamento ("encaminhar para cardiologia", "referencia para ortopedia")
- EVOLUTION: o medico esta ditando evolucao clinica ("evolucao do paciente", "paciente evolui bem")
- VITALS: o medico esta ditando sinais vitais ("pressao 12 por 8", "saturacao 97", "frequencia cardiaca 80")
- DISCHARGE: o medico esta dando alta ("alta hospitalar", "alta com orientacoes")

Regras:
1. Se o texto menciona multiplas intencoes, priorize a PRIMEIRA detectada.
2. Se nao tiver certeza, classifique como SOAP (e o mais comum).
3. Para PRESCRIPTION, extraia: items (array de {medicationName, dose, route, frequency, duration}).
4. Para EXAM_REQUEST, extraia: exams (array de {examName, examType, urgency}).
5. Para CERTIFICATE, extraia: days, cidCode, cidDescription.
6. Para REFERRAL, extraia: specialty, reason, urgency.
7. Para VITALS, extraia: systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, gcs, painScale.
8. Para DISCHARGE, extraia: dischargeType, condition, followUpDays.
9. "12 por 8" significa pressao arterial 120/80 mmHg.
10. "saturacao 97" significa SpO2 97%.

Retorne JSON:
{
  "intent": "SOAP|PRESCRIPTION|EXAM_REQUEST|CERTIFICATE|REFERRAL|EVOLUTION|VITALS|DISCHARGE",
  "confidence": 0.0-1.0,
  "extractedData": { ... dados relevantes extraidos do texto ... }
}`;

@Injectable()
export class VoiceCommandService {
  private readonly logger = new Logger(VoiceCommandService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
  ) {}

  async classifyIntent(text: string): Promise<VoiceIntentResult> {
    if (!this.openai) {
      return { intent: 'SOAP', confidence: 0, extractedData: {} };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { intent: 'SOAP', confidence: 0.5, extractedData: {} };
      }

      const parsed = JSON.parse(content) as VoiceIntentResult;
      this.logger.log(
        `Intent classified: ${parsed.intent} (confidence: ${parsed.confidence}) for text: "${text.slice(0, 80)}..."`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `Intent classification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { intent: 'SOAP', confidence: 0.5, extractedData: {} };
    }
  }
}
