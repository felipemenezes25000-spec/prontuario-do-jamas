import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Microscope,
  BedDouble,
  BarChart3,
  FileWarning,
  Search,
  Plus,
  X,
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
import { toast } from 'sonner';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Separator } from '@/components/ui/separator';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  usePositiveCultures,
  useIsolationPatients,
  useStartIsolation,
  useEndIsolation,
  useInfectionDashboard,
  useNotifiableDiseases,
  useCreateNotification,
  useCompulsoryNotifications,
} from '@/services/infection-control.service';
import type {
  PositiveCulture,
  IsolationPatient,
} from '@/services/infection-control.service';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

// ─── Constants ─────────────────────────────────────────────────────────────

const ISOLATION_LABELS: Record<string, string> = {
  CONTACT: 'Contato',
  DROPLET: 'Gotículas',
  AIRBORNE: 'Aerossol',
  PROTECTIVE: 'Protetor',
  COMBINED: 'Combinado',
};

const ISOLATION_COLORS: Record<string, string> = {
  CONTACT: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  DROPLET: 'border-blue-500 bg-blue-500/10 text-blue-400',
  AIRBORNE: 'border-red-500 bg-red-500/10 text-red-400',
  PROTECTIVE: 'border-purple-500 bg-purple-500/10 text-purple-400',
  COMBINED: 'border-orange-500 bg-orange-500/10 text-orange-400',
};

const ISOLATION_DESCRIPTIONS: Record<string, string> = {
  CONTACT: 'Luva + Avental',
  DROPLET: 'Máscara cirúrgica',
  AIRBORNE: 'N95/PFF2',
  PROTECTIVE: 'Imunossuprimido',
  COMBINED: 'Múltiplas medidas',
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#f43f5e'];

const CONFIRMATION_CRITERIA = [
  'Clínico-epidemiológico',
  'Laboratorial',
  'Clínico-laboratorial',
  'Clínico',
  'Epidemiológico',
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function InfectionControlPage() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [cultureSearch, setCultureSearch] = useState('');
  const debouncedCultureSearch = useDebounce(cultureSearch, 300);

  // Isolation dialog state
  const [isolationDialogOpen, setIsolationDialogOpen] = useState(false);
  const [isolationForm, setIsolationForm] = useState({
    admissionId: '',
    isolationType: '' as string,
    reason: '',
  });

  // Notification form state
  const [notificationForm, setNotificationForm] = useState({
    patientId: '',
    disease: '',
    cidCode: '',
    notificationDate: new Date().toISOString().slice(0, 10),
    symptomsDate: '',
    confirmationCriteria: '',
    observations: '',
  });

  // Data hooks
  const { data: culturesData, isLoading: culturesLoading, error: culturesError } = usePositiveCultures({ days: 30 });
  const { data: isolationPatients, isLoading: isolationLoading } = useIsolationPatients();
  const startIsolation = useStartIsolation();
  const endIsolation = useEndIsolation();
  const { data: dashboardData, isLoading: dashboardLoading } = useInfectionDashboard();
  const { data: diseases } = useNotifiableDiseases();
  const createNotification = useCreateNotification();
  const { data: notificationsData } = useCompulsoryNotifications();

  // Filter cultures
  const filteredCultures = useMemo(() => {
    if (!culturesData?.data) return [];
    if (!debouncedCultureSearch) return culturesData.data;
    const search = debouncedCultureSearch.toLowerCase();
    return culturesData.data.filter(
      (c: PositiveCulture) =>
        c.patientName.toLowerCase().includes(search) ||
        c.mrn.toLowerCase().includes(search) ||
        c.microorganism.toLowerCase().includes(search) ||
        c.examName.toLowerCase().includes(search),
    );
  }, [culturesData?.data, debouncedCultureSearch]);

  // Resistance table data
  const resistanceTable = useMemo(() => {
    if (!dashboardData?.resistanceProfile) return { micros: [] as string[], antibiotics: [] as string[], matrix: {} as Record<string, Record<string, string>> };
    const micros = new Set<string>();
    const antibiotics = new Set<string>();
    const matrix: Record<string, Record<string, string>> = {};

    for (const entry of dashboardData.resistanceProfile) {
      micros.add(entry.microorganism);
      antibiotics.add(entry.antibiotic);
      if (!matrix[entry.microorganism]) matrix[entry.microorganism] = {};
      matrix[entry.microorganism]![entry.antibiotic] = entry.result;
    }

    return {
      micros: Array.from(micros),
      antibiotics: Array.from(antibiotics),
      matrix,
    };
  }, [dashboardData?.resistanceProfile]);

  const handleStartIsolation = async () => {
    if (!isolationForm.admissionId || !isolationForm.isolationType || !isolationForm.reason) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await startIsolation.mutateAsync(isolationForm);
      toast.success('Isolamento iniciado com sucesso.');
      setIsolationDialogOpen(false);
      setIsolationForm({ admissionId: '', isolationType: '', reason: '' });
    } catch {
      toast.error('Erro ao iniciar isolamento.');
    }
  };

  const handleEndIsolation = async (admissionId: string) => {
    try {
      await endIsolation.mutateAsync(admissionId);
      toast.success('Isolamento encerrado com sucesso.');
    } catch {
      toast.error('Erro ao encerrar isolamento.');
    }
  };

  const handleCreateNotification = async () => {
    if (
      !notificationForm.patientId ||
      !notificationForm.disease ||
      !notificationForm.cidCode ||
      !notificationForm.symptomsDate ||
      !notificationForm.confirmationCriteria
    ) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createNotification.mutateAsync(notificationForm);
      toast.success('Notificação compulsória registrada com sucesso.');
      setNotificationForm({
        patientId: '',
        disease: '',
        cidCode: '',
        notificationDate: new Date().toISOString().slice(0, 10),
        symptomsDate: '',
        confirmationCriteria: '',
        observations: '',
      });
    } catch {
      toast.error('Erro ao registrar notificação.');
    }
  };

  if (culturesError) {
    return <PageError message="Erro ao carregar dados de controle de infecção." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          CCIH — Controle de Infecção
        </h1>
        <p className="text-muted-foreground">
          Monitoramento de culturas, isolamentos, dashboard e notificações compulsórias
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Microscope className="h-4 w-4" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="isolation" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            Isolamento
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard CCIH
          </TabsTrigger>
          <TabsTrigger value="notification" className="flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Notificação
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Monitoramento ──────────────────────────────────────────── */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, microorganismo..."
                className="pl-10"
                value={cultureSearch}
                onChange={(e) => setCultureSearch(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="border-red-500 text-red-400">
              {culturesData?.total ?? 0} culturas positivas (30 dias)
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Culturas Positivas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {culturesLoading ? (
                <PageLoading />
              ) : filteredCultures.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>Exame</TableHead>
                      <TableHead>Microorganismo</TableHead>
                      <TableHead>Sensibilidade</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCultures.map((culture: PositiveCulture) => (
                      <TableRow key={culture.id}>
                        <TableCell className="font-medium">{culture.patientName}</TableCell>
                        <TableCell>{culture.mrn}</TableCell>
                        <TableCell>
                          {culture.bed ? (
                            <Badge variant="outline">{culture.bed}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{culture.examName}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{culture.microorganism}</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">{culture.sensitivity}</TableCell>
                        <TableCell>
                          {culture.completedAt
                            ? new Date(culture.completedAt).toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma cultura positiva nos últimos 30 dias.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Isolamento ─────────────────────────────────────────────── */}
        <TabsContent value="isolation" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Object.entries(ISOLATION_LABELS).map(([key, label]) => (
                <Badge key={key} variant="outline" className={cn('text-xs', ISOLATION_COLORS[key])}>
                  {label}: {ISOLATION_DESCRIPTIONS[key]}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setIsolationDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Iniciar Isolamento
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Pacientes em Isolamento ({isolationPatients?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isolationLoading ? (
                <PageLoading />
              ) : isolationPatients && isolationPatients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isolationPatients.map((p: IsolationPatient) => (
                      <TableRow key={p.admissionId}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(ISOLATION_COLORS[p.isolationType])}
                          >
                            {ISOLATION_LABELS[p.isolationType] ?? p.isolationType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{p.patientName}</TableCell>
                        <TableCell>{p.mrn}</TableCell>
                        <TableCell>
                          {p.bed ? (
                            <Badge variant="secondary">{p.bed}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{p.ward ?? '—'}</TableCell>
                        <TableCell className="max-w-48 truncate">
                          {p.isolationReason ?? '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(p.isolationStartDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleEndIsolation(p.admissionId)}
                            disabled={endIsolation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Encerrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum paciente em isolamento.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Start Isolation Dialog */}
          <Dialog open={isolationDialogOpen} onOpenChange={setIsolationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Iniciar Isolamento</DialogTitle>
                <DialogDescription>
                  Selecione o tipo de isolamento e informe o motivo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">ID da Internação</label>
                  <Input
                    placeholder="UUID da internação"
                    value={isolationForm.admissionId}
                    onChange={(e) =>
                      setIsolationForm((prev) => ({ ...prev, admissionId: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Isolamento</label>
                  <Select
                    value={isolationForm.isolationType}
                    onValueChange={(val) =>
                      setIsolationForm((prev) => ({ ...prev, isolationType: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ISOLATION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label} — {ISOLATION_DESCRIPTIONS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Motivo</label>
                  <Input
                    placeholder="Motivo do isolamento"
                    value={isolationForm.reason}
                    onChange={(e) =>
                      setIsolationForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsolationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleStartIsolation} disabled={startIsolation.isPending}>
                  {startIsolation.isPending ? 'Salvando...' : 'Iniciar Isolamento'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Tab 3: Dashboard CCIH ─────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboardLoading ? (
            <PageLoading />
          ) : dashboardData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Bar Chart: Infections by Sector */}
                <Card>
                  <CardHeader>
                    <CardTitle>Taxa de Infecção por Setor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.infectionsBySector}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="sector" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" name="Infecções" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart: Top Microorganisms */}
                <Card>
                  <CardHeader>
                    <CardTitle>Microorganismos Mais Frequentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.topMicroorganisms}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                            }
                            outerRadius={80}
                            dataKey="count"
                            nameKey="name"
                          >
                            {dashboardData.topMicroorganisms.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
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
              </div>

              {/* Resistance Profile */}
              {resistanceTable.micros.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Perfil de Resistência</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Microorganismo</TableHead>
                          {resistanceTable.antibiotics.map((ab) => (
                            <TableHead key={ab} className="text-center text-xs">
                              {ab}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resistanceTable.micros.map((micro) => (
                          <TableRow key={micro}>
                            <TableCell className="font-medium text-sm">{micro}</TableCell>
                            {resistanceTable.antibiotics.map((ab) => {
                              const result = resistanceTable.matrix[micro]?.[ab];
                              return (
                                <TableCell key={ab} className="text-center">
                                  {result === 'SENSITIVE' && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">S</Badge>
                                  )}
                                  {result === 'RESISTANT' && (
                                    <Badge className="bg-red-500/20 text-red-400 text-xs">R</Badge>
                                  )}
                                  {result === 'INTERMEDIATE' && (
                                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">I</Badge>
                                  )}
                                  {!result && <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Infecções por Mês (Tendência)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardData.monthlyInfections}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Infecções"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: '#ef4444', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ── Tab 4: Notificação Compulsória ────────────────────────────────── */}
        <TabsContent value="notification" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nova Notificação Compulsória</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">ID do Paciente *</label>
                  <Input
                    placeholder="UUID do paciente"
                    value={notificationForm.patientId}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({ ...prev, patientId: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Doença *</label>
                  <Select
                    value={notificationForm.disease}
                    onValueChange={(val) => {
                      const disease = diseases?.find((d) => d.name === val);
                      setNotificationForm((prev) => ({
                        ...prev,
                        disease: val,
                        cidCode: disease?.cidCode ?? prev.cidCode,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a doença" />
                    </SelectTrigger>
                    <SelectContent>
                      {diseases?.map((d) => (
                        <SelectItem key={d.name} value={d.name}>
                          {d.name} ({d.cidCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">CID-10</label>
                  <Input
                    placeholder="Código CID-10"
                    value={notificationForm.cidCode}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({ ...prev, cidCode: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Data Notificação *</label>
                    <Input
                      type="date"
                      value={notificationForm.notificationDate}
                      onChange={(e) =>
                        setNotificationForm((prev) => ({ ...prev, notificationDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data Primeiros Sintomas *</label>
                    <Input
                      type="date"
                      value={notificationForm.symptomsDate}
                      onChange={(e) =>
                        setNotificationForm((prev) => ({ ...prev, symptomsDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Critério de Confirmação *</label>
                  <Select
                    value={notificationForm.confirmationCriteria}
                    onValueChange={(val) =>
                      setNotificationForm((prev) => ({ ...prev, confirmationCriteria: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o critério" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONFIRMATION_CRITERIA.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <Input
                    placeholder="Observações adicionais"
                    value={notificationForm.observations}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({ ...prev, observations: e.target.value }))
                    }
                  />
                </div>

                <Separator />

                <Button
                  onClick={handleCreateNotification}
                  disabled={createNotification.isPending}
                  className="w-full"
                >
                  {createNotification.isPending ? 'Registrando...' : 'Gerar Ficha SINAN'}
                </Button>
              </CardContent>
            </Card>

            {/* Notification List */}
            <Card>
              <CardHeader>
                <CardTitle>Notificações Enviadas ({notificationsData?.total ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {notificationsData?.data && notificationsData.data.length > 0 ? (
                  <div className="space-y-3">
                    {notificationsData.data.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="font-medium text-sm">{n.disease}</p>
                          <p className="text-xs text-muted-foreground">
                            CID: {n.cidCode} | Notificado em: {new Date(n.notificationDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Por: {n.notifiedBy}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(n.createdAt).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma notificação registrada.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
