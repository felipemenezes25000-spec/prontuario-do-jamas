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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulingEnhancedService } from './scheduling-enhanced.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  AddToWaitlistDto,
  BlockScheduleDto,
  RegisterWalkInDto,
  CheckMultiResourceDto,
  CallNextPatientDto,
  CreateRecurringScheduleDto,
  SmartSchedulingDto,
} from './scheduling-enhanced.dto';

@ApiTags('Scheduling — Enhanced')
@ApiBearerAuth('access-token')
@Controller('scheduling-enhanced')
export class SchedulingEnhancedController {
  constructor(private readonly service: SchedulingEnhancedService) {}

  @Post('send-confirmations')
  @ApiOperation({ summary: 'Send appointment confirmation reminders' })
  @ApiQuery({ name: 'hoursAhead', required: false, description: 'Hours ahead (default 24)' })
  async sendConfirmations(
    @CurrentTenant() tenantId: string,
    @Query('hoursAhead') hoursAhead?: string,
  ) {
    return this.service.sendConfirmationReminders(tenantId, hoursAhead ? parseInt(hoursAhead, 10) : 24);
  }

  // Waitlist
  @Post('waitlist')
  @ApiOperation({ summary: 'Add patient to waitlist' })
  async addToWaitlist(@CurrentTenant() tenantId: string, @Body() dto: AddToWaitlistDto) {
    return this.service.addToWaitlist(tenantId, dto);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'Get waitlist' })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  async getWaitlist(
    @CurrentTenant() tenantId: string,
    @Query('specialty') specialty?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.service.getWaitlist(tenantId, { specialty, doctorId });
  }

  // Schedule blocking
  @Post('block-schedule')
  @ApiOperation({ summary: 'Block doctor schedule (vacation, conference)' })
  async blockSchedule(@CurrentTenant() tenantId: string, @Body() dto: BlockScheduleDto) {
    return this.service.blockSchedule(tenantId, dto);
  }

  // Walk-in
  @Post('walk-in')
  @ApiOperation({ summary: 'Register walk-in / encaixe' })
  async registerWalkIn(@CurrentTenant() tenantId: string, @Body() dto: RegisterWalkInDto) {
    return this.service.registerWalkIn(tenantId, dto);
  }

  // Overbooking
  @Get('no-show-rate/:doctorId')
  @ApiOperation({ summary: 'Get no-show rate for a doctor' })
  @ApiParam({ name: 'doctorId' })
  async getNoShowRate(
    @CurrentTenant() tenantId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ) {
    return this.service.getNoShowRate(tenantId, doctorId);
  }

  @Get('overbooking-recommendation/:doctorId')
  @ApiOperation({ summary: 'Get overbooking recommendation' })
  @ApiParam({ name: 'doctorId' })
  async getOverbookingRecommendation(
    @CurrentTenant() tenantId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ) {
    return this.service.getOverbookingRecommendation(tenantId, doctorId);
  }

  // Multi-resource
  @Post('check-availability')
  @ApiOperation({ summary: 'Check multi-resource availability' })
  async checkMultiResource(
    @CurrentTenant() tenantId: string,
    @Body() dto: CheckMultiResourceDto,
  ) {
    return this.service.checkMultiResourceAvailability(tenantId, dto);
  }

  // QR Check-in
  @Post('qr-checkin/:appointmentId')
  @ApiOperation({ summary: 'QR Code / NFC auto check-in' })
  @ApiParam({ name: 'appointmentId' })
  async processQrCheckin(
    @CurrentTenant() tenantId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.service.processQrCheckin(tenantId, appointmentId);
  }

  // Wait time dashboard
  @Get('wait-time-stats')
  @ApiOperation({ summary: 'Wait time dashboard statistics' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getWaitTimeStats(
    @CurrentTenant() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getWaitTimeStats(tenantId, dateFrom, dateTo);
  }

  // Call queue
  @Get('call-queue')
  @ApiOperation({ summary: 'Reception call queue / TV display' })
  async getCallQueue(@CurrentTenant() tenantId: string) {
    return this.service.getCallQueue(tenantId);
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Call next patient from queue' })
  async callNextPatient(
    @CurrentTenant() tenantId: string,
    @Body() dto: CallNextPatientDto,
  ) {
    return this.service.callNextPatient(tenantId, dto.doctorId, dto.room);
  }

  // Recurring schedule
  @Post('recurring')
  @ApiOperation({ summary: 'Create recurring schedule (3/6/12 months with auto-reminders)' })
  async createRecurring(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRecurringScheduleDto,
  ) {
    return this.service.createRecurringSchedule(tenantId, dto);
  }

  // Smart scheduling (AI)
  @Post('smart-suggestion')
  @ApiOperation({ summary: 'AI-powered smart scheduling suggestion' })
  async getSmartSuggestion(
    @CurrentTenant() tenantId: string,
    @Body() dto: SmartSchedulingDto,
  ) {
    return this.service.getSmartSchedulingSuggestion(tenantId, dto);
  }
}
