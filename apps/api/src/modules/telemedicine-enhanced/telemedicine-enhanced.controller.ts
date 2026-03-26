import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TelemedicineEnhancedService } from './telemedicine-enhanced.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import {
  JoinWaitingRoomDto,
  StartRecordingDto,
  StopRecordingDto,
  CreateAsyncConsultationDto,
  RespondAsyncConsultationDto,
  ConfigureRpmDto,
  SubmitRpmReadingDto,
  RequestDoctorConsultDto,
  AddParticipantDto,
} from './telemedicine-enhanced.dto';
import { SendChatMessageDto } from './dto/telemedicine-chat.dto';

@ApiTags('Telemedicine — Enhanced')
@ApiBearerAuth('access-token')
@Controller('telemedicine-enhanced')
export class TelemedicineEnhancedController {
  constructor(private readonly service: TelemedicineEnhancedService) {}

  // Virtual Waiting Room
  @Post('waiting-room')
  @ApiOperation({ summary: 'Join virtual waiting room' })
  async joinWaitingRoom(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: JoinWaitingRoomDto,
  ) {
    return this.service.joinWaitingRoom(tenantId, user.email, dto);
  }

  @Get('waiting-room/:roomName')
  @ApiOperation({ summary: 'Get waiting room queue' })
  @ApiParam({ name: 'roomName' })
  async getWaitingRoom(
    @CurrentTenant() tenantId: string,
    @Param('roomName') roomName: string,
  ) {
    return this.service.getWaitingRoom(tenantId, roomName);
  }

  @Patch('waiting-room/:id/admit')
  @ApiOperation({ summary: 'Admit patient from waiting room' })
  @ApiParam({ name: 'id', description: 'Waiting entry UUID' })
  async admitPatient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.admitPatient(tenantId, id);
  }

  // Recording
  @Post('recording/start')
  @ApiOperation({ summary: 'Start teleconsultation recording (with consent)' })
  async startRecording(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartRecordingDto,
  ) {
    return this.service.startRecording(tenantId, user.email, dto);
  }

  @Patch('recording/:id/stop')
  @ApiOperation({ summary: 'Stop teleconsultation recording' })
  @ApiParam({ name: 'id', description: 'Recording UUID' })
  async stopRecording(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StopRecordingDto,
  ) {
    return this.service.stopRecording(tenantId, id, dto.recordingUrl);
  }

  // Async teleconsultation
  @Post('async-consultation')
  @ApiOperation({ summary: 'Create async teleconsultation (store-and-forward)' })
  async createAsyncConsultation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAsyncConsultationDto,
  ) {
    return this.service.createAsyncConsultation(tenantId, user.email, dto);
  }

  @Get('async-consultation')
  @ApiOperation({ summary: 'List async consultations' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async listAsyncConsultations(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('specialty') specialty?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listAsyncConsultations(tenantId, {
      status,
      specialty,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Patch('async-consultation/:id/respond')
  @ApiOperation({ summary: 'Respond to async teleconsultation' })
  @ApiParam({ name: 'id', description: 'Consultation UUID' })
  async respondToAsyncConsultation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondAsyncConsultationDto,
  ) {
    return this.service.respondToAsyncConsultation(tenantId, user.email, id, dto);
  }

  // RPM
  @Post('rpm/config/:patientId')
  @ApiOperation({ summary: 'Configure RPM for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async configureRpm(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: ConfigureRpmDto,
  ) {
    return this.service.configureRpm(tenantId, patientId, dto);
  }

  @Post('rpm/reading')
  @ApiOperation({ summary: 'Submit RPM reading' })
  async submitRpmReading(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitRpmReadingDto,
  ) {
    return this.service.submitRpmReading(tenantId, user.email, dto);
  }

  @Get('rpm/alerts')
  @ApiOperation({ summary: 'Get RPM alerts' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'acknowledged', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getRpmAlerts(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('acknowledged') acknowledged?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getRpmAlerts(tenantId, {
      patientId,
      acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  // Doctor-to-Doctor
  @Post('d2d-consult')
  @ApiOperation({ summary: 'Request doctor-to-doctor teleconsultation' })
  async requestDoctorConsult(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestDoctorConsultDto,
  ) {
    return this.service.requestDoctorConsult(tenantId, user.email, dto);
  }

  // Multi-participant
  @Post('room/:roomName/participant')
  @ApiOperation({ summary: 'Add participant to teleconsultation room' })
  @ApiParam({ name: 'roomName' })
  async addParticipant(
    @CurrentTenant() tenantId: string,
    @Param('roomName') roomName: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.service.addParticipant(tenantId, roomName, dto);
  }

  @Get('room/:roomName/participants')
  @ApiOperation({ summary: 'List participants in a teleconsultation room' })
  @ApiParam({ name: 'roomName' })
  async listParticipants(
    @CurrentTenant() tenantId: string,
    @Param('roomName') roomName: string,
  ) {
    return this.service.listParticipants(tenantId, roomName);
  }

  // Text Chat
  @Post('session/:sessionId/chat')
  @ApiOperation({ summary: 'Send text chat message in a teleconsultation session' })
  @ApiParam({ name: 'sessionId', description: 'Teleconsultation session UUID' })
  async sendChatMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.service.sendChatMessage(tenantId, sessionId, user.email, dto);
  }

  @Get('session/:sessionId/chat')
  @ApiOperation({ summary: 'Get chat history for a teleconsultation session' })
  @ApiParam({ name: 'sessionId', description: 'Teleconsultation session UUID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getChatHistory(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getChatHistory(
      tenantId,
      sessionId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Patch('session/:sessionId/chat/read')
  @ApiOperation({ summary: 'Mark all chat messages as read for current user' })
  @ApiParam({ name: 'sessionId', description: 'Teleconsultation session UUID' })
  async markMessagesRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.service.markMessagesRead(tenantId, sessionId, user.email);
  }

  // IA: Urgency Detection
  @Post('session/:sessionId/detect-urgency')
  @ApiOperation({ summary: 'IA: Detect visual urgency signs in teleconsultation' })
  @ApiParam({ name: 'sessionId' })
  async detectUrgency(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.service.detectUrgencyInTeleconsult(tenantId, sessionId);
  }
}
