import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { HospitalityService } from './hospitality.service';
import {
  CreateHousekeepingRequestDto,
  UpdateHousekeepingStatusDto,
  CreateLaundryOrderDto,
  RegisterCompanionDto,
  HousekeepingResponseDto,
  LaundryOrderResponseDto,
  CompanionResponseDto,
  HospitalityDashboardResponseDto,
} from './dto/hospitality.dto';

@ApiTags('Hospitality — Hotelaria Hospitalar')
@ApiBearerAuth('access-token')
@Controller('hospitality')
export class HospitalityController {
  constructor(private readonly hospitalityService: HospitalityService) {}

  @Post('housekeeping')
  @ApiOperation({ summary: 'Create housekeeping request' })
  @ApiResponse({ status: 201, type: HousekeepingResponseDto })
  async createHousekeeping(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateHousekeepingRequestDto,
  ): Promise<HousekeepingResponseDto> {
    return this.hospitalityService.createHousekeepingRequest(
      tenantId, user.sub, dto.location, dto.type, dto.room, dto.bedId, dto.priority, dto.notes,
    );
  }

  @Get('housekeeping/queue')
  @ApiOperation({ summary: 'Get housekeeping queue' })
  @ApiResponse({ status: 200, type: [HousekeepingResponseDto] })
  async getQueue(@CurrentTenant() tenantId: string): Promise<HousekeepingResponseDto[]> {
    return this.hospitalityService.getHousekeepingQueue(tenantId);
  }

  @Patch('housekeeping/:id')
  @ApiOperation({ summary: 'Update housekeeping request status' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, type: HousekeepingResponseDto })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHousekeepingStatusDto,
  ): Promise<HousekeepingResponseDto> {
    return this.hospitalityService.updateHousekeepingStatus(tenantId, id, dto.status, dto.notes, dto.assignedTo);
  }

  @Post('laundry')
  @ApiOperation({ summary: 'Create laundry order' })
  @ApiResponse({ status: 201, type: LaundryOrderResponseDto })
  async createLaundryOrder(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLaundryOrderDto,
  ): Promise<LaundryOrderResponseDto> {
    return this.hospitalityService.createLaundryOrder(
      tenantId, user.sub, dto.location, dto.itemType, dto.quantity, dto.notes,
    );
  }

  @Post('companion')
  @ApiOperation({ summary: 'Register patient companion' })
  @ApiResponse({ status: 201, type: CompanionResponseDto })
  async registerCompanion(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterCompanionDto,
  ): Promise<CompanionResponseDto> {
    return this.hospitalityService.registerCompanion(
      tenantId, user.sub, dto.patientId, dto.companionName, dto.companionCpf, dto.relationship, dto.phone, dto.badgeNumber,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Hospitality dashboard' })
  @ApiResponse({ status: 200, type: HospitalityDashboardResponseDto })
  async getDashboard(@CurrentTenant() tenantId: string): Promise<HospitalityDashboardResponseDto> {
    return this.hospitalityService.getDashboard(tenantId);
  }
}
