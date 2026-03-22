import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VoiceEngineService } from '../../ai/voice-engine.service';
import { MedicalNerService } from '../../ai/medical-ner.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { StorageService } from '../../storage/storage.service';

export interface TranscriptionJobData {
  transcriptionId: string;
  audioUrl: string;
  context: string;
  language: string;
  userId: string;
  tenantId: string;
  encounterId?: string;
  patientData?: Record<string, unknown>;
}

@Processor('transcription')
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    private readonly voiceEngine: VoiceEngineService,
    private readonly medicalNer: MedicalNerService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<TranscriptionJobData>): Promise<void> {
    const { transcriptionId, audioUrl, context, language, userId, patientData } =
      job.data;

    this.logger.log(
      `Processing transcription job ${job.id} for transcription ${transcriptionId}`,
    );

    try {
      // Update status to processing
      await this.prisma.voiceTranscription.update({
        where: { id: transcriptionId },
        data: { processingStatus: 'PROCESSING' },
      });

      await job.updateProgress(10);

      // Parse the S3 URL to download the audio
      const audioBuffer = await this.downloadFromS3(audioUrl);
      await job.updateProgress(20);

      // Transcribe the audio
      const transcriptionResult = await this.voiceEngine.transcribeAudio(
        audioBuffer,
        context,
        language,
      );
      await job.updateProgress(50);

      // Extract medical entities using NER
      const nerResult = await this.medicalNer.extractEntities(
        transcriptionResult.text,
      );
      await job.updateProgress(75);

      // Process transcription with GPT for structured output
      const processedResult = await this.voiceEngine.processTranscription(
        transcriptionResult.text,
        context,
        patientData,
      );
      await job.updateProgress(90);

      // Update the transcription record
      await this.prisma.voiceTranscription.update({
        where: { id: transcriptionId },
        data: {
          rawTranscription: transcriptionResult.text,
          processedTranscription: processedResult.processedText,
          processingStatus: 'COMPLETED',
          confidence: transcriptionResult.confidence,
          language: transcriptionResult.language,
          audioDuration: transcriptionResult.duration,
          structuredData: JSON.parse(JSON.stringify({
            ...processedResult.structuredData,
            entities: nerResult,
          })),
        },
      });

      // Emit real-time completion event
      this.realtime.emitTranscriptionComplete(userId, {
        transcriptionId,
        text: processedResult.processedText,
        confidence: transcriptionResult.confidence,
        entities: nerResult,
        structuredData: processedResult.structuredData,
      });

      await job.updateProgress(100);
      this.logger.log(
        `Transcription job ${job.id} completed successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Transcription job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update status to failed
      await this.prisma.voiceTranscription.update({
        where: { id: transcriptionId },
        data: { processingStatus: 'FAILED' },
      });

      // Notify user of failure
      this.realtime.emitTranscriptionComplete(userId, {
        transcriptionId,
        error: 'Falha ao processar transcrição de áudio',
      });

      throw error;
    }
  }

  private async downloadFromS3(s3Url: string): Promise<Buffer> {
    // Parse s3://bucket/key format
    const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid S3 URL: ${s3Url}`);
    }

    const [, bucket, key] = match;
    const presignedUrl = await this.storage.getSignedDownloadUrl(bucket, key, 300);

    const response = await fetch(presignedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio from S3: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
