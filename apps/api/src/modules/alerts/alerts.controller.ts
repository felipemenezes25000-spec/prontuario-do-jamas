import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiBody,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { AlertRulesService } from './alert-rules.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from './dto/create-alert-rule.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Alerts')
@ApiBearerAuth('access-token')
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly alertRulesService: AlertRulesService,
  ) {}

  // =========================================================================
  // ALERT RULES (CDS)
  // =========================================================================

  @Get('rules')
  @ApiOperation({ summary: 'List all clinical alert rules' })
  @ApiResponse({ status: 200, description: 'Alert rules list' })
  async findAllRules(@CurrentTenant() tenantId: string) {
    return this.alertRulesService.findAll(tenantId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a clinical alert rule' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAlertRuleDto,
  ) {
    return this.alertRulesService.create(tenantId, dto);
  }

  @Patch('rules/:id')
  @ApiParam({ name: 'id', description: 'Rule UUID' })
  @ApiOperation({ summary: 'Update a clinical alert rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertRulesService.update(id, dto);
  }

  @Delete('rules/:id')
  @ApiParam({ name: 'id', description: 'Rule UUID' })
  @ApiOperation({ summary: 'Delete a clinical alert rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertRulesService.remove(id);
  }

  // =========================================================================
  // ALERTS
  // =========================================================================

  @Get()
  @ApiOperation({ summary: 'List alerts with filters' })
  @ApiResponse({ status: 200, description: 'Paginated alerts list' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('isActive') isActive?: string,
    @Query('patientId') patientId?: string,
    @Query('encounterId') encounterId?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.findAll(tenantId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      patientId,
      encounterId,
      severity,
      page: page ? parseInt(page, 10) : undefined,
      limit: pageSize ? parseInt(pageSize, 10) : limit ? parseInt(limit, 10) : undefined,
    });
  }

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
