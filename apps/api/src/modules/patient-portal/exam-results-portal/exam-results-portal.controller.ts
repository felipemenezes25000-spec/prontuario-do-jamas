import {
  Controller,
  Get,
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
import { ExamResultsPortalService } from './exam-results-portal.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';

@ApiTags('Patient Portal — Exam Results')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class ExamResultsPortalController {
  constructor(private readonly service: ExamResultsPortalService) {}

  @Get('exam-results')
  @ApiOperation({ summary: 'List patient exam results' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'examType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Paginated exam results' })
  async listExamResults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('examType') examType?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listExamResults(tenantId, user.email, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      examType,
      status,
    });
  }

  @Get('exam-results/:id')
  @ApiOperation({ summary: 'Get detailed exam result with lay-language explanation' })
  @ApiParam({ name: 'id', description: 'ExamResult UUID' })
  @ApiResponse({ status: 200, description: 'Exam result detail' })
  async getExamResultDetail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getExamResultDetail(tenantId, user.email, id);
  }

  @Get('exam-results/:id/trend')
  @ApiOperation({ summary: 'Get trend chart data for lab values' })
  @ApiParam({ name: 'id', description: 'ExamResult UUID (reference exam)' })
  @ApiResponse({ status: 200, description: 'Trend data points' })
  async getExamTrend(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getExamTrend(tenantId, user.email, id);
  }
}
