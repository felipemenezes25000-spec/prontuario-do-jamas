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
  InvasiveDeviceTypeEnum,
  DEVICE_DAYS_THRESHOLDS,
} from './dto/icu.dto';
import {
  CreateHypothermiaSessionDto,
  PredictSepsisDto,
  PredictExtubationDto,
  SuggestVasopressorTitrationDto,
} from './dto/icu-advanced.dto';
import {
  CreateRassAssessmentDto,
  CreateCamIcuDto,
  RecordBisDto,
} from './dto/icu-assessments.dto';
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

  // ─── Weaning Assessment ──────────────────────────────────────────────────

  @Get('weaning-assessment/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'encounterId', required: false, description: 'Encounter UUID (optional)' })
  @ApiOperation({ summary: 'Assess readiness for ventilator weaning (SBT criteria, RSBI)' })
  @ApiResponse({ status: 200, description: 'Weaning readiness assessment' })
  async assessWeaningReadiness(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('encounterId') encounterId?: string,
  ) {
    return this.icuService.assessWeaningReadiness(tenantId, patientId, encounterId);
  }

  // ─── Encounter-based score endpoint ────────────────────────────────────

  @Post('scores/:encounterId/calculate')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Calculate and save ICU severity score by encounter (alternative route)' })
  @ApiResponse({ status: 201, description: 'Score calculated and saved' })
  async calculateScoreByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { scoreType: string; data: Record<string, unknown> },
  ) {
    // Route to appropriate calculator based on scoreType
    const data = body.data as unknown;
    switch (body.scoreType) {
      case 'APACHE_II':
        return this.icuService.calculateApacheII(tenantId, user.sub, {
          encounterId,
          ...(data as CalculateApacheIIDto),
        } as unknown as CalculateApacheIIDto);
      case 'SOFA':
        return this.icuService.calculateSofa(tenantId, user.sub, {
          encounterId,
          ...(data as CalculateSofaDto),
        } as unknown as CalculateSofaDto);
      case 'SAPS_3':
        return this.icuService.calculateSaps3(tenantId, user.sub, {
          encounterId,
          ...(data as CalculateSaps3Dto),
        } as unknown as CalculateSaps3Dto);
      case 'TISS_28':
        return this.icuService.calculateTiss28(tenantId, user.sub, {
          encounterId,
          ...(data as CalculateTiss28Dto),
        } as unknown as CalculateTiss28Dto);
      default:
        return { error: `Unknown score type: ${body.scoreType}` };
    }
  }

  @Get('scores/:encounterId/history')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiQuery({ name: 'scoreType', required: false, description: 'Score type filter' })
  @ApiOperation({ summary: 'Get score history for an encounter' })
  async getScoresByEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Query('scoreType') scoreType?: string,
  ) {
    // Use existing score history but filter by encounter
    const titleFilter = scoreType ? `[ICU:${scoreType}]` : '[ICU:';
    const docs = await this.icuService['prisma'].clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: titleFilter },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));
  }

  // ─── Encounter-based Vasoactive Dose ───────────────────────────────────

  @Post('vasoactive/:encounterId/calculate')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Calculate vasoactive drug dose by encounter' })
  @ApiResponse({ status: 200, description: 'Vasoactive dose calculation result' })
  async calculateVasoactiveDoseByEncounter(
    @Param('encounterId', ParseUUIDPipe) _encounterId: string,
    @Body() dto: VasoactiveDrugCalculatorDto,
  ) {
    return this.icuService.calculateVasoactiveDrug(dto);
  }

  // ─── Encounter-based Sedation ──────────────────────────────────────────

  @Post('sedation/:encounterId/record')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Record sedation assessment by encounter' })
  @ApiResponse({ status: 201, description: 'Sedation assessment recorded' })
  async recordSedationByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSedationAssessmentDto,
  ) {
    return this.icuService.createSedationAssessment(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  // ─── Encounter-based Ventilation ───────────────────────────────────────

  @Post('ventilation/:encounterId/record')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Record ventilator parameters by encounter' })
  @ApiResponse({ status: 201, description: 'Ventilation record created with calculated values and alerts' })
  async recordVentilationByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVentilationRecordDto,
  ) {
    return this.icuService.createVentilationRecord(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  // ─── Encounter-based Devices ───────────────────────────────────────────

  @Post('devices/:encounterId/register')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Register invasive device by encounter' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  async registerDeviceByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvasiveDeviceDto,
  ) {
    return this.icuService.createInvasiveDevice(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  @Get('devices/:encounterId/active')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get active devices for an encounter with days in situ' })
  async getActiveDevicesByEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    const docs = await this.icuService['prisma'].clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[ICU:DEVICE]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => {
      const content = JSON.parse(doc.content as string) as Record<string, unknown>;
      const insertedAt = new Date(content.insertedAt as string);
      const daysInserted = Math.floor((Date.now() - insertedAt.getTime()) / (1000 * 60 * 60 * 24));
      const threshold = DEVICE_DAYS_THRESHOLDS[content.deviceType as InvasiveDeviceTypeEnum];
      return {
        id: doc.id,
        ...content,
        daysInserted,
        alertThresholdExceeded: threshold !== undefined && daysInserted > threshold,
        createdAt: doc.createdAt,
      };
    }).filter((d) => !(d as Record<string, unknown>).removed);
  }

  // ─── Encounter-based Daily Goals ───────────────────────────────────────

  @Post('daily-goals/:encounterId/set')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Set daily goals by encounter' })
  @ApiResponse({ status: 201, description: 'Daily goals set' })
  async setDailyGoalsByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDailyGoalsDto,
  ) {
    return this.icuService.createDailyGoals(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  // ─── Encounter-based Flowsheet ─────────────────────────────────────────

  @Get('flowsheet/encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiOperation({ summary: 'Get ICU flowsheet for an encounter' })
  @ApiResponse({ status: 200, description: 'ICU flowsheet data' })
  async getFlowsheetByEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    // Get patientId from encounter's clinical documents
    const anyDoc = await this.icuService['prisma'].clinicalDocument.findFirst({
      where: { tenantId, encounterId },
      select: { patientId: true },
    });
    if (!anyDoc) {
      return { error: 'No data found for this encounter' };
    }
    return this.icuService.getFlowsheet(tenantId, anyDoc.patientId, encounterId, dateFrom, dateTo);
  }

  // ─── Encounter-based Dialysis ──────────────────────────────────────────

  @Post('dialysis/:encounterId/record')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Record dialysis/CRRT session by encounter' })
  @ApiResponse({ status: 201, description: 'Dialysis session recorded' })
  async recordDialysisByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDialysisPrescriptionDto,
  ) {
    return this.icuService.createDialysisPrescription(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  // ─── Encounter-based Nutrition ─────────────────────────────────────────

  @Post('nutrition/:encounterId/record')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Record enteral nutrition by encounter' })
  @ApiResponse({ status: 201, description: 'Nutrition recorded' })
  async recordNutritionByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEnteralNutritionDto,
  ) {
    return this.icuService.createEnteralNutrition(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  // ─── Encounter-based Pronation ─────────────────────────────────────────

  @Post('pronation/:encounterId/record')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Record pronation session by encounter' })
  @ApiResponse({ status: 201, description: 'Pronation session recorded' })
  async recordPronationByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProneSessionDto,
  ) {
    return this.icuService.createProneSession(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
  }

  // ─── Encounter-based Bundles ───────────────────────────────────────────

  @Post('bundles/:encounterId/record')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Record bundle compliance by encounter' })
  @ApiResponse({ status: 201, description: 'Bundle compliance recorded' })
  async recordBundleByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBundleChecklistDto,
  ) {
    return this.icuService.createBundleChecklist(tenantId, user.sub, {
      ...dto,
      encounterId,
    });
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

  // ─── RASS Assessment ───────────────────────────────────────────────────

  @Post('rass')
  @ApiOperation({ summary: 'Record RASS (Richmond Agitation-Sedation Scale) assessment' })
  @ApiResponse({ status: 201, description: 'RASS assessment recorded' })
  async recordRass(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRassAssessmentDto,
  ) {
    return this.icuService.recordRass(tenantId, user.sub, dto);
  }

  @Get('rass/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get RASS assessment history with trend for patient' })
  async getRassHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuService.getRassHistory(tenantId, patientId);
  }

  @Get('rass/:patientId/latest')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get latest RASS score with interpretation' })
  async getLatestRass(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuService.getLatestRass(tenantId, patientId);
  }

  // ─── CAM-ICU Assessment ──────────────────────────────────────────────────

  @Post('cam-icu')
  @ApiOperation({ summary: 'Record CAM-ICU (Confusion Assessment Method) assessment' })
  @ApiResponse({ status: 201, description: 'CAM-ICU assessment recorded' })
  async recordCamIcu(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCamIcuDto,
  ) {
    return this.icuService.recordCamIcu(tenantId, user.sub, dto);
  }

  @Get('cam-icu/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get CAM-ICU assessment history with delirium trend' })
  async getCamIcuHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuService.getCamIcuHistory(tenantId, patientId);
  }

  @Get('cam-icu/:patientId/status')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get current delirium status for patient' })
  async getDeliriumStatus(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuService.getDeliriumStatus(tenantId, patientId);
  }

  // ─── BIS Monitoring ──────────────────────────────────────────────────────

  @Post('bis')
  @ApiOperation({ summary: 'Record BIS (Bispectral Index) value' })
  @ApiResponse({ status: 201, description: 'BIS value recorded' })
  async recordBis(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordBisDto,
  ) {
    return this.icuService.recordBis(tenantId, user.sub, dto);
  }

  @Get('bis/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get BIS monitoring history with trend' })
  async getBisHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuService.getBisHistory(tenantId, patientId);
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
