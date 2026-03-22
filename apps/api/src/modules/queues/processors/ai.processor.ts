import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SoapGeneratorService } from '../../ai/soap-generator.service';
import { PatientSummaryAiService } from '../../ai/patient-summary-ai.service';
import { DischargeAiService } from '../../ai/discharge-ai.service';
import { PrescriptionAiService } from '../../ai/prescription-ai.service';
import { TriageAiService } from '../../ai/triage-ai.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

export type AiJobType =
  | 'soap-generation'
  | 'patient-summary'
  | 'discharge-summary'
  | 'prescription-safety'
  | 'triage-classification';

export interface AiJobData {
  type: AiJobType;
  userId: string;
  tenantId: string;
  payload: Record<string, unknown>;
}

@Processor('ai-processing')
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly soapGenerator: SoapGeneratorService,
    private readonly patientSummary: PatientSummaryAiService,
    private readonly dischargeAi: DischargeAiService,
    private readonly prescriptionAi: PrescriptionAiService,
    private readonly triageAi: TriageAiService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job<AiJobData>): Promise<void> {
    const { type, userId, payload } = job.data;

    this.logger.log(`Processing AI job ${job.id} (type: ${type})`);

    try {
      let result: unknown;

      switch (type) {
        case 'soap-generation':
          result = await this.handleSoapGeneration(payload);
          break;
        case 'patient-summary':
          result = await this.handlePatientSummary(payload);
          break;
        case 'discharge-summary':
          result = await this.handleDischargeSummary(payload);
          break;
        case 'prescription-safety':
          result = await this.handlePrescriptionSafety(payload);
          break;
        case 'triage-classification':
          result = await this.handleTriageClassification(payload);
          break;
        default:
          throw new Error(`Unknown AI job type: ${type}`);
      }

      // Notify user via WebSocket that AI processing is complete
      this.realtime.emitNotification(userId, {
        type: 'ai-processing-complete',
        jobType: type,
        jobId: job.id,
        result,
      });

      this.logger.log(`AI job ${job.id} (type: ${type}) completed successfully`);
    } catch (error) {
      this.logger.error(
        `AI job ${job.id} (type: ${type}) failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      this.realtime.emitNotification(userId, {
        type: 'ai-processing-failed',
        jobType: type,
        jobId: job.id,
        error: 'Falha no processamento de IA. Tente novamente.',
      });

      throw error;
    }
  }

  private async handleSoapGeneration(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const transcription = payload.transcription as string;
    const patientContext = payload.patientContext as Record<string, unknown>;
    const encounterId = payload.encounterId as string | undefined;
    const authorId = payload.userId as string;
    const authorRole = payload.authorRole as string;

    const soapNote = await this.soapGenerator.generateSOAP(
      transcription,
      patientContext,
    );

    // Persist SOAP note to the encounter if encounterId is provided
    if (encounterId && authorId) {
      await this.prisma.clinicalNote.create({
        data: {
          encounterId,
          authorId,
          authorRole: (authorRole as any) || 'DOCTOR',
          type: 'SOAP',
          status: 'DRAFT',
          subjective: soapNote.subjective,
          objective: soapNote.objective,
          assessment: soapNote.assessment,
          plan: soapNote.plan,
          diagnosisCodes: soapNote.diagnosisCodes,
          wasGeneratedByAI: true,
          aiModel: 'gpt-4o',
        },
      });
    }

    return soapNote;
  }

  private async handlePatientSummary(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const patientData = payload.patient as Record<string, unknown>;
    return this.patientSummary.generateSummary(patientData);
  }

  private async handleDischargeSummary(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const admissionData = payload.admission as Record<string, unknown>;
    return this.dischargeAi.generateDischargeSummary(admissionData);
  }

  private async handlePrescriptionSafety(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const items = payload.items as Array<{
      medicationName: string;
      dose?: string;
    }>;
    const patient = payload.patient as {
      id: string;
      allergies?: string[];
      age?: number;
      weight?: number;
      conditions?: string[];
      currentMedications?: string[];
    };
    return this.prescriptionAi.checkSafety(items, patient);
  }

  private async handleTriageClassification(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const symptoms = payload.symptoms as string[];
    const vitalSigns = payload.vitalSigns as Record<string, number> | undefined;
    const patientAge = payload.patientAge as number | undefined;
    const patientGender = payload.patientGender as string | undefined;
    return this.triageAi.classifyTriage(
      symptoms,
      vitalSigns,
      patientAge,
      patientGender,
    );
  }
}
