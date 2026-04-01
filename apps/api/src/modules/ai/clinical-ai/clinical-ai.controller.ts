import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClinicalAiService } from './clinical-ai.service';

@ApiTags('Clinical AI')
@Controller('ai/clinical')
export class ClinicalAiController {
  constructor(private readonly clinicalAiService: ClinicalAiService) {}

  @Get('insights/:patientId')
  @ApiOperation({ summary: 'Get AI-generated clinical insights for a patient' })
  @ApiResponse({ status: 200, description: 'Clinical insights retrieved' })
  async getClinicalInsights(
    @Param('patientId') patientId: string,
    @Query('tenantId') tenantId: string,
  ): Promise<Record<string, unknown>> {
    return this.clinicalAiService.getClinicalInsights(patientId, tenantId);
  }

  @Post('analyze/:patientId')
  @ApiOperation({ summary: 'Analyze clinical data using AI' })
  @ApiResponse({ status: 200, description: 'Clinical data analysis completed' })
  async analyzeClinicalData(
    @Param('patientId') patientId: string,
    @Body() body: { dataType: string; tenantId: string },
  ): Promise<Record<string, unknown>> {
    return this.clinicalAiService.analyzeClinicalData(
      patientId,
      body.dataType,
      body.tenantId,
    );
  }
}
