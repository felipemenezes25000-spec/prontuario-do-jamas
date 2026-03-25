import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { AiCodingService } from './ai-coding.service';
import {
  SuggestIcdDto,
  SuggestProceduresDto,
  ValidateCodingDto,
  AcceptSuggestionDto,
  ImproveSpecificityDto,
  IcdSuggestionsResponseDto,
  ProcedureSuggestionsResponseDto,
  CodingValidationResponseDto,
  CodingMetricsResponseDto,
  AcceptSuggestionResponseDto,
  ImproveSpecificityResponseDto,
  EncounterCodingResponseDto,
  CbhpmSuggestionsResponseDto,
} from './dto/ai-coding.dto';

@ApiTags('AI — Medical Coding')
@ApiBearerAuth('access-token')
@Controller('ai/coding')
export class AiCodingController {
  constructor(private readonly codingService: AiCodingService) {}

  @Post('suggest-icd')
  @ApiOperation({ summary: 'Suggest ICD-10 codes from clinical text with confidence scores' })
  @ApiResponse({ status: 201, description: 'ICD-10 suggestions', type: IcdSuggestionsResponseDto })
  async suggestIcd(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuggestIcdDto,
  ): Promise<IcdSuggestionsResponseDto> {
    return this.codingService.suggestIcd(
      tenantId,
      dto.clinicalText,
      dto.subjective,
      dto.assessment,
      dto.patientAge,
      dto.patientGender,
      dto.maxSuggestions,
    );
  }

  @Post('suggest-procedures')
  @ApiOperation({ summary: 'Suggest CBHPM/TUSS procedure codes from clinical text' })
  @ApiResponse({ status: 201, description: 'Procedure code suggestions', type: ProcedureSuggestionsResponseDto })
  async suggestProcedures(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuggestProceduresDto,
  ): Promise<ProcedureSuggestionsResponseDto> {
    return this.codingService.suggestProcedures(
      tenantId,
      dto.procedureText,
      dto.procedures,
      dto.codingSystem,
      dto.encounterId,
    );
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate coding consistency — detect conflicts, missing docs, specificity issues' })
  @ApiResponse({ status: 201, description: 'Validation results', type: CodingValidationResponseDto })
  async validateCoding(
    @CurrentTenant() tenantId: string,
    @Body() dto: ValidateCodingDto,
  ): Promise<CodingValidationResponseDto> {
    return this.codingService.validateCoding(
      tenantId,
      dto.diagnosisCodes,
      dto.procedureCodes,
      dto.clinicalText,
      dto.patientAge,
      dto.patientGender,
    );
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Coding accuracy metrics — acceptance rate, top codes, trends' })
  @ApiResponse({ status: 200, description: 'Coding metrics', type: CodingMetricsResponseDto })
  async getMetrics(
    @CurrentTenant() tenantId: string,
  ): Promise<CodingMetricsResponseDto> {
    return this.codingService.getMetrics(tenantId);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept or reject a coding suggestion (for learning/feedback loop)' })
  @ApiResponse({ status: 201, description: 'Suggestion feedback recorded', type: AcceptSuggestionResponseDto })
  async acceptSuggestion(
    @CurrentTenant() tenantId: string,
    @Body() dto: AcceptSuggestionDto,
  ): Promise<AcceptSuggestionResponseDto> {
    return this.codingService.acceptSuggestion(
      tenantId,
      dto.suggestionId,
      dto.accepted,
      dto.modifiedCode,
      dto.rejectionReason,
      dto.encounterId,
    );
  }

  @Post('improve-specificity')
  @ApiOperation({ summary: 'Improve code specificity with clinical context' })
  @ApiResponse({ status: 201, description: 'Improved codes', type: ImproveSpecificityResponseDto })
  async improveSpecificity(
    @CurrentTenant() tenantId: string,
    @Body() dto: ImproveSpecificityDto,
  ): Promise<ImproveSpecificityResponseDto> {
    return this.codingService.improveSpecificity(tenantId, dto.currentCode, dto.clinicalContext);
  }

  @Get('encounter/:encounterId')
  @ApiOperation({ summary: 'Get all coding suggestions for an encounter' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 200, description: 'Encounter coding', type: EncounterCodingResponseDto })
  async getEncounterCoding(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ): Promise<EncounterCodingResponseDto> {
    return this.codingService.getEncounterCoding(tenantId, encounterId);
  }

  // ─── Legacy Endpoint (backward compat) ─────────────────────────────────

  @Post('suggest-cbhpm')
  @ApiOperation({ summary: '[Deprecated] Suggest CBHPM procedure codes — use suggest-procedures instead' })
  @ApiResponse({ status: 201, description: 'CBHPM suggestions', type: CbhpmSuggestionsResponseDto })
  async suggestCbhpm(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuggestProceduresDto,
  ): Promise<CbhpmSuggestionsResponseDto> {
    return this.codingService.suggestCbhpm(tenantId, dto.procedureText, dto.procedures);
  }
}
