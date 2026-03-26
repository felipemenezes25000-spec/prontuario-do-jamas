import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CardiacArrestService } from './cardiac-arrest.service';
import {
  ActivateCodeBlueDto,
  RecordCprCycleDto,
  RecordDefibrillationDto,
  RecordAclsDrugDto,
  RecordAirwayDto,
  TerminateCodeDto,
} from './dto/cardiac-arrest.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Cardiac Arrest / Code Blue')
@ApiBearerAuth('access-token')
@Controller('cardiac-arrest')
export class CardiacArrestController {
  constructor(private readonly cardiacArrestService: CardiacArrestService) {}

  @Post('activate')
  @ApiOperation({ summary: 'Activate Code Blue event (Código Azul)' })
  @ApiResponse({ status: 201, description: 'Code Blue activated' })
  async activateCodeBlue(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ActivateCodeBlueDto,
  ) {
    return this.cardiacArrestService.activateCodeBlue(tenantId, user.sub, dto);
  }

  @Post(':codeId/cpr-cycle')
  @ApiParam({ name: 'codeId', description: 'Code Blue UUID' })
  @ApiOperation({ summary: 'Record CPR cycle during Code Blue' })
  @ApiResponse({ status: 201, description: 'CPR cycle recorded' })
  async recordCprCycle(
    @CurrentTenant() tenantId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
    @Body() dto: RecordCprCycleDto,
  ) {
    return this.cardiacArrestService.recordCprCycle(tenantId, codeId, dto);
  }

  @Post(':codeId/defibrillation')
  @ApiParam({ name: 'codeId', description: 'Code Blue UUID' })
  @ApiOperation({ summary: 'Record defibrillation attempt' })
  @ApiResponse({ status: 201, description: 'Defibrillation recorded' })
  async recordDefibrillation(
    @CurrentTenant() tenantId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
    @Body() dto: RecordDefibrillationDto,
  ) {
    return this.cardiacArrestService.recordDefibrillation(tenantId, codeId, dto);
  }

  @Post(':codeId/acls-drug')
  @ApiParam({ name: 'codeId', description: 'Code Blue UUID' })
  @ApiOperation({ summary: 'Record ACLS drug administration' })
  @ApiResponse({ status: 201, description: 'ACLS drug recorded' })
  async recordAclsDrug(
    @CurrentTenant() tenantId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
    @Body() dto: RecordAclsDrugDto,
  ) {
    return this.cardiacArrestService.recordAclsDrug(tenantId, codeId, dto);
  }

  @Post(':codeId/airway')
  @ApiParam({ name: 'codeId', description: 'Code Blue UUID' })
  @ApiOperation({ summary: 'Record airway management' })
  @ApiResponse({ status: 201, description: 'Airway management recorded' })
  async recordAirway(
    @CurrentTenant() tenantId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
    @Body() dto: RecordAirwayDto,
  ) {
    return this.cardiacArrestService.recordAirway(tenantId, codeId, dto);
  }

  @Post(':codeId/terminate')
  @ApiParam({ name: 'codeId', description: 'Code Blue UUID' })
  @ApiOperation({ summary: 'Terminate Code Blue (ROSC or death)' })
  @ApiResponse({ status: 200, description: 'Code Blue terminated' })
  async terminateCode(
    @CurrentTenant() tenantId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
    @Body() dto: TerminateCodeDto,
  ) {
    return this.cardiacArrestService.terminateCode(tenantId, codeId, dto);
  }

  @Get(':codeId/timeline')
  @ApiParam({ name: 'codeId', description: 'Code Blue UUID' })
  @ApiOperation({ summary: 'Get full timeline of a Code Blue event' })
  @ApiResponse({ status: 200, description: 'Code Blue timeline with elapsed time' })
  async getCodeTimeline(
    @CurrentTenant() tenantId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
  ) {
    return this.cardiacArrestService.getCodeTimeline(tenantId, codeId);
  }

  @Get()
  @ApiOperation({ summary: 'List Code Blue events with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of Code Blue events' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'ROSC', 'DEATH', 'TRANSFER'] })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listCodes(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cardiacArrestService.listCodes(tenantId, {
      status,
      patientId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
