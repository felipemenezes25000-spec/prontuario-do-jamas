import { useState } from 'react';
import { toast } from 'sonner';
import {
  Database,
  Shield,
  Clock,
  HardDrive,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Users,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupRecord {
  id: string;
  type: string;
  status: string;
  destination: string;
  sizeBytes: number;
  durationMs: number;
  encryptionEnabled: boolean;
  startedAt: string;
  completedAt: string | null;
}

interface DrTestRecord {
  id: string;
  scenarioType: string;
  scheduledDate: string;
  participants: string[];
  status: string;
  rtoAchievedMs: number | null;
  rpoAchievedMs: number | null;
  notes: string | null;
  createdAt: string;
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

const DEMO_BACKUPS: BackupRecord[] = [
  { id: '1', type: 'FULL', status: 'COMPLETED', destination: 'S3', sizeBytes: 256000000, durationMs: 180000, encryptionEnabled: true, startedAt: '2026-03-25T02:00:00Z', completedAt: '2026-03-25T02:03:00Z' },
  { id: '2', type: 'INCREMENTAL', status: 'COMPLETED', destination: 'S3', sizeBytes: 12000000, durationMs: 15000, encryptionEnabled: true, startedAt: '2026-03-24T14:00:00Z', completedAt: '2026-03-24T14:00:15Z' },
  { id: '3', type: 'INCREMENTAL', status: 'COMPLETED', destination: 'S3', sizeBytes: 8500000, durationMs: 12000, encryptionEnabled: true, startedAt: '2026-03-24T08:00:00Z', completedAt: '2026-03-24T08:00:12Z' },
  { id: '4', type: 'FULL', status: 'COMPLETED', destination: 'S3', sizeBytes: 248000000, durationMs: 175000, encryptionEnabled: true, startedAt: '2026-03-24T02:00:00Z', completedAt: '2026-03-24T02:02:55Z' },
  { id: '5', type: 'DIFFERENTIAL', status: 'FAILED', destination: 'S3', sizeBytes: 0, durationMs: 5000, encryptionEnabled: true, startedAt: '2026-03-23T14:00:00Z', completedAt: null },
  { id: '6', type: 'FULL', status: 'COMPLETED', destination: 'S3', sizeBytes: 240000000, durationMs: 172000, encryptionEnabled: true, startedAt: '2026-03-23T02:00:00Z', completedAt: '2026-03-23T02:02:52Z' },
];

const DEMO_DR_TESTS: DrTestRecord[] = [
  { id: '1', scenarioType: 'FULL_FAILOVER', scheduledDate: '2026-03-20T10:00:00Z', participants: ['Dr. Silva', 'Eng. Costa', 'Admin. Ferreira'], status: 'PASSED', rtoAchievedMs: 7200000, rpoAchievedMs: 900000, notes: 'Failover completo em 2h. RPO de 15min.', createdAt: '2026-03-15T08:00:00Z' },
  { id: '2', scenarioType: 'DATA_ONLY', scheduledDate: '2026-02-15T10:00:00Z', participants: ['Eng. Costa', 'DBA Santos'], status: 'PASSED', rtoAchievedMs: 3600000, rpoAchievedMs: 600000, notes: 'Restore de dados completado em 1h.', createdAt: '2026-02-10T08:00:00Z' },
  { id: '3', scenarioType: 'PARTIAL', scheduledDate: '2026-01-10T10:00:00Z', participants: ['Dr. Silva', 'Eng. Costa'], status: 'FAILED', rtoAchievedMs: null, rpoAchievedMs: null, notes: 'Falha na reconexao com o servico de autenticacao.', createdAt: '2026-01-05T08:00:00Z' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}min`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    COMPLETED: { label: 'Concluido', variant: 'default' },
    IN_PROGRESS: { label: 'Em Andamento', variant: 'secondary' },
    PENDING: { label: 'Pendente', variant: 'outline' },
    FAILED: { label: 'Falhou', variant: 'destructive' },
    PASSED: { label: 'Aprovado', variant: 'default' },
    SCHEDULED: { label: 'Agendado', variant: 'secondary' },
    CANCELLED: { label: 'Cancelado', variant: 'outline' },
  };
  const cfg = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── KPI Cards ───────────────────────────────────────────────────────────────

function KpiCards() {
  const lastBackup = DEMO_BACKUPS[0] as BackupRecord | undefined;
  const rpoCurrent = '45 min';
  const rtoCurrent = '2h';
  const nextDrTest = '2026-04-15';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ultimo Backup
          </CardTitle>
          <Database className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {lastBackup
              ? new Date(lastBackup.startedAt).toLocaleDateString('pt-BR')
              : 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lastBackup
              ? `${lastBackup.type} - ${formatBytes(lastBackup.sizeBytes)}`
              : 'Nenhum backup encontrado'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            RPO Atual
          </CardTitle>
          <Clock className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-400">{rpoCurrent}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Meta: &lt; 1h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            RTO Atual
          </CardTitle>
          <RefreshCw className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-400">{rtoCurrent}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Meta: &lt; 4h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Proximo Teste DR
          </CardTitle>
          <Calendar className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {new Date(nextDrTest).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            FULL_FAILOVER agendado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Backup List ─────────────────────────────────────────────────────────────

function BackupListTab() {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = DEMO_BACKUPS.filter((b) => {
    const typeOk = filterType === 'ALL' || b.type === filterType;
    const statusOk = filterStatus === 'ALL' || b.status === filterStatus;
    return typeOk && statusOk;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Tipos</SelectItem>
            <SelectItem value="FULL">Full</SelectItem>
            <SelectItem value="INCREMENTAL">Incremental</SelectItem>
            <SelectItem value="DIFFERENTIAL">Differential</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="COMPLETED">Concluido</SelectItem>
            <SelectItem value="FAILED">Falhou</SelectItem>
            <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Duracao</TableHead>
              <TableHead>Criptografia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell className="text-sm">
                  {new Date(backup.startedAt).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{backup.type}</Badge>
                </TableCell>
                <TableCell>{statusBadge(backup.status)}</TableCell>
                <TableCell className="text-sm">{backup.destination}</TableCell>
                <TableCell className="text-sm">{formatBytes(backup.sizeBytes)}</TableCell>
                <TableCell className="text-sm">{formatDuration(backup.durationMs)}</TableCell>
                <TableCell>
                  {backup.encryptionEnabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Manual Backup Form ──────────────────────────────────────────────────────

function ManualBackupTab() {
  const [backupType, setBackupType] = useState('FULL');
  const [destination, setDestination] = useState('S3');
  const [encryption, setEncryption] = useState('true');
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = () => {
    setIsTriggering(true);
    setTimeout(() => {
      setIsTriggering(false);
      toast.success('Backup iniciado com sucesso');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Backup</Label>
          <Select value={backupType} onValueChange={setBackupType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL">Full (Completo)</SelectItem>
              <SelectItem value="INCREMENTAL">Incremental</SelectItem>
              <SelectItem value="DIFFERENTIAL">Differential</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Destino</Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S3">Amazon S3</SelectItem>
              <SelectItem value="LOCAL">Local</SelectItem>
              <SelectItem value="AZURE_BLOB">Azure Blob Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Criptografia</Label>
          <Select value={encryption} onValueChange={setEncryption}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Habilitada (AES-256)</SelectItem>
              <SelectItem value="false">Desabilitada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Agendamento (Cron)</Label>
          <Input placeholder="0 2 * * *" defaultValue="0 2 * * *" />
          <p className="text-xs text-muted-foreground">
            Padrao: diariamente as 2h da manha
          </p>
        </div>

        <div className="space-y-2">
          <Label>Retencao (dias)</Label>
          <Input type="number" defaultValue={90} min={1} max={3650} />
        </div>
      </div>

      <Button
        className="w-full"
        onClick={handleTrigger}
        disabled={isTriggering}
      >
        {isTriggering ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Iniciando backup...
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4 mr-2" />
            Iniciar Backup Manual
          </>
        )}
      </Button>
    </div>
  );
}

// ─── DR Test History ─────────────────────────────────────────────────────────

function DrTestDialog() {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState('FULL_FAILOVER');
  const [date, setDate] = useState('');
  const [participants, setParticipants] = useState('');

  const handleSchedule = () => {
    if (!date || !participants) {
      toast.error('Preencha todos os campos');
      return;
    }
    toast.success('Teste DR agendado com sucesso');
    setOpen(false);
    setDate('');
    setParticipants('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Teste DR
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar Teste de Disaster Recovery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Tipo de Cenario</Label>
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_FAILOVER">Full Failover</SelectItem>
                <SelectItem value="PARTIAL">Parcial</SelectItem>
                <SelectItem value="DATA_ONLY">Somente Dados</SelectItem>
                <SelectItem value="APPLICATION_ONLY">Somente Aplicacao</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data Agendada</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Participantes (separados por virgula)</Label>
            <Input
              placeholder="Dr. Silva, Eng. Costa"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleSchedule}>
            Agendar Teste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DrTestTab() {
  const scenarioLabels: Record<string, string> = {
    FULL_FAILOVER: 'Full Failover',
    PARTIAL: 'Parcial',
    DATA_ONLY: 'Somente Dados',
    APPLICATION_ONLY: 'Somente Aplicacao',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DrTestDialog />
      </div>

      <div className="space-y-3">
        {DEMO_DR_TESTS.map((test) => (
          <Card key={test.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {test.status === 'PASSED' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : test.status === 'FAILED' ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    )}
                    <span className="font-medium">
                      {scenarioLabels[test.scenarioType] ?? test.scenarioType}
                    </span>
                    {statusBadge(test.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(test.scheduledDate).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {test.participants.join(', ')}
                    </span>
                  </div>
                  {test.notes && (
                    <p className="text-sm text-muted-foreground">{test.notes}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  {test.rtoAchievedMs !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">RTO</p>
                      <p className="text-sm font-medium text-emerald-400">
                        {formatDuration(test.rtoAchievedMs)}
                      </p>
                    </div>
                  )}
                  {test.rpoAchievedMs !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">RPO</p>
                      <p className="text-sm font-medium text-emerald-400">
                        {formatDuration(test.rpoAchievedMs)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BackupRecoveryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Backup & Disaster Recovery</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de backups, restauracao e testes de recuperacao de desastres
          </p>
        </div>
      </div>

      <KpiCards />

      <Tabs defaultValue="backups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backups" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Backup Manual
          </TabsTrigger>
          <TabsTrigger value="dr-tests" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Testes DR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backups">
          <BackupListTab />
        </TabsContent>
        <TabsContent value="manual">
          <ManualBackupTab />
        </TabsContent>
        <TabsContent value="dr-tests">
          <DrTestTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
