import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
import { EquipmentMaintenanceService } from './equipment-maintenance.service';
import {
  RegisterEquipmentDto,
  RecordMaintenanceDto,
  RecordCalibrationDto,
  EquipmentResponseDto,
  MaintenanceEventResponseDto,
  MaintenanceCalendarResponseDto,
  OverdueMaintenanceResponseDto,
} from './dto/equipment-maintenance.dto';

@ApiTags('Equipment Maintenance — CEME')
@ApiBearerAuth('access-token')
@Controller('equipment')
export class EquipmentMaintenanceController {
  constructor(private readonly equipmentService: EquipmentMaintenanceService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new equipment' })
  @ApiResponse({ status: 201, description: 'Equipment registered', type: EquipmentResponseDto })
  async register(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterEquipmentDto,
  ): Promise<EquipmentResponseDto> {
    return this.equipmentService.registerEquipment(tenantId, dto);
  }

  @Post(':id/maintenance')
  @ApiOperation({ summary: 'Record maintenance event' })
  @ApiParam({ name: 'id', description: 'Equipment UUID' })
  @ApiResponse({ status: 201, description: 'Maintenance recorded', type: MaintenanceEventResponseDto })
  async recordMaintenance(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordMaintenanceDto,
  ): Promise<MaintenanceEventResponseDto> {
    return this.equipmentService.recordMaintenance(tenantId, user.sub, id, dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get preventive maintenance calendar' })
  @ApiResponse({ status: 200, description: 'Maintenance calendar', type: MaintenanceCalendarResponseDto })
  async getCalendar(
    @CurrentTenant() tenantId: string,
  ): Promise<MaintenanceCalendarResponseDto> {
    return this.equipmentService.getCalendar(tenantId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get equipment maintenance history' })
  @ApiParam({ name: 'id', description: 'Equipment UUID' })
  @ApiResponse({ status: 200, description: 'Maintenance history', type: [MaintenanceEventResponseDto] })
  async getHistory(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceEventResponseDto[]> {
    return this.equipmentService.getHistory(tenantId, id);
  }

  @Post(':id/calibration')
  @ApiOperation({ summary: 'Record calibration event' })
  @ApiParam({ name: 'id', description: 'Equipment UUID' })
  @ApiResponse({ status: 201, description: 'Calibration recorded', type: MaintenanceEventResponseDto })
  async recordCalibration(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordCalibrationDto,
  ): Promise<MaintenanceEventResponseDto> {
    return this.equipmentService.recordCalibration(tenantId, user.sub, id, dto);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue maintenance alerts' })
  @ApiResponse({ status: 200, description: 'Overdue alerts', type: OverdueMaintenanceResponseDto })
  async getOverdue(
    @CurrentTenant() tenantId: string,
  ): Promise<OverdueMaintenanceResponseDto> {
    return this.equipmentService.getOverdue(tenantId);
  }
}
