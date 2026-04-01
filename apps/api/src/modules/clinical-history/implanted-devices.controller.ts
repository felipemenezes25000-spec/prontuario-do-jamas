import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { ImplantedDevicesService } from './implanted-devices.service';
import { CreateImplantedDeviceDto, UpdateImplantedDeviceDto } from './dto/implanted-devices.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Implanted Devices')
@ApiBearerAuth('access-token')
@Controller('patients/:patientId/implanted-devices')
export class ImplantedDevicesController {
  constructor(private readonly service: ImplantedDevicesService) {}

  @Post()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Register an implanted device (stent, pacemaker, prosthesis, etc.)' })
  @ApiResponse({ status: 201, description: 'Device registered — MRI alert auto-created if unsafe' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateImplantedDeviceDto,
  ) {
    return this.service.create(tenantId, patientId, dto, user.sub);
  }

  @Get()
  @ApiParam({ name: 'patientId' })
  @ApiQuery({ name: 'activeOnly', required: false, description: 'Return only active implants' })
  @ApiOperation({ summary: 'List all implanted devices for a patient' })
  @ApiResponse({ status: 200, description: 'Implanted device list' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAll(tenantId, patientId, activeOnly === 'true');
  }

  @Get('mri-alerts')
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Get MRI safety status — lists all unsafe/conditional implants' })
  @ApiResponse({ status: 200, description: 'MRI safety summary' })
  async getMriAlerts(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getMriAlerts(tenantId, patientId);
  }

  @Get(':deviceId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'deviceId' })
  @ApiOperation({ summary: 'Get a single implanted device record' })
  @ApiResponse({ status: 200, description: 'Device detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    return this.service.findOne(tenantId, patientId, deviceId);
  }

  @Patch(':deviceId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'deviceId' })
  @ApiOperation({ summary: 'Update implanted device record (status, removal date, etc.)' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: UpdateImplantedDeviceDto,
  ) {
    return this.service.update(tenantId, patientId, deviceId, dto);
  }

  @Delete(':deviceId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'deviceId' })
  @ApiOperation({ summary: 'Delete an implanted device record' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    return this.service.remove(tenantId, patientId, deviceId);
  }
}
