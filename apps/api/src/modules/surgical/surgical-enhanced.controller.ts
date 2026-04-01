import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SurgicalEnhancedService } from './surgical-enhanced.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  SurgicalCountDto,
  PreAnestheticDto,
  AnesthesiaRecordDto,
  AddVitalsReadingDto,
  AddDrugAdministrationDto,
  CompleteAnesthesiaRecordDto,
  UpdateORRoomStatusDto,
  CreatePreferenceCardDto,
} from './dto/surgical-enhanced.dto';

@ApiTags('Surgical Enhanced')
@ApiBearerAuth('access-token')
@Controller('surgical')
export class SurgicalEnhancedController {
  constructor(private readonly surgicalEnhancedService: SurgicalEnhancedService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // A) Sponge / Instrument Count
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('count')
  @ApiOperation({ summary: 'Record sponge/instrument count (initial, interim, or final)' })
  @ApiResponse({ status: 201, description: 'Surgical count recorded' })
  async recordSurgicalCount(
    @CurrentTenant() tenantId: string,
    @Body() dto: SurgicalCountDto,
  ) {
    return this.surgicalEnhancedService.recordSurgicalCount(tenantId, dto);
  }

  @Post('count/verify')
  @ApiOperation({ summary: 'Verify count reconciliation for a procedure' })
  @ApiResponse({ status: 200, description: 'Count reconciliation result' })
  async verifyCountReconciliation(
    @CurrentTenant() tenantId: string,
    @Body('procedureId') procedureId: string,
  ) {
    return this.surgicalEnhancedService.verifyCountReconciliation(tenantId, procedureId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B) Pre-Anesthetic Assessment (APA)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('pre-anesthetic')
  @ApiOperation({ summary: 'Create pre-anesthetic assessment (APA)' })
  @ApiResponse({ status: 201, description: 'Pre-anesthetic assessment created' })
  async createPreAnestheticAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: PreAnestheticDto,
  ) {
    return this.surgicalEnhancedService.createPreAnestheticAssessment(tenantId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // C) Anesthesia Record (Ficha Anestesica)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('anesthesia-record')
  @ApiOperation({ summary: 'Start a new anesthesia record' })
  @ApiResponse({ status: 201, description: 'Anesthesia record started' })
  async startAnesthesiaRecord(
    @CurrentTenant() tenantId: string,
    @Body() dto: AnesthesiaRecordDto,
  ) {
    return this.surgicalEnhancedService.startAnesthesiaRecord(tenantId, dto);
  }

  @Post('anesthesia-record/:id/vitals')
  @ApiParam({ name: 'id', description: 'Anesthesia record UUID' })
  @ApiOperation({ summary: 'Add vitals reading to anesthesia record (every 5 min)' })
  @ApiResponse({ status: 201, description: 'Vitals reading added' })
  async recordVitalsReading(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddVitalsReadingDto,
  ) {
    return this.surgicalEnhancedService.recordVitalsReading(tenantId, id, dto);
  }

  @Post('anesthesia-record/:id/drug')
  @ApiParam({ name: 'id', description: 'Anesthesia record UUID' })
  @ApiOperation({ summary: 'Record drug administration during anesthesia' })
  @ApiResponse({ status: 201, description: 'Drug administration recorded' })
  async recordDrugAdministration(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDrugAdministrationDto,
  ) {
    return this.surgicalEnhancedService.recordDrugAdministration(tenantId, id, dto);
  }

  @Patch('anesthesia-record/:id/complete')
  @ApiParam({ name: 'id', description: 'Anesthesia record UUID' })
  @ApiOperation({ summary: 'Complete anesthesia record (emergence phase + Aldrete)' })
  @ApiResponse({ status: 200, description: 'Anesthesia record completed' })
  async completeAnesthesiaRecord(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteAnesthesiaRecordDto,
  ) {
    return this.surgicalEnhancedService.completeAnesthesiaRecord(tenantId, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // D) OR Room Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('or-dashboard')
  @ApiOperation({ summary: 'Get OR room dashboard (all rooms status, utilization)' })
  @ApiResponse({ status: 200, description: 'OR dashboard data' })
  async getORDashboard(@CurrentTenant() tenantId: string) {
    return this.surgicalEnhancedService.getORDashboard(tenantId);
  }

  @Patch('or-rooms/:id/status')
  @ApiParam({ name: 'id', description: 'OR Room ID' })
  @ApiOperation({ summary: 'Update OR room status' })
  @ApiResponse({ status: 200, description: 'Room status updated' })
  async updateRoomStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') roomId: string,
    @Body() dto: UpdateORRoomStatusDto,
  ) {
    return this.surgicalEnhancedService.updateRoomStatus(tenantId, roomId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E) Preference Cards
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('preference-cards')
  @ApiOperation({ summary: 'Create surgeon preference card' })
  @ApiResponse({ status: 201, description: 'Preference card created' })
  async createPreferenceCard(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePreferenceCardDto,
  ) {
    return this.surgicalEnhancedService.createPreferenceCard(tenantId, user.sub, dto);
  }

  @Get('preference-cards/:surgeonId/:procedure')
  @ApiParam({ name: 'surgeonId', description: 'Surgeon UUID' })
  @ApiParam({ name: 'procedure', description: 'Procedure type' })
  @ApiOperation({ summary: 'Get preference card by surgeon and procedure type' })
  @ApiResponse({ status: 200, description: 'Preference card details' })
  async getPreferenceCard(
    @CurrentTenant() tenantId: string,
    @Param('surgeonId', ParseUUIDPipe) surgeonId: string,
    @Param('procedure') procedure: string,
  ) {
    return this.surgicalEnhancedService.getPreferenceCard(tenantId, surgeonId, procedure);
  }
}
