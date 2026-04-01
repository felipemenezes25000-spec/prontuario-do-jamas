import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { HospitalManagementService } from './hospital-management.service';
import {
  SupplyInventoryDto,
  SndDto,
  LaundryDto,
  WasteManagementDto,
  ProcurementDto,
  ContractManagementDto,
  OmbudsmanDto,
  SameDto,
  SupplyLowStockQueryDto,
  ProcurementListQueryDto,
  ContractExpiryQueryDto,
  OmbudsmanTicketStatus,
  SupplyRequisitionDto,
  EquipmentWorkOrderDto,
} from './dto/hospital-management.dto';

@ApiTags('Hospital Management')
@ApiBearerAuth('access-token')
@Controller('hospital-management')
export class HospitalManagementController {
  constructor(private readonly service: HospitalManagementService) {}

  // =========================================================================
  // Supply Chain Overview
  // =========================================================================

  @Get('supply-chain')
  @ApiOperation({ summary: 'Get supply/inventory overview — stock levels, alerts, near-expiry' })
  @ApiResponse({ status: 200, description: 'Supply chain overview' })
  async getSupplyChainOverview(@CurrentTenant() tenantId: string) {
    return this.service.getSupplyChainOverview(tenantId);
  }

  @Post('supply-chain/requisition')
  @ApiOperation({ summary: 'Create a supply requisition' })
  @ApiResponse({ status: 201, description: 'Requisition created' })
  async createRequisition(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SupplyRequisitionDto,
  ) {
    return this.service.createSupplyRequisition(tenantId, user.sub, dto);
  }

  // =========================================================================
  // CME (Central de Material e Esterilização)
  // =========================================================================

  @Get('cme')
  @ApiOperation({ summary: 'Get CME (sterilization) tracking — active cycles, processed items, quality indicators' })
  @ApiResponse({ status: 200, description: 'CME tracking data' })
  async getCme(@CurrentTenant() tenantId: string) {
    return this.service.getCmeTracking(tenantId);
  }

  // =========================================================================
  // Equipment Maintenance
  // =========================================================================

  @Get('equipment')
  @ApiOperation({ summary: 'Get equipment maintenance overview — scheduled, overdue, active work orders' })
  @ApiResponse({ status: 200, description: 'Equipment maintenance data' })
  async getEquipment(@CurrentTenant() tenantId: string) {
    return this.service.getEquipmentOverview(tenantId);
  }

  @Post('equipment/work-order')
  @ApiOperation({ summary: 'Create equipment work order (corrective or preventive maintenance)' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  async createWorkOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EquipmentWorkOrderDto,
  ) {
    return this.service.createEquipmentWorkOrder(tenantId, user.sub, dto);
  }

  // =========================================================================
  // Food Service (SND overview)
  // =========================================================================

  @Get('food-service')
  @ApiOperation({ summary: 'Get SND (Nutrition & Dietetics) overview — active diets, meal stats' })
  @ApiResponse({ status: 200, description: 'Food service overview' })
  async getFoodService(@CurrentTenant() tenantId: string) {
    return this.service.getFoodServiceOverview(tenantId);
  }

  // =========================================================================
  // Laundry Overview
  // =========================================================================

  @Get('laundry')
  @ApiOperation({ summary: 'Get laundry management overview — processing stats, stock levels' })
  @ApiResponse({ status: 200, description: 'Laundry overview' })
  async getLaundry(@CurrentTenant() tenantId: string) {
    return this.service.getLaundryOverview(tenantId);
  }

  // =========================================================================
  // Housekeeping
  // =========================================================================

  @Get('housekeeping')
  @ApiOperation({ summary: 'Get housekeeping/room turnover overview — pending cleanings, turnaround times' })
  @ApiResponse({ status: 200, description: 'Housekeeping overview' })
  async getHousekeeping(@CurrentTenant() tenantId: string) {
    return this.service.getHousekeepingOverview(tenantId);
  }

  // =========================================================================
  // Waste Overview
  // =========================================================================

  @Get('waste')
  @ApiOperation({ summary: 'Get waste management (PGRSS) overview' })
  @ApiResponse({ status: 200, description: 'Waste management overview' })
  async getWasteOverview(@CurrentTenant() tenantId: string) {
    return this.service.getWasteOverview(tenantId);
  }

  // =========================================================================
  // Supply Inventory
  // =========================================================================

  @Post('supply')
  @ApiOperation({ summary: 'Create or update supply item (stock, reorder point, lot, expiry, ABC curve)' })
  @ApiResponse({ status: 201, description: 'Supply item saved — low stock and near-expiry alerts returned' })
  async upsertSupply(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SupplyInventoryDto,
  ) {
    return this.service.upsertSupplyItem(tenantId, user.sub, dto);
  }

  @Post('supply/low-stock')
  @ApiOperation({ summary: 'List items below reorder point — filter by category or ABC curve' })
  @ApiResponse({ status: 200, description: 'List of low-stock items' })
  async getLowStock(
    @CurrentTenant() tenantId: string,
    @Body() query: SupplyLowStockQueryDto,
  ) {
    return this.service.getLowStockItems(tenantId, query);
  }

  // =========================================================================
  // SND — Nutrition & Dietetics
  // =========================================================================

  @Post('snd/prescription')
  @ApiOperation({ summary: 'Record SND diet prescription (diet type, restrictions, menu, portioning)' })
  @ApiResponse({ status: 201, description: 'Diet prescription created' })
  async recordSnd(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SndDto,
  ) {
    return this.service.recordSndPrescription(tenantId, user.sub, dto);
  }

  @Get('snd/:patientId/history')
  @ApiOperation({ summary: 'Get SND prescription history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getSndHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSndHistory(tenantId, patientId);
  }

  // =========================================================================
  // Hospital Laundry
  // =========================================================================

  @Post('laundry')
  @ApiOperation({ summary: 'Record laundry data (kg processed, loss rate, stock level per unit)' })
  @ApiResponse({ status: 201, description: 'Laundry record saved — low stock alert if applicable' })
  async recordLaundry(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LaundryDto,
  ) {
    return this.service.recordLaundry(tenantId, user.sub, dto);
  }

  // =========================================================================
  // Waste Management (PGRSS)
  // =========================================================================

  @Post('waste')
  @ApiOperation({ summary: 'Record waste (PGRSS — ANVISA RDC 222/2018: type, weight, destination, certificate)' })
  @ApiResponse({ status: 201, description: 'Waste record saved' })
  async recordWaste(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: WasteManagementDto,
  ) {
    return this.service.recordWaste(tenantId, user.sub, dto);
  }

  @Get('waste/summary')
  @ApiOperation({ summary: 'Get waste summary by type for a period' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Period start date YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Period end date YYYY-MM-DD' })
  async getWasteSummary(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getWasteSummary(tenantId, startDate, endDate);
  }

  // =========================================================================
  // Procurement
  // =========================================================================

  @Post('procurement')
  @ApiOperation({ summary: 'Create/update procurement (requisition → quotation → approval → PO → receiving → invoice)' })
  @ApiResponse({ status: 201, description: 'Procurement record saved' })
  async upsertProcurement(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ProcurementDto,
  ) {
    return this.service.upsertProcurement(tenantId, user.sub, dto);
  }

  @Post('procurement/list')
  @ApiOperation({ summary: 'List procurements — filter by status or department' })
  @ApiResponse({ status: 200, description: 'Procurement list' })
  async listProcurements(
    @CurrentTenant() tenantId: string,
    @Body() query: ProcurementListQueryDto,
  ) {
    return this.service.listProcurements(tenantId, query);
  }

  // =========================================================================
  // Contract Management
  // =========================================================================

  @Post('contracts')
  @ApiOperation({ summary: 'Create/update contract (insurance, supplier — SLA, dates, renewal alert)' })
  @ApiResponse({ status: 201, description: 'Contract saved — renewal alert if expiring soon' })
  async upsertContract(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ContractManagementDto,
  ) {
    return this.service.upsertContract(tenantId, user.sub, dto);
  }

  @Post('contracts/expiring')
  @ApiOperation({ summary: 'List contracts expiring within N days (default 30)' })
  @ApiResponse({ status: 200, description: 'List of expiring contracts' })
  async getExpiringContracts(
    @CurrentTenant() tenantId: string,
    @Body() query: ContractExpiryQueryDto,
  ) {
    return this.service.getExpiringContracts(tenantId, query);
  }

  // =========================================================================
  // Ombudsman (Ouvidoria)
  // =========================================================================

  @Post('ombudsman')
  @ApiOperation({ summary: 'Create/update ombudsman ticket (complaint, compliment, suggestion — SLA, routing)' })
  @ApiResponse({ status: 201, description: 'Ticket created with SLA deadline' })
  async upsertOmbudsman(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OmbudsmanDto,
  ) {
    return this.service.upsertOmbudsmanTicket(tenantId, user.sub, dto);
  }

  @Get('ombudsman/tickets')
  @ApiOperation({ summary: 'List ombudsman tickets — optionally filter by status' })
  @ApiQuery({ name: 'status', required: false, enum: OmbudsmanTicketStatus })
  async listOmbudsmanTickets(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: OmbudsmanTicketStatus,
  ) {
    return this.service.listOmbudsmanTickets(tenantId, status);
  }

  // =========================================================================
  // SAME — Medical Records Archive
  // =========================================================================

  @Post('same')
  @ApiOperation({ summary: 'Create/update SAME record (location, lending, return, digitization, retention)' })
  @ApiResponse({ status: 201, description: 'SAME record saved — overdue alert if applicable' })
  async upsertSame(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SameDto,
  ) {
    return this.service.upsertSameRecord(tenantId, user.sub, dto);
  }

  @Get('same/:patientId/records')
  @ApiOperation({ summary: 'Get all SAME records for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getSameRecords(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSameRecordsByPatient(tenantId, patientId);
  }

  @Get('same/overdue')
  @ApiOperation({ summary: 'List overdue SAME borrowings (past return date, not returned)' })
  @ApiResponse({ status: 200, description: 'List of overdue borrowed records' })
  async getOverdueBorrowings(@CurrentTenant() tenantId: string) {
    return this.service.getOverdueBorrowings(tenantId);
  }
}
