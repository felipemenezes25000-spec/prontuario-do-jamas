import {
  Controller,
  Get,
  Post,
  Patch,
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
import { OnlineSchedulingService } from './online-scheduling.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import {
  ScheduleAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  JoinWaitlistDto,
  CreateRecurringScheduleDto,
} from './online-scheduling.dto';

@ApiTags('Patient Portal — Online Scheduling')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class OnlineSchedulingController {
  constructor(private readonly service: OnlineSchedulingService) {}

  @Get('specialties')
  @ApiOperation({ summary: 'List available specialties' })
  @ApiResponse({ status: 200, description: 'Specialties list' })
  async getSpecialties(@CurrentTenant() tenantId: string) {
    return this.service.getSpecialties(tenantId);
  }

  @Get('doctors-by-specialty')
  @ApiOperation({ summary: 'List doctors by specialty' })
  @ApiQuery({ name: 'specialty', required: true })
  @ApiResponse({ status: 200, description: 'Doctors for specialty' })
  async getDoctorsBySpecialty(
    @CurrentTenant() tenantId: string,
    @Query('specialty') specialty: string,
  ) {
    return this.service.getDoctorsBySpecialty(tenantId, specialty);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get real-time doctor availability' })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Available slots returned' })
  async getAvailableSlots(
    @CurrentTenant() tenantId: string,
    @Query('doctorId') doctorId?: string,
    @Query('specialty') specialty?: string,
    @Query('date') date?: string,
  ) {
    return this.service.getAvailableSlots(tenantId, doctorId, specialty, date);
  }

  @Get('available-dates')
  @ApiOperation({ summary: 'Get available dates for a doctor in a month' })
  @ApiQuery({ name: 'doctorId', required: true })
  @ApiQuery({ name: 'month', required: true, description: 'YYYY-MM' })
  @ApiResponse({ status: 200, description: 'Available dates' })
  async getAvailableDates(
    @CurrentTenant() tenantId: string,
    @Query('doctorId') doctorId: string,
    @Query('month') month: string,
  ) {
    return this.service.getAvailableDates(tenantId, doctorId, month);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment scheduled' })
  async scheduleAppointment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ScheduleAppointmentDto,
  ) {
    return this.service.scheduleAppointment(tenantId, user.email, dto);
  }

  @Patch('schedule/:id/confirm')
  @ApiOperation({ summary: 'Confirm an appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 200, description: 'Appointment confirmed' })
  async confirmAppointment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.confirmAppointment(tenantId, user.email, id);
  }

  @Patch('schedule/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule an appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 200, description: 'Appointment rescheduled' })
  async rescheduleAppointment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.service.rescheduleAppointment(tenantId, user.email, id, dto);
  }

  @Delete('schedule/:id')
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled' })
  async cancelAppointment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.service.cancelAppointment(tenantId, user.email, id, dto.reason);
  }

  // =========================================================================
  // Waitlist
  // =========================================================================

  @Post('waitlist')
  @ApiOperation({ summary: 'Join waitlist when no availability' })
  @ApiResponse({ status: 201, description: 'Added to waitlist' })
  async joinWaitlist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: JoinWaitlistDto,
  ) {
    return this.service.joinWaitlist(tenantId, user.email, dto);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'Get my waitlist entries' })
  @ApiResponse({ status: 200, description: 'Waitlist entries' })
  async getMyWaitlist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getMyWaitlistEntries(tenantId, user.email);
  }

  @Delete('waitlist/:id')
  @ApiOperation({ summary: 'Remove from waitlist' })
  @ApiParam({ name: 'id', description: 'Waitlist entry UUID' })
  @ApiResponse({ status: 200, description: 'Removed from waitlist' })
  async removeFromWaitlist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.removeFromWaitlist(tenantId, user.email, id);
  }

  // =========================================================================
  // Recurring scheduling
  // =========================================================================

  @Post('recurring-schedule')
  @ApiOperation({ summary: 'Create recurring appointment schedule' })
  @ApiResponse({ status: 201, description: 'Recurring schedule created' })
  async createRecurringSchedule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRecurringScheduleDto,
  ) {
    return this.service.createRecurringSchedule(tenantId, user.email, dto);
  }

  @Get('recurring-schedule')
  @ApiOperation({ summary: 'Get my recurring schedules' })
  @ApiResponse({ status: 200, description: 'Recurring schedules' })
  async getRecurringSchedules(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getRecurringSchedules(tenantId, user.email);
  }

  @Delete('recurring-schedule/:id')
  @ApiOperation({ summary: 'Cancel recurring schedule' })
  @ApiParam({ name: 'id', description: 'Recurring schedule UUID' })
  @ApiResponse({ status: 200, description: 'Recurring schedule cancelled' })
  async cancelRecurringSchedule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancelRecurringSchedule(tenantId, user.email, id);
  }
}
