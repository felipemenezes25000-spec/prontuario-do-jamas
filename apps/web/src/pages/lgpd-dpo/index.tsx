import { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Eye,
  Plus,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  useDpoDashboard,
  useSubjectRequests,
  useCreateSubjectRequest,
  useUpdateSubjectRequest,
  useDataIncidents,
  useCreateDataIncident,
  useDpias,
  useCreateDpia,
  type SubjectRequestStatus,
  type SubjectRequestType,
  type IncidentSeverity,
  type DataIncident,
  type Dpia,
} from '@/services/lgpd-dpo.service';

// ============================================================================
// Score Ring Component
// ============================================================================

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color =
    value >= 80
      ? 'text-emerald-400'
      : value >= 60
        ? 'text-yellow-400'
        : 'text-red-400';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-4xl font-bold ${color}`}>{value}%</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================================================
// Status Badge Helpers
// ============================================================================

function requestStatusBadge(status: SubjectRequestStatus) {
  const map: Record<
    SubjectRequestStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    PENDING: { label: 'Pendente', variant: 'secondary' },
    IN_PROGRESS: { label: 'Em Andamento', variant: 'default' },
    COMPLETED: { label: 'Concluída', variant: 'outline' },
    DENIED: { label: 'Negada', variant: 'destructive' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function severityBadge(severity: IncidentSeverity) {
  const map: Record<
    IncidentSeverity,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    LOW: { label: 'Baixa', variant: 'outline' },
    MEDIUM: { label: 'Media', variant: 'secondary' },
    HIGH: { label: 'Alta', variant: 'default' },
    CRITICAL: { label: 'Critica', variant: 'destructive' },
  };
  const cfg = map[severity];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function riskLevelBadge(level: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    LOW: { label: 'Baixo', variant: 'outline' },
    MEDIUM: { label: 'Medio', variant: 'secondary' },
    HIGH: { label: 'Alto', variant: 'destructive' },
  };
  const cfg = map[level] ?? { label: level, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const REQUEST_TYPE_LABELS: Record<SubjectRequestType, string> = {
  ACCESS: 'Acesso',
  PORTABILITY: 'Portabilidade',
  DELETION: 'Exclusao',
  RECTIFICATION: 'Retificacao',
  ANONYMIZATION: 'Anonimizacao',
  OBJECTION: 'Oposicao',
};

// ============================================================================
// Create Subject Request Dialog
// ============================================================================

function CreateRequestDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SubjectRequestType>('ACCESS');
  const [patientId, setPatientId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateSubjectRequest();

  const handleSubmit = () => {
    if (!patientId || !requestedBy || !description) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    mutation.mutate(
      { type, patientId, requestedBy, description },
      {
        onSuccess: () => {
          toast.success('Solicitacao criada com sucesso');
          setOpen(false);
          setPatientId('');
          setRequestedBy('');
          setDescription('');
        },
        onError: () => toast.error('Erro ao criar solicitacao'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Nova Solicitacao
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Solicitacao do Titular</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as SubjectRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REQUEST_TYPE_LABELS) as SubjectRequestType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {REQUEST_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ID do Paciente</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="UUID do paciente" />
          </div>
          <div>
            <Label>Solicitado por</Label>
            <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} placeholder="Nome do solicitante" />
          </div>
          <div>
            <Label>Descricao</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva a solicitacao..." rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Solicitacao
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Create Incident Dialog
// ============================================================================

function CreateIncidentDialog() {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<IncidentSeverity>('LOW');
  const [affectedRecords, setAffectedRecords] = useState('');
  const [description, setDescription] = useState('');
  const [containmentActions, setContainmentActions] = useState('');
  const [notifiedAnpd, setNotifiedAnpd] = useState(false);
  const mutation = useCreateDataIncident();

  const handleSubmit = () => {
    if (!description || !containmentActions) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    mutation.mutate(
      {
        severity,
        affectedRecords: parseInt(affectedRecords) || 0,
        description,
        containmentActions,
        notifiedAnpd,
      },
      {
        onSuccess: () => {
          toast.success('Incidente registrado com sucesso');
          setOpen(false);
          setDescription('');
          setContainmentActions('');
          setAffectedRecords('');
        },
        onError: () => toast.error('Erro ao registrar incidente'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="gap-1">
          <AlertTriangle className="h-4 w-4" />
          Registrar Incidente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Incidente de Dados</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Severidade</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Baixa</SelectItem>
                <SelectItem value="MEDIUM">Media</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="CRITICAL">Critica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Registros Afetados</Label>
            <Input type="number" value={affectedRecords} onChange={(e) => setAffectedRecords(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Descricao</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o incidente..." rows={3} />
          </div>
          <div>
            <Label>Acoes de Contencao</Label>
            <Textarea value={containmentActions} onChange={(e) => setContainmentActions(e.target.value)} placeholder="Descreva as acoes tomadas..." rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notifiedAnpd"
              checked={notifiedAnpd}
              onChange={(e) => setNotifiedAnpd(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="notifiedAnpd">ANPD notificada</Label>
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="w-full" variant="destructive">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Incidente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Create DPIA Dialog
// ============================================================================

function CreateDpiaDialog() {
  const [open, setOpen] = useState(false);
  const [processName, setProcessName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [dataCategories, setDataCategories] = useState('');
  const [risks, setRisks] = useState('');
  const [mitigationMeasures, setMitigationMeasures] = useState('');
  const mutation = useCreateDpia();

  const handleSubmit = () => {
    if (!processName || !purpose) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    mutation.mutate(
      {
        processName,
        purpose,
        dataCategories: dataCategories.split('\n').filter(Boolean),
        risks: risks.split('\n').filter(Boolean),
        mitigationMeasures: mitigationMeasures.split('\n').filter(Boolean),
      },
      {
        onSuccess: () => {
          toast.success('DPIA gerado com sucesso');
          setOpen(false);
          setProcessName('');
          setPurpose('');
          setDataCategories('');
          setRisks('');
          setMitigationMeasures('');
        },
        onError: () => toast.error('Erro ao gerar DPIA'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <FileText className="h-4 w-4" />
          Novo DPIA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Avaliacao de Impacto a Protecao de Dados</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Processo</Label>
            <Input value={processName} onChange={(e) => setProcessName(e.target.value)} placeholder="Ex: Processamento de dados biometricos" />
          </div>
          <div>
            <Label>Finalidade</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Finalidade do tratamento de dados..." rows={2} />
          </div>
          <div>
            <Label>Categorias de Dados (uma por linha)</Label>
            <Textarea value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} placeholder="HEALTH_RECORDS&#10;PERSONAL_IDENTIFICATION" rows={3} />
          </div>
          <div>
            <Label>Riscos Identificados (um por linha)</Label>
            <Textarea value={risks} onChange={(e) => setRisks(e.target.value)} placeholder="Vazamento de dados sensiveis&#10;Acesso nao autorizado" rows={3} />
          </div>
          <div>
            <Label>Medidas de Mitigacao (uma por linha)</Label>
            <Textarea value={mitigationMeasures} onChange={(e) => setMitigationMeasures(e.target.value)} placeholder="Criptografia em repouso&#10;Controle de acesso granular" rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar DPIA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Incidents Timeline
// ============================================================================

function IncidentsTimeline({ incidents }: { incidents: DataIncident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mb-2 opacity-30" />
        <p>Nenhum incidente registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => (
        <div key={incident.id} className="relative pl-6 border-l-2 border-gray-700">
          <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-gray-800 border-2 border-emerald-500" />
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {severityBadge(incident.severity)}
                <Badge variant="outline">{incident.status}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(incident.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="text-sm text-gray-300 mb-1">{incident.description}</p>
            <p className="text-xs text-muted-foreground">
              {incident.affectedRecords} registros afetados
              {incident.notifiedAnpd ? ' | ANPD notificada' : ' | ANPD NAO notificada'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DPIA List
// ============================================================================

function DpiaList({ dpias }: { dpias: Dpia[] }) {
  if (dpias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-2 opacity-30" />
        <p>Nenhuma DPIA gerada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dpias.map((dpia) => (
        <div key={dpia.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-200">{dpia.processName}</h4>
            <div className="flex items-center gap-2">
              {riskLevelBadge(dpia.riskLevel)}
              <span className="text-xs text-muted-foreground">
                {new Date(dpia.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-2">{dpia.purpose}</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{dpia.dataCategories.length} categorias</span>
            <span>{dpia.risks.length} riscos</span>
            <span>{dpia.mitigationMeasures.length} mitigacoes</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LgpdDpoPage() {
  const dashboard = useDpoDashboard();
  const subjectRequests = useSubjectRequests();
  const incidents = useDataIncidents();
  const dpias = useDpias();
  const updateRequest = useUpdateSubjectRequest();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredRequests = (subjectRequests.data ?? []).filter((r) =>
    statusFilter === 'ALL' ? true : r.status === statusFilter,
  );

  const handleUpdateStatus = (requestId: string, status: SubjectRequestStatus) => {
    updateRequest.mutate(
      { requestId, status },
      {
        onSuccess: () => toast.success('Status atualizado'),
        onError: () => toast.error('Erro ao atualizar status'),
      },
    );
  };

  const isLoading = dashboard.isLoading;
  const data = dashboard.data;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-7 w-7 text-emerald-500" />
              Painel do DPO — LGPD
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Encarregado de Protecao de Dados — Lei 13.709/2018
            </p>
          </div>
          <div className="flex gap-2">
            <CreateRequestDialog />
            <CreateIncidentDialog />
            <CreateDpiaDialog />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Consentimentos Ativos
              </CardTitle>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400">
                {isLoading ? '...' : data?.activeConsents ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {data?.totalConsents ?? 0} total ({data?.revokedConsents ?? 0} revogados)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Solicitacoes Pendentes
              </CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">
                {isLoading ? '...' : data?.pendingSubjectRequests.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Prazo LGPD: 15 dias (Art. 18)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Incidentes
              </CardTitle>
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">
                {incidents.isLoading ? '...' : incidents.data?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Registros de violacao de dados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Score de Conformidade
              </CardTitle>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <ScoreRing
                value={data?.complianceScore ?? 0}
                label="Conformidade LGPD"
              />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="overview">Visao Geral</TabsTrigger>
            <TabsTrigger value="requests">Solicitacoes</TabsTrigger>
            <TabsTrigger value="incidents">Incidentes</TabsTrigger>
            <TabsTrigger value="dpia">DPIA</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Data Access Chart */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Acessos a Dados (Ultimos 30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(data?.dataAccessLogsByDay ?? []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data?.dataAccessLogsByDay ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: 8,
                            color: '#e5e7eb',
                          }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Sem dados de acesso no periodo
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Consents by Type */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Consentimentos por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(data?.consentsByType ?? []).length > 0 ? (
                    <div className="space-y-3">
                      {(data?.consentsByType ?? []).map((c) => (
                        <div key={c.type} className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">{c.type.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded-full bg-emerald-500/20 w-32">
                              <div
                                className="h-2 rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.min((c.count / (data?.totalConsents || 1)) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-mono text-gray-400 w-8 text-right">
                              {c.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Sem consentimentos registrados
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Categories at Risk */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Categorias em Risco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(data?.categoriesAtRisk ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {(data?.categoriesAtRisk ?? []).map((cat) => (
                        <div
                          key={cat}
                          className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2"
                        >
                          <XCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                          <span className="text-sm text-yellow-300">
                            {cat.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            Sem consentimento ativo
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-emerald-400">
                      <CheckCircle2 className="h-8 w-8 mb-2" />
                      <p className="text-sm">Todas as categorias cobertas</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Resumo (Ultimos 90 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Anonimizacoes realizadas</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {data?.anonymizationsPerformed ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total de consentimentos</span>
                    <span className="text-lg font-bold text-gray-200">
                      {data?.totalConsents ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Consentimentos revogados</span>
                    <span className="text-lg font-bold text-red-400">
                      {data?.revokedConsents ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">DPIAs gerados</span>
                    <span className="text-lg font-bold text-gray-200">
                      {dpias.data?.length ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subject Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Solicitacoes do Titular (LGPD Art. 18)
                </CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                    <SelectItem value="COMPLETED">Concluidas</SelectItem>
                    <SelectItem value="DENIED">Negadas</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {subjectRequests.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-2 opacity-30" />
                    <p>Nenhuma solicitacao encontrada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-gray-400">Tipo</TableHead>
                        <TableHead className="text-gray-400">Solicitante</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Prazo</TableHead>
                        <TableHead className="text-gray-400">Criado em</TableHead>
                        <TableHead className="text-gray-400">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow key={req.id} className="border-gray-800">
                          <TableCell>
                            <Badge variant="outline">
                              {REQUEST_TYPE_LABELS[req.type] ?? req.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">{req.requestedBy}</TableCell>
                          <TableCell>{requestStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {req.deadline
                              ? new Date(req.deadline).toLocaleDateString('pt-BR')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {req.status === 'PENDING' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(req.id, 'IN_PROGRESS')}
                                  disabled={updateRequest.isPending}
                                >
                                  Iniciar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUpdateStatus(req.id, 'DENIED')}
                                  disabled={updateRequest.isPending}
                                >
                                  Negar
                                </Button>
                              </div>
                            )}
                            {req.status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(req.id, 'COMPLETED')}
                                disabled={updateRequest.isPending}
                              >
                                Concluir
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-400">
                  Incidentes de Dados (LGPD Art. 48)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incidents.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <IncidentsTimeline incidents={incidents.data ?? []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DPIA Tab */}
          <TabsContent value="dpia" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-400">
                  Avaliacoes de Impacto (LGPD Art. 38)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dpias.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <DpiaList dpias={dpias.data ?? []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
