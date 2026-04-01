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
import { SchedulingEnhancedService } from './scheduling-enhanced.service';
import {
  AddToWaitlistDto,
  SendReminderDto,
  ProcessReminderResponseDto,
  ReminderConfigDto,
  ProcessQRCheckInDto,
} from './dto/scheduling-enhanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Appointments — Scheduling Enhanced (Waitlist, Reminders, QR Check-in)')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class SchedulingEnhancedController {
  constructor(private readonly service: SchedulingEnhancedService) {}

  // ─── Waitlist ─────────────────────────────────────────────────────────────

  @Post('waitlist')
  @ApiOperation({ summary: 'Add patient to specialty waitlist' })
  @ApiResponse({ status: 201, description: 'Patient added to waitlist' })
  async addToWaitlist(
    @CurrentTenant() tenantId: string,
    @Body() dto: AddToWaitlistDto,
  ) {
    return this.service.addToWaitlist(tenantId, dto);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'List waitlist entries (sorted by urgency then date)' })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filter by specialty' })
  @ApiResponse({ status: 200, description: 'Waitlist entries' })
  async getWaitlist(
    @CurrentTenant() tenantId: string,
    @Query('specialty') specialty?: string,
  ) {
    return this.service.getWaitlist(tenantId, specialty);
  }

  @Post('waitlist/:id/notify')
  @ApiParam({ name: 'id', description: 'Waitlist entry UUID' })
  @ApiOperation({ summary: 'Notify waitlist patient that a slot is available' })
  @ApiResponse({ status: 200, description: 'Patient notified' })
  async notifyWaitlistPatient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.notifyWaitlistPatient(tenantId, id);
  }

  @Post('waitlist/:id/book')
  @ApiParam({ name: 'id', description: 'Waitlist entry UUID' })
  @ApiOperation({ summary: 'Book appointment from waitlist entry' })
  @ApiResponse({ status: 200, description: 'Appointment booked from waitlist' })
  async bookFromWaitlist(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.bookFromWaitlist(tenantId, id);
  }

  @Delete('waitlist/:id')
  @ApiParam({ name: 'id', description: 'Waitlist entry UUID' })
  @ApiOperation({ summary: 'Remove patient from waitlist' })
  @ApiResponse({ status: 200, description: 'Patient removed from waitlist' })
  async removeFromWaitlist(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.removeFromWaitlist(tenantId, id);
  }

  // ─── Reminders ────────────────────────────────────────────────────────────

  @Post('reminders/send')
  @ApiOperation({ summary: 'Send appointment reminder (SMS, WhatsApp, Email, Push)' })
  @ApiResponse({ status: 201, description: 'Reminder sent' })
  async sendReminder(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendReminderDto,
  ) {
    return this.service.sendAppointmentReminder(tenantId, dto);
  }

  @Post('reminders/response')
  @ApiOperation({ summary: 'Process patient response to reminder (CONFIRMED, CANCELLED, RESCHEDULED)' })
  @ApiResponse({ status: 200, description: 'Response processed' })
  async processResponse(
    @CurrentTenant() tenantId: string,
    @Body() dto: ProcessReminderResponseDto,
  ) {
    return this.service.processReminderResponse(tenantId, dto);
  }

  @Get('reminders/no-show-rate')
  @ApiOperation({ summary: 'Get no-show rate statistics' })
  @ApiQuery({ name: 'doctorId', required: false, description: 'Filter by doctor' })
  @ApiResponse({ status: 200, description: 'No-show rate' })
  async getNoShowRate(
    @CurrentTenant() tenantId: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.service.getNoShowRate(tenantId, doctorId);
  }

  @Post('reminders/configure')
  @ApiOperation({ summary: 'Configure reminder settings (timing, channels, template)' })
  @ApiResponse({ status: 200, description: 'Configuration saved' })
  async configureReminders(
    @CurrentTenant() tenantId: string,
    @Body() dto: ReminderConfigDto,
  ) {
    return this.service.configureReminders(tenantId, dto);
  }

  // ─── QR Check-in ──────────────────────────────────────────────────────────

  @Post('check-in/generate-qr/:appointmentId')
  @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
  @ApiOperation({ summary: 'Generate QR code for patient self-check-in' })
  @ApiResponse({ status: 201, description: 'QR check-in token generated' })
  async generateCheckInQR(
    @CurrentTenant() tenantId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.service.generateCheckInQR(tenantId, appointmentId);
  }

  @Post('check-in/qr')
  @ApiOperation({ summary: 'Process QR code check-in (validate token, assign queue position)' })
  @ApiResponse({ status: 200, description: 'Patient checked in' })
  async processQRCheckIn(
    @CurrentTenant() tenantId: string,
    @Body() dto: ProcessQRCheckInDto,
  ) {
    return this.service.processQRCheckIn(tenantId, dto);
  }

  @Get('check-in/queue-status')
  @ApiOperation({ summary: 'Get current queue status (by doctor or specialty)' })
  @ApiQuery({ name: 'doctorId', required: false, description: 'Filter by doctor' })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filter by specialty' })
  @ApiQuery({ name: 'date', required: false, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Queue status' })
  async getQueueStatus(
    @CurrentTenant() tenantId: string,
    @Query('doctorId') doctorId?: string,
    @Query('specialty') specialty?: string,
    @Query('date') date?: string,
  ) {
    return this.service.getQueueStatus(tenantId, doctorId, specialty, date);
  }
}
