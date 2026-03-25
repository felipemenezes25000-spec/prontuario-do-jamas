import {
  Controller,
  Get,
  Post,
  Patch,
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
import { IcuService } from './icu.service';
import {
  CalculateApacheIIDto,
  CalculateSofaDto,
  CalculateSaps3Dto,
  CalculateTiss28Dto,
  VasoactiveDrugCalculatorDto,
  CreateSedationAssessmentDto,
  CreateVentilationRecordDto,
  CreateDialysisPrescriptionDto,
  CreateInvasiveDeviceDto,
  UpdateDeviceBundleChecklistDto,
  CreateBundleChecklistDto,
  CreateProneSessionDto,
  CreateDailyGoalsDto,
  CreateEcmoRecordDto,
  CreateEnteralNutritionDto,
} from './dto/icu.dto';
import {
  CreateHypothermiaSessionDto,
  PredictSepsisDto,
  PredictExtubationDto,
  SuggestVasopressorTitrationDto,
} from './dto/icu-advanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('ICU')
@ApiBearerAuth('access-token')
@Controller('icu')
export class IcuController {
  constructor(private readonly icuService: IcuService) {}

  // ─── Scores ─────────────────────────────────────────────────────────────

  @Post('scores/apache-ii')
  @ApiOperation({ summary: 'Calculate APACHE II score' })
  @ApiResponse({ status: 201, description: 'APACHE II score calculated' })
  async calculateApacheII(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateApacheIIDto,
  ) {
    return this.icuService.calculateApacheII(tenantId, user.sub, dto);
  }

  @Post('scores/sofa')
  @ApiOperation({ summary: 'Calculate SOFA score' })
  @ApiResponse({ status: 201, description: 'SOFA score calculated' })
  async calculateSofa(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateSofaDto,
  ) {
    return this.icuService.calculateSofa(tenantId, user.sub, dto);
  }

  @Post('scores/saps-3')
  @ApiOperation({ summary: 'Calculate SAPS 3 score' })
  @ApiResponse({ status: 201, description: 'SAPS 3 score calculated' })
  async calculateSaps3(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateSaps3Dto,
  ) {
    return this.icuService.calculateSaps3(tenantId, user.sub, dto);
  }

  @Post('scores/tiss-28')
  @ApiOperation({ summary: 'Calculate TISS-28 score' })
  @ApiResponse({ status: 201, description: 'TISS-28 score calculated' })
  async calculateTiss28(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateTiss28Dto,
  ) {
    return this.icuService.calculateTiss28(tenantId, user.sub, dto);
  }

  @Get('scores/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'scoreType', required: false, description: 'Score type filter: APACHE_II, SOFA, SAPS_3, TISS_28' })
  @ApiOperation({ summary: 'Get score history for patient' })
  async getScoreHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('scoreType') scoreType?: string,
  ) {
    return this.icuService.getScoreHistory(tenantId, patientId, scoreType);
  }

  // ─── Vasoactive Drugs Calculator ────────────────────────────────────────

  @Post('vasoactive-calculator')
  @ApiOperation({ summary: 'Calculate vasoactive drug pump rate' })
  @ApiResponse({ status: 200, description: 'Calculation result' })
  async calculateVasoactiveDrug(@Body() dto: VasoactiveDrugCalculatorDto) {
    return this.icuService.calculateVasoactiveDrug(dto);
  }

  // ─── Sedation ───────────────────────────────────────────────────────────

  @Post('sedation')
  @ApiOperation({ summary: 'Record sedation assessment (RASS, BPS, SAT)' })
  @ApiResponse({ status: 201, description: 'Sedation assessment recorded' })
  async createSedationAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSedationAssessmentDto,
  ) {
    return this.icuService.createSedationAssessment(tenantId, user.sub, dto);
  }

  // ─── Ventilation ────────────────────────────────────────────────────────

  @Post('ventilation')
  @ApiOperation({ summary: 'Record mechanical ventilation parameters' })
  @ApiResponse({ status: 201, description: 'Ventilation record created' })
  async createVentilationRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVentilationRecordDto,
  ) {
    return this.icuService.createVentilationRecord(tenantId, user.sub, dto);
  }

  // ─── Dialysis / CRRT ───────────────────────────────────────────────────

  @Post('dialysis')
  @ApiOperation({ summary: 'Create dialysis/CRRT prescription' })
  @ApiResponse({ status: 201, description: 'Dialysis prescription created' })
  async createDialysisPrescription(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDialysisPrescriptionDto,
  ) {
    return this.icuService.createDialysisPrescription(tenantId, user.sub, dto);
  }

  // ─── Invasive Devices ──────────────────────────────────────────────────

  @Post('devices')
  @ApiOperation({ summary: 'Register invasive device' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  async createInvasiveDevice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvasiveDeviceDto,
  ) {
    return this.icuService.createInvasiveDevice(tenantId, user.sub, dto);
  }

  @Get('devices/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get active invasive devices for patient' })
  async getActiveDevices(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuService.getActiveDevices(tenantId, patientId);
  }

  @Patch('devices/bundle-checklist')
  @ApiOperation({ summary: 'Update device bundle checklist' })
  async updateDeviceBundleChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDeviceBundleChecklistDto,
  ) {
    return this.icuService.updateDeviceBundleChecklist(tenantId, user.sub, dto);
  }

  // ─── Prevention Bundles ─────────────────────────────────────────────────

  @Post('bundles')
  @ApiOperation({ summary: 'Record prevention bundle checklist' })
  @ApiResponse({ status: 201, description: 'Bundle checklist recorded' })
  async createBundleChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBundleChecklistDto,
  ) {
    return this.icuService.createBundleChecklist(tenantId, user.sub, dto);
  }

  @Get('bundles/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'bundleType', required: false, description: 'Bundle type filter' })
  @ApiOperation({ summary: 'Get bundle checklist history' })
  async getBundleHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('bundleType') bundleType?: string,
  ) {
    return this.icuService.getBundleHistory(tenantId, patientId, bundleType);
  }

  // ─── Prone Positioning ──────────────────────────────────────────────────

  @Post('prone')
  @ApiOperation({ summary: 'Start prone positioning session' })
  @ApiResponse({ status: 201, description: 'Prone session started' })
  async createProneSession(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProneSessionDto,
  ) {
    return this.icuService.createProneSession(tenantId, user.sub, dto);
  }

  @Patch('prone/:id/end')
  @ApiParam({ name: 'id', description: 'Prone session document UUID' })
  @ApiOperation({ summary: 'End prone positioning session' })
  async endProneSession(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('pfAfter') pfAfter: number,
  ) {
    return this.icuService.endProneSession(tenantId, user.sub, id, pfAfter);
  }

  // ─── Daily Goals ────────────────────────────────────────────────────────

  @Post('daily-goals')
  @ApiOperation({ summary: 'Create daily goals checklist' })
  @ApiResponse({ status: 201, description: 'Daily goals created' })
  async createDailyGoals(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDailyGoalsDto,
  ) {
    return this.icuService.createDailyGoals(tenantId, user.sub, dto);
  }

  // ─── ECMO ───────────────────────────────────────────────────────────────

  @Post('ecmo')
  @ApiOperation({ summary: 'Record ECMO parameters' })
  @ApiResponse({ status: 201, description: 'ECMO record created' })
  async createEcmoRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEcmoRecordDto,
  ) {
    return this.icuService.createEcmoRecord(tenantId, user.sub, dto);
  }

  // ─── Enteral Nutrition ──────────────────────────────────────────────────

  @Post('enteral-nutrition')
  @ApiOperation({ summary: 'Record enteral nutrition prescription' })
  @ApiResponse({ status: 201, description: 'Enteral nutrition recorded' })
  async createEnteralNutrition(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEnteralNutritionDto,
  ) {
    return this.icuService.createEnteralNutrition(tenantId, user.sub, dto);
  }

  // ─── Hypothermia ─────────────────────────────────────────────────────────

  @Post('hypothermia')
  @ApiOperation({ summary: 'Start therapeutic hypothermia session (TTM)' })
  @ApiResponse({ status: 201, description: 'Hypothermia session created' })
  async createHypothermiaSession(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateHypothermiaSessionDto,
  ) {
    return this.icuService.createHypothermiaSession(tenantId, user.sub, dto);
  }

  // ─── AI Endpoints ─────────────────────────────────────────────────────────

  @Post('ai/predict-sepsis/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'AI early warning sepsis prediction (4-6h ahead)' })
  @ApiResponse({ status: 201, description: 'Sepsis risk assessment' })
  async predictSepsis(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: PredictSepsisDto,
  ) {
    return this.icuService.predictSepsis(tenantId, patientId, dto);
  }

  @Post('ai/predict-extubation/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'AI extubation success/failure prediction' })
  @ApiResponse({ status: 201, description: 'Extubation prediction' })
  async predictExtubation(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: PredictExtubationDto,
  ) {
    return this.icuService.predictExtubation(tenantId, patientId, dto);
  }

  @Post('ai/vasopressor-titration/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'AI vasopressor titration suggestion based on MAP target' })
  @ApiResponse({ status: 201, description: 'Titration suggestion' })
  async suggestVasopressorTitration(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: SuggestVasopressorTitrationDto,
  ) {
    return this.icuService.suggestVasopressorTitration(tenantId, patientId, dto);
  }

  // ─── Flowsheet ──────────────────────────────────────────────────────────

  @Get('flowsheet/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'encounterId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiOperation({ summary: 'Get ICU flowsheet (single-screen view)' })
  @ApiResponse({ status: 200, description: 'ICU flowsheet data' })
  async getFlowsheet(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('encounterId') encounterId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.icuService.getFlowsheet(tenantId, patientId, encounterId, dateFrom, dateTo);
  }
}
