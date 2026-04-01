import {
  Controller,
  Get,
  Post,
  Put,
  Body,
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
import { SurgicalSafetyService } from './surgical-safety.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  SpongeCountDto,
  PreAnesthesiaDto,
  AnesthesiaRecordSafetyDto,
  IntraopMonitoringDto,
  OperatingRoomMapDto,
  RoomUtilizationDto,
  PreferenceCardDto,
  ErasProtocolDto,
} from './dto/surgical-safety.dto';

@ApiTags('Surgical Safety')
@ApiBearerAuth('access-token')
@Controller('surgical')
export class SurgicalSafetyController {
  constructor(private readonly service: SurgicalSafetyService) {}

  // ===========================================================================
  // A) Sponge / Instrument Count
  // ===========================================================================

  @Post('safety/sponge-count')
  @ApiOperation({ summary: 'Record sponge/instrument count — alerts on mismatch (before vs after)' })
  @ApiResponse({ status: 201, description: 'Sponge count recorded' })
  @ApiResponse({ status: 404, description: 'Surgical procedure not found' })
  async recordSpongeCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SpongeCountDto,
  ) {
    return this.service.recordSpongeCount(tenantId, user.sub, dto);
  }

  @Get('safety/sponge-count/:surgeryId')
  @ApiParam({ name: 'surgeryId', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Get full sponge count history for a surgery' })
  @ApiResponse({ status: 200, description: 'Sponge count history' })
  async getSpongeCountHistory(
    @CurrentTenant() tenantId: string,
    @Param('surgeryId', ParseUUIDPipe) surgeryId: string,
  ) {
    return this.service.getSpongeCountHistory(tenantId, surgeryId);
  }

  // ===========================================================================
  // B) Pre-Anesthesia Assessment (APA)
  // ===========================================================================

  @Post('safety/pre-anesthesia')
  @ApiOperation({ summary: 'Record pre-anesthesia assessment — Mallampati, ASA, fasting, airway' })
  @ApiResponse({ status: 201, description: 'Pre-anesthesia assessment recorded' })
  @ApiResponse({ status: 400, description: 'Insufficient fasting time' })
  async recordPreAnesthesia(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreAnesthesiaDto,
  ) {
    return this.service.recordPreAnesthesia(tenantId, user.sub, dto);
  }

  @Get('safety/pre-anesthesia/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get latest pre-anesthesia assessment for a patient' })
  @ApiResponse({ status: 200, description: 'Pre-anesthesia assessment or null' })
  async getPreAnesthesia(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getPreAnesthesia(tenantId, patientId);
  }

  // ===========================================================================
  // C) Digital Anesthesia Record
  // ===========================================================================

  @Post('safety/anesthesia-record')
  @ApiOperation({ summary: 'Create full digital anesthesia record — drugs, events, vitals graph' })
  @ApiResponse({ status: 201, description: 'Anesthesia record created' })
  @ApiResponse({ status: 404, description: 'Surgical procedure not found' })
  async createAnesthesiaRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AnesthesiaRecordSafetyDto,
  ) {
    return this.service.createAnesthesiaRecord(tenantId, user.sub, dto);
  }

  @Get('safety/anesthesia-record/:surgeryId')
  @ApiParam({ name: 'surgeryId', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Get anesthesia record for a surgery' })
  @ApiResponse({ status: 200, description: 'Anesthesia record or null' })
  async getAnesthesiaRecord(
    @CurrentTenant() tenantId: string,
    @Param('surgeryId', ParseUUIDPipe) surgeryId: string,
  ) {
    return this.service.getAnesthesiaRecord(tenantId, surgeryId);
  }

  // ===========================================================================
  // D) Intraoperative Monitoring (every 5 min)
  // ===========================================================================

  @Post('safety/intraop-monitoring')
  @ApiOperation({ summary: 'Add intraoperative monitoring reading — BP, HR, SpO2, CO2, BIS, temp' })
  @ApiResponse({ status: 201, description: 'Monitoring reading appended' })
  @ApiResponse({ status: 404, description: 'Surgical procedure not found' })
  async addIntraopReading(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: IntraopMonitoringDto,
  ) {
    return this.service.addIntraopReading(tenantId, user.sub, dto);
  }

  @Get('safety/intraop-monitoring/:surgeryId')
  @ApiParam({ name: 'surgeryId', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Get full intraoperative monitoring timeline for a surgery' })
  @ApiResponse({ status: 200, description: 'Monitoring timeline' })
  async getIntraopTimeline(
    @CurrentTenant() tenantId: string,
    @Param('surgeryId', ParseUUIDPipe) surgeryId: string,
  ) {
    return this.service.getIntraopTimeline(tenantId, surgeryId);
  }

  // ===========================================================================
  // E) Operating Room Map
  // ===========================================================================

  @Put('safety/or-map')
  @ApiOperation({ summary: 'Update real-time operating room map — in-use, available, cleaning' })
  @ApiResponse({ status: 200, description: 'OR map updated' })
  async updateORMap(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OperatingRoomMapDto,
  ) {
    return this.service.updateORMap(tenantId, user.sub, dto);
  }

  @Get('safety/or-map')
  @ApiOperation({ summary: 'Get current operating room map snapshot' })
  @ApiResponse({ status: 200, description: 'Current OR map or null' })
  async getCurrentORMap(@CurrentTenant() tenantId: string) {
    return this.service.getCurrentORMap(tenantId);
  }

  // ===========================================================================
  // F) Room Utilization Metrics
  // ===========================================================================

  @Post('safety/room-utilization')
  @ApiOperation({ summary: 'Record room utilization metrics — turnover time, delays, first-case on-time' })
  @ApiResponse({ status: 201, description: 'Room utilization recorded' })
  async recordRoomUtilization(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RoomUtilizationDto,
  ) {
    return this.service.recordRoomUtilization(tenantId, user.sub, dto);
  }

  @Get('safety/room-utilization/:roomId')
  @ApiParam({ name: 'roomId', description: 'Operating room identifier' })
  @ApiOperation({ summary: 'Get room utilization history (last 30 entries)' })
  @ApiResponse({ status: 200, description: 'Room utilization history' })
  async getRoomUtilizationHistory(
    @CurrentTenant() tenantId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.service.getRoomUtilizationHistory(tenantId, roomId);
  }

  // ===========================================================================
  // G) Surgeon Preference Cards
  // ===========================================================================

  @Post('safety/preference-card')
  @ApiOperation({ summary: 'Create or update surgeon preference card for a procedure type' })
  @ApiResponse({ status: 200, description: 'Preference card saved' })
  async upsertPreferenceCard(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreferenceCardDto,
  ) {
    return this.service.upsertPreferenceCard(tenantId, user.sub, dto);
  }

  @Get('safety/preference-card/:surgeonId')
  @ApiParam({ name: 'surgeonId', description: 'Surgeon user UUID' })
  @ApiQuery({ name: 'procedureType', required: false, description: 'Filter by procedure type' })
  @ApiOperation({ summary: 'Get preference cards for a surgeon (optionally filter by procedure)' })
  @ApiResponse({ status: 200, description: 'Preference cards list' })
  async getPreferenceCards(
    @CurrentTenant() tenantId: string,
    @Param('surgeonId', ParseUUIDPipe) surgeonId: string,
    @Query('procedureType') procedureType?: string,
  ) {
    if (procedureType) {
      return this.service.getPreferenceCard(tenantId, surgeonId, procedureType);
    }
    return this.service.getSurgeonPreferenceCards(tenantId, surgeonId);
  }

  // ===========================================================================
  // H) ERAS Protocol Checklists
  // ===========================================================================

  @Post('safety/eras-protocol')
  @ApiOperation({ summary: 'Record ERAS protocol phase checklist — pre-op, intra-op, post-op' })
  @ApiResponse({ status: 201, description: 'ERAS protocol phase recorded' })
  @ApiResponse({ status: 404, description: 'Surgical procedure not found' })
  async recordErasProtocol(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ErasProtocolDto,
  ) {
    return this.service.recordErasProtocol(tenantId, user.sub, dto);
  }

  @Get('safety/eras-protocol/:surgeryId')
  @ApiParam({ name: 'surgeryId', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Get ERAS protocol summary across all phases for a surgery' })
  @ApiResponse({ status: 200, description: 'ERAS protocol summary' })
  async getErasProtocolSummary(
    @CurrentTenant() tenantId: string,
    @Param('surgeryId', ParseUUIDPipe) surgeryId: string,
  ) {
    return this.service.getErasProtocolSummary(tenantId, surgeryId);
  }
}
