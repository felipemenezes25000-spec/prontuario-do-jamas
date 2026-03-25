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
import { SocialWorkService } from './social-work.service';
import { CreateSocialAssessmentDto, CreateSocialReferralDto } from './dto/create-social-work.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Social Work')
@ApiBearerAuth('access-token')
@Controller('social-work')
export class SocialWorkController {
  constructor(private readonly socialWorkService: SocialWorkService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create social assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSocialAssessmentDto,
  ) {
    return this.socialWorkService.createAssessment(tenantId, dto);
  }

  @Post('referral')
  @ApiOperation({ summary: 'Create social referral' })
  @ApiResponse({ status: 201, description: 'Referral created' })
  async createReferral(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSocialReferralDto,
  ) {
    return this.socialWorkService.createReferral(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient social history' })
  @ApiResponse({ status: 200, description: 'Social history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.socialWorkService.findByPatient(tenantId, patientId);
  }
}
