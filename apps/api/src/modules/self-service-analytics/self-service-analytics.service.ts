import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DimensionDto,
  MeasureDto,
  QueryResultResponseDto,
  SavedQueryResponseDto,
  ExecuteQueryDto,
} from './dto/self-service-analytics.dto';

@Injectable()
export class SelfServiceAnalyticsService {
  private readonly logger = new Logger(SelfServiceAnalyticsService.name);
  private readonly savedQueries = new Map<string, SavedQueryResponseDto>();

  async executeQuery(
    _tenantId: string,
    dimensions: string[],
    measures: string[],
    filters?: Array<{ dimension: string; operator: string; value: string }>,
    fromDate?: string,
    toDate?: string,
    limit = 100,
  ): Promise<QueryResultResponseDto> {
    const start = Date.now();
    this.logger.log(`Executing query: dims=[${dimensions}], measures=[${measures}]`);

    // Stub — returns mock results
    const columns = [...dimensions, ...measures];
    const rows = Array.from({ length: Math.min(limit, 10) }, (_, i) => {
      const row: Record<string, unknown> = {};
      for (const dim of dimensions) row[dim] = `${dim}_value_${i}`;
      for (const m of measures) row[m] = Math.round(Math.random() * 1000) / 10;
      return row;
    });

    return {
      columns,
      rows,
      totalRows: rows.length,
      executionTimeMs: Date.now() - start,
    };
  }

  async getDimensions(_tenantId: string): Promise<DimensionDto[]> {
    return [
      { name: 'patient.gender', label: 'Sexo', type: 'categorical', category: 'Paciente', values: ['M', 'F', 'NB'] },
      { name: 'patient.ageGroup', label: 'Faixa Etária', type: 'categorical', category: 'Paciente', values: ['0-18', '19-40', '41-60', '61-80', '80+'] },
      { name: 'encounter.type', label: 'Tipo de Atendimento', type: 'categorical', category: 'Atendimento' },
      { name: 'encounter.specialty', label: 'Especialidade', type: 'categorical', category: 'Atendimento' },
      { name: 'encounter.date', label: 'Data', type: 'date', category: 'Atendimento' },
      { name: 'diagnosis.icdChapter', label: 'Capítulo CID-10', type: 'categorical', category: 'Diagnóstico' },
      { name: 'diagnosis.icdCode', label: 'Código CID-10', type: 'categorical', category: 'Diagnóstico' },
      { name: 'prescription.type', label: 'Tipo de Prescrição', type: 'categorical', category: 'Prescrição' },
      { name: 'admission.ward', label: 'Ala', type: 'categorical', category: 'Internação' },
      { name: 'admission.bedType', label: 'Tipo de Leito', type: 'categorical', category: 'Internação' },
    ];
  }

  async getMeasures(_tenantId: string): Promise<MeasureDto[]> {
    return [
      { name: 'encounter.count', label: 'Total de Atendimentos', type: 'integer', aggregation: 'COUNT' },
      { name: 'patient.count', label: 'Total de Pacientes', type: 'integer', aggregation: 'COUNT_DISTINCT' },
      { name: 'admission.avgLos', label: 'Tempo Médio de Internação', type: 'decimal', aggregation: 'AVG', unit: 'dias' },
      { name: 'encounter.avgWaitTime', label: 'Tempo Médio de Espera', type: 'decimal', aggregation: 'AVG', unit: 'min' },
      { name: 'prescription.count', label: 'Total de Prescrições', type: 'integer', aggregation: 'COUNT' },
      { name: 'exam.count', label: 'Total de Exames', type: 'integer', aggregation: 'COUNT' },
      { name: 'billing.totalAmount', label: 'Faturamento Total', type: 'currency', aggregation: 'SUM', unit: 'R$' },
      { name: 'readmission.rate', label: 'Taxa de Reinternação', type: 'percentage', aggregation: 'RATIO' },
    ];
  }

  async saveQuery(
    _tenantId: string,
    userId: string,
    name: string,
    query: ExecuteQueryDto,
    description?: string,
  ): Promise<SavedQueryResponseDto> {
    const saved: SavedQueryResponseDto = {
      id: randomUUID(),
      name,
      description,
      query,
      createdById: userId,
      createdAt: new Date(),
    };
    this.savedQueries.set(saved.id, saved);
    return saved;
  }

  async getSavedQueries(_tenantId: string): Promise<SavedQueryResponseDto[]> {
    return Array.from(this.savedQueries.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
