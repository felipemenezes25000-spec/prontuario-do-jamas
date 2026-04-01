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
import { EmergencyBoardService } from './emergency-board.service';
import {
  TrackingBoardQueryDto,
  DoorToMetricsDto,
  ReclassificationDto,
  FastTrackDto,
  TraumaProtocolDto,
  CardiacArrestProtocolDto,
  ChestPainProtocolDto,
  ObservationUnitDto,
  ObservationDispositionDto,
  HandoffDto,
  OvercrowdingDataDto,
  PatientBoardStatus,
} from './dto/emergency-board.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Emergency — Painel Avançado')
@ApiBearerAuth('access-token')
@Controller('emergency')
export class EmergencyBoardController {
  constructor(private readonly service: EmergencyBoardService) {}

  // ─── Tracking Board ─────────────────────────────────────────────────────────

  @Get('tracking-board')
  @ApiOperation({ summary: 'Painel de rastreamento em tempo real do PS — pacientes, tempos de espera, leitos' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filtrar por setor (PS-ADULTO, PS-PED)' })
  @ApiQuery({ name: 'status', required: false, enum: PatientBoardStatus })
  @ApiResponse({ status: 200, description: 'Estado atual do PS com todos os pacientes' })
  async getTrackingBoard(
    @CurrentTenant() tenantId: string,
    @Query('sector') sector?: string,
    @Query('status') status?: PatientBoardStatus,
  ) {
    const query: TrackingBoardQueryDto = { sector, status };
    return this.service.getTrackingBoard(tenantId, query);
  }

  // ─── Door-to-X Metrics ──────────────────────────────────────────────────────

  @Post('door-to-metrics')
  @ApiOperation({
    summary: 'Registrar tempos porta-médico, porta-agulha (AVC), porta-balão (STEMI), porta-antibiótico (sepse)',
  })
  @ApiResponse({ status: 201, description: 'Métricas de tempo registradas com cálculo automático e indicadores de qualidade' })
  async recordDoorToMetrics(
    @CurrentTenant() tenantId: string,
    @Body() dto: DoorToMetricsDto,
  ) {
    return this.service.recordDoorToMetrics(tenantId, dto);
  }

  @Get('door-to-metrics')
  @ApiOperation({ summary: 'Consultar métricas porta-X para análise de qualidade' })
  @ApiQuery({ name: 'patientId', required: false, description: 'Filtrar por paciente' })
  @ApiResponse({ status: 200, description: 'Métricas porta-X' })
  async getDoorToMetrics(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.getDoorToMetrics(tenantId, patientId);
  }

  // ─── Reclassification ───────────────────────────────────────────────────────

  @Post('reclassify')
  @ApiOperation({ summary: 'Reclassificar risco Manchester de paciente em espera' })
  @ApiResponse({ status: 201, description: 'Reclassificação registrada' })
  async reclassifyPatient(
    @CurrentTenant() tenantId: string,
    @Body() dto: ReclassificationDto,
  ) {
    return this.service.reclassifyPatient(tenantId, dto);
  }

  // ─── Fast Track ─────────────────────────────────────────────────────────────

  @Post('fast-track')
  @ApiOperation({ summary: 'Iniciar fast track para paciente de baixa complexidade' })
  @ApiResponse({ status: 201, description: 'Fast track iniciado' })
  async createFastTrack(
    @CurrentTenant() tenantId: string,
    @Body() dto: FastTrackDto,
  ) {
    return this.service.createFastTrack(tenantId, dto);
  }

  @Patch('fast-track/:id/close')
  @ApiParam({ name: 'id', description: 'UUID do fast track' })
  @ApiOperation({ summary: 'Encerrar fast track e calcular tempo de throughput' })
  @ApiResponse({ status: 200, description: 'Fast track encerrado com tempo calculado' })
  async closeFastTrack(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.closeFastTrack(tenantId, id, user.sub);
  }

  // ─── Trauma Protocol ────────────────────────────────────────────────────────

  @Post('trauma')
  @ApiOperation({ summary: 'Ativar protocolo de trauma (ATLS) — ABCDE + FAST + ISS + RTS + TRISS' })
  @ApiResponse({ status: 201, description: 'Código Trauma ativado com classificação automática de gravidade' })
  async activateTraumaProtocol(
    @CurrentTenant() tenantId: string,
    @Body() dto: TraumaProtocolDto,
  ) {
    return this.service.activateTraumaProtocol(tenantId, dto);
  }

  // ─── Cardiac Arrest / Code Blue ─────────────────────────────────────────────

  @Post('code-blue')
  @ApiOperation({
    summary: 'Registrar parada cardiorrespiratória — Código Azul (Utstein format)',
  })
  @ApiResponse({ status: 201, description: 'Código Azul registrado com dados Utstein' })
  async activateCodeBlue(
    @CurrentTenant() tenantId: string,
    @Body() dto: CardiacArrestProtocolDto,
  ) {
    return this.service.activateCodeBlue(tenantId, dto);
  }

  // ─── Chest Pain Protocol ────────────────────────────────────────────────────

  @Post('chest-pain')
  @ApiOperation({
    summary: 'Protocolo de dor torácica — ECG + troponina seriada + HEART Score + TIMI',
  })
  @ApiResponse({ status: 201, description: 'Protocolo de dor torácica registrado' })
  async createChestPainProtocol(
    @CurrentTenant() tenantId: string,
    @Body() dto: ChestPainProtocolDto,
  ) {
    return this.service.createChestPainProtocol(tenantId, dto);
  }

  // ─── Observation Unit ────────────────────────────────────────────────────────

  @Post('observation')
  @ApiOperation({ summary: 'Admitir paciente na sala de observação com timer e critérios de reavaliação' })
  @ApiResponse({ status: 201, description: 'Paciente admitido em observação' })
  async admitToObservation(
    @CurrentTenant() tenantId: string,
    @Body() dto: ObservationUnitDto,
  ) {
    return this.service.admitToObservation(tenantId, dto);
  }

  @Post('observation/disposition')
  @ApiOperation({ summary: 'Registrar decisão de disposição de paciente em observação' })
  @ApiResponse({ status: 200, description: 'Decisão registrada' })
  async recordObservationDisposition(
    @CurrentTenant() tenantId: string,
    @Body() dto: ObservationDispositionDto,
  ) {
    return this.service.recordObservationDisposition(tenantId, dto);
  }

  @Get('observation/overdue')
  @ApiOperation({ summary: 'Listar pacientes em observação com tempo de permanência excedido' })
  @ApiResponse({ status: 200, description: 'Pacientes com permanência acima do limite' })
  async getOverdueObservations(@CurrentTenant() tenantId: string) {
    return this.service.getOverdueObservations(tenantId);
  }

  // ─── Handoff (SBAR) ──────────────────────────────────────────────────────────

  @Post('handoff')
  @ApiOperation({ summary: 'Registrar passagem de plantão estruturada SBAR / I-PASS' })
  @ApiResponse({ status: 201, description: 'Passagem de plantão registrada' })
  async createHandoff(
    @CurrentTenant() tenantId: string,
    @Body() dto: HandoffDto,
  ) {
    return this.service.createHandoff(tenantId, dto);
  }

  @Get('handoff/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'UUID do paciente' })
  @ApiOperation({ summary: 'Histórico de passagens de plantão de um paciente' })
  @ApiResponse({ status: 200, description: 'Histórico de passagens de plantão' })
  async getHandoffsByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getHandoffsByPatient(tenantId, patientId);
  }

  // ─── Overcrowding Dashboard ──────────────────────────────────────────────────

  @Post('overcrowding')
  @ApiOperation({
    summary: 'Calcular índice de superlotação NEDOCS/EDWIN e nível de alerta do PS',
  })
  @ApiResponse({ status: 200, description: 'Relatório de superlotação com NEDOCS, EDWIN e nível de alerta' })
  async calculateOvercrowding(
    @CurrentTenant() tenantId: string,
    @Body() dto: OvercrowdingDataDto,
  ) {
    return this.service.calculateOvercrowding(tenantId, dto);
  }
}
