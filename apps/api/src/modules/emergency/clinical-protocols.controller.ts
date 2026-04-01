import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClinicalProtocolsService } from './clinical-protocols.service';
import {
  // Sepsis
  CalculateQSofaDto,
  CalculateSepsisSOFADto,
  TrackSepsisBundleDto,
  // Stroke
  CalculateNIHSSDto,
  CincinnatiScaleDto,
  StrokeTimelineDto,
  ThrombolysisCheckDto,
  // Chest Pain
  CalculateHEARTScoreDto,
  CalculateTIMIDto,
  CalculateKillipDto,
  // NEWS2
  CalculateNEWS2Dto,
  // ICU Scores
  CalculateGlasgowDto,
  CalculateRASSDto,
  CalculateCAMICUDto,
  CalculateBradenDto,
  // Nursing
  CalculateMorseFallDto,
  CalculateWaterlowDto,
} from './dto/clinical-protocols.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Clinical Protocols — Protocolos Clínicos')
@ApiBearerAuth('access-token')
@Controller('clinical-protocols')
export class ClinicalProtocolsController {
  constructor(private readonly protocolsService: ClinicalProtocolsService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SEPSIS PROTOCOL
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('sepsis/qsofa')
  @ApiOperation({ summary: 'Calcular qSOFA (Quick SOFA) — triagem de sepse à beira-leito' })
  @ApiResponse({ status: 201, description: 'qSOFA calculado' })
  calculateQSOFA(@Body() dto: CalculateQSofaDto) {
    return this.protocolsService.calculateQSOFA(dto);
  }

  @Post('sepsis/sofa')
  @ApiOperation({ summary: 'Calcular SOFA completo (Sepsis-3) — 6 sistemas orgânicos' })
  @ApiResponse({ status: 201, description: 'SOFA calculado com classificação de sepse/choque séptico' })
  async calculateSepsisSOFA(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateSepsisSOFADto,
  ) {
    const result = this.protocolsService.calculateSepsisSOFA(dto);
    await this.protocolsService.saveProtocolResult(
      tenantId, user.sub, dto.patientId, 'SEPSIS_SOFA',
      `SOFA Score: ${result.totalScore} — ${result.sepsisPresent ? (result.septicShock ? 'CHOQUE SÉPTICO' : 'SEPSE') : 'Sem sepse'}`,
      result as unknown as Record<string, unknown>,
      dto.encounterId,
    );
    return result;
  }

  @Post('sepsis/bundle')
  @ApiOperation({ summary: 'Rastrear aderência ao bundle de sepse (SSC 2021 Hour-1 Bundle)' })
  @ApiResponse({ status: 201, description: 'Bundle compliance calculado' })
  async trackSepsisBundle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: TrackSepsisBundleDto,
  ) {
    const result = this.protocolsService.trackSepsisBundle(dto);
    await this.protocolsService.saveProtocolResult(
      tenantId, user.sub, dto.patientId, 'SEPSIS_BUNDLE',
      `Bundle Sepse — ${result.overallCompliance}% completo ${result.hour1Compliant ? '(H1 OK)' : '(H1 PENDENTE)'}`,
      result as unknown as Record<string, unknown>,
      dto.encounterId,
    );
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STROKE PROTOCOL
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('stroke/nihss')
  @ApiOperation({ summary: 'Calcular NIHSS (National Institutes of Health Stroke Scale) — 15 itens' })
  @ApiResponse({ status: 201, description: 'NIHSS calculado com classificação de gravidade' })
  calculateNIHSS(@Body() dto: CalculateNIHSSDto) {
    return this.protocolsService.calculateNIHSS(dto);
  }

  @Post('stroke/cincinnati')
  @ApiOperation({ summary: 'Escala de Cincinnati (triagem pré-hospitalar de AVC)' })
  @ApiResponse({ status: 201, description: 'Cincinnati calculado' })
  calculateCincinnati(@Body() dto: CincinnatiScaleDto) {
    return this.protocolsService.calculateCincinnati(dto);
  }

  @Post('stroke/timeline')
  @ApiOperation({ summary: 'Rastrear tempos do protocolo AVC (door-to-CT, door-to-needle)' })
  @ApiResponse({ status: 201, description: 'Timeline calculado com aderência a metas' })
  async calculateStrokeTimeline(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StrokeTimelineDto,
  ) {
    const result = this.protocolsService.calculateStrokeTimeline(dto);
    await this.protocolsService.saveProtocolResult(
      tenantId, user.sub, dto.patientId, 'STROKE_TIMELINE',
      `AVC Timeline — Door-to-CT: ${result.doorToCTMinutes ?? '?'}min, Door-to-Needle: ${result.doorToNeedleMinutes ?? '?'}min`,
      result as unknown as Record<string, unknown>,
      dto.encounterId,
    );
    return result;
  }

  @Post('stroke/thrombolysis-check')
  @ApiOperation({ summary: 'Checklist de elegibilidade para trombólise IV (rt-PA) — AHA/ASA 2019' })
  @ApiResponse({ status: 201, description: 'Elegibilidade calculada com dose de alteplase' })
  checkThrombolysis(@Body() dto: ThrombolysisCheckDto) {
    return this.protocolsService.checkThrombolysisEligibility(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEST PAIN PROTOCOL
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('chest-pain/heart')
  @ApiOperation({ summary: 'Calcular HEART Score (History, ECG, Age, Risk, Troponin)' })
  @ApiResponse({ status: 201, description: 'HEART score calculado com estratificação de risco' })
  calculateHEART(@Body() dto: CalculateHEARTScoreDto) {
    return this.protocolsService.calculateHEARTScore(dto);
  }

  @Post('chest-pain/timi')
  @ApiOperation({ summary: 'Calcular TIMI Risk Score (AI/NSTEMI)' })
  @ApiResponse({ status: 201, description: 'TIMI calculado com risco de eventos em 14 dias' })
  calculateTIMI(@Body() dto: CalculateTIMIDto) {
    return this.protocolsService.calculateTIMI(dto);
  }

  @Post('chest-pain/killip')
  @ApiOperation({ summary: 'Classificação de Killip (avaliação hemodinâmica no IAM)' })
  @ApiResponse({ status: 201, description: 'Classe Killip com mortalidade estimada' })
  calculateKillip(@Body() dto: CalculateKillipDto) {
    return this.protocolsService.calculateKillip(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEWS2
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('news2')
  @ApiOperation({ summary: 'Calcular NEWS2 com Scale 1 e Scale 2 (DPOC) para SpO2' })
  @ApiResponse({ status: 201, description: 'NEWS2 calculado com resposta clínica recomendada' })
  calculateNEWS2(@Body() dto: CalculateNEWS2Dto) {
    return this.protocolsService.calculateNEWS2(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ICU SCORES
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('icu/glasgow')
  @ApiOperation({ summary: 'Calcular Escala de Coma de Glasgow (GCS)' })
  @ApiResponse({ status: 201, description: 'Glasgow calculado' })
  calculateGlasgow(@Body() dto: CalculateGlasgowDto) {
    return this.protocolsService.calculateGlasgow(dto);
  }

  @Post('icu/rass')
  @ApiOperation({ summary: 'Avaliar RASS (Richmond Agitation-Sedation Scale)' })
  @ApiResponse({ status: 201, description: 'RASS avaliado com recomendação de ajuste' })
  calculateRASS(@Body() dto: CalculateRASSDto) {
    return this.protocolsService.calculateRASS(dto);
  }

  @Post('icu/cam-icu')
  @ApiOperation({ summary: 'Rastreio CAM-ICU (Confusion Assessment Method for the ICU) — delirium' })
  @ApiResponse({ status: 201, description: 'CAM-ICU avaliado' })
  calculateCAMICU(@Body() dto: CalculateCAMICUDto) {
    return this.protocolsService.calculateCAMICU(dto);
  }

  @Post('icu/braden')
  @ApiOperation({ summary: 'Escala de Braden (risco de lesão por pressão)' })
  @ApiResponse({ status: 201, description: 'Braden calculado com intervenções recomendadas' })
  calculateBraden(@Body() dto: CalculateBradenDto) {
    return this.protocolsService.calculateBraden(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NURSING SCALES
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('nursing/morse-fall')
  @ApiOperation({ summary: 'Escala de Morse (risco de queda) — 6 itens' })
  @ApiResponse({ status: 201, description: 'Morse calculado com intervenções recomendadas' })
  calculateMorseFall(@Body() dto: CalculateMorseFallDto) {
    return this.protocolsService.calculateMorseFall(dto);
  }

  @Post('nursing/waterlow')
  @ApiOperation({ summary: 'Escala de Waterlow (risco de úlcera por pressão)' })
  @ApiResponse({ status: 201, description: 'Waterlow calculado' })
  calculateWaterlow(@Body() dto: CalculateWaterlowDto) {
    return this.protocolsService.calculateWaterlow(dto);
  }
}
