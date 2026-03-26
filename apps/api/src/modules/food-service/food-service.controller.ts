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
import { FoodServiceService } from './food-service.service';
import {
  CreateMenuDto,
  AssignDietDto,
  MealDeliveryDto,
} from './dto/food-service.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Food Service (SND)')
@ApiBearerAuth('access-token')
@Controller('food-service')
export class FoodServiceController {
  constructor(private readonly service: FoodServiceService) {}

  @Post('menu')
  @ApiOperation({ summary: 'Create or update daily menu for a meal' })
  @ApiResponse({ status: 201, description: 'Menu created/updated' })
  async createMenu(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMenuDto,
  ) {
    return this.service.createMenu(tenantId, user.sub, dto);
  }

  @Post('diet/assign')
  @ApiOperation({ summary: 'Assign a diet to a patient' })
  @ApiResponse({ status: 201, description: 'Diet assigned' })
  async assignDiet(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignDietDto,
  ) {
    return this.service.assignDiet(tenantId, user.sub, dto);
  }

  @Get('diet')
  @ApiOperation({ summary: 'Get current diet for a patient' })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Patient diet' })
  async getPatientDiet(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId: string,
  ) {
    return this.service.getPatientDiet(tenantId, patientId);
  }

  @Post('delivery')
  @ApiOperation({ summary: 'Record meal delivery and acceptance' })
  @ApiResponse({ status: 201, description: 'Delivery recorded' })
  async recordMealDelivery(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MealDeliveryDto,
  ) {
    return this.service.recordMealDelivery(tenantId, user.sub, dto);
  }

  @Get('ward-orders')
  @ApiOperation({ summary: 'Get ward food orders summary for kitchen' })
  @ApiResponse({ status: 200, description: 'Ward orders grouped by ward' })
  async getWardFoodOrders(
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.getWardFoodOrders(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get food service dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.getDashboard(tenantId);
  }
}
