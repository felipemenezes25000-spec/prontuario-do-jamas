import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BedDouble,
  Users,
  TrendingUp,
  DollarSign,
  Stethoscope,
  BarChart3,
  Activity,
  AlertTriangle,
  Calendar,
  LayoutDashboard,
  Search,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useHospitalMovement,
  useDailyCensus,
  useDoctorProductivity,
  useQualityIndicators,
  useFinancialReport,
  useEncounterStats,
  useOccupancyRate,
  useLengthOfStay,
  useTopDiagnoses,
  useProduction,
  useCustomQuery,
} from '@/services/reports.service';

// ── Helpers ─────────────────────────────────────────────────────────

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

function defaultRange(): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

// ── Summary Card ────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function SummaryCard({ title, value, icon: Icon, color, bgColor }: SummaryCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor}`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Date Range Picker ───────────────────────────────────────────────

interface DateRangeProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  singleDate?: boolean;
}

function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  singleDate,
}: DateRangeProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm text-muted-foreground">
          {singleDate ? 'Data:' : 'De:'}
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
      </div>
      {!singleDate && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Até:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}

// ── Hospital Movement Tab ───────────────────────────────────────────

function HospitalMovementTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const { data, isLoading, isError, refetch } = useHospitalMovement(startDate, endDate);

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total de Internações"
          value={data.summary.totalAdmissions}
          icon={BedDouble}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <SummaryCard
          title="Total de Altas"
          value={data.summary.totalDischarges}
          icon={TrendingUp}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <SummaryCard
          title="Total de Atendimentos"
          value={data.summary.totalEncounters}
          icon={Activity}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
      </div>

      {data.daily.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Movimento Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={formatDate}
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-foreground)',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="admissions"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Internações"
                  />
                  <Bar
                    dataKey="encounters"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Atendimentos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Daily Census Tab ────────────────────────────────────────────────

function DailyCensusTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const { data, isLoading, isError, refetch } = useDailyCensus(date);

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={date}
        endDate={date}
        onStartChange={setDate}
        onEndChange={setDate}
        singleDate
      />

      <SummaryCard
        title="Leitos Ocupados"
        value={data.totalOccupied}
        icon={BedDouble}
        color="text-blue-400"
        bgColor="bg-blue-500/10"
      />

      {data.patients.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pacientes Internados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prontuário</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Leito</TableHead>
                  <TableHead>Data Internação</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.patients.map((p) => (
                  <TableRow key={p.patientId}>
                    <TableCell className="font-mono text-xs">{p.mrn}</TableCell>
                    <TableCell>{p.patientName}</TableCell>
                    <TableCell>{p.bed}</TableCell>
                    <TableCell>{formatDate(p.admissionDate)}</TableCell>
                    <TableCell className="text-right">{p.daysAdmitted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Doctor Productivity Tab ─────────────────────────────────────────

function DoctorProductivityTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const { data, isLoading, isError, refetch } = useDoctorProductivity(
    startDate,
    endDate,
  );

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      {data.length > 0 && (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Atendimentos por Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      type="number"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="doctorName"
                      type="category"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={160}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                    />
                    <Bar
                      dataKey="encounterCount"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      name="Atendimentos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Médico</TableHead>
                    <TableHead className="text-right">Atendimentos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.doctorId ?? 'unknown'}>
                      <TableCell>{d.doctorName}</TableCell>
                      <TableCell className="text-right">
                        {d.encounterCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Quality Indicators Tab ──────────────────────────────────────────

function QualityIndicatorsTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const { data, isLoading, isError, refetch } = useQualityIndicators(
    startDate,
    endDate,
  );

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => void refetch()} />;
  if (!data) return null;

  const chartData = [
    { name: 'Atendimentos', value: data.totalEncounters },
    { name: 'Triagens', value: data.totalTriages },
    { name: 'Alertas', value: data.totalAlerts },
  ];

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Atendimentos"
          value={data.totalEncounters}
          icon={Stethoscope}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <SummaryCard
          title="Triagens"
          value={data.totalTriages}
          icon={Activity}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <SummaryCard
          title="Taxa de Triagem"
          value={`${data.triageRate}%`}
          icon={TrendingUp}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
        <SummaryCard
          title="Alertas Clínicos"
          value={data.totalAlerts}
          icon={AlertTriangle}
          color="text-red-400"
          bgColor="bg-red-500/10"
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Distribuição de Indicadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)',
                  }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Financial Tab ───────────────────────────────────────────────────

function FinancialTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const { data, isLoading, isError, refetch } = useFinancialReport(
    startDate,
    endDate,
  );

  const insurerChartData = useMemo(() => {
    if (!data?.byInsurer) return [];
    return Object.entries(data.byInsurer).map(([name, val]) => ({
      name,
      value: val.amount,
    }));
  }, [data]);

  const statusChartData = useMemo(() => {
    if (!data?.byStatus) return [];
    return Object.entries(data.byStatus).map(([name, val]) => ({
      name,
      count: val.count,
      amount: val.amount,
    }));
  }, [data]);

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Faturado"
          value={formatCurrency(data.totalBilled)}
          icon={DollarSign}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <SummaryCard
          title="Aprovado"
          value={formatCurrency(data.totalApproved)}
          icon={TrendingUp}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <SummaryCard
          title="Glosado"
          value={formatCurrency(data.totalGlosed)}
          icon={AlertTriangle}
          color="text-red-400"
          bgColor="bg-red-500/10"
        />
        <SummaryCard
          title="Guias"
          value={data.totalEntries}
          icon={BarChart3}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {insurerChartData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Faturamento por Convênio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insurerChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {insurerChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index.toString()}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {statusChartData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Guias por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Guias"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {Object.keys(data.byInsurer).length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Detalhamento por Convênio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Convênio</TableHead>
                  <TableHead className="text-right">Guias</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.byInsurer).map(([insurer, val]) => (
                  <TableRow key={insurer}>
                    <TableCell>{insurer}</TableCell>
                    <TableCell className="text-right">{val.count}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(val.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Encounter Stats Tab ─────────────────────────────────────────────

function EncounterStatsTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const { data, isLoading, isError, refetch } = useEncounterStats(
    startDate,
    endDate,
  );

  const typeChartData = useMemo(() => {
    if (!data?.byType) return [];
    return Object.entries(data.byType).map(([name, value]) => ({ name, value }));
  }, [data]);

  const dailyChartData = useMemo(() => {
    if (!data?.byDay) return [];
    return Object.entries(data.byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      <SummaryCard
        title="Total de Atendimentos"
        value={data.total}
        icon={Stethoscope}
        color="text-emerald-400"
        bgColor="bg-emerald-500/10"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {typeChartData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Atendimentos por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {typeChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index.toString()}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {dailyChartData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Atendimentos por Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatDate}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      labelFormatter={formatDate}
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Atendimentos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {Object.keys(data.byStatus).length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Atendimentos por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <TableRow key={status}>
                    <TableCell>{status}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Dashboard Gerencial Tab (BLOCO B5) ──────────────────────────────

function DashboardGerencialTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data: occupancy, isLoading: occLoading } = useOccupancyRate(startDate, endDate);
  const { data: lengthOfStay, isLoading: losLoading } = useLengthOfStay(startDate, endDate);
  const { data: topDiagnoses, isLoading: diagLoading } = useTopDiagnoses(startDate, endDate);
  const { data: production, isLoading: prodLoading } = useProduction(startDate, endDate);

  const isLoading = occLoading || losLoading || diagLoading || prodLoading;

  if (isLoading) return <PageLoading cards={0} showTable={false} />;

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Taxa de Ocupacao"
          value={`${occupancy?.overallRate ?? 0}%`}
          icon={BedDouble}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <SummaryCard
          title="Leitos Ocupados"
          value={`${occupancy?.totalOccupied ?? 0}/${occupancy?.totalBeds ?? 0}`}
          icon={BedDouble}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <SummaryCard
          title="Top CIDs"
          value={topDiagnoses?.length ?? 0}
          icon={Activity}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <SummaryCard
          title="Medicos Ativos"
          value={production?.length ?? 0}
          icon={Stethoscope}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ocupacao por setor */}
        {occupancy && occupancy.sectors.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Ocupacao por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancy.sectors}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="ward"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Ocupacao']}
                    />
                    <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ocupacao %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tempo medio de permanencia */}
        {lengthOfStay && lengthOfStay.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Tempo Medio de Permanencia por CID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lengthOfStay.slice(0, 10)} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      type="number"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit=" dias"
                    />
                    <YAxis
                      dataKey="cid"
                      type="category"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                      formatter={(value: number) => [`${value} dias`, 'Media']}
                    />
                    <Bar dataKey="avgDays" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Media (dias)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 20 CIDs */}
        {topDiagnoses && topDiagnoses.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Top 20 Diagnosticos Mais Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDiagnoses.slice(0, 20)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="cid"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                      labelFormatter={(label: string) => {
                        const item = topDiagnoses.find((d) => d.cid === label);
                        return item ? `${item.cid} — ${item.description}` : label;
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Casos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Producao por medico */}
        {production && production.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Producao por Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={production.slice(0, 15)} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      opacity={0.5}
                    />
                    <XAxis
                      type="number"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="doctorName"
                      type="category"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)',
                      }}
                    />
                    <Bar dataKey="encounterCount" fill="#10b981" radius={[0, 4, 4, 0]} name="Atendimentos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table for top diagnoses */}
      {topDiagnoses && topDiagnoses.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Detalhamento de Diagnosticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CID</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Casos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDiagnoses.map((d) => (
                  <TableRow key={d.cid}>
                    <TableCell className="font-mono text-xs">{d.cid}</TableCell>
                    <TableCell>{d.description}</TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Consulta Avancada Tab (BLOCO B5) ────────────────────────────────

function ConsultaAvancadaTab() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [dimension, setDimension] = useState('type');
  const [metric, setMetric] = useState('count');
  const [groupBy, setGroupBy] = useState('month');
  const [queryEnabled, setQueryEnabled] = useState(false);

  const { data, isLoading, isError, refetch } = useCustomQuery(
    startDate,
    endDate,
    dimension,
    metric,
    groupBy,
    queryEnabled,
  );

  const chartData = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.map((r) => ({
      period: r.period,
      total: r.total,
      ...r.dimensions,
    }));
  }, [data]);

  const dimensionKeys = useMemo(() => {
    if (!data?.rows || data.rows.length === 0) return [];
    const keys = new Set<string>();
    for (const row of data.rows) {
      for (const k of Object.keys(row.dimensions)) {
        keys.add(k);
      }
    }
    return Array.from(keys);
  }, [data]);

  const handleGenerate = () => {
    setQueryEnabled(true);
    void refetch();
  };

  const handleExportCsv = () => {
    if (!data?.rows) return;
    const headers = ['Periodo', ...dimensionKeys, 'Total'];
    const csvRows = [headers.join(',')];
    for (const row of data.rows) {
      const values = [
        row.period,
        ...dimensionKeys.map((k) => String(row.dimensions[k] ?? 0)),
        String(row.total),
      ];
      csvRows.push(values.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${dimension}-${groupBy}-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dimensionLabels: Record<string, string> = {
    type: 'Tipo de Atendimento',
    doctor: 'Medico',
    cid: 'CID',
    status: 'Status',
    period: 'Periodo',
  };

  const metricLabels: Record<string, string> = {
    count: 'Contagem',
    sum: 'Soma',
    avg: 'Media',
  };

  const groupByLabels: Record<string, string> = {
    day: 'Dia',
    week: 'Semana',
    month: 'Mes',
    year: 'Ano',
  };

  return (
    <div className="space-y-4">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      <Card className="border-border bg-card">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Dimensao</label>
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dimensionLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Metrica</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(metricLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Agrupar por</label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupByLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              className="bg-teal-600 hover:bg-teal-500"
              disabled={isLoading}
            >
              <Search className="mr-2 h-4 w-4" />
              Gerar
            </Button>

            {data && (
              <Button variant="outline" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && <PageLoading cards={0} showTable={false} />}
      {isError && <PageError onRetry={handleGenerate} />}

      {data && (
        <>
          <SummaryCard
            title="Total de Registros"
            value={data.totalRecords}
            icon={BarChart3}
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
          />

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {dimensionLabels[dimension] ?? dimension} por{' '}
                  {groupByLabels[groupBy] ?? groupBy}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {dimensionKeys.length <= 1 ? (
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="period"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            color: 'var(--color-foreground)',
                          }}
                        />
                        <Bar
                          dataKey="total"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          name="Total"
                        />
                      </BarChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="period"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            color: 'var(--color-foreground)',
                          }}
                        />
                        <Legend />
                        {dimensionKeys.slice(0, 8).map((key, idx) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name={key}
                          />
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data table */}
          {data.rows.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Dados da Consulta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      {dimensionKeys.map((k) => (
                        <TableHead key={k} className="text-right">
                          {k}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.period}>
                        <TableCell className="font-mono text-xs">
                          {row.period}
                        </TableCell>
                        {dimensionKeys.map((k) => (
                          <TableCell key={k} className="text-right">
                            {row.dimensions[k] ?? 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold">
                          {row.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      <Tabs defaultValue="hospital-movement">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hospital-movement">
            <BedDouble className="mr-1.5 h-4 w-4" />
            Movimento Hospitalar
          </TabsTrigger>
          <TabsTrigger value="daily-census">
            <Users className="mr-1.5 h-4 w-4" />
            Censo Diário
          </TabsTrigger>
          <TabsTrigger value="doctor-productivity">
            <Stethoscope className="mr-1.5 h-4 w-4" />
            Produtividade
          </TabsTrigger>
          <TabsTrigger value="quality-indicators">
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Qualidade
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="mr-1.5 h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="encounter-stats">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="dashboard-gerencial">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Dashboard Gerencial
          </TabsTrigger>
          <TabsTrigger value="consulta-avancada">
            <Search className="mr-1.5 h-4 w-4" />
            Consulta Avancada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hospital-movement">
          <HospitalMovementTab />
        </TabsContent>
        <TabsContent value="daily-census">
          <DailyCensusTab />
        </TabsContent>
        <TabsContent value="doctor-productivity">
          <DoctorProductivityTab />
        </TabsContent>
        <TabsContent value="quality-indicators">
          <QualityIndicatorsTab />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialTab />
        </TabsContent>
        <TabsContent value="encounter-stats">
          <EncounterStatsTab />
        </TabsContent>
        <TabsContent value="dashboard-gerencial">
          <DashboardGerencialTab />
        </TabsContent>
        <TabsContent value="consulta-avancada">
          <ConsultaAvancadaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
