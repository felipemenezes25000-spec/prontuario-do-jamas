import { useState } from 'react';
import {
  Network,
  Wifi,
  WifiOff,
  Plus,
  Play,
  ToggleLeft,
  ToggleRight,
  Download,
  XCircle,
  FileJson,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// services
import {
  useRNDSStatus,
  useRNDSHistory,
  useSendEncounter,
  type SubmissionStatus,
  type SubmissionType,
} from '@/services/rnds.service';
import {
  useSMARTApps,
  useRegisterSMARTApp,
  useLaunchSMARTApp,
  useToggleSMARTApp,
  type AppStatus,
} from '@/services/smart-on-fhir.service';
import {
  useCDSServices,
  useRegisterCDSService,
  useToggleCDSService,
  type HookType,
} from '@/services/cds-hooks.service';
import {
  useBulkExportJobs,
  useResourceTypes,
  useCreateExportJob,
  useCancelExportJob,
  type ExportJobStatus,
} from '@/services/bulk-fhir.service';
import {
  useIHEProfiles,
  useXDSDocuments,
  useATNAAuditTrail,
  type ComplianceStatus,
} from '@/services/ihe-profiles.service';
import {
  useHL7Connections,
  useHL7Messages,
  useHL7Stats,
  useCreateConnection,
  useTestConnection,
  type HL7ConnectionStatus,
  type HL7Direction,
  type HL7MessageType,
  type HL7MessageStatus,
} from '@/services/hl7-integration.service';

// ─── helpers ───────────────────────────────────────────────────────────────

function submissionStatusBadge(s: SubmissionStatus) {
  const map: Record<SubmissionStatus, string> = {
    ENVIADO: 'bg-blue-900/40 text-blue-300 border-blue-700',
    ACEITO: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    REJEITADO: 'bg-red-900/40 text-red-300 border-red-700',
    ERRO: 'bg-orange-900/40 text-orange-300 border-orange-700',
  };
  return map[s] ?? '';
}

const SUBMISSION_TYPE_LABEL: Record<SubmissionType, string> = {
  RESUMO_ATENDIMENTO: 'Resumo de Atendimento',
  VACINACAO: 'Vacinação',
  RESULTADO_EXAME: 'Resultado de Exame',
};

function exportStatusBadge(s: ExportJobStatus) {
  const map: Record<ExportJobStatus, string> = {
    EM_FILA: 'bg-gray-800 text-gray-300 border-gray-600',
    PROCESSANDO: 'bg-blue-900/40 text-blue-300 border-blue-700',
    CONCLUIDO: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    ERRO: 'bg-red-900/40 text-red-300 border-red-700',
    CANCELADO: 'bg-orange-900/40 text-orange-300 border-orange-700',
  };
  return map[s] ?? '';
}

const EXPORT_STATUS_LABEL: Record<ExportJobStatus, string> = {
  EM_FILA: 'Na Fila',
  PROCESSANDO: 'Processando',
  CONCLUIDO: 'Concluído',
  ERRO: 'Erro',
  CANCELADO: 'Cancelado',
};

function complianceBadge(s: ComplianceStatus) {
  const map: Record<ComplianceStatus, string> = {
    IMPLEMENTADO: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    PARCIAL: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    PENDENTE: 'bg-red-900/40 text-red-300 border-red-700',
  };
  return map[s] ?? '';
}

// ─── RNDS Tab ────────────────────────────────────────────────────────────────

function RNDSTab() {
  const { data: status } = useRNDSStatus();
  const { data: history = [], isLoading } = useRNDSHistory();
  const send = useSendEncounter();
  const [encounterId, setEncounterId] = useState('');

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <Wifi className="w-6 h-6 text-emerald-400" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
            <div>
              <p className="text-white font-medium">
                {status?.connected ? 'Conectado à RNDS' : 'Desconectado'}
              </p>
              <p className="text-xs text-gray-400">
                Ambiente: {status?.environment ?? '—'} · Certificado expira:{' '}
                {status?.certificateExpiry
                  ? new Date(status.certificateExpiry).toLocaleDateString('pt-BR')
                  : 'N/D'}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              'border',
              status?.connected
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                : 'bg-red-900/40 text-red-300 border-red-700',
            )}
          >
            {status?.connected ? 'Online' : 'Offline'}
          </Badge>
        </CardContent>
      </Card>

      {/* Send encounter */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Enviar Resumo de Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="ID do atendimento"
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
            />
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              disabled={!encounterId || send.isPending}
              onClick={() =>
                send.mutate(
                  { encounterId },
                  { onSuccess: () => { toast.success('Enviado à RNDS'); setEncounterId(''); } },
                )
              }
            >
              <Play className="w-4 h-4 mr-2" />
              {send.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Histórico de Envios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 text-center py-6">Carregando…</p>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Nenhum envio registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Paciente</TableHead>
                  <TableHead className="text-gray-400">CNS</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sub) => (
                  <TableRow key={sub.id} className="border-gray-700">
                    <TableCell className="text-white">{sub.patientName}</TableCell>
                    <TableCell className="text-gray-300 font-mono text-xs">{sub.patientCns}</TableCell>
                    <TableCell className="text-gray-300 text-sm">{SUBMISSION_TYPE_LABEL[sub.type]}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border', submissionStatusBadge(sub.status))}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">
                      {new Date(sub.submittedAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SMART on FHIR Tab ───────────────────────────────────────────────────────

function SMARTTab() {
  const { data: apps = [], isLoading } = useSMARTApps();
  const launch = useLaunchSMARTApp();
  const toggle = useToggleSMARTApp();
  const register = useRegisterSMARTApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', vendor: '', clientId: '', redirectUri: '', launchUrl: '', description: '', scopes: '' });

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      { ...form, scopes: form.scopes.split(' ').filter(Boolean) },
      { onSuccess: () => { toast.success('App registrado'); setDialogOpen(false); } },
    );
  }

  const appStatusClass: Record<AppStatus, string> = {
    ATIVO: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    INATIVO: 'bg-gray-800 text-gray-300 border-gray-600',
    PENDENTE: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Registrar App
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : apps.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Nenhum app SMART registrado.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">{app.name}</p>
                    <p className="text-gray-400 text-xs">{app.vendor}</p>
                  </div>
                  <Badge className={cn('text-xs border', appStatusClass[app.status])}>
                    {app.status}
                  </Badge>
                </div>
                <p className="text-gray-400 text-sm mb-3">{app.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {app.scopes.map((s) => (
                    <Badge key={s} className="text-xs bg-gray-800 text-gray-300 border-gray-600">{s}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={app.status !== 'ATIVO' || launch.isPending}
                    onClick={() =>
                      launch.mutate(app.id, {
                        onSuccess: (d) => { window.open(d.launchUrl, '_blank'); },
                      })
                    }
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Lançar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                    onClick={() =>
                      toggle.mutate(
                        { appId: app.id, status: app.status === 'ATIVO' ? 'INATIVO' : 'ATIVO' },
                        { onSuccess: () => toast.success('Status atualizado') },
                      )
                    }
                  >
                    {app.status === 'ATIVO' ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">Registrar App SMART on FHIR</DialogTitle></DialogHeader>
          <form onSubmit={handleRegister} className="space-y-3">
            {(['name', 'vendor', 'clientId', 'redirectUri', 'launchUrl'] as const).map((field) => (
              <div key={field}>
                <Label className="text-gray-300 capitalize">{field}</Label>
                <Input required className="bg-gray-800 border-gray-700 text-white mt-1" value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div>
              <Label className="text-gray-300">Scopes (separados por espaço)</Label>
              <Input className="bg-gray-800 border-gray-700 text-white mt-1" value={form.scopes} onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))} placeholder="patient/*.read launch" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={register.isPending}>{register.isPending ? 'Salvando…' : 'Registrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── CDS Hooks Tab ───────────────────────────────────────────────────────────

function CDSHooksTab() {
  const { data: services = [], isLoading } = useCDSServices();
  const toggle = useToggleCDSService();
  const register = useRegisterCDSService();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', hookType: 'patient-view' as HookType, description: '', endpointUrl: '', vendor: '' });

  const hookTypeLabel: Record<HookType, string> = {
    'patient-view': 'Patient View',
    'order-select': 'Order Select',
    'order-sign': 'Order Sign',
    'medication-prescribe': 'Medication Prescribe',
  };

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(form, {
      onSuccess: () => { toast.success('Serviço CDS registrado'); setDialogOpen(false); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Registrar Serviço
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Nome</TableHead>
              <TableHead className="text-gray-400">Hook</TableHead>
              <TableHead className="text-gray-400">Vendor</TableHead>
              <TableHead className="text-gray-400">Chamadas</TableHead>
              <TableHead className="text-gray-400">Resp. Média</TableHead>
              <TableHead className="text-gray-400">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((svc) => (
              <TableRow key={svc.id} className="border-gray-700">
                <TableCell className="text-white font-medium">{svc.name}</TableCell>
                <TableCell><Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">{hookTypeLabel[svc.hookType]}</Badge></TableCell>
                <TableCell className="text-gray-300 text-sm">{svc.vendor}</TableCell>
                <TableCell className="text-gray-300">{svc.totalCalls}</TableCell>
                <TableCell className="text-gray-300">{svc.avgResponseMs}ms</TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() =>
                      toggle.mutate(
                        { serviceId: svc.id, enabled: !svc.enabled },
                        { onSuccess: () => toast.success('Status atualizado') },
                      )
                    }
                  >
                    {svc.enabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">Registrar Serviço CDS Hooks</DialogTitle></DialogHeader>
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <Label className="text-gray-300">Nome</Label>
              <Input required className="bg-gray-800 border-gray-700 text-white mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-gray-300">Hook</Label>
              <Select value={form.hookType} onValueChange={(v) => setForm((f) => ({ ...f, hookType: v as HookType }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {Object.entries(hookTypeLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">URL do Endpoint</Label>
              <Input required className="bg-gray-800 border-gray-700 text-white mt-1" value={form.endpointUrl} onChange={(e) => setForm((f) => ({ ...f, endpointUrl: e.target.value }))} placeholder="https://" />
            </div>
            <div>
              <Label className="text-gray-300">Vendor</Label>
              <Input className="bg-gray-800 border-gray-700 text-white mt-1" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={register.isPending}>{register.isPending ? 'Salvando…' : 'Registrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bulk FHIR Tab ───────────────────────────────────────────────────────────

function BulkFHIRTab() {
  const { data: jobs = [], isLoading } = useBulkExportJobs();
  const { data: resourceTypes = [] } = useResourceTypes();
  const createJob = useCreateExportJob();
  const cancelJob = useCancelExportJob();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function toggleType(t: string) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createJob.mutate(
      { resourceTypes: selectedTypes, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      { onSuccess: () => { toast.success('Job de exportação iniciado'); setDialogOpen(false); setSelectedTypes([]); } },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Export
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Nenhum job de exportação.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Recursos</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Progresso</TableHead>
              <TableHead className="text-gray-400">Criado por</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="border-gray-700">
                <TableCell className="text-white text-sm">{job.resourceTypes.join(', ')}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', exportStatusBadge(job.status))}>
                    {EXPORT_STATUS_LABEL[job.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="text-gray-300 text-xs">{job.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{job.createdBy}</TableCell>
                <TableCell className="text-gray-300 text-sm">{new Date(job.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {job.downloadUrl && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:bg-blue-900/30" onClick={() => window.open(job.downloadUrl!, '_blank')}>
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    {(job.status === 'EM_FILA' || job.status === 'PROCESSANDO') && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-900/30" onClick={() => cancelJob.mutate(job.id, { onSuccess: () => toast.success('Job cancelado') })}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">Novo Job de Exportação FHIR</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Tipos de Recurso</Label>
              <div className="flex flex-wrap gap-2">
                {resourceTypes.map((rt) => (
                  <button
                    key={rt.type}
                    type="button"
                    onClick={() => toggleType(rt.type)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs border transition-colors',
                      selectedTypes.includes(rt.type)
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-emerald-600',
                    )}
                  >
                    {rt.type} ({rt.count})
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Data Inicial</Label>
                <Input type="date" className="bg-gray-800 border-gray-700 text-white mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-gray-300">Data Final</Label>
                <Input type="date" className="bg-gray-800 border-gray-700 text-white mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={selectedTypes.length === 0 || createJob.isPending}>{createJob.isPending ? 'Criando…' : 'Iniciar Export'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── IHE Profiles Tab ────────────────────────────────────────────────────────

function IHETab() {
  const { data: profiles = [], isLoading: loadingProfiles } = useIHEProfiles();
  const { data: documents = [], isLoading: loadingDocs } = useXDSDocuments();
  const { data: auditTrail = [], isLoading: loadingAudit } = useATNAAuditTrail();
  const [iheTab, setIheTab] = useState('profiles');

  return (
    <Tabs value={iheTab} onValueChange={setIheTab}>
      <TabsList className="bg-gray-800 border border-gray-700 mb-4">
        <TabsTrigger value="profiles" className="data-[state=active]:bg-gray-700 text-gray-300">Perfis IHE</TabsTrigger>
        <TabsTrigger value="xds" className="data-[state=active]:bg-gray-700 text-gray-300">Documentos XDS</TabsTrigger>
        <TabsTrigger value="atna" className="data-[state=active]:bg-gray-700 text-gray-300">Auditoria ATNA</TabsTrigger>
      </TabsList>

      <TabsContent value="profiles">
        {loadingProfiles ? <p className="text-gray-400 text-center py-8">Carregando…</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {profiles.map((p) => (
              <Card key={p.id} className="bg-gray-900 border-gray-700">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-white font-semibold">{p.acronym}</p>
                    <Badge className={cn('text-xs border', complianceBadge(p.complianceStatus))}>{p.complianceStatus}</Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{p.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{p.domain}</p>
                  {p.notes && <p className="text-gray-400 text-xs mt-2 italic">{p.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="xds">
        {loadingDocs ? <p className="text-gray-400 text-center py-8">Carregando…</p> : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-400">Paciente</TableHead>
                <TableHead className="text-gray-400">Título</TableHead>
                <TableHead className="text-gray-400">Classe</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} className="border-gray-700">
                  <TableCell className="text-white">{doc.patientName}</TableCell>
                  <TableCell className="text-gray-300 text-sm">{doc.title}</TableCell>
                  <TableCell className="text-gray-300 text-xs">{doc.classCode}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', doc.status === 'APROVADO' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-gray-800 text-gray-300 border-gray-600')}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">{new Date(doc.creationTime).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="atna">
        {loadingAudit ? <p className="text-gray-400 text-center py-8">Carregando…</p> : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-400">Evento</TableHead>
                <TableHead className="text-gray-400">Ação</TableHead>
                <TableHead className="text-gray-400">Resultado</TableHead>
                <TableHead className="text-gray-400">Usuário</TableHead>
                <TableHead className="text-gray-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditTrail.map((entry) => (
                <TableRow key={entry.id} className="border-gray-700">
                  <TableCell className="text-white text-sm">{entry.eventType}</TableCell>
                  <TableCell><Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">{entry.eventAction}</Badge></TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', entry.eventOutcome === 'SUCCESS' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-red-900/40 text-red-300 border-red-700')}>
                      {entry.eventOutcome === 'SUCCESS' ? 'Sucesso' : 'Falha'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">{entry.userId}</TableCell>
                  <TableCell className="text-gray-300 text-sm">{new Date(entry.timestamp).toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── HL7 v2 Tab ──────────────────────────────────────────────────────────────

const HL7_DIRECTION_LABEL: Record<HL7Direction, string> = {
  INBOUND: 'Entrada',
  OUTBOUND: 'Saída',
};

const HL7_MSG_STATUS_CLASS: Record<HL7MessageStatus, string> = {
  RECEIVED: 'bg-blue-900/40 text-blue-300 border-blue-700',
  PROCESSED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  ERROR: 'bg-red-900/40 text-red-300 border-red-700',
};

const HL7_CONN_STATUS_CLASS: Record<HL7ConnectionStatus, string> = {
  CONNECTED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  DISCONNECTED: 'bg-gray-800 text-gray-300 border-gray-600',
  ERROR: 'bg-red-900/40 text-red-300 border-red-700',
};

const HL7_CONN_STATUS_LABEL: Record<HL7ConnectionStatus, string> = {
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
  ERROR: 'Erro',
};

function HL7Tab() {
  const { data: connectionsData, isLoading } = useHL7Connections();
  const { data: stats } = useHL7Stats();
  const createConn = useCreateConnection();
  const testConn = useTestConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    host: string;
    port: string;
    direction: HL7Direction;
    messageType: HL7MessageType;
  }>({
    name: '',
    host: '',
    port: '2575',
    direction: 'INBOUND',
    messageType: 'ADT',
  });

  const connections = connectionsData?.data ?? [];

  const { data: messagesData, isLoading: loadingMessages } = useHL7Messages(
    selectedConnectionId,
    { pageSize: 20 },
  );
  const messages = messagesData?.data ?? [];

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createConn.mutate(
      { ...form, port: Number(form.port) },
      {
        onSuccess: () => {
          toast.success('Conexão HL7 criada');
          setDialogOpen(false);
          setForm({ name: '', host: '', port: '2575', direction: 'INBOUND', messageType: 'ADT' });
        },
        onError: () => toast.error('Erro ao criar conexão'),
      },
    );
  }

  function handleTest(id: string) {
    testConn.mutate(id, {
      onSuccess: (res) => {
        if (res.success) {
          toast.success(`Conexão OK — latência ${res.latencyMs}ms`);
        } else {
          toast.error(`Falha: ${res.error ?? 'Erro desconhecido'}`);
        }
      },
      onError: () => toast.error('Erro ao testar conexão'),
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Conexões Ativas', value: stats.activeConnections },
            { label: 'Total Conexões', value: stats.totalConnections },
            { label: 'Mensagens Processadas', value: stats.totalMessagesProcessed.toLocaleString('pt-BR') },
            { label: 'Taxa de Erro', value: `${stats.errorRate.toFixed(1)}%` },
          ].map((s) => (
            <Card key={s.label} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connections */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Conexões HL7 v2</CardTitle>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Conexão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 text-center py-6">Carregando…</p>
          ) : connections.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Nenhuma conexão configurada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Host</TableHead>
                  <TableHead className="text-gray-400">Porta</TableHead>
                  <TableHead className="text-gray-400">Direção</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Mensagens</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow
                    key={conn.id}
                    className={cn(
                      'border-gray-700 cursor-pointer',
                      selectedConnectionId === conn.id && 'bg-gray-800/50',
                    )}
                    onClick={() =>
                      setSelectedConnectionId((prev) => (prev === conn.id ? '' : conn.id))
                    }
                  >
                    <TableCell className="text-white font-medium">{conn.name}</TableCell>
                    <TableCell className="text-gray-300 font-mono text-xs">{conn.host}</TableCell>
                    <TableCell className="text-gray-300 font-mono text-xs">{conn.port}</TableCell>
                    <TableCell>
                      <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                        {HL7_DIRECTION_LABEL[conn.direction]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                        {conn.messageType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn('text-xs border', HL7_CONN_STATUS_CLASS[conn.status])}
                      >
                        {HL7_CONN_STATUS_LABEL[conn.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">
                      {conn.messagesProcessed.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 h-7 text-xs"
                        disabled={testConn.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTest(conn.id);
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Testar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Messages for selected connection */}
      {selectedConnectionId && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">
              Mensagens Recentes —{' '}
              {connections.find((c) => c.id === selectedConnectionId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <p className="text-gray-400 text-center py-4">Carregando…</p>
            ) : messages.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nenhuma mensagem registrada.</p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/50 transition-colors"
                      onClick={() =>
                        setExpandedMsg((prev) => (prev === msg.id ? null : msg.id))
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn('text-xs border', HL7_MSG_STATUS_CLASS[msg.status])}
                        >
                          {msg.status}
                        </Badge>
                        <span className="text-white text-sm font-mono">
                          {msg.messageType} — {msg.triggerEvent}
                        </span>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {msg.processedAt
                          ? new Date(msg.processedAt).toLocaleString('pt-BR')
                          : '—'}
                      </span>
                    </button>
                    {expandedMsg === msg.id && (
                      <div className="border-t border-gray-700 px-4 py-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                          Mensagem HL7 Raw
                        </p>
                        <pre className="text-xs text-emerald-300 bg-gray-950 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                          {msg.rawMessage}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Connection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Conexão HL7 v2</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-gray-300">Nome da Conexão</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Ex: LIS Integration"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Host</Label>
                <Input
                  required
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder="192.168.1.100"
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-gray-300">Porta</Label>
                <Input
                  required
                  type="number"
                  min={1}
                  max={65535}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Direção</Label>
                <Select
                  value={form.direction}
                  onValueChange={(v) => setForm((f) => ({ ...f, direction: v as HL7Direction }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="INBOUND" className="text-white">Entrada (INBOUND)</SelectItem>
                    <SelectItem value="OUTBOUND" className="text-white">Saída (OUTBOUND)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Tipo de Mensagem</Label>
                <Select
                  value={form.messageType}
                  onValueChange={(v) => setForm((f) => ({ ...f, messageType: v as HL7MessageType }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {(['ADT', 'ORM', 'ORU', 'DFT'] as HL7MessageType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-600 text-gray-300"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={createConn.isPending}
              >
                {createConn.isPending ? 'Criando…' : 'Criar Conexão'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InteroperabilityPage() {
  const [tab, setTab] = useState('rnds');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center">
          <Network className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Interoperabilidade</h1>
          <p className="text-sm text-gray-400">RNDS, SMART on FHIR, CDS Hooks, Bulk FHIR e IHE</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto gap-1">
          <TabsTrigger value="rnds" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Zap className="w-4 h-4 mr-2" /> RNDS
          </TabsTrigger>
          <TabsTrigger value="smart" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Play className="w-4 h-4 mr-2" /> SMART on FHIR
          </TabsTrigger>
          <TabsTrigger value="cds" className="data-[state=active]:bg-gray-700 text-gray-300">
            <AlertCircle className="w-4 h-4 mr-2" /> CDS Hooks
          </TabsTrigger>
          <TabsTrigger value="bulk" className="data-[state=active]:bg-gray-700 text-gray-300">
            <FileJson className="w-4 h-4 mr-2" /> Bulk FHIR
          </TabsTrigger>
          <TabsTrigger value="ihe" className="data-[state=active]:bg-gray-700 text-gray-300">
            <CheckCircle2 className="w-4 h-4 mr-2" /> IHE
          </TabsTrigger>
          <TabsTrigger value="hl7" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Network className="w-4 h-4 mr-2" /> HL7 v2
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rnds"><RNDSTab /></TabsContent>
        <TabsContent value="smart"><SMARTTab /></TabsContent>
        <TabsContent value="cds"><CDSHooksTab /></TabsContent>
        <TabsContent value="bulk"><BulkFHIRTab /></TabsContent>
        <TabsContent value="ihe"><IHETab /></TabsContent>
        <TabsContent value="hl7"><HL7Tab /></TabsContent>
      </Tabs>
    </div>
  );
}
