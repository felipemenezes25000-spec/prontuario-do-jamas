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
import { IcuMonitoringService } from './icu-monitoring.service';
import {
  RecordInvasiveMonitoringDto,
  RecordVentilationDto,
} from './dto/icu-monitoring.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('ICU Monitoring')
@ApiBearerAuth('access-token')
@Controller('icu-monitoring')
export class IcuMonitoringController {
  constructor(private readonly icuMonitoringService: IcuMonitoringService) {}

  // ─── Hemodynamic Monitoring ──────────────────────────────────────────────

  @Post('hemodynamic')
  @ApiOperation({ summary: 'Record invasive hemodynamic monitoring (PAM, PVC, Swan-Ganz, PIC)' })
  @ApiResponse({ status: 201, description: 'Invasive monitoring recorded with alerts' })
  async recordInvasiveMonitoring(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordInvasiveMonitoringDto,
  ) {
    return this.icuMonitoringService.recordInvasiveMonitoring(
      tenantId,
      user.sub,
      dto,
    );
  }

  @Get('hemodynamic/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get hemodynamic monitoring history with trends' })
  @ApiResponse({ status: 200, description: 'Hemodynamic history and trends' })
  async getHemodynamicHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuMonitoringService.getHemodynamicHistory(tenantId, patientId);
  }

  @Get('hemodynamic/:patientId/summary')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get latest hemodynamic values with interpretations' })
  @ApiResponse({ status: 200, description: 'Hemodynamic summary with interpretations' })
  async getHemodynamicSummary(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuMonitoringService.getHemodynamicSummary(tenantId, patientId);
  }

  // ─── Mechanical Ventilation ──────────────────────────────────────────────

  @Post('ventilation')
  @ApiOperation({ summary: 'Record mechanical ventilation parameters, measurements, and blood gas' })
  @ApiResponse({ status: 201, description: 'Ventilation record created with ARDS classification and alerts' })
  async recordVentilation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordVentilationDto,
  ) {
    return this.icuMonitoringService.recordVentilation(
      tenantId,
      user.sub,
      dto,
    );
  }

  @Get('ventilation/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get ventilation history with weaning trend data' })
  @ApiResponse({ status: 200, description: 'Ventilation history and weaning trends' })
  async getVentilationHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuMonitoringService.getVentilationHistory(tenantId, patientId);
  }

  @Get('ventilation/:patientId/summary')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get current ventilation settings, measurements, and active alerts' })
  @ApiResponse({ status: 200, description: 'Ventilation summary with ARDS classification' })
  async getVentilationSummary(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuMonitoringService.getVentilationSummary(tenantId, patientId);
  }

  @Get('ventilation/:patientId/weaning-readiness')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Assess weaning readiness: RSBI, PEEP, FiO2, hemodynamics, consciousness' })
  @ApiResponse({ status: 200, description: 'Weaning readiness assessment with criteria checklist' })
  async assessWeaningReadiness(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuMonitoringService.assessWeaningReadiness(tenantId, patientId);
  }
}
