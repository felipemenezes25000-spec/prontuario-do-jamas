import { useState, useMemo, useCallback } from 'react';
import {
  Receipt,
  TrendingDown,
  CheckCircle2,
  Percent,
  Plus,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  FileDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  Shield,
  Building2,
  Users,
  Search,
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
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useBillingEntries,
  useBillingDashboard,
  type BillingFilters,
} from '@/services/billing.service';
import {
  useBillingAppeals,
  useCreateAppeal,
  useUpdateAppealStatus,
  useGenerateAIJustification,
  useValidateTissXml,
} from '@/services/appeals.service';
import type { BillingStatus, BillingEntry, AppealStatus, BillingDashboardData } from '@/types';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { PageEmpty } from '@/components/common/page-empty';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 10;

const billingStatusConfig: Record<
  BillingStatus,
  { label: string; badgeClass: string }
> = {
  PENDING: { label: 'Rascunho', badgeClass: 'bg-zinc-500 text-white' },
  SUBMITTED: { label: 'Enviado', badgeClass: 'bg-blue-600 text-white' },
  APPROVED: { label: 'Aprovado', badgeClass: 'bg-green-600 text-white' },
  PARTIALLY_APPROVED: {
    label: 'Parcialmente Aprovado',
    badgeClass: 'bg-yellow-600 text-white',
  },
  DENIED: { label: 'Glosado', badgeClass: 'bg-red-600 text-white' },
  APPEALED: { label: 'Em Recurso', badgeClass: 'bg-orange-600 text-white' },
  PAID: { label: 'Pago', badgeClass: 'bg-teal-600 text-white' },
};

const appealStatusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-zinc-500' },
  SUBMITTED: { label: 'Enviado', color: 'bg-blue-600' },
  IN_REVIEW: { label: 'Em Analise', color: 'bg-yellow-600' },
  ACCEPTED: { label: 'Aceito', color: 'bg-green-600' },
  PARTIALLY_ACCEPTED: {
    label: 'Parcialmente Aceito',
    color: 'bg-orange-600',
  },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-600' },
  ESCALATED: { label: 'Escalado', color: 'bg-purple-600' },
};

const BILLING_STATUS_OPTIONS: { value: BillingStatus; label: string }[] = [
  { value: 'PENDING', label: 'Rascunho' },
  { value: 'SUBMITTED', label: 'Enviado' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'PARTIALLY_APPROVED', label: 'Parcialmente Aprovado' },
  { value: 'DENIED', label: 'Glosado' },
  { value: 'APPEALED', label: 'Em Recurso' },
  { value: 'PAID', label: 'Pago' },
];

const INSURANCE_PROVIDERS = [
  'Unimed',
  'Bradesco Saude',
  'SulAmerica',
  'Amil',
  'NotreDame Intermedica',
  'Hapvida',
  'Porto Seguro',
  'Cassi',
  'Particular',
];

const BAR_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('pt-BR');

// ============================================================================
// Mock dashboard data (used as fallback when API endpoint is not yet ready)
// ============================================================================

function buildMockDashboard(entries: BillingEntry[]): BillingDashboardData {
  const totalBilled = entries.reduce((s, e) => s + (e.totalAmount ?? 0), 0);
  const totalGlosed = entries.reduce((s, e) => s + (e.glosedAmount ?? 0), 0);
  const totalApproved = entries.reduce((s, e) => s + (e.approvedAmount ?? 0), 0);

  // Revenue by insurance
  const byInsurance = new Map<string, number>();
  for (const e of entries) {
    const ins = e.insuranceProvider ?? 'Particular';
    byInsurance.set(ins, (byInsurance.get(ins) ?? 0) + (e.totalAmount ?? 0));
  }
  const revenueByInsurance = Array.from(byInsurance.entries())
    .map(([insurance, value]) => ({ insurance, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly billing vs glosa (last 6 months mock)
  const monthlyBillingVsGlosa = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const factor = 0.7 + Math.random() * 0.6;
    return {
      month,
      billed: Math.round(totalBilled * factor / 6),
      glosa: Math.round(totalGlosed * factor / 6),
    };
  });

  // Top procedures (simulated)
  const topProcedures = [
    { procedure: 'Consulta Eletiva', value: totalBilled * 0.22 },
    { procedure: 'Hemograma Completo', value: totalBilled * 0.15 },
    { procedure: 'Ultrassonografia', value: totalBilled * 0.12 },
    { procedure: 'Radiografia', value: totalBilled * 0.1 },
    { procedure: 'Eletrocardiograma', value: totalBilled * 0.08 },
    { procedure: 'Tomografia', value: totalBilled * 0.07 },
    { procedure: 'Ressonancia Magnetica', value: totalBilled * 0.06 },
    { procedure: 'Endoscopia', value: totalBilled * 0.05 },
    { procedure: 'Colonoscopia', value: totalBilled * 0.04 },
    { procedure: 'Cirurgia Geral', value: totalBilled * 0.03 },
  ];

  // Production by doctor (simulated)
  const productionByDoctor = [
    { doctorId: '1', doctorName: 'Dr. Silva', encounters: 120, procedures: 180, totalValue: totalBilled * 0.25 },
    { doctorId: '2', doctorName: 'Dra. Santos', encounters: 95, procedures: 140, totalValue: totalBilled * 0.2 },
    { doctorId: '3', doctorName: 'Dr. Oliveira', encounters: 80, procedures: 110, totalValue: totalBilled * 0.18 },
    { doctorId: '4', doctorName: 'Dra. Costa', encounters: 70, procedures: 90, totalValue: totalBilled * 0.15 },
    { doctorId: '5', doctorName: 'Dr. Pereira', encounters: 60, procedures: 75, totalValue: totalBilled * 0.12 },
  ];

  return {
    totalRevenueMonth: totalApproved,
    totalBilled,
    totalGlosed,
    glosaRate: totalBilled > 0 ? (totalGlosed / totalBilled) * 100 : 0,
    avgReceiveDays: 32,
    revenueByInsurance,
    monthlyBillingVsGlosa,
    topProcedures,
    productionByDoctor,
  };
}

// ============================================================================
// Main Page
// ============================================================================

export default function BillingPage() {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo<BillingFilters>(() => {
    const f: BillingFilters = { page, limit: PAGE_SIZE };
    if (statusFilter !== 'ALL') f.status = statusFilter as BillingStatus;
    if (insuranceFilter !== 'ALL') f.insuranceProvider = insuranceFilter;
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    return f;
  }, [statusFilter, insuranceFilter, startDate, endDate, page]);

  const { data: billingData, isLoading, isError, refetch } = useBillingEntries(filters);
  const allBilling = useMemo(() => billingData?.data ?? [], [billingData]);
  const totalItems = billingData?.total ?? 0;
  const totalPages = billingData?.totalPages ?? 1;

  // Dashboard data — use API with fallback to client-side calculation
  const { data: dashboardApi } = useBillingDashboard({ startDate, endDate });
  const dashboardData = useMemo<BillingDashboardData | null>(() => {
    if (dashboardApi) return dashboardApi;
    if (allBilling.length > 0) return buildMockDashboard(allBilling);
    return null;
  }, [dashboardApi, allBilling]);

  // KPI calculations from the current page of results
  const { totalBilled, totalApproved, totalGlosed, approvalRate } = useMemo(() => {
    const billed = allBilling.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
    const approved = allBilling.reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0);
    const glosed = allBilling.reduce((sum, b) => sum + (b.glosedAmount ?? 0), 0);
    const rate = billed > 0 ? (approved / billed) * 100 : 0;
    return {
      totalBilled: billed,
      totalApproved: approved,
      totalGlosed: glosed,
      approvalRate: rate,
    };
  }, [allBilling]);

  const detail = selectedEntry
    ? allBilling.find((b) => b.id === selectedEntry) ?? null
    : null;

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleInsuranceFilterChange = useCallback((value: string) => {
    setInsuranceFilter(value);
    setPage(1);
  }, []);

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStartDate(e.target.value);
      setPage(1);
    },
    [],
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEndDate(e.target.value);
      setPage(1);
    },
    [],
  );

  const handleDownloadTissPdf = useCallback((id: string) => {
    window.open(`/api/v1/billing/${id}/tiss-pdf`, '_blank');
  }, []);

  const kpis = [
    {
      label: 'Total Faturado',
      value: formatCurrency(totalBilled),
      icon: Receipt,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-500/10',
    },
    {
      label: 'Total Aprovado',
      value: formatCurrency(totalApproved),
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Glosado',
      value: formatCurrency(totalGlosed),
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Taxa de Aprovacao',
      value: `${approvalRate.toFixed(1)}%`,
      icon: Percent,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    kpi.bgColor,
                  )}
                >
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="entries">Lancamentos</TabsTrigger>
          <TabsTrigger value="appeals">Recursos de Glosa</TabsTrigger>
          <TabsTrigger value="sus">SUS</TabsTrigger>
          <TabsTrigger value="production">Producao Medica</TabsTrigger>
          <TabsTrigger value="tiss">Validacao TISS</TabsTrigger>
        </TabsList>

        {/* ====== Dashboard Tab ====== */}
        <TabsContent value="dashboard">
          <DashboardTab data={dashboardData} />
        </TabsContent>

        {/* ====== Billing Entries Tab ====== */}
        <TabsContent value="entries">
          {/* Filters */}
          <Card className="border-border bg-card mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* Status filter */}
                <div className="w-48">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusFilterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      {BILLING_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Insurance provider filter */}
                <div className="w-52">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Convenio
                  </Label>
                  <Select
                    value={insuranceFilter}
                    onValueChange={handleInsuranceFilterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      {INSURANCE_PROVIDERS.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="w-40">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Data inicio
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="h-10"
                  />
                </div>
                <div className="w-40">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Data fim
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {allBilling.length === 0 ? (
            <PageEmpty
              title="Nenhum lancamento encontrado"
              description="Altere os filtros ou crie um novo lancamento de faturamento."
            />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Paciente</TableHead>
                      <TableHead className="text-xs">Convenio</TableHead>
                      <TableHead className="text-xs text-right">
                        Valor Total
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        Valor Aprovado
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        Glosa
                      </TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allBilling.map((entry) => (
                      <BillingTableRow
                        key={entry.id}
                        entry={entry}
                        onView={setSelectedEntry}
                        onDownloadPdf={handleDownloadTissPdf}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {allBilling.length} de {totalItems} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Anterior</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Pagina {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Proximo</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ====== Appeals Tab ====== */}
        <TabsContent value="appeals">
          <AppealsTab />
        </TabsContent>

        {/* ====== SUS Tab ====== */}
        <TabsContent value="sus">
          <SusTab />
        </TabsContent>

        {/* ====== Production Tab ====== */}
        <TabsContent value="production">
          <ProductionTab data={dashboardData} />
        </TabsContent>

        {/* ====== TISS Validation Tab ====== */}
        <TabsContent value="tiss">
          <TissValidationTab />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <BillingDetailDialog
        entry={detail}
        open={!!selectedEntry}
        onOpenChange={() => setSelectedEntry(null)}
        onDownloadPdf={handleDownloadTissPdf}
      />
    </div>
  );
}

// ============================================================================
// Dashboard Tab
// ============================================================================

function DashboardTab({ data }: { data: BillingDashboardData | null }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center py-12">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Sem dados para exibir no dashboard</p>
      </div>
    );
  }

  const dashKpis = [
    {
      label: 'Receita do Mes',
      value: formatCurrency(data.totalRevenueMonth),
      icon: Receipt,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Faturado',
      value: formatCurrency(data.totalBilled),
      icon: BarChart3,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Glosado',
      value: formatCurrency(data.totalGlosed),
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Taxa de Glosa',
      value: `${data.glosaRate.toFixed(1)}%`,
      icon: Percent,
      color: data.glosaRate > 10 ? 'text-red-400' : 'text-emerald-400',
      bgColor: data.glosaRate > 10 ? 'bg-red-500/10' : 'bg-emerald-500/10',
    },
    {
      label: 'Tempo Medio Recebimento',
      value: `${data.avgReceiveDays} dias`,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Dashboard KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {dashKpis.map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-lg font-bold">{kpi.value}</p>
                </div>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', kpi.bgColor)}>
                  <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Insurance */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receita por Convenio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.revenueByInsurance} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="insurance" tick={{ fontSize: 9 }} width={110} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Bar dataKey="value" name="Receita" radius={[0, 4, 4, 0]}>
                  {data.revenueByInsurance.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Billing vs Glosa */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolucao Mensal: Faturamento vs Glosa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthlyBillingVsGlosa}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Line type="monotone" dataKey="billed" stroke="#10b981" name="Faturado" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="glosa" stroke="#ef4444" name="Glosado" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Procedures */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 10 Procedimentos por Valor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProcedures} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="procedure" tick={{ fontSize: 9 }} width={160} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
              />
              <Bar dataKey="value" name="Valor" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Billing Table Row
// ============================================================================

function BillingTableRow({
  entry,
  onView,
  onDownloadPdf,
}: {
  entry: BillingEntry;
  onView: (id: string) => void;
  onDownloadPdf: (id: string) => void;
}) {
  const statusCfg = billingStatusConfig[entry.status];

  return (
    <TableRow className="cursor-pointer transition-colors hover:bg-accent/30">
      <TableCell className="text-sm font-mono text-xs">
        {entry.patientId.slice(0, 8)}...
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {entry.insuranceProvider ?? 'Particular'}
      </TableCell>
      <TableCell className="text-sm font-medium text-right">
        {formatCurrency(entry.totalAmount ?? 0)}
      </TableCell>
      <TableCell className="text-sm text-right text-green-400">
        {entry.approvedAmount != null
          ? formatCurrency(entry.approvedAmount)
          : '\u2014'}
      </TableCell>
      <TableCell className="text-sm text-right text-red-400">
        {entry.glosedAmount != null
          ? formatCurrency(entry.glosedAmount)
          : '\u2014'}
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={cn('text-[10px]', statusCfg?.badgeClass)}
        >
          {statusCfg?.label ?? entry.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(entry.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(entry.id)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownloadPdf(entry.id)}
            title="Baixar PDF TISS"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// Detail Dialog (with Eligibility & Prior Authorization)
// ============================================================================

function BillingDetailDialog({
  entry,
  open,
  onOpenChange,
  onDownloadPdf,
}: {
  entry: BillingEntry | null;
  open: boolean;
  onOpenChange: () => void;
  onDownloadPdf: (id: string) => void;
}) {
  const [eligibilityStatus, setEligibilityStatus] = useState<'idle' | 'checking' | 'eligible' | 'ineligible'>('idle');
  const [eligibilityReason, setEligibilityReason] = useState('');

  const handleCheckEligibility = useCallback(() => {
    setEligibilityStatus('checking');
    // Simulate eligibility check
    setTimeout(() => {
      const isEligible = Math.random() > 0.2;
      setEligibilityStatus(isEligible ? 'eligible' : 'ineligible');
      setEligibilityReason(
        isEligible
          ? 'Carteirinha ativa, plano vigente, procedimento coberto.'
          : 'Carteirinha vencida. Solicitar atualizacao ao beneficiario.',
      );
    }, 1500);
  }, []);

  if (!entry) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border" />
      </Dialog>
    );
  }

  const statusCfg = billingStatusConfig[entry.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Lancamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p>{formatDate(entry.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Convenio</p>
              <p>{entry.insuranceProvider ?? 'Particular'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guia TISS</p>
              <p className="font-mono text-xs">
                {entry.guideNumber ?? '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p>{entry.guideType ?? '\u2014'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm text-muted-foreground">Valor Total</span>
            <span className="text-lg font-bold">
              {formatCurrency(entry.totalAmount ?? 0)}
            </span>
          </div>

          {(entry.approvedAmount != null || entry.glosedAmount != null) && (
            <div className="grid gap-3 grid-cols-2">
              {entry.approvedAmount != null && (
                <div className="flex items-center justify-between rounded-lg border border-green-500/20 p-2">
                  <span className="text-xs text-muted-foreground">
                    Aprovado
                  </span>
                  <span className="text-sm font-medium text-green-400">
                    {formatCurrency(entry.approvedAmount)}
                  </span>
                </div>
              )}
              {entry.glosedAmount != null && (
                <div className="flex items-center justify-between rounded-lg border border-red-500/20 p-2">
                  <span className="text-xs text-muted-foreground">
                    Glosado
                  </span>
                  <span className="text-sm font-medium text-red-400">
                    {formatCurrency(entry.glosedAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              variant="secondary"
              className={cn('text-xs', statusCfg?.badgeClass)}
            >
              {statusCfg?.label ?? entry.status}
            </Badge>
          </div>

          {entry.submittedAt && (
            <div className="text-xs text-muted-foreground">
              Enviado em: {formatDate(entry.submittedAt)}
            </div>
          )}

          {/* Eligibility Check */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Verificacao de Elegibilidade
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCheckEligibility}
                disabled={eligibilityStatus === 'checking'}
              >
                {eligibilityStatus === 'checking' ? (
                  'Verificando...'
                ) : (
                  <>
                    <Search className="h-3 w-3 mr-1" /> Verificar
                  </>
                )}
              </Button>
            </div>
            {eligibilityStatus !== 'idle' && eligibilityStatus !== 'checking' && (
              <div className={cn(
                'flex items-start gap-2 rounded p-2 text-xs',
                eligibilityStatus === 'eligible'
                  ? 'border border-green-500/20 bg-green-500/5'
                  : 'border border-red-500/20 bg-red-500/5',
              )}>
                {eligibilityStatus === 'eligible' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {eligibilityStatus === 'eligible' ? 'Elegivel' : 'Inelegivel'}
                  </p>
                  <p className="text-muted-foreground">{eligibilityReason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Prior Authorization */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-medium flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5" /> Autorizacao Previa
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">N. Autorizacao</Label>
                <Input className="h-7 text-xs" placeholder="0000000000" />
              </div>
              <div>
                <Label className="text-[10px]">Data Autorizacao</Label>
                <Input type="date" className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Validade</Label>
                <Input type="date" className="h-7 text-xs" />
              </div>
              <div className="flex items-end">
                <Badge variant="secondary" className="text-[10px] bg-yellow-600 text-white">
                  Pendente Autorizacao
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadPdf(entry.id)}
              className="gap-1.5"
            >
              <FileDown className="h-4 w-4" />
              Baixar PDF TISS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Appeals Tab Component
// ============================================================================

function AppealsTab() {
  const [statusFilter, setStatusFilter] = useState<AppealStatus | 'ALL'>(
    'ALL',
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const filters =
    statusFilter !== 'ALL'
      ? { status: statusFilter as AppealStatus }
      : undefined;
  const { data: appealsData, isLoading } = useBillingAppeals(filters);
  const appeals = appealsData?.data ?? [];

  const createAppeal = useCreateAppeal();
  const updateStatus = useUpdateAppealStatus();
  const generateAI = useGenerateAIJustification();

  const handleCreateAppeal = (formData: {
    billingEntryId: string;
    glosedItemCodes: string;
    glosedAmount: string;
    appealedAmount: string;
    justification: string;
  }) => {
    createAppeal.mutate(
      {
        billingEntryId: formData.billingEntryId,
        glosedItemCodes: (formData.glosedItemCodes ?? '')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        glosedAmount: parseFloat(formData.glosedAmount),
        appealedAmount: parseFloat(formData.appealedAmount),
        justification: formData.justification,
        supportingDocs: [],
      },
      {
        onSuccess: () => setShowCreateDialog(false),
      },
    );
  };

  const handleGenerateAI = (appealId: string) => {
    generateAI.mutate(appealId, {
      onSuccess: (data) => {
        setAiResult(data.aiJustification);
      },
    });
  };

  const handleSubmitAppeal = (appealId: string) => {
    updateStatus.mutate({ id: appealId, status: 'SUBMITTED' });
  };

  if (isLoading) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AppealStatus | 'ALL')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="DRAFT">Rascunho</SelectItem>
            <SelectItem value="SUBMITTED">Enviado</SelectItem>
            <SelectItem value="IN_REVIEW">Em Analise</SelectItem>
            <SelectItem value="ACCEPTED">Aceito</SelectItem>
            <SelectItem value="PARTIALLY_ACCEPTED">
              Parcialmente Aceito
            </SelectItem>
            <SelectItem value="REJECTED">Rejeitado</SelectItem>
            <SelectItem value="ESCALATED">Escalado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="ml-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Recurso
        </Button>
      </div>

      {/* Appeals Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Recurso</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">
                  Guia
                </TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Glosado</TableHead>
                <TableHead className="hidden text-xs text-right sm:table-cell">
                  Em Recurso
                </TableHead>
                <TableHead className="hidden text-xs text-right md:table-cell">
                  Recuperado
                </TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appeals.map((appeal) => (
                <TableRow
                  key={appeal.id}
                  className="transition-colors hover:bg-accent/30"
                >
                  <TableCell className="text-sm font-mono">
                    {appeal.appealNumber}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground font-mono sm:table-cell">
                    {appeal.billingEntry?.guideNumber ?? '\u2014'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] text-white',
                        appealStatusConfig[appeal.status]?.color,
                      )}
                    >
                      {appealStatusConfig[appeal.status]?.label ??
                        appeal.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-right text-red-400">
                    {formatCurrency(appeal.glosedAmount)}
                  </TableCell>
                  <TableCell className="hidden text-sm font-medium text-right text-blue-400 sm:table-cell">
                    {formatCurrency(appeal.appealedAmount)}
                  </TableCell>
                  <TableCell className="hidden text-sm font-medium text-right text-green-400 md:table-cell">
                    {appeal.recoveredAmount != null
                      ? formatCurrency(appeal.recoveredAmount)
                      : '\u2014'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(appeal.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {appeal.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubmitAppeal(appeal.id)}
                          disabled={updateStatus.isPending}
                          title="Enviar recurso"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateAI(appeal.id)}
                        disabled={generateAI.isPending}
                        title="Gerar justificativa com IA"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAppeal(appeal.id)}
                        title="Ver detalhes"
                      >
                        <FileCheck2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {appeals.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum recurso de glosa encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Appeal Dialog */}
      <CreateAppealDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateAppeal}
        isPending={createAppeal.isPending}
      />

      {/* Appeal Detail Dialog */}
      <AppealDetailDialog
        appealId={selectedAppeal}
        onClose={() => setSelectedAppeal(null)}
      />

      {/* AI Justification Result Dialog */}
      <Dialog open={!!aiResult} onOpenChange={() => setAiResult(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Justificativa Gerada por IA
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-sm">
            {aiResult}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Create Appeal Dialog
// ============================================================================

function CreateAppealDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    billingEntryId: string;
    glosedItemCodes: string;
    glosedAmount: string;
    appealedAmount: string;
    justification: string;
  }) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    billingEntryId: '',
    glosedItemCodes: '',
    glosedAmount: '',
    appealedAmount: '',
    justification: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Recurso de Glosa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingEntryId">ID do Lancamento</Label>
            <Input
              id="billingEntryId"
              placeholder="UUID do lancamento de faturamento"
              value={formData.billingEntryId}
              onChange={(e) => updateField('billingEntryId', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="glosedItemCodes">
              Codigos Glosados (separados por virgula)
            </Label>
            <Input
              id="glosedItemCodes"
              placeholder="10101012, 20201010"
              value={formData.glosedItemCodes}
              onChange={(e) => updateField('glosedItemCodes', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="glosedAmount">Valor Glosado (R$)</Label>
              <Input
                id="glosedAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.glosedAmount}
                onChange={(e) => updateField('glosedAmount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appealedAmount">Valor em Recurso (R$)</Label>
              <Input
                id="appealedAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.appealedAmount}
                onChange={(e) => updateField('appealedAmount', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa</Label>
            <Textarea
              id="justification"
              rows={4}
              placeholder="Descreva a justificativa clinica para o recurso..."
              value={formData.justification}
              onChange={(e) => updateField('justification', e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Recurso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Appeal Detail Dialog
// ============================================================================

function AppealDetailDialog({
  appealId,
  onClose,
}: {
  appealId: string | null;
  onClose: () => void;
}) {
  const { data: appeal } = useBillingAppeals();
  const detail = appeal?.data?.find((a) => a.id === appealId);

  return (
    <Dialog open={!!appealId} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Recurso</DialogTitle>
        </DialogHeader>
        {detail && (
          <div className="space-y-3">
            <div className="grid gap-3 grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Numero</p>
                <p className="font-mono">{detail.appealNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs text-white',
                    appealStatusConfig[detail.status]?.color,
                  )}
                >
                  {appealStatusConfig[detail.status]?.label ?? detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Guia</p>
                <p className="font-mono text-xs">
                  {detail.billingEntry?.guideNumber ?? '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p>{formatDate(detail.createdAt)}</p>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="flex flex-col items-center rounded-lg border border-red-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">
                  Glosado
                </span>
                <span className="text-sm font-medium text-red-400">
                  {formatCurrency(detail.glosedAmount)}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-blue-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">
                  Em Recurso
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {formatCurrency(detail.appealedAmount)}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-green-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">
                  Recuperado
                </span>
                <span className="text-sm font-medium text-green-400">
                  {detail.recoveredAmount != null
                    ? formatCurrency(detail.recoveredAmount)
                    : '\u2014'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Justificativa
              </p>
              <p className="text-sm rounded-lg border border-border p-3 bg-muted/30">
                {detail.justification}
              </p>
            </div>

            {detail.aiJustification && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  Justificativa IA
                </p>
                <p className="text-sm rounded-lg border border-emerald-500/20 p-3 bg-emerald-500/5 whitespace-pre-wrap">
                  {detail.aiJustification}
                </p>
              </div>
            )}

            {detail.resolution && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Resolucao</p>
                <p className="text-sm rounded-lg border border-border p-3 bg-muted/30">
                  {detail.resolution}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Codigos glosados: {(detail.glosedItemCodes ?? []).join(', ')}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUS Tab (AIH + BPA)
// ============================================================================

function SusTab() {
  const [activeForm, setActiveForm] = useState<'aih' | 'bpa' | null>(null);

  // AIH form state
  const [aihData, setAihData] = useState({
    patientName: '',
    cpf: '',
    cns: '',
    birthDate: '',
    mainProcedure: '',
    secondaryProcedures: '',
    cid10Main: '',
    cid10Secondary: '',
    admissionDate: '',
    dischargeDate: '',
    specialty: '',
    ward: '',
    dischargeType: '',
  });

  // BPA form state
  const [bpaData, setBpaData] = useState({
    competence: '',
    cnes: '',
    cbo: '',
    professionalCns: '',
    procedures: '',
    patientCns: '',
    patientName: '',
    quantity: '1',
  });

  const [preview, setPreview] = useState<string | null>(null);

  const handleAihGenerate = () => {
    const json = JSON.stringify({
      tipo: 'AIH',
      paciente: { nome: aihData.patientName, cpf: aihData.cpf, cns: aihData.cns, dataNascimento: aihData.birthDate },
      internacao: {
        procedimentoPrincipal: aihData.mainProcedure,
        procedimentosSecundarios: aihData.secondaryProcedures.split(',').map((s) => s.trim()).filter(Boolean),
        cid10Principal: aihData.cid10Main,
        cid10Secundario: aihData.cid10Secondary,
        dataAdmissao: aihData.admissionDate,
        dataAlta: aihData.dischargeDate,
        especialidade: aihData.specialty,
        enfermaria: aihData.ward,
        tipoAlta: aihData.dischargeType,
      },
    }, null, 2);
    setPreview(json);
  };

  const handleBpaGenerate = () => {
    const json = JSON.stringify({
      tipo: 'BPA',
      competencia: bpaData.competence,
      cnes: bpaData.cnes,
      profissional: { cbo: bpaData.cbo, cns: bpaData.professionalCns },
      paciente: { cns: bpaData.patientCns, nome: bpaData.patientName },
      procedimentos: bpaData.procedures.split(',').map((s) => s.trim()).filter(Boolean),
      quantidade: Number(bpaData.quantity) || 1,
    }, null, 2);
    setPreview(json);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button
          variant={activeForm === 'aih' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveForm('aih'); setPreview(null); }}
          className="gap-1.5"
        >
          <Building2 className="h-4 w-4" />
          AIH — Internacao
        </Button>
        <Button
          variant={activeForm === 'bpa' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveForm('bpa'); setPreview(null); }}
          className="gap-1.5"
        >
          <FileCheck2 className="h-4 w-4" />
          BPA — Ambulatorial
        </Button>
      </div>

      {/* AIH Form */}
      {activeForm === 'aih' && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AIH — Autorizacao de Internacao Hospitalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Paciente</Label>
                <Input className="h-8 text-xs" value={aihData.patientName}
                  onChange={(e) => setAihData((p) => ({ ...p, patientName: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CPF</Label>
                <Input className="h-8 text-xs" value={aihData.cpf} placeholder="000.000.000-00"
                  onChange={(e) => setAihData((p) => ({ ...p, cpf: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CNS (Cartao Nacional de Saude)</Label>
                <Input className="h-8 text-xs" value={aihData.cns}
                  onChange={(e) => setAihData((p) => ({ ...p, cns: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Data de Nascimento</Label>
                <Input type="date" className="h-8 text-xs" value={aihData.birthDate}
                  onChange={(e) => setAihData((p) => ({ ...p, birthDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Procedimento Principal (SIGTAP)</Label>
                <Input className="h-8 text-xs" value={aihData.mainProcedure} placeholder="0301010072"
                  onChange={(e) => setAihData((p) => ({ ...p, mainProcedure: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Procedimentos Secundarios (separados por virgula)</Label>
                <Input className="h-8 text-xs" value={aihData.secondaryProcedures}
                  onChange={(e) => setAihData((p) => ({ ...p, secondaryProcedures: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CID-10 Principal</Label>
                <Input className="h-8 text-xs" value={aihData.cid10Main} placeholder="K35.0"
                  onChange={(e) => setAihData((p) => ({ ...p, cid10Main: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CID-10 Secundario</Label>
                <Input className="h-8 text-xs" value={aihData.cid10Secondary}
                  onChange={(e) => setAihData((p) => ({ ...p, cid10Secondary: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data Admissao</Label>
                <Input type="date" className="h-8 text-xs" value={aihData.admissionDate}
                  onChange={(e) => setAihData((p) => ({ ...p, admissionDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Data Alta</Label>
                <Input type="date" className="h-8 text-xs" value={aihData.dischargeDate}
                  onChange={(e) => setAihData((p) => ({ ...p, dischargeDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Especialidade</Label>
                <Input className="h-8 text-xs" value={aihData.specialty} placeholder="Cirurgia Geral"
                  onChange={(e) => setAihData((p) => ({ ...p, specialty: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Tipo de Alta</Label>
                <Select value={aihData.dischargeType} onValueChange={(v) => setAihData((p) => ({ ...p, dischargeType: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta curado">Alta curado</SelectItem>
                    <SelectItem value="Alta melhorado">Alta melhorado</SelectItem>
                    <SelectItem value="Alta a pedido">Alta a pedido</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Obito">Obito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={handleAihGenerate}>Gerar AIH</Button>
          </CardContent>
        </Card>
      )}

      {/* BPA Form */}
      {activeForm === 'bpa' && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">BPA — Boletim de Producao Ambulatorial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Competencia (AAAAMM)</Label>
                <Input className="h-8 text-xs" value={bpaData.competence} placeholder="202603"
                  onChange={(e) => setBpaData((p) => ({ ...p, competence: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CNES</Label>
                <Input className="h-8 text-xs" value={bpaData.cnes} placeholder="0000000"
                  onChange={(e) => setBpaData((p) => ({ ...p, cnes: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CBO do Profissional</Label>
                <Input className="h-8 text-xs" value={bpaData.cbo} placeholder="225125"
                  onChange={(e) => setBpaData((p) => ({ ...p, cbo: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CNS do Profissional</Label>
                <Input className="h-8 text-xs" value={bpaData.professionalCns}
                  onChange={(e) => setBpaData((p) => ({ ...p, professionalCns: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">CNS do Paciente</Label>
                <Input className="h-8 text-xs" value={bpaData.patientCns}
                  onChange={(e) => setBpaData((p) => ({ ...p, patientCns: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Nome do Paciente</Label>
                <Input className="h-8 text-xs" value={bpaData.patientName}
                  onChange={(e) => setBpaData((p) => ({ ...p, patientName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Procedimentos SIGTAP (separados por virgula)</Label>
                <Input className="h-8 text-xs" value={bpaData.procedures} placeholder="0301010072, 0202010503"
                  onChange={(e) => setBpaData((p) => ({ ...p, procedures: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" min="1" className="h-8 text-xs" value={bpaData.quantity}
                  onChange={(e) => setBpaData((p) => ({ ...p, quantity: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={handleBpaGenerate}>Gerar BPA</Button>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview do Registro SUS</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs font-mono overflow-x-auto">
              {preview}
            </pre>
          </CardContent>
        </Card>
      )}

      {activeForm === null && (
        <div className="flex flex-col items-center py-12">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Selecione AIH ou BPA para iniciar o faturamento SUS
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Production Tab (Relatorio de Producao Medica)
// ============================================================================

function ProductionTab({ data }: { data: BillingDashboardData | null }) {
  const [periodFilter, setPeriodFilter] = useState('month');

  if (!data || data.productionByDoctor.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <Users className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Sem dados de producao medica</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Ultima Semana</SelectItem>
            <SelectItem value="month">Ultimo Mes</SelectItem>
            <SelectItem value="quarter">Ultimo Trimestre</SelectItem>
            <SelectItem value="year">Ultimo Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Producao por Medico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Medico</TableHead>
                  <TableHead className="text-xs text-right">Atendimentos</TableHead>
                  <TableHead className="text-xs text-right">Procedimentos</TableHead>
                  <TableHead className="text-xs text-right">Valor Total</TableHead>
                  <TableHead className="text-xs text-right">Media por Atend.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.productionByDoctor.map((doc) => (
                  <TableRow key={doc.doctorId}>
                    <TableCell className="text-sm font-medium">{doc.doctorName}</TableCell>
                    <TableCell className="text-sm text-right">{doc.encounters}</TableCell>
                    <TableCell className="text-sm text-right">{doc.procedures}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-emerald-400">
                      {formatCurrency(doc.totalValue)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {doc.encounters > 0 ? formatCurrency(doc.totalValue / doc.encounters) : '\u2014'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total row */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 mt-2">
            <span className="text-xs font-medium">Total</span>
            <div className="flex items-center gap-6 text-xs">
              <span>{data.productionByDoctor.reduce((s, d) => s + d.encounters, 0)} atendimentos</span>
              <span>{data.productionByDoctor.reduce((s, d) => s + d.procedures, 0)} procedimentos</span>
              <span className="font-bold text-emerald-400">
                {formatCurrency(data.productionByDoctor.reduce((s, d) => s + d.totalValue, 0))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar chart of production by doctor */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Valor por Medico</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.productionByDoctor}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="doctorName" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
              />
              <Bar dataKey="totalValue" name="Valor Total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TISS Validation Tab
// ============================================================================

function TissValidationTab() {
  const [xml, setXml] = useState('');
  const validateTiss = useValidateTissXml();

  const handleValidate = () => {
    if (!xml.trim()) return;
    validateTiss.mutate(xml);
  };

  const result = validateTiss.data;

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Validacao de XML TISS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tiss-xml">Cole o XML TISS abaixo</Label>
            <Textarea
              id="tiss-xml"
              rows={10}
              className="font-mono text-xs"
              placeholder='<?xml version="1.0" encoding="UTF-8"?>&#10;<ans:mensagemTISS ...>'
              value={xml}
              onChange={(e) => setXml(e.target.value)}
            />
          </div>
          <Button
            onClick={handleValidate}
            disabled={validateTiss.isPending || !xml.trim()}
          >
            {validateTiss.isPending ? 'Validando...' : 'Validar XML'}
          </Button>

          {result && (
            <div className="space-y-3 pt-2">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3',
                  result.valid
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5',
                )}
              >
                {result.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {result.valid
                    ? 'XML TISS valido'
                    : `${(result.errors ?? []).length} erro(s) encontrado(s)`}
                </span>
              </div>

              {(result.errors ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-400">Erros</p>
                  {(result.errors ?? []).map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded border border-red-500/20 p-2 text-sm"
                    >
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {(result.warnings ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-yellow-400">Avisos</p>
                  {(result.warnings ?? []).map((warn, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded border border-yellow-500/20 p-2 text-sm"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
