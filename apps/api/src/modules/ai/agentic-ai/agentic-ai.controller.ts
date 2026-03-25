import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { AgenticAiService } from './agentic-ai.service';
import {
  AgentType,
  ExecuteAgentDto,
  UpdateAgentConfigDto,
  AgentTaskListQueryDto,
  AgentDefinitionDto,
  AgentTaskResponseDto,
  AgentTaskListResponseDto,
  AgentMetricsResponseDto,
  PrepareConsultationDto,
  PreFillFormDto,
  SummarizePatientDto,
  ConsultationPrepResponseDto,
  PreFilledFormResponseDto,
  PatientSummaryAgentResponseDto,
} from './dto/agentic-ai.dto';

@ApiTags('AI — Agentic AI')
@ApiBearerAuth('access-token')
@Controller('ai/agents')
export class AgenticAiController {
  constructor(private readonly agenticService: AgenticAiService) {}

  @Get()
  @ApiOperation({ summary: 'List all available AI agents with status and configuration' })
  @ApiResponse({ status: 200, description: 'Agent list', type: [AgentDefinitionDto] })
  async listAgents(
    @CurrentTenant() tenantId: string,
  ): Promise<AgentDefinitionDto[]> {
    return this.agenticService.listAgents(tenantId);
  }

  @Post(':agentType/execute')
  @ApiOperation({ summary: 'Execute an agent task (pre-visit-prep, follow-up, inbox-triage, prior-auth, referral, summarize, pre-fill-form)' })
  @ApiParam({ name: 'agentType', enum: AgentType, description: 'Agent type to execute' })
  @ApiResponse({ status: 201, description: 'Agent task executed', type: AgentTaskResponseDto })
  async executeAgent(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('agentType') agentType: AgentType,
    @Body() dto: ExecuteAgentDto,
  ): Promise<AgentTaskResponseDto> {
    return this.agenticService.executeAgent(
      tenantId,
      user.sub,
      agentType,
      dto.patientId,
      dto.encounterId,
      dto.focusAreas,
      dto.parameters,
    );
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List agent tasks with status, results, and pagination' })
  @ApiResponse({ status: 200, description: 'Task list', type: AgentTaskListResponseDto })
  async listTasks(
    @CurrentTenant() tenantId: string,
    @Query() query: AgentTaskListQueryDto,
  ): Promise<AgentTaskListResponseDto> {
    return this.agenticService.listTasks(
      tenantId,
      query.agentType,
      query.status,
      query.patientId,
      query.page,
      query.limit,
    );
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get specific agent task result' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task details', type: AgentTaskResponseDto })
  async getTask(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AgentTaskResponseDto> {
    return this.agenticService.getTask(tenantId, id);
  }

  @Patch(':agentType/config')
  @ApiOperation({ summary: 'Update agent configuration (enable/disable, priority, auto-execute, etc.)' })
  @ApiParam({ name: 'agentType', enum: AgentType, description: 'Agent type to configure' })
  @ApiResponse({ status: 200, description: 'Updated agent config', type: AgentDefinitionDto })
  async updateConfig(
    @CurrentTenant() tenantId: string,
    @Param('agentType') agentType: AgentType,
    @Body() dto: UpdateAgentConfigDto,
  ): Promise<AgentDefinitionDto> {
    return this.agenticService.updateAgentConfig(tenantId, agentType, dto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Agent performance metrics (success rate, time saved, tasks by agent)' })
  @ApiResponse({ status: 200, description: 'Agent metrics', type: AgentMetricsResponseDto })
  async getMetrics(
    @CurrentTenant() tenantId: string,
  ): Promise<AgentMetricsResponseDto> {
    return this.agenticService.getMetrics(tenantId);
  }

  // ─── Legacy Endpoints (backward compat) ──────────────────────────────────

  @Post('prepare-consultation')
  @ApiOperation({ summary: 'Agent prepares consultation — fetches results, history, recommendations' })
  @ApiResponse({ status: 201, description: 'Consultation prepared', type: ConsultationPrepResponseDto })
  async prepareConsultation(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: PrepareConsultationDto,
  ): Promise<ConsultationPrepResponseDto> {
    return this.agenticService.prepareConsultation(
      tenantId,
      user.sub,
      dto.patientId,
      dto.encounterId,
      dto.focusAreas,
    );
  }

  @Post('pre-fill-form')
  @ApiOperation({ summary: 'Agent pre-fills forms with patient data' })
  @ApiResponse({ status: 201, description: 'Form pre-filled', type: PreFilledFormResponseDto })
  async preFillForm(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: PreFillFormDto,
  ): Promise<PreFilledFormResponseDto> {
    return this.agenticService.preFillForm(
      tenantId,
      user.sub,
      dto.patientId,
      dto.formType,
      dto.encounterId,
    );
  }

  @Post('summarize-patient')
  @ApiOperation({ summary: 'Agent creates comprehensive patient summary' })
  @ApiResponse({ status: 201, description: 'Patient summary created', type: PatientSummaryAgentResponseDto })
  async summarizePatient(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: SummarizePatientDto,
  ): Promise<PatientSummaryAgentResponseDto> {
    return this.agenticService.summarizePatient(
      tenantId,
      user.sub,
      dto.patientId,
      dto.summaryType,
      dto.fromDate,
    );
  }
}
