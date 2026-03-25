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
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { ClinicalDecisionService } from './clinical-decision.service';
import {
  DifferentialDiagnosisDto,
  ClinicalCalculatorDto,
  ProtocolRecommendationDto,
  DrugInteractionDto,
  DifferentialDiagnosisResponseDto,
  ClinicalCalculatorResponseDto,
  PredictiveAlertsResponseDto,
  DrugInteractionResponseDto,
  ProtocolRecommendationResponseDto,
  RiskTimelineResponseDto,
  CdsMetricsResponseDto,
} from './dto/clinical-decision.dto';

@ApiTags('AI — Clinical Decision Support')
@ApiBearerAuth('access-token')
@Controller('ai/clinical-decision')
export class ClinicalDecisionController {
  constructor(private readonly cdsService: ClinicalDecisionService) {}

  @Post('differential-diagnosis')
  @ApiOperation({ summary: 'Generate differential diagnosis from symptoms and findings' })
  @ApiResponse({ status: 201, description: 'Differential diagnosis generated', type: DifferentialDiagnosisResponseDto })
  async differentialDiagnosis(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: DifferentialDiagnosisDto,
  ): Promise<DifferentialDiagnosisResponseDto> {
    return this.cdsService.generateDifferentialDiagnosis(
      tenantId,
      user.sub,
      dto.patientId,
      dto.symptoms,
      dto.physicalFindings,
      dto.labResults,
      dto.age,
      dto.sex,
      dto.comorbidities,
    );
  }

  @Post('clinical-calculator')
  @ApiOperation({ summary: 'Calculate clinical scores (CHADS2-VASc, Wells, CURB-65, MELD, Child-Pugh, APACHE II, Glasgow, NIHSS)' })
  @ApiResponse({ status: 201, description: 'Clinical score calculated', type: ClinicalCalculatorResponseDto })
  async clinicalCalculator(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: ClinicalCalculatorDto,
  ): Promise<ClinicalCalculatorResponseDto> {
    return this.cdsService.calculateClinicalScore(
      tenantId,
      user.sub,
      dto.patientId,
      dto.parameters,
      dto.calculatorType,
      dto.diagnosisCid,
    );
  }

  @Get('predictive-alerts/:patientId')
  @ApiOperation({ summary: 'Get AI-generated risk predictions for a patient (sepsis, fall, readmission, mortality)' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Predictive alerts retrieved', type: PredictiveAlertsResponseDto })
  async predictiveAlerts(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<PredictiveAlertsResponseDto> {
    return this.cdsService.getPredictiveAlerts(tenantId, user.sub, patientId);
  }

  @Post('protocol-recommendation')
  @ApiOperation({ summary: 'Match diagnosis to evidence-based clinical pathway/protocol' })
  @ApiResponse({ status: 201, description: 'Protocol recommendation generated', type: ProtocolRecommendationResponseDto })
  async protocolRecommendation(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: ProtocolRecommendationDto,
  ): Promise<ProtocolRecommendationResponseDto> {
    return this.cdsService.getProtocolRecommendation(
      tenantId,
      user.sub,
      dto.patientId,
      dto.diagnosisCid,
      dto.diagnosisDescription,
      dto.severity,
      dto.comorbidities,
    );
  }

  @Post('drug-interactions')
  @ApiOperation({ summary: 'Check medication interactions with severity classification' })
  @ApiResponse({ status: 201, description: 'Drug interaction results', type: DrugInteractionResponseDto })
  async drugInteractions(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: DrugInteractionDto,
  ): Promise<DrugInteractionResponseDto> {
    return this.cdsService.checkDrugInteractions(
      tenantId,
      user.sub,
      dto.patientId,
      dto.medications,
      dto.includeCurrentMedications,
    );
  }

  @Get('risk-timeline/:patientId')
  @ApiOperation({ summary: 'Get risk score evolution over time for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Risk timeline retrieved', type: RiskTimelineResponseDto })
  async riskTimeline(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskTimelineResponseDto> {
    return this.cdsService.getRiskTimeline(tenantId, user.sub, patientId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'CDS usage and accuracy metrics' })
  @ApiResponse({ status: 200, description: 'CDS metrics retrieved', type: CdsMetricsResponseDto })
  async metrics(
    @CurrentTenant() tenantId: string,
  ): Promise<CdsMetricsResponseDto> {
    return this.cdsService.getMetrics(tenantId);
  }
}
