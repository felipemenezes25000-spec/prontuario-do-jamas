import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Siren,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  Brain,
  Flame,
  ShieldAlert,
  User,
  BedDouble,
  LogOut,
  Timer,
  RefreshCw,
  BarChart3,
  Ambulance,
  Gauge,
  Search,
  ChevronRight,
  Phone,
  MapPin,
  Plus,
  Stethoscope,
  AlertCircle,
  ArrowRight,
  Crosshair,
  HeartPulse,
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useEmergencyBoard,
  useEmergencyMetrics,
  useActivateProtocol,
  useUpdatePatientStatus,
  useReclassifyRisk,
  useCalculateNedocs,
} from '@/services/emergency.service';
import type { EmergencyPatient, NedocsResult } from '@/services/emergency.service';

// ============================================================================
// Types
// ============================================================================

type TriageLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
type PatientStatus = EmergencyPatient['status'];

interface TriageConfig {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  textBg: string;
  headerBg: string;
  ringColor: string;
  targetMinutes: number;
}

// ============================================================================
// Constants
// ============================================================================

const TRIAGE_CONFIG: Record<TriageLevel, TriageConfig> = {
  RED: {
    label: 'Emerg\u00eancia',
    sublabel: 'Atendimento imediato',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    textBg: 'bg-red-500',
    headerBg: 'bg-gradient-to-r from-red-600 to-red-500',
    ringColor: 'ring-red-500/60',
    targetMinutes: 0,
  },
  ORANGE: {
    label: 'Muito Urgente',
    sublabel: 'At\u00e9 10 minutos',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    textBg: 'bg-orange-500',
    headerBg: 'bg-gradient-to-r from-orange-600 to-orange-500',
    ringColor: 'ring-orange-500/60',
    targetMinutes: 10,
  },
  YELLOW: {
    label: 'Urgente',
    sublabel: 'At\u00e9 60 minutos',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    textBg: 'bg-yellow-500',
    headerBg: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
    ringColor: 'ring-yellow-500/60',
    targetMinutes: 60,
  },
  GREEN: {
    label: 'Pouco Urgente',
    sublabel: 'At\u00e9 120 minutos',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/50',
    textBg: 'bg-green-500',
    headerBg: 'bg-gradient-to-r from-green-600 to-green-500',
    ringColor: 'ring-green-500/60',
    targetMinutes: 120,
  },
  BLUE: {
    label: 'N\u00e3o Urgente',
    sublabel: 'At\u00e9 240 minutos',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    textBg: 'bg-blue-500',
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',
    ringColor: 'ring-blue-500/60',
    targetMinutes: 240,
  },
};

const TRIAGE_ORDER: TriageLevel[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'];


const PROTOCOLS = [
  {
    key: 'SEPSIS' as const,
    label: 'Protocolo Sepse',
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-400',
    description: 'Sepsis Bundle 1h \u2014 lactato, hemocultura, ATB',
    targetMin: 60,
  },
  {
    key: 'AVC' as const,
    label: 'Protocolo AVC',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
    hoverBorder: 'hover:border-purple-400',
    description: 'AVC isqu\u00eamico \u2014 janela terap\u00eautica 4.5h',
    targetMin: 270,
  },
  {
    key: 'IAM' as const,
    label: 'Dor Tor\u00e1cica',
    icon: HeartPulse,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    hoverBorder: 'hover:border-red-400',
    description: 'IAM com supra ST \u2014 porta-bal\u00e3o alvo 90min',
    targetMin: 90,
  },
  {
    key: 'TRAUMA' as const,
    label: 'Protocolo Trauma',
    icon: ShieldAlert,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    hoverBorder: 'hover:border-amber-400',
    description: 'Protocolo Trauma \u2014 ATLS / ABCDE',
    targetMin: 30,
  },
];

type NedocsLevel = 'NOT_BUSY' | 'BUSY' | 'EXTREMELY_BUSY' | 'OVERCROWDED';

const NEDOCS_COLORS: Record<NedocsLevel, { label: string; color: string; textColor: string }> = {
  NOT_BUSY: { label: 'Normal', color: '#22c55e', textColor: 'text-green-400' },
  BUSY: { label: 'Ocupado', color: '#eab308', textColor: 'text-yellow-400' },
  EXTREMELY_BUSY: { label: 'Muito Ocupado', color: '#f97316', textColor: 'text-orange-400' },
  OVERCROWDED: { label: 'Superlotado', color: '#ef4444', textColor: 'text-red-400' },
};

// ============================================================================
// Helpers
// ============================================================================

function formatWaitTime(arrivalTime: string): string {
  const diff = Date.now() - new Date(arrivalTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours}h${remaining > 0 ? `${remaining}m` : ''}`;
}

function getWaitColor(arrivalTime: string): string {
  const diff = Date.now() - new Date(arrivalTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 30) return 'text-green-400';
  if (mins < 60) return 'text-yellow-400';
  if (mins < 120) return 'text-orange-400';
  return 'text-red-400';
}

function isOverTarget(arrivalTime: string, targetMinutes: number): boolean {
  if (targetMinutes === 0) return true; // RED is always urgent
  const diff = Date.now() - new Date(arrivalTime).getTime();
  const mins = Math.floor(diff / 60000);
  return mins > targetMinutes;
}

function getNedocsColor(score: number): string {
  if (score < 50) return '#22c55e';
  if (score < 100) return '#eab308';
  if (score < 150) return '#f97316';
  return '#ef4444';
}

// ============================================================================
// useAutoRefreshTime - updates wait times every 30 seconds
// ============================================================================

function useAutoRefreshTime(intervalMs: number = 30_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

// ============================================================================
// Protocol Timer Component
// ============================================================================

function ProtocolTimer({
  startTime,
  targetMinutes,
  label,
  onDismiss,
}: {
  startTime: Date;
  targetMinutes: number;
  label: string;
  onDismiss: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
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
    <div
      className={cn(
        'rounded-xl border p-3 transition-all',
        isOverdue
          ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
          : 'border-emerald-500/30 bg-emerald-500/5',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-lg font-bold tabular-nums',
              isOverdue ? 'text-red-400 animate-pulse' : 'text-emerald-400',
            )}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <button
            onClick={onDismiss}
            className="text-zinc-600 hover:text-zinc-400 text-xs"
            aria-label="Fechar timer"
          >
            &times;
          </button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            isOverdue ? 'bg-red-500' : 'bg-emerald-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-zinc-600">0 min</span>
        <span className={cn('text-[10px]', isOverdue ? 'text-red-400' : 'text-zinc-600')}>
          Alvo: {targetMinutes} min
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// NEDOCS Badge Component (compact for header)
// ============================================================================

function NedocsBadge({ result }: { result: NedocsResult | null }) {
  if (!result) {
    return (
      <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[10px]">
        NEDOCS --
      </Badge>
    );
  }
  const cfg = NEDOCS_COLORS[result.level as NedocsLevel];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('border font-mono tabular-nums text-xs', cfg.textColor)}
            style={{ borderColor: cfg.color + '80' }}
          >
            NEDOCS {result.nedocsScore}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{cfg.label}</p>
          <p className="text-xs text-zinc-400">{result.recommendation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// NEDOCS Gauge (visual meter)
// ============================================================================

function NedocsGauge({ result }: { result: NedocsResult }) {
  const cfg = NEDOCS_COLORS[result.level as NedocsLevel];
  const gaugeData = [{ name: 'NEDOCS', value: Math.min(result.nedocsScore, 200), fill: '' }];

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
            barSize={14}
            data={gaugeData}
          >
            <RadialBar
              dataKey="value"
              fill={getNedocsColor(result.nedocsScore)}
              background={{ fill: '#27272a' }}
              cornerRadius={8}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className={cn('text-3xl font-bold tabular-nums', cfg.textColor)}>
            {result.nedocsScore}
          </p>
          <p className={cn('text-xs font-semibold', cfg.textColor)}>{cfg.label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400 text-center max-w-xs">{result.recommendation}</p>
    </div>
  );
}

// ============================================================================
// Critical Alert Banner
// ============================================================================

function CriticalAlertBanner({ patients }: { patients: EmergencyPatient[] }) {
  const criticalWaiting = patients.filter(
    (p) => p.triageLevel === 'RED' && p.status === 'WAITING',
  );
  const longWaiters = patients.filter((p) => {
    const mins = Math.floor((Date.now() - new Date(p.arrivalTime).getTime()) / 60000);
    const target = TRIAGE_CONFIG[p.triageLevel].targetMinutes;
    return target > 0 && mins > target * 1.5 && p.status === 'WAITING';
  });

  const alerts = [
    ...criticalWaiting.map((p) => ({
      id: `crit-${p.id}`,
      message: `EMERG\u00caNCIA aguardando: ${p.patientName} \u2014 ${p.chiefComplaint}`,
      severity: 'critical' as const,
    })),
    ...longWaiters.map((p) => ({
      id: `long-${p.id}`,
      message: `Espera excessiva: ${p.patientName} (${formatWaitTime(p.arrivalTime)})`,
      severity: 'warning' as const,
    })),
  ];

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm',
            alert.severity === 'critical'
              ? 'border-red-500/40 bg-red-500/10 text-red-300 animate-pulse'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-300',
          )}
        >
          <AlertCircle
            className={cn(
              'h-4 w-4 shrink-0',
              alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400',
            )}
          />
          <span className="flex-1 truncate">{alert.message}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        </div>
      ))}
      {alerts.length > 3 && (
        <p className="text-xs text-zinc-500 text-center">
          + {alerts.length - 3} alertas adicionais
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Metrics Card
// ============================================================================

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  alert,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  alert: boolean;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-zinc-900/80 p-3 transition-all',
        alert ? 'border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-zinc-800',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          alert ? 'bg-red-500/20' : 'bg-zinc-800',
        )}
      >
        <Icon className={cn('h-5 w-5', alert ? 'text-red-400' : color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p
          className={cn(
            'text-xl font-bold tabular-nums leading-tight',
            alert ? 'text-red-400' : 'text-zinc-100',
          )}
        >
          {value}
        </p>
        {subtitle && <p className="text-[10px] text-zinc-600 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// Patient Card (Kanban)
// ============================================================================

function PatientCard({
  patient,
  onMove,
  onProtocol,
}: {
  patient: EmergencyPatient;
  onMove: (id: string, status: PatientStatus) => void;
  onProtocol: (patient: EmergencyPatient) => void;
}) {
  const triage = TRIAGE_CONFIG[patient.triageLevel];
  const isCritical = patient.triageLevel === 'RED';
  const isOverWait =
    patient.status === 'WAITING' && isOverTarget(patient.arrivalTime, triage.targetMinutes);

  // Force re-render for wait times
  useAutoRefreshTime(30_000);

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-zinc-900/80 transition-all duration-200',
        'hover:bg-zinc-800/80 hover:shadow-lg hover:-translate-y-0.5',
        isCritical && patient.status === 'WAITING'
          ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.12)] animate-[pulse-border_2s_ease-in-out_infinite]'
          : 'border-zinc-800',
      )}
    >
      {/* Color-coded left border */}
      <div
        className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', triage.textBg)}
      />

      <div className="pl-3.5 pr-3 py-2.5 space-y-2">
        {/* Row 1: Name + Triage Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isCritical && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <span className="font-semibold text-sm truncate text-zinc-100">
              {patient.patientName}
            </span>
            <span className="text-xs text-zinc-500 shrink-0">{patient.age}a</span>
          </div>
          <Badge
            className={cn('text-[10px] shrink-0 font-medium', triage.bg, triage.color)}
            variant="outline"
          >
            {triage.label}
          </Badge>
        </div>

        {/* Row 2: Chief complaint */}
        <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
          {patient.chiefComplaint}
        </p>

        {/* Row 3: Meta info */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span
            className={cn(
              'flex items-center gap-1 font-mono tabular-nums',
              isOverWait ? 'text-red-400 font-semibold' : getWaitColor(patient.arrivalTime),
            )}
          >
            <Clock className="h-3 w-3" />
            {formatWaitTime(patient.arrivalTime)}
          </span>
          {patient.doctor && (
            <span className="flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{patient.doctor}</span>
            </span>
          )}
          {patient.bed && (
            <span className="flex items-center gap-1 text-emerald-400/70">
              <BedDouble className="h-3 w-3" />
              {patient.bed}
            </span>
          )}
          {patient.doorToDocMinutes !== null && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {patient.doorToDocMinutes}min
            </span>
          )}
        </div>

        {/* Row 4: Quick actions (visible on hover) */}
        <div className="flex gap-1.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -mb-0.5">
          {patient.status === 'WAITING' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onMove(patient.id, 'IN_CARE');
              }}
            >
              <ArrowRight className="h-3 w-3 mr-0.5" />
              Atender
            </Button>
          )}
          {patient.status === 'IN_CARE' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(patient.id, 'OBSERVATION');
                }}
              >
                Observa\u00e7\u00e3o
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-zinc-400 hover:text-zinc-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(patient.id, 'DISCHARGE');
                }}
              >
                Alta
              </Button>
            </>
          )}
          {patient.status === 'OBSERVATION' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-zinc-400 hover:text-zinc-300"
              onClick={(e) => {
                e.stopPropagation();
                onMove(patient.id, 'DISCHARGE');
              }}
            >
              <LogOut className="h-3 w-3 mr-0.5" />
              Alta
            </Button>
          )}
          {(patient.triageLevel === 'RED' || patient.triageLevel === 'ORANGE') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onProtocol(patient);
              }}
            >
              <Crosshair className="h-3 w-3 mr-0.5" />
              Protocolo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Triage Column (Kanban)
// ============================================================================

function TriageColumn({
  level,
  patients,
  onMovePatient,
  onProtocol,
}: {
  level: TriageLevel;
  patients: EmergencyPatient[];
  onMovePatient: (id: string, status: PatientStatus) => void;
  onProtocol: (patient: EmergencyPatient) => void;
}) {
  const config = TRIAGE_CONFIG[level];
  const isCritical = level === 'RED' && patients.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] shrink-0 rounded-xl border bg-zinc-950/50 overflow-hidden transition-all',
        isCritical
          ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)] ring-1 ring-red-500/20 animate-[pulse-glow_3s_ease-in-out_infinite]'
          : 'border-zinc-800',
      )}
    >
      {/* Column Header */}
      <div className={cn('px-3 py-2.5', config.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
            <h3 className="font-bold text-sm text-white tracking-wide uppercase">
              {config.label}
            </h3>
          </div>
          <Badge className="bg-white/20 text-white border-0 text-xs font-bold tabular-nums min-w-[28px] justify-center">
            {patients.length}
          </Badge>
        </div>
        <p className="text-[10px] text-white/60 mt-0.5">{config.sublabel}</p>
      </div>

      {/* Column Body */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-380px)]">
        <div className="p-2 space-y-2">
          {patients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Nenhum paciente</p>
            </div>
          )}
          {patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onMove={onMovePatient}
              onProtocol={onProtocol}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Ambulance Incoming Panel
// ============================================================================

interface AmbulanceArrival {
  id: string;
  unit: string;
  eta: number;
  patient: string;
  severity: TriageLevel;
  condition: string;
  origin: string;
}

const MOCK_AMBULANCES: AmbulanceArrival[] = [
  {
    id: 'amb-1',
    unit: 'SAMU 192',
    eta: 8,
    patient: 'Masc, ~60a',
    severity: 'RED',
    condition: 'Dor tor\u00e1cica + sudorese',
    origin: 'Av. Paulista',
  },
  {
    id: 'amb-2',
    unit: 'SAMU 193',
    eta: 15,
    patient: 'Fem, ~35a',
    severity: 'ORANGE',
    condition: 'TCE moderado',
    origin: 'Rod. Castelo Branco',
  },
];

function AmbulancePanel() {
  if (MOCK_AMBULANCES.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Ambulance className="h-4 w-4 text-red-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Ambul\u00e2ncias a Caminho
        </span>
        <Badge variant="outline" className="text-red-400 border-red-500/50 animate-pulse text-[10px]">
          {MOCK_AMBULANCES.length}
        </Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {MOCK_AMBULANCES.map((amb) => {
          const triage = TRIAGE_CONFIG[amb.severity];
          return (
            <div
              key={amb.id}
              className={cn(
                'flex-none w-64 rounded-lg border bg-zinc-900/80 p-3 space-y-2',
                triage.border,
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Ambulance className={cn('h-4 w-4', triage.color)} />
                  <span className="font-bold text-xs">{amb.unit}</span>
                </div>
                <Badge className={cn('text-white text-[10px]', triage.textBg)}>
                  ETA {amb.eta}min
                </Badge>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <User className="h-3 w-3 text-zinc-500" />
                  {amb.patient}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <AlertTriangle className="h-3 w-3 text-zinc-500" />
                  {amb.condition}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <MapPin className="h-3 w-3" />
                  {amb.origin}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="flex-1 h-6 text-[10px] border-zinc-700">
                  <Phone className="h-3 w-3 mr-0.5" />
                  Contato
                </Button>
                <Button size="sm" className={cn('flex-1 h-6 text-[10px] text-white', triage.textBg)}>
                  Preparar Leito
                </Button>
              </div>
              <Progress value={Math.max(0, 100 - (amb.eta / 30) * 100)} className="h-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function EmergencyPage() {
  // Dialog state
  const [protocolDialog, setProtocolDialog] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<(typeof PROTOCOLS)[number] | null>(null);
  const [protocolPatientId, setProtocolPatientId] = useState('');
  const [protocolEncounterId, setProtocolEncounterId] = useState('');
  const [protocolNotes, setProtocolNotes] = useState('');
  const [triageDialog, setTriageDialog] = useState(false);
  const [nedocsDialog, setNedocsDialog] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  // Protocol timers
  const [activeProtocolTimers, setActiveProtocolTimers] = useState<
    Array<{ id: string; protocol: string; startTime: Date; target: number }>
  >([]);

  // Reclassify
  const [reclassifyDialog, setReclassifyDialog] = useState(false);
  const [reclassifyRecordId, setReclassifyRecordId] = useState('');
  const [reclassifyForm, setReclassifyForm] = useState<{
    authorId: string;
    newManchesterLevel: TriageLevel;
    justification: string;
    chiefComplaint: string;
  }>({ authorId: '', newManchesterLevel: 'YELLOW', justification: '', chiefComplaint: '' });

  // NEDOCS
  const [nedocsForm, setNedocsForm] = useState({
    totalEdBeds: '',
    totalEdPatients: '',
    ventilatorsInUse: '',
    admittedWaitingBed: '',
    longestWaitHours: '',
    totalHospitalBeds: '',
    admissionsLastHour: '',
  });
  const [nedocsResult, setNedocsResult] = useState<NedocsResult | null>(null);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Kanban scroll ref
  const kanbanRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { data: board = [], isLoading } = useEmergencyBoard();
  const { data: metrics } = useEmergencyMetrics();
  const activateProtocol = useActivateProtocol();
  const updateStatus = useUpdatePatientStatus();
  const reclassify = useReclassifyRisk();
  const calculateNedocs = useCalculateNedocs();

  // Filtered board
  const filteredBoard = useMemo(() => {
    if (!search) return board;
    const q = search.toLowerCase();
    return board.filter(
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.chiefComplaint.toLowerCase().includes(q) ||
        (p.doctor ?? '').toLowerCase().includes(q),
    );
  }, [board, search]);

  // Group by Manchester
  const manchesterGrouped = useMemo(() => {
    const map: Record<TriageLevel, EmergencyPatient[]> = {
      RED: [],
      ORANGE: [],
      YELLOW: [],
      GREEN: [],
      BLUE: [],
    };
    filteredBoard.forEach((p) => {
      if (map[p.triageLevel]) map[p.triageLevel].push(p);
    });
    // Sort by arrival time (earliest first)
    Object.values(map).forEach((arr) => {
      arr.sort(
        (a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime(),
      );
    });
    return map;
  }, [filteredBoard]);

  // Metrics computed
  const computedMetrics = useMemo(() => {
    const waiting = filteredBoard.filter((p) => p.status === 'WAITING').length;
    const inCare = filteredBoard.filter((p) => p.status === 'IN_CARE').length;
    const observation = filteredBoard.filter((p) => p.status === 'OBSERVATION').length;
    const discharged = filteredBoard.filter((p) => p.status === 'DISCHARGE').length;

    // Compute average wait for those still waiting
    const waitingPatients = filteredBoard.filter((p) => p.status === 'WAITING');
    let avgWait = 0;
    if (waitingPatients.length > 0) {
      const totalWait = waitingPatients.reduce((sum, p) => {
        return sum + Math.floor((Date.now() - new Date(p.arrivalTime).getTime()) / 60000);
      }, 0);
      avgWait = Math.round(totalWait / waitingPatients.length);
    }

    return {
      waiting,
      inCare,
      observation,
      discharged,
      total: filteredBoard.length,
      avgWait,
      avgDoorToDoc: metrics?.avgDoorToDoc ?? 0,
      occupancyRate: metrics?.occupancyRate ?? 0,
    };
  }, [filteredBoard, metrics]);

  // Handlers
  const handleMovePatient = useCallback(
    (patientId: string, newStatus: PatientStatus) => {
      updateStatus.mutate(
        { patientId, status: newStatus },
        {
          onSuccess: () => toast.success('Status atualizado'),
          onError: () => toast.error('Erro ao atualizar status'),
        },
      );
    },
    [updateStatus],
  );

  const handleOpenProtocolForPatient = useCallback(
    (patient: EmergencyPatient) => {
      setProtocolPatientId(patient.patientId);
      setProtocolEncounterId(patient.encounterId);
      setProtocolDialog(true);
    },
    [],
  );

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
          toast.success(`${selectedProtocol.label} ativado!`);
          setActiveProtocolTimers((prev) => [
            ...prev,
            {
              id: `${selectedProtocol.key}-${Date.now()}`,
              protocol: selectedProtocol.label,
              startTime: new Date(),
              target: selectedProtocol.targetMin,
            },
          ]);
          setProtocolDialog(false);
          setSelectedProtocol(null);
          setProtocolPatientId('');
          setProtocolEncounterId('');
          setProtocolNotes('');
        },
        onError: () => toast.error('Erro ao ativar protocolo'),
      },
    );
  }, [selectedProtocol, protocolPatientId, protocolEncounterId, protocolNotes, activateProtocol]);

  const handleReclassify = useCallback(() => {
    if (!reclassifyRecordId || !reclassifyForm.authorId || !reclassifyForm.justification) return;
    reclassify.mutate(
      { recordId: reclassifyRecordId, ...reclassifyForm },
      {
        onSuccess: () => {
          toast.success('Reclassifica\u00e7\u00e3o registrada com auditoria');
          setReclassifyDialog(false);
          setReclassifyRecordId('');
          setReclassifyForm({
            authorId: '',
            newManchesterLevel: 'YELLOW',
            justification: '',
            chiefComplaint: '',
          });
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
          const toastFn =
            data.level === 'OVERCROWDED'
              ? toast.error
              : data.level === 'EXTREMELY_BUSY'
                ? toast.warning
                : toast.success;
          const levelCfg = NEDOCS_COLORS[data.level as NedocsLevel];
          toastFn(`NEDOCS: ${data.nedocsScore} \u2014 ${levelCfg.label}`);
        },
        onError: () => toast.error('Erro ao calcular NEDOCS'),
      },
    );
  }, [nedocsForm, calculateNedocs]);

  const dismissTimer = useCallback((id: string) => {
    setActiveProtocolTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-700 border-t-red-500 mx-auto" />
            <Siren className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
          </div>
          <p className="text-sm text-zinc-400">Carregando Pronto-Socorro...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* ================================================================ */}
        {/* HEADER                                                          */}
        {/* ================================================================ */}
        <div className="shrink-0 px-4 lg:px-6 pt-4 pb-3 space-y-3 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
          {/* Row 1: Title + clock + actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 ring-1 ring-red-500/30">
                <Siren className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">Pronto-Socorro</h1>
                  <Badge
                    variant="outline"
                    className="text-emerald-400 border-emerald-500/50 animate-pulse text-[10px]"
                  >
                    AO VIVO
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="font-semibold text-zinc-300">{filteredBoard.length}</span>{' '}
                    pacientes
                  </span>
                  <span className="text-zinc-700">|</span>
                  <NedocsBadge result={nedocsResult} />
                  <span className="text-zinc-700">|</span>
                  <span className="font-mono tabular-nums text-zinc-300">
                    {currentTime.toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56 pl-8 h-8 text-xs bg-zinc-900 border-zinc-700"
                />
              </div>

              {/* NEDOCS Calculator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-zinc-700 gap-1.5"
                    onClick={() => setNedocsDialog(true)}
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    NEDOCS
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Calcular \u00edndice de superlota\u00e7\u00e3o</TooltipContent>
              </Tooltip>

              {/* Reclassify */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-zinc-700 gap-1.5"
                    onClick={() => setReclassifyDialog(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reclassificar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reclassifica\u00e7\u00e3o Manchester</TooltipContent>
              </Tooltip>

              {/* New Triage Button */}
              <Button
                size="sm"
                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5 shadow-lg shadow-red-500/20"
                onClick={() => setTriageDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Triagem
              </Button>
            </div>
          </div>

          {/* Row 2: Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <MetricCard
              label="Em Espera"
              value={String(computedMetrics.waiting)}
              icon={Clock}
              color="text-yellow-400"
              alert={computedMetrics.waiting > 20}
              subtitle={computedMetrics.waiting > 0 ? `m\u00e9dia ${computedMetrics.avgWait}min` : undefined}
            />
            <MetricCard
              label="Em Atendimento"
              value={String(computedMetrics.inCare)}
              icon={Activity}
              color="text-emerald-400"
              alert={false}
            />
            <MetricCard
              label="Observa\u00e7\u00e3o"
              value={String(computedMetrics.observation)}
              icon={BedDouble}
              color="text-blue-400"
              alert={false}
            />
            <MetricCard
              label="Alta"
              value={String(computedMetrics.discharged)}
              icon={LogOut}
              color="text-zinc-400"
              alert={false}
            />
            <MetricCard
              label="Tempo M\u00e9dio Espera"
              value={`${computedMetrics.avgWait}min`}
              icon={Timer}
              color="text-purple-400"
              alert={computedMetrics.avgWait > 60}
            />
            <MetricCard
              label="Porta-M\u00e9dico"
              value={`${computedMetrics.avgDoorToDoc}min`}
              icon={Stethoscope}
              color="text-emerald-400"
              alert={computedMetrics.avgDoorToDoc > 30}
              subtitle={computedMetrics.avgDoorToDoc > 30 ? 'Acima do alvo' : 'Dentro do alvo'}
            />
            <MetricCard
              label="Ocupa\u00e7\u00e3o"
              value={`${computedMetrics.occupancyRate}%`}
              icon={Gauge}
              color="text-blue-400"
              alert={computedMetrics.occupancyRate > 90}
            />
          </div>

          {/* Row 3: Protocol Quick-Access Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mr-1">
              Protocolos:
            </span>
            {PROTOCOLS.map((proto) => {
              const Icon = proto.icon;
              return (
                <Button
                  key={proto.key}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 text-xs font-semibold border transition-all',
                    proto.borderColor,
                    proto.bgColor,
                    proto.hoverBorder,
                    'hover:scale-[1.03] active:scale-[0.98]',
                  )}
                  onClick={() => {
                    setSelectedProtocol(proto);
                    setProtocolDialog(true);
                  }}
                >
                  <Icon className={cn('h-3.5 w-3.5', proto.color)} />
                  <span className={proto.color}>{proto.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* ================================================================ */}
        {/* ALERTS + TIMERS + AMBULANCES                                    */}
        {/* ================================================================ */}
        <div className="shrink-0 px-4 lg:px-6 py-2 space-y-2">
          {/* Critical Alerts */}
          <CriticalAlertBanner patients={filteredBoard} />

          {/* Active Protocol Timers */}
          {activeProtocolTimers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {activeProtocolTimers.map((timer) => (
                <ProtocolTimer
                  key={timer.id}
                  startTime={timer.startTime}
                  targetMinutes={timer.target}
                  label={timer.protocol}
                  onDismiss={() => dismissTimer(timer.id)}
                />
              ))}
            </div>
          )}

          {/* Ambulances */}
          <AmbulancePanel />
        </div>

        {/* ================================================================ */}
        {/* KANBAN TRIAGE COLUMNS                                           */}
        {/* ================================================================ */}
        <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4">
          <div
            ref={kanbanRef}
            className="flex gap-3 h-full overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}
          >
            {TRIAGE_ORDER.map((level) => (
              <TriageColumn
                key={level}
                level={level}
                patients={manchesterGrouped[level]}
                onMovePatient={handleMovePatient}
                onProtocol={handleOpenProtocolForPatient}
              />
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* FLOATING NEW TRIAGE BUTTON (mobile)                             */}
        {/* ================================================================ */}
        <div className="fixed bottom-6 right-6 sm:hidden z-50">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-500/30 p-0"
            onClick={() => setTriageDialog(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* ================================================================ */}
        {/* DIALOGS                                                         */}
        {/* ================================================================ */}

        {/* Protocol Activation Dialog */}
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
              <DialogDescription>{selectedProtocol?.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">ID do Paciente</Label>
                <Input
                  value={protocolPatientId}
                  onChange={(e) => setProtocolPatientId(e.target.value)}
                  placeholder="UUID do paciente"
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ID do Atendimento</Label>
                <Input
                  value={protocolEncounterId}
                  onChange={(e) => setProtocolEncounterId(e.target.value)}
                  placeholder="UUID do atendimento"
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Observa\u00e7\u00f5es</Label>
                <Textarea
                  value={protocolNotes}
                  onChange={(e) => setProtocolNotes(e.target.value)}
                  className="bg-zinc-950 border-zinc-700"
                  rows={3}
                />
              </div>
              {selectedProtocol && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                  <p className="text-xs text-zinc-500">
                    Tempo alvo:{' '}
                    <span className="font-bold text-zinc-300">
                      {selectedProtocol.targetMin} minutos
                    </span>
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Um timer ser\u00e1 iniciado automaticamente ap\u00f3s ativa\u00e7\u00e3o
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setProtocolDialog(false)}
                className="border-zinc-700"
              >
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

        {/* New Triage Dialog (placeholder) */}
        <Dialog open={triageDialog} onOpenChange={setTriageDialog}>
          <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crosshair className="h-5 w-5 text-red-400" />
                Nova Triagem Manchester
              </DialogTitle>
              <DialogDescription>
                Classificar novo paciente pelo Protocolo de Manchester
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {TRIAGE_ORDER.map((level) => {
                  const cfg = TRIAGE_CONFIG[level];
                  return (
                    <div
                      key={level}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-all hover:scale-105',
                        cfg.border,
                        cfg.bg,
                      )}
                    >
                      <div className={cn('h-4 w-4 rounded-full', cfg.textBg)} />
                      <span className={cn('text-[10px] font-semibold text-center', cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-[9px] text-zinc-500">{cfg.sublabel}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-500 text-center">
                Funcionalidade completa de triagem dispon\u00edvel no m\u00f3dulo de atendimento
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTriageDialog(false)}
                className="border-zinc-700"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reclassify Dialog */}
        <Dialog open={reclassifyDialog} onOpenChange={setReclassifyDialog}>
          <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-400" />
                Reclassifica\u00e7\u00e3o Manchester
              </DialogTitle>
              <DialogDescription>
                Toda altera\u00e7\u00e3o gera registro de justificativa e autor com auditoria completa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">ID do Registro</Label>
                  <Input
                    value={reclassifyRecordId}
                    onChange={(e) => setReclassifyRecordId(e.target.value)}
                    placeholder="UUID"
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID do Autor</Label>
                  <Input
                    value={reclassifyForm.authorId}
                    onChange={(e) =>
                      setReclassifyForm((f) => ({ ...f, authorId: e.target.value }))
                    }
                    placeholder="UUID profissional"
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Novo N\u00edvel</Label>
                  <Select
                    value={reclassifyForm.newManchesterLevel}
                    onValueChange={(v) =>
                      setReclassifyForm((f) => ({
                        ...f,
                        newManchesterLevel: v as TriageLevel,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAGE_ORDER.map((level) => (
                        <SelectItem key={level} value={level}>
                          <span className={TRIAGE_CONFIG[level].color}>
                            {TRIAGE_CONFIG[level].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Queixa Principal</Label>
                  <Input
                    value={reclassifyForm.chiefComplaint}
                    onChange={(e) =>
                      setReclassifyForm((f) => ({ ...f, chiefComplaint: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Justificativa (obrigat\u00f3ria)</Label>
                <Textarea
                  value={reclassifyForm.justification}
                  onChange={(e) =>
                    setReclassifyForm((f) => ({ ...f, justification: e.target.value }))
                  }
                  className="bg-zinc-950 border-zinc-700"
                  rows={3}
                  placeholder="Motivo da reclassifica\u00e7\u00e3o..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReclassifyDialog(false)}
                className="border-zinc-700"
              >
                Cancelar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleReclassify}
                disabled={
                  reclassify.isPending ||
                  !reclassifyRecordId ||
                  !reclassifyForm.authorId ||
                  !reclassifyForm.justification
                }
              >
                {reclassify.isPending ? 'Reclassificando...' : 'Reclassificar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NEDOCS Calculator Dialog */}
        <Dialog open={nedocsDialog} onOpenChange={setNedocsDialog}>
          <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Calcular NEDOCS
              </DialogTitle>
              <DialogDescription>
                National Emergency Department Overcrowding Scale \u2014 avalia n\u00edvel de
                superlota\u00e7\u00e3o
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'totalEdBeds', label: 'Leitos PS (total)' },
                  { key: 'totalEdPatients', label: 'Pacientes no PS' },
                  { key: 'ventilatorsInUse', label: 'Ventiladores em uso' },
                  { key: 'admittedWaitingBed', label: 'Internados aguardando leito' },
                  { key: 'longestWaitHours', label: 'Maior espera (horas)' },
                  { key: 'totalHospitalBeds', label: 'Leitos hospital (total)' },
                  { key: 'admissionsLastHour', label: 'Interna\u00e7\u00f5es \u00faltima hora' },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={nedocsForm[field.key as keyof typeof nedocsForm]}
                      onChange={(e) =>
                        setNedocsForm((f) => ({ ...f, [field.key]: e.target.value }))
                      }
                      className="bg-zinc-950 border-zinc-700 h-8 text-sm"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleNedocs}
                disabled={
                  calculateNedocs.isPending ||
                  !nedocsForm.totalEdBeds ||
                  !nedocsForm.totalEdPatients ||
                  !nedocsForm.totalHospitalBeds
                }
              >
                {calculateNedocs.isPending ? 'Calculando...' : 'Calcular NEDOCS'}
              </Button>

              {nedocsResult && (
                <div className="border-t border-zinc-800 pt-4">
                  <NedocsGauge result={nedocsResult} />
                </div>
              )}

              {/* Reference scale */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { range: '0\u201349', level: 'Normal', color: 'text-green-400', bg: 'bg-green-500/10' },
                  { range: '50\u201399', level: 'Ocupado', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { range: '100\u2013149', level: 'Muito Ocupado', color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { range: '150\u2013200', level: 'Superlotado', color: 'text-red-400', bg: 'bg-red-500/10' },
                ].map((s) => (
                  <div
                    key={s.range}
                    className={cn('rounded-lg border border-zinc-800 p-2 text-center', s.bg)}
                  >
                    <p className={cn('text-sm font-bold', s.color)}>{s.range}</p>
                    <p className={cn('text-[10px] font-medium', s.color)}>{s.level}</p>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ================================================================ */}
      {/* GLOBAL STYLES for animations                                     */}
      {/* ================================================================ */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); }
          50% { border-color: rgba(239, 68, 68, 0.8); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.08); }
          50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.18); }
        }
      `}</style>
    </TooltipProvider>
  );
}
