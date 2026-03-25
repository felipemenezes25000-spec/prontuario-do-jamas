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
import { OnlinePaymentService } from './online-payment.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreateCheckoutDto, SetupInstallmentsDto } from './online-payment.dto';

@ApiTags('Patient Portal — Online Payment')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class OnlinePaymentController {
  constructor(private readonly service: OnlinePaymentService) {}

  @Post('payments/checkout')
  @ApiOperation({ summary: 'Create payment session' })
  @ApiResponse({ status: 201, description: 'Payment session created' })
  async createCheckout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.service.createCheckout(tenantId, user.email, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Payment history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Payment history list' })
  async listPayments(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listPayments(tenantId, user.email, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Payment details' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment detail' })
  async getPaymentDetail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getPaymentDetail(tenantId, user.email, id);
  }

  @Post('payments/:id/installments')
  @ApiOperation({ summary: 'Setup payment installments' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 201, description: 'Installments configured' })
  async setupInstallments(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetupInstallmentsDto,
  ) {
    return this.service.setupInstallments(tenantId, user.email, id, dto);
  }
}
