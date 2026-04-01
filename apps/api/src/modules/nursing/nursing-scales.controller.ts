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
import { NursingScalesService } from './nursing-scales.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  PainScaleDto,
  EliminationControlDto,
  DecubitusChangeDto,
  AdmissionChecklistDto,
  WoundEvolutionDto,
  IndividualCarePlanDto,
  FugulinScaleDto,
  StaffDimensioningDto,
  NursingScheduleDto,
  CatheterBundleDto,
  CvcBundleDto,
} from './dto/nursing-scales.dto';

@ApiTags('Nursing Scales')
@ApiBearerAuth('access-token')
@Controller('nursing')
export class NursingScalesController {
  constructor(private readonly service: NursingScalesService) {}

  // ===========================================================================
  // A) Pain Scales
  // ===========================================================================

  @Post('scales/pain')
  @ApiOperation({ summary: 'Record pain assessment — EVA (adults), FLACC (pediatric), BPS (sedated)' })
  @ApiResponse({ status: 201, description: 'Pain assessment recorded' })
  @ApiResponse({ status: 400, description: 'Invalid score for the selected scale' })
  async recordPainAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PainScaleDto,
  ) {
    return this.service.recordPainAssessment(tenantId, user.sub, dto);
  }

  @Get('scales/pain-trend/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'hoursBack', required: false, type: Number, description: 'Hours of history to return (default 24)' })
  @ApiOperation({ summary: 'Get pain trend data with serial recordings for chart' })
  @ApiResponse({ status: 200, description: 'Pain trend data points' })
  async getPainTrend(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hoursBack') hoursBack?: string,
  ) {
    return this.service.getPainTrend(tenantId, patientId, hoursBack ? parseInt(hoursBack, 10) : 24);
  }

  // ===========================================================================
  // B) Elimination Control
  // ===========================================================================

  @Post('scales/elimination')
  @ApiOperation({ summary: 'Record elimination — urine volume, Bristol scale, ostomy' })
  @ApiResponse({ status: 201, description: 'Elimination record created' })
  async recordElimination(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EliminationControlDto,
  ) {
    return this.service.recordElimination(tenantId, user.sub, dto);
  }

  @Get('scales/fluid-balance/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'hoursBack', required: false, type: Number, description: 'Hours to look back (default 24)' })
  @ApiOperation({ summary: 'Get fluid balance — total urine output in period' })
  @ApiResponse({ status: 200, description: 'Fluid balance data' })
  async getFluidBalance(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hoursBack') hoursBack?: string,
  ) {
    return this.service.getFluidBalance(tenantId, patientId, hoursBack ? parseInt(hoursBack, 10) : 24);
  }

  // ===========================================================================
  // C) Decubitus Change Schedule
  // ===========================================================================

  @Post('scales/decubitus-change')
  @ApiOperation({ summary: 'Record decubitus change — position, timer, delay alert (every 2h)' })
  @ApiResponse({ status: 201, description: 'Position change recorded' })
  async recordDecubitusChange(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DecubitusChangeDto,
  ) {
    return this.service.recordDecubitusChange(tenantId, user.sub, dto);
  }

  @Get('scales/decubitus-schedule/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get decubitus schedule — last change, next due, current position, alert' })
  @ApiResponse({ status: 200, description: 'Decubitus schedule status' })
  async getDecubitusSchedule(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getDecubitusSchedule(tenantId, patientId);
  }

  // ===========================================================================
  // D) Nursing Admission Checklist
  // ===========================================================================

  @Post('scales/admission-checklist')
  @ApiOperation({ summary: 'Create nursing admission checklist — allergies, medications, fall risk, orientation' })
  @ApiResponse({ status: 201, description: 'Admission checklist created' })
  async createAdmissionChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdmissionChecklistDto,
  ) {
    return this.service.createAdmissionChecklist(tenantId, user.sub, dto);
  }

  // ===========================================================================
  // E) Wound Photographic Evolution
  // ===========================================================================

  @Post('scales/wound-evolution')
  @ApiOperation({ summary: 'Record wound evolution — photo, AI area measurement, healing trend' })
  @ApiResponse({ status: 201, description: 'Wound evolution recorded' })
  async recordWoundEvolution(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: WoundEvolutionDto,
  ) {
    return this.service.recordWoundEvolution(tenantId, user.sub, dto);
  }

  @Get('scales/wound-history/:woundId')
  @ApiParam({ name: 'woundId', description: 'Wound identifier' })
  @ApiOperation({ summary: 'Get wound evolution history with AI measurements for comparison chart' })
  @ApiResponse({ status: 200, description: 'Wound evolution history' })
  async getWoundHistory(
    @CurrentTenant() tenantId: string,
    @Param('woundId') woundId: string,
  ) {
    return this.service.getWoundHistory(tenantId, woundId);
  }

  // ===========================================================================
  // F) Individual Care Plans
  // ===========================================================================

  @Post('scales/care-plan')
  @ApiOperation({ summary: 'Create nursing individual care plan — NANDA diagnoses, interventions, outcomes' })
  @ApiResponse({ status: 201, description: 'Care plan created' })
  async createCarePlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: IndividualCarePlanDto,
  ) {
    return this.service.createCarePlan(tenantId, user.sub, dto);
  }

  // ===========================================================================
  // G) Fugulin Scale
  // ===========================================================================

  @Post('scales/fugulin')
  @ApiOperation({ summary: 'Record Fugulin scale assessment — patient classification by complexity' })
  @ApiResponse({ status: 201, description: 'Fugulin assessment recorded' })
  @ApiResponse({ status: 400, description: 'Invalid Fugulin score (must be 7–48)' })
  async recordFugulin(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: FugulinScaleDto,
  ) {
    return this.service.recordFugulin(tenantId, user.sub, dto);
  }

  // ===========================================================================
  // H) Staff Dimensioning (COFEN 543/2017)
  // ===========================================================================

  @Post('scales/staff-dimensioning')
  @ApiOperation({ summary: 'Calculate staff dimensioning per COFEN 543/2017 resolution' })
  @ApiResponse({ status: 200, description: 'Dimensioning result with required nurses and technicians' })
  @ApiResponse({ status: 400, description: 'Total patients must be greater than zero' })
  calculateStaffDimensioning(
    @Body() dto: StaffDimensioningDto,
  ) {
    return this.service.calculateStaffDimensioning(dto);
  }

  // ===========================================================================
  // I) Nursing Work Schedule
  // ===========================================================================

  @Post('scales/schedule')
  @ApiOperation({ summary: 'Save nursing work schedule — 12x36, 6h shifts, staff assignments' })
  @ApiResponse({ status: 201, description: 'Schedule saved' })
  async saveNursingSchedule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NursingScheduleDto,
  ) {
    return this.service.saveNursingSchedule(tenantId, user.sub, dto);
  }

  // ===========================================================================
  // J) Catheter Bundle (CAUTI prevention)
  // ===========================================================================

  @Post('scales/catheter-bundle')
  @ApiOperation({ summary: 'Record catheter bundle assessment — CAUTI prevention, daily necessity review' })
  @ApiResponse({ status: 201, description: 'Catheter bundle recorded' })
  async recordCatheterBundle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CatheterBundleDto,
  ) {
    return this.service.recordCatheterBundle(tenantId, user.sub, dto);
  }

  // ===========================================================================
  // K) CVC Bundle (CLABSI prevention)
  // ===========================================================================

  @Post('scales/cvc-bundle')
  @ApiOperation({ summary: 'Record CVC bundle — CLABSI prevention, insertion + daily checklist' })
  @ApiResponse({ status: 201, description: 'CVC bundle recorded' })
  async recordCvcBundle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CvcBundleDto,
  ) {
    return this.service.recordCvcBundle(tenantId, user.sub, dto);
  }

  @Get('scales/cvc-bundle/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get CVC bundle history for a patient (last 30 entries)' })
  @ApiResponse({ status: 200, description: 'CVC bundle history' })
  async getCvcBundleHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getCvcBundleHistory(tenantId, patientId);
  }
}
