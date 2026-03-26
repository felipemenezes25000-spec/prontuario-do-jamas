import {
  Controller,
  Get,
  Post,
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
import { IdentityVerificationService } from './identity-verification.service';
import { VerifyIdentityDto } from './identity-verification.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Identity Verification')
@ApiBearerAuth('access-token')
@Controller('identity-verification')
export class IdentityVerificationController {
  constructor(
    private readonly identityVerificationService: IdentityVerificationService,
  ) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify patient identity via selfie and/or liveness check' })
  @ApiResponse({ status: 201, description: 'Identity verification completed' })
  async verifyIdentity(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyIdentityDto,
  ) {
    return this.identityVerificationService.verifyIdentity(
      tenantId,
      user.sub,
      dto,
    );
  }

  @Get(':patientId/history')
  @ApiOperation({ summary: 'Get verification history for a patient' })
  @ApiResponse({ status: 200, description: 'Verification history list' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getVerificationHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.identityVerificationService.getVerificationHistory(
      tenantId,
      patientId,
    );
  }

  @Get(':patientId/status')
  @ApiOperation({ summary: 'Get current verification status for a patient' })
  @ApiResponse({ status: 200, description: 'Current verification status' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getVerificationStatus(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.identityVerificationService.getVerificationStatus(
      tenantId,
      patientId,
    );
  }
}
