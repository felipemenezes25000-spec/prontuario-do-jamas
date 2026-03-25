import { useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  Database,
  FlaskConical,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Save,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCohorts,
  useBenchmarks,
  useBuildCohort,
  type CohortCriteria,
} from '@/services/data-warehouse.service';
import {
  useDimensions,
  useMeasures,
  useSavedQueries,
  useRunQuery,
  useSaveQuery,
  type AnalyticsQuery,
  type AnalyticsResult,
} from '@/services/analytics-explorer.service';
import {
  useClinicalTrials,
  useCreateTrial,
  useEligiblePatients,
  useFindEligiblePatients,
  type TrialStatus,
  type ClinicalTrial,
} from '@/services/clinical-research.service';

// ─── Data Warehouse ───────────────────────────────────────────────────────────

function NewCohortDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [criteria, _setCriteria] = useState<CohortCriteria>({});
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [gender, setGender] = useState('');
  const buildCohort = useBuildCohort();

  const handleBuild = () => {
    const builtCriteria: CohortCriteria = { ...criteria };
    if (ageMin || ageMax) {
      builtCriteria.ageRange = { min: Number(ageMin) || 0, max: Number(ageMax) || 150 };
    }
    if (gender) builtCriteria.gender = gender;

    buildCohort.mutate(
      { name: name || undefined, criteria: builtCriteria },
      {
        onSuccess: (data) => {
          toast.success(`Coorte criada com ${data.patientCount} pacientes`);
          setOpen(false);
          setName('');
          setAgeMin('');
          setAgeMax('');
          setGender('');
        },
        onError: () => toast.error('Erro ao construir coorte'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Coorte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Construir Coorte de Pacientes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Nome da Coorte (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Diabéticos > 60 anos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Idade Mínima</Label>
              <Input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Idade Máxima</Label>
              <Input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="150" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Gênero</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={buildCohort.isPending}
            onClick={handleBuild}
          >
            {buildCohort.isPending ? 'Construindo...' : 'Construir Coorte'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DataWarehouseTab() {
  const { data: cohorts, isLoading: loadingCohorts } = useCohorts();
  const { data: benchmarks, isLoading: loadingBenchmarks } = useBenchmarks();

  const trendIcon = (trend: 'UP' | 'DOWN' | 'STABLE') => {
    if (trend === 'UP') return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (trend === 'DOWN') return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Coortes de Pacientes</h3>
          <NewCohortDialog />
        </div>
        {loadingCohorts ? (
          <div className="text-center py-8 text-muted-foreground">Carregando coortes...</div>
        ) : !cohorts?.data?.length ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma coorte definida</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cohorts.data.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.name ?? 'Coorte sem nome'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criada em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">{c.patientCount}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> pacientes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-3">Benchmarks Comparativos</h3>
        {loadingBenchmarks ? (
          <div className="text-center py-8 text-muted-foreground">Carregando benchmarks...</div>
        ) : !benchmarks?.length ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum benchmark disponível</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Percentil</TableHead>
                  <TableHead>Tendência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map((b) => (
                  <TableRow key={b.metric}>
                    <TableCell className="font-medium text-sm">{b.metric}</TableCell>
                    <TableCell className="text-sm">{b.facilityValue} {b.unit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.benchmarkValue} {b.unit}</TableCell>
                    <TableCell>
                      <Badge variant={b.percentile >= 75 ? 'default' : b.percentile >= 50 ? 'secondary' : 'destructive'}>
                        P{b.percentile}
                      </Badge>
                    </TableCell>
                    <TableCell>{trendIcon(b.trend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analytics Explorer ───────────────────────────────────────────────────────

function ExplorerTab() {
  const { data: dimensions } = useDimensions();
  const { data: measures } = useMeasures();
  const { data: savedQueries } = useSavedQueries();
  const runQuery = useRunQuery();
  const saveQuery = useSaveQuery();

  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  const [queryResult, setQueryResult] = useState<AnalyticsResult | null>(null);
  const [queryName, setQueryName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  const handleRun = () => {
    if (!selectedDimensions.length && !selectedMeasures.length) {
      toast.error('Selecione pelo menos uma dimensão ou medida');
      return;
    }
    const query: AnalyticsQuery = { dimensions: selectedDimensions, measures: selectedMeasures };
    runQuery.mutate(query, {
      onSuccess: (data) => {
        setQueryResult(data);
        toast.success(`${data.total} resultados em ${data.queryTimeMs}ms`);
      },
      onError: () => toast.error('Erro ao executar consulta'),
    });
  };

  const handleSave = () => {
    if (!queryName) return;
    const query: AnalyticsQuery = { dimensions: selectedDimensions, measures: selectedMeasures };
    saveQuery.mutate(
      { name: queryName, query },
      {
        onSuccess: () => {
          toast.success('Consulta salva');
          setSaveOpen(false);
          setQueryName('');
        },
        onError: () => toast.error('Erro ao salvar consulta'),
      },
    );
  };

  const toggleDimension = (id: string) =>
    setSelectedDimensions((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  const toggleMeasure = (id: string) =>
    setSelectedMeasures((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dimensões</CardTitle>
          </CardHeader>
          <CardContent>
            {!dimensions?.length ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {dimensions.map((d) => (
                  <Badge
                    key={d.id}
                    variant={selectedDimensions.includes(d.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleDimension(d.id)}
                  >
                    {d.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Medidas</CardTitle>
          </CardHeader>
          <CardContent>
            {!measures?.length ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {measures.map((m) => (
                  <Badge
                    key={m.id}
                    variant={selectedMeasures.includes(m.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleMeasure(m.id)}
                  >
                    {m.name} ({m.aggregation})
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={runQuery.isPending}
          onClick={handleRun}
        >
          <Play className="h-4 w-4 mr-2" />
          {runQuery.isPending ? 'Executando...' : 'Executar Consulta'}
        </Button>
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!queryResult}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Consulta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Salvar Consulta</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>Nome da Consulta</Label>
                <Input value={queryName} onChange={(e) => setQueryName(e.target.value)} placeholder="Ex: Atendimentos por departamento" />
              </div>
              <Button className="w-full" disabled={!queryName || saveQuery.isPending} onClick={handleSave}>
                {saveQuery.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {queryResult && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {queryResult.total} resultados · {queryResult.queryTimeMs}ms
          </p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {queryResult.columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryResult.rows.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    {queryResult.columns.map((col) => (
                      <TableCell key={col.key} className="text-sm">
                        {String(row[col.key] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {queryResult.rows.length > 20 && (
            <p className="text-xs text-muted-foreground">Exibindo 20 de {queryResult.total} linhas</p>
          )}
        </div>
      )}

      {(savedQueries?.data?.length ?? 0) > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Consultas Salvas</h3>
          <div className="flex flex-wrap gap-2">
            {savedQueries!.data.map((q) => (
              <Badge
                key={q.id}
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  setSelectedDimensions(q.query.dimensions);
                  setSelectedMeasures(q.query.measures);
                  toast.info(`Consulta "${q.name}" carregada`);
                }}
              >
                {q.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clinical Research ────────────────────────────────────────────────────────

function trialStatusBadge(status: TrialStatus) {
  const map: Record<TrialStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PLANNING: { label: 'Planejamento', variant: 'outline' },
    RECRUITING: { label: 'Recrutando', variant: 'secondary' },
    ACTIVE: { label: 'Ativo', variant: 'default' },
    COMPLETED: { label: 'Concluído', variant: 'outline' },
    SUSPENDED: { label: 'Suspenso', variant: 'destructive' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function NewTrialDialog() {
  const [open, setOpen] = useState(false);
  const createTrial = useCreateTrial();
  const [form, setForm] = useState({
    title: '',
    protocol: '',
    principalInvestigator: '',
    sponsor: '',
    status: 'PLANNING' as TrialStatus,
    startDate: '',
    targetEnrollment: '',
    description: '',
    eligibilityCriteria: '',
  });

  const handleCreate = () => {
    if (!form.title || !form.protocol || !form.principalInvestigator || !form.startDate || !form.description) return;
    createTrial.mutate(
      {
        ...form,
        targetEnrollment: Number(form.targetEnrollment) || 0,
        sponsor: form.sponsor || undefined,
        eligibilityCriteria: form.eligibilityCriteria || undefined,
        endDate: undefined,
      },
      {
        onSuccess: () => {
          toast.success('Ensaio clínico cadastrado');
          setOpen(false);
        },
        onError: () => toast.error('Erro ao cadastrar ensaio'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Ensaio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar Ensaio Clínico</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Título do Estudo</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Protocolo</Label>
              <Input value={form.protocol} onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>N° Alvo de Pacientes</Label>
              <Input type="number" value={form.targetEnrollment} onChange={(e) => setForm((f) => ({ ...f, targetEnrollment: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Investigador Principal</Label>
            <Input value={form.principalInvestigator} onChange={(e) => setForm((f) => ({ ...f, principalInvestigator: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Patrocinador (opcional)</Label>
              <Input value={form.sponsor} onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data de Início</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Critérios de Elegibilidade (opcional)</Label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.eligibilityCriteria}
              onChange={(e) => setForm((f) => ({ ...f, eligibilityCriteria: e.target.value }))}
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={createTrial.isPending}
            onClick={handleCreate}
          >
            {createTrial.isPending ? 'Salvando...' : 'Cadastrar Ensaio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrialCard({ trial }: { trial: ClinicalTrial }) {
  const [selectedTrial, setSelectedTrial] = useState<string | null>(null);
  const { data: eligible } = useEligiblePatients(selectedTrial ?? '');
  const findEligible = useFindEligiblePatients();

  const progress = trial.targetEnrollment > 0
    ? Math.round((trial.currentEnrollment / trial.targetEnrollment) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm">{trial.title}</p>
              <p className="text-xs text-muted-foreground">{trial.protocol} · {trial.principalInvestigator}</p>
            </div>
            {trialStatusBadge(trial.status)}
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Recrutamento</span>
              <span>{trial.currentEnrollment}/{trial.targetEnrollment}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          {trial.status === 'RECRUITING' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedTrial(trial.id);
                findEligible.mutate(trial.id, {
                  onSuccess: (data) => toast.success(`${data.total} pacientes elegíveis encontrados`),
                  onError: () => toast.error('Erro ao buscar elegíveis'),
                });
              }}
              disabled={findEligible.isPending}
            >
              <Search className="h-3 w-3 mr-1" />
              Buscar Elegíveis
            </Button>
          )}
          {selectedTrial === trial.id && eligible?.data && eligible.data.length > 0 && (
            <div className="space-y-1">
              {eligible.data.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.age}a</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {(p.matchScore * 100).toFixed(0)}% match
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResearchTab() {
  const { data, isLoading } = useClinicalTrials();
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'ALL'>('ALL');
  const trials = (data?.data ?? []).filter((t) => statusFilter === 'ALL' || t.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            <SelectItem value="PLANNING">Planejamento</SelectItem>
            <SelectItem value="RECRUITING">Recrutando</SelectItem>
            <SelectItem value="ACTIVE">Ativo</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="SUSPENDED">Suspenso</SelectItem>
          </SelectContent>
        </Select>
        <NewTrialDialog />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando ensaios clínicos...</div>
      ) : trials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum ensaio clínico cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trials.map((t) => (
            <TrialCard key={t.id} trial={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hub Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Analytics & Pesquisa</h1>
          <p className="text-sm text-muted-foreground">
            Data warehouse, explorador de dados self-service e pesquisa clínica
          </p>
        </div>
      </div>

      <Tabs defaultValue="warehouse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warehouse" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Warehouse
          </TabsTrigger>
          <TabsTrigger value="explorer" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Explorador de Dados
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Pesquisa Clínica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="warehouse"><DataWarehouseTab /></TabsContent>
        <TabsContent value="explorer"><ExplorerTab /></TabsContent>
        <TabsContent value="research"><ResearchTab /></TabsContent>
      </Tabs>
    </div>
  );
}
