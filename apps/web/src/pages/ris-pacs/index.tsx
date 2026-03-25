import { useState } from 'react';
import {
  Scan,
  Plus,
  FileText,
  LayoutList,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  PenLine,
  ClipboardList,
  HardDrive,
  Box,
  Radio,
  Download,
  Archive,
  Search,
  Send,
  UserCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
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
  DialogFooter,
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
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { cn } from '@/lib/utils';
import {
  useRisWorklist,
  useRadiologyReports,
  useReportTemplates,
  useIncidentalFindings,
  useCreateReport,
  useSignReport,
  usePrepProtocols,
  usePacsStudies,
  usePacsRetrieve,
  usePacsArchive,
  useVolumeRendering,
  useTeleradCases,
  useCreateTeleradCase,
  useAssignTeleradCase,
  useCompleteTeleradCase,
  type RadiologyOrder,
  type RadiologyReport,
  type ReportTemplate,
  type IncidentalFinding,
  type Modality,
  type ReportStatus,
  type PrepProtocol,
  type PacsStudy,
  type PacsStudyFilters,
  type TeleradCase,
  type TeleradStatus,
} from '@/services/ris-pacs.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: { label: 'Pendente', color: 'border-amber-500 text-amber-400', icon: <Clock className="h-3 w-3" /> },
  EM_LAUDO: { label: 'Em Laudo', color: 'border-blue-500 text-blue-400', icon: <PenLine className="h-3 w-3" /> },
  ASSINADO: { label: 'Assinado', color: 'border-emerald-500 text-emerald-400', icon: <CheckCircle className="h-3 w-3" /> },
  CANCELADO: { label: 'Cancelado', color: 'border-zinc-500 text-zinc-400', icon: <AlertCircle className="h-3 w-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  ROTINA: 'bg-zinc-500/20 text-zinc-400',
  URGENTE: 'bg-amber-500/20 text-amber-400',
  EMERGENCIA: 'bg-red-500/20 text-red-400',
};

const MODALITY_COLORS: Record<Modality, string> = {
  RX: 'bg-blue-500/20 text-blue-400',
  CT: 'bg-purple-500/20 text-purple-400',
  RM: 'bg-emerald-500/20 text-emerald-400',
  US: 'bg-amber-500/20 text-amber-400',
  MN: 'bg-orange-500/20 text-orange-400',
  PET: 'bg-red-500/20 text-red-400',
  MG: 'bg-pink-500/20 text-pink-400',
};

const TELERAD_STATUS_CONFIG: Record<TeleradStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'border-amber-500 text-amber-400' },
  ASSIGNED: { label: 'Atribuído', color: 'border-blue-500 text-blue-400' },
  IN_PROGRESS: { label: 'Em Laudo', color: 'border-purple-500 text-purple-400' },
  COMPLETED: { label: 'Concluído', color: 'border-emerald-500 text-emerald-400' },
  REJECTED: { label: 'Rejeitado', color: 'border-red-500 text-red-400' },
};

// ─── Tab: Preparo de Exames ─────────────────────────────────────────────────

function PrepProtocolsTab() {
  const { data: protocols = [], isLoading } = usePrepProtocols();
  const [filterModality, setFilterModality] = useState<string>('all');

  const filtered = filterModality === 'all'
    ? protocols
    : protocols.filter((p: PrepProtocol) => p.modality === filterModality);

  if (isLoading) return <PageLoading cards={3} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filterModality} onValueChange={setFilterModality}>
          <SelectTrigger className="w-40 bg-background border-border">
            <SelectValue placeholder="Modalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="RX">RX</SelectItem>
            <SelectItem value="CT">TC</SelectItem>
            <SelectItem value="RM">RM</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="MN">MN</SelectItem>
            <SelectItem value="PET">PET</SelectItem>
            <SelectItem value="MG">MG</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} protocolo(s)</span>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-12">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum protocolo de preparo cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p: PrepProtocol) => (
            <Card key={p.id} className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[p.modality])}>
                      {p.modality}
                    </Badge>
                    {p.contrastRequired && (
                      <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                        Contraste
                      </Badge>
                    )}
                    {p.allergyWarning && (
                      <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-400">
                        Alergia
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{p.examType}</p>
                <div className="rounded border border-border bg-background p-3 text-sm whitespace-pre-wrap">
                  {p.instructions}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {p.fastingHours != null && p.fastingHours > 0 && (
                    <span>Jejum: {p.fastingHours}h</span>
                  )}
                  {p.contrastType && <span>Contraste: {p.contrastType}</span>}
                  <span>Duração: ~{p.estimatedDuration}min</span>
                </div>
                {p.specialNotes && (
                  <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-400">
                    {p.specialNotes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: PACS Archive/Retrieve ─────────────────────────────────────────────

function PacsTab() {
  const [filters, setFilters] = useState<PacsStudyFilters>({});
  const { data: studies = [], isLoading } = usePacsStudies(filters);
  const retrieve = usePacsRetrieve();
  const archive = usePacsArchive();

  const archiveStatusLabel: Record<string, string> = {
    ONLINE: 'Online', NEARLINE: 'Nearline', OFFLINE: 'Offline',
  };
  const archiveStatusColor: Record<string, string> = {
    ONLINE: 'border-emerald-500 text-emerald-400',
    NEARLINE: 'border-amber-500 text-amber-400',
    OFFLINE: 'border-zinc-500 text-zinc-400',
  };

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function handleRetrieve(uid: string) {
    retrieve.mutate(uid, {
      onSuccess: (r) => toast.success(`Estudo ${r.status === 'RETRIEVED' ? 'recuperado' : 'enfileirado'}: ${r.message}`),
      onError: () => toast.error('Erro ao recuperar estudo do PACS.'),
    });
  }

  function handleArchive(uid: string) {
    archive.mutate(uid, {
      onSuccess: (r) => toast.success(r.message),
      onError: () => toast.error('Erro ao arquivar estudo.'),
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="pt-4 flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Label className="text-xs">Paciente</Label>
            <Input
              className="bg-background border-border mt-1"
              placeholder="Nome do paciente..."
              value={filters.patientName ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, patientName: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label className="text-xs">Modalidade</Label>
            <Select
              value={filters.modality ?? 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, modality: v === 'all' ? undefined : v as Modality }))}
            >
              <SelectTrigger className="w-32 bg-background border-border mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="RX">RX</SelectItem>
                <SelectItem value="CT">TC</SelectItem>
                <SelectItem value="RM">RM</SelectItem>
                <SelectItem value="US">US</SelectItem>
                <SelectItem value="MN">MN</SelectItem>
                <SelectItem value="PET">PET</SelectItem>
                <SelectItem value="MG">MG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              className="bg-background border-border mt-1"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              className="bg-background border-border mt-1"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <PageLoading cards={0} showTable />
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              Estudos PACS ({studies.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Parte</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Séries/Imagens</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum estudo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                studies.map((s: PacsStudy) => (
                  <TableRow key={s.studyInstanceUid}>
                    <TableCell className="font-medium text-sm">{s.patientName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[s.modality])}>
                        {s.modality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-40 truncate">{s.studyDescription}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.bodyPart}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.studyDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs">{s.seriesCount}s / {s.imageCount}i</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatSize(s.sizeBytes)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', archiveStatusColor[s.archiveStatus])}>
                        {archiveStatusLabel[s.archiveStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.archiveStatus !== 'ONLINE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleRetrieve(s.studyInstanceUid)}
                            disabled={retrieve.isPending}
                          >
                            <Download className="h-3 w-3" />
                            Recuperar
                          </Button>
                        )}
                        {s.archiveStatus === 'ONLINE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleArchive(s.studyInstanceUid)}
                            disabled={archive.isPending}
                          >
                            <Archive className="h-3 w-3" />
                            Arquivar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: 3D Volume Rendering ───────────────────────────────────────────────

function VolumeRenderingTab() {
  const [studyUid, setStudyUid] = useState('');
  const [lookupUid, setLookupUid] = useState('');
  const { data: volumeData, isLoading, isError } = useVolumeRendering(lookupUid);

  function handleLookup() {
    if (!studyUid.trim()) {
      toast.warning('Informe o Study Instance UID.');
      return;
    }
    setLookupUid(studyUid.trim());
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4 text-emerald-400" />
            Visualizador 3D — Volume Rendering
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            className="bg-background border-border flex-1 font-mono text-xs"
            placeholder="Study Instance UID (ex: 1.2.840.113619.2...)"
            value={studyUid}
            onChange={(e) => setStudyUid(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            onClick={handleLookup}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Carregar
          </Button>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4">
            <p className="text-red-400 text-sm">Estudo nao encontrado ou servico indisponivel.</p>
          </CardContent>
        </Card>
      )}

      {volumeData && (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{volumeData.patientName}</CardTitle>
                <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[volumeData.modality])}>
                  {volumeData.modality}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Series</p>
                  <p className="font-medium">{volumeData.seriesCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cortes</p>
                  <p className="font-medium">{volumeData.sliceCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Espessura Corte</p>
                  <p className="font-medium">{volumeData.sliceThickness}mm</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Study UID</p>
                  <p className="font-mono text-xs truncate">{volumeData.studyInstanceUid}</p>
                </div>
              </div>

              {/* Viewer embed area */}
              <div className="relative rounded-lg border border-border bg-black/50 h-96 flex items-center justify-center">
                {volumeData.thumbnailUrl ? (
                  <img
                    src={volumeData.thumbnailUrl}
                    alt="Volume preview"
                    className="max-h-full max-w-full object-contain opacity-60"
                  />
                ) : (
                  <div className="text-center">
                    <Box className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Visualizador 3D</p>
                  </div>
                )}
                <Button
                  className="absolute bottom-4 right-4 bg-emerald-600 hover:bg-emerald-700 gap-2"
                  onClick={() => window.open(volumeData.viewerUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Viewer Completo
                </Button>
              </div>

              {/* Presets */}
              {volumeData.presets.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Presets de Renderizacao</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {volumeData.presets.map((preset) => (
                      <div key={preset.id} className="rounded border border-border bg-background p-3">
                        <p className="text-sm font-medium">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>WW: {preset.windowWidth}</span>
                          <span>WC: {preset.windowCenter}</span>
                          <span>Mapa: {preset.colorMap}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Tab: Teleradiology ─────────────────────────────────────────────────────

function TeleradiologyTab() {
  const { data: cases = [], isLoading } = useTeleradCases();
  const createCase = useCreateTeleradCase();
  const assignCase = useAssignTeleradCase();
  const completeCase = useCompleteTeleradCase();

  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ orderId: '', priority: 'ROTINA' as const });
  const [assignForm, setAssignForm] = useState({ caseId: '', radiologistId: '' });
  const [showAssign, setShowAssign] = useState(false);

  function handleCreate() {
    if (!newCase.orderId) {
      toast.warning('Informe o ID do pedido.');
      return;
    }
    createCase.mutate(newCase, {
      onSuccess: () => {
        toast.success('Caso de telerradiologia criado.');
        setShowCreate(false);
        setNewCase({ orderId: '', priority: 'ROTINA' });
      },
      onError: () => toast.error('Erro ao criar caso.'),
    });
  }

  function handleAssign() {
    if (!assignForm.caseId || !assignForm.radiologistId) {
      toast.warning('Informe o caso e o radiologista.');
      return;
    }
    assignCase.mutate(assignForm, {
      onSuccess: () => {
        toast.success('Caso atribuido ao radiologista.');
        setShowAssign(false);
        setAssignForm({ caseId: '', radiologistId: '' });
      },
      onError: () => toast.error('Erro ao atribuir caso.'),
    });
  }

  function handleComplete(caseId: string) {
    completeCase.mutate(caseId, {
      onSuccess: () => toast.success('Caso concluido.'),
      onError: () => toast.error('Erro ao concluir caso.'),
    });
  }

  const pendingCount = cases.filter((c: TeleradCase) => c.status === 'PENDING').length;
  const inProgressCount = cases.filter((c: TeleradCase) => c.status === 'IN_PROGRESS').length;

  if (isLoading) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Casos</p>
            <p className="text-2xl font-bold">{cases.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-400">Pendentes</p>
            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="pt-4">
            <p className="text-xs text-purple-400">Em Laudo</p>
            <p className="text-2xl font-bold text-purple-400">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 flex items-center gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full"
              onClick={() => setShowCreate(!showCreate)}
            >
              <Send className="h-4 w-4" />
              Novo Caso
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="border-emerald-500/30 bg-card">
          <CardContent className="pt-4 flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <Label className="text-xs">ID do Pedido *</Label>
              <Input
                className="bg-background border-border mt-1 font-mono text-xs"
                placeholder="UUID do pedido"
                value={newCase.orderId}
                onChange={(e) => setNewCase((f) => ({ ...f, orderId: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select
                value={newCase.priority}
                onValueChange={(v) => setNewCase((f) => ({ ...f, priority: v as typeof f.priority }))}
              >
                <SelectTrigger className="w-40 bg-background border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROTINA">Rotina</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                  <SelectItem value="EMERGENCIA">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={createCase.isPending}
            >
              {createCase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cases table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            Casos de Telerradiologia ({cases.length})
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Exame</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Radiologista</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum caso de telerradiologia
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c: TeleradCase) => {
                const stCfg = TELERAD_STATUS_CONFIG[c.status];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.patientName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[c.modality])}>
                        {c.modality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-40 truncate">{c.examDescription}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[c.priority])}>
                        {c.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', stCfg.color)}>
                        {stCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.assignedRadiologist ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.slaDeadline
                        ? new Date(c.slaDeadline).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setAssignForm({ caseId: c.id, radiologistId: '' });
                              setShowAssign(true);
                            }}
                          >
                            <UserCheck className="h-3 w-3" />
                            Atribuir
                          </Button>
                        )}
                        {(c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-emerald-500 text-emerald-400"
                            onClick={() => handleComplete(c.id)}
                            disabled={completeCase.isPending}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Assign dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Radiologista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">ID do Radiologista</Label>
              <Input
                className="bg-background border-border mt-1 font-mono text-xs"
                placeholder="UUID do radiologista remoto"
                value={assignForm.radiologistId}
                onChange={(e) => setAssignForm((f) => ({ ...f, radiologistId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAssign}
              disabled={assignCase.isPending}
            >
              {assignCase.isPending ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RisPacsPage() {
  const [activeTab, setActiveTab] = useState('worklist');
  const [showNewReport, setShowNewReport] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [selectedReport, setSelectedReport] = useState<RadiologyReport | null>(null);
  const [reportForm, setReportForm] = useState({
    orderId: '',
    technique: '',
    comparison: '',
    findings: '',
    impression: '',
    templateId: '',
  });

  const { data: worklist = [], isLoading: loadingWorklist, isError, refetch } = useRisWorklist();
  const { data: reports = [], isLoading: loadingReports } = useRadiologyReports();
  const { data: templates = [] } = useReportTemplates();
  const { data: incidentals = [], isLoading: loadingIncidentals } = useIncidentalFindings();

  const createReport = useCreateReport();
  const signReport = useSignReport();

  const pendingCount = worklist.filter((o: RadiologyOrder) => o.status === 'PENDENTE').length;

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t: ReportTemplate) => t.id === templateId);
    if (tpl) {
      setReportForm((prev) => ({ ...prev, templateId, findings: tpl.body }));
    }
  };

  const handleCreateReport = async () => {
    if (!reportForm.orderId || !reportForm.findings || !reportForm.impression) {
      toast.error('Preencha ID do pedido, achados e impressão diagnóstica.');
      return;
    }
    try {
      await createReport.mutateAsync(reportForm);
      toast.success('Laudo criado com sucesso.');
      setShowNewReport(false);
      setReportForm({ orderId: '', technique: '', comparison: '', findings: '', impression: '', templateId: '' });
    } catch {
      toast.error('Erro ao criar laudo.');
    }
  };

  const handleSign = async (reportId: string) => {
    try {
      await signReport.mutateAsync(reportId);
      toast.success('Laudo assinado digitalmente.');
      setSelectedReport(null);
    } catch {
      toast.error('Erro ao assinar laudo.');
    }
  };

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setReportForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scan className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RIS/PACS — Radiologia</h1>
            <p className="text-sm text-muted-foreground">Worklist DICOM, laudos estruturados e achados incidentais</p>
          </div>
        </div>
        <Button onClick={() => setShowNewReport(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Novo Laudo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="worklist" className="text-xs data-[state=active]:bg-emerald-600">
            <LayoutList className="mr-1.5 h-3.5 w-3.5" />
            Worklist
            {pendingCount > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-amber-600">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs data-[state=active]:bg-emerald-600">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Laudos
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs data-[state=active]:bg-emerald-600">
            <PenLine className="mr-1.5 h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="prep" className="text-xs data-[state=active]:bg-emerald-600">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Preparo
          </TabsTrigger>
          <TabsTrigger value="pacs" className="text-xs data-[state=active]:bg-emerald-600">
            <HardDrive className="mr-1.5 h-3.5 w-3.5" />
            PACS
          </TabsTrigger>
          <TabsTrigger value="3d" className="text-xs data-[state=active]:bg-emerald-600">
            <Box className="mr-1.5 h-3.5 w-3.5" />
            3D Viewer
          </TabsTrigger>
          <TabsTrigger value="telerad" className="text-xs data-[state=active]:bg-emerald-600">
            <Radio className="mr-1.5 h-3.5 w-3.5" />
            Telerradiologia
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Worklist ───────────────────────────────────────────────── */}
        <TabsContent value="worklist" className="space-y-4 mt-4">
          {loadingWorklist ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pedidos de Exame ({worklist.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acesso</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Exame</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agendado</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worklist.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Worklist vazia
                      </TableCell>
                    </TableRow>
                  ) : (
                    worklist.map((order: RadiologyOrder) => {
                      const cfg = STATUS_CONFIG[order.status];
                      return (
                        <TableRow key={order.id} className="cursor-pointer hover:bg-accent/20" onClick={() => setSelectedOrder(order)}>
                          <TableCell className="font-mono text-xs">{order.accessionNumber}</TableCell>
                          <TableCell className="font-medium text-sm">{order.patientName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[order.modality])}>
                              {order.modality}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-48 truncate">{order.examDescription}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[order.priority])}>
                              {order.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1 text-xs', cfg.color)}>
                              {cfg.icon}
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {order.scheduledAt
                              ? new Date(order.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); setShowNewReport(true); setReportForm((f) => ({ ...f, orderId: order.id })); }}
                            >
                              <PenLine className="h-3 w-3" />
                              Laudar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Incidental Findings */}
          {!loadingIncidentals && incidentals.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Achados Incidentais para Seguimento ({incidentals.length})
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Achado</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Data Exame</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentals.map((f: IncidentalFinding) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-sm">{f.patientName}</TableCell>
                      <TableCell className="text-sm max-w-40 truncate">{f.finding}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[f.modality])}>
                          {f.modality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(f.examDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.followUpDate ? new Date(f.followUpDate).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            f.status === 'PENDENTE' && 'border-amber-500 text-amber-400',
                            f.status === 'AGENDADO' && 'border-blue-500 text-blue-400',
                            f.status === 'CONCLUIDO' && 'border-emerald-500 text-emerald-400',
                          )}
                        >
                          {f.status === 'PENDENTE' ? 'Pendente' : f.status === 'AGENDADO' ? 'Agendado' : 'Concluído'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Laudos ─────────────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          {loadingReports ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Laudos Emitidos ({reports.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Exame</TableHead>
                    <TableHead>Radiologista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assinado em</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum laudo emitido
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((r: RadiologyReport) => {
                      const cfg = STATUS_CONFIG[r.status];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-sm">{r.patientName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[r.modality])}>
                              {r.modality}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-40 truncate">{r.examDescription}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.radiologist}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1 text-xs', cfg.color)}>
                              {cfg.icon}
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.signedAt ? new Date(r.signedAt).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setSelectedReport(r)}
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                              {r.status !== 'ASSINADO' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-emerald-500 text-emerald-400"
                                  onClick={() => handleSign(r.id)}
                                  disabled={signReport.isPending}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Assinar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Templates ──────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          {templates.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <PenLine className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum template cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((t: ReportTemplate) => (
                <Card key={t.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{t.name}</CardTitle>
                      <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[t.modality])}>
                        {t.modality}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-7 text-xs"
                      onClick={() => {
                        setShowNewReport(true);
                        handleTemplateSelect(t.id);
                      }}
                    >
                      Usar Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Preparo de Exames ──────────────────────────────────────── */}
        <TabsContent value="prep" className="space-y-4 mt-4">
          <PrepProtocolsTab />
        </TabsContent>

        {/* ── Tab: PACS Archive/Retrieve ──────────────────────────────────── */}
        <TabsContent value="pacs" className="space-y-4 mt-4">
          <PacsTab />
        </TabsContent>

        {/* ── Tab: 3D Volume Rendering ────────────────────────────────────── */}
        <TabsContent value="3d" className="space-y-4 mt-4">
          <VolumeRenderingTab />
        </TabsContent>

        {/* ── Tab: Telerradiologia ────────────────────────────────────────── */}
        <TabsContent value="telerad" className="space-y-4 mt-4">
          <TeleradiologyTab />
        </TabsContent>
      </Tabs>

      {/* ── Create Report Dialog ───────────────────────────────────────────── */}
      <Dialog open={showNewReport} onOpenChange={setShowNewReport}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Laudo Radiológico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Pedido *</Label>
                <Input
                  placeholder="UUID do pedido"
                  value={reportForm.orderId}
                  onChange={setField('orderId')}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Template</Label>
                <Select value={reportForm.templateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecionar template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: ReportTemplate) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.modality})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Técnica</Label>
              <Input
                placeholder="Descrição da técnica utilizada..."
                value={reportForm.technique}
                onChange={setField('technique')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comparação com Exame Anterior</Label>
              <Input
                placeholder="Ex: Comparado com TC de 01/01/2025..."
                value={reportForm.comparison}
                onChange={setField('comparison')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Achados *</Label>
              <textarea
                placeholder="Descreva os achados radiológicos..."
                value={reportForm.findings}
                onChange={setField('findings')}
                rows={5}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Impressão Diagnóstica *</Label>
              <textarea
                placeholder="Conclusão diagnóstica..."
                value={reportForm.impression}
                onChange={setField('impression')}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReport(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateReport}
              disabled={createReport.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createReport.isPending ? 'Salvando...' : 'Criar Laudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Detail Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Laudo — {selectedReport?.patientName}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Exame</p>
                  <p>{selectedReport.examDescription}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Modalidade</p>
                  <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[selectedReport.modality])}>
                    {selectedReport.modality}
                  </Badge>
                </div>
              </div>
              {selectedReport.technique && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Técnica</p>
                  <p className="text-sm">{selectedReport.technique}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Achados</p>
                <div className="rounded border border-border bg-background p-3 text-sm whitespace-pre-wrap">
                  {selectedReport.findings}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Impressão Diagnóstica</p>
                <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm font-medium">
                  {selectedReport.impression}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Radiologista</p>
                  <p className="font-medium">{selectedReport.radiologist}</p>
                </div>
                {selectedReport.status !== 'ASSINADO' && (
                  <Button
                    onClick={() => handleSign(selectedReport.id)}
                    disabled={signReport.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {signReport.isPending ? 'Assinando...' : 'Assinar Laudo'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Worklist Order Detail Dialog ───────────────────────────────────── */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido — {selectedOrder?.patientName}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Número de Acesso</p>
                  <p className="font-mono">{selectedOrder.accessionNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Modalidade</p>
                  <Badge variant="secondary" className={cn('text-xs', MODALITY_COLORS[selectedOrder.modality])}>
                    {selectedOrder.modality}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exame</p>
                  <p>{selectedOrder.examDescription}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[selectedOrder.priority])}>
                    {selectedOrder.priority}
                  </Badge>
                </div>
              </div>
              {selectedOrder.studyInstanceUid && (
                <div>
                  <p className="text-xs text-muted-foreground">Study Instance UID</p>
                  <p className="font-mono text-xs truncate">{selectedOrder.studyInstanceUid}</p>
                </div>
              )}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={() => {
                  setSelectedOrder(null);
                  setShowNewReport(true);
                  setReportForm((f) => ({ ...f, orderId: selectedOrder.id }));
                }}
              >
                <PenLine className="h-4 w-4" />
                Laudar este Exame
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
