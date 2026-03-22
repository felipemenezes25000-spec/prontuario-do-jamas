import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Alerts')
@ApiBearerAuth('access-token')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a clinical alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAlertDto,
  ) {
    return this.alertsService.create(tenantId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active alerts for tenant' })
  @ApiResponse({ status: 200, description: 'Active alerts' })
  async findActive(@CurrentTenant() tenantId: string) {
    return this.alertsService.findActive(tenantId);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get alerts by patient' })
  @ApiResponse({ status: 200, description: 'Patient alerts' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.alertsService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findById(id);
  }

  @Patch(':id/acknowledge')
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiBody({ schema: { type: 'object', properties: { actionTaken: { type: 'string', description: 'Action taken on the alert' } } }, required: false })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body('actionTaken') actionTaken?: string,
  ) {
    return this.alertsService.acknowledge(id, user.sub, actionTaken);
  }

  @Patch(':id/resolve')
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.resolve(id, user.sub);
  }
}
