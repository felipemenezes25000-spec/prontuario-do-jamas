import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('hospital-movement')
  @ApiOperation({ summary: 'Movimento hospitalar (internações, altas, atendimentos)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Relatório de movimento hospitalar' })
  async getHospitalMovement(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getHospitalMovement(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('daily-census')
  @ApiOperation({ summary: 'Censo diário de ocupação' })
  @ApiQuery({ name: 'date', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Censo diário' })
  async getDailyCensus(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getDailyCensus(tenantId, new Date(date));
  }

  @Get('doctor-productivity')
  @ApiOperation({ summary: 'Produtividade médica por período' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Relatório de produtividade' })
  async getDoctorProductivity(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDoctorProductivity(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('quality-indicators')
  @ApiOperation({ summary: 'Indicadores de qualidade assistencial' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Indicadores de qualidade' })
  async getQualityIndicators(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getQualityIndicators(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('financial')
  @ApiOperation({ summary: 'Relatório financeiro (faturamento, glosas, convênios)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Relatório financeiro' })
  async getFinancialReport(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getFinancialReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('encounter-stats')
  @ApiOperation({ summary: 'Estatísticas de atendimentos por tipo e período' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Estatísticas de atendimentos' })
  async getEncounterStats(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getEncounterStats(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ── BLOCO B5: New Analytics Endpoints ──────────────────────

  @Get('occupancy')
  @ApiOperation({ summary: 'Taxa de ocupação por setor' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Taxa de ocupação' })
  async getOccupancyRate(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getOccupancyRate(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('length-of-stay')
  @ApiOperation({ summary: 'Tempo médio de permanência por CID' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Tempo de permanência' })
  async getLengthOfStay(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getLengthOfStay(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('top-diagnoses')
  @ApiOperation({ summary: 'Top 20 diagnósticos mais frequentes' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'CIDs mais frequentes' })
  async getTopDiagnoses(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTopDiagnoses(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('production')
  @ApiOperation({ summary: 'Produção médica por profissional' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Produção por médico' })
  async getProduction(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProductionByDoctor(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('custom-query')
  @ApiOperation({ summary: 'Consulta avançada com dimensões e métricas' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'dimension', required: true, type: String })
  @ApiQuery({ name: 'metric', required: true, type: String })
  @ApiQuery({ name: 'groupBy', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Resultado da consulta' })
  async getCustomQuery(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('dimension') dimension: string,
    @Query('metric') metric: string,
    @Query('groupBy') groupBy: string,
  ) {
    return this.reportsService.getCustomQuery(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      dimension,
      metric,
      groupBy,
    );
  }
}
