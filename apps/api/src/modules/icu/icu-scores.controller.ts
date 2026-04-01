import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IcuScoresService } from './icu-scores.service';
import {
  ApacheIIDto,
  Saps3Dto,
  SofaScoreDto,
  Tiss28Dto,
  VasoactiveDrugDto,
  SedationProtocolDto,
} from './dto/icu-scores.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('ICU — Scores & Sedation')
@ApiBearerAuth('access-token')
@Controller('icu')
export class IcuScoresController {
  constructor(private readonly icuScoresService: IcuScoresService) {}

  // ─── Prognostic Scores ───────────────────────────────────────────────────────

  @Post('scores/apache-ii')
  @ApiOperation({ summary: 'Calcular APACHE II com mortalidade estimada' })
  @ApiResponse({ status: 201, description: 'APACHE II calculado' })
  async calculateApacheII(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApacheIIDto,
  ) {
    return this.icuScoresService.calculateApacheII(tenantId, user.sub, dto);
  }

  @Post('scores/saps3')
  @ApiOperation({ summary: 'Calcular SAPS 3 com mortalidade estimada' })
  @ApiResponse({ status: 201, description: 'SAPS 3 calculado' })
  async calculateSaps3(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Saps3Dto,
  ) {
    return this.icuScoresService.calculateSaps3(tenantId, user.sub, dto);
  }

  @Post('scores/sofa')
  @ApiOperation({ summary: 'Calcular SOFA (critério Sepsis-3)' })
  @ApiResponse({ status: 201, description: 'SOFA calculado' })
  async calculateSofa(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SofaScoreDto,
  ) {
    return this.icuScoresService.calculateSofa(tenantId, user.sub, dto);
  }

  @Post('scores/tiss28')
  @ApiOperation({ summary: 'Calcular TISS-28 (carga de trabalho de enfermagem)' })
  @ApiResponse({ status: 201, description: 'TISS-28 calculado' })
  async calculateTiss28(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Tiss28Dto,
  ) {
    return this.icuScoresService.calculateTiss28(tenantId, user.sub, dto);
  }

  // ─── Vasoactive Drug Calculator ──────────────────────────────────────────────

  @Post('vasoactive-drugs/calculate')
  @ApiOperation({ summary: 'Calcular dose / velocidade de bomba de drogas vasoativas' })
  @ApiResponse({ status: 200, description: 'Cálculo vasoativa realizado' })
  calculateVasoactiveDrug(@Body() dto: VasoactiveDrugDto) {
    return this.icuScoresService.calculateVasoactiveDrug(dto);
  }

  // ─── Sedation Protocol ───────────────────────────────────────────────────────

  @Post('sedation-protocol')
  @ApiOperation({ summary: 'Registrar protocolo de sedação/analgesia com meta RASS e SAT' })
  @ApiResponse({ status: 201, description: 'Protocolo de sedação registrado' })
  async recordSedationProtocol(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SedationProtocolDto,
  ) {
    return this.icuScoresService.recordSedationProtocol(tenantId, user.sub, dto);
  }
}
