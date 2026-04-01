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
import { DischargeEnhancedService } from './discharge-enhanced.service';
import {
  DischargeInstructionsDto,
  DischargePrescriptionDto,
  SafeDischargeChecklistDto,
  UpdateChecklistItemDto,
  DischargeBarrierDto,
  ResolveBarrierDto,
  RoundingDto,
  BedRequestDto,
  UpdateBedRequestStatusDto,
} from './dto/discharge-enhanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Discharge Planning Enhanced')
@ApiBearerAuth('access-token')
@Controller('discharge')
export class DischargeEnhancedController {
  constructor(private readonly dischargeEnhancedService: DischargeEnhancedService) {}

  // ─── 1. Discharge Instructions ──────────────────────────────────────────

  @Post('instructions/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Generate discharge instructions for encounter' })
  @ApiResponse({ status: 201, description: 'Discharge instructions generated' })
  async generateDischargeInstructions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: DischargeInstructionsDto,
  ) {
    dto.encounterId = encounterId;
    return this.dischargeEnhancedService.generateDischargeInstructions(tenantId, user.sub, dto);
  }

  @Get('instructions/:encounterId/print')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get printable discharge instructions' })
  @ApiResponse({ status: 200, description: 'Printable discharge instructions' })
  async printDischargeInstructions(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.dischargeEnhancedService.printDischargeInstructions(tenantId, encounterId);
  }

  // ─── 2. Discharge Prescription ──────────────────────────────────────────

  @Post('prescription/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Generate discharge prescription with medication reconciliation' })
  @ApiResponse({ status: 201, description: 'Discharge prescription generated' })
  async generateDischargePrescription(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: DischargePrescriptionDto,
  ) {
    dto.encounterId = encounterId;
    return this.dischargeEnhancedService.generateDischargePrescription(tenantId, user.sub, dto);
  }

  // ─── 3. Safe Discharge Checklist ────────────────────────────────────────

  @Get('checklist/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get discharge checklist (generates default if none exists)' })
  @ApiResponse({ status: 200, description: 'Discharge checklist' })
  async getDischargeChecklist(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.dischargeEnhancedService.getDischargeChecklist(tenantId, encounterId);
  }

  @Post('checklist/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Save discharge checklist' })
  @ApiResponse({ status: 201, description: 'Checklist saved' })
  async saveDischargeChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: SafeDischargeChecklistDto,
  ) {
    dto.encounterId = encounterId;
    return this.dischargeEnhancedService.saveDischargeChecklist(tenantId, user.sub, dto);
  }

  @Patch('checklist/:encounterId/item')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Update a single checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item updated' })
  async updateChecklistItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.dischargeEnhancedService.updateChecklistItem(tenantId, user.sub, encounterId, dto);
  }

  @Get('readiness/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get discharge readiness dashboard' })
  @ApiResponse({ status: 200, description: 'Discharge readiness status' })
  async getDischargeReadiness(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.dischargeEnhancedService.getDischargeReadinessDashboard(tenantId, encounterId);
  }

  // ─── 4. Barrier to Discharge ────────────────────────────────────────────

  @Post('barriers')
  @ApiOperation({ summary: 'Add a discharge barrier' })
  @ApiResponse({ status: 201, description: 'Barrier added' })
  async addBarrier(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DischargeBarrierDto,
  ) {
    return this.dischargeEnhancedService.addBarrier(tenantId, user.sub, dto);
  }

  @Patch('barriers/:id/resolve')
  @ApiParam({ name: 'id', description: 'Barrier document UUID' })
  @ApiOperation({ summary: 'Resolve a discharge barrier' })
  @ApiResponse({ status: 200, description: 'Barrier resolved' })
  async resolveBarrier(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveBarrierDto,
  ) {
    return this.dischargeEnhancedService.resolveBarrier(tenantId, user.sub, id, dto);
  }

  @Get('barriers/dashboard/:unitId')
  @ApiParam({ name: 'unitId', description: 'Hospital unit identifier' })
  @ApiOperation({ summary: 'Get barrier dashboard for a unit' })
  @ApiResponse({ status: 200, description: 'Barrier dashboard' })
  async getBarrierDashboard(
    @CurrentTenant() tenantId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.dischargeEnhancedService.getBarrierDashboard(tenantId, unitId);
  }

  // ─── 5. Multidisciplinary Rounding ──────────────────────────────────────

  @Post('rounding')
  @ApiOperation({ summary: 'Create a multidisciplinary rounding note' })
  @ApiResponse({ status: 201, description: 'Rounding note created' })
  async createRoundingNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RoundingDto,
  ) {
    return this.dischargeEnhancedService.createRoundingNote(tenantId, user.sub, dto);
  }

  @Get('rounding/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get rounding history for encounter' })
  @ApiResponse({ status: 200, description: 'Rounding history' })
  async getRoundingHistory(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.dischargeEnhancedService.getRoundingHistory(tenantId, encounterId);
  }

  // ─── 6. Bed Regulation / Central de Vagas ───────────────────────────────

  @Post('bed-request')
  @ApiOperation({ summary: 'Request a bed (Central de Vagas)' })
  @ApiResponse({ status: 201, description: 'Bed request created' })
  async requestBed(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: BedRequestDto,
  ) {
    return this.dischargeEnhancedService.requestBed(tenantId, user.sub, dto);
  }

  @Patch('bed-request/:id/status')
  @ApiParam({ name: 'id', description: 'Bed request UUID' })
  @ApiOperation({ summary: 'Update bed request status (approve/deny/allocate)' })
  @ApiResponse({ status: 200, description: 'Bed request status updated' })
  async updateBedRequestStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBedRequestStatusDto,
  ) {
    return this.dischargeEnhancedService.updateBedRequestStatus(tenantId, id, dto);
  }

  @Get('bed-regulation/dashboard')
  @ApiOperation({ summary: 'Get bed regulation dashboard' })
  @ApiResponse({ status: 200, description: 'Bed regulation dashboard' })
  async getRegulationDashboard(@CurrentTenant() tenantId: string) {
    return this.dischargeEnhancedService.getRegulationDashboard(tenantId);
  }
}
