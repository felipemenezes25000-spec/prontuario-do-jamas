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
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { TissService } from './tiss.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { BillingStatus } from '@prisma/client';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly tissService: TissService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a billing entry' })
  @ApiResponse({ status: 201, description: 'Billing entry created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBillingDto,
  ) {
    return this.billingService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List billing entries for tenant (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated billing entries' })
  async findByTenant(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.billingService.findByTenant(tenantId, pagination);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get billing summary for tenant' })
  @ApiResponse({ status: 200, description: 'Billing summary' })
  async generateSummary(@CurrentTenant() tenantId: string) {
    return this.billingService.generateSummary(tenantId);
  }

  @Get('by-encounter/:encounterId')
  @ApiOperation({ summary: 'Get billing entries by encounter' })
  @ApiResponse({ status: 200, description: 'Encounter billing entries' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.billingService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get billing entry by ID' })
  @ApiResponse({ status: 200, description: 'Billing entry details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update billing entry status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: BillingStatus,
  ) {
    return this.billingService.updateStatus(id, status);
  }

  @Post(':id/generate-tiss')
  @ApiOperation({ summary: 'Generate TISS XML 4.0 for a billing entry' })
  @ApiResponse({ status: 201, description: 'TISS XML generated' })
  @ApiResponse({ status: 404, description: 'Billing entry not found' })
  async generateTiss(@Param('id', ParseUUIDPipe) id: string) {
    const xml = await this.tissService.generateTISSXml(id);
    return { xml };
  }
}
