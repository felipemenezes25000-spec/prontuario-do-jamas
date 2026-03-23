import { useState, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Activity,
  BarChart3,
  ChevronLeft,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useConditionsSummary,
  usePatientsByCondition,
  useCareGaps,
  useRiskStratification,
  usePopulationDashboard,
} from '@/services/population-health.service';
import type { CareGapItem, RiskStratificationItem } from '@/services/population-health.service';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

// ─── Constants ─────────────────────────────────────────────────────────────

const CONDITION_COLORS: Record<string, string> = {
  DM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  HAS: 'bg-red-500/20 text-red-400 border-red-500/30',
  DPOC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ASMA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  IRC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ICC: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  NEO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const RISK_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  VERY_HIGH: '#7c3aed',
};

const RISK_LABELS: Record<string, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito Alto',
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

// ─── Component ─────────────────────────────────────────────────────────────

export default function PopulationHealthPage() {
  const [activeTab, setActiveTab] = useState('conditions');
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [ageMinFilter, setAgeMinFilter] = useState<string>('');
  const [ageMaxFilter, setAgeMaxFilter] = useState<string>('');
  const [gapSearch, setGapSearch] = useState('');
  const debouncedGapSearch = useDebounce(gapSearch, 300);

  const conditionFilters = useMemo(() => ({
    ...(genderFilter ? { gender: genderFilter } : {}),
    ...(ageMinFilter ? { ageMin: parseInt(ageMinFilter, 10) } : {}),
    ...(ageMaxFilter ? { ageMax: parseInt(ageMaxFilter, 10) } : {}),
  }), [genderFilter, ageMinFilter, ageMaxFilter]);

  const { data: conditions, isLoading: conditionsLoading, error: conditionsError } = useConditionsSummary(conditionFilters);
  const { data: patientsData } = usePatientsByCondition(selectedCondition ?? '', {
    ...conditionFilters,
    pageSize: 50,
  });
  const { data: careGapsData, isLoading: gapsLoading } = useCareGaps({ pageSize: 200 });
  const { data: riskData, isLoading: riskLoading } = useRiskStratification();
  const { data: dashboardData, isLoading: dashboardLoading } = usePopulationDashboard();

  const filteredGaps = useMemo(() => {
    if (!careGapsData?.data) return [];
    if (!debouncedGapSearch) return careGapsData.data;
    const search = debouncedGapSearch.toLowerCase();
    return careGapsData.data.filter(
      (g: CareGapItem) =>
        g.patientName.toLowerCase().includes(search) ||
        g.mrn.toLowerCase().includes(search) ||
        g.condition.toLowerCase().includes(search) ||
        g.gapType.toLowerCase().includes(search),
    );
  }, [careGapsData?.data, debouncedGapSearch]);

  const riskPieData = useMemo(() => {
    if (!riskData) return [];
    return [
      { name: 'Baixo', value: riskData.low, color: RISK_COLORS.LOW },
      { name: 'Médio', value: riskData.medium, color: RISK_COLORS.MEDIUM },
      { name: 'Alto', value: riskData.high, color: RISK_COLORS.HIGH },
      { name: 'Muito Alto', value: riskData.veryHigh, color: RISK_COLORS.VERY_HIGH },
    ].filter((d) => d.value > 0);
  }, [riskData]);

  if (conditionsError) {
    return <PageError message="Erro ao carregar dados de saúde populacional." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saúde Populacional</h1>
        <p className="text-muted-foreground">
          Monitoramento de condições crônicas, gaps de cuidado e estratificação de risco
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="conditions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Registros
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gaps de Cuidado
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Estratificação
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Registros por Condição ─────────────────────────────────── */}
        <TabsContent value="conditions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="flex flex-wrap gap-4 pt-4">
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Idade mín."
                type="number"
                className="w-28"
                value={ageMinFilter}
                onChange={(e) => setAgeMinFilter(e.target.value)}
              />
              <Input
                placeholder="Idade máx."
                type="number"
                className="w-28"
                value={ageMaxFilter}
                onChange={(e) => setAgeMaxFilter(e.target.value)}
              />
              {(genderFilter || ageMinFilter || ageMaxFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setGenderFilter(''); setAgeMinFilter(''); setAgeMaxFilter(''); }}
                >
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>

          {selectedCondition ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCondition(null)}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar às condições
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Pacientes com {conditions?.find((c) => c.conditionCode === selectedCondition)?.conditionLabel ?? selectedCondition}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patientsData?.data && patientsData.data.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Prontuário</TableHead>
                          <TableHead>CID</TableHead>
                          <TableHead>Data Diagnóstico</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientsData.data.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.fullName}</TableCell>
                            <TableCell>{p.mrn}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.cidCode}</Badge>
                            </TableCell>
                            <TableCell>
                              {p.diagnosedAt
                                ? new Date(p.diagnosedAt).toLocaleDateString('pt-BR')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum paciente encontrado para esta condição.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {conditionsLoading ? (
                <PageLoading />
              ) : (
                conditions?.map((cond) => (
                  <Card
                    key={cond.conditionCode}
                    className="cursor-pointer transition-colors hover:border-primary/50"
                    onClick={() => setSelectedCondition(cond.conditionCode)}
                  >
                    <CardContent className="flex items-center gap-4 pt-6">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold',
                          CONDITION_COLORS[cond.conditionCode] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {cond.patientCount}
                      </div>
                      <div>
                        <p className="font-semibold">{cond.conditionCode}</p>
                        <p className="text-sm text-muted-foreground">{cond.conditionLabel}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Gaps de Cuidado ────────────────────────────────────────── */}
        <TabsContent value="gaps" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, condição ou exame..."
                className="pl-10"
                value={gapSearch}
                onChange={(e) => setGapSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="border-red-500 text-red-400">Vermelho: &gt;2x prazo</Badge>
              <Badge variant="outline" className="border-yellow-500 text-yellow-400">Amarelo: 1-2x prazo</Badge>
              <Badge variant="outline" className="border-green-500 text-green-400">Verde: próximo do prazo</Badge>
            </div>
          </div>

          <Card>
            <CardContent className="pt-4">
              {gapsLoading ? (
                <PageLoading />
              ) : filteredGaps.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urgência</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>Gap</TableHead>
                      <TableHead>Último Registro</TableHead>
                      <TableHead>Dias de Atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGaps.map((gap: CareGapItem, idx: number) => (
                      <TableRow key={`${gap.patientId}-${gap.gapType}-${idx}`}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              gap.urgency === 'RED' && 'border-red-500 bg-red-500/10 text-red-400',
                              gap.urgency === 'YELLOW' && 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
                              gap.urgency === 'GREEN' && 'border-green-500 bg-green-500/10 text-green-400',
                            )}
                          >
                            {gap.urgency === 'RED' ? 'Crítico' : gap.urgency === 'YELLOW' ? 'Atenção' : 'Próximo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{gap.patientName}</TableCell>
                        <TableCell>{gap.mrn}</TableCell>
                        <TableCell>{gap.condition}</TableCell>
                        <TableCell>{gap.gapType}</TableCell>
                        <TableCell>
                          {gap.lastDate
                            ? new Date(gap.lastDate).toLocaleDateString('pt-BR')
                            : 'Nunca realizado'}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'font-semibold',
                            gap.urgency === 'RED' && 'text-red-400',
                            gap.urgency === 'YELLOW' && 'text-yellow-400',
                          )}>
                            {gap.daysOverdue} dias
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum gap de cuidado identificado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Estratificação de Risco ────────────────────────────────── */}
        <TabsContent value="risk" className="space-y-4">
          {riskLoading ? (
            <PageLoading />
          ) : riskData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Baixo', value: riskData.low, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Médio', value: riskData.medium, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { label: 'Alto', value: riskData.high, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Muito Alto', value: riskData.veryHigh, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className={cn('text-3xl font-bold', item.color)}>{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Nível de Risco</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          dataKey="value"
                        >
                          {riskPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#d1d5db' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Patient List by Risk */}
              <Card>
                <CardHeader>
                  <CardTitle>Pacientes por Nível de Risco</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Risco</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Prontuário</TableHead>
                        <TableHead>Idade</TableHead>
                        <TableHead>Condições</TableHead>
                        <TableHead>Internação Recente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskData.patients
                        .sort((a: RiskStratificationItem, b: RiskStratificationItem) => {
                          const order = { VERY_HIGH: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                          return order[a.riskLevel] - order[b.riskLevel];
                        })
                        .slice(0, 100)
                        .map((p: RiskStratificationItem) => (
                          <TableRow key={p.patientId}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  p.riskLevel === 'LOW' && 'border-emerald-500 text-emerald-400',
                                  p.riskLevel === 'MEDIUM' && 'border-yellow-500 text-yellow-400',
                                  p.riskLevel === 'HIGH' && 'border-red-500 text-red-400',
                                  p.riskLevel === 'VERY_HIGH' && 'border-purple-500 text-purple-400',
                                )}
                              >
                                {RISK_LABELS[p.riskLevel]}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{p.patientName}</TableCell>
                            <TableCell>{p.mrn}</TableCell>
                            <TableCell>{p.age} anos</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {p.conditions.slice(0, 3).map((c, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {c}
                                  </Badge>
                                ))}
                                {p.conditions.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{p.conditions.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {p.recentAdmission ? (
                                <Badge variant="destructive" className="text-xs">Sim</Badge>
                              ) : (
                                <span className="text-muted-foreground">Não</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ── Tab 4: Dashboard ──────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboardLoading ? (
            <PageLoading />
          ) : dashboardData ? (
            <>
              {/* Bar Chart: Patients per Condition */}
              <Card>
                <CardHeader>
                  <CardTitle>Total de Pacientes por Condição</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.conditionCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="conditionCode" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#d1d5db' }}
                        />
                        <Bar dataKey="patientCount" name="Pacientes" radius={[4, 4, 0, 0]}>
                          {dashboardData.conditionCounts.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Pie Chart: Gaps vs No Gaps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pacientes com Gaps vs Sem Gaps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Com gaps', value: dashboardData.gapsSummary.withGaps, color: '#ef4444' },
                              { name: 'Sem gaps', value: dashboardData.gapsSummary.withoutGaps, color: '#10b981' },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            dataKey="value"
                          >
                            <Cell fill="#ef4444" />
                            <Cell fill="#10b981" />
                          </Pie>
                          <Legend />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Line Chart: Monthly Diagnoses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Novos Diagnósticos por Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.monthlyDiagnoses}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Diagnósticos"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
