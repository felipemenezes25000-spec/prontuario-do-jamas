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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppealsService } from './appeals.service';
import { TissService } from './tiss.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealStatusDto } from './dto/update-appeal-status.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { AppealStatus } from '@prisma/client';

@ApiTags('Billing Appeals')
@ApiBearerAuth('access-token')
@Controller('billing')
export class AppealsController {
  constructor(
    private readonly appealsService: AppealsService,
    private readonly tissService: TissService,
  ) {}

  @Post('appeals')
  @ApiOperation({ summary: 'Create a billing appeal (recurso de glosa)' })
  @ApiResponse({ status: 201, description: 'Appeal created' })
  async createAppeal(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAppealDto,
  ) {
    return this.appealsService.createAppeal(tenantId, userId, dto);
  }

  @Get('appeals')
  @ApiOperation({ summary: 'List billing appeals (with optional status filter)' })
  @ApiQuery({ name: 'status', required: false, enum: AppealStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated appeals list' })
  async findAppeals(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: AppealStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.appealsService.findAppeals(tenantId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('appeals/:id')
  @ApiParam({ name: 'id', description: 'Appeal UUID' })
  @ApiOperation({ summary: 'Get appeal by ID' })
  @ApiResponse({ status: 200, description: 'Appeal details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findAppealById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appealsService.findAppealById(tenantId, id);
  }

  @Patch('appeals/:id/status')
  @ApiParam({ name: 'id', description: 'Appeal UUID' })
  @ApiOperation({ summary: 'Update appeal status' })
  @ApiResponse({ status: 200, description: 'Appeal status updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async updateAppealStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppealStatusDto,
  ) {
    return this.appealsService.updateAppealStatus(tenantId, id, dto);
  }

  @Post('appeals/:id/ai-justification')
  @ApiParam({ name: 'id', description: 'Appeal UUID' })
  @ApiOperation({ summary: 'Generate AI justification for appeal' })
  @ApiResponse({ status: 201, description: 'AI justification generated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async generateAIJustification(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appealsService.generateAIJustification(tenantId, id);
  }

  @Post('tiss/validate')
  @ApiOperation({ summary: 'Validate TISS XML structure and required fields' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateTissXml(@Body('xml') xml: string) {
    return this.tissService.validateTissXml(xml);
  }
}
