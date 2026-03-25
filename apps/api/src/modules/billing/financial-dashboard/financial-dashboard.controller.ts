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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FinancialDashboardService } from './financial-dashboard.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';

@ApiTags('Billing — Financial Dashboard')
@ApiBearerAuth('access-token')
@Controller('billing/dashboard')
export class FinancialDashboardController {
  constructor(private readonly service: FinancialDashboardService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue vs expense by sector' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false })
  @ApiResponse({ status: 200, description: 'Revenue data' })
  async getRevenue(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.service.getRevenue(tenantId, { startDate, endDate, groupBy });
  }

  @Get('glosa-rate')
  @ApiOperation({ summary: 'Glosa (denial) rate analysis' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Glosa rate data' })
  async getGlosaRate(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getGlosaRate(tenantId, { startDate, endDate });
  }

  @Get('aging')
  @ApiOperation({ summary: 'Accounts receivable aging' })
  @ApiResponse({ status: 200, description: 'Aging buckets data' })
  async getAging(@CurrentTenant() tenantId: string) {
    return this.service.getAging(tenantId);
  }

  @Get('margin')
  @ApiOperation({ summary: 'Margin by procedure' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Procedure margin data' })
  async getMarginByProcedure(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getMarginByProcedure(tenantId, { startDate, endDate });
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Cash flow forecast' })
  @ApiQuery({ name: 'months', required: false, description: 'Forecast horizon in months (default 6)' })
  @ApiResponse({ status: 200, description: 'Cash flow forecast data' })
  async getCashFlowForecast(
    @CurrentTenant() tenantId: string,
    @Query('months') months?: string,
  ) {
    return this.service.getCashFlowForecast(tenantId, {
      months: months ? parseInt(months, 10) : undefined,
    });
  }

  @Post('sus-billing')
  @ApiOperation({ summary: 'Process SUS billing (BPA, APAC, AIH)' })
  @ApiResponse({ status: 201, description: 'SUS billing processed' })
  async processSusBilling(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      type: 'BPA' | 'APAC' | 'AIH';
      competence: string;
      cnes: string;
      items: Array<{
        patientId?: string;
        procedureCode: string;
        cid: string;
        quantity: number;
        cbo: string;
        date: string;
      }>;
    },
  ) {
    return this.service.processSusBilling(tenantId, dto);
  }

  @Get('sus-export/:competence')
  @ApiOperation({ summary: 'Export DATASUS file for competence period' })
  @ApiParam({ name: 'competence', description: 'Competence period (YYYY-MM)' })
  @ApiResponse({ status: 200, description: 'DATASUS export data' })
  async exportDatasus(
    @CurrentTenant() tenantId: string,
    @Param('competence') competence: string,
  ) {
    return this.service.exportDatasus(tenantId, competence);
  }

  @Get('pre-billing-audit/:billingEntryId')
  @ApiOperation({ summary: 'Pre-billing audit checklist' })
  @ApiParam({ name: 'billingEntryId', description: 'Billing entry UUID' })
  @ApiResponse({ status: 200, description: 'Audit result' })
  async preBillingAudit(
    @CurrentTenant() tenantId: string,
    @Param('billingEntryId', ParseUUIDPipe) billingEntryId: string,
  ) {
    return this.service.preBillingAudit(tenantId, billingEntryId);
  }

  @Post('tiss-guide')
  @ApiOperation({ summary: 'Auto-generate TISS guide from encounter' })
  @ApiResponse({ status: 201, description: 'TISS guide generated' })
  async generateTissGuide(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      guideType: 'SP_SADT' | 'INTERNACAO' | 'CONSULTA' | 'RESUMO';
      encounterId: string;
      insuranceProvider: string;
      registroAns: string;
    },
  ) {
    return this.service.generateTissGuide(tenantId, dto);
  }

  @Post('tiss-batch')
  @ApiOperation({ summary: 'Submit TISS batch to insurer' })
  @ApiResponse({ status: 201, description: 'Batch submitted' })
  async submitTissBatch(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      insuranceProvider: string;
      registroAns: string;
      guides: Array<{ guideNumber: string; guideType: string; totalAmount: number }>;
    },
  ) {
    return this.service.submitTissBatch(tenantId, dto);
  }

  @Post('glosa')
  @ApiOperation({ summary: 'Manage gloss (register, classify, justify, appeal)' })
  @ApiResponse({ status: 201, description: 'Gloss action performed' })
  async manageGlosa(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      action: 'REGISTER' | 'CLASSIFY' | 'JUSTIFY' | 'APPEAL';
      billingEntryId?: string;
      glosaId?: string;
      amount?: number;
      reasonCode?: string;
      reasonDescription?: string;
      justification?: string;
      appealDocuments?: string[];
    },
  ) {
    return this.service.manageGlosa(tenantId, dto);
  }

  @Get('glosa-metrics')
  @ApiOperation({ summary: 'Gloss management metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Gloss metrics' })
  async getGlosaMetrics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getGlosaMetrics(tenantId, { startDate, endDate });
  }

  @Post('predict-glosa')
  @ApiOperation({ summary: 'AI: Predict gloss risk before submission' })
  @ApiResponse({ status: 201, description: 'Gloss prediction' })
  async predictGlosa(
    @CurrentTenant() tenantId: string,
    @Body() dto: {
      insuranceProvider: string;
      guideType: string;
      procedureCodes: string[];
      totalAmount: number;
      diagnosisCodes: string[];
    },
  ) {
    return this.service.predictGlosa(tenantId, dto);
  }

  @Get('revenue-leakage')
  @ApiOperation({ summary: 'AI: Detect revenue leakage (unbilled procedures)' })
  @ApiResponse({ status: 200, description: 'Revenue leakage report' })
  async detectRevenueLeakage(@CurrentTenant() tenantId: string) {
    return this.service.detectRevenueLeakage(tenantId);
  }
}
