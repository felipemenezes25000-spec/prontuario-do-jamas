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
import { IcuManagementService } from './icu-management.service';
import {
  InvasiveDeviceDto,
  PreventionBundleDto,
  PreventionBundleType,
  PronationSessionDto,
  DailyGoalsDto,
  IcuFlowsheetDto,
  EnteralNutritionDto,
} from './dto/icu-management.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('ICU — Management')
@ApiBearerAuth('access-token')
@Controller('icu')
export class IcuManagementController {
  constructor(private readonly icuManagementService: IcuManagementService) {}

  // ─── Invasive Devices ────────────────────────────────────────────────────────

  @Post('devices')
  @ApiOperation({ summary: 'Registrar dispositivo invasivo (CVC, TOT, SVD, drenos, etc.)' })
  @ApiResponse({ status: 201, description: 'Dispositivo registrado com contagem de dias e alerta de risco' })
  async createDevice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InvasiveDeviceDto,
  ) {
    return this.icuManagementService.createInvasiveDevice(tenantId, user.sub, dto);
  }

  @Get('devices/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Listar dispositivos invasivos ativos do paciente com dias de permanência' })
  @ApiResponse({ status: 200, description: 'Lista de dispositivos com alertas de tempo' })
  async listDevices(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.icuManagementService.listInvasiveDevices(patientId);
  }

  // ─── Prevention Bundles ──────────────────────────────────────────────────────

  @Post('bundles')
  @ApiOperation({ summary: 'Registrar checklist de bundle de prevenção (CVC, VAP, CAUTI)' })
  @ApiResponse({ status: 201, description: 'Bundle registrado com taxa de conformidade' })
  async recordBundle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreventionBundleDto,
  ) {
    return this.icuManagementService.recordPreventionBundle(tenantId, user.sub, dto);
  }

  @Get('bundles/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'type', enum: PreventionBundleType, required: false, description: 'Filter by bundle type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 30)' })
  @ApiOperation({ summary: 'Histórico de bundles de prevenção do paciente' })
  @ApiResponse({ status: 200, description: 'Histórico de conformidade de bundles' })
  async getBundleHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('type') type?: PreventionBundleType,
    @Query('limit') limit?: string,
  ) {
    return this.icuManagementService.getBundleHistory(patientId, type, limit ? parseInt(limit, 10) : 30);
  }

  // ─── Pronation Sessions ──────────────────────────────────────────────────────

  @Post('pronation')
  @ApiOperation({ summary: 'Registrar sessão de pronação (posição prona)' })
  @ApiResponse({ status: 201, description: 'Sessão de pronação registrada com análise de resposta' })
  async createPronation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PronationSessionDto,
  ) {
    return this.icuManagementService.createPronationSession(tenantId, user.sub, dto);
  }

  @Get('pronation/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 20)' })
  @ApiOperation({ summary: 'Listar sessões de pronação do paciente' })
  @ApiResponse({ status: 200, description: 'Lista de sessões de pronação' })
  async listPronation(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.icuManagementService.listPronationSessions(patientId, limit ? parseInt(limit, 10) : 20);
  }

  // ─── Daily Goals ─────────────────────────────────────────────────────────────

  @Post('daily-goals')
  @ApiOperation({ summary: 'Registrar metas diárias da UTI (checklist de rondas)' })
  @ApiResponse({ status: 201, description: 'Metas diárias registradas' })
  async createDailyGoals(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DailyGoalsDto,
  ) {
    return this.icuManagementService.createDailyGoals(tenantId, user.sub, dto);
  }

  @Get('daily-goals/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by specific date (YYYY-MM-DD)' })
  @ApiOperation({ summary: 'Obter metas diárias do paciente (últimos 7 dias ou por data)' })
  @ApiResponse({ status: 200, description: 'Metas diárias' })
  async getDailyGoals(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('date') date?: string,
  ) {
    return this.icuManagementService.getDailyGoals(patientId, date);
  }

  // ─── ICU Flowsheet ────────────────────────────────────────────────────────────

  @Post('flowsheet')
  @ApiOperation({ summary: 'Registrar entrada da folha de fluxo UTI (visão 360°)' })
  @ApiResponse({ status: 201, description: 'Entrada de flowsheet criada' })
  async createFlowsheetEntry(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: IcuFlowsheetDto,
  ) {
    return this.icuManagementService.createFlowsheetEntry(tenantId, user.sub, dto);
  }

  @Get('flowsheet/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max entries (default 48 = últimas 24h em 30min)' })
  @ApiOperation({ summary: 'Obter folha de fluxo UTI do paciente' })
  @ApiResponse({ status: 200, description: 'Entradas do flowsheet em ordem cronológica inversa' })
  async getFlowsheetEntries(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.icuManagementService.getFlowsheetEntries(patientId, limit ? parseInt(limit, 10) : 48);
  }

  // ─── Enteral Nutrition ────────────────────────────────────────────────────────

  @Post('enteral-nutrition')
  @ApiOperation({ summary: 'Registrar prescrição de nutrição enteral' })
  @ApiResponse({ status: 201, description: 'Nutrição enteral registrada com cálculo de atingimento de meta' })
  async createEnteralNutrition(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EnteralNutritionDto,
  ) {
    return this.icuManagementService.createEnteralNutrition(tenantId, user.sub, dto);
  }

  @Get('enteral-nutrition/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 10)' })
  @ApiOperation({ summary: 'Listar histórico de nutrição enteral do paciente' })
  @ApiResponse({ status: 200, description: 'Histórico de nutrição enteral' })
  async listEnteralNutrition(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.icuManagementService.listEnteralNutrition(patientId, limit ? parseInt(limit, 10) : 10);
  }
}
