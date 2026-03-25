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
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Scale,
  Banknote,
  CreditCard,
  Target,
  Wallet,
  Activity,
  CircleDollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

  const byInsurance = new Map<string, number>();
  for (const e of entries) {
    const ins = e.insuranceProvider ?? 'Particular';
    byInsurance.set(ins, (byInsurance.get(ins) ?? 0) + (e.totalAmount ?? 0));
  }
  const revenueByInsurance = Array.from(byInsurance.entries())
    .map(([insurance, value]) => ({ insurance, value }))
    .sort((a, b) => b.value - a.value);

  const monthlyBillingVsGlosa = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const month = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const factor = 0.7 + Math.random() * 0.6;
    return {
      month,
      billed: Math.round(totalBilled * factor / 6),
      glosa: Math.round(totalGlosed * factor / 6),
      approved: Math.round(totalApproved * factor / 6),
    };
  });

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
// Revenue Dashboard Tab (NEW - rich recharts dashboard)
// ============================================================================

function RevenueDashboardTab({ data }: { data: BillingDashboardData | null }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center py-12">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Sem dados para exibir no dashboard</p>
      </div>
    );
  }

  const margin = data.totalBilled > 0
    ? ((data.totalRevenueMonth - data.totalGlosed) / data.totalBilled) * 100
    : 0;
  const avgTicket = data.productionByDoctor.length > 0
    ? data.totalBilled / data.productionByDoctor.reduce((s, d) => s + d.encounters, 0)
    : 0;

  // Glosa by reason (mock)
  const glosaByReason = [
    { name: 'Codigo TUSS incorreto', value: data.totalGlosed * 0.28, color: '#ef4444' },
    { name: 'Procedimento nao coberto', value: data.totalGlosed * 0.22, color: '#f59e0b' },
    { name: 'Documentacao incompleta', value: data.totalGlosed * 0.18, color: '#3b82f6' },
    { name: 'Duplicidade', value: data.totalGlosed * 0.15, color: '#8b5cf6' },
    { name: 'Ausencia de autorizacao', value: data.totalGlosed * 0.10, color: '#ec4899' },
    { name: 'Outros', value: data.totalGlosed * 0.07, color: '#6b7280' },
  ];

  // Revenue forecast (mock)
  const revenueMonthly = data.monthlyBillingVsGlosa.map((m, i) => ({
    ...m,
    net: m.billed - m.glosa,
    forecast: i >= data.monthlyBillingVsGlosa.length - 3 ? m.billed * 1.05 : undefined,
  }));

  // Financial KPIs
  const financialKpis = [
    {
      label: 'Receita Bruta',
      value: formatCurrency(data.totalBilled),
      change: '+8.2%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500',
    },
    {
      label: 'Receita Liquida',
      value: formatCurrency(data.totalRevenueMonth),
      change: '+5.1%',
      trend: 'up' as const,
      icon: Banknote,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500',
    },
    {
      label: 'Total Glosado',
      value: formatCurrency(data.totalGlosed),
      change: '-2.3%',
      trend: 'down' as const,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
    },
    {
      label: 'Taxa de Glosa',
      value: `${data.glosaRate.toFixed(1)}%`,
      change: data.glosaRate > 10 ? '+0.5%' : '-0.3%',
      trend: data.glosaRate > 10 ? 'up' as const : 'down' as const,
      icon: Percent,
      color: data.glosaRate > 10 ? 'text-red-400' : 'text-emerald-400',
      bgColor: data.glosaRate > 10 ? 'bg-red-500/10' : 'bg-emerald-500/10',
      borderColor: data.glosaRate > 10 ? 'border-l-red-500' : 'border-l-emerald-500',
    },
    {
      label: 'Margem Operacional',
      value: `${margin.toFixed(1)}%`,
      change: '+1.2%',
      trend: 'up' as const,
      icon: Target,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-l-purple-500',
    },
    {
      label: 'Ticket Medio',
      value: formatCurrency(avgTicket),
      change: '+3.8%',
      trend: 'up' as const,
      icon: CreditCard,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
    },
    {
      label: 'Prazo Medio Recebimento',
      value: `${data.avgReceiveDays} dias`,
      change: '-2 dias',
      trend: 'down' as const,
      icon: Clock,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-l-teal-500',
    },
    {
      label: 'Guias Pendentes',
      value: '47',
      change: '-12%',
      trend: 'down' as const,
      icon: FileText,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-l-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Financial KPIs - 4x2 grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {financialKpis.map((kpi) => {
          const isGoodTrend = (kpi.label === 'Total Glosado' || kpi.label === 'Taxa de Glosa' || kpi.label === 'Prazo Medio Recebimento' || kpi.label === 'Guias Pendentes')
            ? kpi.trend === 'down'
            : kpi.trend === 'up';
          return (
            <Card key={kpi.label} className={cn('border-border bg-card border-l-4', kpi.borderColor)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-lg font-bold">{kpi.value}</p>
                    <div className="flex items-center gap-1">
                      {isGoodTrend ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400" />
                      )}
                      <span className={cn('text-[10px] font-medium', isGoodTrend ? 'text-emerald-400' : 'text-red-400')}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', kpi.bgColor)}>
                    <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monthly Revenue Chart + Glosa Pie Chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly Revenue - Bar + Line combo */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                Evolucao Mensal: Receita vs Glosa
              </CardTitle>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Faturado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Glosado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Liquido</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={revenueMonthly} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.7rem',
                  }}
                />
                <Bar dataKey="billed" name="Faturado" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="glosa" name="Glosado" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Line type="monotone" dataKey="net" name="Liquido" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Glosa by Reason Pie Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-red-400" />
              Glosas por Motivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={glosaByReason}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {glosaByReason.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.7rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {glosaByReason.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-medium shrink-0">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Insurance + Top Procedures */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Insurance */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              Receita por Convenio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByInsurance} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="insurance" tick={{ fontSize: 9 }} width={120} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.7rem',
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

        {/* Top Procedures */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Top 10 Procedimentos por Valor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topProcedures.map((proc, i) => {
                const maxValue = data.topProcedures[0]?.value ?? 1;
                const widthPercent = (proc.value / maxValue) * 100;
                return (
                  <div key={proc.procedure} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground w-4 text-right">{i + 1}.</span>
                        {proc.procedure}
                      </span>
                      <span className="font-medium">{formatCurrency(proc.value)}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production by Doctor */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            Producao por Medico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Medico</TableHead>
                    <TableHead className="text-xs text-right">Atend.</TableHead>
                    <TableHead className="text-xs text-right">Proced.</TableHead>
                    <TableHead className="text-xs text-right">Valor Total</TableHead>
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
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-border">
                    <TableCell className="text-sm font-bold">Total</TableCell>
                    <TableCell className="text-sm text-right font-bold">
                      {data.productionByDoctor.reduce((s, d) => s + d.encounters, 0)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-bold">
                      {data.productionByDoctor.reduce((s, d) => s + d.procedures, 0)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-bold text-emerald-400">
                      {formatCurrency(data.productionByDoctor.reduce((s, d) => s + d.totalValue, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.productionByDoctor}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="doctorName" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.7rem',
                  }}
                />
                <Bar dataKey="totalValue" name="Valor Total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Glosa Management Tab (NEW)
// ============================================================================

function GlosaManagementTab() {
  const [statusFilter, setStatusFilter] = useState<AppealStatus | 'ALL'>('ALL');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const filters = statusFilter !== 'ALL' ? { status: statusFilter as AppealStatus } : undefined;
  const { data: appealsData, isLoading } = useBillingAppeals(filters);
  const appeals = appealsData?.data ?? [];

  const createAppeal = useCreateAppeal();
  const updateStatus = useUpdateAppealStatus();
  const generateAI = useGenerateAIJustification();

  // Glosa stats
  const totalGlosed = appeals.reduce((s, a) => s + a.glosedAmount, 0);
  const totalAppealed = appeals.reduce((s, a) => s + a.appealedAmount, 0);
  const totalRecovered = appeals.reduce((s, a) => s + (a.recoveredAmount ?? 0), 0);
  const recoveryRate = totalAppealed > 0 ? (totalRecovered / totalAppealed) * 100 : 0;
  const pendingCount = appeals.filter((a) => a.status === 'DRAFT' || a.status === 'SUBMITTED' || a.status === 'IN_REVIEW').length;
  const acceptedCount = appeals.filter((a) => a.status === 'ACCEPTED' || a.status === 'PARTIALLY_ACCEPTED').length;

  // Classification distribution (mock)
  const classificationData = [
    { name: 'Administrativa', value: 35, color: '#3b82f6' },
    { name: 'Tecnica', value: 28, color: '#f59e0b' },
    { name: 'Clinica', value: 22, color: '#ef4444' },
    { name: 'Linear', value: 15, color: '#8b5cf6' },
  ];

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
      onSuccess: (data) => setAiResult(data.aiJustification),
    });
  };

  const handleSubmitAppeal = (appealId: string) => {
    updateStatus.mutate({ id: appealId, status: 'SUBMITTED' });
  };

  if (isLoading) return <PageLoading cards={4} showTable />;

  return (
    <div className="space-y-6">
      {/* Glosa KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Glosado</p>
                <p className="text-lg font-bold text-red-400 mt-1">{formatCurrency(totalGlosed)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Em Recurso</p>
                <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(totalAppealed)}</p>
                <p className="text-[10px] text-muted-foreground">{pendingCount} pendentes</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Scale className="h-4 w-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recuperado</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(totalRecovered)}</p>
                <p className="text-[10px] text-muted-foreground">{acceptedCount} aceitos</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Taxa de Recuperacao</p>
                <p className="text-lg font-bold text-purple-400 mt-1">{recoveryRate.toFixed(1)}%</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Percent className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Glosa classification pie + toolbar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Classificacao de Glosas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={classificationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {classificationData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.7rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {classificationData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm">Recursos de Glosa</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppealStatus | 'ALL')}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="SUBMITTED">Enviado</SelectItem>
                    <SelectItem value="IN_REVIEW">Em Analise</SelectItem>
                    <SelectItem value="ACCEPTED">Aceito</SelectItem>
                    <SelectItem value="REJECTED">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 text-xs" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Novo Recurso
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {appeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum recurso de glosa encontrado
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {appeals.map((appeal) => {
                  const statusCfg = appealStatusConfig[appeal.status];
                  return (
                    <div key={appeal.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/30">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                          <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">{appeal.appealNumber}</span>
                            <Badge variant="secondary" className={cn('text-[10px] text-white', statusCfg?.color)}>
                              {statusCfg?.label ?? appeal.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Guia: {appeal.billingEntry?.guideNumber ?? '\u2014'} - {formatDate(appeal.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-red-400 font-medium">{formatCurrency(appeal.glosedAmount)}</p>
                          {appeal.recoveredAmount != null && (
                            <p className="text-[10px] text-emerald-400">+{formatCurrency(appeal.recoveredAmount)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {appeal.status === 'DRAFT' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSubmitAppeal(appeal.id)} disabled={updateStatus.isPending}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleGenerateAI(appeal.id)} disabled={generateAI.isPending}>
                            <Sparkles className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedAppeal(appeal.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
// TISS Workflow Tab (enhanced)
// ============================================================================

function TissWorkflowTab() {
  const [xml, setXml] = useState('');
  const validateTiss = useValidateTissXml();
  const [activeGuideType, setActiveGuideType] = useState<'SP_SADT' | 'CONSULTA' | 'INTERNACAO' | null>(null);

  const result = validateTiss.data;

  const guideTypes = [
    { key: 'SP_SADT' as const, label: 'SP/SADT', desc: 'Servico Profissional / Servico Auxiliar de Diagnostico e Terapia', icon: FileCheck2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { key: 'CONSULTA' as const, label: 'Consulta', desc: 'Guia de Consulta', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { key: 'INTERNACAO' as const, label: 'Internacao', desc: 'Guia de Internacao Hospitalar', icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  // TISS workflow steps
  const workflowSteps = [
    { step: 1, label: 'Selecionar tipo de guia', status: activeGuideType ? 'done' : 'active' },
    { step: 2, label: 'Preencher dados obrigatorios', status: activeGuideType ? 'active' : 'pending' },
    { step: 3, label: 'Validar XML', status: result?.valid ? 'done' : 'pending' },
    { step: 4, label: 'Enviar para operadora', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Workflow progress */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {workflowSteps.map((ws, i) => (
              <div key={ws.step} className="flex items-center gap-2 flex-shrink-0">
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  ws.status === 'done' ? 'bg-emerald-600 text-white' :
                  ws.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500' :
                  'bg-zinc-800 text-muted-foreground',
                )}>
                  {ws.status === 'done' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    ws.step
                  )}
                </div>
                <span className={cn(
                  'text-xs whitespace-nowrap',
                  ws.status === 'active' ? 'text-emerald-400 font-medium' :
                  ws.status === 'done' ? 'text-foreground' :
                  'text-muted-foreground',
                )}>
                  {ws.label}
                </span>
                {i < workflowSteps.length - 1 && (
                  <div className={cn(
                    'w-8 h-px',
                    ws.status === 'done' ? 'bg-emerald-500' : 'bg-zinc-700',
                  )} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Guide type selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {guideTypes.map((gt) => (
          <Card
            key={gt.key}
            className={cn(
              'border-border bg-card cursor-pointer transition-all hover:border-zinc-700',
              activeGuideType === gt.key && 'border-emerald-500/50 ring-1 ring-emerald-500/20',
            )}
            onClick={() => setActiveGuideType(gt.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', gt.bg)}>
                  <gt.icon className={cn('h-5 w-5', gt.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium">{gt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{gt.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* XML Validation */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Validacao de XML TISS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tiss-xml">Cole o XML TISS abaixo</Label>
            <Textarea
              id="tiss-xml"
              rows={8}
              className="font-mono text-xs"
              placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<ans:mensagemTISS ...>'}
              value={xml}
              onChange={(e) => setXml(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!xml.trim()) return;
                validateTiss.mutate(xml);
              }}
              disabled={validateTiss.isPending || !xml.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {validateTiss.isPending ? 'Validando...' : 'Validar XML'}
            </Button>
            {activeGuideType && (
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileDown className="h-3.5 w-3.5" />
                Baixar Template {activeGuideType}
              </Button>
            )}
          </div>

          {result && (
            <div className="space-y-3 pt-2">
              <div className={cn(
                'flex items-center gap-2 rounded-lg border p-3',
                result.valid
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-red-500/30 bg-red-500/5',
              )}>
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
                    <div key={i} className="flex items-start gap-2 rounded border border-red-500/20 p-2 text-sm">
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
                    <div key={i} className="flex items-start gap-2 rounded border border-yellow-500/20 p-2 text-sm">
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

      {/* SUS section */}
      <SusTab />
    </div>
  );
}

// ============================================================================
// SUS Tab (AIH + BPA)
// ============================================================================

function SusTab() {
  const [activeForm, setActiveForm] = useState<'aih' | 'bpa' | null>(null);

  const [aihData, setAihData] = useState({
    patientName: '', cpf: '', cns: '', birthDate: '',
    mainProcedure: '', secondaryProcedures: '', cid10Main: '', cid10Secondary: '',
    admissionDate: '', dischargeDate: '', specialty: '', ward: '', dischargeType: '',
  });

  const [bpaData, setBpaData] = useState({
    competence: '', cnes: '', cbo: '', professionalCns: '',
    procedures: '', patientCns: '', patientName: '', quantity: '1',
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
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-400" />
          Faturamento SUS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant={activeForm === 'aih' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveForm('aih'); setPreview(null); }}
            className={cn(activeForm === 'aih' && 'bg-emerald-600', 'gap-1.5')}
          >
            <Building2 className="h-4 w-4" />
            AIH - Internacao
          </Button>
          <Button
            variant={activeForm === 'bpa' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveForm('bpa'); setPreview(null); }}
            className={cn(activeForm === 'bpa' && 'bg-emerald-600', 'gap-1.5')}
          >
            <FileCheck2 className="h-4 w-4" />
            BPA - Ambulatorial
          </Button>
        </div>

        {activeForm === 'aih' && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AIH - Autorizacao de Internacao Hospitalar</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome do Paciente</Label><Input className="h-8 text-xs" value={aihData.patientName} onChange={(e) => setAihData((p) => ({ ...p, patientName: e.target.value }))} /></div>
              <div><Label className="text-xs">CPF</Label><Input className="h-8 text-xs" value={aihData.cpf} placeholder="000.000.000-00" onChange={(e) => setAihData((p) => ({ ...p, cpf: e.target.value }))} /></div>
              <div><Label className="text-xs">CNS</Label><Input className="h-8 text-xs" value={aihData.cns} onChange={(e) => setAihData((p) => ({ ...p, cns: e.target.value }))} /></div>
              <div><Label className="text-xs">Data Nascimento</Label><Input type="date" className="h-8 text-xs" value={aihData.birthDate} onChange={(e) => setAihData((p) => ({ ...p, birthDate: e.target.value }))} /></div>
              <div><Label className="text-xs">Procedimento Principal (SIGTAP)</Label><Input className="h-8 text-xs" value={aihData.mainProcedure} placeholder="0301010072" onChange={(e) => setAihData((p) => ({ ...p, mainProcedure: e.target.value }))} /></div>
              <div><Label className="text-xs">CID-10 Principal</Label><Input className="h-8 text-xs" value={aihData.cid10Main} placeholder="K35.0" onChange={(e) => setAihData((p) => ({ ...p, cid10Main: e.target.value }))} /></div>
              <div><Label className="text-xs">Data Admissao</Label><Input type="date" className="h-8 text-xs" value={aihData.admissionDate} onChange={(e) => setAihData((p) => ({ ...p, admissionDate: e.target.value }))} /></div>
              <div><Label className="text-xs">Data Alta</Label><Input type="date" className="h-8 text-xs" value={aihData.dischargeDate} onChange={(e) => setAihData((p) => ({ ...p, dischargeDate: e.target.value }))} /></div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAihGenerate}>Gerar AIH</Button>
          </div>
        )}

        {activeForm === 'bpa' && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BPA - Boletim de Producao Ambulatorial</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Competencia (AAAAMM)</Label><Input className="h-8 text-xs" value={bpaData.competence} placeholder="202603" onChange={(e) => setBpaData((p) => ({ ...p, competence: e.target.value }))} /></div>
              <div><Label className="text-xs">CNES</Label><Input className="h-8 text-xs" value={bpaData.cnes} placeholder="0000000" onChange={(e) => setBpaData((p) => ({ ...p, cnes: e.target.value }))} /></div>
              <div><Label className="text-xs">CBO do Profissional</Label><Input className="h-8 text-xs" value={bpaData.cbo} placeholder="225125" onChange={(e) => setBpaData((p) => ({ ...p, cbo: e.target.value }))} /></div>
              <div><Label className="text-xs">CNS do Paciente</Label><Input className="h-8 text-xs" value={bpaData.patientCns} onChange={(e) => setBpaData((p) => ({ ...p, patientCns: e.target.value }))} /></div>
              <div><Label className="text-xs">Nome do Paciente</Label><Input className="h-8 text-xs" value={bpaData.patientName} onChange={(e) => setBpaData((p) => ({ ...p, patientName: e.target.value }))} /></div>
              <div><Label className="text-xs">Quantidade</Label><Input type="number" min="1" className="h-8 text-xs" value={bpaData.quantity} onChange={(e) => setBpaData((p) => ({ ...p, quantity: e.target.value }))} /></div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleBpaGenerate}>Gerar BPA</Button>
          </div>
        )}

        {preview && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview do Registro SUS</p>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs font-mono overflow-x-auto">
              {preview}
            </pre>
          </div>
        )}

        {activeForm === null && (
          <div className="flex flex-col items-center py-8">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Selecione AIH ou BPA para iniciar o faturamento SUS
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Billing Entries Tab
// ============================================================================

function BillingEntriesTab({
  allBilling,
  totalItems,
  totalPages,
  page,
  setPage,
  statusFilter,
  insuranceFilter,
  startDate,
  endDate,
  onStatusFilterChange,
  onInsuranceFilterChange,
  onStartDateChange,
  onEndDateChange,
  onView,
  onDownloadPdf,
}: {
  allBilling: BillingEntry[];
  totalItems: number;
  totalPages: number;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  statusFilter: string;
  insuranceFilter: string;
  startDate: string;
  endDate: string;
  onStatusFilterChange: (v: string) => void;
  onInsuranceFilterChange: (v: string) => void;
  onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onView: (id: string) => void;
  onDownloadPdf: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {BILLING_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Convenio</Label>
              <Select value={insuranceFilter} onValueChange={onInsuranceFilterChange}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {INSURANCE_PROVIDERS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Data inicio</Label>
              <Input type="date" value={startDate} onChange={onStartDateChange} className="h-10" />
            </div>
            <div className="w-40">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Data fim</Label>
              <Input type="date" value={endDate} onChange={onEndDateChange} className="h-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {allBilling.length === 0 ? (
        <PageEmpty title="Nenhum lancamento encontrado" description="Altere os filtros ou crie um novo lancamento de faturamento." />
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Paciente</TableHead>
                  <TableHead className="text-xs">Convenio</TableHead>
                  <TableHead className="text-xs text-right">Valor Total</TableHead>
                  <TableHead className="text-xs text-right">Aprovado</TableHead>
                  <TableHead className="text-xs text-right">Glosa</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBilling.map((entry) => {
                  const statusCfg = billingStatusConfig[entry.status];
                  return (
                    <TableRow key={entry.id} className="cursor-pointer transition-colors hover:bg-accent/30">
                      <TableCell className="text-xs font-mono">{entry.patientId.slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.insuranceProvider ?? 'Particular'}</TableCell>
                      <TableCell className="text-sm font-medium text-right">{formatCurrency(entry.totalAmount ?? 0)}</TableCell>
                      <TableCell className="text-sm text-right text-green-400">{entry.approvedAmount != null ? formatCurrency(entry.approvedAmount) : '\u2014'}</TableCell>
                      <TableCell className="text-sm text-right text-red-400">{entry.glosedAmount != null ? formatCurrency(entry.glosedAmount) : '\u2014'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', statusCfg?.badgeClass)}>
                          {statusCfg?.label ?? entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onView(entry.id)} title="Ver detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDownloadPdf(entry.id)} title="Baixar PDF TISS">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Mostrando {allBilling.length} de {totalItems} registros</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Pagina {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Detail Dialog
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
            <div><p className="text-xs text-muted-foreground">Data</p><p>{formatDate(entry.createdAt)}</p></div>
            <div><p className="text-xs text-muted-foreground">Convenio</p><p>{entry.insuranceProvider ?? 'Particular'}</p></div>
            <div><p className="text-xs text-muted-foreground">Guia TISS</p><p className="font-mono text-xs">{entry.guideNumber ?? '\u2014'}</p></div>
            <div><p className="text-xs text-muted-foreground">Tipo</p><p>{entry.guideType ?? '\u2014'}</p></div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm text-muted-foreground">Valor Total</span>
            <span className="text-lg font-bold">{formatCurrency(entry.totalAmount ?? 0)}</span>
          </div>

          {(entry.approvedAmount != null || entry.glosedAmount != null) && (
            <div className="grid gap-3 grid-cols-2">
              {entry.approvedAmount != null && (
                <div className="flex items-center justify-between rounded-lg border border-green-500/20 p-2">
                  <span className="text-xs text-muted-foreground">Aprovado</span>
                  <span className="text-sm font-medium text-green-400">{formatCurrency(entry.approvedAmount)}</span>
                </div>
              )}
              {entry.glosedAmount != null && (
                <div className="flex items-center justify-between rounded-lg border border-red-500/20 p-2">
                  <span className="text-xs text-muted-foreground">Glosado</span>
                  <span className="text-sm font-medium text-red-400">{formatCurrency(entry.glosedAmount)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant="secondary" className={cn('text-xs', statusCfg?.badgeClass)}>{statusCfg?.label ?? entry.status}</Badge>
          </div>

          {/* Eligibility Check */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Verificacao de Elegibilidade</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCheckEligibility} disabled={eligibilityStatus === 'checking'}>
                {eligibilityStatus === 'checking' ? 'Verificando...' : (<><Search className="h-3 w-3 mr-1" /> Verificar</>)}
              </Button>
            </div>
            {eligibilityStatus !== 'idle' && eligibilityStatus !== 'checking' && (
              <div className={cn(
                'flex items-start gap-2 rounded p-2 text-xs',
                eligibilityStatus === 'eligible' ? 'border border-green-500/20 bg-green-500/5' : 'border border-red-500/20 bg-red-500/5',
              )}>
                {eligibilityStatus === 'eligible' ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <div>
                  <p className="font-medium">{eligibilityStatus === 'eligible' ? 'Elegivel' : 'Inelegivel'}</p>
                  <p className="text-muted-foreground">{eligibilityReason}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onDownloadPdf(entry.id)} className="gap-1.5">
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
    billingEntryId: '', glosedItemCodes: '', glosedAmount: '', appealedAmount: '', justification: '',
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
        <DialogHeader><DialogTitle>Novo Recurso de Glosa</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingEntryId">ID do Lancamento</Label>
            <Input id="billingEntryId" placeholder="UUID do lancamento" value={formData.billingEntryId} onChange={(e) => updateField('billingEntryId', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="glosedItemCodes">Codigos Glosados (separados por virgula)</Label>
            <Input id="glosedItemCodes" placeholder="10101012, 20201010" value={formData.glosedItemCodes} onChange={(e) => updateField('glosedItemCodes', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="glosedAmount">Valor Glosado (R$)</Label>
              <Input id="glosedAmount" type="number" step="0.01" min="0" placeholder="0.00" value={formData.glosedAmount} onChange={(e) => updateField('glosedAmount', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appealedAmount">Valor em Recurso (R$)</Label>
              <Input id="appealedAmount" type="number" step="0.01" min="0" placeholder="0.00" value={formData.appealedAmount} onChange={(e) => updateField('appealedAmount', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa</Label>
            <Textarea id="justification" rows={4} placeholder="Descreva a justificativa clinica para o recurso..." value={formData.justification} onChange={(e) => updateField('justification', e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
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

function AppealDetailDialog({ appealId, onClose }: { appealId: string | null; onClose: () => void }) {
  const { data: appeal } = useBillingAppeals();
  const detail = appeal?.data?.find((a) => a.id === appealId);

  return (
    <Dialog open={!!appealId} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle>Detalhes do Recurso</DialogTitle></DialogHeader>
        {detail && (
          <div className="space-y-3">
            <div className="grid gap-3 grid-cols-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Numero</p><p className="font-mono">{detail.appealNumber}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className={cn('text-xs text-white', appealStatusConfig[detail.status]?.color)}>
                  {appealStatusConfig[detail.status]?.label ?? detail.status}
                </Badge>
              </div>
              <div><p className="text-xs text-muted-foreground">Guia</p><p className="font-mono text-xs">{detail.billingEntry?.guideNumber ?? '\u2014'}</p></div>
              <div><p className="text-xs text-muted-foreground">Criado em</p><p>{formatDate(detail.createdAt)}</p></div>
            </div>
            <div className="grid gap-3 grid-cols-3">
              <div className="flex flex-col items-center rounded-lg border border-red-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">Glosado</span>
                <span className="text-sm font-medium text-red-400">{formatCurrency(detail.glosedAmount)}</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-blue-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">Em Recurso</span>
                <span className="text-sm font-medium text-blue-400">{formatCurrency(detail.appealedAmount)}</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-green-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">Recuperado</span>
                <span className="text-sm font-medium text-green-400">
                  {detail.recoveredAmount != null ? formatCurrency(detail.recoveredAmount) : '\u2014'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Justificativa</p>
              <p className="text-sm rounded-lg border border-border p-3 bg-muted/30">{detail.justification}</p>
            </div>
            {detail.aiJustification && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" /> Justificativa IA
                </p>
                <p className="text-sm rounded-lg border border-emerald-500/20 p-3 bg-emerald-500/5 whitespace-pre-wrap">{detail.aiJustification}</p>
              </div>
            )}
            {detail.resolution && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Resolucao</p>
                <p className="text-sm rounded-lg border border-border p-3 bg-muted/30">{detail.resolution}</p>
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

  const dashboardParams = useMemo(() => {
    const params: { startDate?: string; endDate?: string } = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [startDate, endDate]);
  const { data: dashboardApi } = useBillingDashboard(dashboardParams);
  const dashboardData = useMemo<BillingDashboardData | null>(() => {
    if (dashboardApi) return dashboardApi;
    if (allBilling.length > 0) return buildMockDashboard(allBilling);
    return null;
  }, [dashboardApi, allBilling]);

  const { totalBilled, totalApproved, totalGlosed, approvalRate } = useMemo(() => {
    const billed = allBilling.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
    const approved = allBilling.reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0);
    const glosed = allBilling.reduce((sum, b) => sum + (b.glosedAmount ?? 0), 0);
    const rate = billed > 0 ? (approved / billed) * 100 : 0;
    return { totalBilled: billed, totalApproved: approved, totalGlosed: glosed, approvalRate: rate };
  }, [allBilling]);

  const detail = selectedEntry ? allBilling.find((b) => b.id === selectedEntry) ?? null : null;

  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setPage(1); }, []);
  const handleInsuranceFilterChange = useCallback((value: string) => { setInsuranceFilter(value); setPage(1); }, []);
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); setPage(1); }, []);
  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); setPage(1); }, []);
  const handleDownloadTissPdf = useCallback((id: string) => { window.open(`/api/v1/billing/${id}/tiss-pdf`, '_blank'); }, []);

  const kpis = [
    { label: 'Total Faturado', value: formatCurrency(totalBilled), icon: Receipt, color: 'text-teal-400', bgColor: 'bg-teal-500/10' },
    { label: 'Total Aprovado', value: formatCurrency(totalApproved), icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { label: 'Total Glosado', value: formatCurrency(totalGlosed), icon: TrendingDown, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    { label: 'Taxa de Aprovacao', value: `${approvalRate.toFixed(1)}%`, icon: Percent, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  ];

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
          <CircleDollarSign className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>
          <p className="text-sm text-muted-foreground">
            Ciclo de receita, gestao de glosas, guias TISS e faturamento SUS
          </p>
        </div>
      </div>

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
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.bgColor)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 bg-zinc-900/50 p-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard Receita
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Lancamentos
          </TabsTrigger>
          <TabsTrigger value="glosas" className="flex items-center gap-1.5 text-xs">
            <Scale className="h-3.5 w-3.5" />
            Gestao de Glosas
          </TabsTrigger>
          <TabsTrigger value="tiss" className="flex items-center gap-1.5 text-xs">
            <FileCheck2 className="h-3.5 w-3.5" />
            Guias TISS / SUS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RevenueDashboardTab data={dashboardData} />
        </TabsContent>

        <TabsContent value="entries">
          <BillingEntriesTab
            allBilling={allBilling}
            totalItems={totalItems}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            statusFilter={statusFilter}
            insuranceFilter={insuranceFilter}
            startDate={startDate}
            endDate={endDate}
            onStatusFilterChange={handleStatusFilterChange}
            onInsuranceFilterChange={handleInsuranceFilterChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onView={setSelectedEntry}
            onDownloadPdf={handleDownloadTissPdf}
          />
        </TabsContent>

        <TabsContent value="glosas">
          <GlosaManagementTab />
        </TabsContent>

        <TabsContent value="tiss">
          <TissWorkflowTab />
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
