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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OmbudsmanService } from './ombudsman.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateComplaintDto, RespondComplaintDto } from './ombudsman.dto';

@ApiTags('Ombudsman (Ouvidoria)')
@ApiBearerAuth('access-token')
@Controller('ombudsman')
export class OmbudsmanController {
  constructor(
    private readonly ombudsmanService: OmbudsmanService,
  ) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new ombudsman ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created with auto-number' })
  async createTicket(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.ombudsmanService.createTicket(tenantId, user.sub, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List ombudsman tickets with filters' })
  @ApiResponse({ status: 200, description: 'Paginated ticket list' })
  @ApiQuery({ name: 'type', required: false, enum: ['COMPLAINT', 'PRAISE', 'SUGGESTION', 'QUESTION'] })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'IN_PROGRESS', 'FORWARDED', 'RESOLVED', 'CLOSED'] })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listTickets(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ombudsmanService.listTickets(tenantId, {
      type,
      status,
      department,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Patch('tickets/:id/respond')
  @ApiOperation({ summary: 'Respond to a ticket and update status' })
  @ApiResponse({ status: 200, description: 'Response added' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async respondTicket(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondComplaintDto,
  ) {
    return this.ombudsmanService.respondTicket(tenantId, id, user.sub, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get ombudsman KPIs dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.ombudsmanService.getDashboard(tenantId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate monthly ombudsman report' })
  @ApiResponse({ status: 200, description: 'Monthly report' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async generateReport(
    @CurrentTenant() tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.ombudsmanService.generateReport(
      tenantId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }
}
