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
import { QueueManagementService } from './queue-management.service';
import {
  IssueTicketDto,
  CallNextDto,
  UpdateTicketStatusDto,
  QueueTicketResponseDto,
  QueueDisplayResponseDto,
  QueueStatusResponseDto,
  WaitTimeResponseDto,
  QueueMetricsResponseDto,
} from './dto/queue-management.dto';

@ApiTags('Queue Management — Painel de Filas')
@ApiBearerAuth('access-token')
@Controller('queue')
export class QueueManagementController {
  constructor(private readonly queueService: QueueManagementService) {}

  @Post('ticket')
  @ApiOperation({ summary: 'Issue queue ticket (electronic password)' })
  @ApiResponse({ status: 201, type: QueueTicketResponseDto })
  async issueTicket(
    @CurrentTenant() tenantId: string,
    @Body() dto: IssueTicketDto,
  ): Promise<QueueTicketResponseDto> {
    return this.queueService.issueTicket(
      tenantId, dto.queueType, dto.patientId, dto.patientName, dto.service, dto.specialty,
    );
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Call next patient in queue' })
  @ApiResponse({ status: 201, type: QueueTicketResponseDto })
  async callNext(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: CallNextDto,
  ): Promise<QueueTicketResponseDto> {
    return this.queueService.callNext(tenantId, user.sub, dto.servicePoint, dto.preferredQueue, dto.service);
  }

  @Get('display')
  @ApiOperation({ summary: 'Display board data (for TV/totem)' })
  @ApiResponse({ status: 200, type: QueueDisplayResponseDto })
  async getDisplay(@CurrentTenant() tenantId: string): Promise<QueueDisplayResponseDto> {
    return this.queueService.getDisplay(tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Current queue status' })
  @ApiResponse({ status: 200, type: QueueStatusResponseDto })
  async getStatus(@CurrentTenant() tenantId: string): Promise<QueueStatusResponseDto> {
    return this.queueService.getStatus(tenantId);
  }

  @Get('wait-times')
  @ApiOperation({ summary: 'Wait time estimates per queue/service' })
  @ApiResponse({ status: 200, type: WaitTimeResponseDto })
  async getWaitTimes(@CurrentTenant() tenantId: string): Promise<WaitTimeResponseDto> {
    return this.queueService.getWaitTimes(tenantId);
  }

  @Patch('ticket/:id')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, type: QueueTicketResponseDto })
  async updateTicketStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<QueueTicketResponseDto> {
    return this.queueService.updateTicketStatus(tenantId, id, dto.status, dto.notes);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Queue metrics and analytics' })
  @ApiResponse({ status: 200, type: QueueMetricsResponseDto })
  async getMetrics(@CurrentTenant() tenantId: string): Promise<QueueMetricsResponseDto> {
    return this.queueService.getMetrics(tenantId);
  }
}
