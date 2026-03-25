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
  ExtractedDataResponseDto,
  ExtractedProblemsResponseDto,
  ExtractedMedicationsResponseDto,
  ExtractedAllergiesResponseDto,
} from './dto/nlp.dto';

@ApiTags('AI — NLP')
@ApiBearerAuth('access-token')
@Controller('ai/nlp')
export class NlpController {
  constructor(private readonly nlpService: NlpService) {}

  @Post('extract')
  @ApiOperation({ summary: 'Extract structured data from free text' })
  @ApiResponse({ status: 201, description: 'Extracted entities', type: ExtractedDataResponseDto })
  async extractData(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedDataResponseDto> {
    return this.nlpService.extractStructuredData(tenantId, dto.text, dto.language);
  }

  @Post('extract-problems')
  @ApiOperation({ summary: 'Extract problem list from free text' })
  @ApiResponse({ status: 201, description: 'Extracted problems', type: ExtractedProblemsResponseDto })
  async extractProblems(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedProblemsResponseDto> {
    return this.nlpService.extractProblems(tenantId, dto.text);
  }

  @Post('extract-medications')
  @ApiOperation({ summary: 'Extract medications from free text' })
  @ApiResponse({ status: 201, description: 'Extracted medications', type: ExtractedMedicationsResponseDto })
  async extractMedications(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedMedicationsResponseDto> {
    return this.nlpService.extractMedications(tenantId, dto.text);
  }

  @Post('extract-allergies')
  @ApiOperation({ summary: 'Extract allergies from free text' })
  @ApiResponse({ status: 201, description: 'Extracted allergies', type: ExtractedAllergiesResponseDto })
  async extractAllergies(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ): Promise<ExtractedAllergiesResponseDto> {
    return this.nlpService.extractAllergies(tenantId, dto.text);
  }

  @Post('detect-negations')
  @ApiOperation({ summary: 'Detect negated clinical entities (e.g., "denies fever")' })
  @ApiResponse({ status: 201, description: 'Negation detection results' })
  async detectNegations(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ) {
    return this.nlpService.detectNegations(tenantId, dto.text);
  }

  @Post('extract-temporal')
  @ApiOperation({ summary: 'Extract temporal expressions ("há 2 dias", "desde janeiro")' })
  @ApiResponse({ status: 201, description: 'Temporal expressions' })
  async extractTemporal(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ) {
    return this.nlpService.extractTemporalExpressions(tenantId, dto.text);
  }

  @Post('extract-relationships')
  @ApiOperation({ summary: 'Extract entity relationships (medication→dosage, symptom→duration)' })
  @ApiResponse({ status: 201, description: 'Entity relationships' })
  async extractRelationships(
    @CurrentTenant() tenantId: string,
    @Body() dto: ExtractFromTextDto,
  ) {
    return this.nlpService.extractRelationships(tenantId, dto.text);
  }
}
