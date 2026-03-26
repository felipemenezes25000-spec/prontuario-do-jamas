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
import { ContractsService } from './contracts.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateContractDto, RenewContractDto } from './contracts.dto';

@ApiTags('Contracts (Contratos)')
@ApiBearerAuth('access-token')
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract with auto-number' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  async createContract(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.createContract(tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contracts with filters' })
  @ApiResponse({ status: 200, description: 'Paginated contract list' })
  @ApiQuery({ name: 'type', required: false, enum: ['SUPPLIER', 'INSURANCE', 'SERVICE', 'MAINTENANCE'] })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED', 'CANCELLED'] })
  @ApiQuery({ name: 'expiring', required: false, type: Boolean, description: 'Filter only expiring contracts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listContracts(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('expiring') expiring?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contractsService.listContracts(tenantId, {
      type,
      status,
      expiring: expiring === 'true',
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get contracts expiring in next N days' })
  @ApiResponse({ status: 200, description: 'Expiring contracts list' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days ahead (default 90)' })
  async getExpiringContracts(
    @CurrentTenant() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.contractsService.getExpiringContracts(
      tenantId,
      days ? parseInt(days, 10) : 90,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get contracts KPIs dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.contractsService.getDashboard(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract detail with history' })
  @ApiResponse({ status: 200, description: 'Contract detail' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  async getContract(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.getContract(tenantId, id);
  }

  @Patch(':id/renew')
  @ApiOperation({ summary: 'Renew a contract with optional value adjustment' })
  @ApiResponse({ status: 200, description: 'Contract renewed' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  async renewContract(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewContractDto,
  ) {
    return this.contractsService.renewContract(tenantId, id, dto);
  }
}
