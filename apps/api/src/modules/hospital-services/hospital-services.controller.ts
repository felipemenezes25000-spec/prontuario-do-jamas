import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { HospitalServicesService } from './hospital-services.service';
import {
  ComplaintType, ComplaintStatus,
  CreateDietOrderDto, RecordLaundryDto, RecordWasteDto,
  CreateComplaintDto, LoanRecordDto, ReturnRecordDto,
} from './dto/hospital-services.dto';

@ApiTags('Hospital Services')
@ApiBearerAuth('access-token')
@Controller('hospital-services')
export class HospitalServicesController {
  constructor(private readonly service: HospitalServicesService) {}

  // ─── SND ───────────────────────────────────────────────────────────────

  @Post('snd/diets')
  @ApiOperation({ summary: 'Create diet order for patient' })
  async createDiet(@CurrentTenant() t: string, @Body() dto: CreateDietOrderDto) {
    return this.service.createDietOrder(t, dto);
  }

  @Get('snd/diets')
  @ApiOperation({ summary: 'List diet orders' })
  @ApiQuery({ name: 'patientId', required: false })
  async listDiets(@CurrentTenant() t: string, @Query('patientId') patientId?: string) {
    return this.service.listDietOrders(t, patientId);
  }

  @Get('snd/dashboard')
  @ApiOperation({ summary: 'SND dashboard — diet stats, portioning pending' })
  async sndDashboard(@CurrentTenant() t: string) {
    return this.service.getDietDashboard(t);
  }

  // ─── Laundry ───────────────────────────────────────────────────────────

  @Post('laundry')
  @ApiOperation({ summary: 'Record laundry batch (sector, weight, loss)' })
  async recordLaundry(@CurrentTenant() t: string, @Body() dto: RecordLaundryDto) {
    return this.service.recordLaundry(t, dto);
  }

  @Get('laundry/dashboard')
  @ApiOperation({ summary: 'Laundry dashboard — kg by sector, losses' })
  async laundryDashboard(@CurrentTenant() t: string) {
    return this.service.getLaundryDashboard(t);
  }

  // ─── Waste (PGRSS) ────────────────────────────────────────────────────

  @Post('waste')
  @ApiOperation({ summary: 'Record waste (ANVISA RDC 222 groups A-E)' })
  async recordWaste(@CurrentTenant() t: string, @Body() dto: RecordWasteDto) {
    return this.service.recordWaste(t, dto);
  }

  @Get('waste/dashboard')
  @ApiOperation({ summary: 'Waste management dashboard (PGRSS)' })
  async wasteDashboard(@CurrentTenant() t: string) {
    return this.service.getWasteDashboard(t);
  }

  // ─── Ombudsman ─────────────────────────────────────────────────────────

  @Post('ombudsman')
  @ApiOperation({ summary: 'Register complaint, compliment, or suggestion' })
  async createComplaint(@CurrentTenant() t: string, @Body() dto: CreateComplaintDto) {
    return this.service.createComplaint(t, dto);
  }

  @Get('ombudsman')
  @ApiOperation({ summary: 'List complaints/compliments/suggestions' })
  @ApiQuery({ name: 'status', required: false, enum: ComplaintStatus })
  @ApiQuery({ name: 'type', required: false, enum: ComplaintType })
  async listComplaints(
    @CurrentTenant() t: string,
    @Query('status') status?: ComplaintStatus,
    @Query('type') type?: ComplaintType,
  ) {
    return this.service.listComplaints(t, status, type);
  }

  @Post('ombudsman/:id/resolve')
  @ApiOperation({ summary: 'Resolve a complaint' })
  async resolveComplaint(
    @CurrentTenant() t: string,
    @Param('id') id: string,
    @Body('resolution') resolution: string,
  ) {
    return this.service.resolveComplaint(t, id, resolution);
  }

  @Get('ombudsman/dashboard')
  @ApiOperation({ summary: 'Ombudsman dashboard — counts, SLA, by type' })
  async ombudsmanDashboard(@CurrentTenant() t: string) {
    return this.service.getOmbudsmanDashboard(t);
  }

  // ─── SAME ──────────────────────────────────────────────────────────────

  @Post('same/loan')
  @ApiOperation({ summary: 'Loan physical medical record' })
  async loanRecord(@CurrentTenant() t: string, @Body() dto: LoanRecordDto) {
    return this.service.loanRecord(t, dto);
  }

  @Post('same/return')
  @ApiOperation({ summary: 'Return physical medical record' })
  async returnRecord(@CurrentTenant() t: string, @Body() dto: ReturnRecordDto) {
    return this.service.returnRecord(t, dto.recordNumber);
  }

  @Get('same/dashboard')
  @ApiOperation({ summary: 'SAME dashboard — records, loans, overdue' })
  async sameDashboard(@CurrentTenant() t: string) {
    return this.service.getSameDashboard(t);
  }
}
