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
import { LisService } from './lis.service';
import {
  RegisterSampleDto,
  UpdateSampleStatusDto,
  QualityControlEntryDto,
  AutoReleaseDto,
  AnalyzerResultDto,
} from './dto/register-sample.dto';
import {
  CreateReflexRuleDto,
  RequestAddOnDto,
  RecordPocResultDto,
  InterpretLabPanelDto,
  PredictResultDto,
  DetectSampleSwapDto,
} from './dto/lis-advanced.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('LIS — Laboratory Information System')
@ApiBearerAuth('access-token')
@Controller('lis')
export class LisController {
  constructor(private readonly lisService: LisService) {}

  @Post('samples')
  @ApiOperation({ summary: 'Register a new sample with barcode' })
  @ApiResponse({ status: 201, description: 'Sample registered' })
  async registerSample(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterSampleDto,
  ) {
    return this.lisService.registerSample(tenantId, user.sub, dto);
  }

  @Patch('samples/:id/status')
  @ApiParam({ name: 'id', description: 'Sample UUID' })
  @ApiOperation({ summary: 'Update sample status (collected, received, processing, completed)' })
  @ApiResponse({ status: 200, description: 'Sample status updated' })
  async updateSampleStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSampleStatusDto,
  ) {
    return this.lisService.updateSampleStatus(tenantId, id, dto);
  }

  @Get('samples')
  @ApiOperation({ summary: 'List samples with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'barcode', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of samples' })
  async listSamples(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('barcode') barcode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.lisService.listSamples(tenantId, {
      status,
      patientId,
      barcode,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('qc')
  @ApiOperation({ summary: 'Quality control entry (Levey-Jennings)' })
  @ApiResponse({ status: 201, description: 'QC entry recorded' })
  async addQualityControl(
    @CurrentTenant() tenantId: string,
    @Body() dto: QualityControlEntryDto,
  ) {
    return this.lisService.addQualityControl(tenantId, dto);
  }

  @Get('qc/charts/:analyzerId')
  @ApiParam({ name: 'analyzerId', description: 'Analyzer ID' })
  @ApiQuery({ name: 'analyte', required: false })
  @ApiQuery({ name: 'days', required: false })
  @ApiOperation({ summary: 'Get QC Levey-Jennings charts for an analyzer' })
  @ApiResponse({ status: 200, description: 'QC chart data' })
  async getQcCharts(
    @Param('analyzerId') analyzerId: string,
    @Query('analyte') analyte?: string,
    @Query('days') days?: string,
  ) {
    return this.lisService.getQcCharts(analyzerId, analyte, days ? parseInt(days, 10) : undefined);
  }

  @Post('results/:id/auto-release')
  @ApiParam({ name: 'id', description: 'Exam result UUID' })
  @ApiOperation({ summary: 'Auto-release results by reference range rules' })
  @ApiResponse({ status: 200, description: 'Auto-release result' })
  async autoRelease(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutoReleaseDto,
  ) {
    return this.lisService.autoRelease(tenantId, id, dto);
  }

  @Post('delta-check/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'analyte', required: false, description: 'Filter by analyte name' })
  @ApiOperation({ summary: 'Delta check validation for patient results' })
  @ApiResponse({ status: 200, description: 'Delta check results' })
  async deltaCheck(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('analyte') analyte?: string,
  ) {
    return this.lisService.deltaCheck(tenantId, patientId, analyte);
  }

  @Get('worklist')
  @ApiOperation({ summary: 'Lab worklist — pending lab work' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: 200, description: 'Lab worklist' })
  async getWorklist(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('date') date?: string,
  ) {
    return this.lisService.getWorklist(tenantId, { status, priority, date });
  }

  @Post('analyzer-interface')
  @ApiOperation({ summary: 'Receive results from lab analyzer interface' })
  @ApiResponse({ status: 201, description: 'Analyzer results received' })
  async receiveAnalyzerResults(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnalyzerResultDto,
  ) {
    return this.lisService.receiveAnalyzerResults(tenantId, dto);
  }

  // ─── Reflex Testing ─────────────────────────────────────────────────────

  @Post('reflex-rules')
  @ApiOperation({ summary: 'Create a reflex testing rule (e.g. TSH abnormal → order T4L)' })
  @ApiResponse({ status: 201, description: 'Reflex rule created' })
  async createReflexRule(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateReflexRuleDto,
  ) {
    return this.lisService.createReflexRule(tenantId, dto);
  }

  @Get('reflex-rules')
  @ApiOperation({ summary: 'List reflex testing rules for tenant' })
  @ApiResponse({ status: 200, description: 'Reflex rules list' })
  async getReflexRules(@CurrentTenant() tenantId: string) {
    return this.lisService.getReflexRules(tenantId);
  }

  // ─── Add-on Testing ─────────────────────────────────────────────────────

  @Post('add-on')
  @ApiOperation({ summary: 'Request add-on test on existing sample' })
  @ApiResponse({ status: 201, description: 'Add-on test requested' })
  async requestAddOn(
    @CurrentTenant() tenantId: string,
    @Body() dto: RequestAddOnDto,
  ) {
    return this.lisService.requestAddOn(tenantId, dto);
  }

  // ─── POC Testing ────────────────────────────────────────────────────────

  @Post('poc-results')
  @ApiOperation({ summary: 'Record point-of-care result (glucometer, blood gas, etc.)' })
  @ApiResponse({ status: 201, description: 'POC result recorded' })
  async recordPocResult(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordPocResultDto,
  ) {
    return this.lisService.recordPocResult(tenantId, dto);
  }

  // ─── AI Endpoints ────────────────────────────────────────────────────────

  @Post('ai/interpret-panel')
  @ApiOperation({ summary: 'AI interpretation of a lab panel' })
  @ApiResponse({ status: 201, description: 'AI interpretation generated' })
  async interpretLabPanel(
    @CurrentTenant() tenantId: string,
    @Body() dto: InterpretLabPanelDto,
  ) {
    return this.lisService.interpretLabPanel(tenantId, dto);
  }

  @Post('ai/predict-result')
  @ApiOperation({ summary: 'AI prediction of whether a lab result will be abnormal' })
  @ApiResponse({ status: 201, description: 'Prediction generated' })
  async predictResult(
    @CurrentTenant() tenantId: string,
    @Body() dto: PredictResultDto,
  ) {
    return this.lisService.predictResult(tenantId, dto);
  }

  @Post('ai/detect-swap')
  @ApiOperation({ summary: 'AI detection of possible sample swap by result inconsistency' })
  @ApiResponse({ status: 201, description: 'Swap analysis complete' })
  async detectSampleSwap(
    @CurrentTenant() tenantId: string,
    @Body() dto: DetectSampleSwapDto,
  ) {
    return this.lisService.detectSampleSwap(tenantId, dto);
  }
}
