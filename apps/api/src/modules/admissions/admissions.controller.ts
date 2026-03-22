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
import { AdmissionsService, FindAllAdmissionsOptions } from './admissions.service';
import { BedsService } from './beds.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { DischargeDto } from './dto/discharge.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { ReverseDischargeDto } from './dto/reverse-discharge.dto';
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
  @ApiParam({ name: 'id', description: 'Admission UUID' })
  @ApiOperation({ summary: 'Discharge a patient' })
  @ApiResponse({ status: 200, description: 'Patient discharged' })
  async discharge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DischargeDto,
  ) {
    return this.admissionsService.discharge(id, dto);
  }

  @Post(':id/transfer')
  @ApiParam({ name: 'id', description: 'Admission UUID' })
  @ApiOperation({ summary: 'Transfer patient to another bed' })
  @ApiResponse({ status: 200, description: 'Patient transferred' })
  async transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: TransferBedDto,
  ) {
    return this.admissionsService.transfer(id, user.sub, dto);
  }

  @Post(':id/reverse-discharge')
  @ApiParam({ name: 'id', description: 'Admission UUID' })
  @ApiOperation({ summary: 'Reverse a patient discharge (within 2h window)' })
  @ApiResponse({ status: 200, description: 'Discharge reversed' })
  @ApiResponse({ status: 400, description: 'Reversal window expired or not discharged' })
  @ApiResponse({ status: 404, description: 'Admission not found' })
  async reverseDischarge(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseDischargeDto,
  ) {
    return this.admissionsService.reverseDischarge(tenantId, id, dto.reason);
  }

  @Get()
  @ApiOperation({ summary: 'List admissions with filters and pagination' })
  @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient UUID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (ACTIVE | DISCHARGED)' })
  @ApiQuery({ name: 'ward', required: false, description: 'Filter by ward' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of admissions' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('ward') ward?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const resolvedPageSize = limit ? parseInt(limit, 10) : pageSize ? parseInt(pageSize, 10) : 20;
    return this.admissionsService.findAll(tenantId, {
      patientId,
      status,
      ward,
      page: page ? parseInt(page, 10) : 1,
      pageSize: resolvedPageSize,
    } satisfies FindAllAdmissionsOptions);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active admissions' })
  @ApiResponse({ status: 200, description: 'Active admissions' })
  async findActive(@CurrentTenant() tenantId: string) {
    return this.admissionsService.findActive(tenantId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Admission UUID' })
  @ApiOperation({ summary: 'Get admission by ID' })
  @ApiResponse({ status: 200, description: 'Admission details' })
  @ApiResponse({ status: 404, description: 'Admission not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.admissionsService.findById(id);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
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
  @ApiQuery({ name: 'ward', required: false, description: 'Filter by ward' })
  @ApiQuery({ name: 'floor', required: false, description: 'Filter by floor' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by bed status' })
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
  @ApiParam({ name: 'id', description: 'Bed UUID' })
  @ApiOperation({ summary: 'Update bed status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', description: 'New bed status' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Bed status updated' })
  async updateBedStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: BedStatus,
  ) {
    return this.bedsService.updateStatus(id, status);
  }
}
