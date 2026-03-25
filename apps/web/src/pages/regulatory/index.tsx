import { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
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
import {
  useSINANNotifications,
  useCreateSINANNotification,
  useCreateNOTIVISAReport,
  useANSIndicators,
  useRegulatoryDashboard,
  type SINANNotification,
} from '@/services/regulatory-reports.service';

// ─── helpers ────────────────────────────────────────────────────────────────

type SinanStatus = SINANNotification['status'];

function sinanStatusBadge(s: SinanStatus) {
  const map: Record<SinanStatus, string> = {
    DRAFT: 'bg-gray-800 text-gray-300 border-gray-600',
    SUBMITTED: 'bg-blue-900/40 text-blue-300 border-blue-700',
    CONFIRMED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    DISCARDED: 'bg-red-900/40 text-red-300 border-red-700',
  };
  return map[s] ?? '';
}

const SINAN_STATUS_LABEL: Record<SinanStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Notificado',
  CONFIRMED: 'Confirmado',
  DISCARDED: 'Descartado',
};

const NOTIVISA_EVENT_TYPES = [
  'REACAO_ADVERSA',
  'QUEIXA_TECNICA',
  'DESVIO_QUALIDADE',
  'ERRO_MEDICACAO',
  'EVENTO_SENTINELA',
];

const NOTIVISA_SEVERITY = ['LEVE', 'MODERADO', 'GRAVE', 'OBITO'];

const SINAN_DISEASES = [
  { code: 'A90', name: 'Dengue' },
  { code: 'A92.0', name: 'Chikungunya' },
  { code: 'A928', name: 'Zika' },
  { code: 'A37', name: 'Coqueluche' },
  { code: 'A95', name: 'Febre Amarela' },
  { code: 'B54', name: 'Malária' },
  { code: 'A00', name: 'Cólera' },
  { code: 'A22', name: 'Antraz' },
  { code: 'J09', name: 'Influenza Aviária' },
  { code: 'U07.1', name: 'COVID-19' },
];

// ─── SINAN Tab ───────────────────────────────────────────────────────────────

function SINANTab() {
  const { data, isLoading } = useSINANNotifications({ pageSize: 30 });
  const create = useCreateSINANNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    diseaseCode: '',
    diseaseName: '',
    notificationDate: new Date().toISOString().slice(0, 10),
    symptomsOnsetDate: '',
    encounterId: '',
  });

  const notifications = data?.data ?? [];

  function handleDiseaseSelect(code: string) {
    const disease = SINAN_DISEASES.find((d) => d.code === code);
    setForm((f) => ({
      ...f,
      diseaseCode: code,
      diseaseName: disease?.name ?? '',
    }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        patientId: form.patientId,
        diseaseCode: form.diseaseCode,
        diseaseName: form.diseaseName,
        notificationDate: form.notificationDate,
        symptomsOnsetDate: form.symptomsOnsetDate || undefined,
        encounterId: form.encounterId || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Notificação SINAN registrada com sucesso');
          setDialogOpen(false);
          setForm({
            patientId: '',
            diseaseCode: '',
            diseaseName: '',
            notificationDate: new Date().toISOString().slice(0, 10),
            symptomsOnsetDate: '',
            encounterId: '',
          });
        },
        onError: () => toast.error('Erro ao registrar notificação'),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Notificações Compulsórias — SINAN</h2>
          <p className="text-gray-400 text-sm">
            Sistema de Informação de Agravos de Notificação (SVS/MS)
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Notificação
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="text-gray-400 text-center py-8">Carregando…</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma notificação compulsória registrada.</p>
              <p className="text-gray-500 text-sm mt-1">
                Registre doenças de notificação obrigatória conforme a Portaria GM/MS nº 217/2023.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Agravo / CID</TableHead>
                  <TableHead className="text-gray-400">Paciente</TableHead>
                  <TableHead className="text-gray-400">Data da Notificação</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.notificationId} className="border-gray-700">
                    <TableCell>
                      <p className="text-white font-medium">{n.diseaseName}</p>
                      <p className="text-gray-400 text-xs font-mono">{n.diseaseCode}</p>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {n.patientName ?? '—'}
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">
                      {n.notificationDate
                        ? new Date(n.notificationDate).toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn('text-xs border', sinanStatusBadge(n.status))}
                      >
                        {SINAN_STATUS_LABEL[n.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Notificação Compulsória (SINAN)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-gray-300">Agravo</Label>
              <Select value={form.diseaseCode} onValueChange={handleDiseaseSelect}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Selecione o agravo" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {SINAN_DISEASES.map((d) => (
                    <SelectItem key={d.code} value={d.code} className="text-white">
                      {d.code} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">ID do Paciente</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="UUID do paciente"
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Data da Notificação</Label>
                <Input
                  required
                  type="date"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  value={form.notificationDate}
                  onChange={(e) => setForm((f) => ({ ...f, notificationDate: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-gray-300">Início dos Sintomas</Label>
                <Input
                  type="date"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  value={form.symptomsOnsetDate}
                  onChange={(e) => setForm((f) => ({ ...f, symptomsOnsetDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">ID do Atendimento (opcional)</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="UUID do atendimento"
                value={form.encounterId}
                onChange={(e) => setForm((f) => ({ ...f, encounterId: e.target.value }))}
              />
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
                disabled={create.isPending || !form.diseaseCode}
              >
                {create.isPending ? 'Notificando…' : 'Registrar Notificação'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── NOTIVISA Tab ─────────────────────────────────────────────────────────────

function NOTIVISATab() {
  const create = useCreateNOTIVISAReport();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    eventType: '',
    productName: '',
    description: '',
    severity: '',
    eventDate: new Date().toISOString().slice(0, 10),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        patientId: form.patientId,
        eventType: form.eventType,
        productName: form.productName,
        description: form.description,
        severity: form.severity || undefined,
        eventDate: form.eventDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Relatório NOTIVISA registrado com sucesso');
          setDialogOpen(false);
          setForm({
            patientId: '',
            eventType: '',
            productName: '',
            description: '',
            severity: '',
            eventDate: new Date().toISOString().slice(0, 10),
          });
        },
        onError: () => toast.error('Erro ao registrar relatório NOTIVISA'),
      },
    );
  }

  const mockReports = [
    { id: '1', eventType: 'REACAO_ADVERSA', productName: 'Amoxicilina 500mg', description: 'Erupção cutânea generalizada', severity: 'MODERADO', eventDate: '2026-03-20', status: 'SUBMITTED' as const },
    { id: '2', eventType: 'ERRO_MEDICACAO', productName: 'Insulina NPH', description: 'Dose duplicada administrada', severity: 'GRAVE', eventDate: '2026-03-18', status: 'INVESTIGATING' as const },
    { id: '3', eventType: 'QUEIXA_TECNICA', productName: 'Seringa 10ml', description: 'Embalagem danificada — lote contaminado', severity: 'LEVE', eventDate: '2026-03-15', status: 'SUBMITTED' as const },
  ];

  const notivisaStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-800 text-gray-300 border-gray-600',
      SUBMITTED: 'bg-blue-900/40 text-blue-300 border-blue-700',
      INVESTIGATING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
      CLOSED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    };
    return map[s] ?? '';
  };

  const statusLabel: Record<string, string> = {
    DRAFT: 'Rascunho',
    SUBMITTED: 'Enviado',
    INVESTIGATING: 'Em Investigação',
    CLOSED: 'Encerrado',
  };

  const severityLabel: Record<string, string> = {
    LEVE: 'Leve',
    MODERADO: 'Moderado',
    GRAVE: 'Grave',
    OBITO: 'Óbito',
  };

  const severityClass: Record<string, string> = {
    LEVE: 'bg-green-900/40 text-green-300 border-green-700',
    MODERADO: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    GRAVE: 'bg-red-900/40 text-red-300 border-red-700',
    OBITO: 'bg-purple-900/40 text-purple-300 border-purple-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Relatórios NOTIVISA</h2>
          <p className="text-gray-400 text-sm">
            Notificações de Tecnovigilância e Farmacovigilância — ANVISA
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Relatório
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-400">Tipo de Evento</TableHead>
                <TableHead className="text-gray-400">Produto</TableHead>
                <TableHead className="text-gray-400">Descrição</TableHead>
                <TableHead className="text-gray-400">Gravidade</TableHead>
                <TableHead className="text-gray-400">Data</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReports.map((r) => (
                <TableRow key={r.id} className="border-gray-700">
                  <TableCell>
                    <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                      {r.eventType.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white">{r.productName}</TableCell>
                  <TableCell className="text-gray-300 text-sm max-w-xs truncate">
                    {r.description}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', severityClass[r.severity])}>
                      {severityLabel[r.severity] ?? r.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {new Date(r.eventDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', notivisaStatusBadge(r.status))}>
                      {statusLabel[r.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Relatório NOTIVISA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-gray-300">Tipo de Evento</Label>
              <Select
                value={form.eventType}
                onValueChange={(v) => setForm((f) => ({ ...f, eventType: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {NOTIVISA_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-white">
                      {t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">ID do Paciente</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="UUID do paciente"
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-gray-300">Produto / Medicamento</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Nome do produto ou medicamento"
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-gray-300">Descrição do Evento</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Descreva o evento adverso ou queixa"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Gravidade</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {NOTIVISA_SEVERITY.map((s) => (
                      <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Data do Evento</Label>
                <Input
                  type="date"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
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
                disabled={create.isPending || !form.eventType}
              >
                {create.isPending ? 'Registrando…' : 'Registrar Relatório'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ANS Indicators Tab ───────────────────────────────────────────────────────

function ANSIndicatorsTab() {
  const [_period, setPeriod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { data, isLoading } = useANSIndicators(
    startDate && endDate ? `${startDate}/${endDate}` : undefined,
  );

  const indicators = data?.indicators ?? [];

  function complianceCheck(ind: { value: number; benchmark?: number; code: string }) {
    if (ind.benchmark === undefined) return null;
    // For cancellation rate and wait time: lower is better
    const lowerIsBetter = ind.code === 'IDSS-03' || ind.code === 'IDSS-04';
    return lowerIsBetter ? ind.value <= ind.benchmark : ind.value >= ind.benchmark;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-semibold">Indicadores ANS — IDSS</h2>
        <p className="text-gray-400 text-sm">
          Índice de Desempenho da Saúde Suplementar — Resolução Normativa nº 501/2022
        </p>
      </div>

      {/* Period filter */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label className="text-gray-300">Data Inicial</Label>
              <Input
                type="date"
                className="bg-gray-800 border-gray-700 text-white mt-1 w-40"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-300">Data Final</Label>
              <Input
                type="date"
                className="bg-gray-800 border-gray-700 text-white mt-1 w-40"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={() => { setStartDate(''); setEndDate(''); setPeriod(''); }}
            >
              Limpar Filtro
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-gray-400 text-center py-10">Carregando indicadores…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.map((ind) => {
            const compliant = complianceCheck(ind);
            return (
              <Card key={ind.code} className="bg-gray-900 border-gray-700">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-500 font-mono">{ind.code}</p>
                      <p className="text-white font-medium mt-0.5">{ind.name}</p>
                    </div>
                    {compliant === null ? (
                      <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                        Informativo
                      </Badge>
                    ) : compliant ? (
                      <Badge className="text-xs bg-emerald-900/40 text-emerald-300 border-emerald-700 border flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Dentro da meta
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-red-900/40 text-red-300 border-red-700 border flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Fora da meta
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">
                      {typeof ind.value === 'number' && ind.unit === '%'
                        ? `${ind.value.toFixed(1)}%`
                        : ind.value.toLocaleString('pt-BR')}
                    </span>
                    {ind.unit !== '%' && (
                      <span className="text-gray-400 text-sm mb-1">{ind.unit}</span>
                    )}
                  </div>
                  {ind.benchmark !== undefined && (
                    <p className="text-xs text-gray-500 mt-2">
                      Meta:{' '}
                      {ind.unit === '%'
                        ? `${ind.benchmark}%`
                        : `${ind.benchmark.toLocaleString('pt-BR')} ${ind.unit}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data: dashboard, isLoading } = useRegulatoryDashboard();

  const summaryCards = dashboard
    ? [
        { label: 'Notificações SINAN', value: dashboard.sinanNotifications, icon: ClipboardList, color: 'text-blue-400' },
        { label: 'Relatórios NOTIVISA', value: dashboard.notivisaReports, icon: AlertTriangle, color: 'text-yellow-400' },
        { label: 'Total de Submissões', value: dashboard.totalRegulatorySubmissions, icon: Send, color: 'text-emerald-400' },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-semibold">Painel Regulatório</h2>
        <p className="text-gray-400 text-sm">Visão consolidada das obrigações regulatórias</p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-10">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summaryCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label} className="bg-gray-900 border-gray-700">
                  <CardContent className="pt-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                      <Icon className={cn('w-6 h-6', c.color)} />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{c.value}</p>
                      <p className="text-sm text-gray-400">{c.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Compliance status */}
          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'sinan', label: 'SINAN', description: 'Notificações Compulsórias' },
                { key: 'notivisa', label: 'NOTIVISA', description: 'Tecnovigilância / Farmacovigilância' },
              ].map(({ key, label, description }) => {
                const status = dashboard.complianceStatus[key as keyof typeof dashboard.complianceStatus];
                const active = status === 'ACTIVE';
                return (
                  <Card key={key} className="bg-gray-900 border-gray-700">
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-semibold">{label}</p>
                        <Badge
                          className={cn(
                            'text-xs border',
                            active
                              ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                              : 'bg-gray-800 text-gray-300 border-gray-600',
                          )}
                        >
                          {active ? 'Ativo' : 'Sem submissões'}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recent notifications */}
          {dashboard && dashboard.recentNotifications.length > 0 && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Notificações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                    >
                      <p className="text-gray-300 text-sm">{n.title}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(n.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RegulatoryPage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-900/40 flex items-center justify-center">
          <FileText className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Regulatório</h1>
          <p className="text-sm text-gray-400">
            SINAN · NOTIVISA · Indicadores ANS — Conformidade regulatória
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BarChart3 className="w-4 h-4 mr-2" /> Painel
          </TabsTrigger>
          <TabsTrigger value="sinan" className="data-[state=active]:bg-gray-700 text-gray-300">
            <ClipboardList className="w-4 h-4 mr-2" /> SINAN
          </TabsTrigger>
          <TabsTrigger value="notivisa" className="data-[state=active]:bg-gray-700 text-gray-300">
            <AlertTriangle className="w-4 h-4 mr-2" /> NOTIVISA
          </TabsTrigger>
          <TabsTrigger value="ans" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BarChart3 className="w-4 h-4 mr-2" /> Indicadores ANS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="sinan"><SINANTab /></TabsContent>
        <TabsContent value="notivisa"><NOTIVISATab /></TabsContent>
        <TabsContent value="ans"><ANSIndicatorsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
