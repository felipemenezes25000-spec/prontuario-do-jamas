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
import { PalliativeCareService } from './palliative-care.service';
import {
  CreatePalliativeAssessmentDto,
  CreateAdvanceDirectivesDto,
  CreatePalliativeCarePlanDto,
} from './dto/create-palliative-care.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Palliative Care')
@ApiBearerAuth('access-token')
@Controller('palliative-care')
export class PalliativeCareController {
  constructor(private readonly palliativeCareService: PalliativeCareService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create palliative assessment (PPS, ESAS)' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePalliativeAssessmentDto,
  ) {
    return this.palliativeCareService.createAssessment(tenantId, dto);
  }

  @Post('advance-directives')
  @ApiOperation({ summary: 'Record advance directives' })
  @ApiResponse({ status: 201, description: 'Advance directives recorded' })
  async createAdvanceDirectives(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAdvanceDirectivesDto,
  ) {
    return this.palliativeCareService.createAdvanceDirectives(tenantId, dto);
  }

  @Post('care-plan')
  @ApiOperation({ summary: 'Create end-of-life care plan' })
  @ApiResponse({ status: 201, description: 'Care plan created' })
  async createCarePlan(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePalliativeCarePlanDto,
  ) {
    return this.palliativeCareService.createCarePlan(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get palliative care history' })
  @ApiResponse({ status: 200, description: 'Palliative care history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.palliativeCareService.findByPatient(tenantId, patientId);
  }
}
