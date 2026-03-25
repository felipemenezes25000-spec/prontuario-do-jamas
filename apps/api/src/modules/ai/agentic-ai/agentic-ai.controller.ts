import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
  PrepareConsultationDto,
  PreFillFormDto,
  SummarizePatientDto,
  AgentTaskResponseDto,
  ConsultationPrepResponseDto,
  PreFilledFormResponseDto,
  PatientSummaryAgentResponseDto,
} from './dto/agentic-ai.dto';

@ApiTags('AI — Agentic AI')
@ApiBearerAuth('access-token')
@Controller('ai/agents')
export class AgenticAiController {
  constructor(private readonly agenticService: AgenticAiService) {}

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

  @Get('tasks')
  @ApiOperation({ summary: 'List running/completed agent tasks' })
  @ApiResponse({ status: 200, description: 'Task list', type: [AgentTaskResponseDto] })
  async listTasks(
    @CurrentTenant() tenantId: string,
  ): Promise<AgentTaskResponseDto[]> {
    return this.agenticService.listTasks(tenantId);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get agent task result' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task details', type: AgentTaskResponseDto })
  async getTask(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AgentTaskResponseDto> {
    return this.agenticService.getTask(tenantId, id);
  }
}
