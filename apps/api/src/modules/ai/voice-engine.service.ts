import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface ProcessedTranscription {
  rawText: string;
  processedText: string;
  structuredData: Record<string, unknown>;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

@Injectable()
export class VoiceEngineService {
  private readonly logger = new Logger(VoiceEngineService.name);

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly gemini: GeminiProvider,
  ) {}

  /**
   * Transcribe audio buffer to text using OpenAI Whisper
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    context: string,
    language = 'pt',
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    this.logger.log(
      `transcribeAudio called - context: ${context}, language: ${language}, bufferSize: ${audioBuffer.length}`,
    );

    try {
      const file = new File([audioBuffer], 'audio.webm', {
        type: 'audio/webm',
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language,
        prompt: this.getContextPrompt(context),
        response_format: 'verbose_json',
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `transcribeAudio completed - model: whisper-1, latency: ${latency}ms, outputLength: ${transcription.text.length}`,
      );

      const segments = (transcription.segments ?? []).map((seg) => ({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        confidence: seg.avg_logprob != null ? Math.exp(seg.avg_logprob) : 0.9,
      }));

      const avgConfidence =
        segments.length > 0
          ? segments.reduce((sum, s) => sum + s.confidence, 0) /
            segments.length
          : 0.9;

      return {
        text: transcription.text,
        confidence: avgConfidence,
        language: transcription.language ?? language,
        duration: transcription.duration ?? 0,
        segments,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(
        `transcribeAudio failed after ${latency}ms: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        text: '',
        confidence: 0,
        language,
        duration: 0,
        segments: [],
      };
    }
  }

  /**
   * Process transcribed text with GPT-4o, extracting medical entities
   */
  async processTranscription(
    text: string,
    context: string,
    patientData?: Record<string, unknown>,
  ): Promise<ProcessedTranscription> {
    const startTime = Date.now();
    this.logger.log(
      `processTranscription called - context: ${context}, textLength: ${text.length}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um processador de transcrição médica em português brasileiro.
Dado um texto transcrito de áudio médico, sua tarefa é:
1. Corrigir erros de transcrição e pontuação
2. Identificar e extrair entidades médicas (sintomas, medicamentos, diagnósticos, procedimentos, sinais vitais)
3. Estruturar os dados extraídos

Contexto da transcrição: ${context}
${patientData ? `Dados do paciente: ${JSON.stringify(patientData)}` : ''}

Retorne JSON com:
{
  "processedText": "texto corrigido e formatado",
  "structuredData": { dados estruturados relevantes ao contexto },
  "entities": [{ "type": "symptom|medication|diagnosis|procedure|vital|allergy", "value": "texto", "confidence": 0.0-1.0 }]
}`,
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(
        `processTranscription completed - model: gpt-4o, latency: ${latency}ms, inputLength: ${text.length}, outputLength: ${content.length}`,
      );

      const parsed = JSON.parse(content);

      return {
        rawText: text,
        processedText: parsed.processedText ?? text,
        structuredData: parsed.structuredData ?? {},
        entities: parsed.entities ?? [],
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI failed for processTranscription, attempting Gemini fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        const result = await this.gemini.generateJson<{
          processedText: string;
          structuredData: Record<string, unknown>;
          entities: Array<{ type: string; value: string; confidence: number }>;
        }>(
          text,
          `Processe transcrição médica em português. Corrija erros, extraia entidades médicas. Contexto: ${context}. Retorne JSON com processedText, structuredData, entities (array de {type, value, confidence}).`,
        );
        return {
          rawText: text,
          processedText: result.processedText ?? text,
          structuredData: result.structuredData ?? {},
          entities: result.entities ?? [],
        };
      } catch (fallbackError) {
        const latency = Date.now() - startTime;
        this.logger.error(
          `Both AI providers failed for processTranscription after ${latency}ms: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return {
          rawText: text,
          processedText: text,
          structuredData: {},
          entities: [],
        };
      }
    }
  }

  /**
   * Stream real-time transcription via chunked audio
   */
  async streamTranscription(
    audioStream: NodeJS.ReadableStream,
  ): Promise<AsyncIterable<{ text: string; isFinal: boolean }>> {
    this.logger.log('streamTranscription called');

    const openai = this.openai;
    const logger = this.logger;

    async function* generate() {
      const chunks: Buffer[] = [];

      for await (const chunk of audioStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

        // Process every ~1 second of accumulated audio (~32KB at 256kbps)
        const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
        if (totalSize >= 32000) {
          const audioBuffer = Buffer.concat(chunks);
          chunks.length = 0;

          try {
            const file = new File([audioBuffer], 'audio.webm', {
              type: 'audio/webm',
            });
            const result = await openai.audio.transcriptions.create({
              file,
              model: 'whisper-1',
              language: 'pt',
              response_format: 'text',
            });
            yield { text: result as unknown as string, isFinal: false };
          } catch (error) {
            logger.error(
              `streamTranscription chunk failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      // Process remaining audio
      if (chunks.length > 0) {
        const audioBuffer = Buffer.concat(chunks);
        try {
          const file = new File([audioBuffer], 'audio.webm', {
            type: 'audio/webm',
          });
          const result = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'pt',
            response_format: 'text',
          });
          yield { text: result as unknown as string, isFinal: true };
        } catch (error) {
          logger.error(
            `streamTranscription final chunk failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          yield { text: '', isFinal: true };
        }
      }
    }

    return generate();
  }

  private getContextPrompt(context: string): string {
    const prompts: Record<string, string> = {
      anamnesis:
        'Transcrição de anamnese médica em português brasileiro. Termos médicos: sinais vitais, sintomas, diagnósticos, CID-10.',
      evolution:
        'Transcrição de evolução clínica médica em português brasileiro.',
      prescription:
        'Transcrição de prescrição médica em português brasileiro. Medicamentos, doses, vias, frequências.',
      soap: 'Transcrição de consulta médica em formato SOAP em português brasileiro.',
      triage:
        'Transcrição de triagem/classificação de risco em português brasileiro. Protocolo de Manchester.',
      nursing:
        'Transcrição de anotação de enfermagem em português brasileiro. SAE, NANDA, NIC, NOC.',
      surgical:
        'Transcrição de descrição cirúrgica em português brasileiro.',
      general: 'Transcrição médica em português brasileiro.',
    };
    return prompts[context] || prompts.general;
  }
}
