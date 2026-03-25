import {
  Controller,
  Get,
  Post,
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
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import {
  PredictionType,
  DemandForecastQueryDto,
  BedOptimizationDto,
  DashboardQueryDto,
  FeatureImportanceQueryDto,
  RiskPredictionResponseDto,
  LosPredictionResponseDto,
  DemandForecastResponseDto,
  BedOptimizationResponseDto,
  DashboardResponseDto,
  FeatureImportanceResponseDto,
} from './dto/predictive-analytics.dto';

@ApiTags('AI — Predictive Analytics')
@ApiBearerAuth('access-token')
@Controller('ai/predictive')
export class PredictiveAnalyticsController {
  constructor(private readonly predictiveService: PredictiveAnalyticsService) {}

  @Get('sepsis-risk/:patientId')
  @ApiOperation({ summary: 'Predict sepsis risk 4-6 hours ahead using vitals, labs, and clinical data' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Sepsis risk prediction', type: RiskPredictionResponseDto })
  async getSepsisRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getSepsisRisk(tenantId, patientId);
  }

  @Get('cardiac-arrest-risk/:patientId')
  @ApiOperation({ summary: 'Predict cardiac arrest risk using ECG, labs, and hemodynamic data' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Cardiac arrest risk prediction', type: RiskPredictionResponseDto })
  async getCardiacArrestRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getCardiacArrestRisk(tenantId, patientId);
  }

  @Get('readmission-risk/:patientId')
  @ApiOperation({ summary: 'Predict 30-day readmission risk based on clinical and social factors' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: '30-day readmission risk prediction', type: RiskPredictionResponseDto })
  async getReadmissionRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getReadmissionRisk(tenantId, patientId);
  }

  @Get('los-prediction/:patientId')
  @ApiOperation({ summary: 'Predict length of stay in days with confidence interval and discharge date' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Length of stay prediction', type: LosPredictionResponseDto })
  async getLengthOfStayPrediction(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<LosPredictionResponseDto> {
    return this.predictiveService.getLengthOfStayPrediction(tenantId, patientId);
  }

  @Get('mortality-risk/:patientId')
  @ApiOperation({ summary: 'Predict inpatient mortality risk using severity scores and clinical data' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Inpatient mortality risk prediction', type: RiskPredictionResponseDto })
  async getMortalityRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getMortalityRisk(tenantId, patientId);
  }

  @Get('demand-forecast')
  @ApiOperation({ summary: 'Forecast hospital demand for next 7-30 days (admissions, discharges, occupancy)' })
  @ApiResponse({ status: 200, description: 'Demand forecast', type: DemandForecastResponseDto })
  async getDemandForecast(
    @CurrentTenant() tenantId: string,
    @Query() query: DemandForecastQueryDto,
  ): Promise<DemandForecastResponseDto> {
    return this.predictiveService.getDemandForecast(
      tenantId,
      query.unit,
      query.horizonDays,
    );
  }

  @Post('bed-optimization')
  @ApiOperation({ summary: 'AI-driven bed assignment and transfer suggestions for optimal occupancy' })
  @ApiResponse({ status: 201, description: 'Bed optimization suggestions', type: BedOptimizationResponseDto })
  async getBedOptimization(
    @CurrentTenant() tenantId: string,
    @Body() dto: BedOptimizationDto,
  ): Promise<BedOptimizationResponseDto> {
    return this.predictiveService.getBedOptimization(
      tenantId,
      dto.unit,
      dto.includeDischarges,
      dto.maxTransfers,
      dto.priorityPatientIds,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Overview dashboard with all risk predictions for monitored patients' })
  @ApiResponse({ status: 200, description: 'Predictive analytics dashboard', type: DashboardResponseDto })
  async getDashboard(
    @CurrentTenant() tenantId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardResponseDto> {
    return this.predictiveService.getDashboard(
      tenantId,
      query.unit,
      query.minRiskScore,
    );
  }

  @Get('feature-importance/:predictionType')
  @ApiOperation({ summary: 'SHAP feature importance values for model explainability and transparency' })
  @ApiParam({ name: 'predictionType', enum: PredictionType, description: 'Prediction model type' })
  @ApiResponse({ status: 200, description: 'Feature importance (SHAP values)', type: FeatureImportanceResponseDto })
  async getFeatureImportance(
    @CurrentTenant() tenantId: string,
    @Param('predictionType') predictionType: PredictionType,
    @Query() query: FeatureImportanceQueryDto,
  ): Promise<FeatureImportanceResponseDto> {
    return this.predictiveService.getFeatureImportance(
      tenantId,
      predictionType,
      query.patientId,
      query.topN,
    );
  }
}
