import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VitalsScalesService } from './vitals-scales.service';
import { RassScaleDto, CamIcuDto, VitalsTrendDto, VitalTrendType, TrendPeriodHours } from './dto/vitals-scales.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Vital Signs — Scales & Trends')
@ApiBearerAuth('access-token')
@Controller('vital-signs')
export class VitalsScalesController {
  constructor(private readonly vitalsScalesService: VitalsScalesService) {}

  // ─── RASS ────────────────────────────────────────────────────────────────────

  @Post('rass')
  @ApiOperation({ summary: 'Record RASS (Richmond Agitation-Sedation Scale) assessment' })
  @ApiResponse({ status: 201, description: 'RASS assessment recorded' })
  async recordRass(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RassScaleDto,
  ) {
    return this.vitalsScalesService.recordRassAssessment(tenantId, user.sub, dto);
  }

  @Get(':patientId/rass')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 20)' })
  @ApiOperation({ summary: 'List RASS history for a patient' })
  @ApiResponse({ status: 200, description: 'RASS history' })
  async getRassHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.vitalsScalesService.getRassHistory(patientId, limit ? parseInt(limit, 10) : 20);
  }

  // ─── CAM-ICU ─────────────────────────────────────────────────────────────────

  @Post('cam-icu')
  @ApiOperation({ summary: 'Record CAM-ICU (Delirium Assessment)' })
  @ApiResponse({ status: 201, description: 'CAM-ICU assessment recorded' })
  async recordCamIcu(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CamIcuDto,
  ) {
    return this.vitalsScalesService.recordCamIcuAssessment(tenantId, user.sub, dto);
  }

  @Get(':patientId/cam-icu')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 20)' })
  @ApiOperation({ summary: 'List CAM-ICU history for a patient' })
  @ApiResponse({ status: 200, description: 'CAM-ICU history' })
  async getCamIcuHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.vitalsScalesService.getCamIcuHistory(patientId, limit ? parseInt(limit, 10) : 20);
  }

  // ─── Trends ───────────────────────────────────────────────────────────────────

  @Get(':patientId/trends')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'vitalType', enum: VitalTrendType, description: 'Vital sign type' })
  @ApiQuery({ name: 'periodHours', enum: TrendPeriodHours, description: '24, 168, or 720 hours' })
  @ApiOperation({ summary: 'Get vital signs trend graph data with normal zones' })
  @ApiResponse({ status: 200, description: 'Trend data with stats and normal zone' })
  async getTrends(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('vitalType') vitalType: VitalTrendType,
    @Query('periodHours') periodHours: string,
  ) {
    const dto: VitalsTrendDto = {
      patientId,
      vitalType,
      periodHours: parseInt(periodHours, 10) as TrendPeriodHours,
    };
    return this.vitalsScalesService.getVitalsTrend(patientId, dto);
  }
}
