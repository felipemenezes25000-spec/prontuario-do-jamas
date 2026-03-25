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
import { SpeechTherapyService } from './speech-therapy.service';
import { CreateSpeechAssessmentDto, RecordSpeechSessionDto } from './dto/create-speech-therapy.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Speech Therapy')
@ApiBearerAuth('access-token')
@Controller('speech-therapy')
export class SpeechTherapyController {
  constructor(private readonly speechTherapyService: SpeechTherapyService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create swallowing/speech assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSpeechAssessmentDto,
  ) {
    return this.speechTherapyService.createAssessment(tenantId, dto);
  }

  @Post('session')
  @ApiOperation({ summary: 'Record speech therapy session' })
  @ApiResponse({ status: 201, description: 'Session recorded' })
  async recordSession(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordSpeechSessionDto,
  ) {
    return this.speechTherapyService.recordSession(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get speech therapy history' })
  @ApiResponse({ status: 200, description: 'Speech therapy history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.speechTherapyService.findByPatient(tenantId, patientId);
  }
}
