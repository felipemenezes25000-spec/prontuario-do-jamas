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
import {
  NursingEnhancedService,
  type MorseScaleDto,
  type BradenScaleDto,
  type WoundRegistrationDto,
  type PainScaleDto,
  type EliminationTrackingDto,
  type AdmissionChecklistDto,
  type RepositioningDto,
  type CarePlanDto,
  type FugulinDto,
  type StaffingCalculatorDto,
  type WorkScheduleEntryDto,
  type CatheterBundleDto,
} from './nursing-enhanced.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Nursing Enhanced')
@ApiBearerAuth('access-token')
@Controller('nursing-enhanced')
export class NursingEnhancedController {
  constructor(private readonly service: NursingEnhancedService) {}

  // --- Morse Scale ---

  @Post('morse')
  @ApiOperation({ summary: 'Assess Morse Fall Risk Scale' })
  @ApiResponse({ status: 201, description: 'Assessment recorded' })
  async assessMorse(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MorseScaleDto,
  ) {
    return this.service.assessMorse(tenantId, user.sub, dto);
  }

  // --- Braden Scale ---

  @Post('braden')
  @ApiOperation({ summary: 'Assess Braden Pressure Injury Scale' })
  @ApiResponse({ status: 201, description: 'Assessment recorded' })
  async assessBraden(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: BradenScaleDto,
  ) {
    return this.service.assessBraden(tenantId, user.sub, dto);
  }

  // --- Wounds ---

  @Post('wounds')
  @ApiOperation({ summary: 'Register wound/dressing' })
  @ApiResponse({ status: 201, description: 'Wound recorded' })
  async registerWound(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: WoundRegistrationDto,
  ) {
    return this.service.registerWound(tenantId, user.sub, dto);
  }

  @Get('wounds/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List wound records' })
  @ApiResponse({ status: 200, description: 'Wound records' })
  async listWounds(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listWounds(tenantId, patientId);
  }

  // --- Pain Scales ---

  @Post('pain')
  @ApiOperation({ summary: 'Record pain scale assessment' })
  @ApiResponse({ status: 201, description: 'Pain recorded' })
  async recordPain(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PainScaleDto,
  ) {
    return this.service.recordPainScale(tenantId, user.sub, dto);
  }

  @Get('pain/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List pain scale records' })
  @ApiResponse({ status: 200, description: 'Pain records' })
  async listPainScales(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listPainScales(tenantId, patientId);
  }

  // --- Elimination Tracking ---

  @Post('elimination')
  @ApiOperation({ summary: 'Record elimination (urine, stool, ostomy)' })
  @ApiResponse({ status: 201, description: 'Elimination recorded' })
  async recordElimination(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EliminationTrackingDto,
  ) {
    return this.service.recordElimination(tenantId, user.sub, dto);
  }

  @Get('elimination/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List elimination records' })
  @ApiResponse({ status: 200, description: 'Elimination records' })
  async listEliminations(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listEliminations(tenantId, patientId);
  }

  // --- Admission Checklist ---

  @Post('admission-checklist')
  @ApiOperation({ summary: 'Complete nursing admission checklist' })
  @ApiResponse({ status: 201, description: 'Checklist completed' })
  async createAdmissionChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdmissionChecklistDto,
  ) {
    return this.service.createAdmissionChecklist(tenantId, user.sub, dto);
  }

  // --- Repositioning ---

  @Post('repositioning')
  @ApiOperation({ summary: 'Record patient repositioning' })
  @ApiResponse({ status: 201, description: 'Repositioning recorded' })
  async recordRepositioning(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RepositioningDto,
  ) {
    return this.service.recordRepositioning(tenantId, user.sub, dto);
  }

  @Get('repositioning/:patientId/:encounterId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'List repositionings with overdue alert' })
  @ApiResponse({ status: 200, description: 'Repositioning records' })
  async listRepositionings(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.listRepositionings(tenantId, patientId, encounterId);
  }

  // --- Care Plan ---

  @Post('care-plan')
  @ApiOperation({ summary: 'Create individualized care plan' })
  @ApiResponse({ status: 201, description: 'Care plan created' })
  async createCarePlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CarePlanDto,
  ) {
    return this.service.createCarePlan(tenantId, user.sub, dto);
  }

  // --- Fugulin Scale ---

  @Post('fugulin')
  @ApiOperation({ summary: 'Assess Fugulin patient classification' })
  @ApiResponse({ status: 201, description: 'Fugulin assessment recorded' })
  async assessFugulin(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: FugulinDto,
  ) {
    return this.service.assessFugulin(tenantId, user.sub, dto);
  }

  // --- Staffing Calculator ---

  @Post('staffing-calculator')
  @ApiOperation({ summary: 'Calculate nursing staffing (COFEN 543/2017)' })
  @ApiResponse({ status: 200, description: 'Staffing calculation' })
  async calculateStaffing(@Body() dto: StaffingCalculatorDto) {
    return this.service.calculateStaffing(dto);
  }

  // --- Work Schedule ---

  @Post('work-schedule')
  @ApiOperation({ summary: 'Create work schedule entry' })
  @ApiResponse({ status: 201, description: 'Schedule entry created' })
  async createScheduleEntry(
    @CurrentTenant() tenantId: string,
    @Body() dto: WorkScheduleEntryDto,
  ) {
    return this.service.createScheduleEntry(tenantId, dto);
  }

  @Get('work-schedule')
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiOperation({ summary: 'Get work schedule for period' })
  @ApiResponse({ status: 200, description: 'Schedule entries' })
  async getSchedule(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getScheduleForPeriod(tenantId, startDate, endDate);
  }

  // --- Catheter Bundles ---

  @Post('catheter-bundle')
  @ApiOperation({ summary: 'Record catheter bundle assessment' })
  @ApiResponse({ status: 201, description: 'Bundle recorded' })
  async createCatheterBundle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CatheterBundleDto,
  ) {
    return this.service.createCatheterBundle(tenantId, user.sub, dto);
  }

  @Get('catheter-bundle/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List catheter bundle records' })
  @ApiResponse({ status: 200, description: 'Bundle records' })
  async listCatheterBundles(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listCatheterBundles(tenantId, patientId);
  }

  // --- AI Features ---

  @Get('ai/fall-risk/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'AI personalized fall risk prediction' })
  @ApiResponse({ status: 200, description: 'Prediction result' })
  async aiFallRisk(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.aiFallRiskPrediction(tenantId, patientId);
  }

  @Get('ai/wound-prediction/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'AI wound deterioration prediction' })
  @ApiResponse({ status: 200, description: 'Prediction result' })
  async aiWoundPrediction(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.aiWoundPrediction(tenantId, patientId);
  }
}
