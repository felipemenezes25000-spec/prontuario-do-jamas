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
} from '@nestjs/swagger';
import { AccreditationService } from './accreditation.service';
import {
  AccreditationStandard,
  EvaluateChecklistItemDto,
  CreateActionPlanDto,
  ListActionPlansFilterDto,
} from './accreditation.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Accreditation')
@ApiBearerAuth('access-token')
@Controller('accreditation')
export class AccreditationController {
  constructor(private readonly accreditationService: AccreditationService) {}

  @Post('checklist/evaluate')
  @ApiOperation({ summary: 'Evaluate a checklist item for accreditation compliance' })
  @ApiResponse({ status: 201, description: 'Checklist item evaluated' })
  async evaluateChecklistItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EvaluateChecklistItemDto,
  ) {
    return this.accreditationService.evaluateChecklistItem(
      tenantId,
      user.email,
      dto,
    );
  }

  @Get('checklist/:standard')
  @ApiOperation({ summary: 'Get checklist items for a given accreditation standard' })
  @ApiResponse({ status: 200, description: 'Checklist items list' })
  @ApiParam({ name: 'standard', enum: AccreditationStandard, description: 'Accreditation standard (ONA or JCI)' })
  async getChecklistByStandard(
    @CurrentTenant() tenantId: string,
    @Param('standard') standard: AccreditationStandard,
  ) {
    return this.accreditationService.getChecklistByStandard(tenantId, standard);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get accreditation compliance dashboard with scores' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard' })
  async getDashboard(@CurrentTenant() tenantId: string) {
    return this.accreditationService.getDashboard(tenantId);
  }

  @Post('action-plans')
  @ApiOperation({ summary: 'Create an action plan for a non-compliant checklist item' })
  @ApiResponse({ status: 201, description: 'Action plan created' })
  async createActionPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateActionPlanDto,
  ) {
    return this.accreditationService.createActionPlan(
      tenantId,
      user.email,
      dto,
    );
  }

  @Get('action-plans')
  @ApiOperation({ summary: 'List action plans with optional filters' })
  @ApiResponse({ status: 200, description: 'Action plans list' })
  async listActionPlans(
    @CurrentTenant() tenantId: string,
    @Query() filters: ListActionPlansFilterDto,
  ) {
    return this.accreditationService.listActionPlans(tenantId, filters);
  }
}
