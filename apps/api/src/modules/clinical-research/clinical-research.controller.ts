import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { ClinicalResearchService } from './clinical-research.service';
import {
  RegisterTrialDto,
  EnrollPatientDto,
  TrialResponseDto,
  EligiblePatientsResponseDto,
  EnrollmentResponseDto,
  ResearchDataResponseDto,
} from './dto/clinical-research.dto';

@ApiTags('Clinical Research')
@ApiBearerAuth('access-token')
@Controller('research/trials')
export class ClinicalResearchController {
  constructor(private readonly researchService: ClinicalResearchService) {}

  @Post()
  @ApiOperation({ summary: 'Register clinical trial' })
  @ApiResponse({ status: 201, type: TrialResponseDto })
  async registerTrial(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterTrialDto,
  ): Promise<TrialResponseDto> {
    return this.researchService.registerTrial(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List clinical trials' })
  @ApiResponse({ status: 200, type: [TrialResponseDto] })
  async listTrials(@CurrentTenant() tenantId: string): Promise<TrialResponseDto[]> {
    return this.researchService.listTrials(tenantId);
  }

  @Post(':id/eligible')
  @ApiOperation({ summary: 'Find eligible patients for a trial' })
  @ApiParam({ name: 'id', description: 'Trial UUID' })
  @ApiResponse({ status: 201, type: EligiblePatientsResponseDto })
  async findEligible(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EligiblePatientsResponseDto> {
    return this.researchService.findEligible(tenantId, id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll patient in trial' })
  @ApiParam({ name: 'id', description: 'Trial UUID' })
  @ApiResponse({ status: 201, type: EnrollmentResponseDto })
  async enrollPatient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnrollPatientDto,
  ): Promise<EnrollmentResponseDto> {
    return this.researchService.enrollPatient(tenantId, id, dto.patientId, dto.consentDocumentUrl, dto.arm);
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Get research data collection for a trial' })
  @ApiParam({ name: 'id', description: 'Trial UUID' })
  @ApiResponse({ status: 200, type: ResearchDataResponseDto })
  async getResearchData(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResearchDataResponseDto> {
    return this.researchService.getResearchData(tenantId, id);
  }
}
