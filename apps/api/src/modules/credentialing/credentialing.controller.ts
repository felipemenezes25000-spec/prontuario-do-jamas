import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CredentialingService } from './credentialing.service';
import {
  RegisterCredentialDto,
  UpdateCredentialDto,
  CredentialResponseDto,
  ExpiringCredentialsResponseDto,
  CrmVerificationResponseDto,
} from './dto/credentialing.dto';

@ApiTags('Compliance — Credentialing')
@ApiBearerAuth('access-token')
@Controller('compliance/credentialing')
export class CredentialingController {
  constructor(private readonly credentialingService: CredentialingService) {}

  @Post()
  @ApiOperation({ summary: 'Register physician credential' })
  @ApiResponse({ status: 201, type: CredentialResponseDto })
  async register(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterCredentialDto,
  ): Promise<CredentialResponseDto> {
    return this.credentialingService.register(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List credentials' })
  @ApiResponse({ status: 200, type: [CredentialResponseDto] })
  async list(@CurrentTenant() tenantId: string): Promise<CredentialResponseDto[]> {
    return this.credentialingService.list(tenantId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring credentials alerts' })
  @ApiResponse({ status: 200, type: ExpiringCredentialsResponseDto })
  async getExpiring(@CurrentTenant() tenantId: string): Promise<ExpiringCredentialsResponseDto> {
    return this.credentialingService.getExpiring(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential details' })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 200, type: CredentialResponseDto })
  async getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CredentialResponseDto> {
    return this.credentialingService.getById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update credential' })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 200, type: CredentialResponseDto })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCredentialDto,
  ): Promise<CredentialResponseDto> {
    return this.credentialingService.update(tenantId, id, dto);
  }

  @Post(':id/verify-crm')
  @ApiOperation({ summary: 'Verify CRM with CFM' })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 201, type: CrmVerificationResponseDto })
  async verifyCrm(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CrmVerificationResponseDto> {
    return this.credentialingService.verifyCrm(tenantId, id);
  }
}
