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
import { ProcurementService } from './procurement.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  CreateRequisitionDto,
  CreateQuotationDto,
  ApproveQuotationDto,
  CreatePurchaseOrderDto,
  RecordDeliveryDto,
} from './procurement.dto';

@ApiTags('Procurement (Compras)')
@ApiBearerAuth('access-token')
@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly procurementService: ProcurementService,
  ) {}

  @Post('requisitions')
  @ApiOperation({ summary: 'Create a purchase requisition' })
  @ApiResponse({ status: 201, description: 'Requisition created' })
  async createRequisition(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRequisitionDto,
  ) {
    return this.procurementService.createRequisition(tenantId, user.sub, dto);
  }

  @Get('requisitions')
  @ApiOperation({ summary: 'List purchase requisitions with filters' })
  @ApiResponse({ status: 200, description: 'Paginated requisition list' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listRequisitions(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.procurementService.listRequisitions(tenantId, {
      status,
      department,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('quotations')
  @ApiOperation({ summary: 'Add a supplier quotation to a requisition' })
  @ApiResponse({ status: 201, description: 'Quotation created' })
  @ApiResponse({ status: 404, description: 'Requisition not found' })
  async createQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.procurementService.createQuotation(tenantId, user.sub, dto);
  }

  @Get('requisitions/:id/compare')
  @ApiOperation({ summary: 'Compare all quotations for a requisition' })
  @ApiResponse({ status: 200, description: 'Quotation comparison' })
  @ApiParam({ name: 'id', description: 'Requisition UUID' })
  async compareQuotations(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.procurementService.compareQuotations(tenantId, id);
  }

  @Patch('quotations/approve')
  @ApiOperation({ summary: 'Approve the best quotation' })
  @ApiResponse({ status: 200, description: 'Quotation approved' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async approveQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveQuotationDto,
  ) {
    return this.procurementService.approveQuotation(tenantId, user.sub, dto);
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: 'Generate purchase order from approved quotation' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async createPurchaseOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.procurementService.createPurchaseOrder(tenantId, user.sub, dto);
  }

  @Patch('delivery')
  @ApiOperation({ summary: 'Record goods receipt for a purchase order' })
  @ApiResponse({ status: 200, description: 'Delivery recorded' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async recordDelivery(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordDeliveryDto,
  ) {
    return this.procurementService.recordDelivery(tenantId, user.sub, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get procurement KPIs dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.getDashboard(tenantId);
  }
}
