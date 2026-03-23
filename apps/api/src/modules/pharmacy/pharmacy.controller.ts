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
import { PharmacyService } from './pharmacy.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { CreateDrugInventoryDto } from './dto/create-drug-inventory.dto';
import { UpdateDrugInventoryDto } from './dto/update-drug-inventory.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { InventoryStatus } from '@prisma/client';

@ApiTags('Pharmacy')
@ApiBearerAuth('access-token')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  // ============================================================================
  // Dispensation
  // ============================================================================

  @Get('pending-dispensation')
  @ApiOperation({ summary: 'Get prescriptions pending dispensation' })
  @ApiResponse({ status: 200, description: 'Pending dispensation list' })
  async getPendingDispensation(@CurrentTenant() tenantId: string) {
    return this.pharmacyService.getPendingDispensation(tenantId);
  }

  @Post('dispense')
  @ApiOperation({ summary: 'Register a dispensation' })
  @ApiResponse({ status: 201, description: 'Dispensation registered' })
  async dispense(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDispensationDto,
  ) {
    return this.pharmacyService.dispense(user.sub, tenantId, dto);
  }

  @Get('dispensation-history/:prescriptionId')
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Get dispensation history for a prescription' })
  @ApiResponse({ status: 200, description: 'Dispensation history' })
  async getDispensationHistory(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
  ) {
    return this.pharmacyService.getDispensationHistory(prescriptionId);
  }

  // ============================================================================
  // Drug Inventory
  // ============================================================================

  @Get('inventory')
  @ApiOperation({ summary: 'List drug inventory' })
  @ApiQuery({ name: 'status', required: false, enum: InventoryStatus })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Inventory list' })
  async getInventory(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: InventoryStatus,
    @Query('location') location?: string,
    @Query('search') search?: string,
  ) {
    return this.pharmacyService.getInventory(tenantId, {
      status,
      location,
      search,
    });
  }

  @Post('inventory')
  @ApiOperation({ summary: 'Register inventory entry' })
  @ApiResponse({ status: 201, description: 'Inventory entry created' })
  async createInventoryEntry(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDrugInventoryDto,
  ) {
    return this.pharmacyService.createInventoryEntry(tenantId, dto);
  }

  @Patch('inventory/:id')
  @ApiParam({ name: 'id', description: 'Inventory entry UUID' })
  @ApiOperation({ summary: 'Update inventory entry' })
  @ApiResponse({ status: 200, description: 'Inventory entry updated' })
  async updateInventoryEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDrugInventoryDto,
  ) {
    return this.pharmacyService.updateInventoryEntry(id, dto);
  }

  @Get('inventory/alerts')
  @ApiOperation({ summary: 'Get inventory alerts (low stock + expired)' })
  @ApiResponse({ status: 200, description: 'Inventory alerts' })
  async getInventoryAlerts(@CurrentTenant() tenantId: string) {
    return this.pharmacyService.getInventoryAlerts(tenantId);
  }
}
