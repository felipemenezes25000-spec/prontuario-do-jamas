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
import { PatientMessagingService } from './patient-messaging.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { SendMessageDto } from './patient-messaging.dto';

@ApiTags('Patient Portal — Messaging')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class PatientMessagingController {
  constructor(private readonly service: PatientMessagingService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send message to care team' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(tenantId, user.email, dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Message inbox' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Paginated message threads' })
  async getInbox(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getInbox(tenantId, user.email, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('messages/:threadId')
  @ApiOperation({ summary: 'Get message thread' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  @ApiResponse({ status: 200, description: 'Message thread' })
  async getThread(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('threadId', ParseUUIDPipe) threadId: string,
  ) {
    return this.service.getThread(tenantId, user.email, threadId);
  }

  @Patch('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markAsRead(tenantId, user.email, id);
  }
}
