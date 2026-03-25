import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreateReminderDto } from './reminders.dto';

@ApiTags('Patient Portal — Reminders')
@ApiBearerAuth('access-token')
@Controller('patient-portal/reminders')
export class RemindersController {
  constructor(private readonly service: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reminder' })
  @ApiResponse({ status: 201, description: 'Reminder created' })
  async createReminder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReminderDto,
  ) {
    return this.service.createReminder(tenantId, user.email, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List patient reminders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Paginated reminders' })
  async listReminders(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listReminders(tenantId, user.email, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a reminder' })
  @ApiParam({ name: 'id', description: 'Reminder UUID' })
  @ApiResponse({ status: 200, description: 'Reminder cancelled' })
  async cancelReminder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancelReminder(tenantId, user.email, id);
  }

  @Post('generate-appointment-reminders')
  @ApiOperation({ summary: 'Generate automatic appointment reminders for tomorrow' })
  @ApiResponse({ status: 201, description: 'Reminders generated' })
  async generateAppointmentReminders(
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.generateAppointmentReminders(tenantId);
  }
}
