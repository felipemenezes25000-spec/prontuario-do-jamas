import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Send,
  BrainCircuit,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useFinancialDashboard,
  usePreBillingAudit,
  useTissBatches,
  useSendTissBatch,
  useGlosaPredictions,
  useRevenueLeakage,
  type RevenueExpenseCard,
  type FinancialFilters,
  type SendTissBatchPayload,
} from '@/services/billing-financial.service';

// ─── helpers ───────────────────────────────────────────────────────────────

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function TrendIcon({ trend }: { trend: RevenueExpenseCard['trend'] }) {
  if (trend === 'UP') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'DOWN') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

// ─── KPI Cards ─────────────────────────────────────────────────────────────

function KPICard({ card }: { card: RevenueExpenseCard }) {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="pt-5">
        <p className="text-sm text-gray-400 mb-1">{card.label}</p>
        <p className="text-2xl font-bold text-white">{fmt(card.value)}</p>
        <div className="flex items-center gap-1 mt-2">
          <TrendIcon trend={card.trend} />
          <span
            className={cn(
              'text-sm',
              card.trend === 'UP' ? 'text-emerald-400' : card.trend === 'DOWN' ? 'text-red-400' : 'text-gray-400',
            )}
          >
            {card.trendPercent > 0 ? '+' : ''}
            {card.trendPercent.toFixed(1)}% vs. mês anterior
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Glosa Rate Card ────────────────────────────────────────────────────────

function GlosaCard({ glosaRate }: { glosaRate: NonNullable<ReturnType<typeof useFinancialDashboard>['data']>['glosaRate'] }) {
  if (!glosaRate) return null;
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Taxa de Glosa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 mb-4">
          <span className="text-5xl font-bold text-yellow-400">{glosaRate.rate.toFixed(1)}%</span>
          <div className="flex items-center gap-1 mb-1">
            {glosaRate.trend === 'UP' && <TrendingUp className="w-4 h-4 text-red-400" />}
            {glosaRate.trend === 'DOWN' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
            {glosaRate.trend === 'STABLE' && <Minus className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Total Glosado</p>
            <p className="text-white font-semibold">{fmt(glosaRate.totalGlosas)}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Faturado</p>
            <p className="text-white font-semibold">{fmt(glosaRate.totalBilled)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pre-Billing Audit ──────────────────────────────────────────────────────

function PreBillingAuditSection() {
  const [enabled, setEnabled] = useState(false);
  const { data, isFetching } = usePreBillingAudit(enabled);

  const severityColor: Record<string, string> = {
    HIGH: 'bg-red-900/40 text-red-300 border-red-700',
    MEDIUM: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    LOW: 'bg-gray-800 text-gray-300 border-gray-600',
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Auditoria Pré-Faturamento
        </CardTitle>
        <button
          className="flex items-center gap-2 text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md disabled:opacity-60"
          onClick={() => setEnabled(true)}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Executar Auditoria
        </button>
      </CardHeader>
      <CardContent>
        {!data && !isFetching && (
          <p className="text-gray-400 text-center py-8 text-sm">
            Clique em "Executar Auditoria" para verificar inconsistências antes do faturamento.
          </p>
        )}
        {data && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm mb-3">
              <span className="text-gray-400">Atendimentos verificados: <span className="text-white font-semibold">{data.totalEncounters}</span></span>
              <span className="text-gray-400">Pendências: <span className={cn('font-semibold', data.issuesFound > 0 ? 'text-red-400' : 'text-emerald-400')}>{data.issuesFound}</span></span>
            </div>
            {data.items.length === 0 ? (
              <p className="text-emerald-400 text-sm">Nenhuma pendência encontrada. Pronto para faturar.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Paciente</TableHead>
                    <TableHead className="text-gray-400">MRN</TableHead>
                    <TableHead className="text-gray-400">Pendência</TableHead>
                    <TableHead className="text-gray-400">Severidade</TableHead>
                    <TableHead className="text-gray-400">Ação Sugerida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.encounterId} className="border-gray-700">
                      <TableCell className="text-white text-sm">{item.patientName}</TableCell>
                      <TableCell className="text-gray-300 font-mono text-xs">{item.mrn}</TableCell>
                      <TableCell className="text-gray-300 text-sm">{item.issue}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs border', severityColor[item.severity] ?? severityColor.LOW)}>
                          {item.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{item.suggestedAction}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── TISS Batch ──────────────────────────────────────────────────────────────

function TissBatchSection() {
  const { data: batches = [], isFetching } = useTissBatches();
  const sendBatch = useSendTissBatch();
  const [form, setForm] = useState<SendTissBatchPayload>({
    insurerCode: '',
    periodStart: '',
    periodEnd: '',
  });

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendente', SENT: 'Enviado', ACCEPTED: 'Aceito', REJECTED: 'Rejeitado', PARTIAL: 'Parcial',
  };
  const statusColor: Record<string, string> = {
    PENDING: 'bg-gray-700',
    SENT: 'bg-blue-800',
    ACCEPTED: 'bg-emerald-800',
    REJECTED: 'bg-red-800',
    PARTIAL: 'bg-yellow-800',
  };

  function handleSend() {
    if (!form.insurerCode || !form.periodStart || !form.periodEnd) {
      toast.warning('Preencha operadora, período de início e fim.');
      return;
    }
    sendBatch.mutate(form, {
      onSuccess: (b) => toast.success(`Lote ${b.batchId.slice(0, 8)}... enviado para ${b.insurer}.`),
      onError: () => toast.error('Erro ao enviar lote TISS.'),
    });
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-400" />
          Envio de Lotes TISS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-gray-400 text-xs">Código Operadora</Label>
            <Input
              className="bg-gray-800 border-gray-700 text-white mt-1"
              placeholder="000000"
              value={form.insurerCode}
              onChange={(e) => setForm((f) => ({ ...f, insurerCode: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs">Período Início</Label>
            <Input
              type="date"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs">Período Fim</Label>
            <Input
              type="date"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <button
              className="w-full flex items-center justify-center gap-2 text-sm bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded-md disabled:opacity-60"
              onClick={handleSend}
              disabled={sendBatch.isPending}
            >
              {sendBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Lote
            </button>
          </div>
        </div>

        {isFetching ? (
          <p className="text-gray-400 text-sm">Carregando lotes...</p>
        ) : batches.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum lote enviado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-400">Lote ID</TableHead>
                <TableHead className="text-gray-400">Operadora</TableHead>
                <TableHead className="text-gray-400">Guias</TableHead>
                <TableHead className="text-gray-400">Valor</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.batchId} className="border-gray-700">
                  <TableCell className="text-gray-300 font-mono text-xs">{b.batchId.slice(0, 12)}...</TableCell>
                  <TableCell className="text-white text-sm">{b.insurer}</TableCell>
                  <TableCell className="text-gray-300">{b.totalClaims}</TableCell>
                  <TableCell className="text-gray-300">{fmt(b.totalValue)}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs text-white', statusColor[b.status] ?? 'bg-gray-700')}>
                      {statusLabel[b.status] ?? b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 text-xs">
                    {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── IA: Glosa Prediction + Revenue Leakage ──────────────────────────────────

function AiInsightsSection() {
  const [glosaEnabled, setGlosaEnabled] = useState(false);
  const [leakageEnabled, setLeakageEnabled] = useState(false);
  const { data: glosaPreds = [], isFetching: gFetching } = useGlosaPredictions(glosaEnabled);
  const { data: leakage, isFetching: lFetching } = useRevenueLeakage(leakageEnabled);

  const riskColor: Record<string, string> = {
    HIGH: 'bg-red-900/40 text-red-300 border-red-700',
    MEDIUM: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    LOW: 'bg-gray-800 text-gray-300 border-gray-600',
  };

  return (
    <div className="space-y-4">
      {/* Glosa Prediction */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            IA: Predição de Glosa
          </CardTitle>
          <button
            className="flex items-center gap-2 text-sm bg-purple-800 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md disabled:opacity-60"
            onClick={() => setGlosaEnabled(true)}
            disabled={gFetching}
          >
            {gFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            Analisar
          </button>
        </CardHeader>
        <CardContent>
          {!glosaEnabled && (
            <p className="text-gray-400 text-sm text-center py-6">
              Clique em "Analisar" para que a IA identifique atendimentos com risco de glosa.
            </p>
          )}
          {glosaEnabled && glosaPreds.length === 0 && !gFetching && (
            <p className="text-emerald-400 text-sm text-center py-6">Nenhum risco de glosa detectado. </p>
          )}
          {glosaPreds.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Paciente</TableHead>
                  <TableHead className="text-gray-400">Procedimento</TableHead>
                  <TableHead className="text-gray-400">Valor</TableHead>
                  <TableHead className="text-gray-400">Risco</TableHead>
                  <TableHead className="text-gray-400">Motivo</TableHead>
                  <TableHead className="text-gray-400">Recomendação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glosaPreds.map((p) => (
                  <TableRow key={p.encounterId} className="border-gray-700">
                    <TableCell className="text-white text-sm">{p.patientName}</TableCell>
                    <TableCell className="text-gray-300 text-sm">{p.procedure}</TableCell>
                    <TableCell className="text-gray-300">{fmt(p.billedValue)}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border', riskColor[p.glosaRisk] ?? riskColor.LOW)}>
                        {p.glosaRisk} ({(p.riskScore * 100).toFixed(0)}%)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs max-w-32 truncate">{p.reason}</TableCell>
                    <TableCell className="text-gray-400 text-xs max-w-40 truncate">{p.recommendation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revenue Leakage */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-orange-400" />
            IA: Revenue Leakage
          </CardTitle>
          <button
            className="flex items-center gap-2 text-sm bg-orange-800 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md disabled:opacity-60"
            onClick={() => setLeakageEnabled(true)}
            disabled={lFetching}
          >
            {lFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            Detectar Perdas
          </button>
        </CardHeader>
        <CardContent>
          {!leakageEnabled && (
            <p className="text-gray-400 text-sm text-center py-6">
              Clique em "Detectar Perdas" para identificar receitas não capturadas.
            </p>
          )}
          {leakage && (
            <div className="space-y-3">
              <div className="p-3 bg-orange-900/20 border border-orange-800 rounded-lg">
                <p className="text-orange-300 font-semibold">
                  Perda estimada total: {fmt(leakage.totalEstimatedLoss)}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">Período: {leakage.analysedPeriod}</p>
              </div>
              {leakage.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn(
                        'text-xs',
                        item.severity === 'CRITICAL' ? 'bg-red-800' :
                        item.severity === 'HIGH' ? 'bg-orange-800' : 'bg-yellow-800',
                      )}>
                        {item.severity}
                      </Badge>
                      <span className="text-white text-sm font-medium">{item.category}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{item.description}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.occurrences} ocorrências</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-orange-300 font-semibold">{fmt(item.estimatedLoss)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FinancialPage() {
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState<FinancialFilters>({});
  const { data, isLoading } = useFinancialDashboard(filters);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-gray-400">Carregando dashboard financeiro…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Financeiro</h1>
            <p className="text-sm text-gray-400">Visão executiva de receitas, despesas e glosas</p>
          </div>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-3">
          <div>
            <Label className="text-gray-400 text-xs">De</Label>
            <Input
              type="date"
              className="bg-gray-800 border-gray-700 text-white h-8 mt-0.5"
              value={filters.startDate ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs">Até</Label>
            <Input
              type="date"
              className="bg-gray-800 border-gray-700 text-white h-8 mt-0.5"
              value={filters.endDate ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value || undefined }))}
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      {data?.cards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.cards.map((card) => (
            <KPICard key={card.label} card={card} />
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700 text-gray-300">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-gray-700 text-gray-300">
            Receita vs Despesa
          </TabsTrigger>
          <TabsTrigger value="glosa" className="data-[state=active]:bg-gray-700 text-gray-300">
            Glosa Rate
          </TabsTrigger>
          <TabsTrigger value="forecast" className="data-[state=active]:bg-gray-700 text-gray-300">
            Previsão
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-gray-700 text-gray-300">
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="tiss" className="data-[state=active]:bg-gray-700 text-gray-300">
            Lotes TISS
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-gray-700 text-gray-300">
            IA Insights
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data?.glosaRate && <GlosaCard glosaRate={data.glosaRate} />}

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Aging — Contas a Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.aging && data.aging.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Faixa</TableHead>
                        <TableHead className="text-gray-400">Valor</TableHead>
                        <TableHead className="text-gray-400">Qtd</TableHead>
                        <TableHead className="text-gray-400">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.aging.map((bucket) => (
                        <TableRow key={bucket.range} className="border-gray-700">
                          <TableCell className="text-white">{bucket.range}</TableCell>
                          <TableCell className="text-gray-300">{fmt(bucket.amount)}</TableCell>
                          <TableCell className="text-gray-300">{bucket.count}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'text-xs border',
                                bucket.percentage > 30
                                  ? 'bg-red-900/40 text-red-300 border-red-700'
                                  : 'bg-gray-800 text-gray-300 border-gray-600',
                              )}
                            >
                              {bucket.percentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-400 text-center py-6">Sem dados de aging.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Receita vs Despesa */}
        <TabsContent value="revenue">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Fluxo de Caixa Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.cashFlow && data.cashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.cashFlow} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                      labelStyle={{ color: '#f9fafb' }}
                      formatter={(value: number) => fmt(value)}
                    />
                    <Legend wrapperStyle={{ color: '#9ca3af' }} />
                    <Bar dataKey="inflow" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflow" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-12">Sem dados de fluxo de caixa.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {(['marginByProcedure', 'marginBySector'] as const).map((key) => (
              <Card key={key} className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">
                    {key === 'marginByProcedure' ? 'Margem por Procedimento' : 'Margem por Setor'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.[key] && data[key].length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-400">Nome</TableHead>
                          <TableHead className="text-gray-400">Receita</TableHead>
                          <TableHead className="text-gray-400">Margem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data[key].map((item) => (
                          <TableRow key={item.name} className="border-gray-700">
                            <TableCell className="text-white text-sm">{item.name}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{fmt(item.revenue)}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'text-xs border',
                                  item.marginPercent >= 20
                                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                                    : item.marginPercent >= 10
                                      ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700'
                                      : 'bg-red-900/40 text-red-300 border-red-700',
                                )}
                              >
                                {item.marginPercent.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-400 text-center py-6">Sem dados.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Glosa Rate */}
        <TabsContent value="glosa">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data?.glosaRate && <GlosaCard glosaRate={data.glosaRate} />}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Distribuição por Operadora</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm text-center py-12">
                  Dados detalhados por operadora disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Previsão */}
        <TabsContent value="forecast">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Previsão de Fluxo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.cashFlow && data.cashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.cashFlow} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                      formatter={(value: number) => fmt(value)}
                    />
                    <Legend wrapperStyle={{ color: '#9ca3af' }} />
                    <Line type="monotone" dataKey="balance" name="Saldo" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                    <Line type="monotone" dataKey="inflow" name="Receita" stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-12">Sem dados de previsão.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auditoria Pré-Faturamento */}
        <TabsContent value="audit">
          <PreBillingAuditSection />
        </TabsContent>

        {/* Lotes TISS */}
        <TabsContent value="tiss">
          <TissBatchSection />
        </TabsContent>

        {/* IA Insights */}
        <TabsContent value="ai">
          <AiInsightsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
