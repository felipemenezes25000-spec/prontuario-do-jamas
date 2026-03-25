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
import { PhysiotherapyService } from './physiotherapy.service';
import { CreatePhysiotherapyAssessmentDto, CreateTreatmentPlanDto, RecordSessionDto } from './dto/create-physiotherapy.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Physiotherapy')
@ApiBearerAuth('access-token')
@Controller('physiotherapy')
export class PhysiotherapyController {
  constructor(private readonly physiotherapyService: PhysiotherapyService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create functional assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePhysiotherapyAssessmentDto,
  ) {
    return this.physiotherapyService.createAssessment(tenantId, dto);
  }

  @Post('treatment-plan')
  @ApiOperation({ summary: 'Create physiotherapy treatment plan' })
  @ApiResponse({ status: 201, description: 'Treatment plan created' })
  async createTreatmentPlan(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTreatmentPlanDto,
  ) {
    return this.physiotherapyService.createTreatmentPlan(tenantId, dto);
  }

  @Post(':id/session')
  @ApiParam({ name: 'id', description: 'Physiotherapy record UUID' })
  @ApiOperation({ summary: 'Record physiotherapy session/evolution' })
  @ApiResponse({ status: 201, description: 'Session recorded' })
  async recordSession(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordSessionDto,
  ) {
    return this.physiotherapyService.recordSession(tenantId, id, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient rehabilitation history' })
  @ApiResponse({ status: 200, description: 'Rehabilitation history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.physiotherapyService.findByPatient(tenantId, patientId);
  }
}
