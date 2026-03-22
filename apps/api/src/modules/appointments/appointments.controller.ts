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
  ApiBody,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule an appointment' })
  @ApiResponse({ status: 201, description: 'Appointment scheduled' })
  async schedule(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.schedule(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of appointments' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryAppointmentDto,
  ) {
    return this.appointmentsService.findAll(tenantId, query);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available appointment slots for a doctor on a date' })
  @ApiQuery({ name: 'doctorId', required: true, description: 'Doctor UUID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)', example: '2026-03-22' })
  @ApiResponse({ status: 200, description: 'Available slots' })
  async getAvailableSlots(
    @CurrentTenant() tenantId: string,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(tenantId, doctorId, date);
  }

  @Get('by-doctor/:doctorId')
  @ApiParam({ name: 'doctorId', description: 'Doctor UUID' })
  @ApiQuery({ name: 'dateFrom', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiOperation({ summary: 'Get appointments by doctor for a date range' })
  @ApiResponse({ status: 200, description: 'Doctor appointments' })
  async findByDoctor(
    @CurrentTenant() tenantId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.appointmentsService.findByDoctor(tenantId, doctorId, dateFrom, dateTo);
  }

  @Get('by-patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get appointments by patient' })
  @ApiResponse({ status: 200, description: 'Patient appointments' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.appointmentsService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiResponse({ status: 200, description: 'Appointment details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id/confirm')
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOperation({ summary: 'Confirm an appointment' })
  @ApiResponse({ status: 200, description: 'Appointment confirmed' })
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.confirm(id);
  }

  @Patch(':id/cancel')
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiBody({ schema: { type: 'object', properties: { cancellationReason: { type: 'string', description: 'Reason for cancellation' } }, required: ['cancellationReason'] } })
  @ApiResponse({ status: 200, description: 'Appointment cancelled' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('cancellationReason') cancellationReason: string,
  ) {
    return this.appointmentsService.cancel(id, cancellationReason);
  }

  @Patch(':id/reschedule')
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOperation({ summary: 'Reschedule an appointment' })
  @ApiResponse({ status: 200, description: 'Appointment rescheduled' })
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(id, dto);
  }
}
