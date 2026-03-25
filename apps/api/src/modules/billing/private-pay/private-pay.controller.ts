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
import { PrivatePayService } from './private-pay.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import {
  CreatePriceTableDto,
  CreateBudgetDto,
  UpdateBudgetStatusDto,
  CreateInstallmentPlanDto,
} from './dto/private-pay.dto';

@ApiTags('Billing — Particular')
@ApiBearerAuth('access-token')
@Controller('billing/private-pay')
export class PrivatePayController {
  constructor(private readonly service: PrivatePayService) {}

  // ─── Price Tables ──────────────────────────────────────────────────────────

  @Post('price-tables')
  @ApiOperation({ summary: 'Create a private-pay price table' })
  @ApiResponse({ status: 201, description: 'Price table created' })
  async createPriceTable(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePriceTableDto,
  ) {
    return this.service.createPriceTable(tenantId, user.sub, dto);
  }

  @Get('price-tables')
  @ApiOperation({ summary: 'List price tables for tenant' })
  @ApiResponse({ status: 200, description: 'Price tables list' })
  async getPriceTables(@CurrentTenant() tenantId: string) {
    return this.service.getPriceTables(tenantId);
  }

  // ─── Budgets ───────────────────────────────────────────────────────────────

  @Post('budgets')
  @ApiOperation({ summary: 'Create a patient budget' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  async createBudget(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.service.createBudget(tenantId, user.sub, dto);
  }

  @Get('budgets')
  @ApiOperation({ summary: 'List budgets (paginated)' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SENT', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Paginated budgets' })
  async getBudgets(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getBudgets(tenantId, {
      patientId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Patch('budgets/:id/status')
  @ApiOperation({ summary: 'Update budget status' })
  @ApiParam({ name: 'id', description: 'Budget document UUID' })
  @ApiResponse({ status: 200, description: 'Budget status updated' })
  async updateBudgetStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetStatusDto,
  ) {
    return this.service.updateBudgetStatus(tenantId, id, dto);
  }

  // ─── Installment Plans ─────────────────────────────────────────────────────

  @Post('installments')
  @ApiOperation({ summary: 'Create an installment plan for an approved budget' })
  @ApiResponse({ status: 201, description: 'Installment plan created' })
  async createInstallmentPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInstallmentPlanDto,
  ) {
    return this.service.createInstallmentPlan(tenantId, user.sub, dto);
  }

  @Get('installments/:budgetId')
  @ApiOperation({ summary: 'Get installment plans for a budget' })
  @ApiParam({ name: 'budgetId', description: 'Budget internal UUID' })
  @ApiResponse({ status: 200, description: 'Installment plans' })
  async getInstallmentPlans(
    @CurrentTenant() tenantId: string,
    @Param('budgetId') budgetId: string,
  ) {
    return this.service.getInstallmentPlans(tenantId, budgetId);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Process payment (PIX, credit card, boleto)' })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processPayment(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      budgetId: string;
      patientId: string;
      amount: number;
      method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
      installments?: number;
      cardToken?: string;
      cpf?: string;
    },
  ) {
    return this.service.processPayment(tenantId, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiResponse({ status: 200, description: 'Payment history' })
  async getPaymentHistory(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.getPaymentHistory(tenantId, patientId);
  }

  @Post('digital-payment-plan')
  @ApiOperation({ summary: 'Create digital payment plan with auto-charge' })
  @ApiResponse({ status: 201, description: 'Payment plan created' })
  async createDigitalPaymentPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      budgetId: string;
      totalAmount: number;
      downPayment: number;
      installments: number;
      paymentMethod: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
      firstDueDate: string;
      autoCharge: boolean;
      cardToken?: string;
    },
  ) {
    return this.service.createDigitalPaymentPlan(tenantId, user.sub, dto);
  }
}
