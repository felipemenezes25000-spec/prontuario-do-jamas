import { useState, useMemo, useCallback } from 'react';
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
  Activity,
  BarChart3,
  Zap,
  Shield,
  TrendingUp,

  Dna,
  Heart,
  AlertTriangle,
  Settings,
  RefreshCw,
  Send,
  Eye,
  Stethoscope,
  Layers,
  ListChecks,
  Search,
  Languages,
  ChevronRight,
  CircleDot,
  Gauge,
  Timer,
  DollarSign,
  Cpu,
  Wand2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  useAmbientSessions,
  useStartAmbientSession,
  useStopAmbientSession,
  useApproveAmbientNote,
  useAmbientStats,
  type AmbientSession,
} from '@/services/ai-ambient.service';
import {
  useAgentTasks,
  useAgentConfigs,
  useAgentStats,
  useAgentExecutionLogs,
  useExecuteAgentTask,
  useUpdateAgentConfig,
  type AgentTaskType,
  type AgentTask,
  type AgentConfig,
} from '@/services/ai-agents.service';
import {
  useCodingSessions,
  useCodingStats,
  useCodingMetrics,
  useGenerateCodes,
  useUpdateCodeStatus,
  type CodingSession,
} from '@/services/ai-coding.service';
import {
  useExtractEntities,
  useStructureText,
  useDetectInconsistencies,
  useTranslateText,
  type EntityType,
} from '@/services/ai-nlp.service';
import {
  useImagingAnalyses,
  useImagingStats,
  useImagingWorklist,
  useCADResults,
  useUploadImage,
  useReprioritizeWorklist,
  type ImagingAnalysis,
} from '@/services/ai-imaging.service';
import {
  useDiagnosisDifferential,
  useClinicalPathway,
  useMortalityPrediction,
  useConversationalBi,
  useDigitalTwin,
  useMultimodalAnalysis,
  useGenomicsTreatment,
  type DifferentialResponse,
  type ClinicalPathwayResponse,
  type MortalityPrediction as MortalityPredictionType,
  type ConversationalBiResponse,
} from '@/services/ai-revolutionary.service';

// ─── Mock data for Dashboard (when API returns empty) ───────────────────────

const MOCK_USAGE_DATA = [
  { date: '18/03', queries: 142, responseTime: 1.2, tokens: 45200 },
  { date: '19/03', queries: 178, responseTime: 1.1, tokens: 52300 },
  { date: '20/03', queries: 195, responseTime: 0.9, tokens: 58100 },
  { date: '21/03', queries: 163, responseTime: 1.3, tokens: 47800 },
  { date: '22/03', queries: 210, responseTime: 1.0, tokens: 62400 },
  { date: '23/03', queries: 189, responseTime: 0.8, tokens: 55600 },
  { date: '24/03', queries: 224, responseTime: 0.7, tokens: 68900 },
];

const MOCK_ACTIONS_LOG = [
  { id: '1', module: 'Ambient', action: 'Nota SOAP gerada', patient: 'Maria S.', time: '14:32', status: 'success' as const },
  { id: '2', module: 'Coding', action: 'CID-10 sugerido: I21.0', patient: 'Joao P.', time: '14:28', status: 'success' as const },
  { id: '3', module: 'NLP', action: 'Entidades extraidas (12)', patient: 'Ana L.', time: '14:25', status: 'success' as const },
  { id: '4', module: 'Imaging', action: 'Achado critico detectado', patient: 'Carlos R.', time: '14:20', status: 'warning' as const },
  { id: '5', module: 'Agent', action: 'Pre-consulta preparada', patient: 'Pedro M.', time: '14:15', status: 'success' as const },
  { id: '6', module: 'Differential', action: 'Diagnostico diferencial gerado', patient: 'Lucia F.', time: '14:10', status: 'success' as const },
  { id: '7', module: 'Imaging', action: 'RX Torax analisado - normal', patient: 'Marcos V.', time: '14:05', status: 'success' as const },
  { id: '8', module: 'Coding', action: 'Batch coding (5 atendimentos)', patient: '—', time: '14:00', status: 'success' as const },
  { id: '9', module: 'Agent', action: 'Follow-up enviado', patient: 'Teresa C.', time: '13:55', status: 'success' as const },
  { id: '10', module: 'NLP', action: 'Inconsistencia detectada', patient: 'Roberto S.', time: '13:50', status: 'warning' as const },
];

const MOCK_COST_DATA = [
  { date: '18/03', gpt4o: 12.4, whisper: 3.2, embeddings: 1.1 },
  { date: '19/03', gpt4o: 15.8, whisper: 4.1, embeddings: 1.3 },
  { date: '20/03', gpt4o: 14.2, whisper: 3.8, embeddings: 1.2 },
  { date: '21/03', gpt4o: 11.5, whisper: 2.9, embeddings: 0.9 },
  { date: '22/03', gpt4o: 18.3, whisper: 5.2, embeddings: 1.6 },
  { date: '23/03', gpt4o: 16.1, whisper: 4.5, embeddings: 1.4 },
  { date: '24/03', gpt4o: 19.7, whisper: 5.8, embeddings: 1.8 },
];

const MOCK_MODULE_STATUS = [
  { name: 'Ambient Listening', status: 'online' as const, uptime: 99.8, latency: 120 },
  { name: 'Agentes IA', status: 'online' as const, uptime: 99.5, latency: 340 },
  { name: 'Codificacao CDI', status: 'online' as const, uptime: 99.9, latency: 890 },
  { name: 'NLP Clinico', status: 'online' as const, uptime: 99.7, latency: 450 },
  { name: 'IA Imaging', status: 'degraded' as const, uptime: 97.2, latency: 2100 },
  { name: 'Diagnostico Diferencial', status: 'online' as const, uptime: 99.6, latency: 1200 },
  { name: 'Digital Twin', status: 'offline' as const, uptime: 0, latency: 0 },
  { name: 'Genomics', status: 'online' as const, uptime: 98.1, latency: 3500 },
];

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ─── Dashboard Tab ──────────────────────────────────────────────────────────

function DashboardTab() {
  const moduleDistribution = [
    { name: 'Ambient', value: 35 },
    { name: 'Coding', value: 25 },
    { name: 'NLP', value: 20 },
    { name: 'Imaging', value: 12 },
    { name: 'Agents', value: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">1.301</p>
                <p className="text-xs text-muted-foreground">Consultas IA / semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Timer className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0.9s</p>
                <p className="text-xs text-muted-foreground">Tempo medio de resposta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Gauge className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">94.7%</p>
                <p className="text-xs text-muted-foreground">Taxa de acuracia</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">R$ 387</p>
                <p className="text-xs text-muted-foreground">Custo semanal tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              Consultas IA por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_USAGE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Area type="monotone" dataKey="queries" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              Custo por Modelo (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_COST_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Bar dataKey="gpt4o" stackId="a" fill="#10b981" name="GPT-4o" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="whisper" stackId="a" fill="#3b82f6" name="Whisper" />
                  <Bar dataKey="embeddings" stackId="a" fill="#f59e0b" name="Embeddings" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Status + Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Module Status */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-400" />
              Status dos Modulos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_MODULE_STATUS.map((mod) => (
              <div key={mod.name} className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      mod.status === 'online'
                        ? 'bg-emerald-400 animate-pulse'
                        : mod.status === 'degraded'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-zinc-600'
                    }`}
                  />
                  <span className="text-xs text-zinc-300">{mod.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {mod.status !== 'offline' && (
                    <span className="text-[10px] text-muted-foreground">{mod.latency}ms</span>
                  )}
                  <Badge
                    variant={mod.status === 'online' ? 'default' : mod.status === 'degraded' ? 'secondary' : 'outline'}
                    className="text-[10px] px-1.5"
                  >
                    {mod.status === 'online' ? 'Online' : mod.status === 'degraded' ? 'Degradado' : 'Offline'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent AI Actions */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Acoes Recentes da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-xs h-8">Hora</TableHead>
                    <TableHead className="text-xs h-8">Modulo</TableHead>
                    <TableHead className="text-xs h-8">Acao</TableHead>
                    <TableHead className="text-xs h-8">Paciente</TableHead>
                    <TableHead className="text-xs h-8">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ACTIONS_LOG.map((log) => (
                    <TableRow key={log.id} className="border-zinc-800">
                      <TableCell className="text-xs py-2 text-muted-foreground">{log.time}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="outline" className="text-[10px]">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2 text-zinc-300">{log.action}</TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{log.patient}</TableCell>
                      <TableCell className="py-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Tokens Consumidos por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_USAGE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Distribuicao por Modulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie data={moduleDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                    {moduleDistribution.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {moduleDistribution.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="text-zinc-300 flex-1">{item.name}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Ambient Listening ──────────────────────────────────────────────────────

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

function WaveformVisualization({ isRecording }: { isRecording: boolean }) {
  const bars = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({
      id: i,
      height: Math.random() * 60 + 10,
      delay: i * 0.05,
    })),
    [],
  );

  return (
    <div className="flex items-center justify-center gap-[2px] h-16 bg-zinc-950 rounded-lg px-4 overflow-hidden">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`w-1 rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-zinc-700'
          }`}
          style={{
            height: isRecording ? `${bar.height}%` : '15%',
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function NewAmbientDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [language, setLanguage] = useState('pt-BR');
  const [specialty, setSpecialty] = useState('clinica-geral');
  const startSession = useStartAmbientSession();

  const handleStart = () => {
    startSession.mutate(
      {
        patientId: patientId || undefined,
        encounterId: encounterId || undefined,
        language,
        specialty,
      },
      {
        onSuccess: () => {
          toast.success('Sessao de escuta iniciada');
          setOpen(false);
          setPatientId('');
          setEncounterId('');
        },
        onError: () => toast.error('Erro ao iniciar sessao'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Mic className="h-4 w-4 mr-2" />
          Nova Sessao
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Portugues (BR)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Espanol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Especialidade</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinica-geral">Clinica Geral</SelectItem>
                  <SelectItem value="cardiologia">Cardiologia</SelectItem>
                  <SelectItem value="ortopedia">Ortopedia</SelectItem>
                  <SelectItem value="pediatria">Pediatria</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={startSession.isPending}
            onClick={handleStart}
          >
            <Mic className="h-4 w-4 mr-2" />
            {startSession.isPending ? 'Iniciando...' : 'Iniciar Gravacao'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmbientTab() {
  const { data, isLoading } = useAmbientSessions();
  const { data: stats } = useAmbientStats();
  const stopSession = useStopAmbientSession();
  const approveNote = useApproveAmbientNote();
  const sessions = data?.data ?? [];

  const activeSession = sessions.find((s) => s.status === 'RECORDING');

  const handleStop = (id: string) => {
    stopSession.mutate(id, {
      onSuccess: () => toast.success('Sessao encerrada — processando nota clinica'),
      onError: () => toast.error('Erro ao encerrar sessao'),
    });
  };

  const handleApprove = (sessionId: string) => {
    approveNote.mutate(
      { sessionId, encounterId: 'auto' },
      {
        onSuccess: () => toast.success('Nota SOAP aprovada e vinculada'),
        onError: () => toast.error('Erro ao aprovar nota'),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Sessoes Hoje', value: stats.sessionsToday, icon: Mic },
            { label: 'Duracao Media', value: `${stats.avgDurationMinutes.toFixed(0)} min`, icon: Timer },
            { label: 'SOAP Geradas', value: stats.soapGeneratedCount, icon: ListChecks },
            { label: 'Taxa Aprovacao', value: `${(stats.approvalRate * 100).toFixed(0)}%`, icon: CheckCircle2 },
          ].map((s) => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <s.icon className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Recording */}
      {activeSession && (
        <Card className="bg-zinc-900 border-emerald-800/50 border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                Gravacao Ativa
                {activeSession.patientName && <span className="text-muted-foreground font-normal">— {activeSession.patientName}</span>}
              </CardTitle>
              <Button size="sm" variant="destructive" onClick={() => handleStop(activeSession.id)} disabled={stopSession.isPending}>
                <Square className="h-3 w-3 mr-1" />
                Parar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <WaveformVisualization isRecording />
            <div className="bg-zinc-950 rounded-lg p-3 text-xs text-zinc-400 min-h-[60px]">
              <p className="animate-pulse">Transcricao em tempo real aparecera aqui...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header + Dialog */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} sessoes no historico</p>
        <NewAmbientDialog />
      </div>

      {/* Session History */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando sessoes...</div>
      ) : sessions.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mic className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
            <p>Nenhuma sessao de escuta registrada</p>
            <p className="text-xs mt-1">Clique em &quot;Nova Sessao&quot; para comecar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {sessionStatusBadge(s.status)}
                      {s.patientName && <span className="text-sm font-medium">{s.patientName}</span>}
                      {s.specialty && <Badge variant="outline" className="text-[10px]">{s.specialty}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Iniciado: {new Date(s.startedAt).toLocaleString('pt-BR')}
                      {s.durationSeconds != null && ` · ${Math.round(s.durationSeconds / 60)} min`}
                    </p>
                    {s.transcript && (
                      <div className="text-xs bg-zinc-950 rounded p-2 text-zinc-400 line-clamp-2">
                        {s.transcript}
                      </div>
                    )}
                    {s.clinicalNote && (
                      <div className="text-xs bg-zinc-950 rounded p-3 space-y-1 border border-zinc-800">
                        <p className="text-emerald-400 font-medium mb-1">Nota SOAP Gerada:</p>
                        <p><span className="font-medium text-zinc-300">S:</span> <span className="text-zinc-400">{s.clinicalNote.subjective}</span></p>
                        <p><span className="font-medium text-zinc-300">O:</span> <span className="text-zinc-400">{s.clinicalNote.objective}</span></p>
                        <p><span className="font-medium text-zinc-300">A:</span> <span className="text-zinc-400">{s.clinicalNote.assessment}</span></p>
                        <p><span className="font-medium text-zinc-300">P:</span> <span className="text-zinc-400">{s.clinicalNote.plan}</span></p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {s.status === 'RECORDING' && (
                      <Button size="sm" variant="destructive" onClick={() => handleStop(s.id)} disabled={stopSession.isPending}>
                        <Square className="h-3 w-3 mr-1" />
                        Parar
                      </Button>
                    )}
                    {s.status === 'READY' && s.clinicalNote && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(s.id)} disabled={approveNote.isPending}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Config Panel */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-400" />
            Configuracoes do Ambient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
              <div>
                <p className="text-sm text-zinc-300">Geracao SOAP Automatica</p>
                <p className="text-xs text-muted-foreground">Gerar nota ao encerrar gravacao</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
              <div>
                <p className="text-sm text-zinc-300">Reducao de Ruido</p>
                <p className="text-xs text-muted-foreground">Filtrar ruido de fundo</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
              <div>
                <p className="text-sm text-zinc-300">Diarizacao de Falantes</p>
                <p className="text-xs text-muted-foreground">Separar medico / paciente</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Agentic AI ─────────────────────────────────────────────────────────────

function agentStatusIcon(status: AgentTask['status']) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'ERROR') return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === 'RUNNING') return <Play className="h-4 w-4 text-blue-400 animate-pulse" />;
  return <Clock className="h-4 w-4 text-yellow-400" />;
}

const AGENT_DEFINITIONS: Record<AgentTaskType, { label: string; description: string; icon: typeof Bot }> = {
  PREPARE_CONSULTATION: { label: 'Pre-Consulta', description: 'Prepara resumo clinico antes da consulta', icon: Stethoscope },
  PREFILL_FORM: { label: 'Preencher Formulario', description: 'Pre-preenche formularios com dados do paciente', icon: ListChecks },
  SUMMARIZE_PATIENT: { label: 'Resumir Paciente', description: 'Gera sumario executivo do paciente', icon: FileSearch },
  INBOX_TRIAGE: { label: 'Triagem de Inbox', description: 'Prioriza e classifica mensagens recebidas', icon: Search },
  PRIOR_AUTH: { label: 'Pre-Autorizacao', description: 'Automacao de solicitacao ao convenio', icon: Shield },
  REFERRAL: { label: 'Encaminhamento', description: 'Gera encaminhamentos inteligentes', icon: Send },
  FOLLOW_UP: { label: 'Follow-up', description: 'Acompanhamento pos-consulta automatizado', icon: Heart },
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(AGENT_DEFINITIONS) as AgentTaskType[]).map((t) => (
                  <SelectItem key={t} value={t}>{AGENT_DEFINITIONS[t].label}</SelectItem>
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
  const { data: tasksData, isLoading: tasksLoading } = useAgentTasks();
  const { data: configs } = useAgentConfigs();
  const { data: stats } = useAgentStats();
  const { data: logsData } = useAgentExecutionLogs();
  const updateConfig = useUpdateAgentConfig();
  const tasks = tasksData?.data ?? [];
  const logs = logsData?.data ?? [];

  const handleToggleAgent = useCallback(
    (agentType: AgentTaskType, enabled: boolean) => {
      updateConfig.mutate(
        { agentType, enabled },
        {
          onSuccess: () => toast.success(`Agente ${enabled ? 'ativado' : 'desativado'}`),
          onError: () => toast.error('Erro ao atualizar configuracao'),
        },
      );
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.completedToday}</p>
              <p className="text-xs text-muted-foreground">Concluidas Hoje</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.runningNow}</p>
              <p className="text-xs text-muted-foreground">Em Execucao</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{(stats.avgCompletionTimeMs / 1000).toFixed(1)}s</p>
              <p className="text-xs text-muted-foreground">Tempo Medio</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-red-400">{(stats.errorRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Erro</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(Object.keys(AGENT_DEFINITIONS) as AgentTaskType[]).map((agentType) => {
          const def = AGENT_DEFINITIONS[agentType];
          const config = configs?.find((c: AgentConfig) => c.agentType === agentType);
          const Icon = def.icon;

          return (
            <Card key={agentType} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <CardTitle className="text-sm">{def.label}</CardTitle>
                  </div>
                  <Switch
                    checked={config?.enabled ?? true}
                    onCheckedChange={(checked) => handleToggleAgent(agentType, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-xs text-muted-foreground mb-3">{def.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-950 rounded p-2">
                    <p className="text-muted-foreground">Execucoes</p>
                    <p className="font-bold text-white">{config?.totalRuns ?? 0}</p>
                  </div>
                  <div className="bg-zinc-950 rounded p-2">
                    <p className="text-muted-foreground">Taxa Sucesso</p>
                    <p className="font-bold text-emerald-400">{config ? `${(config.successRate * 100).toFixed(0)}%` : '—'}</p>
                  </div>
                  <div className="bg-zinc-950 rounded p-2">
                    <p className="text-muted-foreground">Concluidas</p>
                    <p className="font-bold text-white">{config?.tasksCompleted ?? 0}</p>
                  </div>
                  <div className="bg-zinc-950 rounded p-2">
                    <p className="text-muted-foreground">Ultima Execucao</p>
                    <p className="font-bold text-zinc-300 text-[10px]">
                      {config?.lastRunAt ? new Date(config.lastRunAt).toLocaleString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Task Queue + Execution Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Queue */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-400" />
                Fila de Tarefas
              </CardTitle>
              <NewAgentDialog />
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
            ) : tasks.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma tarefa na fila</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tasks.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 bg-zinc-950 rounded-lg">
                    {agentStatusIcon(t.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{AGENT_DEFINITIONS[t.type]?.label ?? t.type}</p>
                      <p className="text-[10px] text-muted-foreground">{t.patientName ?? t.patientId}</p>
                    </div>
                    <Badge
                      variant={t.priority === 'CRITICAL' ? 'destructive' : t.priority === 'HIGH' ? 'secondary' : 'outline'}
                      className="text-[10px] shrink-0"
                    >
                      {t.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Log */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Log de Execucao
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum log de execucao</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {logs.slice(0, 15).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 bg-zinc-950 rounded-lg text-xs">
                    {log.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 truncate">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{log.durationMs}ms</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── AI Coding CDI ──────────────────────────────────────────────────────────

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
  const { data: stats } = useCodingStats();
  const { data: metrics } = useCodingMetrics();
  const generate = useGenerateCodes();
  const updateStatus = useUpdateCodeStatus();
  const [encounterId, setEncounterId] = useState('');
  const [clinicalText, setClinicalText] = useState('');
  const sessions = data?.data ?? [];

  const handleGenerate = () => {
    if (!clinicalText) return;
    generate.mutate(
      { encounterId: encounterId || 'demo-encounter', clinicalText },
      {
        onSuccess: () => {
          toast.success('Codificacao gerada com sucesso');
          setClinicalText('');
        },
        onError: () => toast.error('Erro ao gerar codificacao'),
      },
    );
  };

  const handleAcceptReject = (sessionId: string, suggestionId: string, status: 'ACCEPTED' | 'REJECTED') => {
    updateStatus.mutate(
      { sessionId, suggestionId, status },
      {
        onSuccess: () => toast.success(status === 'ACCEPTED' ? 'Codigo aceito' : 'Codigo rejeitado'),
        onError: () => toast.error('Erro ao atualizar status'),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.totalSuggestions}</p>
              <p className="text-xs text-muted-foreground">Total Sugestoes</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{(stats.accuracyRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Acuracia</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.acceptedCount}</p>
              <p className="text-xs text-muted-foreground">Aceitas</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input Area */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            Analisar Texto Clinico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              placeholder="ID do Atendimento (opcional)"
              className="md:col-span-1"
            />
            <Textarea
              className="md:col-span-3 min-h-[80px]"
              value={clinicalText}
              onChange={(e) => setClinicalText(e.target.value)}
              placeholder="Cole o texto clinico para codificacao automatica CID-10 / CBHPM / TUSS..."
            />
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!clinicalText || generate.isPending}
            onClick={handleGenerate}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generate.isPending ? 'Gerando...' : 'Gerar Codificacao'}
          </Button>
        </CardContent>
      </Card>

      {/* Accuracy Chart */}
      {metrics && metrics.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Acuracia ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Acuracia (%)" dot={{ fill: '#10b981', r: 3 }} />
                  <Line type="monotone" dataKey="suggestions" stroke="#3b82f6" strokeWidth={1.5} name="Sugestoes" dot={{ fill: '#3b82f6', r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando sessoes...</div>
      ) : sessions.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Code2 className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
            <p>Nenhuma sessao de codificacao registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{s.patientName ?? `Atendimento ${s.encounterId.slice(0, 8)}...`}</CardTitle>
                  <div className="flex items-center gap-2">
                    {codingStatusBadge(s.status)}
                    <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {s.suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem sugestoes ainda</p>
                ) : (
                  <div className="rounded-md border border-zinc-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-xs h-8">Codigo</TableHead>
                          <TableHead className="text-xs h-8">Sistema</TableHead>
                          <TableHead className="text-xs h-8">Descricao</TableHead>
                          <TableHead className="text-xs h-8 text-right">Confianca</TableHead>
                          <TableHead className="text-xs h-8 text-right">Acao</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.suggestions.map((sg) => (
                          <TableRow key={sg.id} className="border-zinc-800">
                            <TableCell className="text-xs py-2 font-mono text-emerald-400">{sg.code}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className="text-[10px]">{sg.codeSystem}</Badge>
                            </TableCell>
                            <TableCell className="text-xs py-2 text-zinc-300 max-w-[200px] truncate">{sg.description}</TableCell>
                            <TableCell className="text-xs py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={sg.confidence * 100} className="h-1.5 w-16" />
                                <span className="text-muted-foreground w-8">{(sg.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {sg.status === 'PENDING' ? (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-emerald-400 hover:text-emerald-300"
                                    onClick={() => handleAcceptReject(s.id, sg.id, 'ACCEPTED')}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-red-400 hover:text-red-300"
                                    onClick={() => handleAcceptReject(s.id, sg.id, 'REJECTED')}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant={sg.status === 'ACCEPTED' ? 'default' : 'destructive'} className="text-[10px]">
                                  {sg.status === 'ACCEPTED' ? 'Aceito' : 'Rejeitado'}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

// ─── NLP Clinico ────────────────────────────────────────────────────────────

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
  const [outputFormat, setOutputFormat] = useState<'FHIR' | 'JSON' | 'CSV'>('JSON');
  const [targetLang, setTargetLang] = useState<'EN' | 'ES' | 'FR'>('EN');
  const extractEntities = useExtractEntities();
  const structureText = useStructureText();
  const detectInconsistencies = useDetectInconsistencies();
  const translateText = useTranslateText();

  const handleExtract = () => {
    if (!text) return;
    extractEntities.mutate(
      { text, types: selectedTypes.length > 0 ? selectedTypes : undefined },
      { onError: () => toast.error('Erro ao extrair entidades') },
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

  const handleInconsistencies = () => {
    if (!text) return;
    detectInconsistencies.mutate(
      { text },
      { onError: () => toast.error('Erro ao detectar inconsistencias') },
    );
  };

  const handleTranslate = () => {
    if (!text) return;
    translateText.mutate(
      { text, targetLanguage: targetLang },
      { onError: () => toast.error('Erro ao traduzir texto') },
    );
  };

  const extractionResult = extractEntities.data;
  const structuredResult = structureText.data;
  const inconsistencyResult = detectInconsistencies.data;
  const translationResult = translateText.data;

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-emerald-400" />
            Texto Clinico para Analise NLP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="min-h-[120px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui o texto clinico para extracao de entidades biomedicas, deteccao de inconsistencias e traducao..."
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!text || extractEntities.isPending}
              onClick={handleExtract}
            >
              <Search className="h-4 w-4 mr-2" />
              {extractEntities.isPending ? 'Extraindo...' : 'Extrair Entidades'}
            </Button>
            <div className="flex items-center gap-2">
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as typeof outputFormat)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="FHIR">FHIR</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" disabled={!text || structureText.isPending} onClick={handleStructure}>
                <Layers className="h-4 w-4 mr-2" />
                {structureText.isPending ? 'Estruturando...' : 'Estruturar'}
              </Button>
            </div>
            <Button variant="outline" disabled={!text || detectInconsistencies.isPending} onClick={handleInconsistencies}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              {detectInconsistencies.isPending ? 'Detectando...' : 'Inconsistencias'}
            </Button>
            <div className="flex items-center gap-2">
              <Select value={targetLang} onValueChange={(v) => setTargetLang(v as typeof targetLang)}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">EN</SelectItem>
                  <SelectItem value="ES">ES</SelectItem>
                  <SelectItem value="FR">FR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" disabled={!text || translateText.isPending} onClick={handleTranslate}>
                <Languages className="h-4 w-4 mr-2" />
                {translateText.isPending ? 'Traduzindo...' : 'Traduzir'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entity Extraction Results */}
        {extractionResult && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Entidades Extraidas</CardTitle>
                <span className="text-xs text-muted-foreground">{extractionResult.processingTimeMs}ms</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{extractionResult.entities.length} entidades encontradas</p>
              {extractionResult.summary && (
                <p className="text-xs bg-zinc-950 rounded p-2 text-zinc-400">{extractionResult.summary}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {extractionResult.entities.map((e) => (
                  <span
                    key={e.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${ENTITY_COLORS[e.type] ?? ''}`}
                  >
                    <span className="font-medium">{ENTITY_LABELS[e.type] ?? e.type}</span>
                    <span>{e.normalizedText ?? e.text}</span>
                    <span className="opacity-70">{(e.confidence * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Structured Output */}
        {structuredResult && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                Texto Estruturado ({structuredResult.format})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-950 rounded p-3 overflow-auto max-h-[250px] text-zinc-400 border border-zinc-800">
                {JSON.stringify(structuredResult.structured, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Inconsistency Results */}
        {inconsistencyResult && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Inconsistencias Detectadas
                </CardTitle>
                <Badge
                  variant={inconsistencyResult.overallRisk === 'HIGH' ? 'destructive' : inconsistencyResult.overallRisk === 'MEDIUM' ? 'secondary' : 'outline'}
                  className="text-[10px]"
                >
                  Risco {inconsistencyResult.overallRisk}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {inconsistencyResult.inconsistencies.length === 0 ? (
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Nenhuma inconsistencia detectada
                </p>
              ) : (
                inconsistencyResult.inconsistencies.map((inc) => (
                  <div key={inc.id} className="p-2 bg-zinc-950 rounded-lg space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={inc.severity === 'HIGH' ? 'destructive' : inc.severity === 'MEDIUM' ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {inc.severity}
                      </Badge>
                      <span className="text-xs text-zinc-300">{inc.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{inc.description}</p>
                    {inc.suggestion && (
                      <p className="text-xs text-emerald-400">Sugestao: {inc.suggestion}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Translation */}
        {translationResult && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Languages className="h-4 w-4 text-purple-400" />
                  Traducao ({translationResult.sourceLanguage} {'>'} {translationResult.targetLanguage})
                </CardTitle>
                <span className="text-xs text-muted-foreground">{translationResult.processingTimeMs}ms</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs bg-zinc-950 rounded p-3 text-zinc-300 border border-zinc-800">
                {translationResult.translatedText}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {translationResult.medicalTermsPreserved} termos medicos preservados na traducao
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── AI Imaging ─────────────────────────────────────────────────────────────

function severityBadge(severity: ImagingAnalysis['findings'][number]['severity']) {
  const map = {
    NORMAL: { label: 'Normal', variant: 'default' as const },
    INCIDENTAL: { label: 'Incidental', variant: 'secondary' as const },
    SIGNIFICANT: { label: 'Significativo', variant: 'outline' as const },
    CRITICAL: { label: 'Critico', variant: 'destructive' as const },
  };
  const cfg = map[severity];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ImagingTab() {
  const { data, isLoading } = useImagingAnalyses();
  const { data: stats } = useImagingStats();
  const { data: worklistData } = useImagingWorklist();
  const { data: cadData } = useCADResults();
  const uploadImage = useUploadImage();
  const reprioritize = useReprioritizeWorklist();
  const [imageType, setImageType] = useState('');
  const analyses = data?.data ?? [];
  const worklist = worklistData?.data ?? [];
  const cadResults = cadData?.data ?? [];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate(
      { file, imageType: imageType || undefined },
      {
        onSuccess: () => toast.success('Imagem enviada — analise em andamento'),
        onError: () => toast.error('Erro ao enviar imagem'),
      },
    );
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Analisadas', value: stats.totalAnalyzed, color: 'text-white' },
            { label: 'Normais', value: stats.normalFindings, color: 'text-emerald-400' },
            { label: 'Significativas', value: stats.significantFindings, color: 'text-amber-400' },
            { label: 'Criticas', value: stats.criticalFindings, color: 'text-red-400' },
          ].map((s) => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <Card className="bg-zinc-900 border-zinc-800 border-dashed">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-zinc-800">
              <Upload className="h-8 w-8 text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-300">Arraste uma imagem medica ou clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-1">DICOM, JPEG, PNG — RX, TC, RM, US, Mamografia</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                className="w-40"
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                placeholder="Tipo: RX, TC, RM..."
              />
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
          </div>
        </CardContent>
      </Card>

      {/* Worklist + CAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Worklist */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-400" />
                Worklist Priorizada por IA
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => reprioritize.mutate(undefined, {
                  onSuccess: () => toast.success('Worklist repriorizada'),
                })}
                disabled={reprioritize.isPending}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${reprioritize.isPending ? 'animate-spin' : ''}`} />
                Repriorizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {worklist.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Worklist vazia</p>
            ) : (
              <div className="space-y-2">
                {worklist.slice(0, 8).map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-950 rounded-lg">
                    <span className="text-xs font-bold text-emerald-400 w-5">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{item.patientName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.modality} — {item.bodyRegion}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono text-amber-400">{item.aiUrgencyScore.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">urgencia</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CAD Results */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" />
              Resultados CAD (Deteccao Assistida)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cadResults.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Nenhum resultado CAD disponivel</p>
            ) : (
              <div className="space-y-3">
                {cadResults.slice(0, 5).map((cad) => (
                  <div key={cad.id} className="p-3 bg-zinc-950 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{cad.modality}</Badge>
                        <span className="text-xs text-zinc-300">{cad.bodyRegion}</span>
                        {cad.patientName && <span className="text-xs text-muted-foreground">— {cad.patientName}</span>}
                      </div>
                      {cad.biRads && <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/40">BI-RADS {cad.biRads}</Badge>}
                    </div>
                    <div className="space-y-1">
                      {cad.findings.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">{f.label}</span>
                          <div className="flex items-center gap-2">
                            {severityBadge(f.severity)}
                            <span className="text-muted-foreground">{(f.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-400">{cad.overallAssessment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historico de Analises</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Carregando analises...</p>
          ) : analyses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma analise registrada</p>
          ) : (
            <div className="rounded-md border border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-xs h-8">Status</TableHead>
                    <TableHead className="text-xs h-8">Tipo</TableHead>
                    <TableHead className="text-xs h-8">Paciente</TableHead>
                    <TableHead className="text-xs h-8">Achados</TableHead>
                    <TableHead className="text-xs h-8">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.slice(0, 10).map((a) => (
                    <TableRow key={a.id} className="border-zinc-800">
                      <TableCell className="py-2">
                        <Badge variant={a.status === 'COMPLETED' ? 'default' : a.status === 'ERROR' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2">{a.imageType ?? '—'}</TableCell>
                      <TableCell className="text-xs py-2">{a.patientName ?? '—'}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex gap-1">
                          {a.findings.slice(0, 2).map((f) => severityBadge(f.severity))}
                          {a.findings.length > 2 && <span className="text-[10px] text-muted-foreground">+{a.findings.length - 2}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Diagnostico Diferencial ────────────────────────────────────────────────

function DifferentialTab() {
  const [clinicalText, setClinicalText] = useState('Paciente 65 anos, HAS, DM2, dor toracica ha 2h, ECG com BRE novo.');
  const [age, setAge] = useState('65');
  const [gender, setGender] = useState('M');
  const differential = useDiagnosisDifferential();
  const pathway = useClinicalPathway();

  const handleGenerate = () => {
    if (!clinicalText) return;
    differential.mutate(
      { clinicalText, age: parseInt(age) || undefined, gender },
      { onError: () => toast.error('Erro ao gerar diagnostico diferencial') },
    );
  };

  const handlePathway = (diagnosisCode: string) => {
    pathway.mutate(
      { diagnosisCode, severity: 'MODERATE' },
      { onError: () => toast.error('Erro ao gerar pathway') },
    );
  };

  const diffData = differential.data as DifferentialResponse | undefined;
  const pathwayData = pathway.data as ClinicalPathwayResponse | undefined;

  return (
    <div className="space-y-6">
      {/* Patient Summary / Input */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-400" />
            Dados do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Idade</Label>
              <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="65" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sexo</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Quadro Clinico</Label>
              <Textarea
                className="min-h-[60px]"
                value={clinicalText}
                onChange={(e) => setClinicalText(e.target.value)}
                placeholder="Descreva o quadro clinico do paciente..."
              />
            </div>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!clinicalText || differential.isPending}
            onClick={handleGenerate}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {differential.isPending ? 'Gerando...' : 'Gerar Diagnostico Diferencial'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {diffData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Differential List */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Diagnosticos Diferenciais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {diffData.differentials.map((d, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">#{idx + 1}</span>
                      <span className="text-sm text-zinc-200">{d.diagnosis}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-emerald-400">{d.icdCode}</span>
                      <Badge variant="outline" className="text-[10px]">{(d.probability * 100).toFixed(0)}%</Badge>
                    </div>
                  </div>
                  <Progress value={d.probability * 100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{d.reasoning}</p>
                  {d.suggestedWorkup && d.suggestedWorkup.length > 0 && (
                    <div className="text-xs">
                      <span className="text-zinc-400 font-medium">Investigar: </span>
                      <span className="text-zinc-500">{d.suggestedWorkup.join(', ')}</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs text-emerald-400 hover:text-emerald-300 px-2"
                    onClick={() => handlePathway(d.icdCode)}
                    disabled={pathway.isPending}
                  >
                    <ChevronRight className="h-3 w-3 mr-1" />
                    Ver Pathway
                  </Button>
                </div>
              ))}

              {/* Red Flags */}
              {diffData.redFlags && diffData.redFlags.length > 0 && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Red Flags
                  </p>
                  <ul className="text-xs text-red-300 space-y-0.5">
                    {diffData.redFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <CircleDot className="h-2 w-2 shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Pathway */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                Clinical Pathway
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pathwayData ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Clique em &quot;Ver Pathway&quot; em um diagnostico para gerar o protocolo clinico
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">{pathwayData.diagnosisCode}</Badge>
                    <span className="text-sm text-zinc-300">{pathwayData.diagnosisName}</span>
                  </div>
                  <div className="space-y-2">
                    {pathwayData.steps.map((step) => (
                      <div key={step.order} className="flex gap-3 p-2 bg-zinc-950 rounded-lg">
                        <div className="flex flex-col items-center">
                          <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                            {step.order}
                          </div>
                          <div className="w-px flex-1 bg-zinc-700 mt-1" />
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-300">{step.action}</span>
                            {step.timeframe && <Badge variant="outline" className="text-[10px]">{step.timeframe}</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{step.phase}</p>
                          {step.responsible && <p className="text-[10px] text-zinc-500">Responsavel: {step.responsible}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {pathwayData.guidelineSource && (
                    <p className="text-[10px] text-muted-foreground border-t border-zinc-800 pt-2">
                      Fonte: {pathwayData.guidelineSource}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── IA Revolucionaria ──────────────────────────────────────────────────────

interface RevCardProps {
  title: string;
  description: string;
  icon: typeof Bot;
  isPending: boolean;
  onTrigger: () => void;
  triggerLabel: string;
  children?: React.ReactNode;
}

function RevCard({ title, description, icon: Icon, isPending, onTrigger, triggerLabel, children }: RevCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Icon className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-sm text-zinc-100">{title}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{description}</p>
          </div>
        </div>
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
  const [patientId, setPatientId] = useState('demo-patient-1');
  const [clinicalText, setClinicalText] = useState('Paciente 65 anos, HAS, DM2, dor toracica ha 2h, ECG com BRE novo.');
  const [biQuestion, setBiQuestion] = useState('Quantos atendimentos por dia esta semana?');

  const mortality = useMortalityPrediction();
  const bi = useConversationalBi();
  const twin = useDigitalTwin();
  const multimodal = useMultimodalAnalysis();
  const genomics = useGenomicsTreatment();

  const onError = () => toast.error('Erro ao chamar servico de IA');

  const mortalityData = mortality.data as MortalityPredictionType | undefined;
  const biData = bi.data as ConversationalBiResponse | undefined;

  return (
    <div className="space-y-6">
      {/* Shared Inputs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID do Paciente</Label>
              <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="patient-id" className="h-8 text-sm" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Texto Clinico</Label>
              <Input value={clinicalText} onChange={(e) => setClinicalText(e.target.value)} placeholder="Texto clinico..." className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Digital Twin */}
        <RevCard
          title="Digital Twin"
          description="Simulacao de cenarios terapeuticos no gemeo digital"
          icon={Cpu}
          isPending={twin.isPending}
          triggerLabel="Simular Cenario"
          onTrigger={() =>
            twin.mutate(
              { patientId, scenario: 'treatment_comparison', treatmentOptions: ['Angioplastia primaria', 'Trombolitico IV', 'Conservador'] },
              { onError },
            )
          }
        >
          {twin.data && (
            <pre className="text-xs bg-zinc-950 rounded p-2 overflow-auto max-h-[150px] text-zinc-400 border border-zinc-800">
              {JSON.stringify(twin.data, null, 2)}
            </pre>
          )}
        </RevCard>

        {/* Multimodal */}
        <RevCard
          title="Analise Multimodal"
          description="Texto + imagens + labs + sinais vitais combinados"
          icon={Layers}
          isPending={multimodal.isPending}
          triggerLabel="Analise Combinada"
          onTrigger={() =>
            multimodal.mutate(
              { patientId, clinicalText, labSummary: 'Troponina I: 2.5 ng/mL (ref < 0.04)' },
              { onError },
            )
          }
        >
          {multimodal.data && (
            <pre className="text-xs bg-zinc-950 rounded p-2 overflow-auto max-h-[150px] text-zinc-400 border border-zinc-800">
              {JSON.stringify(multimodal.data, null, 2)}
            </pre>
          )}
        </RevCard>

        {/* Mortality Prediction */}
        <RevCard
          title="Predicao de Mortalidade"
          description="Score de risco com explicabilidade SHAP"
          icon={Heart}
          isPending={mortality.isPending}
          triggerLabel="Calcular Risco"
          onTrigger={() =>
            mortality.mutate({ patientId }, { onError })
          }
        >
          {mortalityData && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${
                    mortalityData.riskScore > 0.7 ? 'text-red-400' : mortalityData.riskScore > 0.4 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {(mortalityData.riskScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Score</p>
                </div>
                <Badge
                  variant={mortalityData.riskLevel === 'CRITICAL' ? 'destructive' : mortalityData.riskLevel === 'HIGH' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {mortalityData.riskLevel}
                </Badge>
              </div>
              {mortalityData.contributingFactors.length > 0 && (
                <div className="text-xs space-y-0.5">
                  <p className="text-muted-foreground font-medium">Fatores:</p>
                  {mortalityData.contributingFactors.slice(0, 4).map((f, idx) => (
                    <p key={idx} className="text-zinc-400 flex items-center gap-1">
                      <CircleDot className="h-2 w-2 text-emerald-400 shrink-0" />{f}
                    </p>
                  ))}
                </div>
              )}
              {mortalityData.palliativeCareRecommended && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Cuidados paliativos recomendados
                </p>
              )}
            </div>
          )}
        </RevCard>

        {/* Conversational BI */}
        <RevCard
          title="BI Conversacional"
          description="Pergunte em linguagem natural e receba graficos"
          icon={BarChart3}
          isPending={bi.isPending}
          triggerLabel="Perguntar"
          onTrigger={() =>
            bi.mutate({ question: biQuestion }, { onError })
          }
        >
          <Input
            className="h-8 text-xs"
            value={biQuestion}
            onChange={(e) => setBiQuestion(e.target.value)}
            placeholder="Sua pergunta..."
          />
          {biData && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 border border-zinc-800">{biData.answer}</p>
              {biData.chartData && biData.chartData.length > 0 && (
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#a1a1aa', fontSize: 9 }} />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </RevCard>

        {/* Genomics Treatment */}
        <RevCard
          title="Tratamento Guiado por Genomica"
          description="Recomendacoes terapeuticas por variantes geneticas"
          icon={Dna}
          isPending={genomics.isPending}
          triggerLabel="Analisar Genoma"
          onTrigger={() =>
            genomics.mutate(
              { patientId, diagnosis: 'Infarto Agudo do Miocardio', variants: ['CYP2C19*2', 'SLCO1B1*5'] },
              {
                onSuccess: () => toast.success('Analise genomica concluida'),
                onError,
              },
            )
          }
        >
          {genomics.data && (
            <pre className="text-xs bg-zinc-950 rounded p-2 overflow-auto max-h-[150px] text-zinc-400 border border-zinc-800">
              {JSON.stringify(genomics.data, null, 2)}
            </pre>
          )}
        </RevCard>
      </div>
    </div>
  );
}

// ─── Hub Page ────────────────────────────────────────────────────────────────

export default function AiHubPage() {
  return (
    <div className="p-6 space-y-6 bg-[#0a0a0f] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Bot className="h-8 w-8 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Central de IA</h1>
          <p className="text-sm text-muted-foreground">
            Plataforma completa de inteligencia artificial clinica — 8 modulos integrados ao prontuario
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">IA Ativa</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 bg-zinc-900/50 p-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="ambient" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Mic className="h-3.5 w-3.5" />
            Ambient
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BrainCircuit className="h-3.5 w-3.5" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="coding" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Code2 className="h-3.5 w-3.5" />
            CDI
          </TabsTrigger>
          <TabsTrigger value="nlp" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileSearch className="h-3.5 w-3.5" />
            NLP
          </TabsTrigger>
          <TabsTrigger value="imaging" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ScanEye className="h-3.5 w-3.5" />
            Imaging
          </TabsTrigger>
          <TabsTrigger value="differential" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Stethoscope className="h-3.5 w-3.5" />
            Diferencial
          </TabsTrigger>
          <TabsTrigger value="revolutionary" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Revolucionaria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="ambient"><AmbientTab /></TabsContent>
        <TabsContent value="agents"><AgentsTab /></TabsContent>
        <TabsContent value="coding"><CodingTab /></TabsContent>
        <TabsContent value="nlp"><NLPTab /></TabsContent>
        <TabsContent value="imaging"><ImagingTab /></TabsContent>
        <TabsContent value="differential"><DifferentialTab /></TabsContent>
        <TabsContent value="revolutionary"><RevolutionaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
