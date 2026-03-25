import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { SupplyChainService } from './supply-chain.service';
import {
  SupplyCategory,
  PurchaseOrderStatus,
  ContractStatus,
  CreateSupplyItemDto,
  CreatePurchaseOrderDto,
  ApprovePurchaseOrderDto,
  CreateContractDto,
} from './dto/supply-chain.dto';

@ApiTags('Supply Chain')
@ApiBearerAuth('access-token')
@Controller('supply-chain')
export class SupplyChainController {
  constructor(private readonly service: SupplyChainService) {}

  // ─── Supply Items ──────────────────────────────────────────────────────

  @Post('items')
  @ApiOperation({ summary: 'Create a supply item' })
  async createItem(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSupplyItemDto,
  ) {
    return this.service.createItem(tenantId, dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'List supply items with filters' })
  @ApiQuery({ name: 'category', required: false, enum: SupplyCategory })
  @ApiQuery({ name: 'belowReorder', required: false, type: Boolean })
  @ApiQuery({ name: 'expiringDays', required: false, type: Number })
  async listItems(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: SupplyCategory,
    @Query('belowReorder') belowReorder?: string,
    @Query('expiringDays') expiringDays?: string,
  ) {
    return this.service.listItems(tenantId, {
      category,
      belowReorder: belowReorder === 'true',
      expiringDays: expiringDays ? parseInt(expiringDays, 10) : undefined,
    });
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get supply item details' })
  @ApiParam({ name: 'id', description: 'Item UUID' })
  async getItem(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getItem(tenantId, id);
  }

  @Get('abc-analysis')
  @ApiOperation({ summary: 'Get ABC curve analysis' })
  async getAbcAnalysis(@CurrentTenant() tenantId: string) {
    return this.service.getAbcAnalysis(tenantId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get items expiring soon' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getExpiringItems(
    @CurrentTenant() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.service.getExpiringItems(tenantId, days ? parseInt(days, 10) : 30);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Supply chain dashboard' })
  async getDashboard(@CurrentTenant() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  // ─── Purchase Orders ───────────────────────────────────────────────────

  @Post('orders')
  @ApiOperation({ summary: 'Create purchase order' })
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.createPurchaseOrder(tenantId, user.sub, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseOrderStatus })
  async listOrders(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: PurchaseOrderStatus,
  ) {
    return this.service.listPurchaseOrders(tenantId, status);
  }

  @Post('orders/approve')
  @ApiOperation({ summary: 'Approve purchase order' })
  async approveOrder(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: ApprovePurchaseOrderDto,
  ) {
    return this.service.approvePurchaseOrder(tenantId, user.sub, dto.orderId, dto.approvalNotes);
  }

  @Post('orders/:id/receive')
  @ApiOperation({ summary: 'Receive purchase order and update stock' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async receiveOrder(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.receivePurchaseOrder(tenantId, id);
  }

  // ─── Contracts ─────────────────────────────────────────────────────────

  @Post('contracts')
  @ApiOperation({ summary: 'Create contract (insurer or supplier)' })
  async createContract(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.service.createContract(tenantId, dto);
  }

  @Get('contracts')
  @ApiOperation({ summary: 'List contracts' })
  @ApiQuery({ name: 'status', required: false, enum: ContractStatus })
  async listContracts(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: ContractStatus,
  ) {
    return this.service.listContracts(tenantId, status);
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Get contract details' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  async getContract(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getContract(tenantId, id);
  }

  @Get('contracts/expiring')
  @ApiOperation({ summary: 'List contracts expiring soon' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getExpiringContracts(
    @CurrentTenant() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.service.getExpiringContracts(tenantId, days ? parseInt(days, 10) : 60);
  }
}
