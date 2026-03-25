import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { BreakTheGlassService } from './break-the-glass.service';
import {
  RequestEmergencyAccessDto,
  BreakTheGlassEventResponseDto,
  BreakTheGlassAlertsResponseDto,
} from './dto/break-the-glass.dto';

@ApiTags('Compliance — Break the Glass')
@ApiBearerAuth('access-token')
@Controller('compliance/break-the-glass')
export class BreakTheGlassController {
  constructor(private readonly btgService: BreakTheGlassService) {}

  @Post()
  @ApiOperation({ summary: 'Request emergency access (break the glass)' })
  @ApiResponse({ status: 201, type: BreakTheGlassEventResponseDto })
  async requestAccess(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: RequestEmergencyAccessDto,
  ): Promise<BreakTheGlassEventResponseDto> {
    return this.btgService.requestAccess(
      tenantId,
      user.sub,
      user.role,
      dto.patientId,
      dto.reason,
      dto.justification,
      dto.durationMinutes,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List break-the-glass events' })
  @ApiResponse({ status: 200, type: [BreakTheGlassEventResponseDto] })
  async listEvents(
    @CurrentTenant() tenantId: string,
  ): Promise<BreakTheGlassEventResponseDto[]> {
    return this.btgService.listEvents(tenantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'DPO alerts for review' })
  @ApiResponse({ status: 200, type: BreakTheGlassAlertsResponseDto })
  async getAlerts(
    @CurrentTenant() tenantId: string,
  ): Promise<BreakTheGlassAlertsResponseDto> {
    return this.btgService.getAlerts(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get break-the-glass event details' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, type: BreakTheGlassEventResponseDto })
  async getEvent(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BreakTheGlassEventResponseDto> {
    return this.btgService.getEvent(tenantId, id);
  }
}
