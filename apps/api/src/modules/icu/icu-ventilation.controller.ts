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
import { IcuVentilationService } from './icu-ventilation.service';
import {
  MechanicalVentilationDto,
  WeaningProtocolDto,
  DialysisCrrtDto,
} from './dto/icu-ventilation.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('ICU — Ventilation & Dialysis')
@ApiBearerAuth('access-token')
@Controller('icu')
export class IcuVentilationController {
  constructor(private readonly icuVentilationService: IcuVentilationService) {}

  // ─── Mechanical Ventilation ──────────────────────────────────────────────────

  @Post('ventilation')
  @ApiOperation({ summary: 'Registrar parâmetros de ventilação mecânica' })
  @ApiResponse({ status: 201, description: 'Registro de ventilação criado com classificação ARDS e alertas' })
  async createVentilationRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MechanicalVentilationDto,
  ) {
    return this.icuVentilationService.createVentilationRecord(tenantId, user.sub, dto);
  }

  @Get('ventilation/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 20)' })
  @ApiOperation({ summary: 'Listar registros de ventilação do paciente' })
  @ApiResponse({ status: 200, description: 'Lista de registros de ventilação' })
  async listVentilationRecords(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.icuVentilationService.listVentilationRecords(patientId, limit ? parseInt(limit, 10) : 20);
  }

  @Get('ventilation/:patientId/latest')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Obter último registro de ventilação do paciente' })
  @ApiResponse({ status: 200, description: 'Último registro de ventilação' })
  async getLatestVentilationRecord(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.icuVentilationService.getLatestVentilationRecord(patientId);
  }

  // ─── Weaning Trial ───────────────────────────────────────────────────────────

  @Post('weaning-trial')
  @ApiOperation({ summary: 'Registrar TER (Teste de Respiração Espontânea) e critérios de extubação' })
  @ApiResponse({ status: 201, description: 'TER registrado com recomendação clínica' })
  async recordWeaningTrial(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: WeaningProtocolDto,
  ) {
    return this.icuVentilationService.recordWeaningTrial(tenantId, user.sub, dto);
  }

  // ─── Dialysis / CRRT ─────────────────────────────────────────────────────────

  @Post('dialysis')
  @ApiOperation({ summary: 'Criar prescrição de diálise / TRRC' })
  @ApiResponse({ status: 201, description: 'Prescrição de diálise criada' })
  async createDialysisPrescription(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DialysisCrrtDto,
  ) {
    return this.icuVentilationService.createDialysisPrescription(tenantId, user.sub, dto);
  }

  @Get('dialysis/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records (default 20)' })
  @ApiOperation({ summary: 'Listar prescrições de diálise do paciente' })
  @ApiResponse({ status: 200, description: 'Lista de prescrições de diálise' })
  async listDialysisPrescriptions(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.icuVentilationService.listDialysisPrescriptions(patientId, limit ? parseInt(limit, 10) : 20);
  }
}
