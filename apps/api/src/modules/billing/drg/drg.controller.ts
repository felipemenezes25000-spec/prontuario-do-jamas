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
import { DrgService } from './drg.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';

@ApiTags('Billing — DRG')
@ApiBearerAuth('access-token')
@Controller('billing/drg')
export class DrgController {
  constructor(private readonly service: DrgService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate Brazilian DRG from diagnosis data' })
  @ApiResponse({ status: 201, description: 'DRG calculated' })
  async calculateDrg(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      principalDiagnosis: string;
      secondaryDiagnoses?: string[];
      procedureCodes?: string[];
      age?: number;
      gender?: string;
      dischargeStatus?: string;
      ventilationHours?: number;
    },
  ) {
    return this.service.calculateDrg(tenantId, dto);
  }

  @Get('encounter/:encounterId')
  @ApiOperation({ summary: 'Get DRG classification for encounter' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 200, description: 'Encounter DRG data' })
  async getDrgForEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getDrgForEncounter(tenantId, encounterId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'DRG mix analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'DRG analytics data' })
  async getDrgAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getDrgAnalytics(tenantId, { startDate, endDate });
  }

  @Get('complexity-mix')
  @ApiOperation({ summary: 'Complexity mix optimization analysis' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Complexity mix data' })
  async getComplexityMix(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getComplexityMix(tenantId, { startDate, endDate });
  }

  @Post('predict-revenue')
  @ApiOperation({ summary: 'Predict revenue per case based on DRG' })
  @ApiResponse({ status: 201, description: 'Revenue prediction' })
  async predictRevenue(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      principalDiagnosis: string;
      secondaryDiagnoses?: string[];
      procedureCodes?: string[];
      estimatedLos?: number;
    },
  ) {
    return this.service.predictRevenue(tenantId, dto);
  }

  @Get('cost-analysis/:encounterId')
  @ApiOperation({ summary: 'Cost per patient/case analysis' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 200, description: 'Cost analysis data' })
  async getCostAnalysis(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getCostAnalysis(tenantId, encounterId);
  }
}
