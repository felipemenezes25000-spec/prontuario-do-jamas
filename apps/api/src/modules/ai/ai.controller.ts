import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';

import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

import { VoiceEngineService } from './voice-engine.service';
import { SoapGeneratorService } from './soap-generator.service';
import { PrescriptionAiService } from './prescription-ai.service';
import { ClinicalCopilotService } from './clinical-copilot.service';
import { PatientSummaryAiService } from './patient-summary-ai.service';
import { TriageAiService } from './triage-ai.service';
import { MedicalNerService } from './medical-ner.service';
import { CodingAiService } from './coding-ai.service';
import { DischargeAiService } from './discharge-ai.service';

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
  RefineSOAPDto,
  RefineSOAPResponseDto,
  CopilotAutocompleteDto,
  CopilotAutocompleteResponseDto,
  CodingSuggestionsResponseDto,
  SuggestNursingDiagnosesDto,
  SuggestNursingDiagnosesResponseDto,
  DischargePlanDto,
  DischargePlanResponseDto,
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
    private readonly codingAi: CodingAiService,
    private readonly dischargeAi: DischargeAiService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
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
        undefined,
        dto.doctorSpecialty,
        dto.patientId,
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

  // ─── SOAP Stream (SSE) ────────────────────────────────────────

  @Get('soap/stream')
  @ApiOperation({ summary: 'Stream SOAP generation via SSE' })
  @ApiResponse({ status: 200, description: 'SSE stream of SOAP generation chunks' })
  @ApiResponse({ status: 400, description: 'Missing encounterId' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async streamSoap(
    @Query('encounterId') encounterId: string,
    @Query('transcription') transcription: string,
    @Query('doctorSpecialty') doctorSpecialty: string | undefined,
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    if (!encounterId || !transcription) {
      res.status(400).json({
        message: 'encounterId e transcription sao obrigatorios.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      // Resolve patientId from encounter
      let patientId: string | undefined;
      try {
        const enc = await this.prisma.encounter.findUnique({
          where: { id: encounterId },
          select: { patientId: true },
        });
        patientId = enc?.patientId ?? undefined;
      } catch {
        this.logger.warn('Could not resolve patientId for SSE stream');
      }

      const stream = this.soapGenerator.streamSOAP(
        transcription,
        doctorSpecialty,
        patientId,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'SOAPStream',
        newData: {
          encounterId,
          transcriptionLength: transcription.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    } catch (error) {
      this.logger.error(
        `streamSoap failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.write(`data: ${JSON.stringify({ error: 'Servico de IA indisponivel.' })}\n\n`);
      res.write('data: [DONE]\n\n');
    } finally {
      res.end();
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

  @Post('copilot/proactive')
  @ApiOperation({ summary: 'Get proactive copilot suggestions based on current text' })
  @ApiResponse({ status: 200, description: 'Proactive copilot suggestions' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getProactiveSuggestions(
    @Body() body: { encounterId: string; currentText: string; field: string },
    @CurrentUser() user: JwtPayload,
  ): Promise<{ suggestions: Array<{ text: string; field: string; reason: string }> }> {
    if (!body.encounterId || !body.currentText || !body.field) {
      throw new BadRequestException(
        'encounterId, currentText e field sao obrigatorios.',
      );
    }

    try {
      const suggestions = await this.copilot.getProactiveSuggestions(
        body.encounterId,
        body.currentText,
        body.field,
      );

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'CopilotProactive',
        newData: {
          encounterId: body.encounterId,
          field: body.field,
          textLength: body.currentText.length,
          suggestionsCount: suggestions.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { suggestions };
    } catch (error) {
      this.logger.error(
        `getProactiveSuggestions failed: ${error instanceof Error ? error.message : String(error)}`,
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

  // ─── SOAP Refine ─────────────────────────────────────────────────

  @Post('soap/refine')
  @ApiOperation({ summary: 'Refine/improve an existing SOAP note' })
  @ApiResponse({ status: 200, description: 'Refined SOAP note', type: RefineSOAPResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async refineSOAP(
    @Body() dto: RefineSOAPDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RefineSOAPResponseDto> {
    try {
      // TODO: Add a dedicated refineSOAP method to SoapGeneratorService.
      // For now, re-generate using the existing SOAP fields as a transcription-like input.
      const combinedText = [
        `Subjetivo: ${dto.subjective}`,
        `Objetivo: ${dto.objective}`,
        `Avaliacao: ${dto.assessment}`,
        `Plano: ${dto.plan}`,
        dto.feedback ? `Feedback do medico: ${dto.feedback}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await this.soapGenerator.generateSOAP(combinedText);

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'SOAPRefine',
        newData: {
          hasFeedback: !!dto.feedback,
          inputLength: combinedText.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return {
        subjective: result.subjective,
        objective: result.objective,
        assessment: result.assessment,
        plan: result.plan,
        changesMade: [
          'Nota SOAP refinada com base no conteudo original',
          ...(dto.feedback ? [`Feedback aplicado: ${dto.feedback}`] : []),
        ],
      };
    } catch (error) {
      this.logger.error(
        `refineSOAP failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Copilot Autocomplete ────────────────────────────────────────

  @Post('copilot/autocomplete')
  @ApiOperation({ summary: 'Auto-complete text in clinical context' })
  @ApiResponse({ status: 200, description: 'Autocomplete suggestions', type: CopilotAutocompleteResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async autocomplete(
    @Body() dto: CopilotAutocompleteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CopilotAutocompleteResponseDto> {
    try {
      // TODO: Add a dedicated autocomplete method to ClinicalCopilotService.
      // For now, use getSuggestions and extract text as autocomplete suggestions.
      const suggestions = await this.copilot.getSuggestions(
        { context: dto.context ?? 'general' },
        dto.text,
        {},
      );

      const autocompleteSuggestions = suggestions
        .filter((s) => s.type === 'suggestion')
        .map((s) => s.text)
        .slice(0, 5);

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'CopilotAutocomplete',
        newData: {
          textLength: dto.text.length,
          context: dto.context,
          suggestionsCount: autocompleteSuggestions.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { suggestions: autocompleteSuggestions };
    } catch (error) {
      this.logger.error(
        `autocomplete failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Coding Suggestions ──────────────────────────────────────────

  @Get('encounters/:encounterId/coding-suggestions')
  @ApiOperation({ summary: 'Suggest ICD-10 and procedure codes for an encounter' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID', type: String })
  @ApiResponse({ status: 200, description: 'Coding suggestions', type: CodingSuggestionsResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getCodingSuggestions(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CodingSuggestionsResponseDto> {
    try {
      // TODO: Fetch encounter clinical notes from DB to provide richer context to suggestCodes.
      // For now, pass the encounterId as context.
      const result = await this.codingAi.suggestCodes({
        assessment: `Encounter ${encounterId}`,
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'AI_SUGGESTION',
        entity: 'CodingSuggestion',
        newData: {
          encounterId,
          diagnosisCount: result.diagnosisCodes.length,
          procedureCount: result.procedureCodes.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return {
        diagnosisCodes: result.diagnosisCodes,
        procedureCodes: result.procedureCodes,
      };
    } catch (error) {
      this.logger.error(
        `getCodingSuggestions failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Nursing Diagnoses ───────────────────────────────────────────

  @Post('nursing/suggest-diagnoses')
  @ApiOperation({ summary: 'Suggest NANDA nursing diagnoses based on symptoms and vitals' })
  @ApiResponse({ status: 200, description: 'Nursing diagnosis suggestions', type: SuggestNursingDiagnosesResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async suggestNursingDiagnoses(
    @Body() dto: SuggestNursingDiagnosesDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SuggestNursingDiagnosesResponseDto> {
    try {
      // TODO: Create a dedicated NursingAiService.suggestDiagnoses method.
      // For now, use triage AI to classify and map to NANDA diagnoses as a stub.
      const triageResult = await this.triageAi.classifyTriage(
        dto.symptoms,
        dto.vitalSigns,
      );

      // Map triage data to nursing diagnosis suggestions (stub)
      const diagnoses: Array<{ code: string; label: string; priority: string }> = [];

      if (triageResult.suggestedLevel === 'VERMELHO' || triageResult.suggestedLevel === 'LARANJA') {
        diagnoses.push({
          code: '00032',
          label: 'Padrao respiratorio ineficaz',
          priority: 'HIGH',
        });
      }

      diagnoses.push(
        {
          code: '00132',
          label: 'Dor aguda',
          priority: dto.symptoms.some((s) => s.toLowerCase().includes('dor')) ? 'HIGH' : 'MEDIUM',
        },
        {
          code: '00146',
          label: 'Ansiedade',
          priority: 'MEDIUM',
        },
        {
          code: '00004',
          label: 'Risco de infeccao',
          priority: 'LOW',
        },
      );

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'NursingDiagnosis',
        newData: {
          symptomsCount: dto.symptoms.length,
          diagnosesCount: diagnoses.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { diagnoses };
    } catch (error) {
      this.logger.error(
        `suggestNursingDiagnoses failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Discharge Plan ──────────────────────────────────────────────

  @Post('admissions/:admissionId/discharge-plan')
  @ApiOperation({ summary: 'Generate AI-powered discharge plan for an admission' })
  @ApiParam({ name: 'admissionId', description: 'Admission UUID', type: String })
  @ApiResponse({ status: 200, description: 'Discharge plan', type: DischargePlanResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async generateDischargePlan(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
    @Body() dto: DischargePlanDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DischargePlanResponseDto> {
    try {
      const [summary, instructions] = await Promise.all([
        this.dischargeAi.generateDischargeSummary({
          id: admissionId,
          patientId: dto.patientId,
        }),
        this.dischargeAi.generateDischargeInstructions(
          { id: admissionId },
          { id: dto.patientId },
        ),
      ]);

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'AI_SUGGESTION',
        entity: 'DischargePlan',
        newData: {
          admissionId,
          summaryLength: summary.length,
          instructionsLength: instructions.length,
        },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return {
        plan: summary,
        medications: [], // TODO: Extract medications from discharge summary via NER
        followUp: [], // TODO: Extract follow-up items from discharge summary
        instructions,
        warnings: [], // TODO: Extract warning signs from instructions
      };
    } catch (error) {
      this.logger.error(
        `generateDischargePlan failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }

  // ─── Patient Summary (GET) ──────────────────────────────────────

  @Get('patients/:patientId/summary')
  @ApiOperation({ summary: 'Get AI-generated patient summary (GET version)' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID', type: String })
  @ApiResponse({ status: 200, description: 'Patient summary', type: PatientSummaryResponseDto })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getPatientSummaryById(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientSummaryResponseDto> {
    try {
      const summary = await this.patientSummaryAi.generateSummary({
        id: patientId,
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId,
        action: 'AI_SUGGESTION',
        entity: 'PatientSummary',
        newData: { summaryLength: summary.length },
      }).catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { summary };
    } catch (error) {
      this.logger.error(
        `getPatientSummaryById failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Servico de IA indisponivel. Tente novamente em alguns instantes.',
      );
    }
  }
}
