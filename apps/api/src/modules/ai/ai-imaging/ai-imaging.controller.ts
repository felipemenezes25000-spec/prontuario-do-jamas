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
import { AiImagingService } from './ai-imaging.service';
import {
  AnalyzeImageDto,
  PrioritizeWorklistDto,
  ImagingAnalysisResponseDto,
  PrioritizedWorklistResponseDto,
  ImagingDashboardResponseDto,
} from './dto/ai-imaging.dto';

@ApiTags('AI — Imaging')
@ApiBearerAuth('access-token')
@Controller('ai/imaging')
export class AiImagingController {
  constructor(private readonly imagingService: AiImagingService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Submit image for AI analysis' })
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
    );
  }

  @Get(':id/findings')
  @ApiOperation({ summary: 'Get AI findings for an imaging analysis' })
  @ApiParam({ name: 'id', description: 'Analysis UUID' })
  @ApiResponse({ status: 200, description: 'Analysis findings', type: ImagingAnalysisResponseDto })
  async getFindings(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.getFindings(tenantId, id);
  }

  @Post('prioritize')
  @ApiOperation({ summary: 'AI worklist prioritization' })
  @ApiResponse({ status: 201, description: 'Prioritized worklist', type: PrioritizedWorklistResponseDto })
  async prioritizeWorklist(
    @CurrentTenant() tenantId: string,
    @Body() dto: PrioritizeWorklistDto,
  ): Promise<PrioritizedWorklistResponseDto> {
    return this.imagingService.prioritizeWorklist(tenantId, dto.modality, dto.limit);
  }

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
  @ApiOperation({ summary: 'AI CT stroke detection — ischemic, hemorrhagic' })
  @ApiResponse({ status: 201, type: ImagingAnalysisResponseDto })
  async analyzeCtStroke(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.analyzeCtStroke(tenantId, dto.examResultId, dto.clinicalIndication);
  }

  @Post('mammography')
  @ApiOperation({ summary: 'AI mammography CAD — microcalcifications, masses' })
  @ApiResponse({ status: 201, type: ImagingAnalysisResponseDto })
  async analyzeMammography(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.imagingService.analyzeMammography(tenantId, dto.examResultId, dto.clinicalIndication);
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
  @ApiOperation({ summary: 'AI imaging dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data', type: ImagingDashboardResponseDto })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ): Promise<ImagingDashboardResponseDto> {
    return this.imagingService.getDashboard(tenantId);
  }
}
