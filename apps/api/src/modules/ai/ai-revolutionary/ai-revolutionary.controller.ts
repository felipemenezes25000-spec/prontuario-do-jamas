import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { AiRevolutionaryService } from './ai-revolutionary.service';
import {
  DiagnosisDifferentialDto,
  ClinicalPathwayDto,
  EcgInterpretationDto,
  DigitalPathologyDto,
  MortalityPredictionDto,
  ConversationalBiDto,
  GenomicsTreatmentDto,
  DigitalTwinDto,
  MultimodalAnalysisDto,
  AutonomousCodingDto,
  PostVisitFollowupDto,
  InboxManagementDto,
  PriorAuthAgentDto,
  IntelligentReferralDto,
  DiagnosisDifferentialResponseDto,
  ClinicalPathwayResponseDto,
  EcgInterpretationResponseDto,
  DigitalPathologyResponseDto,
  MortalityPredictionResponseDto,
  ConversationalBiResponseDto,
  GenomicsTreatmentResponseDto,
  DigitalTwinResponseDto,
  MultimodalAnalysisResponseDto,
  AutonomousCodingResponseDto,
  PostVisitFollowupResponseDto,
  InboxManagementResponseDto,
  PriorAuthAgentResponseDto,
  IntelligentReferralResponseDto,
  RevolutionaryMetricsResponseDto,
} from './dto/ai-revolutionary.dto';

@ApiTags('AI — Revolutionary Features')
@ApiBearerAuth('access-token')
@Controller('ai/revolutionary')
export class AiRevolutionaryController {
  constructor(private readonly service: AiRevolutionaryService) {}

  @Post('differential-diagnosis')
  @ApiOperation({ summary: 'Generate ranked differential diagnoses with probabilities' })
  @ApiResponse({ status: 201, type: DiagnosisDifferentialResponseDto })
  async differentialDiagnosis(
    @CurrentTenant() tenantId: string,
    @Body() dto: DiagnosisDifferentialDto,
  ): Promise<DiagnosisDifferentialResponseDto> {
    return this.service.diagnosisDifferential(tenantId, dto.clinicalText, dto.age, dto.gender, dto.comorbidities);
  }

  @Post('clinical-pathway')
  @ApiOperation({ summary: 'Recommend evidence-based treatment pathway for a diagnosis' })
  @ApiResponse({ status: 201, type: ClinicalPathwayResponseDto })
  async clinicalPathway(
    @CurrentTenant() tenantId: string,
    @Body() dto: ClinicalPathwayDto,
  ): Promise<ClinicalPathwayResponseDto> {
    return this.service.clinicalPathway(tenantId, dto.diagnosisCode, dto.severity);
  }

  @Post('mortality-prediction')
  @ApiOperation({ summary: 'Predict inpatient mortality risk with contributing factors' })
  @ApiResponse({ status: 201, type: MortalityPredictionResponseDto })
  async mortalityPrediction(
    @CurrentTenant() tenantId: string,
    @Body() dto: MortalityPredictionDto,
  ): Promise<MortalityPredictionResponseDto> {
    return this.service.predictMortality(tenantId, dto.patientId, dto.admissionId);
  }

  @Post('digital-twin')
  @ApiOperation({ summary: 'Run digital twin simulation of treatment outcomes' })
  @ApiResponse({ status: 201, type: DigitalTwinResponseDto })
  async digitalTwin(
    @CurrentTenant() tenantId: string,
    @Body() dto: DigitalTwinDto,
  ): Promise<DigitalTwinResponseDto> {
    return this.service.digitalTwin(tenantId, dto.patientId, dto.scenario, dto.treatmentOptions);
  }

  @Post('conversational-bi')
  @ApiOperation({ summary: 'Natural language BI query — ask questions in Portuguese, get data + charts' })
  @ApiResponse({ status: 201, type: ConversationalBiResponseDto })
  async conversationalBi(
    @CurrentTenant() tenantId: string,
    @Body() dto: ConversationalBiDto,
  ): Promise<ConversationalBiResponseDto> {
    return this.service.conversationalBi(tenantId, dto.question, dto.startDate, dto.endDate);
  }

  @Post('multimodal-analysis')
  @ApiOperation({ summary: 'Combined text + image + lab + voice analysis for integrated clinical insight' })
  @ApiResponse({ status: 201, type: MultimodalAnalysisResponseDto })
  async multimodalAnalysis(
    @CurrentTenant() tenantId: string,
    @Body() dto: MultimodalAnalysisDto,
  ): Promise<MultimodalAnalysisResponseDto> {
    return this.service.multimodalAnalysis(tenantId, dto.patientId, dto.clinicalText, dto.imageUrls, dto.labSummary, dto.voiceTranscript);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Revolutionary AI metrics — usage, accuracy, satisfaction, time saved' })
  @ApiResponse({ status: 200, type: RevolutionaryMetricsResponseDto })
  async getMetrics(
    @CurrentTenant() tenantId: string,
  ): Promise<RevolutionaryMetricsResponseDto> {
    return this.service.getMetrics(tenantId);
  }

  // ─── Additional Endpoints (kept from original) ─────────────────────────

  @Post('diagnosis-differential')
  @ApiOperation({ summary: '[Alias] Generate ranked differential diagnoses' })
  @ApiResponse({ status: 201, type: DiagnosisDifferentialResponseDto })
  async diagnosisDifferential(
    @CurrentTenant() tenantId: string,
    @Body() dto: DiagnosisDifferentialDto,
  ): Promise<DiagnosisDifferentialResponseDto> {
    return this.service.diagnosisDifferential(tenantId, dto.clinicalText, dto.age, dto.gender, dto.comorbidities);
  }

  @Post('ecg-interpretation')
  @ApiOperation({ summary: 'AI-powered ECG interpretation with findings and impression' })
  @ApiResponse({ status: 201, type: EcgInterpretationResponseDto })
  async interpretEcg(
    @CurrentTenant() tenantId: string,
    @Body() dto: EcgInterpretationDto,
  ): Promise<EcgInterpretationResponseDto> {
    return this.service.interpretEcg(tenantId, dto.patientId, dto.ecgData, dto.clinicalIndication);
  }

  @Post('digital-pathology')
  @ApiOperation({ summary: 'AI digital pathology slide analysis' })
  @ApiResponse({ status: 201, type: DigitalPathologyResponseDto })
  async analyzePathology(
    @CurrentTenant() tenantId: string,
    @Body() dto: DigitalPathologyDto,
  ): Promise<DigitalPathologyResponseDto> {
    return this.service.analyzePathology(tenantId, dto.patientId, dto.slideUrl, dto.tissueType, dto.stainingMethod);
  }

  @Post('genomics-treatment')
  @ApiOperation({ summary: 'Genomics-guided treatment recommendations' })
  @ApiResponse({ status: 201, type: GenomicsTreatmentResponseDto })
  async genomicsTreatment(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenomicsTreatmentDto,
  ): Promise<GenomicsTreatmentResponseDto> {
    return this.service.genomicsTreatment(tenantId, dto.patientId, dto.variants, dto.diagnosis);
  }

  @Post('autonomous-coding')
  @ApiOperation({ summary: 'Autonomous coding and billing generation' })
  @ApiResponse({ status: 201, type: AutonomousCodingResponseDto })
  async autonomousCoding(
    @CurrentTenant() tenantId: string,
    @Body() dto: AutonomousCodingDto,
  ): Promise<AutonomousCodingResponseDto> {
    return this.service.autonomousCoding(tenantId, dto.encounterId, dto.autoSubmit);
  }

  @Post('post-visit-followup')
  @ApiOperation({ summary: 'AI agent schedules post-visit patient follow-up' })
  @ApiResponse({ status: 201, type: PostVisitFollowupResponseDto })
  async postVisitFollowup(
    @CurrentTenant() tenantId: string,
    @Body() dto: PostVisitFollowupDto,
  ): Promise<PostVisitFollowupResponseDto> {
    return this.service.postVisitFollowup(tenantId, dto.patientId, dto.encounterId, dto.questions);
  }

  @Post('inbox-management')
  @ApiOperation({ summary: 'AI agent triages and prioritizes inbox messages' })
  @ApiResponse({ status: 201, type: InboxManagementResponseDto })
  async manageInbox(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: InboxManagementDto,
  ): Promise<InboxManagementResponseDto> {
    return this.service.manageInbox(tenantId, dto.userId ?? user.sub, dto.limit);
  }

  @Post('prior-authorization')
  @ApiOperation({ summary: 'AI agent fills and submits prior authorization' })
  @ApiResponse({ status: 201, type: PriorAuthAgentResponseDto })
  async priorAuthorization(
    @CurrentTenant() tenantId: string,
    @Body() dto: PriorAuthAgentDto,
  ): Promise<PriorAuthAgentResponseDto> {
    return this.service.priorAuthorization(tenantId, dto.encounterId, dto.procedureCodes, dto.insurancePlanId);
  }

  @Post('intelligent-referral')
  @ApiOperation({ summary: 'AI agent identifies referral need and generates letter' })
  @ApiResponse({ status: 201, type: IntelligentReferralResponseDto })
  async intelligentReferral(
    @CurrentTenant() tenantId: string,
    @Body() dto: IntelligentReferralDto,
  ): Promise<IntelligentReferralResponseDto> {
    return this.service.intelligentReferral(tenantId, dto.patientId, dto.specialty, dto.clinicalReason);
  }
}
