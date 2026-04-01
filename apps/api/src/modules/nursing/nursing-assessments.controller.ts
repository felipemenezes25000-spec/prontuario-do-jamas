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
import { NursingAssessmentsService } from './nursing-assessments.service';
import {
  PainAssessmentDto,
  PainTrendPeriod,
  EliminationRecordDto,
  PositionChangeDto,
  FugulinAssessmentDto,
  StaffingCalculationDto,
} from './dto/nursing-assessments.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Nursing Assessments')
@ApiBearerAuth('access-token')
@Controller('nursing')
export class NursingAssessmentsController {
  constructor(private readonly service: NursingAssessmentsService) {}

  // =========================================================================
  // Pain Assessment
  // =========================================================================

  @Post('pain-assessment')
  @ApiOperation({ summary: 'Record pain assessment (EVA, FLACC, BPS, NIPS, WONG_BAKER)' })
  @ApiResponse({ status: 201, description: 'Pain assessment recorded' })
  @ApiResponse({ status: 400, description: 'Invalid pain score for the selected scale' })
  async recordPainAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PainAssessmentDto,
  ) {
    return this.service.recordPainAssessment(tenantId, user.sub, dto);
  }

  @Get('pain-trend/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiQuery({ name: 'period', required: false, enum: PainTrendPeriod, description: 'Trend period (default: 24h)' })
  @ApiOperation({ summary: 'Get pain trend data with graph points' })
  @ApiResponse({ status: 200, description: 'Pain trend data' })
  async getPainTrend(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Query('period') period?: PainTrendPeriod,
  ) {
    return this.service.getPainTrend(tenantId, encounterId, period);
  }

  @Get('pain-latest/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get latest pain assessment for an encounter' })
  @ApiResponse({ status: 200, description: 'Latest pain assessment or null' })
  async getLatestPain(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getLatestPain(tenantId, encounterId);
  }

  // =========================================================================
  // Elimination
  // =========================================================================

  @Post('elimination')
  @ApiOperation({ summary: 'Record elimination (urinary, bowel, ostomy)' })
  @ApiResponse({ status: 201, description: 'Elimination record created' })
  @ApiResponse({ status: 400, description: 'Missing required sub-record for the elimination type' })
  async recordElimination(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EliminationRecordDto,
  ) {
    return this.service.recordElimination(tenantId, user.sub, dto);
  }

  @Get('fluid-balance/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get 24h fluid balance (urinary output + intake)' })
  @ApiResponse({ status: 200, description: 'Fluid balance data' })
  async getFluidBalance(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getFluidBalance(tenantId, encounterId);
  }

  @Get('bowel-history/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get bowel elimination history' })
  @ApiResponse({ status: 200, description: 'Bowel history records' })
  async getBowelHistory(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getBowelHistory(tenantId, encounterId);
  }

  // =========================================================================
  // Position Change / Decubitus
  // =========================================================================

  @Post('position-change')
  @ApiOperation({ summary: 'Record patient position change with skin assessment' })
  @ApiResponse({ status: 201, description: 'Position change recorded' })
  async recordPositionChange(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PositionChangeDto,
  ) {
    return this.service.recordPositionChange(tenantId, user.sub, dto);
  }

  @Get('decubitus-schedule/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'intervalMinutes', required: false, description: 'Override interval (default: 120 min)' })
  @ApiOperation({ summary: 'Get decubitus prevention schedule with overdue alerts' })
  @ApiResponse({ status: 200, description: 'Schedule with overdue status' })
  async getDecubitusSchedule(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('intervalMinutes') intervalMinutes?: string,
  ) {
    const interval = intervalMinutes ? parseInt(intervalMinutes, 10) : undefined;
    return this.service.getDecubitusSchedule(tenantId, patientId, interval);
  }

  // =========================================================================
  // Fugulin Scale
  // =========================================================================

  @Post('fugulin/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Calculate Fugulin patient classification scale (12 items)' })
  @ApiResponse({ status: 201, description: 'Fugulin assessment with classification' })
  async calculateFugulin(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: FugulinAssessmentDto,
  ) {
    // Ensure path param matches body
    dto.encounterId = encounterId;
    return this.service.calculateFugulin(tenantId, user.sub, dto);
  }

  @Get('fugulin/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get latest Fugulin classification for an encounter' })
  @ApiResponse({ status: 200, description: 'Latest Fugulin classification or null' })
  async getPatientClassification(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getPatientClassification(tenantId, encounterId);
  }

  // =========================================================================
  // Staffing Calculation (COFEN 543/2017)
  // =========================================================================

  @Post('staffing-calculation')
  @ApiOperation({ summary: 'Calculate nursing staffing requirements per COFEN 543/2017' })
  @ApiResponse({ status: 200, description: 'Staffing calculation with compliance status' })
  async calculateStaffing(@Body() dto: StaffingCalculationDto) {
    return this.service.calculateStaffing(dto);
  }
}
