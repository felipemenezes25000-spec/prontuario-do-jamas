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
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { DischargeAdvancedService } from './discharge-advanced.service';
import {
  RegulationRequestStatus,
  type SafeDischargeChecklistAdvancedDto,
  type CreateBedRegulationDto,
  type BarrierToDischargeDto,
  type MultidisciplinaryRoundDto,
} from './dto/discharge-advanced.dto';
import {
  type DischargeInstructionsDto,
  type DischargePrescriptionDto,
} from './dto/discharge-enhanced.dto';

@ApiTags('Discharge Planning - Advanced')
@ApiBearerAuth('access-token')
@Controller('discharge')
export class DischargeAdvancedController {
  constructor(private readonly service: DischargeAdvancedService) {}

  // ─── Discharge Instructions ───────────────────────────────────────────────

  @Post('advanced/instructions')
  @ApiOperation({
    summary: 'Create personalized discharge instructions — meds, diet, activity, warning signs, follow-up',
  })
  @ApiResponse({ status: 201, description: 'Discharge instructions created with printable URL' })
  async createDischargeInstructions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DischargeInstructionsDto,
  ) {
    return this.service.createDischargeInstructions(tenantId, user.sub, dto);
  }

  @Get('advanced/instructions/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get discharge instructions for an encounter' })
  @ApiResponse({ status: 200, description: 'Discharge instructions' })
  async getDischargeInstructions(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.getDischargeInstructions(tenantId, encounterId);
  }

  @Patch('advanced/instructions/:instructionsId/send-app')
  @ApiParam({ name: 'instructionsId', description: 'Instructions UUID' })
  @ApiOperation({ summary: 'Mark instructions as sent via patient portal app' })
  @ApiResponse({ status: 200, description: 'Instructions sent via app' })
  async sendInstructionsViaApp(
    @CurrentTenant() tenantId: string,
    @Param('instructionsId') instructionsId: string,
  ) {
    return this.service.sendInstructionsViaApp(tenantId, instructionsId);
  }

  // ─── Discharge Prescription (Home Medications) ────────────────────────────

  @Post('advanced/prescription')
  @ApiOperation({
    summary: 'Create discharge prescription with home medications (separate from hospital orders)',
  })
  @ApiResponse({ status: 201, description: 'Discharge prescription created' })
  async createDischargePrescription(
    @CurrentTenant() tenantId: string,
    @Body() dto: DischargePrescriptionDto,
  ) {
    return this.service.createDischargePrescription(tenantId, dto);
  }

  @Get('advanced/prescription/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get latest discharge prescription for encounter' })
  @ApiResponse({ status: 200, description: 'Discharge prescription' })
  async getDischargePrescription(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.getDischargePrescription(tenantId, encounterId);
  }

  // ─── Safe Discharge Checklist ─────────────────────────────────────────────

  @Post('advanced/safe-checklist')
  @ApiOperation({
    summary: 'Complete safe discharge checklist — reconciliation, instructions, follow-up, referrals, exams, companion',
  })
  @ApiResponse({ status: 201, description: 'Safe discharge checklist completed' })
  async createSafeDischargeChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SafeDischargeChecklistAdvancedDto,
  ) {
    return this.service.createSafeDischargeChecklist(tenantId, user.sub, dto);
  }

  @Get('advanced/safe-checklist/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get safe discharge checklist for encounter' })
  @ApiResponse({ status: 200, description: 'Safe discharge checklist' })
  async getSafeDischargeChecklist(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.getSafeDischargeChecklist(tenantId, encounterId);
  }

  @Get('advanced/ready/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Check if patient is ready for discharge (all checklist items done)' })
  @ApiResponse({ status: 200, description: 'Discharge readiness status' })
  async isReadyForDischarge(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.isReadyForDischarge(tenantId, encounterId);
  }

  // ─── Bed Regulation Center ────────────────────────────────────────────────

  @Post('advanced/bed-regulation')
  @ApiOperation({
    summary: 'Request bed via central regulation (municipal/state) — with complexity and urgency',
  })
  @ApiResponse({ status: 201, description: 'Bed regulation request created' })
  async createBedRegulationRequest(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBedRegulationDto,
  ) {
    return this.service.createBedRegulationRequest(tenantId, dto);
  }

  @Patch('advanced/bed-regulation/:requestId/status')
  @ApiParam({ name: 'requestId', description: 'Regulation request UUID' })
  @ApiOperation({ summary: 'Update bed regulation request status (approve/deny/transfer)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateBedRegulationStatus(
    @CurrentTenant() tenantId: string,
    @Param('requestId') requestId: string,
    @Body() body: {
      status: RegulationRequestStatus;
      transferDetails?: string;
      regulationProtocol?: string;
    },
  ) {
    return this.service.updateBedRegulationStatus(tenantId, requestId, body.status, body);
  }

  @Get('advanced/bed-regulation')
  @ApiOperation({ summary: 'List bed regulation requests' })
  @ApiQuery({ name: 'status', required: false, enum: RegulationRequestStatus })
  @ApiResponse({ status: 200, description: 'Bed regulation requests' })
  async listBedRegulations(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: RegulationRequestStatus,
  ) {
    return this.service.listBedRegulations(tenantId, status);
  }

  // ─── Barrier to Discharge ─────────────────────────────────────────────────

  @Post('advanced/barriers')
  @ApiOperation({
    summary: 'Record barriers to discharge — awaiting exam, rehab bed, social issue, insurance, etc.',
  })
  @ApiResponse({ status: 201, description: 'Barriers recorded' })
  async addBarriersToDischarge(
    @CurrentTenant() tenantId: string,
    @Body() dto: BarrierToDischargeDto,
  ) {
    return this.service.addBarriersToDischarge(tenantId, dto);
  }

  @Get('advanced/barriers/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({
    summary: 'Get all discharge barriers for an encounter with estimated delay',
  })
  @ApiResponse({ status: 200, description: 'Discharge barriers and delay estimate' })
  async getBarriersForEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.getBarriersForEncounter(tenantId, encounterId);
  }

  @Patch('advanced/barriers/:encounterId/resolve/:barrierIndex')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiParam({ name: 'barrierIndex', description: 'Zero-based barrier index' })
  @ApiOperation({ summary: 'Mark a specific barrier as resolved' })
  @ApiResponse({ status: 200, description: 'Barrier resolved' })
  async resolveBarrier(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
    @Param('barrierIndex') barrierIndex: string,
  ) {
    return this.service.resolveBarrier(tenantId, encounterId, parseInt(barrierIndex, 10));
  }

  @Get('advanced/barriers/stats')
  @ApiOperation({ summary: 'Aggregate discharge barrier statistics — most common types, average resolution days' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Barrier statistics' })
  async getBarrierStats(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getBarrierStats(tenantId, startDate, endDate);
  }

  // ─── Multidisciplinary Rounding ───────────────────────────────────────────

  @Post('advanced/rounds')
  @ApiOperation({
    summary: 'Create multidisciplinary round — participants, checklist, pending tasks, day goals, discharge ETA',
  })
  @ApiResponse({ status: 201, description: 'Round created' })
  async createRound(
    @CurrentTenant() tenantId: string,
    @Body() dto: MultidisciplinaryRoundDto,
  ) {
    return this.service.createRound(tenantId, dto);
  }

  @Get('advanced/rounds/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'List all multidisciplinary rounds for an encounter (newest first)' })
  @ApiResponse({ status: 200, description: 'List of MDT rounds' })
  async listRoundsForEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.listRoundsForEncounter(tenantId, encounterId);
  }

  @Get('advanced/rounds/:encounterId/latest')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get the latest MDT round for an encounter' })
  @ApiResponse({ status: 200, description: 'Latest MDT round' })
  async getLatestRound(
    @CurrentTenant() tenantId: string,
    @Param('encounterId') encounterId: string,
  ) {
    return this.service.getLatestRound(tenantId, encounterId);
  }

  @Patch('advanced/rounds/:roundId/tasks/:taskIndex/complete')
  @ApiParam({ name: 'roundId', description: 'Round UUID' })
  @ApiParam({ name: 'taskIndex', description: 'Zero-based task index' })
  @ApiOperation({ summary: 'Mark a pending task from a round as completed' })
  @ApiResponse({ status: 200, description: 'Task completed' })
  async completePendingTask(
    @CurrentTenant() tenantId: string,
    @Param('roundId') roundId: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    return this.service.completePendingTask(tenantId, roundId, parseInt(taskIndex, 10));
  }
}
