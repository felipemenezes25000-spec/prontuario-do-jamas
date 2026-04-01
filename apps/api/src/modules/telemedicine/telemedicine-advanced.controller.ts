import {
  Controller,
  Get,
  Post,
  Delete,
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
import { TelemedicineAdvancedService } from './telemedicine-advanced.service';
import {
  StartScreenShareDto,
  StopScreenShareDto,
  SendChatMessageDto,
  JoinWaitingRoomDto,
  AdmitFromWaitingRoomDto,
  StartRecordingDto,
  LogRecordingAccessDto,
  CreateStoreForwardDto,
  RespondStoreForwardDto,
  EnrollRPMDto,
  SubmitRPMReadingDto,
  CreateTeleconsultancyDto,
  RespondTeleconsultancyDto,
  AddParticipantDto,
  RemoveParticipantDto,
} from './dto/telemedicine-advanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Telemedicine — Advanced')
@ApiBearerAuth('access-token')
@Controller('telemedicine')
export class TelemedicineAdvancedController {
  constructor(private readonly service: TelemedicineAdvancedService) {}

  // ─── Screen Sharing ───────────────────────────────────────────────────────

  @Post('screen-share/start')
  @ApiOperation({ summary: 'Start screen sharing during teleconsultation' })
  @ApiResponse({ status: 201, description: 'Screen share started' })
  async startScreenShare(
    @CurrentTenant() tenantId: string,
    @Body() dto: StartScreenShareDto,
  ) {
    return this.service.startScreenShare(tenantId, dto);
  }

  @Post('screen-share/stop')
  @ApiOperation({ summary: 'Stop screen sharing' })
  @ApiResponse({ status: 201, description: 'Screen share stopped' })
  async stopScreenShare(
    @CurrentTenant() tenantId: string,
    @Body() dto: StopScreenShareDto,
  ) {
    return this.service.stopScreenShare(tenantId, dto);
  }

  @Get('screen-share/:sessionId')
  @ApiOperation({ summary: 'List screen shares for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getScreenShares(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getScreenShares(tenantId, sessionId);
  }

  // ─── Text Chat ────────────────────────────────────────────────────────────

  @Post('chat/message')
  @ApiOperation({ summary: 'Send text message during video call' })
  @ApiResponse({ status: 201, description: 'Message stored' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.service.sendChatMessage(tenantId, dto);
  }

  @Get('chat/:sessionId')
  @ApiOperation({ summary: 'Get chat messages for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getMessages(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getChatMessages(tenantId, sessionId);
  }

  // ─── Virtual Waiting Room ─────────────────────────────────────────────────

  @Post('waiting-room/join')
  @ApiOperation({ summary: 'Patient joins the virtual waiting room' })
  @ApiResponse({ status: 201, description: 'Patient added to waiting room' })
  async joinWaitingRoom(
    @CurrentTenant() tenantId: string,
    @Body() dto: JoinWaitingRoomDto,
  ) {
    return this.service.joinWaitingRoom(tenantId, dto);
  }

  @Post('waiting-room/admit')
  @ApiOperation({ summary: 'Doctor admits patient from waiting room into the call' })
  @ApiResponse({ status: 201, description: 'Patient admitted' })
  async admitPatient(
    @CurrentTenant() tenantId: string,
    @Body() dto: AdmitFromWaitingRoomDto,
  ) {
    return this.service.admitFromWaitingRoom(tenantId, dto);
  }

  @Get('waiting-room/:sessionId')
  @ApiOperation({ summary: 'Get waiting room queue for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getWaitingRoom(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getWaitingRoom(tenantId, sessionId);
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  @Post('recording/start')
  @ApiOperation({ summary: 'Start recording (requires patient consent — CFM compliant)' })
  @ApiResponse({ status: 201, description: 'Recording started' })
  async startRecording(
    @CurrentTenant() tenantId: string,
    @Body() dto: StartRecordingDto,
  ) {
    return this.service.startRecording(tenantId, dto);
  }

  @Post('recording/stop/:sessionId')
  @ApiOperation({ summary: 'Stop recording and upload to S3' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async stopRecording(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.stopRecording(tenantId, sessionId);
  }

  @Post('recording/access-log')
  @ApiOperation({ summary: 'Audit-log access to a session recording' })
  @ApiResponse({ status: 201, description: 'Access logged' })
  async logAccess(
    @CurrentTenant() tenantId: string,
    @Body() dto: LogRecordingAccessDto,
  ) {
    return this.service.logRecordingAccess(tenantId, dto);
  }

  @Get('recording/:sessionId')
  @ApiOperation({ summary: 'Get recording info and access log for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getRecording(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getRecording(tenantId, sessionId);
  }

  // ─── Store-and-Forward ────────────────────────────────────────────────────

  @Post('store-forward')
  @ApiOperation({ summary: 'Create async teleconsultation case (e.g. dermatology images)' })
  @ApiResponse({ status: 201, description: 'Case submitted to specialist' })
  async createCase(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateStoreForwardDto,
  ) {
    return this.service.createStoreForwardCase(tenantId, dto);
  }

  @Post('store-forward/respond')
  @ApiOperation({ summary: 'Specialist responds to async teleconsultation case' })
  @ApiResponse({ status: 201, description: 'Response recorded' })
  async respondCase(
    @CurrentTenant() tenantId: string,
    @Body() dto: RespondStoreForwardDto,
  ) {
    return this.service.respondToStoreForward(tenantId, dto);
  }

  @Get('store-forward')
  @ApiOperation({ summary: 'List store-and-forward cases' })
  @ApiQuery({ name: 'specialty', required: false })
  async listCases(
    @CurrentTenant() tenantId: string,
    @Query('specialty') specialty?: string,
  ) {
    return this.service.listStoreForwardCases(tenantId, specialty);
  }

  // ─── Remote Patient Monitoring (RPM) ─────────────────────────────────────

  @Post('rpm/enroll')
  @ApiOperation({ summary: 'Enroll patient in Remote Patient Monitoring (RPM)' })
  @ApiResponse({ status: 201, description: 'Patient enrolled in RPM' })
  async enrollRPM(
    @CurrentTenant() tenantId: string,
    @Body() dto: EnrollRPMDto,
  ) {
    return this.service.enrollRPM(tenantId, dto);
  }

  @Post('rpm/reading')
  @ApiOperation({ summary: 'Submit home device reading (BP, glucose, SpO2, weight)' })
  @ApiResponse({ status: 201, description: 'Reading recorded; alerts generated if out of range' })
  async submitReading(
    @CurrentTenant() tenantId: string,
    @Body() dto: SubmitRPMReadingDto,
  ) {
    return this.service.submitRPMReading(tenantId, dto);
  }

  @Get('rpm/:patientId')
  @ApiOperation({ summary: 'Get RPM enrollment and readings for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getRPM(
    @CurrentTenant() tenantId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getRPMEnrollment(tenantId, patientId);
  }

  @Get('rpm/alerts/list')
  @ApiOperation({ summary: 'List RPM alerts (optionally filtered by patient)' })
  @ApiQuery({ name: 'patientId', required: false })
  async listAlerts(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.listRPMAlerts(tenantId, patientId);
  }

  // ─── Doctor-to-Doctor Teleconsultancy ─────────────────────────────────────

  @Post('teleconsultancy')
  @ApiOperation({ summary: 'Request specialist teleconsultancy (tele-ECG, tele-derma, tele-stroke)' })
  @ApiResponse({ status: 201, description: 'Teleconsultancy request created' })
  async createTeleconsultancy(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTeleconsultancyDto,
  ) {
    return this.service.createTeleconsultancy(tenantId, dto);
  }

  @Post('teleconsultancy/respond')
  @ApiOperation({ summary: 'Specialist responds to a teleconsultancy request' })
  @ApiResponse({ status: 201, description: 'Response recorded' })
  async respondTeleconsultancy(
    @CurrentTenant() tenantId: string,
    @Body() dto: RespondTeleconsultancyDto,
  ) {
    return this.service.respondTeleconsultancy(tenantId, dto);
  }

  @Get('teleconsultancy')
  @ApiOperation({ summary: 'List teleconsultancy requests' })
  @ApiQuery({ name: 'specialty', required: false })
  async listTeleconsultancies(
    @CurrentTenant() tenantId: string,
    @Query('specialty') specialty?: string,
  ) {
    return this.service.listTeleconsultancies(tenantId, specialty);
  }

  // ─── Multi-Participant Calls ──────────────────────────────────────────────

  @Post('participants/add')
  @ApiOperation({ summary: 'Add participant to multi-party call (family, interpreter, resident)' })
  @ApiResponse({ status: 201, description: 'Participant added' })
  async addParticipant(
    @CurrentTenant() tenantId: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.service.addParticipant(tenantId, dto);
  }

  @Delete('participants/remove')
  @ApiOperation({ summary: 'Remove participant from session' })
  async removeParticipant(
    @CurrentTenant() tenantId: string,
    @Body() dto: RemoveParticipantDto,
  ) {
    return this.service.removeParticipant(tenantId, dto);
  }

  @Get('participants/:sessionId')
  @ApiOperation({ summary: 'List participants in a multi-party session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getParticipants(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getSessionParticipants(tenantId, sessionId);
  }
}
