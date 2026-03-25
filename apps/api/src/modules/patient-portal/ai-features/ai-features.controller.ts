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
import { AiFeaturesService } from './ai-features.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { SendTriageMessageDto, UpdateGoalProgressDto } from './ai-features.dto';

@ApiTags('Patient Portal — AI Features')
@ApiBearerAuth('access-token')
@Controller('patient-portal/ai')
export class AiFeaturesController {
  constructor(private readonly service: AiFeaturesService) {}

  // Triage Chatbot
  @Post('triage/start')
  @ApiOperation({ summary: 'Start pre-consultation triage chatbot' })
  @ApiResponse({ status: 201, description: 'Triage session started' })
  async startTriageChatbot(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.startTriageChatbot(tenantId, user.email);
  }

  @Post('triage/:sessionId/message')
  @ApiOperation({ summary: 'Send message to triage chatbot' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Chatbot response' })
  async sendTriageMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendTriageMessageDto,
  ) {
    return this.service.sendTriageMessage(tenantId, user.email, sessionId, dto.message);
  }

  // Patient Summary
  @Get('summary')
  @ApiOperation({ summary: 'Get patient-friendly medical record summary' })
  @ApiResponse({ status: 200, description: 'Patient health summary' })
  async getPatientSummary(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getPatientSummary(tenantId, user.email);
  }

  // Health Coach
  @Get('health-coach')
  @ApiOperation({ summary: 'Get personalized health coach plan' })
  @ApiResponse({ status: 200, description: 'Health coach plan' })
  async getHealthCoachPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getHealthCoachPlan(tenantId, user.email);
  }

  @Post('health-coach')
  @ApiOperation({ summary: 'Create personalized health coach plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async createHealthCoachPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createHealthCoachPlan(tenantId, user.email);
  }

  @Patch('health-coach/:planId/goal')
  @ApiOperation({ summary: 'Update health goal progress' })
  @ApiParam({ name: 'planId', description: 'Plan UUID' })
  @ApiResponse({ status: 200, description: 'Goal progress updated' })
  async updateGoalProgress(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: UpdateGoalProgressDto,
  ) {
    return this.service.updateGoalProgress(tenantId, user.email, planId, dto.goalId, dto.progress);
  }
}
