import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CohortResponseDto,
  CohortsListResponseDto,
  LongitudinalAnalysisResponseDto,
  BenchmarkResponseDto,
} from './dto/data-warehouse.dto';

@Injectable()
export class DataWarehouseService {
  private readonly logger = new Logger(DataWarehouseService.name);

  async listCohorts(_tenantId: string): Promise<CohortsListResponseDto> {
    return {
      cohorts: [
        {
          id: randomUUID(),
          name: 'Diabéticos tipo 2 — HbA1c > 7%',
          description: 'Pacientes com DM2 e controle glicêmico insatisfatório',
          criteria: { diagnosis: 'E11', labResult: { name: 'HbA1c', operator: '>', value: 7 } },
          patientCount: 234,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        {
          id: randomUUID(),
          name: 'Hipertensos não controlados',
          description: 'PA > 140/90 nas últimas 3 consultas',
          criteria: { diagnosis: 'I10', vitalSigns: { systolicBP: { operator: '>', value: 140, count: 3 } } },
          patientCount: 156,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
      ],
      total: 2,
    };
  }

  async createCohort(
    _tenantId: string,
    name: string,
    criteria: Record<string, unknown>,
    description?: string,
  ): Promise<CohortResponseDto> {
    this.logger.log(`Creating cohort: ${name}`);
    return {
      id: randomUUID(),
      name,
      description,
      criteria,
      patientCount: Math.floor(Math.random() * 500),
      createdAt: new Date(),
      lastRunAt: new Date(),
    };
  }

  async getLongitudinalAnalysis(
    _tenantId: string,
    patientId: string,
  ): Promise<LongitudinalAnalysisResponseDto> {
    return {
      patientId,
      patientName: 'João da Silva',
      dataPoints: [
        { date: '2025-06-01', metric: 'HbA1c', value: 8.2, unit: '%' },
        { date: '2025-09-01', metric: 'HbA1c', value: 7.8, unit: '%' },
        { date: '2025-12-01', metric: 'HbA1c', value: 7.4, unit: '%' },
        { date: '2026-03-01', metric: 'HbA1c', value: 7.1, unit: '%' },
        { date: '2025-06-01', metric: 'Systolic BP', value: 152, unit: 'mmHg' },
        { date: '2025-09-01', metric: 'Systolic BP', value: 148, unit: 'mmHg' },
        { date: '2025-12-01', metric: 'Systolic BP', value: 142, unit: 'mmHg' },
        { date: '2026-03-01', metric: 'Systolic BP', value: 138, unit: 'mmHg' },
      ],
      metrics: ['HbA1c', 'Systolic BP', 'Weight', 'Creatinine'],
      trends: { HbA1c: 'IMPROVING', 'Systolic BP': 'IMPROVING', Weight: 'STABLE', Creatinine: 'STABLE' },
      aiInsights: [
        'HbA1c em tendência de queda — mantém trajetória para alvo < 7% em 3 meses',
        'PA ainda acima do alvo — considerar ajuste terapêutico se não atingir 130/80 na próxima consulta',
      ],
    };
  }

  async getBenchmarks(_tenantId: string): Promise<BenchmarkResponseDto> {
    return {
      benchmarks: [
        { metric: 'Tempo médio de espera (min)', currentValue: 18, benchmarkValue: 15, percentile: 42, trend: 'IMPROVING', unit: 'min' },
        { metric: 'Taxa de reinternação 30d', currentValue: 0.08, benchmarkValue: 0.12, percentile: 75, trend: 'STABLE' },
        { metric: 'Tempo médio de internação (dias)', currentValue: 5.2, benchmarkValue: 4.8, percentile: 55, unit: 'dias' },
        { metric: 'Taxa de infecção hospitalar', currentValue: 0.02, benchmarkValue: 0.035, percentile: 82, trend: 'IMPROVING' },
        { metric: 'Satisfação do paciente', currentValue: 4.3, benchmarkValue: 4.0, percentile: 70, unit: '/5' },
      ],
      period: '2026-Q1',
      comparedTo: 'Média nacional hospitais porte similar',
    };
  }
}
