import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AntimicrobialStewardshipService } from './antimicrobial-stewardship.service';
import { CreateReviewDto } from './dto/create-antimicrobial-stewardship.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Antimicrobial Stewardship')
@ApiBearerAuth('access-token')
@Controller('antimicrobial-stewardship')
export class AntimicrobialStewardshipController {
  constructor(
    private readonly stewardshipService: AntimicrobialStewardshipService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get antimicrobial usage dashboard (DDD, therapy duration)' })
  @ApiResponse({ status: 200, description: 'Usage dashboard' })
  async getDashboard(@CurrentTenant() tenantId: string) {
    return this.stewardshipService.getDashboard(tenantId);
  }

  @Get('active-therapies')
  @ApiOperation({ summary: 'Get active antibiotic therapies' })
  @ApiResponse({ status: 200, description: 'Active therapies with days on treatment' })
  async getActiveTherapies(@CurrentTenant() tenantId: string) {
    return this.stewardshipService.getActiveTherapies(tenantId);
  }

  @Post('review')
  @ApiOperation({ summary: 'Create review/de-escalation recommendation' })
  @ApiResponse({ status: 201, description: 'Review recorded' })
  async createReview(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.stewardshipService.createReview(tenantId, user.sub, dto);
  }

  @Get('antibiogram')
  @ApiOperation({ summary: 'Get institutional antibiogram' })
  @ApiResponse({ status: 200, description: 'Antibiogram data' })
  async getAntibiogram(@CurrentTenant() tenantId: string) {
    return this.stewardshipService.getAntibiogram(tenantId);
  }

  @Get('pending-cultures')
  @ApiOperation({ summary: 'Get pending microbiological cultures' })
  @ApiResponse({ status: 200, description: 'Pending cultures' })
  async getPendingCultures(@CurrentTenant() tenantId: string) {
    return this.stewardshipService.getPendingCultures(tenantId);
  }
}
