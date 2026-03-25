import {
  Controller,
  Get,
  Post,
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
import { PatientSurveysService } from './patient-surveys.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreateSurveyDto, SubmitSurveyResponseDto } from './patient-surveys.dto';

@ApiTags('Patient Portal — Surveys (PREMs/PROMs)')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class PatientSurveysController {
  constructor(private readonly service: PatientSurveysService) {}

  @Post('surveys')
  @ApiOperation({ summary: 'Create survey (NPS, PREM, PROM)' })
  @ApiResponse({ status: 201, description: 'Survey created' })
  async createSurvey(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSurveyDto,
  ) {
    return this.service.createSurvey(tenantId, user.email, dto);
  }

  @Get('surveys/pending')
  @ApiOperation({ summary: 'Get pending surveys for patient' })
  @ApiResponse({ status: 200, description: 'Pending surveys list' })
  async getPendingSurveys(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getPendingSurveys(tenantId, user.email);
  }

  @Post('surveys/:id/respond')
  @ApiOperation({ summary: 'Submit survey response' })
  @ApiParam({ name: 'id', description: 'Survey UUID' })
  @ApiResponse({ status: 201, description: 'Response submitted' })
  async submitResponse(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitSurveyResponseDto,
  ) {
    return this.service.submitResponse(tenantId, user.email, id, dto);
  }

  @Get('surveys/results')
  @ApiOperation({ summary: 'Survey results and analytics' })
  @ApiQuery({ name: 'surveyType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Survey results' })
  async getSurveyResults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('surveyType') surveyType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getSurveyResults(tenantId, user.email, {
      surveyType,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
