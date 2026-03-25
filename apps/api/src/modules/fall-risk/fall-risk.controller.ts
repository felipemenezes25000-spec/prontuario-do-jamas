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
import { FallRiskService } from './fall-risk.service';
import {
  CreateMorseAssessmentDto,
  CreateBradenAssessmentDto,
  CreatePreventionPlanDto,
} from './dto/create-fall-risk.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Fall Risk')
@ApiBearerAuth('access-token')
@Controller('fall-risk')
export class FallRiskController {
  constructor(private readonly fallRiskService: FallRiskService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create Morse Fall Scale assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createMorseAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMorseAssessmentDto,
  ) {
    return this.fallRiskService.createMorseAssessment(tenantId, user.sub, dto);
  }

  @Post('braden')
  @ApiOperation({ summary: 'Create Braden Scale assessment for pressure injury risk' })
  @ApiResponse({ status: 201, description: 'Braden assessment created' })
  async createBradenAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBradenAssessmentDto,
  ) {
    return this.fallRiskService.createBradenAssessment(tenantId, user.sub, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get fall/pressure risk history for a patient' })
  @ApiResponse({ status: 200, description: 'Risk history' })
  async getPatientRiskHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.fallRiskService.getPatientRiskHistory(tenantId, patientId);
  }

  @Get('alerts/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get active fall risk alerts for a patient' })
  @ApiResponse({ status: 200, description: 'Active alerts' })
  async getActiveAlerts(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.fallRiskService.getActiveAlerts(tenantId, patientId);
  }

  @Post(':id/prevention-plan')
  @ApiParam({ name: 'id', description: 'Assessment UUID' })
  @ApiOperation({ summary: 'Create fall prevention plan linked to an assessment' })
  @ApiResponse({ status: 201, description: 'Prevention plan created' })
  async createPreventionPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePreventionPlanDto,
  ) {
    return this.fallRiskService.createPreventionPlan(tenantId, user.sub, id, dto);
  }

  // ─── VTE Prevention (Caprini / Padua) ──────────────────────────────────────

  @Post('vte-assessment')
  @ApiOperation({ summary: 'Assess VTE risk using Caprini or Padua scale' })
  @ApiResponse({ status: 201, description: 'VTE risk assessment created' })
  async assessVteRisk(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      patientId: string;
      encounterId?: string;
      tool: 'CAPRINI' | 'PADUA';
      items: Array<{ criterion: string; score: number; present: boolean }>;
      observations?: string;
    },
  ) {
    return this.fallRiskService.assessVteRisk(tenantId, user.sub, dto);
  }

  // ─── SSI Prevention Protocol ───────────────────────────────────────────────

  @Post('ssi-prevention')
  @ApiOperation({ summary: 'Record surgical site infection prevention checklist' })
  @ApiResponse({ status: 201, description: 'SSI prevention record created' })
  async recordSsiPrevention(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      patientId: string;
      encounterId?: string;
      surgeryType: string;
      checklist: {
        prophylacticAtbAdministered: boolean;
        atbTimingMinutesBeforeIncision?: number;
        atbName?: string;
        trichotomyMethod?: string;
        normothermiaMainained: boolean;
        temperatureAtEnd?: number;
        glycemiaControlled: boolean;
        glycemiaValue?: number;
        skinPrepSolution?: string;
        drainPlacement?: boolean;
      };
    },
  ) {
    return this.fallRiskService.recordSsiPrevention(tenantId, user.sub, dto);
  }
}
