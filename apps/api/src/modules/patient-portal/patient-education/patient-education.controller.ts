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
import { PatientEducationService } from './patient-education.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreateEducationContentDto } from './patient-education.dto';

@ApiTags('Patient Portal — Education')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class PatientEducationController {
  constructor(private readonly service: PatientEducationService) {}

  @Get('education')
  @ApiOperation({ summary: 'List educational content by diagnosis' })
  @ApiQuery({ name: 'condition', required: false })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Educational content list' })
  async listContent(
    @CurrentTenant() tenantId: string,
    @Query('condition') condition?: string,
    @Query('contentType') contentType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listContent(tenantId, {
      condition,
      contentType,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('education/recommended/:patientId')
  @ApiOperation({ summary: 'AI-recommended educational content for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Recommended content list' })
  async getRecommendedContent(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getRecommendedContent(tenantId, patientId);
  }

  @Get('education/:id')
  @ApiOperation({ summary: 'Get educational material detail' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  @ApiResponse({ status: 200, description: 'Educational content detail' })
  async getContent(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getContent(tenantId, id);
  }

  @Post('education')
  @ApiOperation({ summary: 'Create educational content (admin)' })
  @ApiResponse({ status: 201, description: 'Content created' })
  async createContent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEducationContentDto,
  ) {
    return this.service.createContent(tenantId, user.email, dto);
  }
}
