import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MedicationReconciliationService } from './medication-reconciliation.service';
import {
  StartReconciliationDto,
  AddHomeMedicationDto,
  RecordDecisionDto,
} from './dto/create-medication-reconciliation.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Medication Reconciliation')
@ApiBearerAuth('access-token')
@Controller('medication-reconciliation')
export class MedicationReconciliationController {
  constructor(
    private readonly medicationReconciliationService: MedicationReconciliationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start medication reconciliation (admission/transfer/discharge)' })
  @ApiResponse({ status: 201, description: 'Reconciliation started' })
  async startReconciliation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartReconciliationDto,
  ) {
    return this.medicationReconciliationService.startReconciliation(tenantId, user.sub, dto);
  }

  @Post(':id/home-med')
  @ApiParam({ name: 'id', description: 'Reconciliation UUID' })
  @ApiOperation({ summary: 'Add home medication to reconciliation' })
  @ApiResponse({ status: 201, description: 'Home medication added' })
  async addHomeMedication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddHomeMedicationDto,
  ) {
    return this.medicationReconciliationService.addHomeMedication(tenantId, user.sub, id, dto);
  }

  @Post(':id/compare')
  @ApiParam({ name: 'id', description: 'Reconciliation UUID' })
  @ApiOperation({ summary: 'Compare home vs current prescriptions' })
  @ApiResponse({ status: 201, description: 'Comparison result with discrepancies' })
  async compareMedications(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicationReconciliationService.compareMedications(tenantId, user.sub, id);
  }

  @Patch(':id/decision')
  @ApiParam({ name: 'id', description: 'Reconciliation UUID' })
  @ApiOperation({ summary: 'Record clinical decision per discrepancy' })
  @ApiResponse({ status: 200, description: 'Decision recorded' })
  async recordDecision(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDecisionDto,
  ) {
    return this.medicationReconciliationService.recordDecision(tenantId, user.sub, id, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get reconciliation history for a patient' })
  @ApiResponse({ status: 200, description: 'Reconciliation history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.medicationReconciliationService.getPatientHistory(tenantId, patientId);
  }
}
