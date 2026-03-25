import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Calculator,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Layers,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCalculateDrg,
  useDrgAnalytics,
  type DrgResult,
  type DrgSeverity,
  type DrgAnalyticsFilters,
} from '@/services/billing-drg.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const SEVERITY_LABEL: Record<DrgSeverity, string> = {
  LOW: 'Baixa',
  MODERATE: 'Moderada',
  HIGH: 'Alta',
  EXTREME: 'Extrema',
};

const SEVERITY_COLOR: Record<DrgSeverity, string> = {
  LOW: 'bg-emerald-900 text-emerald-300',
  MODERATE: 'bg-blue-900 text-blue-300',
  HIGH: 'bg-amber-900 text-amber-300',
  EXTREME: 'bg-red-900 text-red-300',
};

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

// ─── DRG Calculation Tab ──────────────────────────────────────────────────────

function DrgCalculationTab() {
  const calculate = useCalculateDrg();

  const [principal, setPrincipal] = useState('');
  const [secondary, setSecondary] = useState('');
  const [procedures, setProcedures] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [ventilation, setVentilation] = useState('');
  const [result, setResult] = useState<DrgResult | null>(null);

  async function handleCalculate() {
    if (!principal.trim()) {
      toast.error('Informe o diagnóstico principal (CID-10).');
      return;
    }
    try {
      const res = await calculate.mutateAsync({
        principalDiagnosis: principal.trim().toUpperCase(),
        secondaryDiagnoses: secondary
          ? secondary.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
          : undefined,
        procedureCodes: procedures
          ? procedures.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        ventilationHours: ventilation ? parseFloat(ventilation) : undefined,
      });
      setResult(res);
      toast.success('DRG calculado com sucesso.');
    } catch {
      toast.error('Erro ao calcular DRG.');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input form */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Dados Clínicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-300">Diagnóstico Principal (CID-10) *</Label>
            <Input
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="Ex.: J18.9"
              className="bg-gray-800 border-gray-600 text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Diagnósticos Secundários (CID-10, separados por vírgula)</Label>
            <Input
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder="Ex.: E11.9, I10, N18.3"
              className="bg-gray-800 border-gray-600 text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Procedimentos (CBHPM/TUSS, separados por vírgula)</Label>
            <Input
              value={procedures}
              onChange={(e) => setProcedures(e.target.value)}
              placeholder="Ex.: 1.01.01.01-8, 4.03.04.36-3"
              className="bg-gray-800 border-gray-600 text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-300">Idade</Label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Anos"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Sexo</Label>
              <Input
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="M / F"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Ventilação (h)</Label>
              <Input
                type="number"
                value={ventilation}
                onChange={(e) => setVentilation(e.target.value)}
                placeholder="0"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleCalculate}
            disabled={calculate.isPending}
          >
            {calculate.isPending ? 'Calculando...' : 'Calcular DRG'}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Resultado DRG
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
              <Calculator className="w-10 h-10 opacity-40" />
              <p className="text-sm">Preencha os dados e clique em "Calcular DRG"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* DRG Code */}
              <div className="rounded-lg bg-gray-800 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Código DRG</p>
                    <p className="text-2xl font-bold text-white font-mono">{result.drgCode}</p>
                    <p className="text-sm text-gray-300 mt-1">{result.drgDescription}</p>
                  </div>
                  <Badge className={cn('shrink-0', SEVERITY_COLOR[result.severity])}>
                    Complexidade {SEVERITY_LABEL[result.severity]}
                  </Badge>
                </div>
              </div>

              {/* MDC */}
              <div className="rounded-lg bg-gray-800 px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Categoria Diagnóstica Principal (MDC)</p>
                <p className="text-white text-sm font-medium">MDC {result.mdc} — {result.mdcDescription}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-800 p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Peso DRG</p>
                  <p className="text-xl font-bold text-emerald-400">{result.weight.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-gray-800 p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">DIH Médio</p>
                  <p className="text-xl font-bold text-blue-400">{result.averageLos}d</p>
                </div>
                <div className="rounded-lg bg-gray-800 p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Custo Esperado</p>
                  <p className="text-lg font-bold text-amber-400">{fmt(result.expectedCost)}</p>
                </div>
              </div>

              {/* Severity guidance */}
              {(result.severity === 'HIGH' || result.severity === 'EXTREME') && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-900/20 border border-amber-800 p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Caso de alta complexidade. Verifique a necessidade de revisão clínica e
                    documentação detalhada das complicações e comorbidades (CCs).
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Mix Analysis Tab ─────────────────────────────────────────────────────────

function MixAnalysisTab() {
  const [filters, setFilters] = useState<DrgAnalyticsFilters>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useDrgAnalytics(filters);

  function handleApplyFilters() {
    setFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }

  const mix = data?.drgMix ?? [];
  const totalEncounters = data?.totalEncounters ?? 0;
  const totalRevenue = mix.reduce((s, m) => s + m.totalCost, 0);

  // Enrich mix with MDC descriptions
  const mdcDescriptions: Record<string, string> = {
    '01': 'Sistema Nervoso', '02': 'Olho / Ouvido', '04': 'Resp. Respiratório',
    '05': 'Ap. Circulatório', '06': 'Ap. Digestivo', '08': 'Osteomuscular',
    '09': 'Pele / Subcutâneo', '10': 'Endócrino', '11': 'Geniturinário',
    '14': 'Obstetrícia', '15': 'Neonatologia', '17': 'Neoplasias',
    '18': 'Infectoparasitárias', '19': 'Saúde Mental', '21': 'Traumatismos',
    '23': 'Outros / Sinais',
  };

  const chartData = mix.slice(0, 10).map((m) => ({
    name: mdcDescriptions[m.mdcCategory] ?? m.mdcCategory,
    atendimentos: m.encounterCount,
    receita: m.totalCost,
    dih: m.averageLos,
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApplyFilters}
            >
              <Search className="w-4 h-4 mr-1" /> Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <p className="text-sm text-gray-400 mb-1">Total de Atendimentos</p>
            <p className="text-3xl font-bold text-white">{totalEncounters}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <p className="text-sm text-gray-400 mb-1">Grupos Diagnósticos</p>
            <p className="text-3xl font-bold text-white">{mix.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <p className="text-sm text-gray-400 mb-1">Receita Total</p>
            <p className="text-2xl font-bold text-emerald-400">{fmt(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {!isLoading && chartData.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Atendimentos por Categoria (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="atendimentos" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Mix Detalhado por MDC
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-gray-400 text-sm p-4">Carregando...</p>
          ) : mix.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 text-center">Nenhum dado disponível.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">MDC</TableHead>
                  <TableHead className="text-gray-400">Categoria</TableHead>
                  <TableHead className="text-gray-400 text-right">Atendimentos</TableHead>
                  <TableHead className="text-gray-400 text-right">DIH Médio</TableHead>
                  <TableHead className="text-gray-400 text-right">Custo Médio</TableHead>
                  <TableHead className="text-gray-400 text-right">Total</TableHead>
                  <TableHead className="text-gray-400 text-right">Mix %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mix.map((m, idx) => {
                  const pct = totalEncounters > 0
                    ? ((m.encounterCount / totalEncounters) * 100).toFixed(1)
                    : '0';
                  return (
                    <TableRow key={idx} className="border-gray-700 hover:bg-gray-800/40">
                      <TableCell className="font-mono text-gray-400 text-xs">{m.mdcCategory}</TableCell>
                      <TableCell className="text-gray-200 text-sm">
                        {mdcDescriptions[m.mdcCategory] ?? `Categoria ${m.mdcCategory}`}
                      </TableCell>
                      <TableCell className="text-white text-right">{m.encounterCount}</TableCell>
                      <TableCell className="text-blue-400 text-right">{m.averageLos}d</TableCell>
                      <TableCell className="text-amber-400 text-right">{fmt(m.averageCost)}</TableCell>
                      <TableCell className="text-emerald-400 text-right font-medium">{fmt(m.totalCost)}</TableCell>
                      <TableCell className="text-gray-300 text-right">{pct}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Histórico Tab ────────────────────────────────────────────────────────────

function HistoricoTab() {
  const { data, isLoading } = useDrgAnalytics({});

  const mix = data?.drgMix ?? [];

  // Revenue prediction: simple linear extrapolation
  const avgCostPerEncounter =
    mix.length > 0 && data!.totalEncounters > 0
      ? mix.reduce((s, m) => s + m.totalCost, 0) / data!.totalEncounters
      : 0;

  const projectedMonthly = avgCostPerEncounter * (data?.totalEncounters ?? 0) * 1.05;

  return (
    <div className="space-y-6">
      {/* Prediction card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-gray-400">Projeção de Receita (próx. período)</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{fmt(projectedMonthly)}</p>
            <p className="text-xs text-gray-500 mt-1">Estimativa +5% vs. período atual</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-gray-400">Custo Médio / Atendimento</p>
            </div>
            <p className="text-2xl font-bold text-blue-400">{fmt(avgCostPerEncounter)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Baseado em {data?.totalEncounters ?? 0} atendimentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization suggestions */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Oportunidades de Otimização do Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 text-sm">Carregando análise...</p>
          ) : mix.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados suficientes para análise.</p>
          ) : (
            <div className="space-y-3">
              {/* Top 3 by average cost as high-value targets */}
              {[...mix]
                .sort((a, b) => b.averageCost - a.averageCost)
                .slice(0, 3)
                .map((m, idx) => {
                  const mdcDescriptions: Record<string, string> = {
                    '01': 'Sistema Nervoso', '04': 'Resp. Respiratório',
                    '05': 'Ap. Circulatório', '06': 'Ap. Digestivo',
                    '17': 'Neoplasias', '18': 'Infectoparasitárias',
                    '21': 'Traumatismos',
                  };
                  const label = mdcDescriptions[m.mdcCategory] ?? `Categoria ${m.mdcCategory}`;
                  return (
                    <div key={idx} className="flex items-start gap-3 rounded-lg bg-gray-800 p-3">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx] }}
                      />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {m.encounterCount} atendimentos · Custo médio {fmt(m.averageCost)} · DIH {m.averageLos}d
                        </p>
                      </div>
                      <Badge className="bg-amber-900 text-amber-300 text-xs">Alto valor</Badge>
                    </div>
                  );
                })}
              <p className="text-xs text-gray-500 pt-1">
                Categorias com maior custo médio representam as maiores oportunidades de otimização de
                protocolos assistenciais e negociação de contratos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DrgPage() {
  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-900/30">
          <Layers className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">DRG / Grupos Diagnósticos</h1>
          <p className="text-sm text-gray-400">
            Classificação DRG brasileira, análise de mix diagnóstico e projeção de receita
          </p>
        </div>
      </div>

      <Tabs defaultValue="calculate" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="calculate" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-gray-400">
            <Calculator className="w-4 h-4 mr-1.5" />
            Cálculo DRG
          </TabsTrigger>
          <TabsTrigger value="mix" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-gray-400">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Análise de Mix
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-gray-400">
            <Calendar className="w-4 h-4 mr-1.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculate">
          <DrgCalculationTab />
        </TabsContent>
        <TabsContent value="mix">
          <MixAnalysisTab />
        </TabsContent>
        <TabsContent value="historico">
          <HistoricoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
