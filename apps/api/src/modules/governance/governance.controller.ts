import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { GovernanceService } from './governance.service';

@ApiTags('Governance & Compliance')
@ApiBearerAuth('access-token')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  @Post('lgpd/portability')
  @ApiOperation({ summary: 'Request LGPD data portability for patient' })
  async requestPortability(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() t: string,
    @Body('patientId') patientId: string,
  ) {
    return this.service.requestDataPortability(t, patientId, user.sub);
  }

  @Get('lgpd/portability')
  @ApiOperation({ summary: 'List data portability requests' })
  async listPortability(@CurrentTenant() t: string) {
    return this.service.listPortabilityRequests(t);
  }

  @Get('session-config')
  @ApiOperation({ summary: 'Get session timeout configuration' })
  async getSessionConfig(@CurrentTenant() t: string) {
    return this.service.getSessionConfig(t);
  }

  @Post('session-config')
  @ApiOperation({ summary: 'Update session timeout configuration' })
  async updateSessionConfig(@CurrentTenant() t: string, @Body() config: Record<string, unknown>) {
    return this.service.updateSessionConfig(t, config as never);
  }

  @Get('password-policy')
  @ApiOperation({ summary: 'Get password policy' })
  async getPasswordPolicy(@CurrentTenant() t: string) {
    return this.service.getPasswordPolicy(t);
  }

  @Post('password-policy')
  @ApiOperation({ summary: 'Update password policy' })
  async updatePasswordPolicy(@CurrentTenant() t: string, @Body() policy: Record<string, unknown>) {
    return this.service.updatePasswordPolicy(t, policy);
  }

  @Get('dpo/dashboard')
  @ApiOperation({ summary: 'DPO dashboard (consents, requests, incidents, DPIA)' })
  async dpoDashboard(@CurrentTenant() t: string) {
    return this.service.getDpoDashboard(t);
  }

  @Get('dpia')
  @ApiOperation({ summary: 'List DPIA assessments' })
  async dpiaAssessments(@CurrentTenant() t: string) {
    return this.service.getDpiaAssessments(t);
  }

  @Get('sensitive-data')
  @ApiOperation({ summary: 'Sensitive data segregation configuration' })
  async sensitiveData(@CurrentTenant() t: string) {
    return this.service.getSensitiveDataConfig(t);
  }

  @Get('accreditation-checklist')
  @ApiOperation({ summary: 'Accreditation readiness checklist (ONA, JCI)' })
  @ApiQuery({ name: 'standard', required: true, description: 'ONA | JCI' })
  async accreditationChecklist(
    @CurrentTenant() t: string,
    @Query('standard') standard: string,
  ) {
    return this.service.getAccreditationChecklist(t, standard);
  }
}
