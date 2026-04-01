import {
  Controller,
  Get,
  Post,
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
import { OrderSetsService } from './order-sets.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import {
  CreateOrderSetDto,
  ActivateOrderSetDto,
  RenalAdjustmentDto,
  HepaticAdjustmentDto,
  PregnancyCheckDto,
  LactationCheckDto,
  OrderSetCategory,
} from './dto/order-sets.dto';

@ApiTags('Prescriptions — Order Sets & Safety')
@ApiBearerAuth('access-token')
@Controller('prescriptions')
export class OrderSetsController {
  constructor(private readonly orderSetsService: OrderSetsService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Order Sets
  // ──────────────────────────────────────────────────────────────────────────

  @Post('order-sets')
  @ApiOperation({ summary: 'Create a new order set (prescription package)' })
  @ApiResponse({ status: 201, description: 'Order set created' })
  createOrderSet(@Body() dto: CreateOrderSetDto) {
    return this.orderSetsService.createOrderSet(dto);
  }

  @Get('order-sets')
  @ApiOperation({ summary: 'List order sets, optionally filtered by specialty or category' })
  @ApiResponse({ status: 200, description: 'List of order sets' })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filter by specialty name' })
  @ApiQuery({ name: 'category', required: false, enum: OrderSetCategory, description: 'Filter by category' })
  listOrderSets(
    @Query('specialty') specialty?: string,
    @Query('category') category?: string,
  ) {
    return this.orderSetsService.getOrderSets({
      specialty,
      category: category as OrderSetCategory | undefined,
    });
  }

  @Post('order-sets/:id/activate')
  @ApiParam({ name: 'id', description: 'Order set ID' })
  @ApiOperation({ summary: 'Activate an order set for a specific encounter' })
  @ApiResponse({ status: 201, description: 'Order set activated and prescription items created' })
  @ApiResponse({ status: 404, description: 'Order set not found' })
  async activateOrderSet(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ActivateOrderSetDto,
  ) {
    // Override orderSetId from the path parameter
    dto.orderSetId = id;
    return this.orderSetsService.activateOrderSet(tenantId, user.sub, dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Renal Dose Adjustment
  // ──────────────────────────────────────────────────────────────────────────

  @Post('renal-adjustment')
  @ApiOperation({
    summary: 'Calculate GFR (Cockcroft-Gault / CKD-EPI / MDRD) and suggest dose adjustment',
  })
  @ApiResponse({ status: 200, description: 'Renal adjustment calculation result' })
  checkRenalAdjustment(@Body() dto: RenalAdjustmentDto) {
    return this.orderSetsService.checkRenalAdjustment(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hepatic Dose Adjustment
  // ──────────────────────────────────────────────────────────────────────────

  @Post('hepatic-adjustment')
  @ApiOperation({
    summary: 'Calculate Child-Pugh score and suggest hepatic dose adjustment',
  })
  @ApiResponse({ status: 200, description: 'Hepatic adjustment calculation result' })
  checkHepaticAdjustment(@Body() dto: HepaticAdjustmentDto) {
    return this.orderSetsService.checkHepaticAdjustment(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Pregnancy Alert
  // ──────────────────────────────────────────────────────────────────────────

  @Post('pregnancy-check')
  @ApiOperation({
    summary: 'Check medication safety during pregnancy (FDA A/B/C/D/X categories)',
  })
  @ApiResponse({ status: 200, description: 'Pregnancy alert result with FDA category and alternatives' })
  checkPregnancyAlert(@Body() dto: PregnancyCheckDto) {
    return this.orderSetsService.checkPregnancyAlert(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lactation Alert
  // ──────────────────────────────────────────────────────────────────────────

  @Post('lactation-check')
  @ApiOperation({
    summary: 'Check medication safety during lactation',
  })
  @ApiResponse({ status: 200, description: 'Lactation alert with infant risk and alternatives' })
  checkLactationAlert(@Body() dto: LactationCheckDto) {
    return this.orderSetsService.checkLactationAlert(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Food-Drug Interactions
  // ──────────────────────────────────────────────────────────────────────────

  @Post('food-interactions/:medicationId')
  @ApiParam({ name: 'medicationId', description: 'Medication name or identifier' })
  @ApiOperation({
    summary: 'Check food-drug interactions for a given medication',
  })
  @ApiResponse({ status: 200, description: 'List of food-drug interactions' })
  checkFoodInteractions(@Param('medicationId') medicationId: string) {
    return this.orderSetsService.checkFoodDrugInteractions(medicationId);
  }
}
