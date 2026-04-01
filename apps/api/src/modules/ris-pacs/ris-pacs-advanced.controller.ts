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
import { RisPacsAdvancedService } from './ris-pacs-advanced.service';
import {
  DicomViewerDto,
  PrepProtocolRequestDto,
  CreateStructuredReportDto,
  RadiologistWorklistQueryDto,
  CreateIncidentalFollowUpDto,
  UpdateIncidentalFollowUpDto,
  ImageComparisonDto,
  ImagingModality,
  RadiologyPriority,
} from './dto/ris-pacs-enhanced.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('RIS/PACS — Avançado')
@ApiBearerAuth('access-token')
@Controller('ris-pacs')
export class RisPacsAdvancedController {
  constructor(private readonly service: RisPacsAdvancedService) {}

  // ─── DICOM Viewer ───────────────────────────────────────────────────────────

  @Post('viewer/session')
  @ApiOperation({ summary: 'Criar sessão de visualização DICOM (OHIF/Cornerstone)' })
  @ApiResponse({ status: 201, description: 'URL de visualização DICOM gerada com token temporário' })
  async createViewerSession(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DicomViewerDto,
  ) {
    return this.service.createViewerSession(tenantId, user.sub, dto);
  }

  @Get('viewer/session/:sessionId')
  @ApiParam({ name: 'sessionId', description: 'UUID da sessão de visualização' })
  @ApiOperation({ summary: 'Recuperar sessão de visualização DICOM ativa' })
  @ApiResponse({ status: 200, description: 'Dados da sessão de visualização' })
  async getViewerSession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.service.getViewerSession(tenantId, sessionId);
  }

  // ─── Exam Prep Protocols ────────────────────────────────────────────────────

  @Get('prep-protocols/exam-types')
  @ApiOperation({ summary: 'Listar tipos de exame com protocolo de preparo configurado' })
  @ApiResponse({ status: 200, description: 'Tipos de exame disponíveis' })
  listExamTypes() {
    return this.service.listAvailableExamTypes();
  }

  @Post('prep-protocols')
  @ApiOperation({ summary: 'Obter protocolo de preparo para tipo de exame (jejum, contraste, medicações)' })
  @ApiResponse({ status: 200, description: 'Protocolo de preparo detalhado' })
  getExamPrepProtocol(@Body() dto: PrepProtocolRequestDto) {
    return this.service.getExamPrepProtocol(dto);
  }

  // ─── Structured Radiology Reports ──────────────────────────────────────────

  @Post('structured-reports')
  @ApiOperation({
    summary: 'Criar laudo estruturado com template (BI-RADS, Lung-RADS, TI-RADS, PI-RADS)',
  })
  @ApiResponse({ status: 201, description: 'Laudo estruturado criado' })
  async createStructuredReport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStructuredReportDto,
  ) {
    return this.service.createStructuredReport(tenantId, user.sub, dto);
  }

  @Get('structured-reports/order/:orderId')
  @ApiParam({ name: 'orderId', description: 'UUID do pedido de imagem' })
  @ApiOperation({ summary: 'Listar laudos estruturados de um pedido' })
  @ApiResponse({ status: 200, description: 'Laudos do pedido' })
  async getStructuredReportsByOrder(
    @CurrentTenant() tenantId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.service.getStructuredReportsByOrder(tenantId, orderId);
  }

  // ─── Radiologist Worklist ───────────────────────────────────────────────────

  @Get('radiologist-worklist')
  @ApiOperation({ summary: 'Lista de trabalho do radiologista — exames pendentes com prioridade' })
  @ApiQuery({ name: 'modality', required: false, enum: ImagingModality })
  @ApiQuery({ name: 'priority', required: false, enum: RadiologyPriority })
  @ApiQuery({ name: 'requestingDoctorId', required: false })
  @ApiQuery({ name: 'radiologistId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de trabalho do radiologista' })
  async getRadiologistWorklist(
    @CurrentTenant() tenantId: string,
    @Query('modality') modality?: ImagingModality,
    @Query('priority') priority?: RadiologyPriority,
    @Query('requestingDoctorId') requestingDoctorId?: string,
    @Query('radiologistId') radiologistId?: string,
  ) {
    const query: RadiologistWorklistQueryDto = {
      modality,
      priority,
      requestingDoctorId,
      radiologistId,
    };
    return this.service.getRadiologistWorklist(tenantId, query);
  }

  // ─── Incidental Finding Follow-up ──────────────────────────────────────────

  @Post('incidental-followups')
  @ApiOperation({ summary: 'Criar rastreamento de achado incidental para seguimento' })
  @ApiResponse({ status: 201, description: 'Achado incidental registrado' })
  async createIncidentalFollowUp(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateIncidentalFollowUpDto,
  ) {
    return this.service.createIncidentalFollowUp(tenantId, dto);
  }

  @Patch('incidental-followups/:id')
  @ApiParam({ name: 'id', description: 'UUID do achado incidental' })
  @ApiOperation({ summary: 'Atualizar status de achado incidental' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  async updateIncidentalFollowUp(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentalFollowUpDto,
  ) {
    return this.service.updateIncidentalFollowUp(tenantId, id, dto);
  }

  @Get('incidental-followups/pending')
  @ApiOperation({ summary: 'Listar achados incidentais pendentes de seguimento' })
  @ApiResponse({ status: 200, description: 'Achados pendentes' })
  async getPendingFollowUps(@CurrentTenant() tenantId: string) {
    return this.service.getPendingFollowUps(tenantId);
  }

  @Get('incidental-followups/overdue')
  @ApiOperation({ summary: 'Listar achados incidentais com seguimento atrasado' })
  @ApiResponse({ status: 200, description: 'Achados com seguimento vencido' })
  async getOverdueFollowUps(@CurrentTenant() tenantId: string) {
    return this.service.getOverdueFollowUps(tenantId);
  }

  // ─── Image Comparison ───────────────────────────────────────────────────────

  @Post('image-comparison')
  @ApiOperation({ summary: 'Criar comparação de imagem atual com estudo anterior (side-by-side)' })
  @ApiResponse({ status: 201, description: 'Comparação criada com URL de visualização' })
  async createImageComparison(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ImageComparisonDto,
  ) {
    return this.service.createImageComparison(tenantId, user.sub, dto);
  }

  @Get('image-comparison/study/:studyId')
  @ApiParam({ name: 'studyId', description: 'UUID do estudo' })
  @ApiOperation({ summary: 'Listar comparações de imagem de um estudo' })
  @ApiResponse({ status: 200, description: 'Comparações do estudo' })
  async getImageComparisonsByStudy(
    @CurrentTenant() tenantId: string,
    @Param('studyId', ParseUUIDPipe) studyId: string,
  ) {
    return this.service.getImageComparisonsByStudy(tenantId, studyId);
  }
}
