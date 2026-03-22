import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { Public } from '../../common/decorators/public.decorator';

interface CreateBookingBody {
  doctorId: string;
  date: string;
  time: string;
  patientName: string;
  patientCpf: string;
  patientPhone: string;
  insuranceProvider?: string;
}

@Public()
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get(':tenantSlug/specialties')
  async getSpecialties(@Param('tenantSlug') tenantSlug: string) {
    return this.bookingService.getSpecialties(tenantSlug);
  }

  @Get(':tenantSlug/doctors')
  async getDoctors(
    @Param('tenantSlug') tenantSlug: string,
    @Query('specialty') specialty?: string,
  ) {
    return this.bookingService.getDoctors(tenantSlug, specialty);
  }

  @Get(':tenantSlug/slots')
  async getAvailableSlots(
    @Param('tenantSlug') tenantSlug: string,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailableSlots(tenantSlug, doctorId, date);
  }

  @Post(':tenantSlug/appointments')
  async createAppointment(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: CreateBookingBody,
  ) {
    return this.bookingService.createAppointment(tenantSlug, body);
  }
}
