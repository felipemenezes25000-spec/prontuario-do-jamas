import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import {
  RequestRecordDto,
  ReturnRecordDto,
  DigitizeRecordDto,
  CheckoutRecordDto,
} from './dto/medical-records.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Medical Records (SAME)')
@ApiBearerAuth('access-token')
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request a physical medical record' })
  @ApiResponse({ status: 201, description: 'Record request created' })
  async requestPhysicalRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestRecordDto,
  ) {
    return this.service.requestPhysicalRecord(tenantId, user.sub, dto);
  }

  @Patch('checkout')
  @ApiOperation({ summary: 'Checkout a physical record (mark as loaned)' })
  @ApiResponse({ status: 200, description: 'Record checked out' })
  async checkoutRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckoutRecordDto,
  ) {
    return this.service.checkoutRecord(tenantId, user.sub, dto);
  }

  @Patch('return')
  @ApiOperation({ summary: 'Return a physical record' })
  @ApiResponse({ status: 200, description: 'Record returned' })
  async returnRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReturnRecordDto,
  ) {
    return this.service.returnRecord(tenantId, user.sub, dto);
  }

  @Patch('digitize')
  @ApiOperation({ summary: 'Mark a record as digitized/scanned' })
  @ApiResponse({ status: 200, description: 'Record marked as digitized' })
  async digitizeRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DigitizeRecordDto,
  ) {
    return this.service.digitizeRecord(tenantId, user.sub, dto);
  }

  @Get('loaned')
  @ApiOperation({ summary: 'List all active loans with overdue alerts' })
  @ApiResponse({ status: 200, description: 'Active loan list' })
  async listLoanedRecords(
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.listLoanedRecords(tenantId);
  }

  @Get(':id/location')
  @ApiParam({ name: 'id', description: 'Record document UUID' })
  @ApiOperation({ summary: 'Get current location of a physical record' })
  @ApiResponse({ status: 200, description: 'Record location' })
  async getRecordLocation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getRecordLocation(tenantId, id);
  }

  @Get('retention')
  @ApiOperation({ summary: 'Get records approaching CFM 20-year retention limit' })
  @ApiResponse({ status: 200, description: 'Retention schedule' })
  async getRetentionSchedule(
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.getRetentionSchedule(tenantId);
  }
}
