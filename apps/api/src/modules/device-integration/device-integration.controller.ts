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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DeviceIntegrationService } from './device-integration.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  RegisterDeviceDto,
  ReceiveVitalsDto,
  RegisterRemoteDeviceDto,
  ReceiveRemoteExamDataDto,
} from './dto/device-integration.dto';

@ApiTags('Device Integration — IEEE 11073 & Remote Exams')
@ApiBearerAuth('access-token')
@Controller('device-integration')
export class DeviceIntegrationController {
  constructor(private readonly service: DeviceIntegrationService) {}

  // =========================================================================
  // IEEE 11073 Multiparametric Monitor
  // =========================================================================

  @Post('devices')
  @ApiOperation({ summary: 'Register a multiparametric monitor (IEEE 11073)' })
  async registerDevice(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.service.registerDevice(tenantId, dto);
  }

  @Post('devices/:deviceId/vitals')
  @ApiOperation({ summary: 'Receive vital signs from a registered device' })
  @ApiParam({ name: 'deviceId', description: 'Device UUID' })
  async receiveVitals(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: ReceiveVitalsDto,
  ) {
    return this.service.receiveVitals(tenantId, deviceId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'List registered devices with optional filters' })
  @ApiQuery({ name: 'deviceType', required: false })
  @ApiQuery({ name: 'bedId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listDevices(
    @CurrentTenant() tenantId: string,
    @Query('deviceType') deviceType?: string,
    @Query('bedId') bedId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listDevices(tenantId, { deviceType, bedId, status });
  }

  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get device status and details' })
  @ApiParam({ name: 'deviceId', description: 'Device UUID' })
  async getDeviceStatus(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    return this.service.getDeviceStatus(tenantId, deviceId);
  }

  @Patch('devices/:deviceId/disconnect')
  @ApiOperation({ summary: 'Disconnect a device' })
  @ApiParam({ name: 'deviceId', description: 'Device UUID' })
  async disconnectDevice(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    return this.service.disconnectDevice(tenantId, deviceId);
  }

  // =========================================================================
  // Remote Exam Devices (Tyto Care / Eko)
  // =========================================================================

  @Post('remote-devices')
  @ApiOperation({ summary: 'Register a remote exam device (Tyto Care / Eko)' })
  async registerRemoteDevice(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterRemoteDeviceDto,
  ) {
    return this.service.registerRemoteDevice(tenantId, dto);
  }

  @Post('remote-devices/:deviceId/exam')
  @ApiOperation({ summary: 'Receive remote exam data from device' })
  @ApiParam({ name: 'deviceId', description: 'Remote device UUID' })
  async receiveRemoteExamData(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: ReceiveRemoteExamDataDto,
  ) {
    return this.service.receiveRemoteExamData(tenantId, deviceId, dto);
  }

  @Get('remote-exams/:patientId')
  @ApiOperation({ summary: 'List remote exams for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async listRemoteExams(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listRemoteExams(tenantId, patientId);
  }
}
