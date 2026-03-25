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
import { PriorAuthorizationService } from './prior-authorization.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreatePriorAuthDto, UpdatePriorAuthStatusDto } from './prior-authorization.dto';

@ApiTags('Billing — Prior Authorization')
@ApiBearerAuth('access-token')
@Controller('billing/prior-auth')
export class PriorAuthorizationController {
  constructor(private readonly service: PriorAuthorizationService) {}

  @Post()
  @ApiOperation({ summary: 'Submit prior authorization request' })
  @ApiResponse({ status: 201, description: 'Prior auth submitted' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePriorAuthDto,
  ) {
    return this.service.createPriorAuth(tenantId, user.email, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List prior authorization requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated prior auth requests' })
  async list(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.listPriorAuths(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      patientId,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update prior auth status' })
  @ApiParam({ name: 'id', description: 'Prior Auth UUID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriorAuthStatusDto,
  ) {
    return this.service.updateStatus(tenantId, user.email, id, dto);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Track prior auth status history' })
  @ApiParam({ name: 'id', description: 'Prior Auth UUID' })
  @ApiResponse({ status: 200, description: 'Status tracking data' })
  async getTracking(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getTracking(tenantId, id);
  }

  @Post('eligibility-check')
  @ApiOperation({ summary: 'Real-time insurance eligibility check' })
  @ApiResponse({ status: 201, description: 'Eligibility result' })
  async checkEligibility(
    @CurrentTenant() tenantId: string,
    @Body() dto: { patientId: string; insuranceProvider: string; insurancePlanNumber: string; cardNumber: string },
  ) {
    return this.service.checkEligibility(tenantId, dto);
  }

  @Post('price-tables')
  @ApiOperation({ summary: 'Create/update price table (AMB, CBHPM, TUSS, SUS)' })
  @ApiResponse({ status: 201, description: 'Price table created' })
  async managePriceTable(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      action: 'CREATE' | 'UPDATE';
      tableName: string;
      tableType: 'AMB' | 'CBHPM' | 'TUSS' | 'SUS' | 'CUSTOM';
      version: string;
      effectiveDate: string;
      items: Array<{ code: string; description: string; unitPrice: number; category?: string; porte?: string }>;
    },
  ) {
    return this.service.managePriceTable(tenantId, user.sub, dto);
  }

  @Get('price-tables')
  @ApiOperation({ summary: 'List price tables' })
  @ApiQuery({ name: 'tableType', required: false })
  @ApiResponse({ status: 200, description: 'Price tables list' })
  async listPriceTables(
    @CurrentTenant() tenantId: string,
    @Query('tableType') tableType?: string,
  ) {
    return this.service.listPriceTables(tenantId, tableType);
  }

  @Post('hospital-bill')
  @ApiOperation({ summary: 'Create detailed hospital bill itemization' })
  @ApiResponse({ status: 201, description: 'Hospital bill created' })
  async createHospitalBill(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId: string;
      admissionDate: string;
      dischargeDate?: string;
      items: Array<{
        category: 'DAILY_RATE' | 'PROFESSIONAL_FEE' | 'MATERIAL' | 'DRUG' | 'EXAM' | 'PROCEDURE' | 'OTHER';
        costCenter: string;
        code: string;
        description: string;
        quantity: number;
        unitPrice: number;
        date: string;
      }>;
    },
  ) {
    return this.service.createHospitalBill(tenantId, user.sub, dto);
  }
}
