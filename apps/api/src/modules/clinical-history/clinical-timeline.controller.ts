import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClinicalTimelineService } from './clinical-timeline.service';
import { ClinicalTimelineQueryDto, TimelineEventType } from './dto/clinical-timeline.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Timeline')
@ApiBearerAuth('access-token')
@Controller('patients/:patientId/timeline')
export class ClinicalTimelineController {
  constructor(private readonly service: ClinicalTimelineService) {}

  @Get()
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'eventTypes', enum: TimelineEventType, isArray: true, required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max events (default 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset (default 0)' })
  @ApiOperation({
    summary: 'Get visual clinical timeline — all events (consultations, exams, prescriptions, surgeries, diagnoses, etc.) sorted by date',
  })
  @ApiResponse({ status: 200, description: 'Clinical timeline' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getTimeline(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: ClinicalTimelineQueryDto,
  ) {
    return this.service.getTimeline(tenantId, patientId, query);
  }
}
