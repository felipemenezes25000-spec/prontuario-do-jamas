import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ChestPainService } from './chest-pain.service';
import {
  ActivateChestPainDto,
  ChestPainScoresDto,
  UpdateChestPainChecklistDto,
} from './dto/create-chest-pain.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Chest Pain')
@ApiBearerAuth('access-token')
@Controller('chest-pain')
export class ChestPainController {
  constructor(private readonly chestPainService: ChestPainService) {}

  @Post('activate')
  @ApiOperation({ summary: 'Activate chest pain protocol' })
  @ApiResponse({ status: 201, description: 'Protocol activated' })
  async activate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ActivateChestPainDto,
  ) {
    return this.chestPainService.activate(tenantId, user.sub, dto);
  }

  @Post(':id/scores')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Record KILLIP, TIMI, GRACE, HEART scores' })
  @ApiResponse({ status: 201, description: 'Scores recorded' })
  async updateScores(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChestPainScoresDto,
  ) {
    return this.chestPainService.updateScores(tenantId, user.sub, id, dto);
  }

  @Patch(':id/checklist')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Update chest pain protocol checklist' })
  @ApiResponse({ status: 200, description: 'Checklist updated' })
  async updateChecklist(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChestPainChecklistDto,
  ) {
    return this.chestPainService.updateChecklist(tenantId, user.sub, id, dto);
  }

  @Get(':id/timeline')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Get door-to-balloon timeline' })
  @ApiResponse({ status: 200, description: 'Timeline with metrics' })
  async getTimeline(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chestPainService.getTimeline(tenantId, id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active chest pain cases' })
  @ApiResponse({ status: 200, description: 'Active cases' })
  async getActiveCases(@CurrentTenant() tenantId: string) {
    return this.chestPainService.getActiveCases(tenantId);
  }
}
