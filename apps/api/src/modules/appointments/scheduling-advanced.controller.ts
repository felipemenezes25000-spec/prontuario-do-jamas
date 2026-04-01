import {
  Controller,
  Get,
  Post,
  Delete,
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
import { SchedulingAdvancedService } from './scheduling-advanced.service';
import {
  SendConfirmationDto,
  ProcessConfirmationResponseDto,
  WaitlistDto,
  CreateRecurringDto,
  AgendaBlockDto,
  CallPatientDto,
  RegisterWalkInDto,
  OverbookingConfigDto,
  CheckMultiResourceDto,
  GenerateQrCheckinDto,
  ProcessQrCheckinDto,
  RecordWaitTimeDto,
} from './dto/scheduling-advanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Appointments — Scheduling Advanced')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class SchedulingAdvancedController {
  constructor(private readonly service: SchedulingAdvancedService) {}

  // ─── Auto-Confirmation ────────────────────────────────────────────────────

  @Post('confirmations/send')
  @ApiOperation({ summary: 'Send appointment confirmation via SMS / WhatsApp / push' })
  @ApiResponse({ status: 201, description: 'Confirmation dispatched' })
  async sendConfirmation(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendConfirmationDto,
  ) {
    return this.service.sendConfirmation(tenantId, dto);
  }

  @Post('confirmations/response')
  @ApiOperation({ summary: 'Process patient confirmation response (confirmed/rescheduled/cancelled)' })
  @ApiResponse({ status: 201, description: 'Response recorded' })
  async processResponse(
    @CurrentTenant() tenantId: string,
    @Body() dto: ProcessConfirmationResponseDto,
  ) {
    return this.service.processConfirmationResponse(tenantId, dto);
  }

  @Get('confirmations')
  @ApiOperation({ summary: 'List confirmation records' })
  @ApiQuery({ name: 'appointmentId', required: false })
  async listConfirmations(
    @CurrentTenant() tenantId: string,
    @Query('appointmentId') appointmentId?: string,
  ) {
    return this.service.listConfirmations(tenantId, appointmentId);
  }

  // ─── Waitlist Advanced ────────────────────────────────────────────────────

  @Post('waitlist/advanced')
  @ApiOperation({ summary: 'Add patient to advanced waitlist with priority' })
  @ApiResponse({ status: 201, description: 'Patient added to waitlist' })
  async addToWaitlist(
    @CurrentTenant() tenantId: string,
    @Body() dto: WaitlistDto,
  ) {
    return this.service.addToAdvancedWaitlist(tenantId, dto);
  }

  @Post('waitlist/advanced/:id/notify')
  @ApiOperation({ summary: 'Notify waitlist patient that a slot opened' })
  @ApiParam({ name: 'id', description: 'Waitlist entry UUID' })
  @ApiQuery({ name: 'slotDatetime', required: true, description: 'ISO datetime of offered slot' })
  async notifyWaitlistSlot(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('slotDatetime') slotDatetime: string,
  ) {
    return this.service.notifyWaitlistSlot(tenantId, id, slotDatetime);
  }

  @Get('waitlist/advanced')
  @ApiOperation({ summary: 'List advanced waitlist entries sorted by priority' })
  @ApiQuery({ name: 'specialty', required: false })
  async listWaitlist(
    @CurrentTenant() tenantId: string,
    @Query('specialty') specialty?: string,
  ) {
    return this.service.getAdvancedWaitlist(tenantId, specialty);
  }

  // ─── Recurring Appointments ───────────────────────────────────────────────

  @Post('recurring')
  @ApiOperation({ summary: 'Create recurring appointment series (3/6/12 months)' })
  @ApiResponse({ status: 201, description: 'Recurring series created with projected dates' })
  async createRecurring(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRecurringDto,
  ) {
    return this.service.createRecurring(tenantId, dto);
  }

  @Get('recurring')
  @ApiOperation({ summary: 'List recurring appointment series' })
  @ApiQuery({ name: 'patientId', required: false })
  async listRecurring(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.listRecurring(tenantId, patientId);
  }

  @Delete('recurring/:id')
  @ApiOperation({ summary: 'Cancel a recurring appointment series' })
  @ApiParam({ name: 'id', description: 'Recurring series UUID' })
  async cancelRecurring(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancelRecurring(tenantId, id);
  }

  // ─── Agenda Block ─────────────────────────────────────────────────────────

  @Post('blocks')
  @ApiOperation({ summary: 'Block doctor agenda (vacation, conference, personal)' })
  @ApiResponse({ status: 201, description: 'Block created; auto-reallocation triggered if configured' })
  async blockAgenda(
    @CurrentTenant() tenantId: string,
    @Body() dto: AgendaBlockDto,
  ) {
    return this.service.blockAgenda(tenantId, dto);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'List agenda blocks' })
  @ApiQuery({ name: 'doctorId', required: false })
  async listBlocks(
    @CurrentTenant() tenantId: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.service.listBlocks(tenantId, doctorId);
  }

  @Delete('blocks/:id')
  @ApiOperation({ summary: 'Remove an agenda block' })
  @ApiParam({ name: 'id', description: 'Block UUID' })
  async removeBlock(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeBlock(tenantId, id);
  }

  // ─── Queue / TV Panel ─────────────────────────────────────────────────────

  @Post('queue/call')
  @ApiOperation({ summary: 'Call patient to room (displays on TV panel)' })
  @ApiResponse({ status: 201, description: 'Patient called' })
  async callPatient(
    @CurrentTenant() tenantId: string,
    @Body() dto: CallPatientDto,
  ) {
    return this.service.callPatient(tenantId, dto);
  }

  @Get('queue')
  @ApiOperation({ summary: 'List queue calls for the day (TV panel feed)' })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date (defaults to today)' })
  async listQueue(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.service.listQueueCalls(tenantId, date);
  }

  @Get('queue/status')
  @ApiOperation({ summary: 'Get current queue status (pending, called, current number)' })
  async getQueueStatus(@CurrentTenant() tenantId: string) {
    return this.service.getQueueStatus(tenantId);
  }

  // ─── Walk-In / Encaixe ────────────────────────────────────────────────────

  @Post('walk-in')
  @ApiOperation({ summary: 'Register walk-in patient (encaixe)' })
  @ApiResponse({ status: 201, description: 'Walk-in registered with queue position' })
  async registerWalkIn(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterWalkInDto,
  ) {
    return this.service.registerWalkIn(tenantId, dto);
  }

  @Get('walk-in')
  @ApiOperation({ summary: 'List walk-in patients for the day' })
  @ApiQuery({ name: 'date', required: false })
  async listWalkIns(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.service.listWalkIns(tenantId, date);
  }

  // ─── Overbooking ─────────────────────────────────────────────────────────

  @Post('overbooking/calculate')
  @ApiOperation({ summary: 'Calculate allowed overbooking based on historical no-show rate' })
  async calculateOverbooking(
    @CurrentTenant() tenantId: string,
    @Body() dto: OverbookingConfigDto,
  ) {
    return this.service.calculateOverbooking(tenantId, dto);
  }

  @Post('overbooking/apply')
  @ApiOperation({ summary: 'Apply overbooking configuration for a doctor on a specific date' })
  @ApiResponse({ status: 201, description: 'Overbooking applied' })
  async applyOverbooking(
    @CurrentTenant() tenantId: string,
    @Body() dto: OverbookingConfigDto,
  ) {
    return this.service.applyOverbooking(tenantId, dto);
  }

  // ─── Multi-Resource Availability ─────────────────────────────────────────

  @Post('resources/check')
  @ApiOperation({ summary: 'Check simultaneous availability of doctor + room + equipment' })
  async checkMultiResource(
    @CurrentTenant() tenantId: string,
    @Body() dto: CheckMultiResourceDto,
  ) {
    return this.service.checkMultiResourceAvailability(tenantId, dto);
  }

  // ─── QR Code Check-In ─────────────────────────────────────────────────────

  @Post('checkin/qr/generate')
  @ApiOperation({ summary: 'Generate QR code for patient self-check-in' })
  @ApiResponse({ status: 201, description: 'QR code generated (valid 24h)' })
  async generateQr(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenerateQrCheckinDto,
  ) {
    return this.service.generateQrCheckin(tenantId, dto);
  }

  @Post('checkin/qr/process')
  @ApiOperation({ summary: 'Process QR code scan → sets appointment status to arrived' })
  @ApiResponse({ status: 201, description: 'Check-in processed' })
  async processQr(
    @CurrentTenant() tenantId: string,
    @Body() dto: ProcessQrCheckinDto,
  ) {
    return this.service.processQrCheckin(tenantId, dto);
  }

  // ─── Wait Time Dashboard ──────────────────────────────────────────────────

  @Get('dashboard/wait-times')
  @ApiOperation({ summary: 'Wait time dashboard: average by doctor, shift, weekday + bottlenecks' })
  async getWaitTimeDashboard(@CurrentTenant() tenantId: string) {
    return this.service.getWaitTimeDashboard(tenantId);
  }

  // ─── Wait Time Recording ─────────────────────────────────────────────────

  @Post('dashboard/wait-times/record')
  @ApiOperation({ summary: 'Record a wait time observation (called when patient is seen)' })
  @ApiResponse({ status: 201, description: 'Wait time recorded' })
  async recordWaitTime(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordWaitTimeDto,
  ) {
    await this.service.recordWaitTime(tenantId, dto.doctorId, dto.doctorName, dto.waitMinutes);
    return { recorded: true };
  }

  // ─── Waitlist Removal ────────────────────────────────────────────────────

  @Delete('waitlist/advanced/:id')
  @ApiOperation({ summary: 'Remove patient from advanced waitlist' })
  @ApiParam({ name: 'id', description: 'Waitlist entry UUID' })
  async removeFromWaitlist(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeFromAdvancedWaitlist(tenantId, id);
  }
}
