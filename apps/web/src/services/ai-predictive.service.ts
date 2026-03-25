import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface SepsisRiskPatient {
  id: string;
  patientName: string;
  mrn: string;
  bed: string;
  ward: string;
  riskScore: number;
  trend: 'rising' | 'stable' | 'falling';
  predictedOnset: string;
  topFeatures: SHAPFeature[];
  lastVitals: {
    temperature: number;
    heartRate: number;
    respiratoryRate: number;
    systolicBP: number;
    wbc: number;
    lactate: number;
  };
  sofa: number;
  qsofa: number;
  alertTriggered: boolean;
  updatedAt: string;
}

export interface SHAPFeature {
  name: string;
  value: number;
  impact: number;
  direction: 'positive' | 'negative';
}

export interface CardiacArrestRisk {
  id: string;
  patientName: string;
  mrn: string;
  bed: string;
  ward: string;
  riskScore: number;
  trend: 'rising' | 'stable' | 'falling';
  hoursAhead: number;
  riskFactors: RiskFactor[];
  newsScore: number;
  lastVitals: {
    heartRate: number;
    systolicBP: number;
    respiratoryRate: number;
    spo2: number;
    temperature: number;
    consciousness: string;
  };
  rapidResponseTriggered: boolean;
  updatedAt: string;
}

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReadmissionPrediction {
  id: string;
  patientName: string;
  mrn: string;
  dischargeDate: string;
  diagnosis: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  riskFactors: RiskFactor[];
  interventions: InterventionSuggestion[];
  readmissionProbability: number;
  daysPostDischarge: number;
}

export interface InterventionSuggestion {
  id: string;
  type: 'follow_up' | 'home_care' | 'education' | 'medication' | 'telehealth';
  description: string;
  priority: 'low' | 'medium' | 'high';
  applied: boolean;
}

export interface LOSPrediction {
  id: string;
  patientName: string;
  mrn: string;
  bed: string;
  ward: string;
  admissionDate: string;
  predictedLOS: number;
  drgAverageLOS: number;
  currentDay: number;
  confidence: number;
  drgCode: string;
  drgDescription: string;
  factors: LOSFactor[];
  updatedAt: string;
}

export interface LOSFactor {
  name: string;
  impact: number;
  direction: 'longer' | 'shorter';
  description: string;
}

export interface MortalityPrediction {
  id: string;
  patientName: string;
  mrn: string;
  bed: string;
  ward: string;
  riskScore: number;
  trend: 'rising' | 'stable' | 'falling';
  riskFactors: RiskFactor[];
  apache2Score: number;
  sapsScore: number;
  palliativeCareReferred: boolean;
  calibration: CalibrationPoint[];
  updatedAt: string;
}

export interface CalibrationPoint {
  predicted: number;
  observed: number;
  bin: string;
}

export interface DemandForecastDay {
  date: string;
  edVisits: number;
  edVisitsLow: number;
  edVisitsHigh: number;
  admissions: number;
  admissionsLow: number;
  admissionsHigh: number;
  surgeries: number;
  surgeriesLow: number;
  surgeriesHigh: number;
  icuBeds: number;
  icuBedsLow: number;
  icuBedsHigh: number;
}

export interface DemandForecast {
  generatedAt: string;
  days: DemandForecastDay[];
  modelAccuracy: number;
  historicalComparison: {
    lastWeekActual: number;
    lastWeekPredicted: number;
    mape: number;
  };
}

export interface BedOptimizationSuggestion {
  id: string;
  patientName: string;
  mrn: string;
  currentBed: string | null;
  suggestedBed: string;
  suggestedWard: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  predictedDischargeDate: string | null;
  complexity: 'low' | 'medium' | 'high';
  isolationRequired: boolean;
  nursingProximity: boolean;
  score: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface BedOptimizationSummary {
  totalBeds: number;
  occupiedBeds: number;
  predictedDischarges24h: number;
  predictedAdmissions24h: number;
  suggestions: BedOptimizationSuggestion[];
  occupancyForecast: Array<{ hour: string; occupancy: number }>;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const predictiveKeys = {
  all: ['ai-predictive'] as const,
  sepsis: () => [...predictiveKeys.all, 'sepsis'] as const,
  cardiacArrest: () => [...predictiveKeys.all, 'cardiac-arrest'] as const,
  readmission: () => [...predictiveKeys.all, 'readmission'] as const,
  los: () => [...predictiveKeys.all, 'los'] as const,
  mortality: () => [...predictiveKeys.all, 'mortality'] as const,
  demandForecast: () => [...predictiveKeys.all, 'demand-forecast'] as const,
  bedOptimization: () => [...predictiveKeys.all, 'bed-optimization'] as const,
};

// ─── Mock Data ─────────────────────────────────────────────────────────────

const MOCK_SHAP_FEATURES: SHAPFeature[] = [
  { name: 'Lactato', value: 4.2, impact: 0.35, direction: 'positive' },
  { name: 'Leucocitos', value: 18500, impact: 0.25, direction: 'positive' },
  { name: 'Temperatura', value: 38.8, impact: 0.18, direction: 'positive' },
  { name: 'FC', value: 112, impact: 0.12, direction: 'positive' },
  { name: 'PA Sistolica', value: 88, impact: 0.08, direction: 'positive' },
  { name: 'FR', value: 24, impact: 0.05, direction: 'positive' },
  { name: 'Albumina', value: 3.1, impact: -0.03, direction: 'negative' },
  { name: 'Creatinina', value: 1.8, impact: 0.06, direction: 'positive' },
];

function mockSepsisData(): SepsisRiskPatient[] {
  return [
    {
      id: 'sp-1', patientName: 'Maria Silva', mrn: 'MRN-001234', bed: 'UTI-01', ward: 'UTI Adulto',
      riskScore: 0.82, trend: 'rising', predictedOnset: '4-6h',
      topFeatures: MOCK_SHAP_FEATURES,
      lastVitals: { temperature: 38.8, heartRate: 112, respiratoryRate: 24, systolicBP: 88, wbc: 18500, lactate: 4.2 },
      sofa: 8, qsofa: 3, alertTriggered: true, updatedAt: new Date().toISOString(),
    },
    {
      id: 'sp-2', patientName: 'Joao Santos', mrn: 'MRN-005678', bed: 'UTI-03', ward: 'UTI Adulto',
      riskScore: 0.65, trend: 'stable', predictedOnset: '6-8h',
      topFeatures: MOCK_SHAP_FEATURES.map(f => ({ ...f, impact: f.impact * 0.7 })),
      lastVitals: { temperature: 38.2, heartRate: 98, respiratoryRate: 20, systolicBP: 95, wbc: 14200, lactate: 2.8 },
      sofa: 5, qsofa: 2, alertTriggered: false, updatedAt: new Date().toISOString(),
    },
    {
      id: 'sp-3', patientName: 'Ana Costa', mrn: 'MRN-009012', bed: 'UTI-05', ward: 'UTI Adulto',
      riskScore: 0.45, trend: 'falling', predictedOnset: '8-12h',
      topFeatures: MOCK_SHAP_FEATURES.map(f => ({ ...f, impact: f.impact * 0.4 })),
      lastVitals: { temperature: 37.5, heartRate: 88, respiratoryRate: 18, systolicBP: 110, wbc: 11000, lactate: 1.8 },
      sofa: 3, qsofa: 1, alertTriggered: false, updatedAt: new Date().toISOString(),
    },
    {
      id: 'sp-4', patientName: 'Carlos Oliveira', mrn: 'MRN-003456', bed: 'UTI-07', ward: 'UTI Adulto',
      riskScore: 0.91, trend: 'rising', predictedOnset: '2-4h',
      topFeatures: MOCK_SHAP_FEATURES.map(f => ({ ...f, impact: f.impact * 1.2 })),
      lastVitals: { temperature: 39.2, heartRate: 125, respiratoryRate: 28, systolicBP: 78, wbc: 22000, lactate: 5.6 },
      sofa: 11, qsofa: 3, alertTriggered: true, updatedAt: new Date().toISOString(),
    },
    {
      id: 'sp-5', patientName: 'Lucia Ferreira', mrn: 'MRN-007890', bed: 'UTI-09', ward: 'UTI Adulto',
      riskScore: 0.33, trend: 'stable', predictedOnset: '>12h',
      topFeatures: MOCK_SHAP_FEATURES.map(f => ({ ...f, impact: f.impact * 0.3 })),
      lastVitals: { temperature: 37.1, heartRate: 76, respiratoryRate: 16, systolicBP: 120, wbc: 8500, lactate: 1.2 },
      sofa: 2, qsofa: 0, alertTriggered: false, updatedAt: new Date().toISOString(),
    },
  ];
}

function mockCardiacArrestData(): CardiacArrestRisk[] {
  return [
    {
      id: 'ca-1', patientName: 'Roberto Lima', mrn: 'MRN-002345', bed: 'UTI-02', ward: 'UTI Adulto',
      riskScore: 0.78, trend: 'rising', hoursAhead: 6,
      riskFactors: [
        { name: 'Bradicardia recorrente', weight: 0.3, description: 'FC < 50 bpm em 3 episodios nas ultimas 6h', severity: 'critical' },
        { name: 'Hipotensao persistente', weight: 0.25, description: 'PAS < 90 mmHg refrataria a volume', severity: 'high' },
        { name: 'Disturbio eletroilitico', weight: 0.2, description: 'K+ 6.2 mEq/L', severity: 'high' },
        { name: 'Acidose metabolica', weight: 0.15, description: 'pH 7.22, BE -8', severity: 'medium' },
      ],
      newsScore: 9, lastVitals: { heartRate: 48, systolicBP: 82, respiratoryRate: 26, spo2: 91, temperature: 36.2, consciousness: 'Confuso' },
      rapidResponseTriggered: true, updatedAt: new Date().toISOString(),
    },
    {
      id: 'ca-2', patientName: 'Fernanda Rocha', mrn: 'MRN-006789', bed: 'ENF-12', ward: 'Enfermaria',
      riskScore: 0.52, trend: 'stable', hoursAhead: 10,
      riskFactors: [
        { name: 'Taquicardia sustentada', weight: 0.25, description: 'FC > 120 bpm por 2h', severity: 'medium' },
        { name: 'Dessaturacao intermitente', weight: 0.2, description: 'SpO2 < 92% em episodios', severity: 'medium' },
      ],
      newsScore: 6, lastVitals: { heartRate: 122, systolicBP: 100, respiratoryRate: 22, spo2: 92, temperature: 37.5, consciousness: 'Alerta' },
      rapidResponseTriggered: false, updatedAt: new Date().toISOString(),
    },
    {
      id: 'ca-3', patientName: 'Pedro Almeida', mrn: 'MRN-004567', bed: 'UTI-04', ward: 'UTI Adulto',
      riskScore: 0.35, trend: 'falling', hoursAhead: 12,
      riskFactors: [
        { name: 'Pos-operatorio cardiaco', weight: 0.15, description: 'Revascularizacao ha 48h', severity: 'low' },
      ],
      newsScore: 3, lastVitals: { heartRate: 78, systolicBP: 115, respiratoryRate: 16, spo2: 97, temperature: 37.0, consciousness: 'Alerta' },
      rapidResponseTriggered: false, updatedAt: new Date().toISOString(),
    },
  ];
}

function mockReadmissionData(): ReadmissionPrediction[] {
  return [
    {
      id: 'ra-1', patientName: 'Antonio Barbosa', mrn: 'MRN-011234', dischargeDate: '2026-03-22',
      diagnosis: 'ICC descompensada', riskScore: 0.72, riskLevel: 'HIGH', readmissionProbability: 72, daysPostDischarge: 3,
      riskFactors: [
        { name: 'Reinternacao previa em 6 meses', weight: 0.3, description: '2 internacoes nos ultimos 6 meses', severity: 'high' },
        { name: 'Polifarmacia', weight: 0.2, description: '12 medicamentos na alta', severity: 'medium' },
        { name: 'Baixa adesao ambulatorial', weight: 0.15, description: 'Faltou 3 de 5 consultas', severity: 'medium' },
        { name: 'Comorbidades multiplas', weight: 0.15, description: 'DM2, HAS, DRC estadio 3', severity: 'medium' },
      ],
      interventions: [
        { id: 'i-1', type: 'follow_up', description: 'Consulta cardiologia em 7 dias', priority: 'high', applied: true },
        { id: 'i-2', type: 'home_care', description: 'Visita domiciliar enfermagem 2x/semana', priority: 'high', applied: false },
        { id: 'i-3', type: 'telehealth', description: 'Telemonitoramento de peso e PA diario', priority: 'medium', applied: false },
        { id: 'i-4', type: 'education', description: 'Educacao sobre restricao hidrica e sodio', priority: 'medium', applied: true },
      ],
    },
    {
      id: 'ra-2', patientName: 'Helena Martins', mrn: 'MRN-015678', dischargeDate: '2026-03-20',
      diagnosis: 'DPOC exacerbada', riskScore: 0.58, riskLevel: 'MODERATE', readmissionProbability: 58, daysPostDischarge: 5,
      riskFactors: [
        { name: 'Uso domiciliar de O2', weight: 0.25, description: 'O2 2L/min continuo', severity: 'medium' },
        { name: 'Tabagismo ativo', weight: 0.2, description: '40 macos/ano', severity: 'high' },
      ],
      interventions: [
        { id: 'i-5', type: 'follow_up', description: 'Pneumologia em 10 dias', priority: 'high', applied: true },
        { id: 'i-6', type: 'education', description: 'Tecnica inalatoria e cessacao tabagismo', priority: 'high', applied: false },
      ],
    },
    {
      id: 'ra-3', patientName: 'Jose Cardoso', mrn: 'MRN-019012', dischargeDate: '2026-03-24',
      diagnosis: 'Pneumonia comunitaria', riskScore: 0.25, riskLevel: 'LOW', readmissionProbability: 25, daysPostDischarge: 1,
      riskFactors: [
        { name: 'Idade avancada', weight: 0.1, description: '78 anos', severity: 'low' },
      ],
      interventions: [
        { id: 'i-7', type: 'follow_up', description: 'Retorno clinico em 14 dias', priority: 'medium', applied: true },
      ],
    },
  ];
}

function mockLOSData(): LOSPrediction[] {
  return [
    {
      id: 'los-1', patientName: 'Mariana Souza', mrn: 'MRN-021234', bed: 'ENF-03', ward: 'Clinica Medica',
      admissionDate: '2026-03-20', predictedLOS: 8.5, drgAverageLOS: 6.0, currentDay: 5, confidence: 0.85,
      drgCode: 'DRG-291', drgDescription: 'ICC e arritmia cardiaca com CC',
      factors: [
        { name: 'Infeccao urinaria nosocomial', impact: 2.5, direction: 'longer', description: 'Adquirida no D3' },
        { name: 'Necessidade de anticoagulacao', impact: 1.0, direction: 'longer', description: 'Ajuste de dose em andamento' },
        { name: 'Resposta ao diuretico', impact: -1.0, direction: 'shorter', description: 'Boa resposta ao furosemida' },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'los-2', patientName: 'Ricardo Gomes', mrn: 'MRN-025678', bed: 'CIR-07', ward: 'Cirurgica',
      admissionDate: '2026-03-23', predictedLOS: 4.0, drgAverageLOS: 5.0, currentDay: 2, confidence: 0.92,
      drgCode: 'DRG-470', drgDescription: 'Artroplastia de quadril sem CC',
      factors: [
        { name: 'Fisioterapia precoce', impact: -0.5, direction: 'shorter', description: 'Deambulacao no D1' },
        { name: 'Sem complicacoes', impact: -0.5, direction: 'shorter', description: 'Evolucao sem intercorrencias' },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'los-3', patientName: 'Beatriz Pinto', mrn: 'MRN-029012', bed: 'UTI-06', ward: 'UTI Adulto',
      admissionDate: '2026-03-18', predictedLOS: 14.0, drgAverageLOS: 10.0, currentDay: 7, confidence: 0.78,
      drgCode: 'DRG-871', drgDescription: 'Septicemia sem ventilacao mecanica com MCC',
      factors: [
        { name: 'Choque septico', impact: 3.0, direction: 'longer', description: 'Noradrenalina em desmame' },
        { name: 'IRA dialítica', impact: 2.0, direction: 'longer', description: 'Hemodialise intermitente' },
        { name: 'Melhora do lactato', impact: -1.0, direction: 'shorter', description: 'Lactato normalizado em 48h' },
      ],
      updatedAt: new Date().toISOString(),
    },
  ];
}

function mockMortalityData(): MortalityPrediction[] {
  return [
    {
      id: 'mort-1', patientName: 'Geraldo Nunes', mrn: 'MRN-031234', bed: 'UTI-08', ward: 'UTI Adulto',
      riskScore: 0.68, trend: 'rising',
      riskFactors: [
        { name: 'Choque septico refratario', weight: 0.3, description: 'Noradrenalina > 0.5 mcg/kg/min', severity: 'critical' },
        { name: 'Falencia multiorganica', weight: 0.25, description: 'SOFA 14', severity: 'critical' },
        { name: 'Idade avancada', weight: 0.1, description: '82 anos', severity: 'medium' },
      ],
      apache2Score: 32, sapsScore: 68, palliativeCareReferred: true,
      calibration: [
        { predicted: 10, observed: 8, bin: '0-20%' },
        { predicted: 30, observed: 28, bin: '20-40%' },
        { predicted: 50, observed: 52, bin: '40-60%' },
        { predicted: 70, observed: 65, bin: '60-80%' },
        { predicted: 90, observed: 88, bin: '80-100%' },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mort-2', patientName: 'Vera Machado', mrn: 'MRN-035678', bed: 'UTI-10', ward: 'UTI Adulto',
      riskScore: 0.42, trend: 'stable',
      riskFactors: [
        { name: 'Pneumonia aspirativa', weight: 0.2, description: 'Em ventilacao mecanica D5', severity: 'high' },
        { name: 'Desnutricao grave', weight: 0.15, description: 'Albumina 2.0 g/dL', severity: 'medium' },
      ],
      apache2Score: 22, sapsScore: 45, palliativeCareReferred: false,
      calibration: [
        { predicted: 10, observed: 12, bin: '0-20%' },
        { predicted: 30, observed: 32, bin: '20-40%' },
        { predicted: 50, observed: 48, bin: '40-60%' },
        { predicted: 70, observed: 72, bin: '60-80%' },
        { predicted: 90, observed: 91, bin: '80-100%' },
      ],
      updatedAt: new Date().toISOString(),
    },
  ];
}

function mockDemandForecast(): DemandForecast {
  const days: DemandForecastDay[] = [];
  const baseDate = new Date('2026-03-25');
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const edBase = isWeekend ? 145 : 120;
    const admBase = isWeekend ? 35 : 28;
    const surgBase = isWeekend ? 5 : 18;
    const icuBase = 22;
    days.push({
      date: d.toISOString().split('T')[0] ?? '',
      edVisits: edBase + Math.round(Math.random() * 20),
      edVisitsLow: edBase - 15,
      edVisitsHigh: edBase + 35,
      admissions: admBase + Math.round(Math.random() * 8),
      admissionsLow: admBase - 5,
      admissionsHigh: admBase + 12,
      surgeries: surgBase + Math.round(Math.random() * 4),
      surgeriesLow: surgBase - 3,
      surgeriesHigh: surgBase + 8,
      icuBeds: icuBase + Math.round(Math.random() * 4),
      icuBedsLow: icuBase - 2,
      icuBedsHigh: icuBase + 6,
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    days,
    modelAccuracy: 91.3,
    historicalComparison: { lastWeekActual: 842, lastWeekPredicted: 858, mape: 4.2 },
  };
}

function mockBedOptimization(): BedOptimizationSummary {
  return {
    totalBeds: 320,
    occupiedBeds: 278,
    predictedDischarges24h: 18,
    predictedAdmissions24h: 22,
    suggestions: [
      {
        id: 'bo-1', patientName: 'Paulo Ribeiro', mrn: 'MRN-041234',
        currentBed: 'ENF-15', suggestedBed: 'ENF-03', suggestedWard: 'Clinica Medica',
        reason: 'Proximidade da estacao de enfermagem — paciente com risco de queda elevado',
        priority: 'high', predictedDischargeDate: '2026-03-27', complexity: 'medium',
        isolationRequired: false, nursingProximity: true, score: 92, status: 'pending',
      },
      {
        id: 'bo-2', patientName: 'Sandra Dias', mrn: 'MRN-045678',
        currentBed: null, suggestedBed: 'UTI-11', suggestedWard: 'UTI Adulto',
        reason: 'Admissao prevista do PS — leito sera liberado por alta prevista de outro paciente as 14h',
        priority: 'urgent', predictedDischargeDate: null, complexity: 'high',
        isolationRequired: false, nursingProximity: false, score: 88, status: 'pending',
      },
      {
        id: 'bo-3', patientName: 'Marcos Teixeira', mrn: 'MRN-049012',
        currentBed: 'ENF-22', suggestedBed: 'ISO-02', suggestedWard: 'Isolamento',
        reason: 'Cultura positiva para KPC — necessidade de isolamento de contato',
        priority: 'urgent', predictedDischargeDate: '2026-03-30', complexity: 'high',
        isolationRequired: true, nursingProximity: false, score: 95, status: 'pending',
      },
      {
        id: 'bo-4', patientName: 'Claudia Moura', mrn: 'MRN-053456',
        currentBed: 'UTI-12', suggestedBed: 'SEMI-04', suggestedWard: 'Semi-Intensiva',
        reason: 'Step-down — paciente estavel ha 48h, liberar leito de UTI para demanda prevista',
        priority: 'medium', predictedDischargeDate: '2026-03-28', complexity: 'medium',
        isolationRequired: false, nursingProximity: false, score: 85, status: 'pending',
      },
      {
        id: 'bo-5', patientName: 'Eduardo Franco', mrn: 'MRN-057890',
        currentBed: 'ENF-08', suggestedBed: 'ENF-20', suggestedWard: 'Cirurgica',
        reason: 'Transferencia para ala cirurgica — procedimento agendado para amanha',
        priority: 'low', predictedDischargeDate: '2026-03-29', complexity: 'low',
        isolationRequired: false, nursingProximity: false, score: 78, status: 'pending',
      },
    ],
    occupancyForecast: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      occupancy: 85 + Math.sin(i / 4) * 5 + Math.random() * 2,
    })),
  };
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useSepsisPrediction() {
  return useQuery({
    queryKey: predictiveKeys.sepsis(),
    queryFn: async () => {
      try {
        const { data } = await api.get<SepsisRiskPatient[]>('/ai/predictive/sepsis');
        return data;
      } catch {
        return mockSepsisData();
      }
    },
    refetchInterval: 30_000,
  });
}

export function useCardiacArrestPrediction() {
  return useQuery({
    queryKey: predictiveKeys.cardiacArrest(),
    queryFn: async () => {
      try {
        const { data } = await api.get<CardiacArrestRisk[]>('/ai/predictive/cardiac-arrest');
        return data;
      } catch {
        return mockCardiacArrestData();
      }
    },
    refetchInterval: 30_000,
  });
}

export function useReadmissionPrediction() {
  return useQuery({
    queryKey: predictiveKeys.readmission(),
    queryFn: async () => {
      try {
        const { data } = await api.get<ReadmissionPrediction[]>('/ai/predictive/readmission');
        return data;
      } catch {
        return mockReadmissionData();
      }
    },
    refetchInterval: 60_000,
  });
}

export function useLOSPrediction() {
  return useQuery({
    queryKey: predictiveKeys.los(),
    queryFn: async () => {
      try {
        const { data } = await api.get<LOSPrediction[]>('/ai/predictive/los');
        return data;
      } catch {
        return mockLOSData();
      }
    },
    refetchInterval: 60_000,
  });
}

export function useMortalityPrediction() {
  return useQuery({
    queryKey: predictiveKeys.mortality(),
    queryFn: async () => {
      try {
        const { data } = await api.get<MortalityPrediction[]>('/ai/predictive/mortality');
        return data;
      } catch {
        return mockMortalityData();
      }
    },
    refetchInterval: 30_000,
  });
}

export function useDemandForecast() {
  return useQuery({
    queryKey: predictiveKeys.demandForecast(),
    queryFn: async () => {
      try {
        const { data } = await api.get<DemandForecast>('/ai/predictive/demand-forecast');
        return data;
      } catch {
        return mockDemandForecast();
      }
    },
    refetchInterval: 300_000,
  });
}

export function useBedOptimization() {
  return useQuery({
    queryKey: predictiveKeys.bedOptimization(),
    queryFn: async () => {
      try {
        const { data } = await api.get<BedOptimizationSummary>('/ai/predictive/bed-optimization');
        return data;
      } catch {
        return mockBedOptimization();
      }
    },
    refetchInterval: 60_000,
  });
}
