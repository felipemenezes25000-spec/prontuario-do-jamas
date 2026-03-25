import { Controller, Post, Get, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { AdvancedAiService } from './advanced-ai.service';
import {
  DigitalTwinSimulateDto,
  PharmacogenomicDrugDoseDto,
  OncogenomicTherapyMatchDto,
  ConversationalBiQueryDto,
  MultimodalInputDto,
  HealthCoachRecommendationsDto,
  DigitalTwinSimulationResponseDto,
  DigitalTwinStatusResponseDto,
  PharmacogenomicProfileResponseDto,
  GenotypeDoseResponseDto,
  OncogenomicProfileResponseDto,
  OncogenomicTherapyMatchResponseDto,
  ConversationalBiResponseDto,
  MultimodalAnalysisResponseDto,
  HealthCoachResponseDto,
  HealthGoalsResponseDto,
} from './dto/advanced-ai.dto';

@ApiTags('AI — Advanced Features')
@ApiBearerAuth('access-token')
@Controller('ai/advanced')
export class AdvancedAiController {
  constructor(private readonly service: AdvancedAiService) {}

  // ─── Digital Twin ─────────────────────────────────────────────────────────

  @Post('digital-twin/simulate')
  @ApiOperation({ summary: 'Run treatment simulation on patient digital twin' })
  @ApiResponse({ status: 201, type: DigitalTwinSimulationResponseDto })
  async simulateDigitalTwin(
    @CurrentTenant() tenantId: string,
    @Body() dto: DigitalTwinSimulateDto,
  ): Promise<DigitalTwinSimulationResponseDto> {
    return this.service.simulateDigitalTwin(
      tenantId,
      dto.patientId,
      dto.scenario,
      dto.treatmentOptions,
      dto.durationDays,
      dto.includeOrganBreakdown,
    );
  }

  @Get('digital-twin/:patientId')
  @ApiOperation({ summary: 'Get patient digital twin status with organ system scores' })
  @ApiResponse({ status: 200, type: DigitalTwinStatusResponseDto })
  async getDigitalTwinStatus(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<DigitalTwinStatusResponseDto> {
    return this.service.getDigitalTwinStatus(tenantId, patientId);
  }

  // ─── Pharmacogenomics ─────────────────────────────────────────────────────

  @Get('pharmacogenomics/:patientId')
  @ApiOperation({ summary: 'Get pharmacogenomic profile (CYP enzymes, high-risk drugs)' })
  @ApiResponse({ status: 200, type: PharmacogenomicProfileResponseDto })
  async getPharmacogenomicProfile(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<PharmacogenomicProfileResponseDto> {
    return this.service.getPharmacogenomicProfile(tenantId, patientId);
  }

  @Post('pharmacogenomics/drug-dose')
  @ApiOperation({ summary: 'Get genotype-adjusted drug dosing recommendation' })
  @ApiResponse({ status: 201, type: GenotypeDoseResponseDto })
  async getGenotypeDrugDose(
    @CurrentTenant() tenantId: string,
    @Body() dto: PharmacogenomicDrugDoseDto,
  ): Promise<GenotypeDoseResponseDto> {
    return this.service.getGenotypeDrugDose(
      tenantId,
      dto.patientId,
      dto.drugName,
      dto.standardDoseMg,
      dto.route,
      dto.knownGenotypes,
    );
  }

  // ─── Oncogenomics ─────────────────────────────────────────────────────────

  @Get('oncogenomics/:patientId')
  @ApiOperation({ summary: 'Get tumor molecular profile (mutations, TMB, MSI, PD-L1)' })
  @ApiResponse({ status: 200, type: OncogenomicProfileResponseDto })
  async getOncogenomicProfile(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<OncogenomicProfileResponseDto> {
    return this.service.getOncogenomicProfile(tenantId, patientId);
  }

  @Post('oncogenomics/therapy-match')
  @ApiOperation({ summary: 'Match mutations to targeted therapies and clinical trials' })
  @ApiResponse({ status: 201, type: OncogenomicTherapyMatchResponseDto })
  async matchOncogenomicTherapy(
    @CurrentTenant() tenantId: string,
    @Body() dto: OncogenomicTherapyMatchDto,
  ): Promise<OncogenomicTherapyMatchResponseDto> {
    return this.service.matchOncogenomicTherapy(
      tenantId,
      dto.patientId,
      dto.tumorType,
      dto.mutations,
      dto.priorTreatments,
      dto.includeTrials,
    );
  }

  // ─── Conversational BI ────────────────────────────────────────────────────

  @Post('conversational-bi')
  @ApiOperation({ summary: 'Natural language BI query — ask questions in Portuguese, get data + charts' })
  @ApiResponse({ status: 201, type: ConversationalBiResponseDto })
  async conversationalBi(
    @CurrentTenant() tenantId: string,
    @Body() dto: ConversationalBiQueryDto,
  ): Promise<ConversationalBiResponseDto> {
    return this.service.conversationalBi(
      tenantId,
      dto.question,
      dto.startDate,
      dto.endDate,
      dto.department,
      dto.preferredChart,
    );
  }

  // ─── Multimodal Analysis ──────────────────────────────────────────────────

  @Post('multimodal-analysis')
  @ApiOperation({ summary: 'Combined text + image + lab + voice + ECG integrated analysis' })
  @ApiResponse({ status: 201, type: MultimodalAnalysisResponseDto })
  async multimodalAnalysis(
    @CurrentTenant() tenantId: string,
    @Body() dto: MultimodalInputDto,
  ): Promise<MultimodalAnalysisResponseDto> {
    return this.service.multimodalAnalysis(
      tenantId,
      dto.clinicalText,
      dto.patientId,
      dto.imageUrls,
      dto.labSummary,
      dto.voiceTranscript,
      dto.ecgData,
    );
  }

  // ─── Health Coach ─────────────────────────────────────────────────────────

  @Post('health-coach/recommendations')
  @ApiOperation({ summary: 'Get personalized health recommendations (medication, lifestyle, chronic disease)' })
  @ApiResponse({ status: 201, type: HealthCoachResponseDto })
  async getHealthCoachRecommendations(
    @CurrentTenant() tenantId: string,
    @Body() dto: HealthCoachRecommendationsDto,
  ): Promise<HealthCoachResponseDto> {
    return this.service.getHealthCoachRecommendations(
      tenantId,
      dto.patientId,
      dto.categories,
      dto.conditions,
      dto.medications,
    );
  }

  @Get('health-coach/:patientId/goals')
  @ApiOperation({ summary: 'Get patient health goals with progress tracking' })
  @ApiResponse({ status: 200, type: HealthGoalsResponseDto })
  async getHealthGoals(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<HealthGoalsResponseDto> {
    return this.service.getHealthGoals(tenantId, patientId);
  }
}
