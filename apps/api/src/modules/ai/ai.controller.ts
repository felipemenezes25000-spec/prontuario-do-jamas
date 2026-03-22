import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';

import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

import { VoiceEngineService } from './voice-engine.service';
import { SoapGeneratorService } from './soap-generator.service';
import { PrescriptionAiService } from './prescription-ai.service';
import { ClinicalCopilotService } from './clinical-copilot.service';
import { PatientSummaryAiService } from './patient-summary-ai.service';
import { TriageAiService } from './triage-ai.service';
import { MedicalNerService } from './medical-ner.service';

import {
  VoiceTranscribeDto,
  VoiceTranscribeResponseDto,
  VoiceProcessDto,
  VoiceProcessResponseDto,
  SoapGenerateDto,
  SoapGenerateResponseDto,
  PrescriptionParseVoiceDto,
  PrescriptionParseVoiceResponseDto,
  PrescriptionCheckSafetyDto,
  PrescriptionCheckSafetyResponseDto,
  PrescriptionSuggestDto,
  PrescriptionSuggestResponseDto,
  CopilotSuggestionsDto,
  CopilotSuggestionsResponseDto,
  PatientSummaryDto,
  PatientSummaryResponseDto,
  TriageClassifyDto,
  TriageClassifyResponseDto,
} from './dto';

const TRIAGE_LEVEL_DESCRIPTIONS: Record<string, string> = {
  VERMELHO: 'Emergencia - Atendimento imediato',
  LARANJA: 'Muito Urgente - Ate 10 minutos',
  AMARELO: 'Urgente - Ate 60 minutos',
  VERDE: 'Pouco Urgente - Ate 120 minutos',
  AZUL: 'Nao Urgente - Ate 240 minutos',
};

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly voiceEngine: VoiceEngineService,
    private readonly soapGenerator: SoapGeneratorService,
    private readonly prescriptionAi: PrescriptionAiService,
    private readonly copilot: ClinicalCopilotService,
    private readonly patientSummaryAi: PatientSummaryAiService,
    private readonly triageAi: TriageAiService,
    private readonly medicalNer: MedicalNerService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Voice ──────────────────────────────────────────────────────

  @Post('voice/transcribe')
  @ApiOperation({ summary: 'Transcribe audio file to text using Whisper' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Audio file (WebM/Opus)' },
        context: { type: 'string', description: 'Voice context' },
        encounterId: { type: 'string', format: 'uuid' },
        patientId: { type: 'string', format: 'uuid' },
      },
      required: ['audio'],
    },
  })
  @ApiResponse({ status: 200, description: 'Transcription result', type: VoiceTranscribeResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid audio file' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de audio nao permitido: ${file.mimetype}. Use: ${allowed.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async transcribeVoice(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: VoiceTranscribeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VoiceTranscribeResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Arquivo de audio e obrigatorio.');
    }

    const context = dto.context ?? 'general';
    const transcriptionId = randomUUID();

    try {
      const result = await this.voiceEngine.transcribeAudio(
        Buffer.from(file.buffer),
        context,
      );

      if (!result.text) {
        throw new ServiceUnavailableException(
          'Nao foi possivel transcrever o audio. Tente novamente.',
        );
      }

      // Extract structured data from transcription
      let structuredData: Record<string, unknown> = {};
      if (result.text.length > 0) {
        try {
          const processed = await this.voiceEngine.processTranscription(
            result.text,
            context,
          );
          structuredData = processed.structuredData;
        } catch {
          this.logger.warn('Failed to extract structured data from transcription');
        }
      }

      // Audit log
      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'VOICE_COMMAND',
        entity: 'VoiceTranscription',
        entityId: transcriptionId,
        newData: {
          context,
          encounterId: dto.encounterId,
          textLength: result.text.length,
          confidence: result.confidence,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return {
        transcriptionId,
        text: result.text,
        confidence: result.confidence,
        structuredData,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      this.logger.error(
        `transcribeVoice failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  @Post('voice/process')
  @ApiOperation({ summary: 'Process transcribed text extracting medical entities' })
  @ApiResponse({ status: 200, description: 'Processed transcription', type: VoiceProcessResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async processVoice(
    @Body() dto: VoiceProcessDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VoiceProcessResponseDto> {
    const context = dto.context ?? 'general';

    try {
      const result = await this.voiceEngine.processTranscription(
        dto.text,
        context,
      );

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'VoiceProcess',
        newData: { context, textLength: dto.text.length },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return {
        processedText: result.processedText,
        structuredData: result.structuredData,
        entities: result.entities,
      };
    } catch (error) {
      this.logger.error(
        `processVoice failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── SOAP ───────────────────────────────────────────────────────

  @Post('soap/generate')
  @ApiOperation({ summary: 'Generate SOAP note from transcription' })
  @ApiResponse({ status: 200, description: 'Generated SOAP note', type: SoapGenerateResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async generateSoap(
    @Body() dto: SoapGenerateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SoapGenerateResponseDto> {
    try {
      const result = await this.soapGenerator.generateSOAP(
        dto.transcription,
        undefined, // patient context could be fetched from DB by patientId in future
        dto.doctorSpecialty,
      );

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'SOAPNote',
        newData: {
          encounterId: dto.encounterId,
          transcriptionLength: dto.transcription.length,
          hasDiagnosis: result.diagnosisCodes.length > 0,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return result;
    } catch (error) {
      this.logger.error(
        `generateSoap failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Prescription ──────────────────────────────────────────────

  @Post('prescription/parse-voice')
  @ApiOperation({ summary: 'Parse voice-dictated prescription into structured items' })
  @ApiResponse({ status: 200, description: 'Parsed prescription items', type: PrescriptionParseVoiceResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async parsePrescription(
    @Body() dto: PrescriptionParseVoiceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PrescriptionParseVoiceResponseDto> {
    try {
      const result = await this.prescriptionAi.parseVoicePrescription(dto.text);

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'PrescriptionParse',
        newData: { textLength: dto.text.length, itemsFound: result.items.length },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return result;
    } catch (error) {
      this.logger.error(
        `parsePrescription failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  @Post('prescription/check-safety')
  @ApiOperation({ summary: 'Check prescription safety (interactions, allergies, doses)' })
  @ApiResponse({ status: 200, description: 'Safety check result', type: PrescriptionCheckSafetyResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async checkPrescriptionSafety(
    @Body() dto: PrescriptionCheckSafetyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PrescriptionCheckSafetyResponseDto> {
    try {
      const result = await this.prescriptionAi.checkSafety(dto.items, {
        id: dto.patientId,
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'PrescriptionSafety',
        newData: {
          itemCount: dto.items.length,
          safe: result.safe,
          warningCount: result.warnings.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return result;
    } catch (error) {
      this.logger.error(
        `checkPrescriptionSafety failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  @Post('prescription/suggest')
  @ApiOperation({ summary: 'Suggest medications based on diagnosis and patient profile' })
  @ApiResponse({ status: 200, description: 'Medication suggestions', type: PrescriptionSuggestResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async suggestPrescription(
    @Body() dto: PrescriptionSuggestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PrescriptionSuggestResponseDto> {
    try {
      const suggestions = await this.prescriptionAi.suggestMedications(
        dto.diagnosis,
      );

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'PrescriptionSuggest',
        newData: {
          diagnosis: dto.diagnosis,
          suggestionsCount: suggestions.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { suggestions };
    } catch (error) {
      this.logger.error(
        `suggestPrescription failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Copilot ────────────────────────────────────────────────────

  @Post('copilot/suggestions')
  @ApiOperation({ summary: 'Get AI copilot suggestions during encounter' })
  @ApiResponse({ status: 200, description: 'Copilot suggestions', type: CopilotSuggestionsResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getCopilotSuggestions(
    @Body() dto: CopilotSuggestionsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CopilotSuggestionsResponseDto> {
    try {
      const suggestions = await this.copilot.getSuggestions(
        { id: dto.encounterId },
        dto.transcription ?? '',
        {},
      );

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'CopilotSuggestion',
        newData: {
          encounterId: dto.encounterId,
          suggestionsCount: suggestions.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { suggestions };
    } catch (error) {
      this.logger.error(
        `getCopilotSuggestions failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Patient Summary ───────────────────────────────────────────

  @Post('patient/summary')
  @ApiOperation({ summary: 'Generate AI patient summary' })
  @ApiResponse({ status: 200, description: 'Patient summary', type: PatientSummaryResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getPatientSummary(
    @Body() dto: PatientSummaryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientSummaryResponseDto> {
    try {
      const summary = await this.patientSummaryAi.generateSummary({
        id: dto.patientId,
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'PatientSummary',
        newData: { summaryLength: summary.length },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { summary };
    } catch (error) {
      this.logger.error(
        `getPatientSummary failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Triage ─────────────────────────────────────────────────────

  @Post('triage/classify')
  @ApiOperation({ summary: 'Classify triage level using Manchester Protocol' })
  @ApiResponse({ status: 200, description: 'Triage classification', type: TriageClassifyResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async classifyTriage(
    @Body() dto: TriageClassifyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TriageClassifyResponseDto> {
    try {
      // Extract symptoms from free text via NER
      const entities = await this.medicalNer.extractEntities(dto.text);
      const symptoms = entities.symptoms.map((s) => s.name);
      const fallbackSymptoms = symptoms.length > 0 ? symptoms : [dto.text];

      const result = await this.triageAi.classifyTriage(
        fallbackSymptoms,
        dto.vitalSigns,
      );

      // Detect red flags
      const redFlagResult = await this.triageAi.detectRedFlags({
        symptoms: fallbackSymptoms,
        vitals: dto.vitalSigns,
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'TriageClassification',
        newData: {
          level: result.suggestedLevel,
          confidence: result.confidence,
          hasRedFlags: redFlagResult.hasRedFlags,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return {
        level: result.suggestedLevel,
        levelDescription:
          TRIAGE_LEVEL_DESCRIPTIONS[result.suggestedLevel] ?? result.suggestedLevel,
        discriminators: result.discriminators,
        redFlags: redFlagResult.flags.map((f) => ({
          flag: f.flag,
          severity: f.severity,
          recommendation: f.recommendation,
        })),
        suggestedMaxWait: result.maxWaitTimeMinutes,
      };
    } catch (error) {
      this.logger.error(
        `classifyTriage failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }
}
