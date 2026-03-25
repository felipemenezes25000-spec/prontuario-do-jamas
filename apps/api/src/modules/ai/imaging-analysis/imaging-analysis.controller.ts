import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { ImagingAnalysisService } from './imaging-analysis.service';
import {
  ChestXrayAnalysisDto,
  CtBrainAnalysisDto,
  MammographyCadDto,
  FractureDetectionDto,
  CompareImagingDto,
  AutoMeasureDto,
  ChestXrayResponseDto,
  CtBrainResponseDto,
  MammographyResponseDto,
  FractureDetectionResponseDto,
  WorklistResponseDto,
  ExamFindingResponseDto,
  CompareImagingResponseDto,
  AccuracyMetricsResponseDto,
  AutoMeasureResponseDto,
} from './dto/imaging-analysis.dto';

@ApiTags('AI — Imaging Analysis')
@ApiBearerAuth('access-token')
@Controller('ai/imaging')
export class ImagingAnalysisController {
  constructor(private readonly imagingAnalysisService: ImagingAnalysisService) {}

  @Post('chest-xray')
  @ApiOperation({ summary: 'Analise de RX de torax — pneumotorax, cardiomegalia, derrame, nodulos, consolidacao' })
  @ApiResponse({ status: 201, description: 'Analise de RX de torax concluida', type: ChestXrayResponseDto })
  async analyzeChestXray(
    @CurrentTenant() tenantId: string,
    @Body() dto: ChestXrayAnalysisDto,
  ): Promise<ChestXrayResponseDto> {
    return this.imagingAnalysisService.analyzeChestXray(
      tenantId,
      dto.examResultId,
      dto.clinicalIndication,
      dto.patientAge,
      dto.patientSex,
      dto.projection,
    );
  }

  @Post('ct-brain')
  @ApiOperation({ summary: 'Analise de TC de cranio — AVC, hemorragia, desvio de linha media, ASPECTS' })
  @ApiResponse({ status: 201, description: 'Analise de TC de cranio concluida', type: CtBrainResponseDto })
  async analyzeCtBrain(
    @CurrentTenant() tenantId: string,
    @Body() dto: CtBrainAnalysisDto,
  ): Promise<CtBrainResponseDto> {
    return this.imagingAnalysisService.analyzeCtBrain(
      tenantId,
      dto.examResultId,
      dto.clinicalIndication,
      dto.symptomOnset,
      dto.nihssScore,
      dto.contrastUsed,
    );
  }

  @Post('mammography-cad')
  @ApiOperation({ summary: 'CAD mamografico — BI-RADS, microcalcificacoes, massas' })
  @ApiResponse({ status: 201, description: 'Analise mamografica CAD concluida', type: MammographyResponseDto })
  async analyzeMammographyCad(
    @CurrentTenant() tenantId: string,
    @Body() dto: MammographyCadDto,
  ): Promise<MammographyResponseDto> {
    return this.imagingAnalysisService.analyzeMammographyCad(
      tenantId,
      dto.examResultId,
      dto.clinicalIndication,
      dto.patientAge,
      dto.familyHistory,
      dto.previousBirads,
      dto.breastDensity,
    );
  }

  @Post('fracture-detection')
  @ApiOperation({ summary: 'Deteccao de fraturas em RX — localizacao, tipo, deslocamento' })
  @ApiResponse({ status: 201, description: 'Deteccao de fraturas concluida', type: FractureDetectionResponseDto })
  async detectFractures(
    @CurrentTenant() tenantId: string,
    @Body() dto: FractureDetectionDto,
  ): Promise<FractureDetectionResponseDto> {
    return this.imagingAnalysisService.detectFractures(
      tenantId,
      dto.examResultId,
      dto.clinicalIndication,
      dto.bodyRegion,
      dto.traumaMechanism,
      dto.patientAge,
    );
  }

  @Get('worklist')
  @ApiOperation({ summary: 'Worklist radiologica priorizada por IA — ordenada por urgencia' })
  @ApiResponse({ status: 200, description: 'Worklist priorizada', type: WorklistResponseDto })
  async getWorklist(
    @CurrentTenant() tenantId: string,
  ): Promise<WorklistResponseDto> {
    return this.imagingAnalysisService.getWorklist(tenantId);
  }

  @Get('findings/:examId')
  @ApiOperation({ summary: 'Obter achados da IA para um exame especifico' })
  @ApiParam({ name: 'examId', description: 'UUID do resultado do exame' })
  @ApiResponse({ status: 200, description: 'Achados do exame', type: ExamFindingResponseDto })
  async getFindings(
    @CurrentTenant() tenantId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
  ): Promise<ExamFindingResponseDto> {
    return this.imagingAnalysisService.getFindings(tenantId, examId);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Comparar imagens atuais vs anteriores — evolucao temporal' })
  @ApiResponse({ status: 201, description: 'Comparacao de imagens concluida', type: CompareImagingResponseDto })
  async compareImaging(
    @CurrentTenant() tenantId: string,
    @Body() dto: CompareImagingDto,
  ): Promise<CompareImagingResponseDto> {
    return this.imagingAnalysisService.compareImaging(
      tenantId,
      dto.currentExamId,
      dto.priorExamId,
      dto.comparisonFocus,
    );
  }

  @Get('accuracy-metrics')
  @ApiOperation({ summary: 'Metricas de acuracia — sensibilidade, especificidade, VPP, VPN por modalidade' })
  @ApiResponse({ status: 200, description: 'Metricas de acuracia da IA', type: AccuracyMetricsResponseDto })
  async getAccuracyMetrics(
    @CurrentTenant() tenantId: string,
  ): Promise<AccuracyMetricsResponseDto> {
    return this.imagingAnalysisService.getAccuracyMetrics(tenantId);
  }

  @Post('auto-measure')
  @ApiOperation({ summary: 'Medicoes automaticas — ICT, densidade ossea, volume, diametro' })
  @ApiResponse({ status: 201, description: 'Medicao automatica concluida', type: AutoMeasureResponseDto })
  async autoMeasure(
    @CurrentTenant() tenantId: string,
    @Body() dto: AutoMeasureDto,
  ): Promise<AutoMeasureResponseDto> {
    return this.imagingAnalysisService.autoMeasure(
      tenantId,
      dto.examResultId,
      dto.measurementType,
      dto.regionOfInterest,
    );
  }
}
