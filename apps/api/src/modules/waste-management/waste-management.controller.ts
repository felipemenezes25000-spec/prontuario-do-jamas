import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WasteManagementService } from './waste-management.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RegisterWasteDto,
  WeighingRecordDto,
  DisposalRecordDto,
} from './waste-management.dto';

@ApiTags('Waste Management (PGRSS)')
@ApiBearerAuth('access-token')
@Controller('waste-management')
export class WasteManagementController {
  constructor(
    private readonly wasteManagementService: WasteManagementService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register waste with classification per RDC 222' })
  @ApiResponse({ status: 201, description: 'Waste registered' })
  async registerWaste(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterWasteDto,
  ) {
    return this.wasteManagementService.registerWaste(tenantId, user.sub, dto);
  }

  @Post('weighing')
  @ApiOperation({ summary: 'Record container weighing' })
  @ApiResponse({ status: 201, description: 'Weighing recorded' })
  async recordWeighing(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: WeighingRecordDto,
  ) {
    return this.wasteManagementService.recordWeighing(tenantId, user.sub, dto);
  }

  @Post('disposal')
  @ApiOperation({ summary: 'Record disposal with transport manifest' })
  @ApiResponse({ status: 201, description: 'Disposal recorded' })
  async recordDisposal(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DisposalRecordDto,
  ) {
    return this.wasteManagementService.recordDisposal(tenantId, user.sub, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get PGRSS dashboard with KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.wasteManagementService.getDashboard(tenantId);
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Get detailed monthly PGRSS report' })
  @ApiResponse({ status: 200, description: 'Monthly report' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async getMonthlyReport(
    @CurrentTenant() tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.wasteManagementService.getMonthlyReport(
      tenantId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('pending-disposals')
  @ApiOperation({ summary: 'List containers awaiting pickup/disposal' })
  @ApiResponse({ status: 200, description: 'Pending disposals list' })
  async listPendingDisposals(
    @CurrentTenant() tenantId: string,
  ) {
    return this.wasteManagementService.listPendingDisposals(tenantId);
  }
}
