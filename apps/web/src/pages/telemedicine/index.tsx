import { useState, useMemo } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MessageSquare,
  Phone,
  PhoneOff,
  Clock,
  Users,
  AlertTriangle,
  Activity,
  Heart,
  Thermometer,
  TrendingUp,
  Send,
  Star,
  Wifi,
  ArrowUpDown,
  Eye,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ─── Mock Data ──────────────────────────────────────────────────────────────

const WAITING_ROOM = [
  { id: '1', patient: 'Maria Silva', age: 45, specialty: 'Clínica Geral', waitTime: 5, status: 'WAITING' as const, priority: 'normal' as const },
  { id: '2', patient: 'João Santos', age: 62, specialty: 'Cardiologia', waitTime: 12, status: 'WAITING' as const, priority: 'urgent' as const },
  { id: '3', patient: 'Ana Costa', age: 33, specialty: 'Dermatologia', waitTime: 3, status: 'CONNECTING' as const, priority: 'normal' as const },
  { id: '4', patient: 'Carlos Ferreira', age: 71, specialty: 'Endocrinologia', waitTime: 8, status: 'WAITING' as const, priority: 'normal' as const },
  { id: '5', patient: 'Lucia Mendes', age: 28, specialty: 'Ginecologia', waitTime: 1, status: 'WAITING' as const, priority: 'normal' as const },
];

const ACTIVE_SESSIONS = [
  { id: 's1', patient: 'Pedro Lima', doctor: 'Dra. Beatriz Alves', specialty: 'Cardiologia', startedAt: '14:30', duration: 25, hasVideo: true, hasAudio: true, recording: true },
  { id: 's2', patient: 'Fernanda Rocha', doctor: 'Dr. Marcos Tavares', specialty: 'Neurologia', startedAt: '14:45', duration: 10, hasVideo: true, hasAudio: true, recording: false },
  { id: 's3', patient: 'Roberto Dias', doctor: 'Dra. Camila Sousa', specialty: 'Psiquiatria', startedAt: '14:50', duration: 5, hasVideo: false, hasAudio: true, recording: false },
];

const RPM_PATIENTS = [
  { id: 'r1', patient: 'José Oliveira', condition: 'ICC', lastReading: '5 min', hr: 88, bp: '145/92', spo2: 96, alert: true, alertMsg: 'PA elevada' },
  { id: 'r2', patient: 'Maria Santos', condition: 'DPOC', lastReading: '12 min', hr: 72, bp: '125/80', spo2: 91, alert: true, alertMsg: 'SpO2 baixa' },
  { id: 'r3', patient: 'Ana Pereira', condition: 'DM2', lastReading: '30 min', hr: 76, bp: '130/85', spo2: 98, alert: false, alertMsg: '' },
  { id: 'r4', patient: 'Carlos Lima', condition: 'HAS', lastReading: '1h', hr: 65, bp: '138/88', spo2: 97, alert: false, alertMsg: '' },
  { id: 'r5', patient: 'Lucia Ferreira', condition: 'Arritmia', lastReading: '8 min', hr: 110, bp: '120/75', spo2: 95, alert: true, alertMsg: 'FC elevada' },
];

const ASYNC_QUEUE = [
  { id: 'a1', patient: 'Marcos Silva', type: 'Dermatologia', description: 'Lesão cutânea em MSD há 3 semanas', attachments: 3, createdAt: '2026-03-27 08:15', status: 'PENDING' as const },
  { id: 'a2', patient: 'Julia Costa', type: 'Radiologia', description: 'TC crânio para avaliação de cefaleia', attachments: 5, createdAt: '2026-03-26 16:30', status: 'IN_REVIEW' as const },
  { id: 'a3', patient: 'Roberto Mendes', type: 'Cardiologia', description: 'ECG com alteração de ST para segunda opinião', attachments: 2, createdAt: '2026-03-26 10:00', status: 'ANSWERED' as const },
];

const TELECONSULTORIA = [
  { id: 't1', from: 'Dr. José (PSF Leste)', to: 'Dra. Beatriz (Cardio)', question: 'Manejo de FA no idoso com IRC', status: 'PENDING' as const, date: '2026-03-27' },
  { id: 't2', from: 'Dra. Ana (UBS Norte)', to: 'Dr. Marcos (Neuro)', question: 'Quando encaminhar cefaleia recorrente para RM?', status: 'ANSWERED' as const, date: '2026-03-26' },
  { id: 't3', from: 'Dr. Carlos (UPA Sul)', to: 'Dra. Camila (Infecto)', question: 'Esquema ATB para celulite de face', status: 'PENDING' as const, date: '2026-03-27' },
];

const STATS_WEEKLY = [
  { day: 'Seg', sessions: 42, avgDuration: 18, satisfaction: 4.5 },
  { day: 'Ter', sessions: 38, avgDuration: 22, satisfaction: 4.3 },
  { day: 'Qua', sessions: 45, avgDuration: 20, satisfaction: 4.6 },
  { day: 'Qui', sessions: 50, avgDuration: 19, satisfaction: 4.7 },
  { day: 'Sex', sessions: 35, avgDuration: 21, satisfaction: 4.4 },
  { day: 'Sáb', sessions: 15, avgDuration: 25, satisfaction: 4.2 },
  { day: 'Dom', sessions: 8, avgDuration: 30, satisfaction: 4.1 },
];

// ─── Session Controls Component ─────────────────────────────────────────────

function SessionControls({ session, onEnd }: { session: typeof ACTIVE_SESSIONS[0]; onEnd: () => void }) {
  const [videoOn, setVideoOn] = useState(session.hasVideo);
  const [audioOn, setAudioOn] = useState(session.hasAudio);
  const [screenShare, setScreenShare] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [recording, setRecording] = useState(session.recording);
  const [chatMsg, setChatMsg] = useState('');

  return (
    <div className="space-y-4">
      {/* Video preview placeholder */}
      <div className="relative bg-zinc-950 rounded-lg h-48 flex items-center justify-center border border-zinc-800">
        {videoOn ? (
          <div className="text-center">
            <Users className="h-16 w-16 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-500 mt-2">Vídeo ativo — {session.patient}</p>
          </div>
        ) : (
          <div className="text-center">
            <VideoOff className="h-16 w-16 text-zinc-700 mx-auto" />
            <p className="text-sm text-zinc-600 mt-2">Vídeo desativado</p>
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {recording && <Badge variant="destructive" className="text-xs animate-pulse">REC</Badge>}
          <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">{session.duration} min</Badge>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant={videoOn ? 'default' : 'destructive'} onClick={() => { setVideoOn(!videoOn); toast.info(videoOn ? 'Vídeo desativado' : 'Vídeo ativado'); }}>
          {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant={audioOn ? 'default' : 'destructive'} onClick={() => { setAudioOn(!audioOn); toast.info(audioOn ? 'Microfone mudo' : 'Microfone ativado'); }}>
          {audioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant={screenShare ? 'secondary' : 'outline'} className="border-zinc-700" onClick={() => { setScreenShare(!screenShare); toast.info(screenShare ? 'Compartilhamento encerrado' : 'Compartilhando tela'); }}>
          <Monitor className="h-4 w-4" />
        </Button>
        <Button size="sm" variant={chatOpen ? 'secondary' : 'outline'} className="border-zinc-700" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button size="sm" variant={recording ? 'destructive' : 'outline'} className={cn(!recording && 'border-zinc-700')} onClick={() => { setRecording(!recording); toast.info(recording ? 'Gravação parada' : 'Gravando consulta'); }}>
          <div className={cn('h-3 w-3 rounded-full', recording ? 'bg-white animate-pulse' : 'bg-red-500')} />
        </Button>
        <Button size="sm" variant="destructive" onClick={onEnd}>
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-950">
          <div className="h-24 overflow-y-auto mb-2 space-y-1">
            <p className="text-xs text-zinc-500">Chat iniciado</p>
            <p className="text-xs"><span className="text-emerald-400">Dr(a):</span> <span className="text-zinc-300">Olá, como você está?</span></p>
            <p className="text-xs"><span className="text-blue-400">Paciente:</span> <span className="text-zinc-300">Bem, obrigado.</span></p>
          </div>
          <div className="flex gap-2">
            <Input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Mensagem..." className="text-xs border-zinc-700 bg-zinc-900 text-white" />
            <Button size="sm" onClick={() => { if (chatMsg.trim()) { toast.success('Mensagem enviada'); setChatMsg(''); } }}><Send className="h-3 w-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TelemedicinePage() {
  const [activeTab, setActiveTab] = useState('waiting');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showAsyncDialog, setShowAsyncDialog] = useState(false);
  const [showTeleDialog, setShowTeleDialog] = useState(false);

  const alertCount = useMemo(() => RPM_PATIENTS.filter((p) => p.alert).length, []);
  const activeSession = ACTIVE_SESSIONS.find((s) => s.id === selectedSession);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Telemedicina</h1>
          <p className="text-sm text-zinc-400">Teleconsultas, RPM, assíncrono e teleconsultoria</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
            <Wifi className="mr-1 h-3 w-3" /> {ACTIVE_SESSIONS.length} ativas
          </Badge>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
            <Clock className="mr-1 h-3 w-3" /> {WAITING_ROOM.length} aguardando
          </Badge>
          {alertCount > 0 && (
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
              <AlertTriangle className="mr-1 h-3 w-3" /> {alertCount} alertas RPM
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Sessões Hoje</CardTitle>
            <Video className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">23</div><p className="text-xs text-zinc-500">+12% vs ontem</p></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">18 min</div><p className="text-xs text-zinc-500">Meta: 20 min</p></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Satisfação</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">4.6/5.0</div><p className="text-xs text-zinc-500">142 avaliações</p></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Pacientes RPM</CardTitle>
            <Activity className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{RPM_PATIENTS.length}</div><p className="text-xs text-zinc-500">{alertCount} com alerta</p></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="waiting">Sala de Espera</TabsTrigger>
          <TabsTrigger value="active">Sessões Ativas</TabsTrigger>
          <TabsTrigger value="rpm">RPM</TabsTrigger>
          <TabsTrigger value="async">Assíncrono</TabsTrigger>
          <TabsTrigger value="teleconsultoria">Teleconsultoria</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Virtual Waiting Room */}
        <TabsContent value="waiting" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center gap-2"><Users className="h-5 w-5 text-blue-400" />Sala de Espera Virtual</CardTitle>
                <Badge variant="outline" className="text-zinc-400">{WAITING_ROOM.length} pacientes</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700">
                    <TableHead className="text-zinc-400">Paciente</TableHead>
                    <TableHead className="text-zinc-400">Idade</TableHead>
                    <TableHead className="text-zinc-400">Especialidade</TableHead>
                    <TableHead className="text-zinc-400">Tempo Espera</TableHead>
                    <TableHead className="text-zinc-400">Prioridade</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WAITING_ROOM.map((p) => (
                    <TableRow key={p.id} className="border-zinc-800">
                      <TableCell className="text-white font-medium">{p.patient}</TableCell>
                      <TableCell className="text-zinc-300">{p.age} anos</TableCell>
                      <TableCell className="text-zinc-300">{p.specialty}</TableCell>
                      <TableCell className="text-zinc-300">{p.waitTime} min</TableCell>
                      <TableCell>
                        <Badge variant={p.priority === 'urgent' ? 'destructive' : 'outline'} className={p.priority === 'normal' ? 'border-zinc-600 text-zinc-400' : ''}>
                          {p.priority === 'urgent' ? 'Urgente' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.status === 'CONNECTING' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'}>
                          {p.status === 'CONNECTING' ? 'Conectando' : 'Aguardando'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => toast.success(`Chamando ${p.patient}...`)}>
                          <Phone className="mr-1 h-3 w-3" /> Chamar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions */}
        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white">Sessões em Andamento</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {ACTIVE_SESSIONS.map((session) => (
                  <div key={session.id} className={cn('flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors', selectedSession === session.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700')} onClick={() => setSelectedSession(session.id)}>
                    <div>
                      <p className="font-medium text-white">{session.patient}</p>
                      <p className="text-sm text-zinc-400">{session.doctor} — {session.specialty}</p>
                      <p className="text-xs text-zinc-500">Iniciou: {session.startedAt} ({session.duration} min)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.hasVideo && <Video className="h-4 w-4 text-emerald-400" />}
                      {session.hasAudio && <Mic className="h-4 w-4 text-blue-400" />}
                      {session.recording && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white">Controles da Sessão</CardTitle></CardHeader>
              <CardContent>
                {activeSession ? (
                  <SessionControls session={activeSession} onEnd={() => { toast.success('Sessão encerrada'); setSelectedSession(null); }} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Video className="h-12 w-12 text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-500">Selecione uma sessão para controlar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RPM */}
        <TabsContent value="rpm" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-red-400" />Monitoramento Remoto de Pacientes</CardTitle>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300"><Plus className="mr-1 h-3 w-3" />Adicionar Paciente</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {RPM_PATIENTS.map((p) => (
                  <div key={p.id} className={cn('rounded-lg border p-4', p.alert ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800 bg-zinc-950')}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">{p.patient}</p>
                        <p className="text-xs text-zinc-500">{p.condition} — Última leitura: {p.lastReading}</p>
                      </div>
                      {p.alert && <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center rounded bg-zinc-800 p-2">
                        <Heart className="h-3 w-3 text-red-400 mx-auto mb-1" />
                        <p className={cn('text-sm font-bold', p.hr > 100 ? 'text-red-400' : 'text-white')}>{p.hr}</p>
                        <p className="text-[10px] text-zinc-500">bpm</p>
                      </div>
                      <div className="text-center rounded bg-zinc-800 p-2">
                        <TrendingUp className="h-3 w-3 text-blue-400 mx-auto mb-1" />
                        <p className={cn('text-sm font-bold', Number(p.bp.split('/')[0]) > 140 ? 'text-red-400' : 'text-white')}>{p.bp}</p>
                        <p className="text-[10px] text-zinc-500">mmHg</p>
                      </div>
                      <div className="text-center rounded bg-zinc-800 p-2">
                        <Thermometer className="h-3 w-3 text-cyan-400 mx-auto mb-1" />
                        <p className={cn('text-sm font-bold', p.spo2 < 93 ? 'text-red-400' : 'text-white')}>{p.spo2}%</p>
                        <p className="text-[10px] text-zinc-500">SpO2</p>
                      </div>
                    </div>
                    {p.alert && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle className="h-3 w-3" />{p.alertMsg}
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="w-full mt-3 border-zinc-700 text-zinc-300" onClick={() => toast.info(`Teleconsulta com ${p.patient}`)}>
                      <Video className="mr-1 h-3 w-3" /> Iniciar Consulta
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Async Consult */}
        <TabsContent value="async" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-blue-400" />Consultas Assíncronas (Store-and-Forward)</CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAsyncDialog(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Nova Consulta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700">
                    <TableHead className="text-zinc-400">Paciente</TableHead>
                    <TableHead className="text-zinc-400">Especialidade</TableHead>
                    <TableHead className="text-zinc-400">Descrição</TableHead>
                    <TableHead className="text-zinc-400">Anexos</TableHead>
                    <TableHead className="text-zinc-400">Data</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ASYNC_QUEUE.map((item) => (
                    <TableRow key={item.id} className="border-zinc-800">
                      <TableCell className="text-white font-medium">{item.patient}</TableCell>
                      <TableCell className="text-zinc-300">{item.type}</TableCell>
                      <TableCell className="text-zinc-300 max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className="text-zinc-300">{item.attachments} arquivos</TableCell>
                      <TableCell className="text-zinc-400 text-xs">{item.createdAt}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={item.status === 'ANSWERED' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : item.status === 'IN_REVIEW' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'}>
                          {item.status === 'ANSWERED' ? 'Respondida' : item.status === 'IN_REVIEW' ? 'Em Análise' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => toast.info('Abrindo consulta assíncrona')}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teleconsultoria */}
        <TabsContent value="teleconsultoria" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center gap-2"><Users className="h-5 w-5 text-purple-400" />Teleconsultoria (Médico-a-Médico)</CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowTeleDialog(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Nova Solicitação
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {TELECONSULTORIA.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.question}</p>
                    <p className="text-sm text-zinc-400">{item.from} → {item.to}</p>
                    <p className="text-xs text-zinc-500">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={item.status === 'ANSWERED' ? 'border-emerald-500/50 text-emerald-400' : 'border-yellow-500/50 text-yellow-400'}>
                      {item.status === 'ANSWERED' ? 'Respondida' : 'Pendente'}
                    </Badge>
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => toast.info('Abrindo teleconsultoria')}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm">Sessões por Dia da Semana</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={STATS_WEEKLY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                    <Bar dataKey="sessions" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm">Duração Média e Satisfação</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={STATS_WEEKLY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="avgDuration" stroke="#3b82f6" strokeWidth={2} name="Duração (min)" dot={{ fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="satisfaction" stroke="#eab308" strokeWidth={2} name="Satisfação" dot={{ fill: '#eab308' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-emerald-400">233</p>
                <p className="text-sm text-zinc-400">Sessões esta semana</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-400">19.3 min</p>
                <p className="text-sm text-zinc-400">Duração média</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-yellow-400">4.4/5</p>
                <p className="text-sm text-zinc-400">Satisfação média</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-purple-400">97%</p>
                <p className="text-sm text-zinc-400">Taxa de conclusão</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Async Dialog */}
      <Dialog open={showAsyncDialog} onOpenChange={setShowAsyncDialog}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader><DialogTitle className="text-white">Nova Consulta Assíncrona</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-zinc-300">Paciente</Label><Input className="mt-1 border-zinc-700 bg-zinc-900 text-white" placeholder="Nome do paciente" /></div>
            <div><Label className="text-zinc-300">Especialidade</Label>
              <Select><SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="derma">Dermatologia</SelectItem><SelectItem value="radio">Radiologia</SelectItem><SelectItem value="cardio">Cardiologia</SelectItem><SelectItem value="oftalmo">Oftalmologia</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-zinc-300">Descrição clínica</Label><Textarea className="mt-1 border-zinc-700 bg-zinc-900 text-white" rows={3} /></div>
            <div><Label className="text-zinc-300">Anexos (imagens, exames)</Label><Input type="file" multiple className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setShowAsyncDialog(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { toast.success('Consulta assíncrona criada'); setShowAsyncDialog(false); }}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Teleconsultoria Dialog */}
      <Dialog open={showTeleDialog} onOpenChange={setShowTeleDialog}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader><DialogTitle className="text-white">Nova Teleconsultoria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-zinc-300">Especialidade solicitada</Label>
              <Select><SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="cardio">Cardiologia</SelectItem><SelectItem value="neuro">Neurologia</SelectItem><SelectItem value="infecto">Infectologia</SelectItem><SelectItem value="nefro">Nefrologia</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-zinc-300">Dúvida clínica</Label><Textarea className="mt-1 border-zinc-700 bg-zinc-900 text-white" rows={4} placeholder="Descreva sua dúvida clínica..." /></div>
            <div><Label className="text-zinc-300">Urgência</Label>
              <Select><SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="routine">Rotina (72h)</SelectItem><SelectItem value="priority">Prioritária (24h)</SelectItem><SelectItem value="urgent">Urgente (4h)</SelectItem></SelectContent></Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setShowTeleDialog(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { toast.success('Solicitação de teleconsultoria enviada'); setShowTeleDialog(false); }}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
