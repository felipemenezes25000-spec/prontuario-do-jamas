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
import { TransferCenterService } from './transfer-center.service';
import {
  CreateTransferRequestDto,
  TransferDecisionDto,
  TransferRequestResponseDto,
  AvailableBedsResponseDto,
  TransferDashboardResponseDto,
} from './dto/transfer-center.dto';

@ApiTags('Transfer Center')
@ApiBearerAuth('access-token')
@Controller('transfer')
export class TransferCenterController {
  constructor(private readonly transferService: TransferCenterService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request patient transfer' })
  @ApiResponse({ status: 201, type: TransferRequestResponseDto })
  async createRequest(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTransferRequestDto,
  ): Promise<TransferRequestResponseDto> {
    return this.transferService.createRequest(tenantId, user.sub, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List transfer requests' })
  @ApiResponse({ status: 200, type: [TransferRequestResponseDto] })
  async listRequests(@CurrentTenant() tenantId: string): Promise<TransferRequestResponseDto[]> {
    return this.transferService.listRequests(tenantId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept transfer request' })
  @ApiParam({ name: 'id', description: 'Transfer request UUID' })
  @ApiResponse({ status: 200, type: TransferRequestResponseDto })
  async accept(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferDecisionDto,
  ): Promise<TransferRequestResponseDto> {
    return this.transferService.acceptTransfer(tenantId, user.sub, id, dto.reason, dto.assignedBed);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject transfer request' })
  @ApiParam({ name: 'id', description: 'Transfer request UUID' })
  @ApiResponse({ status: 200, type: TransferRequestResponseDto })
  async reject(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferDecisionDto,
  ): Promise<TransferRequestResponseDto> {
    return this.transferService.rejectTransfer(tenantId, user.sub, id, dto.reason);
  }

  @Get('available-beds')
  @ApiOperation({ summary: 'Available beds across facilities' })
  @ApiResponse({ status: 200, type: AvailableBedsResponseDto })
  async getAvailableBeds(@CurrentTenant() tenantId: string): Promise<AvailableBedsResponseDto> {
    return this.transferService.getAvailableBeds(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Transfer center dashboard' })
  @ApiResponse({ status: 200, type: TransferDashboardResponseDto })
  async getDashboard(@CurrentTenant() tenantId: string): Promise<TransferDashboardResponseDto> {
    return this.transferService.getDashboard(tenantId);
  }
}
