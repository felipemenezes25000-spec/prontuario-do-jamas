import { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useIncidents,
  useIncidentDashboard,
  useActionPlans,
  useCreateIncident,
  useUpdateIncidentStatus,
  useCreateActionPlan,
} from '@/services/incident-reporting.service';
import type {
  Incident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from '@/services/incident-reporting.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<IncidentType, string> = {
  MEDICATION: 'Medicação', FALL: 'Queda', PROCEDURE: 'Procedimento',
  IDENTIFICATION: 'Identificação', INFECTION: 'Infecção', EQUIPMENT: 'Equipamento',
  COMMUNICATION: 'Comunicação', OTHER: 'Outro',
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; className: string }> = {
  NEAR_MISS: { label: 'Quase Falha', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  MILD: { label: 'Leve', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  MODERATE: { label: 'Moderado', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  SEVERE: { label: 'Grave', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  SENTINEL: { label: 'Sentinela', className: 'bg-red-700/30 text-red-300 border-red-700/50' },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  OPEN: { label: 'Aberto', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  INVESTIGATING: { label: 'Investigando', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  RESOLVED: { label: 'Resolvido', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  CLOSED: { label: 'Encerrado', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

const ACTION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  COMPLETED: { label: 'Concluído', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  OVERDUE: { label: 'Atrasado', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── New Incident Dialog ─────────────────────────────────────────────────────

function NewIncidentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateIncident();
  const [form, setForm] = useState({
    type: 'OTHER' as IncidentType,
    severity: 'MILD' as IncidentSeverity,
    title: '',
    description: '',
    location: '',
    patientId: '',
  });

  const handleSubmit = () => {
    if (!form.title || !form.description || !form.location) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    create.mutate(
      { ...form, patientId: form.patientId || undefined },
      {
        onSuccess: () => {
          toast.success('Incidente notificado com sucesso!');
          onClose();
          setForm({ type: 'OTHER', severity: 'MILD', title: '', description: '', location: '', patientId: '' });
        },
        onError: () => toast.error('Erro ao registrar incidente.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Notificar Incidente</DialogTitle>
          <DialogDescription>Registro de evento adverso ou quase falha</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo de Incidente *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as IncidentType })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(Object.entries(TYPE_LABELS) as [IncidentType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Gravidade *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as IncidentSeverity })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(Object.entries(SEVERITY_CONFIG) as [IncidentSeverity, { label: string }][]).map(([v, { label }]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Descrição resumida do incidente" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Descrição Detalhada *</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o que aconteceu, como e quais foram as consequências..."
              rows={4}
              className="w-full rounded-md bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <Label>Local *</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="ex: UTI — Leito 5, Corredor 3° andar" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>ID do Paciente (opcional)</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              placeholder="Deixe em branco se não envolver paciente" className="bg-zinc-950 border-zinc-700" />
          </div>
          {(form.severity === 'SEVERE' || form.severity === 'SENTINEL') && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">
                {form.severity === 'SENTINEL'
                  ? 'Evento sentinela — A liderança será notificada imediatamente.'
                  : 'Incidente grave — Requer investigação prioritária.'}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Notificando...' : 'Notificar Incidente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Action Plan Panel ───────────────────────────────────────────────────────

function ActionPlanPanel({ incident }: { incident: Incident }) {
  const { data: plans = [] } = useActionPlans(incident.id);
  const createPlan = useCreateActionPlan();
  const updateStatus = useUpdateIncidentStatus();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ action: '', responsible: '', dueDate: '' });

  const handleAddPlan = () => {
    if (!form.action || !form.responsible || !form.dueDate) {
      toast.error('Preencha todos os campos do plano de ação.');
      return;
    }
    createPlan.mutate(
      { incidentId: incident.id, ...form },
      {
        onSuccess: () => { toast.success('Ação adicionada!'); setShowForm(false); setForm({ action: '', responsible: '', dueDate: '' }); },
        onError: () => toast.error('Erro ao adicionar ação.'),
      },
    );
  };

  const handleUpdateStatus = (newStatus: IncidentStatus) => {
    updateStatus.mutate(
      { id: incident.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus].label}`),
        onError: () => toast.error('Erro ao atualizar status.'),
      },
    );
  };

  return (
    <div className="space-y-4 mt-3">
      <div className="flex gap-2">
        {(['INVESTIGATING', 'RESOLVED', 'CLOSED'] as IncidentStatus[])
          .filter((s) => s !== incident.status)
          .map((s) => (
            <Button key={s} size="sm" variant="outline" className="border-zinc-700 text-xs"
              onClick={() => handleUpdateStatus(s)}>
              Mover para: {STATUS_CONFIG[s].label}
            </Button>
          ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Plano de Ação ({plans.length})</p>
        <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Ação
        </Button>
      </div>
      {showForm && (
        <div className="rounded-lg border border-zinc-700 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Ação *</Label>
              <Input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}
                placeholder="Descreva a ação corretiva" className="bg-zinc-950 border-zinc-700 h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Responsável *</Label>
              <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                placeholder="Nome ou setor" className="bg-zinc-950 border-zinc-700 h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prazo *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="bg-zinc-950 border-zinc-700 h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddPlan} disabled={createPlan.isPending}>
              {createPlan.isPending ? 'Salvando...' : 'Salvar Ação'}
            </Button>
          </div>
        </div>
      )}
      {plans.length > 0 && (
        <div className="space-y-2">
          {plans.map((plan) => {
            const cfg = ACTION_STATUS_CONFIG[plan.status] ?? ACTION_STATUS_CONFIG.PENDING;
            return (
              <div key={plan.id} className="flex items-start justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="flex items-start gap-2">
                  {plan.status === 'COMPLETED'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    : plan.status === 'OVERDUE'
                      ? <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      : <Clock className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-sm">{plan.action}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {plan.responsible} · Prazo: {new Date(plan.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn(cfg?.className, 'shrink-0 ml-2 text-xs')}>{cfg?.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IncidentReportingPage() {
  const [newDialog, setNewDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: incidents = [], isLoading } = useIncidents(
    Object.fromEntries(Object.entries({ status: statusFilter, type: typeFilter }).filter(([, v]) => v)),
  );
  const { data: dashboard } = useIncidentDashboard();

  const filtered = incidents.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.location.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-yellow-400" />
          <h1 className="text-2xl font-bold">Notificação de Incidentes</h1>
        </div>
        <Button onClick={() => setNewDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Notificar Incidente
        </Button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Abertos', count: dashboard.totalOpen, color: 'text-yellow-400' },
            { label: 'Investigando', count: dashboard.totalInvestigating, color: 'text-blue-400' },
            { label: 'Resolvidos', count: dashboard.totalResolved, color: 'text-green-400' },
            { label: 'Encerrados', count: dashboard.totalClosed, color: 'text-zinc-400' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-400">{label}</p>
                <p className={cn('text-2xl font-bold', color)}>{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="notifications">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
          <TabsTrigger value="actions">Plano de Ação</TabsTrigger>
        </TabsList>

        {/* Notificações */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou local..."
                className="pl-9 bg-zinc-900 border-zinc-700" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="">Todos os status</SelectItem>
                {(Object.entries(STATUS_CONFIG) as [IncidentStatus, { label: string }][]).map(([v, { label }]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="">Todos os tipos</SelectItem>
                {(Object.entries(TYPE_LABELS) as [IncidentType, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum incidente encontrado</p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filtered.map((incident) => (
                    <div key={incident.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={SEVERITY_CONFIG[incident.severity].className}>
                              {SEVERITY_CONFIG[incident.severity].label}
                            </Badge>
                            <Badge variant="outline" className="bg-zinc-700 text-zinc-300 border-zinc-600 text-xs">
                              {TYPE_LABELS[incident.type]}
                            </Badge>
                            <Badge variant="outline" className={STATUS_CONFIG[incident.status].className}>
                              {STATUS_CONFIG[incident.status].label}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm">{incident.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{incident.location} · {formatDate(incident.reportedAt)}</p>
                          {incident.patientName && (
                            <p className="text-xs text-zinc-500 mt-0.5">Paciente: {incident.patientName}</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="border-zinc-700 shrink-0"
                          onClick={() => setSelectedIncident(selectedIncident?.id === incident.id ? null : incident)}>
                          {selectedIncident?.id === incident.id ? 'Fechar' : 'Gerenciar'}
                        </Button>
                      </div>
                      {selectedIncident?.id === incident.id && <ActionPlanPanel incident={incident} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análise */}
        <TabsContent value="analysis" className="mt-4">
          {!dashboard ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-10 text-center text-zinc-500">Carregando dados de análise...</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" /> Por Tipo de Incidente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.byType.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-4">Sem dados disponíveis</p>
                  ) : (
                    dashboard.byType.map(({ type, count }) => {
                      const max = Math.max(...dashboard.byType.map((t) => t.count), 1);
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-zinc-400">{TYPE_LABELS[type]}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-700">
                            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" /> Por Gravidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.bySeverity.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-4">Sem dados disponíveis</p>
                  ) : (
                    dashboard.bySeverity.map(({ severity, count }) => {
                      const max = Math.max(...dashboard.bySeverity.map((s) => s.count), 1);
                      const cfg = SEVERITY_CONFIG[severity];
                      return (
                        <div key={severity}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-zinc-400">{cfg.label}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-700">
                            <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Plano de Ação */}
        <TabsContent value="actions" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-emerald-400" /> Incidentes — Selecione para gerenciar o plano de ação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notificado em</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((i) => (
                    <TableRow key={i.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-medium max-w-xs truncate">{i.title}</TableCell>
                      <TableCell className="text-zinc-400">{TYPE_LABELS[i.type]}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SEVERITY_CONFIG[i.severity].className}>
                          {SEVERITY_CONFIG[i.severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CONFIG[i.status].className}>
                          {STATUS_CONFIG[i.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400">{formatDate(i.reportedAt)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="border-zinc-700"
                          onClick={() => setSelectedIncident(selectedIncident?.id === i.id ? null : i)}>
                          {selectedIncident?.id === i.id ? 'Fechar' : 'Plano de Ação'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedIncident && (
                <div className="p-4 border-t border-zinc-800">
                  <p className="text-sm font-medium mb-3">{selectedIncident.title}</p>
                  <ActionPlanPanel incident={selectedIncident} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewIncidentDialog open={newDialog} onClose={() => setNewDialog(false)} />
    </div>
  );
}
