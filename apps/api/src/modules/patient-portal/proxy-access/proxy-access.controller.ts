import {
  Controller,
  Get,
  Post,
  Delete,
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
import { ProxyAccessService } from './proxy-access.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { GrantProxyDto } from './proxy-access.dto';

@ApiTags('Patient Portal — Proxy Access')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class ProxyAccessController {
  constructor(private readonly service: ProxyAccessService) {}

  @Post('proxy')
  @ApiOperation({ summary: 'Grant proxy access (parent/caregiver)' })
  @ApiResponse({ status: 201, description: 'Proxy granted' })
  async grantProxy(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GrantProxyDto,
  ) {
    return this.service.grantProxy(tenantId, user.email, dto);
  }

  @Get('proxy')
  @ApiOperation({ summary: 'List proxy relationships' })
  @ApiResponse({ status: 200, description: 'Proxy relationships list' })
  async listProxies(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.listProxies(tenantId, user.email);
  }

  @Delete('proxy/:id')
  @ApiOperation({ summary: 'Revoke proxy access' })
  @ApiParam({ name: 'id', description: 'Proxy UUID' })
  @ApiResponse({ status: 200, description: 'Proxy revoked' })
  async revokeProxy(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.revokeProxy(tenantId, user.email, id);
  }

  @Get('proxy/:proxyPatientId/data')
  @ApiOperation({ summary: 'Access proxied patient data' })
  @ApiParam({ name: 'proxyPatientId', description: 'Proxied patient UUID' })
  @ApiResponse({ status: 200, description: 'Proxied patient summary data' })
  async getProxiedPatientData(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('proxyPatientId', ParseUUIDPipe) proxyPatientId: string,
  ) {
    return this.service.getProxiedPatientData(tenantId, user.email, proxyPatientId);
  }
}
