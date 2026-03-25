import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { SbisComplianceService } from './sbis-compliance.service';
import {
  SubmitEvidenceDto,
  SbisChecklistResponseDto,
  SbisStatusResponseDto,
  ComplianceGapsResponseDto,
  CfmResolutionsResponseDto,
  EvidenceResponseDto,
} from './dto/sbis-compliance.dto';

@ApiTags('Compliance — SBIS/CFM')
@ApiBearerAuth('access-token')
@Controller('compliance/sbis')
export class SbisComplianceController {
  constructor(private readonly sbisService: SbisComplianceService) {}

  @Get('checklist')
  @ApiOperation({ summary: 'Get SBIS NGS1/NGS2 compliance checklist' })
  @ApiResponse({ status: 200, type: SbisChecklistResponseDto })
  async getChecklist(@CurrentTenant() tenantId: string): Promise<SbisChecklistResponseDto> {
    return this.sbisService.getChecklist(tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current compliance status' })
  @ApiResponse({ status: 200, type: SbisStatusResponseDto })
  async getStatus(@CurrentTenant() tenantId: string): Promise<SbisStatusResponseDto> {
    return this.sbisService.getStatus(tenantId);
  }

  @Post('evidence')
  @ApiOperation({ summary: 'Submit compliance evidence' })
  @ApiResponse({ status: 201, type: EvidenceResponseDto })
  async submitEvidence(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: SubmitEvidenceDto,
  ): Promise<EvidenceResponseDto> {
    return this.sbisService.submitEvidence(tenantId, user.sub, dto.requirementId, dto.description, dto.documentUrl, dto.notes);
  }

  @Get('gaps')
  @ApiOperation({ summary: 'Get compliance gaps' })
  @ApiResponse({ status: 200, type: ComplianceGapsResponseDto })
  async getGaps(@CurrentTenant() tenantId: string): Promise<ComplianceGapsResponseDto> {
    return this.sbisService.getGaps(tenantId);
  }
}

@ApiTags('Compliance — SBIS/CFM')
@ApiBearerAuth('access-token')
@Controller('compliance/cfm')
export class CfmComplianceController {
  constructor(private readonly sbisService: SbisComplianceService) {}

  @Get('resolutions')
  @ApiOperation({ summary: 'Get CFM resolution compliance status' })
  @ApiResponse({ status: 200, type: CfmResolutionsResponseDto })
  async getResolutions(@CurrentTenant() tenantId: string): Promise<CfmResolutionsResponseDto> {
    return this.sbisService.getCfmResolutions(tenantId);
  }
}
