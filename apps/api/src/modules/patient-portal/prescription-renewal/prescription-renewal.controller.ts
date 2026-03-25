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
import { PrescriptionRenewalService } from './prescription-renewal.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { RequestRenewalDto, UpdateRenewalDto } from './prescription-renewal.dto';

@ApiTags('Patient Portal — Prescription Renewal')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class PrescriptionRenewalController {
  constructor(private readonly service: PrescriptionRenewalService) {}

  @Post('prescription-renewal')
  @ApiOperation({ summary: 'Request prescription renewal' })
  @ApiResponse({ status: 201, description: 'Renewal request created' })
  async requestRenewal(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestRenewalDto,
  ) {
    return this.service.requestRenewal(tenantId, user.email, dto);
  }

  @Get('prescription-renewal')
  @ApiOperation({ summary: 'List renewal requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Paginated renewal requests' })
  async listRenewals(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listRenewals(tenantId, user.email, user.role, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
    });
  }

  @Patch('prescription-renewal/:id')
  @ApiOperation({ summary: 'Doctor approves/denies renewal' })
  @ApiParam({ name: 'id', description: 'Renewal UUID' })
  @ApiResponse({ status: 200, description: 'Renewal updated' })
  async updateRenewal(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRenewalDto,
  ) {
    return this.service.updateRenewal(tenantId, user.email, id, dto);
  }
}
