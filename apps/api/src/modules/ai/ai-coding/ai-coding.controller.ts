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
  SuggestCbhpmDto,
  ImproveSpecificityDto,
  IcdSuggestionsResponseDto,
  CbhpmSuggestionsResponseDto,
  ImproveSpecificityResponseDto,
  EncounterCodingResponseDto,
} from './dto/ai-coding.dto';

@ApiTags('AI — Medical Coding')
@ApiBearerAuth('access-token')
@Controller('ai/coding')
export class AiCodingController {
  constructor(private readonly codingService: AiCodingService) {}

  @Post('suggest-icd')
  @ApiOperation({ summary: 'Suggest ICD-10 codes from clinical notes' })
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
      dto.maxSuggestions,
    );
  }

  @Post('suggest-cbhpm')
  @ApiOperation({ summary: 'Suggest CBHPM procedure codes' })
  @ApiResponse({ status: 201, description: 'CBHPM suggestions', type: CbhpmSuggestionsResponseDto })
  async suggestCbhpm(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuggestCbhpmDto,
  ): Promise<CbhpmSuggestionsResponseDto> {
    return this.codingService.suggestCbhpm(tenantId, dto.procedureText, dto.procedures);
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
  @ApiOperation({ summary: 'Get coding suggestions for an encounter' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 200, description: 'Encounter coding', type: EncounterCodingResponseDto })
  async getEncounterCoding(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ): Promise<EncounterCodingResponseDto> {
    return this.codingService.getEncounterCoding(tenantId, encounterId);
  }
}
