import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Siren,
  Clock,
  Users,
  Activity,
  ArrowRightLeft,
  AlertTriangle,
  Heart,
  Brain,
  Flame,
  ShieldAlert,
  User,
  BedDouble,
  LogOut,
  Timer,
  RefreshCw,
  Zap,
  BarChart3,
  Ambulance,
  TrendingUp,
  Gauge,
  Search,
  ChevronRight,
  Phone,
  MapPin,
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
  RadialBarChart,
  RadialBar,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useEmergencyBoard,
  useEmergencyMetrics,
  useActivateProtocol,
  useUpdatePatientStatus,
  useReclassifyRisk,
  useAssignFastTrack,
  useCalculateNedocs,
} from '@/services/emergency.service';
import type { EmergencyPatient, NedocsResult } from '@/services/emergency.service';

// ============================================================================
// Constants
// ============================================================================

const TRIAGE_CONFIG: Record<'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE', { label: string; color: string; bg: string; border: string; textBg: string }> = {
  RED: { label: 'Emergencia', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', textBg: 'bg-red-500' },
  ORANGE: { label: 'Muito Urgente', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50', textBg: 'bg-orange-500' },
  YELLOW: { label: 'Urgente', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', textBg: 'bg-yellow-500' },
  GREEN: { label: 'Pouco Urgente', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', textBg: 'bg-green-500' },
  BLUE: { label: 'Nao Urgente', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50', textBg: 'bg-blue-500' },
};

const TRIAGE_ORDER: Array<'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE'> = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'];

const STATUS_COLUMNS = [
  { key: 'WAITING' as const, label: 'Espera', icon: Clock, color: 'text-yellow-400' },
  { key: 'IN_CARE' as const, label: 'Em Atendimento', icon: Activity, color: 'text-emerald-400' },
  { key: 'OBSERVATION' as const, label: 'Observacao', icon: BedDouble, color: 'text-blue-400' },
  { key: 'DISCHARGE' as const, label: 'Alta', icon: LogOut, color: 'text-zinc-400' },
];

const PROTOCOLS = [
  { key: 'AVC' as const, label: 'Code Stroke', icon: Brain, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50', description: 'Protocolo AVC isquemico — janela terapeutica 4.5h' },
  { key: 'IAM' as const, label: 'Code STEMI', icon: Heart, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50', description: 'IAM com supra ST — porta-balao alvo 90min' },
  { key: 'SEPSIS' as const, label: 'Code Sepsis', icon: Flame, color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/50', description: 'Sepsis Bundle 1h — lactato, hemocultura, ATB' },
  { key: 'TRAUMA' as const, label: 'Code Trauma', icon: ShieldAlert, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50', description: 'Protocolo Trauma — ATLS / ABCDE' },
];

const NEDOCS_LEVELS = {
  NOT_BUSY: { label: 'Normal', color: 'text-green-400', bg: 'bg-green-500', percent: 25 },
  BUSY: { label: 'Ocupado', color: 'text-yellow-400', bg: 'bg-yellow-500', percent: 50 },
  EXTREMELY_BUSY: { label: 'Muito Ocupado', color: 'text-orange-400', bg: 'bg-orange-500', percent: 75 },
  OVERCROWDED: { label: 'Superlotado', color: 'text-red-400', bg: 'bg-red-500', percent: 100 },
};

// ============================================================================
// Mock ambulance data (would come from Socket.IO in production)
// ============================================================================

interface AmbulanceArrival {
  id: string;
  unit: string;
  eta: number;
  patient: string;
  severity: 'RED' | 'ORANGE' | 'YELLOW';
  condition: string;
  origin: string;
}

const MOCK_AMBULANCES: AmbulanceArrival[] = [
  { id: 'amb-1', unit: 'SAMU 192', eta: 8, patient: 'Masc, ~60a', severity: 'RED', condition: 'Dor toracica + sudorese', origin: 'Av. Paulista' },
  { id: 'amb-2', unit: 'SAMU 193', eta: 15, patient: 'Fem, ~35a', severity: 'ORANGE', condition: 'TCE moderado', origin: 'Rod. Castelo Branco' },
  { id: 'amb-3', unit: 'Bombeiros 01', eta: 22, patient: 'Masc, ~45a', severity: 'YELLOW', condition: 'Fratura exposta MID', origin: 'Centro' },
];

// ============================================================================
// Helpers
// ============================================================================

function formatWaitTime(arrivalTime: string): string {
  const diff = Date.now() - new Date(arrivalTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours}h${remaining > 0 ? ` ${remaining}min` : ''}`;
}

function getWaitColor(arrivalTime: string): string {
  const diff = Date.now() - new Date(arrivalTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 30) return 'text-green-400';
  if (mins < 60) return 'text-yellow-400';
  if (mins < 120) return 'text-orange-400';
  return 'text-red-400';
}

// ============================================================================
// Protocol Timer Component
// ============================================================================

function ProtocolTimer({ startTime, targetMinutes, label }: { startTime: Date; targetMinutes: number; label: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => {
      const diff = Date.now() - startTime.getTime();
      setElapsed(Math.floor(diff / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const elapsedMins = elapsed / 60;
  const percent = Math.min((elapsedMins / targetMinutes) * 100, 100);
  const isOverdue = elapsedMins > targetMinutes;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className={cn('rounded-lg border p-3', isOverdue ? 'border-red-500/50 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/5')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className={cn('font-mono text-lg font-bold tabular-nums', isOverdue ? 'text-red-400 animate-pulse' : 'text-emerald-400')}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', isOverdue ? 'bg-red-500' : 'bg-emerald-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-zinc-500">0 min</span>
        <span className={cn('text-[10px]', isOverdue ? 'text-red-400' : 'text-zinc-500')}>Alvo: {targetMinutes} min</span>
      </div>
    </div>
  );
}

// ============================================================================
// NEDOCS Gauge Component
// ============================================================================

function NedocsGauge({ result }: { result: NedocsResult }) {
  const levelConfig = NEDOCS_LEVELS[result.level];
  const gaugeData = [{ name: 'NEDOCS', value: Math.min(result.nedocsScore, 200), fill: '' }];
  const getColor = (score: number) => {
    if (score < 50) return '#22c55e';
    if (score < 100) return '#eab308';
    if (score < 150) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="60%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            barSize={12}
            data={gaugeData}
          >
            <RadialBar
              dataKey="value"
              fill={getColor(result.nedocsScore)}
              background={{ fill: '#27272a' }}
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className={cn('text-3xl font-bold tabular-nums', levelConfig.color)}>{result.nedocsScore}</p>
          <p className={cn('text-xs font-medium', levelConfig.color)}>{levelConfig.label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400 text-center max-w-xs">{result.recommendation}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function EmergencyPage() {
  const [protocolDialog, setProtocolDialog] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<typeof PROTOCOLS[number] | null>(null);
  const [protocolPatientId, setProtocolPatientId] = useState('');
  const [protocolEncounterId, setProtocolEncounterId] = useState('');
  const [protocolNotes, setProtocolNotes] = useState('');
  const [search, setSearch] = useState('');
  const [activeProtocolTimers, setActiveProtocolTimers] = useState<Array<{ protocol: string; startTime: Date; target: number }>>([]);
  const [viewMode, setViewMode] = useState<'status' | 'manchester'>('status');

  // Reclassify state
  const [reclassifyRecordId, setReclassifyRecordId] = useState('');
  const [reclassifyForm, setReclassifyForm] = useState<{
    authorId: string;
    newManchesterLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
    justification: string;
    chiefComplaint: string;
  }>({ authorId: '', newManchesterLevel: 'YELLOW', justification: '', chiefComplaint: '' });

  // NEDOCS state
  const [nedocsForm, setNedocsForm] = useState({
    totalEdBeds: '', totalEdPatients: '', ventilatorsInUse: '',
    admittedWaitingBed: '', longestWaitHours: '', totalHospitalBeds: '', admissionsLastHour: '',
  });
  const [nedocsResult, setNedocsResult] = useState<NedocsResult | null>(null);

  // Fast Track state
  const [fastTrackRecordId, setFastTrackRecordId] = useState('');
  const [fastTrackResult, setFastTrackResult] = useState<{ eligible: boolean; message: string; assignedArea?: string } | null>(null);

  // Current time for header
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Data hooks
  const { data: board = [], isLoading } = useEmergencyBoard();
  const { data: metrics } = useEmergencyMetrics();
  const activateProtocol = useActivateProtocol();
  const updateStatus = useUpdatePatientStatus();
  const reclassify = useReclassifyRisk();
  const assignFastTrack = useAssignFastTrack();
  const calculateNedocs = useCalculateNedocs();

  const filteredBoard = useMemo(() => {
    if (!search) return board;
    const q = search.toLowerCase();
    return board.filter(
      (p) => p.patientName.toLowerCase().includes(q) || p.chiefComplaint.toLowerCase().includes(q),
    );
  }, [board, search]);

  // Group by status
  const grouped = useMemo(() => {
    const map: Record<EmergencyPatient['status'], EmergencyPatient[]> = {
      WAITING: [], IN_CARE: [], OBSERVATION: [], DISCHARGE: [],
    };
    filteredBoard.forEach((p) => {
      if (map[p.status]) map[p.status].push(p);
    });
    // Sort each group by triage severity
    const triageOrder = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3, BLUE: 4 };
    Object.values(map).forEach((arr) => {
      arr.sort((a, b) => (triageOrder[a.triageLevel] ?? 5) - (triageOrder[b.triageLevel] ?? 5));
    });
    return map;
  }, [filteredBoard]);

  // Group by Manchester classification
  const manchesterGrouped = useMemo(() => {
    const map: Record<string, EmergencyPatient[]> = {
      RED: [], ORANGE: [], YELLOW: [], GREEN: [], BLUE: [],
    };
    filteredBoard.forEach((p) => {
      if (map[p.triageLevel]) map[p.triageLevel]!.push(p);
    });
    return map;
  }, [filteredBoard]);

  // Triage distribution for chart
  const triageDistribution = useMemo(() => {
    return TRIAGE_ORDER.map((level) => ({
      name: TRIAGE_CONFIG[level].label,
      value: manchesterGrouped[level]?.length ?? 0,
      color: level === 'RED' ? '#ef4444' : level === 'ORANGE' ? '#f97316' : level === 'YELLOW' ? '#eab308' : level === 'GREEN' ? '#22c55e' : '#3b82f6',
    }));
  }, [manchesterGrouped]);

  // Fast track patients (GREEN/BLUE waiting)
  const fastTrackPatients = useMemo(() => {
    return filteredBoard.filter(
      (p) => (p.triageLevel === 'GREEN' || p.triageLevel === 'BLUE') && p.status === 'WAITING',
    );
  }, [filteredBoard]);

  // Door-to-X hourly trend (mock data for chart)
  const doorToXTrend = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => {
      const h = (currentTime.getHours() - 11 + i + 24) % 24;
      return {
        hour: `${String(h).padStart(2, '0')}:00`,
        doorToDoc: Math.floor(15 + Math.random() * 30),
        doorToTriage: Math.floor(3 + Math.random() * 12),
      };
    });
    return hours;
  }, [currentTime]);

  // Handlers
  const handleReclassify = useCallback(() => {
    if (!reclassifyRecordId || !reclassifyForm.authorId || !reclassifyForm.justification) return;
    reclassify.mutate(
      { recordId: reclassifyRecordId, ...reclassifyForm },
      {
        onSuccess: () => {
          toast.success('Reclassificacao registrada com auditoria');
          setReclassifyRecordId('');
          setReclassifyForm({ authorId: '', newManchesterLevel: 'YELLOW', justification: '', chiefComplaint: '' });
        },
        onError: () => toast.error('Erro ao reclassificar'),
      },
    );
  }, [reclassifyRecordId, reclassifyForm, reclassify]);

  const handleNedocs = useCallback(() => {
    const n = nedocsForm;
    if (!n.totalEdBeds || !n.totalEdPatients || !n.totalHospitalBeds) return;
    calculateNedocs.mutate(
      {
        totalEdBeds: Number(n.totalEdBeds),
        totalEdPatients: Number(n.totalEdPatients),
        ventilatorsInUse: Number(n.ventilatorsInUse) || 0,
        admittedWaitingBed: Number(n.admittedWaitingBed) || 0,
        longestWaitHours: Number(n.longestWaitHours) || 0,
        totalHospitalBeds: Number(n.totalHospitalBeds),
        admissionsLastHour: Number(n.admissionsLastHour) || 0,
      },
      {
        onSuccess: (data) => {
          setNedocsResult(data);
          const toastFn = data.level === 'OVERCROWDED' ? toast.error : data.level === 'EXTREMELY_BUSY' ? toast.warning : toast.success;
          toastFn(`NEDOCS: ${data.nedocsScore} — ${data.level}`);
        },
        onError: () => toast.error('Erro ao calcular NEDOCS'),
      },
    );
  }, [nedocsForm, calculateNedocs]);

  const handleActivateProtocol = useCallback(() => {
    if (!selectedProtocol || !protocolPatientId) return;
    activateProtocol.mutate(
      {
        patientId: protocolPatientId,
        encounterId: protocolEncounterId,
        protocol: selectedProtocol.key,
        notes: protocolNotes,
      },
      {
        onSuccess: () => {
          toast.success(`${selectedProtocol.label} ativado com sucesso!`);
          const targetMap: Record<string, number> = { AVC: 270, IAM: 90, SEPSIS: 60, TRAUMA: 30 };
          setActiveProtocolTimers((prev) => [
            ...prev,
            { protocol: selectedProtocol.label, startTime: new Date(), target: targetMap[selectedProtocol.key] ?? 60 },
          ]);
          setProtocolDialog(false);
          setSelectedProtocol(null);
          setProtocolPatientId('');
          setProtocolEncounterId('');
          setProtocolNotes('');
        },
        onError: () => toast.error('Erro ao ativar protocolo.'),
      },
    );
  }, [selectedProtocol, protocolPatientId, protocolEncounterId, protocolNotes, activateProtocol]);

  const handleMovePatient = useCallback((patientId: string, newStatus: EmergencyPatient['status']) => {
    updateStatus.mutate(
      { patientId, status: newStatus },
      {
        onSuccess: () => toast.success('Status atualizado.'),
        onError: () => toast.error('Erro ao atualizar status.'),
      },
    );
  }, [updateStatus]);

  const handleFastTrack = useCallback(() => {
    if (!fastTrackRecordId) return;
    assignFastTrack.mutate(fastTrackRecordId, {
      onSuccess: (data) => {
        setFastTrackResult(data as { eligible: boolean; message: string; assignedArea?: string });
        toast.success('Fast Track avaliado');
      },
      onError: () => toast.error('Erro no Fast Track'),
    });
  }, [fastTrackRecordId, assignFastTrack]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto" />
          <p className="text-sm text-zinc-400">Carregando Pronto-Socorro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
            <Siren className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pronto-Socorro</h1>
            <p className="text-xs text-zinc-400">
              Painel em tempo real —{' '}
              <span className="font-mono tabular-nums text-zinc-300">
                {currentTime.toLocaleTimeString('pt-BR')}
              </span>
            </p>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/50 animate-pulse ml-2">
            LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar paciente ou queixa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-9 bg-zinc-900 border-zinc-700"
            />
          </div>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setViewMode('status')}
              className={cn('px-3 py-1.5 text-xs transition-colors', viewMode === 'status' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200')}
            >
              Por Status
            </button>
            <button
              onClick={() => setViewMode('manchester')}
              className={cn('px-3 py-1.5 text-xs transition-colors', viewMode === 'manchester' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200')}
            >
              Manchester
            </button>
          </div>
        </div>
      </div>

      {/* ── Metrics Bar ────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Porta-Medico', value: `${metrics.avgDoorToDoc}min`, icon: Timer, color: 'text-emerald-400', alert: metrics.avgDoorToDoc > 30 },
            { label: 'Ocupacao', value: `${metrics.occupancyRate}%`, icon: Gauge, color: 'text-blue-400', alert: metrics.occupancyRate > 90 },
            { label: 'Em Espera', value: String(metrics.waitingCount), icon: Clock, color: 'text-yellow-400', alert: metrics.waitingCount > 20 },
            { label: 'Em Atendimento', value: String(metrics.inCareCount), icon: Users, color: 'text-emerald-400', alert: false },
            { label: 'Observacao', value: String(metrics.observationCount), icon: BedDouble, color: 'text-blue-400', alert: false },
            { label: 'Total Hoje', value: String(metrics.totalToday), icon: ArrowRightLeft, color: 'text-zinc-300', alert: false },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className={cn('bg-zinc-900 border-zinc-800 transition-colors', m.alert && 'border-red-500/30')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', m.alert ? 'bg-red-500/20' : 'bg-zinc-800')}>
                    <Icon className={cn('h-4 w-4', m.alert ? 'text-red-400' : m.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.label}</p>
                    <p className={cn('text-lg font-bold tabular-nums', m.alert ? 'text-red-400' : 'text-zinc-100')}>{m.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Protocol Activation Buttons ────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {PROTOCOLS.map((proto) => {
          const Icon = proto.icon;
          return (
            <Button
              key={proto.key}
              variant="outline"
              className={cn('border-2 gap-2 font-semibold transition-all hover:scale-[1.02]', proto.borderColor, proto.bgColor)}
              onClick={() => {
                setSelectedProtocol(proto);
                setProtocolDialog(true);
              }}
            >
              <Icon className={cn('h-4 w-4', proto.color)} />
              <span className={proto.color}>{proto.label}</span>
            </Button>
          );
        })}
      </div>

      {/* ── Active Protocol Timers ─────────────────────────── */}
      {activeProtocolTimers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeProtocolTimers.map((timer, i) => (
            <ProtocolTimer
              key={i}
              startTime={timer.startTime}
              targetMinutes={timer.target}
              label={timer.protocol}
            />
          ))}
        </div>
      )}

      {/* ── Main Tabs ──────────────────────────────────────── */}
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1">
          <TabsTrigger value="board" className="gap-2 data-[state=active]:bg-emerald-600">
            <Activity className="h-4 w-4" />
            Painel PS
          </TabsTrigger>
          <TabsTrigger value="doorToX" className="gap-2 data-[state=active]:bg-emerald-600">
            <TrendingUp className="h-4 w-4" />
            Door-to-X
          </TabsTrigger>
          <TabsTrigger value="ambulance" className="gap-2 data-[state=active]:bg-emerald-600">
            <Ambulance className="h-4 w-4" />
            Ambulancias
          </TabsTrigger>
          <TabsTrigger value="fasttrack" className="gap-2 data-[state=active]:bg-emerald-600">
            <Zap className="h-4 w-4" />
            Fast Track
          </TabsTrigger>
          <TabsTrigger value="nedocs" className="gap-2 data-[state=active]:bg-emerald-600">
            <BarChart3 className="h-4 w-4" />
            NEDOCS
          </TabsTrigger>
          <TabsTrigger value="reclassify" className="gap-2 data-[state=active]:bg-emerald-600">
            <RefreshCw className="h-4 w-4" />
            Reclassificar
          </TabsTrigger>
        </TabsList>

        {/* ── Board Tab ──────────────────────────────── */}
        <TabsContent value="board" className="space-y-4">
          {/* Triage Distribution Mini Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">Distribuicao Manchester</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={triageDistribution.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {triageDistribution.filter((d) => d.value > 0).map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) => <span className="text-[10px] text-zinc-400">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-2xl font-bold">{filteredBoard.length}</p>
                  <p className="text-xs text-zinc-500">pacientes no PS</p>
                </div>
              </CardContent>
            </Card>

            {/* Board Columns */}
            <div className="lg:col-span-3">
              {viewMode === 'status' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {STATUS_COLUMNS.map((col) => {
                    const Icon = col.icon;
                    const patients = grouped[col.key];
                    return (
                      <div key={col.key} className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                          <Icon className={cn('h-4 w-4', col.color)} />
                          <h3 className="font-semibold text-sm">{col.label}</h3>
                          <Badge variant="secondary" className="ml-auto bg-zinc-800 text-zinc-300 text-[10px]">
                            {patients.length}
                          </Badge>
                        </div>
                        <ScrollArea className="max-h-[calc(100vh-520px)]">
                          <div className="space-y-2 pr-1">
                            {patients.length === 0 && (
                              <p className="text-xs text-zinc-500 text-center py-6">Nenhum paciente</p>
                            )}
                            {patients.map((patient) => (
                              <PatientCard
                                key={patient.id}
                                patient={patient}
                                currentColumn={col.key}
                                onMove={handleMovePatient}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Manchester View */
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {TRIAGE_ORDER.map((level) => {
                    const config = TRIAGE_CONFIG[level];
                    const patients = manchesterGrouped[level] ?? [];
                    return (
                      <div key={level} className="space-y-2">
                        <div className={cn('flex items-center gap-2 pb-2 border-b-2', config.border)}>
                          <div className={cn('h-3 w-3 rounded-full', config.textBg)} />
                          <h3 className={cn('font-semibold text-sm', config.color)}>{config.label}</h3>
                          <Badge className={cn('ml-auto text-[10px] text-white', config.textBg)}>
                            {patients.length}
                          </Badge>
                        </div>
                        <ScrollArea className="max-h-[calc(100vh-520px)]">
                          <div className="space-y-2 pr-1">
                            {patients.length === 0 && (
                              <p className="text-xs text-zinc-500 text-center py-6">Vazio</p>
                            )}
                            {patients.map((patient) => (
                              <PatientCard
                                key={patient.id}
                                patient={patient}
                                currentColumn={patient.status}
                                onMove={handleMovePatient}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Door-to-X Tab ──────────────────────────── */}
        <TabsContent value="doorToX" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Porta-Triagem', value: metrics?.avgDoorToDoc ? Math.max(metrics.avgDoorToDoc - 12, 3) : 5, target: 10, unit: 'min', color: '#22c55e' },
              { label: 'Porta-Medico', value: metrics?.avgDoorToDoc ?? 18, target: 30, unit: 'min', color: '#3b82f6' },
              { label: 'Porta-Agulha (AVC)', value: 42, target: 60, unit: 'min', color: '#a855f7' },
            ].map((m) => {
              const overTarget = m.value > m.target;
              return (
                <Card key={m.label} className={cn('bg-zinc-900 border-zinc-800', overTarget && 'border-red-500/30')}>
                  <CardContent className="p-5 text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{m.label}</p>
                    <p className={cn('text-4xl font-bold tabular-nums', overTarget ? 'text-red-400' : 'text-emerald-400')}>
                      {m.value}
                      <span className="text-lg text-zinc-500 ml-1">{m.unit}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="flex-1 max-w-32 h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((m.value / m.target) * 100, 100)}%`,
                            backgroundColor: overTarget ? '#ef4444' : m.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">Alvo: {m.target}{m.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Tendencia Door-to-X (ultimas 12h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={doorToXTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit="min" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Line type="monotone" dataKey="doorToDoc" stroke="#3b82f6" strokeWidth={2} name="Porta-Medico" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="doorToTriage" stroke="#22c55e" strokeWidth={2} name="Porta-Triagem" dot={{ r: 3 }} />
                    <Legend formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Door-to-X per triage level */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Tempo Medio por Classificacao Manchester</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Vermelho', doorToDoc: 5, target: 0 },
                    { name: 'Laranja', doorToDoc: 12, target: 10 },
                    { name: 'Amarelo', doorToDoc: 28, target: 60 },
                    { name: 'Verde', doorToDoc: 65, target: 120 },
                    { name: 'Azul', doorToDoc: 95, target: 240 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit="min" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="doorToDoc" name="Porta-Medico" radius={[4, 4, 0, 0]}>
                      {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'].map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Ambulance Tab ──────────────────────────── */}
        <TabsContent value="ambulance" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Ambulance className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold">Ambulancias a Caminho</h2>
            <Badge variant="outline" className="text-red-400 border-red-500/50 animate-pulse">
              {MOCK_AMBULANCES.length} ativas
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_AMBULANCES.map((amb) => {
              const triage = TRIAGE_CONFIG[amb.severity];
              return (
                <Card key={amb.id} className={cn('bg-zinc-900 border-2 transition-all hover:scale-[1.01]', triage.border)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ambulance className={cn('h-5 w-5', triage.color)} />
                        <span className="font-bold text-sm">{amb.unit}</span>
                      </div>
                      <Badge className={cn('text-white text-xs', triage.textBg)}>
                        ETA {amb.eta} min
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-zinc-300">{amb.patient}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-zinc-300">{amb.condition}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-zinc-400">{amb.origin}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-zinc-700">
                        <Phone className="h-3 w-3 mr-1" />
                        Contato
                      </Button>
                      <Button size="sm" className={cn('flex-1 h-7 text-xs text-white', triage.textBg)}>
                        Preparar Leito
                      </Button>
                    </div>
                    {/* ETA progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Saida</span>
                        <span>Chegada</span>
                      </div>
                      <Progress value={Math.max(0, 100 - (amb.eta / 30) * 100)} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {MOCK_AMBULANCES.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center py-12">
                <Ambulance className="h-12 w-12 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-500">Nenhuma ambulancia a caminho</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Fast Track Tab ─────────────────────────── */}
        <TabsContent value="fasttrack" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Track Queue */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-semibold">Fila Fast Track</h2>
                <Badge variant="outline" className="text-green-400 border-green-500/50">
                  {fastTrackPatients.length} elegiveis
                </Badge>
              </div>

              {fastTrackPatients.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="flex flex-col items-center py-10">
                    <Zap className="h-10 w-10 text-zinc-600" />
                    <p className="mt-3 text-sm text-zinc-500">Nenhum paciente elegivel para Fast Track</p>
                    <p className="text-xs text-zinc-600 mt-1">Pacientes Verde/Azul em espera aparecem aqui</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {fastTrackPatients.map((patient, idx) => {
                    const triage = TRIAGE_CONFIG[patient.triageLevel];
                    return (
                      <Card key={patient.id} className="bg-zinc-900 border-zinc-800 hover:border-green-500/30 transition-colors">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{patient.patientName}</p>
                            <p className="text-xs text-zinc-500 truncate">{patient.chiefComplaint}</p>
                          </div>
                          <Badge className={cn('text-[10px] shrink-0', triage.bg, triage.color)} variant="outline">
                            {triage.label}
                          </Badge>
                          <span className={cn('text-xs font-mono tabular-nums', getWaitColor(patient.arrivalTime))}>
                            {formatWaitTime(patient.arrivalTime)}
                          </span>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white shrink-0"
                            onClick={() => handleMovePatient(patient.id, 'IN_CARE')}
                          >
                            <ChevronRight className="h-3 w-3" />
                            Atender
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fast Track Assignment */}
            <Card className="bg-zinc-900 border-zinc-800 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Avaliar Elegibilidade Fast Track</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Protocolo Fast Track para pacientes de baixa complexidade (Verde/Azul).
                  Avaliacao automatica de elegibilidade com encaminhamento ao fluxo rapido.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">ID do Registro de Emergencia</Label>
                  <Input
                    value={fastTrackRecordId}
                    onChange={(e) => setFastTrackRecordId(e.target.value)}
                    placeholder="UUID do registro"
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleFastTrack}
                  disabled={assignFastTrack.isPending || !fastTrackRecordId}
                >
                  {assignFastTrack.isPending ? 'Avaliando...' : 'Avaliar Fast Track'}
                </Button>
                {fastTrackResult && (
                  <div className={cn(
                    'rounded-lg border p-4',
                    fastTrackResult.eligible ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10',
                  )}>
                    <p className={cn('text-sm font-medium', fastTrackResult.eligible ? 'text-green-400' : 'text-red-400')}>
                      {fastTrackResult.eligible ? 'Elegivel para Fast Track' : 'Nao elegivel'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{fastTrackResult.message}</p>
                    {fastTrackResult.assignedArea && (
                      <p className="text-xs text-green-400 mt-1">Area designada: {fastTrackResult.assignedArea}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── NEDOCS Tab ─────────────────────────────── */}
        <TabsContent value="nedocs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Calcular NEDOCS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">
                  National Emergency Department Overcrowding Scale — avalia nivel de superlotacao do PS.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'totalEdBeds', label: 'Leitos PS (total)' },
                    { key: 'totalEdPatients', label: 'Pacientes no PS' },
                    { key: 'ventilatorsInUse', label: 'Ventiladores em uso' },
                    { key: 'admittedWaitingBed', label: 'Internados aguardando leito' },
                    { key: 'longestWaitHours', label: 'Maior espera (horas)' },
                    { key: 'totalHospitalBeds', label: 'Leitos hospital (total)' },
                    { key: 'admissionsLastHour', label: 'Internacoes ultima hora' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={nedocsForm[field.key as keyof typeof nedocsForm]}
                        onChange={(e) => setNedocsForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        className="bg-zinc-950 border-zinc-700 h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleNedocs}
                  disabled={calculateNedocs.isPending || !nedocsForm.totalEdBeds || !nedocsForm.totalEdPatients || !nedocsForm.totalHospitalBeds}
                >
                  {calculateNedocs.isPending ? 'Calculando...' : 'Calcular NEDOCS'}
                </Button>
              </CardContent>
            </Card>

            {nedocsResult ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-zinc-400">Resultado NEDOCS</CardTitle>
                </CardHeader>
                <CardContent>
                  <NedocsGauge result={nedocsResult} />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Gauge className="h-16 w-16 text-zinc-700" />
                  <p className="mt-4 text-sm text-zinc-500">Preencha os campos e calcule o NEDOCS</p>
                  <p className="text-xs text-zinc-600 mt-1">O indicador aparecera aqui</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* NEDOCS Reference Scale */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Escala de Referencia NEDOCS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { range: '0–49', level: 'Normal', color: 'text-green-400', bg: 'bg-green-500/20', desc: 'Fluxo adequado' },
                  { range: '50–99', level: 'Ocupado', color: 'text-yellow-400', bg: 'bg-yellow-500/20', desc: 'Atencao necessaria' },
                  { range: '100–149', level: 'Muito Ocupado', color: 'text-orange-400', bg: 'bg-orange-500/20', desc: 'Acionar plano de contingencia' },
                  { range: '150–200', level: 'Superlotado', color: 'text-red-400', bg: 'bg-red-500/20', desc: 'Desvio de ambulancias' },
                ].map((s) => (
                  <div key={s.range} className={cn('rounded-lg border border-zinc-800 p-3 text-center', s.bg)}>
                    <p className={cn('text-lg font-bold', s.color)}>{s.range}</p>
                    <p className={cn('text-xs font-medium mt-1', s.color)}>{s.level}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reclassify Tab ─────────────────────────── */}
        <TabsContent value="reclassify" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reclassificacao Manchester</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Toda alteracao gera registro de justificativa e autor com auditoria completa.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ID do Registro</Label>
                    <Input value={reclassifyRecordId} onChange={(e) => setReclassifyRecordId(e.target.value)} placeholder="UUID" className="bg-zinc-950 border-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ID do Autor</Label>
                    <Input value={reclassifyForm.authorId} onChange={(e) => setReclassifyForm((f) => ({ ...f, authorId: e.target.value }))} placeholder="UUID profissional" className="bg-zinc-950 border-zinc-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Novo Nivel</Label>
                    <Select
                      value={reclassifyForm.newManchesterLevel}
                      onValueChange={(v) => setReclassifyForm((f) => ({ ...f, newManchesterLevel: v as typeof f.newManchesterLevel }))}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIAGE_ORDER.map((level) => (
                          <SelectItem key={level} value={level}>
                            <span className={TRIAGE_CONFIG[level].color}>{TRIAGE_CONFIG[level].label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Queixa Principal</Label>
                    <Input value={reclassifyForm.chiefComplaint} onChange={(e) => setReclassifyForm((f) => ({ ...f, chiefComplaint: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Justificativa (obrigatoria)</Label>
                  <Textarea value={reclassifyForm.justification} onChange={(e) => setReclassifyForm((f) => ({ ...f, justification: e.target.value }))} className="bg-zinc-950 border-zinc-700" rows={3} placeholder="Motivo da reclassificacao..." />
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleReclassify}
                  disabled={reclassify.isPending || !reclassifyRecordId || !reclassifyForm.authorId || !reclassifyForm.justification}
                >
                  {reclassify.isPending ? 'Reclassificando...' : 'Reclassificar Risco'}
                </Button>
              </CardContent>
            </Card>

            {/* Manchester Reference */}
            <Card className="bg-zinc-900 border-zinc-800 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-zinc-400">Referencia Manchester</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TRIAGE_ORDER.map((level) => {
                  const cfg = TRIAGE_CONFIG[level];
                  const targets: Record<string, string> = {
                    RED: 'Atendimento imediato (0 min)',
                    ORANGE: 'Ate 10 minutos',
                    YELLOW: 'Ate 60 minutos',
                    GREEN: 'Ate 120 minutos',
                    BLUE: 'Ate 240 minutos',
                  };
                  return (
                    <div key={level} className={cn('flex items-center gap-3 p-3 rounded-lg', cfg.bg)}>
                      <div className={cn('w-4 h-4 rounded-full shrink-0', cfg.textBg)} />
                      <div className="flex-1">
                        <span className={cn('font-medium text-sm', cfg.color)}>{cfg.label}</span>
                        <p className="text-xs text-zinc-500">{targets[level]}</p>
                      </div>
                      <span className="text-xs text-zinc-500">{level}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Protocol Activation Dialog ──────────────────── */}
      <Dialog open={protocolDialog} onOpenChange={setProtocolDialog}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProtocol && (
                <>
                  <selectedProtocol.icon className={cn('h-5 w-5', selectedProtocol.color)} />
                  {selectedProtocol.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProtocol?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">ID do Paciente</Label>
              <Input value={protocolPatientId} onChange={(e) => setProtocolPatientId(e.target.value)} placeholder="UUID do paciente" className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">ID do Atendimento</Label>
              <Input value={protocolEncounterId} onChange={(e) => setProtocolEncounterId(e.target.value)} placeholder="UUID do atendimento" className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observacoes</Label>
              <Textarea value={protocolNotes} onChange={(e) => setProtocolNotes(e.target.value)} className="bg-zinc-950 border-zinc-700" rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProtocolDialog(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleActivateProtocol}
              disabled={activateProtocol.isPending || !protocolPatientId}
            >
              {activateProtocol.isPending ? 'Ativando...' : 'Ativar Protocolo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Patient Card Component
// ============================================================================

function PatientCard({
  patient,
  currentColumn,
  onMove,
}: {
  patient: EmergencyPatient;
  currentColumn: EmergencyPatient['status'];
  onMove: (id: string, status: EmergencyPatient['status']) => void;
}) {
  const triage = TRIAGE_CONFIG[patient.triageLevel] ?? TRIAGE_CONFIG.BLUE;

  return (
    <Card className={cn('bg-zinc-900/80 border-l-2 hover:bg-zinc-800/80 transition-all cursor-pointer group', triage.border)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', triage.textBg)} />
            <span className="font-medium text-sm truncate">{patient.patientName}</span>
          </div>
          <Badge className={cn('text-[10px] shrink-0', triage.bg, triage.color)} variant="outline">
            {triage.label}
          </Badge>
        </div>

        <p className="text-xs text-zinc-400 line-clamp-1">{patient.chiefComplaint}</p>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className={cn('flex items-center gap-1 font-mono tabular-nums', getWaitColor(patient.arrivalTime))}>
            <Clock className="h-3 w-3" />
            {formatWaitTime(patient.arrivalTime)}
          </span>
          {patient.bed && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" />
              {patient.bed}
            </span>
          )}
          {patient.doctor && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {patient.doctor}
            </span>
          )}
        </div>

        {patient.doorToDocMinutes !== null && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Timer className="h-3 w-3" />
            Porta-medico: {patient.doorToDocMinutes}min
          </div>
        )}

        {/* Move buttons — visible on hover */}
        <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {STATUS_COLUMNS.filter((s) => s.key !== currentColumn).map((target) => (
            <Button
              key={target.key}
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-zinc-500 hover:text-zinc-300"
              onClick={(e) => {
                e.stopPropagation();
                onMove(patient.id, target.key);
              }}
            >
              {target.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
