import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { NlpService } from './nlp.service';
import {
  ExtractFromTextDto,
  ExtractEntitiesDto,
  StructureTextDto,
  DetectInconsistenciesDto,
  TranslateTextDto,
  SummarizeTextDto,
  ExtractedDataResponseDto,
  ExtractEntitiesResponseDto,
  StructuredTextResponseDto,
  DetectInconsistenciesResponseDto,
  TranslateTextResponseDto,
  SummarizeTextResponseDto,
  ExtractedProblemsResponseDto,
  ExtractedMedicationsResponseDto,
  ExtractedAllergiesResponseDto,
} from './dto/nlp.dto';

@ApiTags('AI — NLP')
@ApiBearerAuth('access-token')
@Controller('ai/nlp')
export class NlpController {
  constructor(private readonly nlpService: NlpService) {}

  @Post('extract-entities')
  @ApiOperation({ summary: 'Extract medical entities from text (medications, diagnoses, allergies, procedures, vitals, symptoms)' })
  @ApiResponse({ status: 201, description: 'Extracted entities with types, offsets, and negation detection', type: ExtractEntitiesResponseDto })
  async extractEntities(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractEntitiesDto,
  ): Promise<ExtractEntitiesResponseDto> {
    return this.nlpService.extractEntities(
      tenantId,
      dto.text,
      dto.entityTypes,
      dto.language,
      dto.includeNegations,
      dto.minConfidence,
    );
  }

  @Post('structure-text')
  @ApiOperation({ summary: 'Convert free text clinical note to structured JSON (SOAP, H&P, etc.)' })
  @ApiResponse({ status: 201, description: 'Structured clinical note', type: StructuredTextResponseDto })
  async structureText(
    @CurrentTenant() tenantId: string,
    @Body() dto: StructureTextDto,
  ): Promise<StructuredTextResponseDto> {
    return this.nlpService.structureText(tenantId, dto.text, dto.targetFormat, dto.language);
  }

  @Post('detect-inconsistencies')
  @ApiOperation({ summary: 'Find clinical inconsistencies — drug-allergy conflicts, duplicates, age/gender mismatches' })
  @ApiResponse({ status: 201, description: 'Detected inconsistencies', type: DetectInconsistenciesResponseDto })
  async detectInconsistencies(
    @CurrentTenant() tenantId: string,
    @Body() dto: DetectInconsistenciesDto,
  ): Promise<DetectInconsistenciesResponseDto> {
    return this.nlpService.detectInconsistencies(
      tenantId,
      dto.text,
      dto.currentMedications,
      dto.knownAllergies,
      dto.activeDiagnoses,
      dto.patientAge,
      dto.patientGender,
    );
  }

  @Post('translate')
  @ApiOperation({ summary: 'Translate clinical text between PT-BR, EN-US, and ES with medical terminology preservation' })
  @ApiResponse({ status: 201, description: 'Translated text', type: TranslateTextResponseDto })
  async translateText(
    @CurrentTenant() tenantId: string,
    @Body() dto: TranslateTextDto,
  ): Promise<TranslateTextResponseDto> {
    return this.nlpService.translateText(
      tenantId,
      dto.text,
      dto.sourceLanguage,
      dto.targetLanguage,
      dto.preserveTerminology,
    );
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize clinical notes with key findings extraction' })
  @ApiResponse({ status: 201, description: 'Summarized text', type: SummarizeTextResponseDto })
  async summarizeText(
    @CurrentTenant() tenantId: string,
    @Body() dto: SummarizeTextDto,
  ): Promise<SummarizeTextResponseDto> {
    return this.nlpService.summarizeText(
      tenantId,
      dto.text,
      dto.length,
      dto.focusAreas,
      dto.language,
    );
  }

  // ─── Legacy Endpoints (backward compat) ────────────────────────────────

  @Post('extract')
  @ApiOperation({ summary: '[Legacy] Extract structured data from free text' })
  @ApiResponse({ status: 201, description: 'Extracted entities', type: ExtractedDataResponseDto })
  async extractData(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedDataResponseDto> {
    return this.nlpService.extractStructuredData(tenantId, dto.text, dto.language);
  }

  @Post('extract-problems')
  @ApiOperation({ summary: '[Legacy] Extract problem list from free text' })
  @ApiResponse({ status: 201, description: 'Extracted problems', type: ExtractedProblemsResponseDto })
  async extractProblems(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedProblemsResponseDto> {
    return this.nlpService.extractProblems(tenantId, dto.text);
  }

  @Post('extract-medications')
  @ApiOperation({ summary: '[Legacy] Extract medications from free text' })
  @ApiResponse({ status: 201, description: 'Extracted medications', type: ExtractedMedicationsResponseDto })
  async extractMedications(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedMedicationsResponseDto> {
    return this.nlpService.extractMedications(tenantId, dto.text);
  }

  @Post('extract-allergies')
  @ApiOperation({ summary: '[Legacy] Extract allergies from free text' })
  @ApiResponse({ status: 201, description: 'Extracted allergies', type: ExtractedAllergiesResponseDto })
  async extractAllergies(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedAllergiesResponseDto> {
    return this.nlpService.extractAllergies(tenantId, dto.text);
  }

  @Post('detect-negations')
  @ApiOperation({ summary: '[Legacy] Detect negated clinical entities' })
  @ApiResponse({ status: 201, description: 'Negation detection results' })
  async detectNegations(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ) {
    return this.nlpService.detectNegations(tenantId, dto.text);
  }

  @Post('extract-temporal')
  @ApiOperation({ summary: '[Legacy] Extract temporal expressions' })
  @ApiResponse({ status: 201, description: 'Temporal expressions' })
  async extractTemporal(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ) {
    return this.nlpService.extractTemporalExpressions(tenantId, dto.text);
  }

  @Post('extract-relationships')
  @ApiOperation({ summary: '[Legacy] Extract entity relationships' })
  @ApiResponse({ status: 201, description: 'Entity relationships' })
  async extractRelationships(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ) {
    return this.nlpService.extractRelationships(tenantId, dto.text);
  }
}
