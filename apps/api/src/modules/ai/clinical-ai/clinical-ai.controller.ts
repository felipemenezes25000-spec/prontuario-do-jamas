import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClinicalAiService } from './clinical-ai.service';

@ApiTags('Clinical AI')
@Controller('ai/clinical')
export class ClinicalAiController {
  constructor(private readonly clinicalAiService: ClinicalAiService) {}

  @Get('insights/:patientId')
  @ApiOperation({ summary: 'Get AI-generated clinical insights for a patient' })
  @ApiResponse({ status: 200, description: 'Clinical insights including drug interactions, lab alerts, preventive screenings' })
  async getClinicalInsights(
    @Param('patientId') patientId: string,
    @Query('tenantId') tenantId: string,
  ): Promise<Record<string, unknown>> {
    return this.clinicalAiService.getClinicalInsights(patientId, tenantId);
  }

  @Post('insights/:patientId')
  @ApiOperation({ summary: 'Get clinical insights with full patient data' })
  @ApiResponse({ status: 200, description: 'Clinical insights with drug interactions, critical labs, screenings' })
  async getClinicalInsightsWithData(
    @Param('patientId') patientId: string,
    @Body() body: {
      tenantId: string;
      age?: number;
      gender?: string;
      conditions?: string[];
      medications?: string[];
      allergies?: string[];
      lastLabResults?: Array<{ name: string; value: number; unit: string; date?: string }>;
      lastScreenings?: Array<{ type: string; date: string }>;
    },
  ): Promise<Record<string, unknown>> {
    return this.clinicalAiService.getClinicalInsights(patientId, body.tenantId, {
      age: body.age,
      gender: body.gender,
      conditions: body.conditions,
      medications: body.medications,
      allergies: body.allergies,
      lastLabResults: body.lastLabResults,
      lastScreenings: body.lastScreenings,
    });
  }

  @Post('analyze/:patientId')
  @ApiOperation({ summary: 'Analyze clinical data (cardiovascular, renal, etc.)' })
  @ApiResponse({ status: 200, description: 'Clinical data analysis with findings, risk factors, recommendations' })
  async analyzeClinicalData(
    @Param('patientId') patientId: string,
    @Body() body: { dataType: string; tenantId: string; data?: Record<string, unknown> },
  ) {
    return this.clinicalAiService.analyzeClinicalData(
      patientId,
      body.dataType,
      body.tenantId,
      body.data,
    );
  }

  @Post('drug-interactions')
  @ApiOperation({ summary: 'Check drug interactions, allergy cross-reactivity, and duplicate therapy' })
  @ApiResponse({ status: 200, description: 'Drug interaction check results' })
  async checkDrugInteractions(
    @Body() body: { medications: string[]; allergies?: string[] },
  ) {
    return this.clinicalAiService.checkDrugInteractions(
      body.medications,
      body.allergies ?? [],
    );
  }

  @Post('critical-labs')
  @ApiOperation({ summary: 'Check lab values against critical ranges' })
  @ApiResponse({ status: 200, description: 'Critical lab value alerts' })
  async checkCriticalLabs(
    @Body() body: { labs: Array<{ name: string; value: number; unit: string }> },
  ): Promise<Record<string, unknown>> {
    const allAlerts = [];
    for (const lab of body.labs) {
      const alerts = this.clinicalAiService.checkCriticalLabValue(lab.name, lab.value, lab.unit);
      allAlerts.push(...alerts);
    }
    return { alerts: allAlerts, totalAlerts: allAlerts.length };
  }

  @Post('preventive-screenings')
  @ApiOperation({ summary: 'Get preventive screening recommendations' })
  @ApiResponse({ status: 200, description: 'Preventive screening recommendations based on age/gender/conditions' })
  async getPreventiveScreenings(
    @Body() body: {
      age: number;
      gender?: string;
      conditions?: string[];
      lastScreenings?: Array<{ type: string; date: string }>;
    },
  ): Promise<Record<string, unknown>> {
    const screenings = this.clinicalAiService.getPreventiveScreenings(
      body.age,
      body.gender,
      body.conditions,
      body.lastScreenings,
    );
    return { screenings, totalRecommendations: screenings.length };
  }
}
