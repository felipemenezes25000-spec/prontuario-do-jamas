import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PyxisIntegrationService } from './pyxis-integration.service';
import { DispenseDto, RestockRequestDto } from './dto/create-pyxis.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Pyxis Integration')
@ApiBearerAuth('access-token')
@Controller('pyxis')
export class PyxisIntegrationController {
  constructor(private readonly pyxisService: PyxisIntegrationService) {}

  @Post('dispense')
  @ApiOperation({ summary: 'Record automated cabinet dispense' })
  @ApiResponse({ status: 201, description: 'Dispense recorded' })
  async recordDispense(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DispenseDto,
  ) {
    return this.pyxisService.recordDispense(tenantId, user.sub, dto);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get cabinet inventory' })
  @ApiResponse({ status: 200, description: 'Cabinet inventory' })
  @ApiQuery({ name: 'cabinetId', required: false })
  async getInventory(
    @CurrentTenant() tenantId: string,
    @Query('cabinetId') cabinetId?: string,
  ) {
    return this.pyxisService.getInventory(tenantId, cabinetId);
  }

  @Post('restock')
  @ApiOperation({ summary: 'Create restock request' })
  @ApiResponse({ status: 201, description: 'Restock request created' })
  async createRestockRequest(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RestockRequestDto,
  ) {
    return this.pyxisService.createRestockRequest(tenantId, user.sub, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  @ApiQuery({ name: 'cabinetId', required: false })
  async getTransactions(
    @CurrentTenant() tenantId: string,
    @Query('cabinetId') cabinetId?: string,
  ) {
    return this.pyxisService.getTransactions(tenantId, cabinetId);
  }
}
