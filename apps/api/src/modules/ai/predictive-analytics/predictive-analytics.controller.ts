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
  @ApiOperation({ summary: 'Predict sepsis risk (demo data). Use POST for real calculation with vitals/labs.' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Sepsis risk prediction', type: RiskPredictionResponseDto })
  async getSepsisRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getSepsisRisk(tenantId, patientId);
  }

  @Post('sepsis-risk/:patientId')
  @ApiOperation({ summary: 'Calculate sepsis risk with real vitals and labs (qSOFA + SIRS + lactate)' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 201, description: 'Sepsis risk prediction with real data', type: RiskPredictionResponseDto })
  async calculateSepsisRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: {
      vitals?: { heartRate?: number; systolicBP?: number; respiratoryRate?: number; temperature?: number; oxygenSaturation?: number; glasgow?: number };
      labs?: { lactate?: number; wbc?: number; platelets?: number; creatinine?: number; bilirubin?: number; pcr?: number; procalcitonin?: number };
    },
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getSepsisRisk(tenantId, patientId, body.vitals, body.labs);
  }

  @Get('cardiac-arrest-risk/:patientId')
  @ApiOperation({ summary: 'Predict cardiac arrest risk (demo data). Use POST for real calculation.' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Cardiac arrest risk prediction', type: RiskPredictionResponseDto })
  async getCardiacArrestRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getCardiacArrestRisk(tenantId, patientId);
  }

  @Post('cardiac-arrest-risk/:patientId')
  @ApiOperation({ summary: 'Calculate cardiac arrest risk with vitals, labs, ECG, and history' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 201, description: 'Cardiac arrest risk with real data', type: RiskPredictionResponseDto })
  async calculateCardiacArrestRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: {
      vitals?: { heartRate?: number; systolicBP?: number; diastolicBP?: number; oxygenSaturation?: number; respiratoryRate?: number };
      labs?: { troponin?: number; potassium?: number; magnesium?: number; bnp?: number; qtcInterval?: number; ejectionFraction?: number };
      history?: { priorArrhythmia?: boolean; priorCardiacArrest?: boolean; qtProlongingMeds?: number };
    },
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getCardiacArrestRisk(tenantId, patientId, body.vitals, body.labs, body.history);
  }

  @Get('readmission-risk/:patientId')
  @ApiOperation({ summary: 'Predict 30-day readmission risk (demo data). Use POST for real LACE calculation.' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: '30-day readmission risk prediction', type: RiskPredictionResponseDto })
  async getReadmissionRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getReadmissionRisk(tenantId, patientId);
  }

  @Post('readmission-risk/:patientId')
  @ApiOperation({ summary: 'Calculate 30-day readmission risk with LACE Index and clinical/social factors' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 201, description: 'Readmission risk with real data', type: RiskPredictionResponseDto })
  async calculateReadmissionRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: {
      lengthOfStay?: number; admittedViaEmergency?: boolean; charlsonIndex?: number;
      priorAdmissions6Months?: number; age?: number; hba1c?: number;
      medicationAdherence?: number; socialSupport?: 'high' | 'medium' | 'low'; priorAMA?: boolean;
    },
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getReadmissionRisk(tenantId, patientId, body);
  }

  @Get('los-prediction/:patientId')
  @ApiOperation({ summary: 'Predict length of stay (demo data). Use POST for diagnosis-based calculation.' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Length of stay prediction', type: LosPredictionResponseDto })
  async getLengthOfStayPrediction(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<LosPredictionResponseDto> {
    return this.predictiveService.getLengthOfStayPrediction(tenantId, patientId);
  }

  @Post('los-prediction/:patientId')
  @ApiOperation({ summary: 'Calculate length of stay based on diagnosis, age, comorbidities, and clinical factors' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 201, description: 'LOS prediction with real data', type: LosPredictionResponseDto })
  async calculateLengthOfStay(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: {
      primaryDiagnosisCID?: string; age?: number; charlsonIndex?: number;
      admittedViaEmergency?: boolean; requiresO2?: boolean; requiresSurgery?: boolean;
      albumin?: number; functionalStatus?: 'independent' | 'partial' | 'dependent';
    },
  ): Promise<LosPredictionResponseDto> {
    return this.predictiveService.getLengthOfStayPrediction(tenantId, patientId, body);
  }

  @Get('mortality-risk/:patientId')
  @ApiOperation({ summary: 'Predict inpatient mortality risk (demo data). Use POST for real calculation.' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Inpatient mortality risk prediction', type: RiskPredictionResponseDto })
  async getMortalityRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getMortalityRisk(tenantId, patientId);
  }

  @Post('mortality-risk/:patientId')
  @ApiOperation({ summary: 'Calculate mortality risk with APACHE II, SOFA, ventilation, vasopressors, and clinical data' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 201, description: 'Mortality risk with real data', type: RiskPredictionResponseDto })
  async calculateMortalityRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: {
      apacheIIScore?: number; sofaScore?: number; glasgow?: number; age?: number;
      onMechanicalVentilation?: boolean; ventilationDays?: number;
      onVasopressors?: boolean; vasopressorDose?: number;
      albumin?: number; urineOutput24h?: number; icuDays?: number; charlsonIndex?: number;
    },
  ): Promise<RiskPredictionResponseDto> {
    return this.predictiveService.getMortalityRisk(tenantId, patientId, body);
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
