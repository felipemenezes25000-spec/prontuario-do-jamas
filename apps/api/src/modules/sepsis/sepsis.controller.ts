import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SepsisService } from './sepsis.service';
import {
  CreateSepsisScreeningDto,
  ActivateBundleDto,
  UpdateBundleItemDto,
} from './dto/create-sepsis.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Sepsis')
@ApiBearerAuth('access-token')
@Controller('sepsis')
export class SepsisController {
  constructor(private readonly sepsisService: SepsisService) {}

  @Post('screening')
  @ApiOperation({ summary: 'Create qSOFA/SOFA/SIRS sepsis screening' })
  @ApiResponse({ status: 201, description: 'Screening created' })
  async createScreening(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSepsisScreeningDto,
  ) {
    return this.sepsisService.createScreening(tenantId, user.sub, dto);
  }

  @Post(':id/bundle')
  @ApiParam({ name: 'id', description: 'Screening UUID' })
  @ApiOperation({ summary: 'Activate 1h/3h/6h sepsis bundle' })
  @ApiResponse({ status: 201, description: 'Bundle activated' })
  async activateBundle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateBundleDto,
  ) {
    return this.sepsisService.activateBundle(tenantId, user.sub, id, dto);
  }

  @Patch(':id/bundle-item')
  @ApiParam({ name: 'id', description: 'Screening UUID' })
  @ApiOperation({ summary: 'Update bundle item compliance status' })
  @ApiResponse({ status: 200, description: 'Bundle item updated' })
  async updateBundleItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBundleItemDto,
  ) {
    return this.sepsisService.updateBundleItem(tenantId, user.sub, id, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active sepsis cases' })
  @ApiResponse({ status: 200, description: 'Active sepsis cases' })
  async getActiveCases(@CurrentTenant() tenantId: string) {
    return this.sepsisService.getActiveCases(tenantId);
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Get bundle compliance dashboard (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard' })
  async getComplianceDashboard(@CurrentTenant() tenantId: string) {
    return this.sepsisService.getComplianceDashboard(tenantId);
  }
}
