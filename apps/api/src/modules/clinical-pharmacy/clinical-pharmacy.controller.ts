import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ClinicalPharmacyService } from './clinical-pharmacy.service';
import {
  ValidatePrescriptionDto,
  CreateInterventionDto,
} from './dto/create-clinical-pharmacy.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Pharmacy')
@ApiBearerAuth('access-token')
@Controller('clinical-pharmacy')
export class ClinicalPharmacyController {
  constructor(private readonly clinicalPharmacyService: ClinicalPharmacyService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Pharmacist validation of prescription' })
  @ApiResponse({ status: 201, description: 'Prescription validated' })
  async validatePrescription(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ValidatePrescriptionDto,
  ) {
    return this.clinicalPharmacyService.validatePrescription(tenantId, user.sub, dto);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending prescriptions for pharmacist validation' })
  @ApiResponse({ status: 200, description: 'Pending prescriptions' })
  async getPendingPrescriptions(@CurrentTenant() tenantId: string) {
    return this.clinicalPharmacyService.getPendingPrescriptions(tenantId);
  }

  @Post(':id/intervention')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Record pharmacist intervention' })
  @ApiResponse({ status: 201, description: 'Intervention recorded' })
  async createIntervention(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInterventionDto,
  ) {
    // Override prescriptionId with param
    dto.prescriptionId = id;
    return this.clinicalPharmacyService.createIntervention(tenantId, user.sub, dto);
  }

  @Get('interventions')
  @ApiOperation({ summary: 'Get pharmacist intervention history' })
  @ApiResponse({ status: 200, description: 'Intervention history' })
  async getInterventionHistory(@CurrentTenant() tenantId: string) {
    return this.clinicalPharmacyService.getInterventionHistory(tenantId);
  }

  @Get('renal-alerts')
  @ApiOperation({ summary: 'Get renal/hepatic dose adjustment alerts' })
  @ApiResponse({ status: 200, description: 'Renal/hepatic alerts' })
  async getRenalAlerts(@CurrentTenant() tenantId: string) {
    return this.clinicalPharmacyService.getRenalAlerts(tenantId);
  }

  @Get('validation-queue')
  @ApiOperation({ summary: 'Get pharmacy validation queue (pending prescriptions for pharmacist review)' })
  @ApiResponse({ status: 200, description: 'Validation queue' })
  async getPharmacyValidationQueue(@CurrentTenant() tenantId: string) {
    return this.clinicalPharmacyService.getPharmacyValidationQueue(tenantId);
  }

  @Post('validate/:prescriptionId')
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Full pharmacist validation workflow for a prescription' })
  @ApiResponse({ status: 201, description: 'Prescription validated' })
  async validatePrescriptionFull(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: ValidatePrescriptionDto,
  ) {
    return this.clinicalPharmacyService.validatePrescriptionFull(tenantId, user.sub, prescriptionId, dto);
  }
}
