import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PsychologyService } from './psychology.service';
import {
  CreatePsychologyAssessmentDto,
  CreatePsychologyTreatmentPlanDto,
  RecordPsychologySessionDto,
  SuicideRiskAssessmentDto,
} from './dto/create-psychology.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Psychology')
@ApiBearerAuth('access-token')
@Controller('psychology')
export class PsychologyController {
  constructor(private readonly psychologyService: PsychologyService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create psychometric assessment (PHQ-9, GAD-7, MINI)' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePsychologyAssessmentDto,
  ) {
    return this.psychologyService.createAssessment(tenantId, dto);
  }

  @Post('treatment-plan')
  @ApiOperation({ summary: 'Create therapeutic plan' })
  @ApiResponse({ status: 201, description: 'Treatment plan created' })
  async createTreatmentPlan(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePsychologyTreatmentPlanDto,
  ) {
    return this.psychologyService.createTreatmentPlan(tenantId, dto);
  }

  @Post(':id/session')
  @ApiParam({ name: 'id', description: 'Psychology record UUID' })
  @ApiOperation({ summary: 'Record therapy session' })
  @ApiResponse({ status: 201, description: 'Session recorded' })
  async recordSession(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPsychologySessionDto,
  ) {
    return this.psychologyService.recordSession(tenantId, id, dto);
  }

  @Post('suicide-risk')
  @ApiOperation({ summary: 'Create suicide risk assessment' })
  @ApiResponse({ status: 201, description: 'Risk assessment created' })
  async createSuicideRiskAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuicideRiskAssessmentDto,
  ) {
    return this.psychologyService.createSuicideRiskAssessment(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get mental health history' })
  @ApiResponse({ status: 200, description: 'Mental health history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.psychologyService.findByPatient(tenantId, patientId);
  }
}
