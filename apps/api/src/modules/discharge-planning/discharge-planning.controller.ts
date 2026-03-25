import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DischargePlanningService } from './discharge-planning.service';
import {
  CreateDischargeInstructionsDto,
  CreateHomePrescriptionDto,
  CreateDischargeChecklistDto,
  CreateDischargeBarrierDto,
  ResolveDischargeBarrierDto,
  CreateMultidisciplinaryRoundDto,
  BedAllocationSuggestionDto,
} from './dto/discharge-planning.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Discharge Planning')
@ApiBearerAuth('access-token')
@Controller('discharge-planning')
export class DischargePlanningController {
  constructor(private readonly dischargePlanningService: DischargePlanningService) {}

  // ─── Discharge Instructions ─────────────────────────────────────────────

  @Post('instructions')
  @ApiOperation({ summary: 'Create discharge instructions' })
  @ApiResponse({ status: 201, description: 'Discharge instructions created' })
  async createDischargeInstructions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDischargeInstructionsDto,
  ) {
    return this.dischargePlanningService.createDischargeInstructions(tenantId, user.sub, dto);
  }

  @Get('instructions/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get discharge instructions for patient' })
  async getDischargeInstructions(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.dischargePlanningService.getDischargeInstructions(tenantId, patientId);
  }

  // ─── Home Prescription ──────────────────────────────────────────────────

  @Post('home-prescription')
  @ApiOperation({ summary: 'Create home prescription' })
  @ApiResponse({ status: 201, description: 'Home prescription created' })
  async createHomePrescription(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateHomePrescriptionDto,
  ) {
    return this.dischargePlanningService.createHomePrescription(tenantId, user.sub, dto);
  }

  // ─── Safe Discharge Checklist ───────────────────────────────────────────

  @Post('checklist')
  @ApiOperation({ summary: 'Create safe discharge checklist' })
  @ApiResponse({ status: 201, description: 'Discharge checklist created' })
  async createDischargeChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDischargeChecklistDto,
  ) {
    return this.dischargePlanningService.createDischargeChecklist(tenantId, user.sub, dto);
  }

  // ─── Barriers ───────────────────────────────────────────────────────────

  @Post('barriers')
  @ApiOperation({ summary: 'Register discharge barrier' })
  @ApiResponse({ status: 201, description: 'Barrier registered' })
  async createDischargeBarrier(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDischargeBarrierDto,
  ) {
    return this.dischargePlanningService.createDischargeBarrier(tenantId, user.sub, dto);
  }

  @Patch('barriers/resolve')
  @ApiOperation({ summary: 'Resolve discharge barrier' })
  async resolveDischargeBarrier(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveDischargeBarrierDto,
  ) {
    return this.dischargePlanningService.resolveDischargeBarrier(tenantId, user.sub, dto);
  }

  @Get('barriers/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get active discharge barriers' })
  async getActiveBarriers(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.dischargePlanningService.getActiveBarriers(tenantId, patientId);
  }

  @Get('barriers/patient/:patientId/all')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get all discharge barriers (active + resolved)' })
  async getAllBarriers(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.dischargePlanningService.getAllBarriers(tenantId, patientId);
  }

  // ─── Multidisciplinary Rounding ─────────────────────────────────────────

  @Post('rounding')
  @ApiOperation({ summary: 'Record multidisciplinary round' })
  @ApiResponse({ status: 201, description: 'Round recorded' })
  async createMultidisciplinaryRound(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMultidisciplinaryRoundDto,
  ) {
    return this.dischargePlanningService.createMultidisciplinaryRound(tenantId, user.sub, dto);
  }

  @Get('rounding/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get rounding history' })
  async getRoundingHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.dischargePlanningService.getRoundingHistory(tenantId, patientId);
  }

  // ─── AI Bed Allocation ──────────────────────────────────────────────────

  @Post('bed-allocation-suggestion')
  @ApiOperation({ summary: 'Get AI bed allocation suggestion' })
  @ApiResponse({ status: 200, description: 'Bed allocation suggestion' })
  async getBedAllocationSuggestion(
    @CurrentTenant() tenantId: string,
    @Body() dto: BedAllocationSuggestionDto,
  ) {
    return this.dischargePlanningService.getBedAllocationSuggestion(tenantId, dto);
  }

  // ─── Discharge Summary ──────────────────────────────────────────────────

  @Get('summary/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get complete discharge planning summary' })
  @ApiResponse({ status: 200, description: 'Discharge summary' })
  async getDischargeSummary(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.dischargePlanningService.getDischargeSummary(tenantId, patientId);
  }
}
