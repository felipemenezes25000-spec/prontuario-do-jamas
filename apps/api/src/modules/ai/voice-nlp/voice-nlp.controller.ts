import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { VoiceNlpService } from './voice-nlp.service';
import {
  TranscribeAudioDto,
  GenerateSoapDto,
  StartAmbientDto,
  ExtractEntitiesDto,
  StructureTextDto,
  DetectInconsistenciesDto,
  TranslateTextDto,
  SummarizeTextDto,
  AutocompleteDto,
  AmbientSessionsQueryDto,
  TranscribeResponseDto,
  SoapResponseDto,
  AmbientSessionResponseDto,
  AmbientSessionListResponseDto,
  ExtractEntitiesResponseDto,
  StructureTextResponseDto,
  DetectInconsistenciesResponseDto,
  TranslateTextResponseDto,
  SummarizeTextResponseDto,
  AutocompleteResponseDto,
} from './dto/voice-nlp.dto';

@ApiTags('AI — Voice & NLP')
@ApiBearerAuth('access-token')
@Controller('ai')
export class VoiceNlpController {
  constructor(private readonly voiceNlpService: VoiceNlpService) {}

  // ─── Voice Endpoints ────────────────────────────────────────────────────

  @Post('voice/transcribe')
  @ApiOperation({ summary: 'Transcribe audio to text (simulated Whisper)' })
  @ApiResponse({ status: 201, description: 'Transcription result with speaker diarization', type: TranscribeResponseDto })
  async transcribe(
    @CurrentTenant() tenantId: string,
    @Body() dto: TranscribeAudioDto,
  ): Promise<TranscribeResponseDto> {
    return this.voiceNlpService.transcribe(
      tenantId,
      dto.audioBase64,
      dto.format,
      dto.language,
      dto.specialty,
      dto.enableDiarization,
    );
  }

  @Post('voice/generate-soap')
  @ApiOperation({ summary: 'Generate SOAP note from transcription text' })
  @ApiResponse({ status: 201, description: 'Structured SOAP note with coding suggestions', type: SoapResponseDto })
  async generateSoap(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenerateSoapDto,
  ): Promise<SoapResponseDto> {
    return this.voiceNlpService.generateSoap(
      tenantId,
      dto.transcription,
      dto.specialty,
      dto.includeCoding,
      dto.includeMedications,
      dto.instructions,
    );
  }

  @Post('voice/ambient/start')
  @ApiOperation({ summary: 'Start ambient listening session for an encounter' })
  @ApiResponse({ status: 201, description: 'Ambient session started', type: AmbientSessionResponseDto })
  async startAmbient(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: StartAmbientDto,
  ): Promise<AmbientSessionResponseDto> {
    return this.voiceNlpService.startAmbientSession(
      tenantId,
      user.sub,
      dto.patientId,
      dto.encounterId,
      dto.specialty,
      dto.language,
      dto.context,
    );
  }

  @Patch('voice/ambient/:sessionId/stop')
  @ApiOperation({ summary: 'Stop ambient session and trigger transcription' })
  @ApiParam({ name: 'sessionId', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Session stopped and transcribed', type: AmbientSessionResponseDto })
  async stopAmbient(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<AmbientSessionResponseDto> {
    return this.voiceNlpService.stopAmbientSession(tenantId, sessionId);
  }

  @Get('voice/ambient/sessions')
  @ApiOperation({ summary: 'List ambient listening sessions with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated ambient session list', type: AmbientSessionListResponseDto })
  async listAmbientSessions(
    @CurrentTenant() tenantId: string,
    @Query() query: AmbientSessionsQueryDto,
  ): Promise<AmbientSessionListResponseDto> {
    return this.voiceNlpService.listAmbientSessions(
      tenantId,
      query.encounterId,
      query.patientId,
      query.status,
      query.page,
      query.limit,
    );
  }

  // ─── NLP Endpoints ──────────────────────────────────────────────────────

  @Post('nlp/extract-entities')
  @ApiOperation({ summary: 'Extract medical entities (medications, diagnoses, allergies, procedures, symptoms, vitals) from text' })
  @ApiResponse({ status: 201, description: 'Extracted entities with types, offsets, codes, and negation detection', type: ExtractEntitiesResponseDto })
  async extractEntities(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractEntitiesDto,
  ): Promise<ExtractEntitiesResponseDto> {
    return this.voiceNlpService.extractEntities(
      tenantId,
      dto.text,
      dto.entityTypes,
      dto.minConfidence,
      dto.includeNegations,
    );
  }

  @Post('nlp/structure')
  @ApiOperation({ summary: 'Convert free text to structured clinical data (SOAP, H&P, discharge summary, progress note)' })
  @ApiResponse({ status: 201, description: 'Structured clinical note', type: StructureTextResponseDto })
  async structureText(
    @CurrentTenant() tenantId: string,
    @Body() dto: StructureTextDto,
  ): Promise<StructureTextResponseDto> {
    return this.voiceNlpService.structureText(
      tenantId,
      dto.text,
      dto.outputFormat,
      dto.specialty,
    );
  }

  @Post('nlp/inconsistencies')
  @ApiOperation({ summary: 'Detect clinical inconsistencies — drug-allergy conflicts, smoking+DPOC, duplicate therapy, age/gender mismatches' })
  @ApiResponse({ status: 201, description: 'Detected inconsistencies with severity and suggested actions', type: DetectInconsistenciesResponseDto })
  async detectInconsistencies(
    @CurrentTenant() tenantId: string,
    @Body() dto: DetectInconsistenciesDto,
  ): Promise<DetectInconsistenciesResponseDto> {
    return this.voiceNlpService.detectInconsistencies(
      tenantId,
      dto.text,
      dto.currentMedications,
      dto.knownAllergies,
      dto.activeDiagnoses,
      dto.patientAge,
      dto.patientGender,
    );
  }

  @Post('nlp/translate')
  @ApiOperation({ summary: 'Translate clinical text between PT-BR, EN-US, and ES with medical terminology preservation' })
  @ApiResponse({ status: 201, description: 'Translated text with preserved medical terms', type: TranslateTextResponseDto })
  async translateText(
    @CurrentTenant() tenantId: string,
    @Body() dto: TranslateTextDto,
  ): Promise<TranslateTextResponseDto> {
    return this.voiceNlpService.translateText(
      tenantId,
      dto.text,
      dto.sourceLanguage,
      dto.targetLanguage,
      dto.preserveTerminology,
    );
  }

  @Post('nlp/summarize')
  @ApiOperation({ summary: 'Summarize clinical notes — professional (technical) + patient-friendly (leigo) versions' })
  @ApiResponse({ status: 201, description: 'Dual summaries with key findings extraction', type: SummarizeTextResponseDto })
  async summarizeText(
    @CurrentTenant() tenantId: string,
    @Body() dto: SummarizeTextDto,
  ): Promise<SummarizeTextResponseDto> {
    return this.voiceNlpService.summarizeText(
      tenantId,
      dto.text,
      dto.audience,
      dto.maxWords,
      dto.focusAreas,
    );
  }

  @Post('nlp/autocomplete')
  @ApiOperation({ summary: 'Clinical text autocomplete suggestions based on field context and specialty' })
  @ApiResponse({ status: 201, description: 'Autocomplete suggestions ranked by relevance', type: AutocompleteResponseDto })
  async autocomplete(
    @CurrentTenant() tenantId: string,
    @Body() dto: AutocompleteDto,
  ): Promise<AutocompleteResponseDto> {
    return this.voiceNlpService.autocomplete(
      tenantId,
      dto.text,
      dto.fieldContext,
      dto.specialty,
      dto.maxSuggestions,
    );
  }
}
