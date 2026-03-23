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
} from '@nestjs/swagger';
import { InfectionControlService } from './infection-control.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import type { IsolationTypeValue } from './infection-control.service';

@ApiTags('Infection Control')
@ApiBearerAuth('access-token')
@Controller('infection-control')
export class InfectionControlController {
  constructor(
    private readonly infectionControlService: InfectionControlService,
  ) {}

  @Get('notifiable-diseases')
  @ApiOperation({ summary: 'Get list of notifiable diseases' })
  @ApiResponse({ status: 200, description: 'Disease list' })
  getNotifiableDiseases() {
    return this.infectionControlService.getNotifiableDiseases();
  }

  @Get('positive-cultures')
  @ApiOperation({ summary: 'Get recent positive cultures' })
  @ApiResponse({ status: 200, description: 'Paginated positive cultures' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Look back days (default 30)' })
  async getPositiveCultures(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('days') days?: string,
  ) {
    return this.infectionControlService.getPositiveCultures(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      days: days ? parseInt(days, 10) : undefined,
    });
  }

  @Get('isolation-patients')
  @ApiOperation({ summary: 'Get patients currently in isolation' })
  @ApiResponse({ status: 200, description: 'List of isolated patients' })
  async getIsolationPatients(
    @CurrentTenant() tenantId: string,
  ) {
    return this.infectionControlService.getIsolationPatients(tenantId);
  }

  @Post('isolation')
  @ApiOperation({ summary: 'Start isolation for an admitted patient' })
  @ApiResponse({ status: 201, description: 'Isolation started' })
  @ApiResponse({ status: 404, description: 'Admission not found' })
  @ApiResponse({ status: 400, description: 'Patient already in isolation' })
  async startIsolation(
    @CurrentTenant() tenantId: string,
    @Body() dto: { admissionId: string; isolationType: IsolationTypeValue; reason: string },
  ) {
    return this.infectionControlService.startIsolation(tenantId, dto);
  }

  @Patch('isolation/:admissionId/end')
  @ApiParam({ name: 'admissionId', description: 'Admission UUID' })
  @ApiOperation({ summary: 'End isolation for a patient' })
  @ApiResponse({ status: 200, description: 'Isolation ended' })
  @ApiResponse({ status: 404, description: 'Admission not found' })
  async endIsolation(
    @CurrentTenant() tenantId: string,
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
  ) {
    return this.infectionControlService.endIsolation(tenantId, admissionId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get CCIH dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data with charts' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.infectionControlService.getDashboard(tenantId);
  }

  @Post('notification')
  @ApiOperation({ summary: 'Register compulsory notification (notificação compulsória)' })
  @ApiResponse({ status: 201, description: 'Notification registered' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async createNotification(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      cidCode: string;
      disease: string;
      notificationDate: string;
      symptomsDate: string;
      confirmationCriteria: string;
      observations?: string;
    },
  ) {
    return this.infectionControlService.createNotification(tenantId, user.sub, dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get list of compulsory notifications sent' })
  @ApiResponse({ status: 200, description: 'Paginated notification list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getNotifications(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.infectionControlService.getNotifications(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
