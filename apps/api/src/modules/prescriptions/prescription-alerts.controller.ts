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
import { PrescriptionAlertsService } from './prescription-alerts.service';
import {
  PregnancyAlertDto,
  CheckPregnancyRiskDto,
  LactationAlertDto,
  CheckLactationRiskDto,
  RenalAdjustmentDto,
  HepaticAdjustmentDto,
  DrugFoodInteractionDto,
  CheckDrugFoodInteractionDto,
  GenericEquivalenceDto,
  LookupGenericEquivalencesDto,
  EPrescribingDto,
  ValidateProtocolPrescriptionDto,
  PCAPrescriptionDto,
} from './dto/prescription-safety.dto';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Prescriptions - Safety Alerts')
@ApiBearerAuth('access-token')
@Controller('prescriptions')
export class PrescriptionAlertsController {
  constructor(
    private readonly alertsService: PrescriptionAlertsService,
  ) {}

  // ─── Pregnancy Alerts ──────────────────────────────────────────────────────

  @Post('alerts/pregnancy/check')
  @ApiOperation({
    summary: 'Check pregnancy safety for a list of medications (FDA categories A–X)',
    description:
      'Evaluates each medication against FDA pregnancy risk categories. ' +
      'Category X medications trigger an immediate contraindication alert.',
  })
  @ApiResponse({ status: 200, description: 'Pregnancy risk assessment per medication' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async checkPregnancyRisk(@Body() dto: CheckPregnancyRiskDto) {
    return this.alertsService.checkPregnancyRisk(dto);
  }

  @Post('alerts/pregnancy')
  @ApiOperation({
    summary: 'Register a pregnancy safety alert for a specific medication',
    description: 'Stores a pregnancy risk alert to the patient safety log.',
  })
  @ApiResponse({ status: 201, description: 'Pregnancy alert registered' })
  async addPregnancyAlert(@Body() dto: PregnancyAlertDto) {
    return this.alertsService.addPregnancyAlert(dto);
  }

  // ─── Lactation Alerts ──────────────────────────────────────────────────────

  @Post('alerts/lactation/check')
  @ApiOperation({
    summary: 'Check lactation (breastfeeding) safety for a list of medications',
    description:
      'Returns LactMed-based risk levels, milk-to-plasma ratio, infant risk summary, ' +
      'and recommended alternatives for each drug.',
  })
  @ApiResponse({ status: 200, description: 'Lactation risk assessment per medication' })
  async checkLactationRisk(@Body() dto: CheckLactationRiskDto) {
    return this.alertsService.checkLactationRisk(dto);
  }

  @Post('alerts/lactation')
  @ApiOperation({ summary: 'Register a lactation safety alert for a medication' })
  @ApiResponse({ status: 201, description: 'Lactation alert registered' })
  async addLactationAlert(@Body() dto: LactationAlertDto) {
    return this.alertsService.addLactationAlert(dto);
  }

  // ─── Renal Dose Adjustment ─────────────────────────────────────────────────

  @Post('alerts/renal-adjustment')
  @ApiOperation({
    summary: 'Calculate renal dose adjustment (CKD-EPI / Cockcroft-Gault)',
    description:
      'Computes eGFR from serum creatinine using the selected formula, classifies CKD stage, ' +
      'and returns suggested dose adjustment for the specified medication.',
  })
  @ApiResponse({ status: 200, description: 'Renal adjustment recommendation' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async calculateRenalAdjustment(@Body() dto: RenalAdjustmentDto) {
    return this.alertsService.calculateRenalAdjustment(dto);
  }

  // ─── Hepatic Dose Adjustment ───────────────────────────────────────────────

  @Post('alerts/hepatic-adjustment')
  @ApiOperation({
    summary: 'Calculate hepatic dose adjustment (Child-Pugh score)',
    description:
      'Returns dose adjustment guidance based on Child-Pugh classification ' +
      '(A = mild, B = moderate, C = severe hepatic impairment).',
  })
  @ApiResponse({ status: 200, description: 'Hepatic adjustment recommendation' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async calculateHepaticAdjustment(@Body() dto: HepaticAdjustmentDto) {
    return this.alertsService.calculateHepaticAdjustment(dto);
  }

  // ─── Drug-Food Interactions ────────────────────────────────────────────────

  @Post('alerts/drug-food/check')
  @ApiOperation({
    summary: 'Check drug-food interactions for a list of medications',
    description:
      'Returns clinically relevant food interactions (e.g. warfarin + vitamin K, ' +
      'ciprofloxacin + dairy, sildenafil + grapefruit) with severity and management.',
  })
  @ApiResponse({ status: 200, description: 'Drug-food interaction report' })
  async checkDrugFoodInteractions(@Body() dto: CheckDrugFoodInteractionDto) {
    return this.alertsService.checkDrugFoodInteractions(dto);
  }

  @Post('alerts/drug-food')
  @ApiOperation({ summary: 'Register a new drug-food interaction in the knowledge base' })
  @ApiResponse({ status: 201, description: 'Interaction registered' })
  async addDrugFoodInteraction(@Body() dto: DrugFoodInteractionDto) {
    return this.alertsService.addDrugFoodInteraction(dto);
  }

  // ─── Generic Equivalence ───────────────────────────────────────────────────

  @Post('generic-equivalences/lookup')
  @ApiOperation({
    summary: 'Look up generic alternatives with price comparison',
    description:
      'Returns ANVISA-registered generic/similar medications for a brand-name drug, ' +
      'with price per unit and estimated savings percentage.',
  })
  @ApiResponse({ status: 200, description: 'Generic alternatives with pricing' })
  async lookupGenerics(@Body() dto: LookupGenericEquivalencesDto) {
    return this.alertsService.lookupGenericEquivalences(dto);
  }

  @Post('generic-equivalences')
  @ApiOperation({ summary: 'Register generic equivalences for a brand-name drug' })
  @ApiResponse({ status: 201, description: 'Generic equivalences registered' })
  async registerGenericEquivalences(@Body() dto: GenericEquivalenceDto) {
    return this.alertsService.registerGenericEquivalences(dto);
  }

  // ─── e-Prescribing ────────────────────────────────────────────────────────

  @Post('e-prescribing/send')
  @ApiOperation({
    summary: 'Send prescription to external e-prescribing platform (Memed / Nexodata)',
    description:
      'Transmits a signed prescription to the selected digital platform. ' +
      'Returns a patient-accessible link and pharmacy QR code.',
  })
  @ApiResponse({ status: 200, description: 'Prescription transmitted — returns external link and QR code' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async sendEPrescription(@Body() dto: EPrescribingDto) {
    return this.alertsService.sendEPrescription(dto);
  }

  // ─── Protocol Validation ───────────────────────────────────────────────────

  @Post('protocol-validation')
  @ApiOperation({
    summary: 'Validate prescription against a clinical protocol',
    description:
      'Compares prescribed dose, route, and frequency against a clinical bundle or protocol ' +
      '(e.g. sepsis bundle, ACS protocol). Returns deviations with severity levels.',
  })
  @ApiResponse({ status: 200, description: 'Protocol compliance report with deviations' })
  async validateProtocol(@Body() dto: ValidateProtocolPrescriptionDto) {
    return this.alertsService.validateProtocolPrescription(dto);
  }

  // ─── PCA Prescriptions ────────────────────────────────────────────────────

  @Post('pca')
  @ApiOperation({
    summary: 'Create PCA (Patient Controlled Analgesia) prescription',
    description:
      'Prescribes a PCA analgesic protocol with bolus dose, lockout interval, ' +
      'optional basal rate, and 1h/4h limits. Minimum lockout is 5 minutes for safety.',
  })
  @ApiResponse({ status: 201, description: 'PCA prescription created' })
  @ApiResponse({ status: 400, description: 'Lockout interval too short or invalid parameters' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async createPCAPrescription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PCAPrescriptionDto,
  ) {
    return this.alertsService.createPCAPrescription(user.sub, dto);
  }

  @Get('pca')
  @ApiOperation({ summary: 'List PCA prescriptions for a patient' })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'List of PCA prescriptions' })
  async listPCAPrescriptions(@Query('patientId') patientId: string) {
    return this.alertsService.listPCAPrescriptions(patientId);
  }

  @Get('pca/:id')
  @ApiOperation({ summary: 'Get PCA prescription by ID' })
  @ApiParam({ name: 'id', description: 'PCA prescription UUID' })
  @ApiResponse({ status: 200, description: 'PCA prescription details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getPCAPrescription(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.getPCAPrescription(id);
  }
}
