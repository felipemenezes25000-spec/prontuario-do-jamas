import { useState } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  Mic,
  BrainCircuit,
  Code2,
  FileSearch,
  ScanEye,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Sparkles,
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
  useAmbientSessions,
  useStartAmbientSession,
  useStopAmbientSession,
  type AmbientSession,
} from '@/services/ai-ambient.service';
import {
  useAgentTasks,
  useExecuteAgentTask,
  type AgentTaskType,
  type AgentTask,
} from '@/services/ai-agents.service';
import {
  useCodingSessions,
  useGenerateCodes,
  type CodingSession,
} from '@/services/ai-coding.service';
import {
  useExtractEntities,
  useStructureText,
  type EntityType,
} from '@/services/ai-nlp.service';
import {
  useImagingAnalyses,
  useImagingStats,
  useUploadImage,
  type ImagingAnalysis,
} from '@/services/ai-imaging.service';
import {
  useDiagnosisDifferential,
  useClinicalPathway,
  useEcgInterpretation,
  useMortalityPrediction,
  useConversationalBi,
  useDigitalTwin,
  useMultimodalAnalysis,
  useAutonomousCoding,
  useInboxManagement,
  usePriorAuthorization,
  useIntelligentReferral,
  usePostVisitFollowup,
  useGenomicsTreatment,
  useDigitalPathology,
  type DifferentialResponse,
  type ClinicalPathwayResponse,
  type EcgInterpretation as EcgInterpretationType,
  type MortalityPrediction as MortalityPredictionType,
  type ConversationalBiResponse,
  type InboxManagement as InboxManagementType,
} from '@/services/ai-revolutionary.service';

// ─── Ambient Listening ────────────────────────────────────────────────────────

function sessionStatusBadge(status: AmbientSession['status']) {
  const map = {
    RECORDING: { label: 'Gravando', variant: 'destructive' as const },
    PROCESSING: { label: 'Processando', variant: 'secondary' as const },
    READY: { label: 'Pronto', variant: 'default' as const },
    ERROR: { label: 'Erro', variant: 'outline' as const },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function NewAmbientDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const startSession = useStartAmbientSession();

  const handleStart = () => {
    startSession.mutate(
      { patientId: patientId || undefined, encounterId: encounterId || undefined },
      {
        onSuccess: () => {
          toast.success('Sessão de escuta iniciada');
          setOpen(false);
          setPatientId('');
          setEncounterId('');
        },
        onError: () => toast.error('Erro ao iniciar sessão'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Mic className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar Escuta Ambiente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>ID do Paciente (opcional)</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="UUID do paciente" />
          </div>
          <div className="space-y-1">
            <Label>ID do Atendimento (opcional)</Label>
            <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} placeholder="UUID do atendimento" />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={startSession.isPending}
            onClick={handleStart}
          >
            <Mic className="h-4 w-4 mr-2" />
            {startSession.isPending ? 'Iniciando...' : 'Iniciar Gravação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmbientTab() {
  const { data, isLoading } = useAmbientSessions();
  const stopSession = useStopAmbientSession();
  const sessions = data?.data ?? [];

  const handleStop = (id: string) => {
    stopSession.mutate(id, {
      onSuccess: () => toast.success('Sessão encerrada — processando nota clínica'),
      onError: () => toast.error('Erro ao encerrar sessão'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} sessões</p>
        <NewAmbientDialog />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando sessões...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma sessão de escuta registrada</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {sessionStatusBadge(s.status)}
                      {s.patientName && <span className="text-sm font-medium">{s.patientName}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Iniciado: {new Date(s.startedAt).toLocaleString('pt-BR')}
                      {s.durationSeconds != null && ` · ${Math.round(s.durationSeconds / 60)} min`}
                    </p>
                    {s.clinicalNote && (
                      <div className="mt-2 text-xs bg-muted rounded p-2 space-y-1">
                        <p><span className="font-medium">S:</span> {s.clinicalNote.subjective}</p>
                        <p><span className="font-medium">O:</span> {s.clinicalNote.objective}</p>
                        <p><span className="font-medium">A:</span> {s.clinicalNote.assessment}</p>
                        <p><span className="font-medium">P:</span> {s.clinicalNote.plan}</p>
                      </div>
                    )}
                  </div>
                  {s.status === 'RECORDING' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStop(s.id)}
                      disabled={stopSession.isPending}
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Parar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agentic AI ───────────────────────────────────────────────────────────────

function agentStatusIcon(status: AgentTask['status']) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'ERROR') return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === 'RUNNING') return <Play className="h-4 w-4 text-blue-400 animate-pulse" />;
  return <Clock className="h-4 w-4 text-yellow-400" />;
}

const TASK_TYPE_LABELS: Record<AgentTaskType, string> = {
  PREPARE_CONSULTATION: 'Preparar Consulta',
  PREFILL_FORM: 'Pré-preencher Formulário',
  SUMMARIZE_PATIENT: 'Resumir Paciente',
};

function NewAgentDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AgentTaskType>('SUMMARIZE_PATIENT');
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const execute = useExecuteAgentTask();

  const handleExecute = () => {
    if (!patientId) return;
    execute.mutate(
      { type, patientId, encounterId: encounterId || undefined },
      {
        onSuccess: () => {
          toast.success('Tarefa do agente iniciada');
          setOpen(false);
          setPatientId('');
          setEncounterId('');
        },
        onError: () => toast.error('Erro ao executar tarefa'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <BrainCircuit className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Executar Tarefa de Agente IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Tipo de Tarefa</Label>
            <Select value={type} onValueChange={(v) => setType(v as AgentTaskType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TASK_TYPE_LABELS) as AgentTaskType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>ID do Paciente</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="UUID do paciente" />
          </div>
          <div className="space-y-1">
            <Label>ID do Atendimento (opcional)</Label>
            <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} placeholder="UUID do atendimento" />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!patientId || execute.isPending}
            onClick={handleExecute}
          >
            {execute.isPending ? 'Executando...' : 'Executar Agente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentsTab() {
  const { data, isLoading } = useAgentTasks();
  const tasks = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} tarefas (atualização automática)</p>
        <NewAgentDialog />
      </div>
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando tarefas...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma tarefa de agente registrada</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Concluído em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {agentStatusIcon(t.status)}
                      <span className="text-sm">{t.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{TASK_TYPE_LABELS[t.type]}</TableCell>
                  <TableCell className="text-sm">{t.patientName ?? t.patientId}</TableCell>
                  <TableCell className="text-sm">{new Date(t.createdAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.completedAt ? new Date(t.completedAt).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── AI Coding CDI ────────────────────────────────────────────────────────────

function NewCodingDialog() {
  const [open, setOpen] = useState(false);
  const [encounterId, setEncounterId] = useState('');
  const [clinicalText, setClinicalText] = useState('');
  const generate = useGenerateCodes();

  const handleGenerate = () => {
    if (!encounterId || !clinicalText) return;
    generate.mutate(
      { encounterId, clinicalText },
      {
        onSuccess: () => {
          toast.success('Codificação gerada com sucesso');
          setOpen(false);
          setEncounterId('');
          setClinicalText('');
        },
        onError: () => toast.error('Erro ao gerar codificação'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Code2 className="h-4 w-4 mr-2" />
          Gerar Códigos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Codificação CDI com IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>ID do Atendimento</Label>
            <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} placeholder="UUID do atendimento" />
          </div>
          <div className="space-y-1">
            <Label>Texto Clínico</Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={clinicalText}
              onChange={(e) => setClinicalText(e.target.value)}
              placeholder="Cole aqui o texto clínico para codificação automática CID-10/CBHPM/TUSS..."
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!encounterId || !clinicalText || generate.isPending}
            onClick={handleGenerate}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generate.isPending ? 'Gerando...' : 'Gerar Codificação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function codingStatusBadge(status: CodingSession['status']) {
  const map = {
    PROCESSING: { label: 'Processando', variant: 'secondary' as const },
    READY: { label: 'Pronto', variant: 'default' as const },
    REVIEWED: { label: 'Revisado', variant: 'outline' as const },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function CodingTab() {
  const { data, isLoading } = useCodingSessions();
  const sessions = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} sessões CDI</p>
        <NewCodingDialog />
      </div>
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando sessões...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma sessão de codificação registrada</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{s.patientName ?? `Atendimento ${s.encounterId}`}</CardTitle>
                  {codingStatusBadge(s.status)}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {s.suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem sugestões ainda</p>
                ) : (
                  <div className="space-y-1">
                    {s.suggestions.slice(0, 4).map((sg) => (
                      <div key={sg.id} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-emerald-400">{sg.code}</span>
                        <span className="flex-1 px-3 truncate text-muted-foreground">{sg.description}</span>
                        <span className="text-xs text-muted-foreground">{(sg.confidence * 100).toFixed(0)}%</span>
                        <Badge variant={sg.status === 'ACCEPTED' ? 'default' : sg.status === 'REJECTED' ? 'destructive' : 'outline'} className="ml-2 text-xs">
                          {sg.status === 'ACCEPTED' ? 'Aceito' : sg.status === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                    {s.suggestions.length > 4 && (
                      <p className="text-xs text-muted-foreground">+{s.suggestions.length - 4} sugestões</p>
                    )}
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

// ─── NLP ─────────────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  PROBLEM: 'Problema',
  MEDICATION: 'Medicamento',
  ALLERGY: 'Alergia',
  PROCEDURE: 'Procedimento',
  VITAL_SIGN: 'Sinal Vital',
  LAB_RESULT: 'Resultado Lab',
};

const ENTITY_COLORS: Record<string, string> = {
  PROBLEM: 'bg-red-500/20 text-red-300 border-red-500/40',
  MEDICATION: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  ALLERGY: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  PROCEDURE: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  VITAL_SIGN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  LAB_RESULT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
};

function NLPTab() {
  const [text, setText] = useState('');
  const [selectedTypes] = useState<EntityType[]>([]);
  const extractEntities = useExtractEntities();
  const structureText = useStructureText();
  const [outputFormat, setOutputFormat] = useState<'FHIR' | 'JSON' | 'CSV'>('JSON');

  const handleExtract = () => {
    if (!text) return;
    extractEntities.mutate(
      { text, types: selectedTypes.length > 0 ? selectedTypes : undefined },
      {
        onError: () => toast.error('Erro ao extrair entidades'),
      },
    );
  };

  const handleStructure = () => {
    if (!text) return;
    structureText.mutate(
      { text, outputFormat },
      {
        onSuccess: () => toast.success('Texto estruturado com sucesso'),
        onError: () => toast.error('Erro ao estruturar texto'),
      },
    );
  };

  const result = extractEntities.data;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto Clínico para Análise</Label>
        <textarea
          className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole aqui o texto clínico para extração de entidades biomédicas..."
        />
      </div>
      <div className="flex gap-3 items-end flex-wrap">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!text || extractEntities.isPending}
          onClick={handleExtract}
        >
          <FileSearch className="h-4 w-4 mr-2" />
          {extractEntities.isPending ? 'Extraindo...' : 'Extrair Entidades'}
        </Button>
        <div className="flex items-center gap-2">
          <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as typeof outputFormat)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JSON">JSON</SelectItem>
              <SelectItem value="FHIR">FHIR</SelectItem>
              <SelectItem value="CSV">CSV</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!text || structureText.isPending}
            onClick={handleStructure}
          >
            {structureText.isPending ? 'Estruturando...' : 'Estruturar Texto'}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{result.entities.length} entidades extraídas</p>
            <p className="text-xs text-muted-foreground">{result.processingTimeMs}ms</p>
          </div>
          {result.summary && (
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </CardContent>
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            {result.entities.map((e) => (
              <span
                key={e.id}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${ENTITY_COLORS[e.type] ?? ''}`}
              >
                <span className="font-medium">{ENTITY_LABELS[e.type] ?? e.type}</span>
                <span>{e.normalizedText ?? e.text}</span>
                <span className="opacity-70">{(e.confidence * 100).toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Imaging ───────────────────────────────────────────────────────────────

function severityBadge(severity: ImagingAnalysis['findings'][number]['severity']) {
  const map = {
    NORMAL: { label: 'Normal', variant: 'default' as const },
    INCIDENTAL: { label: 'Incidental', variant: 'secondary' as const },
    SIGNIFICANT: { label: 'Significativo', variant: 'outline' as const },
    CRITICAL: { label: 'Crítico', variant: 'destructive' as const },
  };
  const cfg = map[severity];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ImagingTab() {
  const { data, isLoading } = useImagingAnalyses();
  const { data: stats } = useImagingStats();
  const uploadImage = useUploadImage();
  const [imageType, setImageType] = useState('');
  const analyses = data?.data ?? [];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate(
      { file, imageType: imageType || undefined },
      {
        onSuccess: () => toast.success('Imagem enviada — análise em andamento'),
        onError: () => toast.error('Erro ao enviar imagem'),
      },
    );
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Analisadas', value: stats.totalAnalyzed, color: '' },
            { label: 'Normais', value: stats.normalFindings, color: 'text-emerald-400' },
            { label: 'Significativas', value: stats.significantFindings, color: 'text-yellow-400' },
            { label: 'Críticas', value: stats.criticalFindings, color: 'text-red-400' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label>Tipo de Imagem (opcional)</Label>
          <Input
            className="w-48"
            value={imageType}
            onChange={(e) => setImageType(e.target.value)}
            placeholder="RX, TC, RM, US..."
          />
        </div>
        <label>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            disabled={uploadImage.isPending}
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploadImage.isPending ? 'Enviando...' : 'Enviar Imagem'}
            </span>
          </Button>
          <input type="file" className="hidden" accept="image/*,.dcm" onChange={handleUpload} />
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando análises...</div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma análise de imagem registrada</div>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={a.status === 'COMPLETED' ? 'default' : a.status === 'ERROR' ? 'destructive' : 'secondary'}>
                        {a.status}
                      </Badge>
                      {a.imageType && <Badge variant="outline">{a.imageType}</Badge>}
                      {a.patientName && <span className="text-sm font-medium">{a.patientName}</span>}
                    </div>
                    {a.findings.length > 0 && (
                      <div className="space-y-1">
                        {a.findings.map((f) => (
                          <div key={f.id} className="flex items-center gap-2 text-sm">
                            {severityBadge(f.severity)}
                            <span className="text-muted-foreground">{f.description}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{(f.confidence * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── IA Revolucionária ────────────────────────────────────────────────────────

interface RevCardProps {
  title: string;
  description: string;
  isPending: boolean;
  onTrigger: () => void;
  triggerLabel: string;
  children?: React.ReactNode;
}

function RevCard({ title, description, isPending, onTrigger, triggerLabel, children }: RevCardProps) {
  return (
    <Card className="border-gray-800 bg-[#12121a]">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm text-gray-100">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={isPending}
          onClick={onTrigger}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {isPending ? 'Processando...' : triggerLabel}
        </Button>
        {children}
      </CardContent>
    </Card>
  );
}

function RevolutionaryTab() {
  // ── state ──────────────────────────────────────────────────────────────────
  const [patientId, setPatientId] = useState('demo-patient-1');
  const [encounterId, setEncounterId] = useState('demo-encounter-1');
  const [clinicalText, setClinicalText] = useState('Paciente 65 anos, HAS, DM2, dor torácica há 2h, ECG com BRE novo.');
  const [biQuestion, setBiQuestion] = useState('Quantos atendimentos por dia esta semana?');

  // ── mutations ──────────────────────────────────────────────────────────────
  const differential = useDiagnosisDifferential();
  const pathway = useClinicalPathway();
  const ecg = useEcgInterpretation();
  const mortality = useMortalityPrediction();
  const bi = useConversationalBi();
  const twin = useDigitalTwin();
  const multimodal = useMultimodalAnalysis();
  const autoCoding = useAutonomousCoding();
  const inbox = useInboxManagement();
  const priorAuth = usePriorAuthorization();
  const referral = useIntelligentReferral();
  const followup = usePostVisitFollowup();
  const genomics = useGenomicsTreatment();
  const pathology = useDigitalPathology();

  const onError = () => toast.error('Erro ao chamar serviço de IA');

  return (
    <div className="space-y-4">
      {/* Shared inputs */}
      <Card className="border-gray-800 bg-[#12121a]">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID do Paciente</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="patient-id"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID do Atendimento</Label>
              <Input
                value={encounterId}
                onChange={(e) => setEncounterId(e.target.value)}
                placeholder="encounter-id"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Texto Clínico</Label>
              <Input
                value={clinicalText}
                onChange={(e) => setClinicalText(e.target.value)}
                placeholder="Texto clínico do paciente..."
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* 1 – Diagnóstico Diferencial */}
        <RevCard
          title="Diagnóstico Diferencial"
          description="Probabilidades por diagnóstico com CID-10 e raciocínio clínico"
          isPending={differential.isPending}
          triggerLabel="Gerar Diferenciais"
          onTrigger={() =>
            differential.mutate(
              { clinicalText, age: 65, gender: 'M' },
              { onError },
            )
          }
        >
          {differential.data && (
            <div className="space-y-1.5">
              {(differential.data as DifferentialResponse).differentials.slice(0, 4).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-emerald-400 w-14 shrink-0">{d.icdCode}</span>
                  <span className="flex-1 text-gray-300 truncate">{d.diagnosis}</span>
                  <Badge variant="outline" className="text-[10px]">{(d.probability * 100).toFixed(0)}%</Badge>
                </div>
              ))}
              {(differential.data as DifferentialResponse).redFlags && (differential.data as DifferentialResponse).redFlags!.length > 0 && (
                <p className="text-xs text-red-400 mt-1">
                  ⚠ {(differential.data as DifferentialResponse).redFlags!.join(' · ')}
                </p>
              )}
            </div>
          )}
        </RevCard>

        {/* 2 – Clinical Pathway */}
        <RevCard
          title="Clinical Pathway"
          description="Protocolo clínico baseado em diretrizes para o diagnóstico"
          isPending={pathway.isPending}
          triggerLabel="Gerar Pathway"
          onTrigger={() =>
            pathway.mutate(
              { diagnosisCode: 'I21', severity: 'SEVERE' },
              { onError },
            )
          }
        >
          {pathway.data && (
            <div className="space-y-1.5">
              {(pathway.data as ClinicalPathwayResponse).steps.slice(0, 4).map((s) => (
                <div key={s.order} className="flex gap-2 text-xs">
                  <span className="text-emerald-400 font-medium shrink-0">#{s.order}</span>
                  <span className="text-gray-300">{s.action}</span>
                  {s.timeframe && <span className="text-muted-foreground ml-auto shrink-0">{s.timeframe}</span>}
                </div>
              ))}
              {(pathway.data as ClinicalPathwayResponse).guidelineSource && (
                <p className="text-[10px] text-muted-foreground">
                  Fonte: {(pathway.data as ClinicalPathwayResponse).guidelineSource}
                </p>
              )}
            </div>
          )}
        </RevCard>

        {/* 3 – ECG */}
        <RevCard
          title="Leitura de ECG"
          description="Interpretação automática de eletrocardiograma com IA"
          isPending={ecg.isPending}
          triggerLabel="Interpretar ECG"
          onTrigger={() =>
            ecg.mutate(
              { patientId, clinicalIndication: 'Dor torácica aguda' },
              { onError },
            )
          }
        >
          {ecg.data && (
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={ecg.data.isNormal ? 'default' : 'destructive'}>
                  {ecg.data.isNormal ? 'Normal' : 'Anormal'}
                </Badge>
                <span className="text-gray-300">{(ecg.data as EcgInterpretationType).rhythm}</span>
                {(ecg.data as EcgInterpretationType).heartRate > 0 && (
                  <span className="text-muted-foreground">{(ecg.data as EcgInterpretationType).heartRate} bpm</span>
                )}
              </div>
              <p className="text-gray-300">{(ecg.data as EcgInterpretationType).impression}</p>
              {(ecg.data as EcgInterpretationType).urgency && (
                <p className="text-yellow-400">Urgência: {(ecg.data as EcgInterpretationType).urgency}</p>
              )}
            </div>
          )}
        </RevCard>

        {/* 4 – Predição de Mortalidade */}
        <RevCard
          title="Predição de Mortalidade"
          description="Score preditivo com fatores de risco e intervenções sugeridas"
          isPending={mortality.isPending}
          triggerLabel="Calcular Risco"
          onTrigger={() =>
            mortality.mutate(
              { patientId },
              { onError },
            )
          }
        >
          {mortality.data && (
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">
                  {((mortality.data as MortalityPredictionType).riskScore * 100).toFixed(1)}%
                </span>
                <Badge variant={
                  (mortality.data as MortalityPredictionType).riskLevel === 'HIGH' || (mortality.data as MortalityPredictionType).riskLevel === 'CRITICAL'
                    ? 'destructive'
                    : 'default'
                }>
                  {(mortality.data as MortalityPredictionType).riskLevel}
                </Badge>
              </div>
              {(mortality.data as MortalityPredictionType).contributingFactors.slice(0, 3).map((f, i) => (
                <p key={i} className="text-muted-foreground">· {f}</p>
              ))}
            </div>
          )}
        </RevCard>

        {/* 5 – Conversational BI */}
        <RevCard
          title="Conversational BI"
          description="Consultas em linguagem natural sobre dados clínicos e operacionais"
          isPending={bi.isPending}
          triggerLabel="Perguntar"
          onTrigger={() =>
            bi.mutate(
              { question: biQuestion },
              { onError },
            )
          }
        >
          <div className="space-y-2">
            <Input
              value={biQuestion}
              onChange={(e) => setBiQuestion(e.target.value)}
              placeholder="Sua pergunta..."
              className="h-8 text-xs"
            />
            {bi.data && (
              <div className="text-xs space-y-1">
                <p className="text-gray-300">{(bi.data as ConversationalBiResponse).answer}</p>
                {(bi.data as ConversationalBiResponse).summary && (
                  <p className="text-muted-foreground">{(bi.data as ConversationalBiResponse).summary}</p>
                )}
              </div>
            )}
          </div>
        </RevCard>

        {/* 6 – Digital Twin */}
        <RevCard
          title="Digital Twin"
          description="Simulação de cenários clínicos para o paciente digital"
          isPending={twin.isPending}
          triggerLabel="Simular Cenário"
          onTrigger={() =>
            twin.mutate(
              { patientId, scenario: 'tratamento_conservador', treatmentOptions: ['beta_bloqueador', 'aspirina'] },
              {
                onSuccess: () => toast.success('Simulação Digital Twin concluída'),
                onError,
              },
            )
          }
        >
          {twin.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(twin.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 7 – Multimodal Analysis */}
        <RevCard
          title="Análise Multimodal"
          description="Combina texto, imagem, labs e voz para análise integrada"
          isPending={multimodal.isPending}
          triggerLabel="Analisar"
          onTrigger={() =>
            multimodal.mutate(
              { patientId, clinicalText },
              {
                onSuccess: () => toast.success('Análise multimodal concluída'),
                onError,
              },
            )
          }
        >
          {multimodal.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(multimodal.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 8 – Autonomous Coding */}
        <RevCard
          title="Codificação Autônoma"
          description="Codificação e faturamento automatizado sem intervenção humana"
          isPending={autoCoding.isPending}
          triggerLabel="Codificar e Faturar"
          onTrigger={() =>
            autoCoding.mutate(
              { encounterId, autoSubmit: false },
              {
                onSuccess: () => toast.success('Codificação autônoma gerada'),
                onError,
              },
            )
          }
        >
          {autoCoding.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(autoCoding.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 9 – Inbox Management */}
        <RevCard
          title="Triagem de Mensagens"
          description="IA que classifica e prioriza mensagens da caixa de entrada"
          isPending={inbox.isPending}
          triggerLabel="Triar Caixa de Entrada"
          onTrigger={() =>
            inbox.mutate(
              { limit: 20 },
              { onError },
            )
          }
        >
          {inbox.data && (
            <div className="text-xs space-y-1">
              <div className="flex gap-3">
                <span className="text-gray-400">Total: <span className="text-gray-100 font-medium">{(inbox.data as InboxManagementType).totalMessages}</span></span>
                <span className="text-gray-400">Triadas: <span className="text-gray-100 font-medium">{(inbox.data as InboxManagementType).triaged}</span></span>
                <span className="text-red-400">Urgentes: <span className="font-medium">{(inbox.data as InboxManagementType).urgent?.length ?? 0}</span></span>
              </div>
              {(inbox.data as InboxManagementType).urgent?.slice(0, 2).map((u) => (
                <div key={u.messageId} className="bg-red-950/30 border border-red-900/40 rounded p-1.5">
                  <p className="font-medium text-red-300">{u.patientName} — {u.subject}</p>
                  <p className="text-muted-foreground">{u.urgencyReason}</p>
                </div>
              ))}
            </div>
          )}
        </RevCard>

        {/* 10 – Prior Authorization */}
        <RevCard
          title="Pré-Autorização"
          description="Automação do processo de pré-autorização junto ao plano"
          isPending={priorAuth.isPending}
          triggerLabel="Solicitar Pré-Auth"
          onTrigger={() =>
            priorAuth.mutate(
              { encounterId, procedureCodes: ['31.01.005-2', '40.01.006-9'] },
              {
                onSuccess: () => toast.success('Pré-autorização submetida'),
                onError,
              },
            )
          }
        >
          {priorAuth.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(priorAuth.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 11 – Intelligent Referral */}
        <RevCard
          title="Referral Inteligente"
          description="Encaminhamento automatizado com seleção do especialista ideal"
          isPending={referral.isPending}
          triggerLabel="Gerar Encaminhamento"
          onTrigger={() =>
            referral.mutate(
              { patientId, specialty: 'Cardiologia', clinicalReason: clinicalText },
              {
                onSuccess: () => toast.success('Encaminhamento gerado'),
                onError,
              },
            )
          }
        >
          {referral.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(referral.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 12 – Follow-up Pós-Consulta */}
        <RevCard
          title="Follow-up Pós-Consulta"
          description="Automação de acompanhamento após a consulta com mensagens personalizadas"
          isPending={followup.isPending}
          triggerLabel="Enviar Follow-up"
          onTrigger={() =>
            followup.mutate(
              { patientId, encounterId },
              {
                onSuccess: () => toast.success('Follow-up enviado ao paciente'),
                onError,
              },
            )
          }
        >
          {followup.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(followup.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 13 – Genomics Treatment */}
        <RevCard
          title="Tratamento Guiado por Genômica"
          description="Recomendações terapêuticas personalizadas por variantes genéticas"
          isPending={genomics.isPending}
          triggerLabel="Analisar Genoma"
          onTrigger={() =>
            genomics.mutate(
              { patientId, diagnosis: 'Infarto Agudo do Miocárdio' },
              {
                onSuccess: () => toast.success('Análise genômica concluída'),
                onError,
              },
            )
          }
        >
          {genomics.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(genomics.data, null, 2)}
            </p>
          )}
        </RevCard>

        {/* 14 – Digital Pathology */}
        <RevCard
          title="Patologia Digital"
          description="Análise automatizada de lâminas histopatológicas com IA"
          isPending={pathology.isPending}
          triggerLabel="Analisar Lâmina"
          onTrigger={() =>
            pathology.mutate(
              { patientId, tissueType: 'miocárdio' },
              {
                onSuccess: () => toast.success('Análise de patologia digital concluída'),
                onError,
              },
            )
          }
        >
          {pathology.data && (
            <p className="text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {JSON.stringify(pathology.data, null, 2)}
            </p>
          )}
        </RevCard>

      </div>
    </div>
  );
}

// ─── Hub Page ─────────────────────────────────────────────────────────────────

export default function AiHubPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Central de IA</h1>
          <p className="text-sm text-muted-foreground">
            Módulos de inteligência artificial clínica — escuta ambiente, agentes, codificação CDI, NLP e imagem
          </p>
        </div>
      </div>

      <Tabs defaultValue="ambient" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ambient" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Ambient Listening
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Agentes IA
          </TabsTrigger>
          <TabsTrigger value="coding" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Codificação CDI
          </TabsTrigger>
          <TabsTrigger value="nlp" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            NLP
          </TabsTrigger>
          <TabsTrigger value="imaging" className="flex items-center gap-2">
            <ScanEye className="h-4 w-4" />
            Imagem
          </TabsTrigger>
          <TabsTrigger value="revolutionary" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            IA Revolucionária
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ambient"><AmbientTab /></TabsContent>
        <TabsContent value="agents"><AgentsTab /></TabsContent>
        <TabsContent value="coding"><CodingTab /></TabsContent>
        <TabsContent value="nlp"><NLPTab /></TabsContent>
        <TabsContent value="imaging"><ImagingTab /></TabsContent>
        <TabsContent value="revolutionary"><RevolutionaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
