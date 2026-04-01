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
import { ArrhythmiaDetectionService } from './arrhythmia-detection.service';
import { AnalyzeRhythmDto } from './arrhythmia-detection.dto';

@ApiTags('AI — Arrhythmia Detection')
@ApiBearerAuth('access-token')
@Controller('ai/arrhythmia')
export class ArrhythmiaDetectionController {
  constructor(
    private readonly arrhythmiaService: ArrhythmiaDetectionService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze ECG rhythm for arrhythmia detection' })
  @ApiResponse({ status: 201, description: 'Rhythm analysis complete' })
  async analyzeRhythm(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzeRhythmDto,
  ) {
    return this.arrhythmiaService.analyzeRhythm(tenantId, dto);
  }

  @Get('monitoring/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get continuous monitoring alerts for the last 24h' })
  @ApiResponse({ status: 200, description: 'Monitoring alerts' })
  async getContinuousMonitoring(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.arrhythmiaService.getContinuousMonitoring(tenantId, patientId);
  }

  @Get('history/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get full arrhythmia detection history for a patient' })
  @ApiResponse({ status: 200, description: 'Arrhythmia history' })
  async getArrhythmiaHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.arrhythmiaService.getArrhythmiaHistory(tenantId, patientId);
  }
}
