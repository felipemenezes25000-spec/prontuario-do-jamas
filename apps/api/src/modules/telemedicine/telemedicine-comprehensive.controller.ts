import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TelemedicineComprehensiveService } from './telemedicine-comprehensive.service';
import {
  CreateTeleconsultationDto,
  SessionStatusDto,
  WaitingRoomDto,
  ScreenShareDto,
  SessionChatMessageDto,
  RecordingConsentDto,
  RecordingDto,
  StoreForwardCaseDto,
  StoreForwardResponseDto,
  RPMEnrollmentDto,
  RPMReadingDto,
  TeleconsultoriaDto,
  TeleconsultoriaResponseDto,
  AddParticipantDto,
} from './dto/telemedicine-comprehensive.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Telemedicine')
@ApiBearerAuth('access-token')
@Controller('telemedicine')
export class TelemedicineComprehensiveController {
  constructor(
    private readonly telemedicineService: TelemedicineComprehensiveService,
  ) {}

  // ========================================================================
  // Video Session Management
  // ========================================================================

  @Post('sessions')
  @ApiOperation({ summary: 'Create teleconsultation session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTeleconsultationDto,
  ) {
    return this.telemedicineService.createSession(tenantId, dto);
  }

  @Patch('sessions/:id/status')
  @ApiOperation({ summary: 'Update session status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateSessionStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SessionStatusDto,
  ) {
    return this.telemedicineService.updateSessionStatus(tenantId, id, dto);
  }

  // ========================================================================
  // Virtual Waiting Room
  // ========================================================================

  @Post('waiting-room/join')
  @ApiOperation({ summary: 'Join virtual waiting room' })
  @ApiResponse({ status: 201, description: 'Joined waiting room' })
  async joinWaitingRoom(
    @CurrentTenant() tenantId: string,
    @Body() dto: WaitingRoomDto,
  ) {
    return this.telemedicineService.joinWaitingRoom(tenantId, dto);
  }

  @Get('waiting-room/dashboard')
  @ApiOperation({ summary: 'Get waiting room dashboard with stats' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getWaitingRoomDashboard(@CurrentTenant() tenantId: string) {
    return this.telemedicineService.getWaitingRoomDashboard(tenantId);
  }

  @Post('waiting-room/:sessionId/admit')
  @ApiOperation({ summary: 'Admit patient from waiting room into session' })
  @ApiResponse({ status: 200, description: 'Patient admitted' })
  async admitPatient(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.telemedicineService.admitPatient(tenantId, sessionId, patientId);
  }

  // ========================================================================
  // Screen Sharing
  // ========================================================================

  @Post('screen-share/start')
  @ApiOperation({ summary: 'Start screen share in session' })
  @ApiResponse({ status: 201, description: 'Screen share started' })
  async startScreenShare(
    @CurrentTenant() tenantId: string,
    @Body() dto: ScreenShareDto,
  ) {
    return this.telemedicineService.startScreenShare(tenantId, dto);
  }

  @Post('screen-share/:sessionId/end')
  @ApiOperation({ summary: 'End screen share' })
  @ApiResponse({ status: 200, description: 'Screen share ended' })
  async endScreenShare(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('shareId') shareId: string,
  ) {
    return this.telemedicineService.endScreenShare(tenantId, sessionId, shareId);
  }

  @Get('screen-share/:sessionId')
  @ApiOperation({ summary: 'Get active screen shares for session' })
  @ApiResponse({ status: 200, description: 'Active shares' })
  async getActiveShares(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.telemedicineService.getActiveShares(tenantId, sessionId);
  }

  // ========================================================================
  // In-session Chat
  // ========================================================================

  @Post('chat/message')
  @ApiOperation({ summary: 'Send chat message in session' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendChatMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: SessionChatMessageDto,
  ) {
    return this.telemedicineService.sendChatMessage(tenantId, dto);
  }

  @Get('chat/:sessionId')
  @ApiOperation({ summary: 'Get all chat messages for a session' })
  @ApiResponse({ status: 200, description: 'Chat messages' })
  async getSessionChat(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.telemedicineService.getSessionChat(tenantId, sessionId);
  }

  // ========================================================================
  // Recording with Consent
  // ========================================================================

  @Post('recording/consent')
  @ApiOperation({ summary: 'Record patient consent for session recording' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordingConsentDto,
  ) {
    return this.telemedicineService.recordConsent(tenantId, dto);
  }

  @Post('recording/start')
  @ApiOperation({ summary: 'Start recording session (requires prior consent)' })
  @ApiResponse({ status: 201, description: 'Recording started' })
  async startRecording(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordingDto,
  ) {
    return this.telemedicineService.startRecording(tenantId, dto);
  }

  @Post('recording/stop')
  @ApiOperation({ summary: 'Stop recording session' })
  @ApiResponse({ status: 200, description: 'Recording stopped' })
  async stopRecording(
    @CurrentTenant() tenantId: string,
    @Body('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.telemedicineService.stopRecording(tenantId, sessionId);
  }

  @Get('recording/:sessionId')
  @ApiOperation({ summary: 'Get recording info for session' })
  @ApiResponse({ status: 200, description: 'Recording info' })
  async getRecording(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.telemedicineService.getRecording(tenantId, sessionId);
  }

  // ========================================================================
  // Store-and-Forward (Asynchronous)
  // ========================================================================

  @Post('store-forward')
  @ApiOperation({ summary: 'Create store-and-forward case' })
  @ApiResponse({ status: 201, description: 'Case created' })
  async createStoreForwardCase(
    @CurrentTenant() tenantId: string,
    @Body() dto: StoreForwardCaseDto,
  ) {
    return this.telemedicineService.createStoreForwardCase(tenantId, dto);
  }

  @Post('store-forward/:id/respond')
  @ApiOperation({ summary: 'Respond to store-and-forward case' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  async respondToCase(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StoreForwardResponseDto,
  ) {
    return this.telemedicineService.respondToCase(tenantId, id, dto);
  }

  @Get('store-forward/open')
  @ApiOperation({ summary: 'Get all open store-and-forward cases' })
  @ApiResponse({ status: 200, description: 'Open cases' })
  async getOpenCases(@CurrentTenant() tenantId: string) {
    return this.telemedicineService.getOpenCases(tenantId);
  }

  // ========================================================================
  // Remote Patient Monitoring (RPM)
  // ========================================================================

  @Post('rpm/enroll')
  @ApiOperation({ summary: 'Enroll patient in remote monitoring program' })
  @ApiResponse({ status: 201, description: 'Enrollment created' })
  async enrollRPM(
    @CurrentTenant() tenantId: string,
    @Body() dto: RPMEnrollmentDto,
  ) {
    return this.telemedicineService.enrollRPM(tenantId, dto);
  }

  @Post('rpm/reading')
  @ApiOperation({ summary: 'Record RPM device reading' })
  @ApiResponse({ status: 201, description: 'Reading recorded' })
  async recordRPMReading(
    @CurrentTenant() tenantId: string,
    @Body() dto: RPMReadingDto,
  ) {
    return this.telemedicineService.recordRPMReading(tenantId, dto);
  }

  @Get('rpm/dashboard/:patientId')
  @ApiOperation({ summary: 'Get RPM dashboard with trends for patient' })
  @ApiResponse({ status: 200, description: 'RPM dashboard' })
  async getRPMDashboard(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.telemedicineService.getRPMDashboard(tenantId, patientId);
  }

  @Get('rpm/alerts')
  @ApiOperation({ summary: 'Get all unacknowledged RPM alerts' })
  @ApiResponse({ status: 200, description: 'RPM alerts sorted by severity' })
  async getRPMAlerts(@CurrentTenant() tenantId: string) {
    return this.telemedicineService.checkRPMAlerts(tenantId);
  }

  // ========================================================================
  // Teleconsultoria (Provider-to-Provider)
  // ========================================================================

  @Post('teleconsultoria')
  @ApiOperation({ summary: 'Create teleconsultoria request (provider-to-provider)' })
  @ApiResponse({ status: 201, description: 'Teleconsultoria created' })
  async createTeleconsultoria(
    @CurrentTenant() tenantId: string,
    @Body() dto: TeleconsultoriaDto,
  ) {
    return this.telemedicineService.createTeleconsultoria(tenantId, dto);
  }

  @Post('teleconsultoria/:id/respond')
  @ApiOperation({ summary: 'Respond to teleconsultoria request' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  async respondTeleconsultoria(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TeleconsultoriaResponseDto,
  ) {
    return this.telemedicineService.respondTeleconsultoria(tenantId, id, dto);
  }

  // ========================================================================
  // Multi-participant Session
  // ========================================================================

  @Post('sessions/:id/participants')
  @ApiOperation({ summary: 'Add participant to session' })
  @ApiResponse({ status: 201, description: 'Participant added' })
  async addParticipant(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParticipantDto,
  ) {
    dto.sessionId = id;
    return this.telemedicineService.addParticipant(tenantId, dto);
  }

  @Delete('sessions/:id/participants/:participantId')
  @ApiOperation({ summary: 'Remove participant from session' })
  @ApiResponse({ status: 200, description: 'Participant removed' })
  async removeParticipant(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.telemedicineService.removeParticipant(tenantId, id, participantId);
  }

  @Get('sessions/:id/participants')
  @ApiOperation({ summary: 'Get session participants' })
  @ApiResponse({ status: 200, description: 'Participant list' })
  async getSessionParticipants(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.telemedicineService.getSessionParticipants(tenantId, id);
  }
}
