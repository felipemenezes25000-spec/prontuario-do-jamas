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
import { LisSampleTrackingService } from './lis-sample-tracking.service';
import {
  SampleCollectionDto,
  PhlebotomyWorklistQueryDto,
  PanicValueAcknowledgeDto,
  UpsertReferenceRangeDto,
  DeltaCheckQueryDto,
  ReflexTestingEvaluateDto,
  AutoVerificationDto,
  AddOnTestDto,
  GasometryDto,
  MicrobiologyDto,
  PocTestingDto,
} from './dto/lis-sample-tracking.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('LIS — Rastreamento de Amostras')
@ApiBearerAuth('access-token')
@Controller('lis')
export class LisSampleTrackingController {
  constructor(private readonly service: LisSampleTrackingService) {}

  // ─── Sample Collection ──────────────────────────────────────────────────────

  @Post('samples/collect')
  @ApiOperation({ summary: 'Registrar coleta de amostra com rastreamento por código de barras' })
  @ApiResponse({ status: 201, description: 'Amostra coletada e rastreada' })
  async collectSample(
    @CurrentTenant() tenantId: string,
    @Body() dto: SampleCollectionDto,
  ) {
    return this.service.collectSample(tenantId, dto);
  }

  @Get('samples/barcode/:barcode')
  @ApiParam({ name: 'barcode', description: 'Código de barras do tubo' })
  @ApiOperation({ summary: 'Buscar amostra por código de barras' })
  @ApiResponse({ status: 200, description: 'Dados da amostra' })
  async getSampleByBarcode(
    @CurrentTenant() tenantId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.service.getSampleByBarcode(tenantId, barcode);
  }

  // ─── Phlebotomy Worklist ────────────────────────────────────────────────────

  @Get('phlebotomy/worklist')
  @ApiOperation({ summary: 'Lista de trabalho da flebotomia por unidade/andar' })
  @ApiQuery({ name: 'unit', required: true, description: 'Unidade hospitalar (ex: UTI-A)' })
  @ApiQuery({ name: 'floor', required: false, description: 'Andar' })
  @ApiQuery({ name: 'fastingOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de coletas pendentes' })
  async getPhlebotomyWorklist(
    @CurrentTenant() tenantId: string,
    @Query('unit') unit: string,
    @Query('floor') floor?: string,
    @Query('fastingOnly') fastingOnly?: boolean,
  ) {
    const query: PhlebotomyWorklistQueryDto = { unit, floor, fastingOnly };
    return this.service.getPhlebotomyWorklist(tenantId, query);
  }

  // ─── Panic / Critical Values ────────────────────────────────────────────────

  @Get('panic-alerts')
  @ApiOperation({ summary: 'Listar alertas de valores críticos/pânico pendentes' })
  @ApiResponse({ status: 200, description: 'Alertas pendentes' })
  async getPendingPanicAlerts(@CurrentTenant() tenantId: string) {
    return this.service.getPendingPanicAlerts(tenantId);
  }

  @Post('panic-alerts/acknowledge')
  @ApiOperation({
    summary: 'Confirmar recebimento de valor crítico com read-back obrigatório',
  })
  @ApiResponse({ status: 200, description: 'Alerta reconhecido com confirmação de read-back' })
  async acknowledgePanicAlert(
    @CurrentTenant() tenantId: string,
    @Body() dto: PanicValueAcknowledgeDto,
  ) {
    return this.service.acknowledgePanicAlert(tenantId, dto);
  }

  // ─── Reference Ranges ───────────────────────────────────────────────────────

  @Post('reference-ranges')
  @ApiOperation({ summary: 'Criar ou atualizar faixa de referência por analito/grupo etário/sexo' })
  @ApiResponse({ status: 201, description: 'Faixa de referência salva' })
  async upsertReferenceRange(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpsertReferenceRangeDto,
  ) {
    return this.service.upsertReferenceRange(tenantId, dto);
  }

  @Get('reference-ranges')
  @ApiOperation({ summary: 'Listar faixas de referência configuradas' })
  @ApiQuery({ name: 'testCode', required: false, description: 'Filtrar por código do teste' })
  @ApiResponse({ status: 200, description: 'Faixas de referência' })
  async getReferenceRanges(
    @CurrentTenant() tenantId: string,
    @Query('testCode') testCode?: string,
  ) {
    return this.service.getReferenceRanges(tenantId, testCode);
  }

  // ─── Delta Check ────────────────────────────────────────────────────────────

  @Post('delta-check')
  @ApiOperation({
    summary: 'Verificação delta — detectar troca de amostra ou deterioração aguda',
  })
  @ApiResponse({ status: 200, description: 'Resultado da verificação delta' })
  async performDeltaCheck(
    @CurrentTenant() tenantId: string,
    @Body() dto: DeltaCheckQueryDto,
  ) {
    return this.service.performDeltaCheck(tenantId, dto);
  }

  // ─── Reflex Testing ─────────────────────────────────────────────────────────

  @Post('reflex-testing/evaluate')
  @ApiOperation({
    summary: 'Avaliar regras de reflexo — ex: TSH alterado → T4 livre automático',
  })
  @ApiResponse({ status: 200, description: 'Regras de reflexo avaliadas' })
  async evaluateReflexRules(
    @CurrentTenant() tenantId: string,
    @Body() dto: ReflexTestingEvaluateDto,
  ) {
    return this.service.evaluateReflexRules(tenantId, dto);
  }

  // ─── Auto-Verification ──────────────────────────────────────────────────────

  @Post('auto-verification')
  @ApiOperation({
    summary: 'Liberação automática de resultados normais sem revisão manual',
  })
  @ApiResponse({ status: 200, description: 'Status de verificação automática' })
  async autoVerify(
    @CurrentTenant() tenantId: string,
    @Body() dto: AutoVerificationDto,
  ) {
    return this.service.autoVerify(tenantId, dto);
  }

  // ─── Add-on Testing ─────────────────────────────────────────────────────────

  @Post('add-on-tests')
  @ApiOperation({ summary: 'Solicitar testes adicionais em amostra existente (add-on)' })
  @ApiResponse({ status: 201, description: 'Testes adicionais solicitados' })
  async requestAddOnTests(
    @CurrentTenant() tenantId: string,
    @Body() dto: AddOnTestDto,
  ) {
    return this.service.requestAddOnTests(tenantId, dto);
  }

  // ─── Blood Gas / Gasometria ──────────────────────────────────────────────────

  @Post('gasometry')
  @ApiOperation({ summary: 'Registrar gasometria arterial com interpretação automática' })
  @ApiResponse({ status: 201, description: 'Gasometria registrada com interpretação' })
  async recordBloodGas(
    @CurrentTenant() tenantId: string,
    @Body() dto: GasometryDto,
  ) {
    return this.service.recordBloodGas(tenantId, dto);
  }

  @Get('gasometry/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'UUID do paciente' })
  @ApiOperation({ summary: 'Histórico de gasometrias do paciente' })
  @ApiResponse({ status: 200, description: 'Histórico de gasometrias' })
  async getBloodGasHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getBloodGasHistory(tenantId, patientId);
  }

  // ─── Microbiology ────────────────────────────────────────────────────────────

  @Post('microbiology')
  @ApiOperation({ summary: 'Registrar cultura microbiológica + antibiograma' })
  @ApiResponse({ status: 201, description: 'Resultado de microbiologia registrado' })
  async recordMicrobiology(
    @CurrentTenant() tenantId: string,
    @Body() dto: MicrobiologyDto,
  ) {
    return this.service.recordMicrobiology(tenantId, dto);
  }

  @Get('microbiology/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'UUID do paciente' })
  @ApiOperation({ summary: 'Histórico microbiológico do paciente' })
  @ApiResponse({ status: 200, description: 'Resultados microbiológicos' })
  async getMicrobiologyByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getMicrobiologyByPatient(tenantId, patientId);
  }

  // ─── Point-of-Care Testing ───────────────────────────────────────────────────

  @Post('poc-testing')
  @ApiOperation({ summary: 'Registrar resultado de teste point-of-care (POC) com controle de qualidade' })
  @ApiResponse({ status: 201, description: 'Resultado POC registrado' })
  async recordPocTest(
    @CurrentTenant() tenantId: string,
    @Body() dto: PocTestingDto,
  ) {
    return this.service.recordPocTest(tenantId, dto);
  }

  @Get('poc-testing/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'UUID do paciente' })
  @ApiOperation({ summary: 'Histórico de testes POC do paciente' })
  @ApiResponse({ status: 200, description: 'Resultados POC' })
  async getPocResultsByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getPocResultsByPatient(tenantId, patientId);
  }
}
