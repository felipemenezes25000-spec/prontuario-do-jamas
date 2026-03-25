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
import { IheProfilesService } from './ihe-profiles.service';
import {
  XdsProvideRegisterDto,
  PixQueryDto,
} from './dto/ihe-profiles.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Interop — IHE Profiles')
@ApiBearerAuth('access-token')
@Controller('interop/ihe')
export class IheProfilesController {
  constructor(private readonly iheService: IheProfilesService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'List supported IHE profiles' })
  @ApiResponse({ status: 200, description: 'Supported IHE profiles' })
  async getSupportedProfiles() {
    return this.iheService.getSupportedProfiles();
  }

  @Post('xds/provide')
  @ApiOperation({ summary: 'XDS.b Provide & Register Document Set' })
  @ApiResponse({ status: 201, description: 'Document registered' })
  async xdsProvideAndRegister(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: XdsProvideRegisterDto,
  ) {
    return this.iheService.xdsProvideAndRegister(tenantId, user.sub, dto);
  }

  @Get('xds/query')
  @ApiOperation({ summary: 'XDS.b Registry Stored Query' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'classCode', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Query results' })
  async xdsQuery(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('classCode') classCode?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
  ) {
    return this.iheService.xdsRegistryStoredQuery(tenantId, {
      patientId,
      classCode,
      dateFrom,
      dateTo,
      status,
    });
  }

  @Post('pix/query')
  @ApiOperation({ summary: 'PIX Patient Identifier Cross-Reference Query' })
  @ApiResponse({ status: 200, description: 'Patient identifiers' })
  async pixQuery(
    @CurrentTenant() tenantId: string,
    @Body() dto: PixQueryDto,
  ) {
    return this.iheService.pixQuery(tenantId, dto);
  }

  @Get('atna/audit')
  @ApiOperation({ summary: 'ATNA Audit Trail' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Audit trail entries' })
  async getAuditTrail(
    @CurrentTenant() tenantId: string,
    @Query('userId') userId?: string,
    @Query('patientId') patientId?: string,
    @Query('eventType') eventType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.iheService.getAtnaAuditTrail(tenantId, {
      userId,
      patientId,
      eventType,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
