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
} from '@nestjs/swagger';
import { PrescriptionsEnhancedService } from './prescriptions-enhanced.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import type { ChildPughInput } from './prescriptions-enhanced.service';

@ApiTags('Prescriptions Enhanced')
@ApiBearerAuth('access-token')
@Controller('prescriptions/enhanced')
export class PrescriptionsEnhancedController {
  constructor(
    private readonly enhancedService: PrescriptionsEnhancedService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Order Sets
  // ──────────────────────────────────────────────────────────────────────────

  @Get('order-sets')
  @ApiOperation({ summary: 'List all available order sets' })
  @ApiResponse({ status: 200, description: 'List of order sets' })
  listOrderSets() {
    return this.enhancedService.listOrderSets();
  }

  @Get('order-sets/:orderSetId')
  @ApiParam({ name: 'orderSetId', description: 'Order set ID' })
  @ApiOperation({ summary: 'Get order set details with medications' })
  @ApiResponse({ status: 200, description: 'Order set details' })
  @ApiResponse({ status: 404, description: 'Order set not found' })
  getOrderSet(@Param('orderSetId') orderSetId: string) {
    return this.enhancedService.getOrderSet(orderSetId);
  }

  @Post('order-sets/activate')
  @ApiOperation({ summary: 'Activate an order set for a patient, creating a DRAFT prescription' })
  @ApiResponse({ status: 201, description: 'Order set activated' })
  @ApiResponse({ status: 404, description: 'Order set not found' })
  async activateOrderSet(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      orderSetId: string;
      patientId: string;
      encounterId: string;
      patientWeight?: number;
    },
  ) {
    return this.enhancedService.activateOrderSet(tenantId, user.sub, dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Renal Function Calculator (Cockcroft-Gault + CKD-EPI)
  // ──────────────────────────────────────────────────────────────────────────

  @Post('renal-function')
  @ApiOperation({ summary: 'Calculate renal function (Cockcroft-Gault + CKD-EPI 2021)' })
  @ApiResponse({ status: 200, description: 'Renal function calculation result' })
  calculateRenalFunction(
    @Body() dto: {
      patientAge: number;
      patientWeight: number;
      patientGender: string;
      serumCreatinine: number;
      isBlack?: boolean;
    },
  ) {
    return this.enhancedService.calculateRenalFunction(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Child-Pugh Score Calculator
  // ──────────────────────────────────────────────────────────────────────────

  @Post('child-pugh')
  @ApiOperation({ summary: 'Calculate Child-Pugh score for hepatic function' })
  @ApiResponse({ status: 200, description: 'Child-Pugh calculation result' })
  calculateChildPugh(
    @Body() dto: ChildPughInput,
  ) {
    return this.enhancedService.calculateChildPugh(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Smart Infusion Pump Integration
  // ──────────────────────────────────────────────────────────────────────────

  @Post('infusion-pump')
  @ApiOperation({ summary: 'Calculate infusion pump parameters (Alaris/B.Braun/Baxter)' })
  @ApiResponse({ status: 200, description: 'Infusion pump calculation result' })
  calculateInfusionPump(
    @Body() dto: {
      pumpBrand: 'ALARIS' | 'BBRAUN' | 'BAXTER';
      medication: string;
      totalDoseMg: number;
      diluentVolumeMl: number;
      prescribedRateMgH: number;
      durationH?: number;
    },
  ) {
    return this.enhancedService.calculateInfusionPump(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PCA Activations
  // ──────────────────────────────────────────────────────────────────────────

  @Post('pca/activate')
  @ApiOperation({ summary: 'Record a PCA (Patient Controlled Analgesia) activation' })
  @ApiResponse({ status: 201, description: 'PCA activation recorded' })
  async recordPCAActivation(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      prescriptionItemId: string;
      patientId: string;
      encounterId: string;
      doseDelivered: number;
      doseUnit: string;
      wasLocked: boolean;
      painScoreBefore?: number;
      painScoreAfter?: number;
    },
  ) {
    return this.enhancedService.recordPCAActivation(tenantId, dto);
  }

  @Get('pca/history/:prescriptionItemId')
  @ApiParam({ name: 'prescriptionItemId', description: 'Prescription item UUID' })
  @ApiOperation({ summary: 'Get PCA activation history for a prescription item' })
  @ApiResponse({ status: 200, description: 'PCA activation history' })
  async getPCAHistory(
    @CurrentTenant() tenantId: string,
    @Param('prescriptionItemId', ParseUUIDPipe) prescriptionItemId: string,
    @Query('hours') hours?: string,
  ) {
    return this.enhancedService.getPCAHistory(
      tenantId,
      prescriptionItemId,
      hours ? parseInt(hours, 10) : 24,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI: Culture-based Antimicrobial Optimization
  // ──────────────────────────────────────────────────────────────────────────

  @Post('culture-recommendation')
  @ApiOperation({ summary: 'AI: Get culture-based antimicrobial recommendation' })
  @ApiResponse({ status: 200, description: 'Antimicrobial recommendation' })
  getCultureBasedRecommendation(
    @Body() dto: {
      organism: string;
      sensitivities: Array<{ antibiotic: string; interpretation: 'S' | 'I' | 'R' }>;
      infectionSite?: string;
      patientAllergies?: string[];
      isImmunocompromised?: boolean;
      previousAntibiotics?: string[];
    },
  ) {
    return this.enhancedService.getCultureBasedRecommendation(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI: Personalized Adverse Effect Prediction
  // ──────────────────────────────────────────────────────────────────────────

  @Post('adverse-effect-prediction')
  @ApiOperation({ summary: 'AI: Predict personalized adverse effects based on patient profile' })
  @ApiResponse({ status: 200, description: 'Adverse effect prediction' })
  predictAdverseEffects(
    @Body() dto: {
      medicationName: string;
      patientAge: number;
      patientGender: string;
      comorbidities: string[];
      currentMedications: string[];
      geneticProfile?: Record<string, string>;
    },
  ) {
    return this.enhancedService.predictAdverseEffects(dto);
  }
}
