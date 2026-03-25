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
import { ChargeCaptureService } from './charge-capture.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreateChargeCaptureDto, UpdateChargeDto } from './charge-capture.dto';

@ApiTags('Billing — Charge Capture')
@ApiBearerAuth('access-token')
@Controller('billing/charge-capture')
export class ChargeCaptureController {
  constructor(private readonly service: ChargeCaptureService) {}

  @Post()
  @ApiOperation({ summary: 'Auto-capture charges from documentation' })
  @ApiResponse({ status: 201, description: 'Charges captured' })
  async captureCharges(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateChargeCaptureDto,
  ) {
    return this.service.captureCharges(tenantId, user.email, dto);
  }

  @Get('encounter/:encounterId')
  @ApiOperation({ summary: 'Get charges for encounter' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 200, description: 'Encounter charges' })
  async getChargesForEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getChargesForEncounter(tenantId, encounterId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit charge' })
  @ApiParam({ name: 'id', description: 'Charge UUID' })
  @ApiResponse({ status: 200, description: 'Charge updated' })
  async updateCharge(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChargeDto,
  ) {
    return this.service.updateCharge(tenantId, id, dto);
  }

  @Get('unbilled')
  @ApiOperation({ summary: 'List unbilled charges' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Unbilled charges list' })
  async getUnbilledCharges(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getUnbilledCharges(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
