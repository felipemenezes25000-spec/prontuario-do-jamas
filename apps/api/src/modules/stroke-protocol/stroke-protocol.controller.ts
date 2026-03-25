import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StrokeProtocolService } from './stroke-protocol.service';
import {
  ActivateStrokeCodeDto,
  CreateNihssAssessmentDto,
  UpdateStrokeChecklistDto,
} from './dto/create-stroke-protocol.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Stroke Protocol')
@ApiBearerAuth('access-token')
@Controller('stroke-protocol')
export class StrokeProtocolController {
  constructor(private readonly strokeProtocolService: StrokeProtocolService) {}

  @Post('activate')
  @ApiOperation({ summary: 'Activate stroke code' })
  @ApiResponse({ status: 201, description: 'Stroke code activated' })
  async activateStrokeCode(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ActivateStrokeCodeDto,
  ) {
    return this.strokeProtocolService.activateStrokeCode(tenantId, user.sub, dto);
  }

  @Post(':id/nihss')
  @ApiParam({ name: 'id', description: 'Stroke protocol UUID' })
  @ApiOperation({ summary: 'NIHSS assessment' })
  @ApiResponse({ status: 201, description: 'NIHSS assessment recorded' })
  async createNihssAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNihssAssessmentDto,
  ) {
    return this.strokeProtocolService.createNihssAssessment(tenantId, user.sub, id, dto);
  }

  @Patch(':id/checklist')
  @ApiParam({ name: 'id', description: 'Stroke protocol UUID' })
  @ApiOperation({ summary: 'Update thrombolysis/thrombectomy checklist' })
  @ApiResponse({ status: 200, description: 'Checklist updated' })
  async updateChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStrokeChecklistDto,
  ) {
    return this.strokeProtocolService.updateChecklist(tenantId, user.sub, id, dto);
  }

  @Get(':id/timeline')
  @ApiParam({ name: 'id', description: 'Stroke protocol UUID' })
  @ApiOperation({ summary: 'Get door-to-needle timeline' })
  @ApiResponse({ status: 200, description: 'Timeline with metrics' })
  async getTimeline(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.strokeProtocolService.getTimeline(tenantId, id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active stroke codes' })
  @ApiResponse({ status: 200, description: 'Active stroke codes' })
  async getActiveCases(@CurrentTenant() tenantId: string) {
    return this.strokeProtocolService.getActiveCases(tenantId);
  }
}
