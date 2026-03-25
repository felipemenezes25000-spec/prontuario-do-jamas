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
import { RegulatoryReportsService } from './regulatory-reports.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { SubmitSinanDto, SubmitNotivisaDto } from './regulatory-reports.dto';

@ApiTags('Analytics — Regulatory Reports')
@ApiBearerAuth('access-token')
@Controller('analytics/regulatory')
export class RegulatoryReportsController {
  constructor(private readonly service: RegulatoryReportsService) {}

  @Post('sinan')
  @ApiOperation({ summary: 'Submit SINAN compulsory notification' })
  @ApiResponse({ status: 201, description: 'SINAN notification submitted' })
  async submitSinan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitSinanDto,
  ) {
    return this.service.submitSinan(tenantId, user.email, dto);
  }

  @Get('sinan')
  @ApiOperation({ summary: 'List SINAN notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'SINAN notifications list' })
  async listSinan(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listSinan(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
    });
  }

  @Get('ans-indicators')
  @ApiOperation({ summary: 'ANS required indicators (IDSS)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'ANS indicators data' })
  async getAnsIndicators(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getAnsIndicators(tenantId, { startDate, endDate });
  }

  @Post('notivisa')
  @ApiOperation({ summary: 'Submit NOTIVISA adverse event report' })
  @ApiResponse({ status: 201, description: 'NOTIVISA report submitted' })
  async submitNotivisa(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitNotivisaDto,
  ) {
    return this.service.submitNotivisa(tenantId, user.email, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Regulatory compliance dashboard' })
  @ApiResponse({ status: 200, description: 'Regulatory dashboard data' })
  async getRegulatoryDashboard(@CurrentTenant() tenantId: string) {
    return this.service.getRegulatoryDashboard(tenantId);
  }
}
