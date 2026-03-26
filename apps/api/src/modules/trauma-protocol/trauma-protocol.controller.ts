import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TraumaProtocolService } from './trauma-protocol.service';
import {
  ActivateTraumaDto,
  RecordPrimarySurveyDto,
  RecordFastExamDto,
  RecordTraumaScoresDto,
} from './dto/trauma-protocol.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Trauma Protocol')
@ApiBearerAuth('access-token')
@Controller('trauma-protocol')
export class TraumaProtocolController {
  constructor(private readonly traumaProtocolService: TraumaProtocolService) {}

  @Post('activate')
  @ApiOperation({ summary: 'Activate trauma protocol' })
  @ApiResponse({ status: 201, description: 'Trauma protocol activated' })
  async activateTrauma(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ActivateTraumaDto,
  ) {
    return this.traumaProtocolService.activateTrauma(tenantId, user.sub, dto);
  }

  @Post('primary-survey')
  @ApiOperation({ summary: 'Record ABCDE primary survey' })
  @ApiResponse({ status: 201, description: 'Primary survey recorded' })
  async recordPrimarySurvey(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordPrimarySurveyDto,
  ) {
    return this.traumaProtocolService.recordPrimarySurvey(tenantId, user.sub, dto);
  }

  @Post('fast-exam')
  @ApiOperation({ summary: 'Record FAST ultrasound exam' })
  @ApiResponse({ status: 201, description: 'FAST exam recorded' })
  async recordFastExam(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordFastExamDto,
  ) {
    return this.traumaProtocolService.recordFastExam(tenantId, user.sub, dto);
  }

  @Post('scores')
  @ApiOperation({ summary: 'Record trauma scores (ISS, RTS, TRISS)' })
  @ApiResponse({ status: 201, description: 'Trauma scores recorded' })
  async recordTraumaScores(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordTraumaScoresDto,
  ) {
    return this.traumaProtocolService.recordTraumaScores(tenantId, user.sub, dto);
  }

  @Get(':id/timeline')
  @ApiParam({ name: 'id', description: 'Trauma protocol UUID' })
  @ApiOperation({ summary: 'Get trauma event timeline' })
  @ApiResponse({ status: 200, description: 'Timeline with elapsed time' })
  async getTimeline(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.traumaProtocolService.getTraumaTimeline(tenantId, id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active trauma cases' })
  @ApiResponse({ status: 200, description: 'List of active trauma protocols' })
  async getActiveTraumas(@CurrentTenant() tenantId: string) {
    return this.traumaProtocolService.getActiveTraumas(tenantId);
  }
}
