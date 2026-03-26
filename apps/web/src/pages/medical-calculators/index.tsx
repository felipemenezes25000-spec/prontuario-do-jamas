import { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  Heart,
  Brain,
  Droplets,
  Activity,
  Wind,
  Thermometer,
  AlertCircle,
  CheckCircle2,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

interface CalculatorInput {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'select';
  options?: Array<{ value: number; label: string }>;
  min?: number;
  max?: number;
}

interface CalculatorDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Calculator;
  category: string;
  inputs: CalculatorInput[];
}

interface CalculationResult {
  score: number;
  maxScore: number;
  interpretation: string;
  risk: RiskLevel;
}

// ============================================================================
// Constants
// ============================================================================

const RISK_CONFIG: Record<RiskLevel, { label: string; badgeClass: string; bgClass: string }> = {
  LOW: { label: 'Baixo', badgeClass: 'bg-green-600 text-white', bgClass: 'bg-green-500/10 border-green-500/30' },
  MODERATE: { label: 'Moderado', badgeClass: 'bg-yellow-600 text-white', bgClass: 'bg-yellow-500/10 border-yellow-500/30' },
  HIGH: { label: 'Alto', badgeClass: 'bg-orange-600 text-white', bgClass: 'bg-orange-500/10 border-orange-500/30' },
  VERY_HIGH: { label: 'Muito Alto', badgeClass: 'bg-red-600 text-white', bgClass: 'bg-red-500/10 border-red-500/30' },
};

const CALCULATORS: CalculatorDef[] = [
  {
    id: 'CHADS2_VASC', name: 'CHA2DS2-VASc', description: 'Risco de AVC em fibrilacao atrial',
    icon: Heart, category: 'Cardiologia',
    inputs: [
      { key: 'chf', label: 'Insuficiencia cardiaca', type: 'boolean' },
      { key: 'hypertension', label: 'Hipertensao', type: 'boolean' },
      { key: 'age75', label: 'Idade >= 75 anos', type: 'boolean' },
      { key: 'diabetes', label: 'Diabetes mellitus', type: 'boolean' },
      { key: 'stroke', label: 'AVC/AIT/tromboembolismo previo', type: 'boolean' },
      { key: 'vascular', label: 'Doenca vascular', type: 'boolean' },
      { key: 'age65', label: 'Idade 65-74 anos', type: 'boolean' },
      { key: 'female', label: 'Sexo feminino', type: 'boolean' },
    ],
  },
  {
    id: 'MELD', name: 'MELD Score', description: 'Gravidade de doenca hepatica cronica',
    icon: Droplets, category: 'Hepatologia',
    inputs: [
      { key: 'bilirubin', label: 'Bilirrubina (mg/dL)', type: 'number', min: 0.1, max: 50 },
      { key: 'inr', label: 'INR', type: 'number', min: 0.1, max: 20 },
      { key: 'creatinine', label: 'Creatinina (mg/dL)', type: 'number', min: 0.1, max: 15 },
    ],
  },
  {
    id: 'CHILD_PUGH', name: 'Child-Pugh', description: 'Classificacao de cirrose hepatica',
    icon: Droplets, category: 'Hepatologia',
    inputs: [
      { key: 'ascites', label: 'Ascite', type: 'select', options: [{ value: 1, label: 'Ausente' }, { value: 2, label: 'Leve' }, { value: 3, label: 'Moderada/Grave' }] },
      { key: 'encephalopathy', label: 'Encefalopatia', type: 'select', options: [{ value: 1, label: 'Ausente' }, { value: 2, label: 'Grau I-II' }, { value: 3, label: 'Grau III-IV' }] },
      { key: 'bilirubin', label: 'Bilirrubina', type: 'select', options: [{ value: 1, label: '< 2 mg/dL' }, { value: 2, label: '2-3 mg/dL' }, { value: 3, label: '> 3 mg/dL' }] },
      { key: 'albumin', label: 'Albumina', type: 'select', options: [{ value: 1, label: '> 3.5 g/dL' }, { value: 2, label: '2.8-3.5 g/dL' }, { value: 3, label: '< 2.8 g/dL' }] },
      { key: 'inr', label: 'INR', type: 'select', options: [{ value: 1, label: '< 1.7' }, { value: 2, label: '1.7-2.3' }, { value: 3, label: '> 2.3' }] },
    ],
  },
  {
    id: 'WELLS_DVT', name: 'Wells (TVP)', description: 'Probabilidade de trombose venosa profunda',
    icon: Activity, category: 'Vascular',
    inputs: [
      { key: 'activeCancer', label: 'Cancer ativo', type: 'boolean' },
      { key: 'paralysis', label: 'Paralisia/paresia recente', type: 'boolean' },
      { key: 'bedridden', label: 'Acamado >3 dias ou cirurgia recente', type: 'boolean' },
      { key: 'tenderness', label: 'Sensibilidade venosa', type: 'boolean' },
      { key: 'swelling', label: 'Edema em toda a perna', type: 'boolean' },
      { key: 'calfSwelling', label: 'Panturrilha >3cm maior', type: 'boolean' },
      { key: 'pittingEdema', label: 'Edema depressivel', type: 'boolean' },
      { key: 'collateralVeins', label: 'Veias colaterais', type: 'boolean' },
      { key: 'previousDvt', label: 'TVP previa', type: 'boolean' },
      { key: 'alternativeDiagnosis', label: 'Diagnostico alternativo provavel (-2)', type: 'boolean' },
    ],
  },
  {
    id: 'WELLS_PE', name: 'Wells (TEP)', description: 'Probabilidade de embolia pulmonar',
    icon: Wind, category: 'Pneumologia',
    inputs: [
      { key: 'clinicalDvt', label: 'Sinais clinicos de TVP (+3)', type: 'boolean' },
      { key: 'peMostLikely', label: 'TEP mais provavel (+3)', type: 'boolean' },
      { key: 'heartRate100', label: 'FC > 100 bpm (+1.5)', type: 'boolean' },
      { key: 'immobilization', label: 'Imobilizacao/cirurgia recente (+1.5)', type: 'boolean' },
      { key: 'previousPeDvt', label: 'TEP ou TVP previa (+1.5)', type: 'boolean' },
      { key: 'hemoptysis', label: 'Hemoptise (+1)', type: 'boolean' },
      { key: 'cancer', label: 'Cancer (+1)', type: 'boolean' },
    ],
  },
  {
    id: 'CURB65', name: 'CURB-65', description: 'Gravidade de pneumonia comunitaria',
    icon: Thermometer, category: 'Pneumologia',
    inputs: [
      { key: 'confusion', label: 'Confusao mental', type: 'boolean' },
      { key: 'ureiaGt7', label: 'Ureia > 42 mg/dL', type: 'boolean' },
      { key: 'respRateGt30', label: 'FR >= 30 irpm', type: 'boolean' },
      { key: 'lowBp', label: 'PAS < 90 ou PAD <= 60', type: 'boolean' },
      { key: 'ageGt65', label: 'Idade >= 65 anos', type: 'boolean' },
    ],
  },
  {
    id: 'SOFA', name: 'SOFA Score', description: 'Falencia organica sequencial (UTI)',
    icon: Brain, category: 'Terapia Intensiva',
    inputs: [
      { key: 'respiration', label: 'Respiracao PaO2/FiO2 (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'coagulation', label: 'Plaquetas (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'liver', label: 'Bilirrubina (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'cardiovascular', label: 'Cardiovascular (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'cns', label: 'Glasgow (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'renal', label: 'Creatinina/Diurese (0-4)', type: 'number', min: 0, max: 4 },
    ],
  },
  {
    id: 'HAS_BLED', name: 'HAS-BLED', description: 'Risco de sangramento em anticoagulacao',
    icon: AlertCircle, category: 'Hematologia',
    inputs: [
      { key: 'hypertension', label: 'Hipertensao (PAS > 160)', type: 'boolean' },
      { key: 'renalDisease', label: 'Funcao renal anormal', type: 'boolean' },
      { key: 'liverDisease', label: 'Funcao hepatica anormal', type: 'boolean' },
      { key: 'stroke', label: 'AVC previo', type: 'boolean' },
      { key: 'bleeding', label: 'Sangramento previo', type: 'boolean' },
      { key: 'labileInr', label: 'INR labil', type: 'boolean' },
      { key: 'elderly', label: 'Idade > 65', type: 'boolean' },
      { key: 'drugs', label: 'Antiplaquetarios/AINEs', type: 'boolean' },
      { key: 'alcohol', label: 'Uso de alcool', type: 'boolean' },
    ],
  },
];

// ============================================================================
// Local calculator functions (mirror backend logic)
// ============================================================================

function calculateLocally(calcId: string, inputs: Record<string, number>): CalculationResult | null {
  switch (calcId) {
    case 'CHADS2_VASC': {
      const score = (inputs['chf'] ? 1 : 0) + (inputs['hypertension'] ? 1 : 0) + (inputs['age75'] ? 2 : 0) +
        (inputs['diabetes'] ? 1 : 0) + (inputs['stroke'] ? 2 : 0) + (inputs['vascular'] ? 1 : 0) +
        (inputs['age65'] ? 1 : 0) + (inputs['female'] ? 1 : 0);
      const risk: RiskLevel = score === 0 ? 'LOW' : score === 1 ? 'MODERATE' : score >= 4 ? 'VERY_HIGH' : 'HIGH';
      const interp = score === 0 ? 'Baixo risco. Considerar nao anticoagular.' :
        score === 1 ? 'Risco moderado. Considerar anticoagulacao.' : 'Alto risco. Anticoagulacao recomendada.';
      return { score, maxScore: 9, interpretation: interp, risk };
    }
    case 'MELD': {
      const bil = Math.max(inputs['bilirubin'] ?? 1, 1);
      const inr = Math.max(inputs['inr'] ?? 1, 1);
      const cr = Math.min(Math.max(inputs['creatinine'] ?? 1, 1), 4);
      const raw = Math.round(3.78 * Math.log(bil) + 11.2 * Math.log(inr) + 9.57 * Math.log(cr) + 6.43);
      const score = Math.max(6, Math.min(raw, 40));
      const risk: RiskLevel = score < 10 ? 'LOW' : score < 20 ? 'MODERATE' : score < 30 ? 'HIGH' : 'VERY_HIGH';
      const interp = score < 10 ? 'Baixa gravidade. Mortalidade 3m: ~1.9%.' :
        score < 20 ? 'Moderada. Mortalidade 3m: ~6%.' :
        score < 30 ? 'Alta gravidade. Mortalidade 3m: ~19.6%.' : 'Muito alta. Mortalidade 3m: ~52.6%.';
      return { score, maxScore: 40, interpretation: interp, risk };
    }
    case 'CHILD_PUGH': {
      const score = (inputs['ascites'] ?? 1) + (inputs['encephalopathy'] ?? 1) + (inputs['bilirubin'] ?? 1) +
        (inputs['albumin'] ?? 1) + (inputs['inr'] ?? 1);
      const cls = score <= 6 ? 'A' : score <= 9 ? 'B' : 'C';
      const risk: RiskLevel = score <= 6 ? 'LOW' : score <= 9 ? 'MODERATE' : 'HIGH';
      const interp = `Classe ${cls} (${score}/15). ${cls === 'A' ? 'Bem compensado.' : cls === 'B' ? 'Comprometimento significativo.' : 'Descompensado.'}`;
      return { score, maxScore: 15, interpretation: interp, risk };
    }
    case 'WELLS_DVT': {
      const score = (inputs['activeCancer'] ? 1 : 0) + (inputs['paralysis'] ? 1 : 0) + (inputs['bedridden'] ? 1 : 0) +
        (inputs['tenderness'] ? 1 : 0) + (inputs['swelling'] ? 1 : 0) + (inputs['calfSwelling'] ? 1 : 0) +
        (inputs['pittingEdema'] ? 1 : 0) + (inputs['collateralVeins'] ? 1 : 0) + (inputs['previousDvt'] ? 1 : 0) +
        (inputs['alternativeDiagnosis'] ? -2 : 0);
      const risk: RiskLevel = score <= 0 ? 'LOW' : score <= 2 ? 'MODERATE' : 'HIGH';
      const interp = score <= 0 ? 'Baixa probabilidade (~5%). Solicitar D-dimero.' :
        score <= 2 ? 'Moderada (~17%). D-dimero e/ou USG Doppler.' : 'Alta probabilidade (~53%). USG Doppler.';
      return { score, maxScore: 9, interpretation: interp, risk };
    }
    case 'WELLS_PE': {
      const score = (inputs['clinicalDvt'] ? 3 : 0) + (inputs['peMostLikely'] ? 3 : 0) +
        (inputs['heartRate100'] ? 1.5 : 0) + (inputs['immobilization'] ? 1.5 : 0) +
        (inputs['previousPeDvt'] ? 1.5 : 0) + (inputs['hemoptysis'] ? 1 : 0) + (inputs['cancer'] ? 1 : 0);
      const risk: RiskLevel = score <= 1 ? 'LOW' : score <= 4 ? 'MODERATE' : 'HIGH';
      const interp = score <= 1 ? 'Baixa probabilidade (~1.3%). D-dimero.' :
        score <= 4 ? 'Moderada (~16.2%). D-dimero e/ou angioTC.' : 'Alta (~40.6%). AngioTC de torax.';
      return { score, maxScore: 12.5, interpretation: interp, risk };
    }
    case 'CURB65': {
      const score = (inputs['confusion'] ? 1 : 0) + (inputs['ureiaGt7'] ? 1 : 0) + (inputs['respRateGt30'] ? 1 : 0) +
        (inputs['lowBp'] ? 1 : 0) + (inputs['ageGt65'] ? 1 : 0);
      const risk: RiskLevel = score <= 1 ? 'LOW' : score === 2 ? 'MODERATE' : score >= 4 ? 'VERY_HIGH' : 'HIGH';
      const interp = score <= 1 ? 'Baixa gravidade. Ambulatorial. Mortalidade ~1.5%.' :
        score === 2 ? 'Moderada. Internacao. Mortalidade ~9.2%.' : 'Alta gravidade. UTI. Mortalidade ~22%.';
      return { score, maxScore: 5, interpretation: interp, risk };
    }
    case 'SOFA': {
      const score = (inputs['respiration'] ?? 0) + (inputs['coagulation'] ?? 0) + (inputs['liver'] ?? 0) +
        (inputs['cardiovascular'] ?? 0) + (inputs['cns'] ?? 0) + (inputs['renal'] ?? 0);
      const risk: RiskLevel = score <= 1 ? 'LOW' : score <= 6 ? 'MODERATE' : score <= 12 ? 'HIGH' : 'VERY_HIGH';
      const interp = score <= 1 ? 'SOFA baixo. Mortalidade < 10%.' :
        score <= 6 ? 'SOFA moderado. Monitorar.' :
        score <= 12 ? 'SOFA alto. Mortalidade 15-20%.' : 'SOFA muito alto. Mortalidade > 50%.';
      return { score, maxScore: 24, interpretation: interp, risk };
    }
    case 'HAS_BLED': {
      const score = (inputs['hypertension'] ? 1 : 0) + (inputs['renalDisease'] ? 1 : 0) + (inputs['liverDisease'] ? 1 : 0) +
        (inputs['stroke'] ? 1 : 0) + (inputs['bleeding'] ? 1 : 0) + (inputs['labileInr'] ? 1 : 0) +
        (inputs['elderly'] ? 1 : 0) + (inputs['drugs'] ? 1 : 0) + (inputs['alcohol'] ? 1 : 0);
      const risk: RiskLevel = score <= 1 ? 'LOW' : score === 2 ? 'MODERATE' : score >= 5 ? 'VERY_HIGH' : 'HIGH';
      const interp = score <= 1 ? 'Baixo risco. Anticoagulacao segura.' :
        score === 2 ? 'Risco moderado. Monitorar INR.' : 'Alto risco. Ponderar risco-beneficio.';
      return { score, maxScore: 9, interpretation: interp, risk };
    }
    default:
      return null;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function MedicalCalculatorsPage() {
  const firstCalc = CALCULATORS[0] as CalculatorDef;
  const [selectedCalcId, setSelectedCalcId] = useState<string>(firstCalc.id);
  const [inputValues, setInputValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CalculationResult | null>(null);

  const selectedCalc = useMemo(
    () => CALCULATORS.find((c) => c.id === selectedCalcId) ?? firstCalc,
    [selectedCalcId],
  );

  const handleCalcChange = useCallback((calcId: string) => {
    setSelectedCalcId(calcId);
    setInputValues({});
    setResult(null);
  }, []);

  const handleInputChange = useCallback((key: string, value: number) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleToggle = useCallback((key: string) => {
    setInputValues((prev) => ({ ...prev, [key]: prev[key] ? 0 : 1 }));
  }, []);

  const handleCalculate = useCallback(() => {
    const res = calculateLocally(selectedCalcId, inputValues);
    setResult(res);
  }, [selectedCalcId, inputValues]);

  const handleReset = useCallback(() => {
    setInputValues({});
    setResult(null);
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          <Calculator className="mr-2 inline-block h-7 w-7 text-emerald-400" />
          Calculadoras Medicas
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Escores clinicos validados com interpretacao automatica
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calculator selector */}
        <div className="space-y-3">
          <Label className="text-zinc-300">Selecione a Calculadora</Label>
          <div className="space-y-2">
            {CALCULATORS.map((calc) => {
              const Icon = calc.icon;
              return (
                <button
                  key={calc.id}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    selectedCalcId === calc.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800',
                  )}
                  onClick={() => handleCalcChange(calc.id)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{calc.name}</p>
                    <p className="truncate text-xs text-zinc-500">{calc.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input form */}
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                {(() => { const Icon = selectedCalc.icon; return <Icon className="h-5 w-5 text-emerald-400" />; })()}
                {selectedCalc.name}
              </CardTitle>
              <p className="text-sm text-zinc-400">{selectedCalc.description}</p>
              <Badge variant="outline" className="w-fit border-zinc-700 text-zinc-400">
                {selectedCalc.category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCalc.inputs.map((input) => (
                <div key={input.key}>
                  {input.type === 'boolean' && (
                    <button
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border p-3 transition-colors',
                        inputValues[input.key]
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600',
                      )}
                      onClick={() => handleToggle(input.key)}
                    >
                      <span className="text-sm">{input.label}</span>
                      <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border',
                        inputValues[input.key]
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-zinc-600',
                      )}>
                        {inputValues[input.key] ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : null}
                      </div>
                    </button>
                  )}
                  {input.type === 'number' && (
                    <div>
                      <Label className="text-sm text-zinc-400">{input.label}</Label>
                      <Input
                        type="number"
                        className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                        min={input.min}
                        max={input.max}
                        step={input.key === 'inr' || input.key === 'creatinine' || input.key === 'bilirubin' ? 0.1 : 1}
                        value={inputValues[input.key] ?? ''}
                        onChange={(e) => handleInputChange(input.key, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                  {input.type === 'select' && input.options && (
                    <div>
                      <Label className="text-sm text-zinc-400">{input.label}</Label>
                      <Select
                        value={String(inputValues[input.key] ?? '')}
                        onValueChange={(v) => handleInputChange(input.key, parseInt(v, 10))}
                      >
                        <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-900">
                          {input.options.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleCalculate}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <Card className={cn('border', RISK_CONFIG[result.risk].bgClass)}>
              <CardHeader>
                <CardTitle className="text-zinc-100">Resultado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-5xl font-bold text-zinc-100">
                    {result.score}
                    <span className="text-lg text-zinc-500"> / {result.maxScore}</span>
                  </p>
                  <Badge className={cn('mt-2', RISK_CONFIG[result.risk].badgeClass)}>
                    Risco {RISK_CONFIG[result.risk].label}
                  </Badge>
                </div>

                {/* Score bar */}
                <div className="space-y-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        result.risk === 'LOW' ? 'bg-green-500' :
                        result.risk === 'MODERATE' ? 'bg-yellow-500' :
                        result.risk === 'HIGH' ? 'bg-orange-500' : 'bg-red-500',
                      )}
                      style={{ width: `${Math.min((result.score / result.maxScore) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-sm text-zinc-300">{result.interpretation}</p>
                  </div>
                </div>

                <p className="text-center text-xs text-zinc-500">
                  Resultado gerado localmente. Confirme com avaliacao clinica.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Calculator className="mb-4 h-12 w-12" />
                <p className="text-center">
                  Preencha os campos e clique em <strong>Calcular</strong> para ver o resultado.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick reference */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">Referencia Rapida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Baixo risco</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>Risco moderado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span>Alto risco</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Risco muito alto</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
