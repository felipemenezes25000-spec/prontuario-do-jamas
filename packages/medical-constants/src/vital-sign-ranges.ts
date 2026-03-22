/**
 * Faixa etária para referência de sinais vitais.
 */
export type AgeGroup = 'neonatal' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';

export interface VitalSignRange {
  min: number;
  max: number;
  unit: string;
  criticalLow: number | null;
  criticalHigh: number | null;
}

export interface VitalSignRangeByAge {
  ageGroup: AgeGroup;
  ageDescription: string;
  heartRate: VitalSignRange;
  respiratoryRate: VitalSignRange;
  systolicBP: VitalSignRange;
  diastolicBP: VitalSignRange;
  temperature: VitalSignRange;
  spo2: VitalSignRange;
}

/**
 * Faixas normais de sinais vitais por grupo etário.
 * Fontes: Nelson Textbook of Pediatrics, Harrison's Principles of Internal Medicine.
 */
export const VITAL_SIGN_RANGES: readonly VitalSignRangeByAge[] = [
  {
    ageGroup: 'neonatal',
    ageDescription: 'Neonato (0-28 dias)',
    heartRate: { min: 100, max: 160, unit: 'bpm', criticalLow: 80, criticalHigh: 200 },
    respiratoryRate: { min: 30, max: 60, unit: 'irpm', criticalLow: 20, criticalHigh: 70 },
    systolicBP: { min: 60, max: 90, unit: 'mmHg', criticalLow: 50, criticalHigh: 100 },
    diastolicBP: { min: 30, max: 60, unit: 'mmHg', criticalLow: 20, criticalHigh: 70 },
    temperature: { min: 36.5, max: 37.5, unit: '°C', criticalLow: 35.0, criticalHigh: 38.5 },
    spo2: { min: 92, max: 100, unit: '%', criticalLow: 88, criticalHigh: null },
  },
  {
    ageGroup: 'infant',
    ageDescription: 'Lactente (1-12 meses)',
    heartRate: { min: 100, max: 150, unit: 'bpm', criticalLow: 80, criticalHigh: 180 },
    respiratoryRate: { min: 25, max: 50, unit: 'irpm', criticalLow: 15, criticalHigh: 60 },
    systolicBP: { min: 70, max: 100, unit: 'mmHg', criticalLow: 60, criticalHigh: 110 },
    diastolicBP: { min: 35, max: 65, unit: 'mmHg', criticalLow: 25, criticalHigh: 75 },
    temperature: { min: 36.0, max: 37.5, unit: '°C', criticalLow: 35.0, criticalHigh: 38.5 },
    spo2: { min: 94, max: 100, unit: '%', criticalLow: 90, criticalHigh: null },
  },
  {
    ageGroup: 'child',
    ageDescription: 'Criança (1-10 anos)',
    heartRate: { min: 70, max: 120, unit: 'bpm', criticalLow: 60, criticalHigh: 160 },
    respiratoryRate: { min: 18, max: 30, unit: 'irpm', criticalLow: 12, criticalHigh: 40 },
    systolicBP: { min: 80, max: 110, unit: 'mmHg', criticalLow: 70, criticalHigh: 130 },
    diastolicBP: { min: 50, max: 75, unit: 'mmHg', criticalLow: 40, criticalHigh: 85 },
    temperature: { min: 36.0, max: 37.5, unit: '°C', criticalLow: 35.0, criticalHigh: 39.0 },
    spo2: { min: 95, max: 100, unit: '%', criticalLow: 90, criticalHigh: null },
  },
  {
    ageGroup: 'adolescent',
    ageDescription: 'Adolescente (11-17 anos)',
    heartRate: { min: 60, max: 100, unit: 'bpm', criticalLow: 50, criticalHigh: 140 },
    respiratoryRate: { min: 12, max: 20, unit: 'irpm', criticalLow: 8, criticalHigh: 30 },
    systolicBP: { min: 90, max: 120, unit: 'mmHg', criticalLow: 80, criticalHigh: 140 },
    diastolicBP: { min: 55, max: 80, unit: 'mmHg', criticalLow: 45, criticalHigh: 90 },
    temperature: { min: 36.0, max: 37.5, unit: '°C', criticalLow: 35.0, criticalHigh: 39.5 },
    spo2: { min: 95, max: 100, unit: '%', criticalLow: 90, criticalHigh: null },
  },
  {
    ageGroup: 'adult',
    ageDescription: 'Adulto (18-64 anos)',
    heartRate: { min: 60, max: 100, unit: 'bpm', criticalLow: 40, criticalHigh: 150 },
    respiratoryRate: { min: 12, max: 20, unit: 'irpm', criticalLow: 8, criticalHigh: 30 },
    systolicBP: { min: 90, max: 120, unit: 'mmHg', criticalLow: 80, criticalHigh: 180 },
    diastolicBP: { min: 60, max: 80, unit: 'mmHg', criticalLow: 50, criticalHigh: 120 },
    temperature: { min: 36.0, max: 37.5, unit: '°C', criticalLow: 35.0, criticalHigh: 39.5 },
    spo2: { min: 95, max: 100, unit: '%', criticalLow: 90, criticalHigh: null },
  },
  {
    ageGroup: 'elderly',
    ageDescription: 'Idoso (65+ anos)',
    heartRate: { min: 55, max: 100, unit: 'bpm', criticalLow: 40, criticalHigh: 140 },
    respiratoryRate: { min: 12, max: 22, unit: 'irpm', criticalLow: 8, criticalHigh: 30 },
    systolicBP: { min: 90, max: 140, unit: 'mmHg', criticalLow: 80, criticalHigh: 190 },
    diastolicBP: { min: 60, max: 85, unit: 'mmHg', criticalLow: 50, criticalHigh: 110 },
    temperature: { min: 35.8, max: 37.5, unit: '°C', criticalLow: 35.0, criticalHigh: 39.0 },
    spo2: { min: 93, max: 100, unit: '%', criticalLow: 88, criticalHigh: null },
  },
] as const;
