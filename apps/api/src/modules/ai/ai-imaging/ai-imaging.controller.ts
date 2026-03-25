import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { AiImagingService } from './ai-imaging.service';
import {
  AnalyzeImageDto,
  WorklistQueryDto,
  CadMammographyDto,
  ImagingAnalysisResponseDto,
  PrioritizedWorklistResponseDto,
  ImagingMetricsResponseDto,
  ImagingDashboardResponseDto,
} from './dto/ai-imaging.dto';

@ApiTags('AI — Imaging')
@ApiBearerAuth('access-token')
@Controller('ai/imaging')
export class AiImagingController {
  constructor(private readonly imagingService: AiImagingService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze medical image — chest X-ray, CT, mammography, etc.' })
  @ApiResponse({ status: 201, description: 'Analysis submitted', type: ImagingAnalysisResponseDto })
  async analyzeImage(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.analyzeImage(
      tenantId,
      dto.examResultId,
      dto.modality,
      dto.clinicalIndication,
      dto.bodyPart,
      dto.patientAge,
      dto.patientGender,
    );
  }

  @Get('worklist')
  @ApiOperation({ summary: 'AI-prioritized radiology worklist — ranked by urgency and clinical context' })
  @ApiResponse({ status: 200, description: 'Prioritized worklist', type: PrioritizedWorklistResponseDto })
  async getWorklist(
    @CurrentTenant() tenantId: string,
    @Query() query: WorklistQueryDto,
  ): Promise<PrioritizedWorklistResponseDto> {
    return this.imagingService.getWorklist(
      tenantId,
      query.modality,
      query.priority,
      query.limit,
    );
  }

  @Get('findings/:id')
  @ApiOperation({ summary: 'Get AI findings for specific imaging analysis' })
  @ApiParam({ name: 'id', description: 'Analysis UUID' })
  @ApiResponse({ status: 200, description: 'Analysis findings', type: ImagingAnalysisResponseDto })
  async getFindings(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.getFindings(tenantId, id);
  }

  @Post('cad/mammography')
  @ApiOperation({ summary: 'CAD analysis for mammography — microcalcifications, masses, BI-RADS classification' })
  @ApiResponse({ status: 201, description: 'CAD mammography results', type: ImagingAnalysisResponseDto })
  async cadMammography(
    @CurrentTenant() tenantId: string,
    @Body() dto: CadMammographyDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.cadMammography(
      tenantId,
      dto.examResultId,
      dto.clinicalIndication,
      dto.patientAge,
      dto.familyHistory,
      dto.previousBirads,
    );
  }

  @Get('metrics')
  @ApiOperation({ summary: 'AI imaging accuracy metrics — sensitivity, specificity, turnaround time' })
  @ApiResponse({ status: 200, description: 'Imaging metrics', type: ImagingMetricsResponseDto })
  async getMetrics(
    @CurrentTenant() tenantId: string,
  ): Promise<ImagingMetricsResponseDto> {
    return this.imagingService.getMetrics(tenantId);
  }

  // ─── Legacy Endpoints ──────────────────────────────────────────────────

  @Post('chest-xray')
  @ApiOperation({ summary: 'AI chest X-ray analysis — pneumothorax, fracture, pneumonia, cardiomegaly' })
  @ApiResponse({ status: 201, type: ImagingAnalysisResponseDto })
  async analyzeChestXray(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.analyzeChestXray(tenantId, dto.examResultId, dto.clinicalIndication);
  }

  @Post('ct-stroke')
  @ApiOperation({ summary: 'AI CT stroke detection — ischemic, hemorrhagic, ASPECTS score' })
  @ApiResponse({ status: 201, type: ImagingAnalysisResponseDto })
  async analyzeCtStroke(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.analyzeCtStroke(tenantId, dto.examResultId, dto.clinicalIndication);
  }

  @Post('mammography')
  @ApiOperation({ summary: '[Legacy] AI mammography — use cad/mammography instead' })
  @ApiResponse({ status: 201, type: ImagingAnalysisResponseDto })
  async analyzeMammography(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.analyzeMammography(tenantId, dto.examResultId, dto.clinicalIndication);
  }

  @Post('prioritize')
  @ApiOperation({ summary: '[Legacy] AI worklist prioritization — use GET worklist instead' })
  @ApiResponse({ status: 201, description: 'Prioritized worklist', type: PrioritizedWorklistResponseDto })
  async prioritizeWorklist(
    @CurrentTenant() tenantId: string,
    @Body() dto: { modality?: string; limit?: number },
  ): Promise<PrioritizedWorklistResponseDto> {
    return this.imagingService.prioritizeWorklist(tenantId, dto.modality, dto.limit);
  }

  @Get('cardiothoracic-index/:examResultId')
  @ApiOperation({ summary: 'Measure cardiothoracic index from chest X-ray' })
  @ApiParam({ name: 'examResultId', description: 'Exam result UUID' })
  async measureCti(
    @CurrentTenant() tenantId: string,
    @Param('examResultId', ParseUUIDPipe) examResultId: string,
  ) {
    return this.imagingService.measureCardiothoracicIndex(tenantId, examResultId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'AI imaging dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data', type: ImagingDashboardResponseDto })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ): Promise<ImagingDashboardResponseDto> {
    return this.imagingService.getDashboard(tenantId);
  }
}
