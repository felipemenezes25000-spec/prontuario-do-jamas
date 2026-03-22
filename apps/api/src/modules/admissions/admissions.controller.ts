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
} from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';
import { BedsService } from './beds.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { DischargeDto } from './dto/discharge.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { BedStatus } from '@prisma/client';

@ApiTags('Admissions')
@ApiBearerAuth('access-token')
@Controller('admissions')
export class AdmissionsController {
  constructor(
    private readonly admissionsService: AdmissionsService,
    private readonly bedsService: BedsService,
  ) {}

  @Post('admit')
  @ApiOperation({ summary: 'Admit a patient' })
  @ApiResponse({ status: 201, description: 'Patient admitted' })
  async admit(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAdmissionDto,
  ) {
    return this.admissionsService.admit(tenantId, dto);
  }

  @Post(':id/discharge')
  @ApiOperation({ summary: 'Discharge a patient' })
  @ApiResponse({ status: 200, description: 'Patient discharged' })
  async discharge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DischargeDto,
  ) {
    return this.admissionsService.discharge(id, dto);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer patient to another bed' })
  @ApiResponse({ status: 200, description: 'Patient transferred' })
  async transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: TransferBedDto,
  ) {
    return this.admissionsService.transfer(id, user.sub, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active admissions' })
  @ApiResponse({ status: 200, description: 'Active admissions' })
  async findActive(@CurrentTenant() tenantId: string) {
    return this.admissionsService.findActive(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admission by ID' })
  @ApiResponse({ status: 200, description: 'Admission details' })
  @ApiResponse({ status: 404, description: 'Admission not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.admissionsService.findById(id);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get admissions by patient' })
  @ApiResponse({ status: 200, description: 'Patient admissions' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.admissionsService.findByPatient(patientId);
  }

  // --- Beds ---

  @Get('beds/all')
  @ApiOperation({ summary: 'Get all beds with filters' })
  @ApiResponse({ status: 200, description: 'List of beds' })
  async findAllBeds(
    @CurrentTenant() tenantId: string,
    @Query('ward') ward?: string,
    @Query('floor') floor?: string,
    @Query('status') status?: BedStatus,
  ) {
    return this.bedsService.findAll(tenantId, { ward, floor, status });
  }

  @Get('beds/available')
  @ApiOperation({ summary: 'Get available beds' })
  @ApiResponse({ status: 200, description: 'Available beds' })
  async findAvailableBeds(@CurrentTenant() tenantId: string) {
    return this.bedsService.findAvailable(tenantId);
  }

  @Get('beds/stats')
  @ApiOperation({ summary: 'Get bed occupancy statistics' })
  @ApiResponse({ status: 200, description: 'Occupancy stats' })
  async getBedStats(@CurrentTenant() tenantId: string) {
    return this.bedsService.getOccupancyStats(tenantId);
  }

  @Patch('beds/:id/status')
  @ApiOperation({ summary: 'Update bed status' })
  @ApiResponse({ status: 200, description: 'Bed status updated' })
  async updateBedStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: BedStatus,
  ) {
    return this.bedsService.updateStatus(id, status);
  }
}
