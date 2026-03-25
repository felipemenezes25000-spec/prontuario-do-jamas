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
import { OccupationalTherapyService } from './occupational-therapy.service';
import { CreateOTAssessmentDto, CreateOTRehabPlanDto } from './dto/create-occupational-therapy.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Occupational Therapy')
@ApiBearerAuth('access-token')
@Controller('occupational-therapy')
export class OccupationalTherapyController {
  constructor(private readonly occupationalTherapyService: OccupationalTherapyService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create ADL assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateOTAssessmentDto,
  ) {
    return this.occupationalTherapyService.createAssessment(tenantId, dto);
  }

  @Post('rehab-plan')
  @ApiOperation({ summary: 'Create occupational rehabilitation plan' })
  @ApiResponse({ status: 201, description: 'Rehab plan created' })
  async createRehabPlan(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateOTRehabPlanDto,
  ) {
    return this.occupationalTherapyService.createRehabPlan(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get occupational therapy history' })
  @ApiResponse({ status: 200, description: 'OT history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.occupationalTherapyService.findByPatient(tenantId, patientId);
  }
}
