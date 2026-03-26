import { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  Heart,
  AlertTriangle,
  Bell,
  BellOff,
  Clock,
  Search,
  User,
  Shield,
  History,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ArrhythmiaType =
  | 'NORMAL'
  | 'ATRIAL_FIBRILLATION'
  | 'ATRIAL_FLUTTER'
  | 'VENTRICULAR_TACHYCARDIA'
  | 'BRADYCARDIA'
  | 'TACHYCARDIA'
  | 'AV_BLOCK'
  | 'PREMATURE_VENTRICULAR_CONTRACTION';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ArrhythmiaAlert {
  id: string;
  patientId: string;
  arrhythmiaType: ArrhythmiaType;
  heartRate: number;
  confidence: number;
  severity: Severity;
  message: string;
  detectedAt: string;
  acknowledged: boolean;
}

interface MonitoredPatient {
  id: string;
  name: string;
  room: string;
  bed: string;
  currentRhythm: ArrhythmiaType;
  heartRate: number;
  lastUpdated: string;
  alertCount: number;
  alerts: ArrhythmiaAlert[];
}

interface HistoryEntry {
  id: string;
  patientId: string;
  patientName: string;
  arrhythmiaType: ArrhythmiaType;
  heartRate: number;
  confidence: number;
  severity: Severity;
  detectedAt: string;
  acknowledged: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PATIENTS: MonitoredPatient[] = [
  {
    id: 'p1',
    name: 'Ana Paula Ferreira',
    room: '501',
    bed: 'C',
    currentRhythm: 'ATRIAL_FIBRILLATION',
    heartRate: 112,
    lastUpdated: '2026-03-25T14:32:00Z',
    alertCount: 3,
    alerts: [
      {
        id: 'al-1',
        patientId: 'p1',
        arrhythmiaType: 'ATRIAL_FIBRILLATION',
        heartRate: 112,
        confidence: 87,
        severity: 'HIGH',
        message: 'Fibrilacao atrial detectada -- FC 112 bpm. Avaliar anticoagulacao (CHA2DS2-VASc).',
        detectedAt: '2026-03-25T14:32:00Z',
        acknowledged: false,
      },
      {
        id: 'al-2',
        patientId: 'p1',
        arrhythmiaType: 'TACHYCARDIA',
        heartRate: 105,
        confidence: 92,
        severity: 'MEDIUM',
        message: 'Taquicardia sinusal -- FC 105 bpm. Investigar causa.',
        detectedAt: '2026-03-25T12:15:00Z',
        acknowledged: true,
      },
      {
        id: 'al-3',
        patientId: 'p1',
        arrhythmiaType: 'ATRIAL_FIBRILLATION',
        heartRate: 98,
        confidence: 78,
        severity: 'HIGH',
        message: 'Fibrilacao atrial detectada -- FC 98 bpm.',
        detectedAt: '2026-03-25T08:45:00Z',
        acknowledged: true,
      },
    ],
  },
  {
    id: 'p2',
    name: 'Roberto Mendes Lima',
    room: '503',
    bed: 'A',
    currentRhythm: 'VENTRICULAR_TACHYCARDIA',
    heartRate: 168,
    lastUpdated: '2026-03-25T14:30:00Z',
    alertCount: 1,
    alerts: [
      {
        id: 'al-4',
        patientId: 'p2',
        arrhythmiaType: 'VENTRICULAR_TACHYCARDIA',
        heartRate: 168,
        confidence: 74,
        severity: 'CRITICAL',
        message: 'TAQUICARDIA VENTRICULAR -- FC 168 bpm, QRS alargado. EMERGENCIA -- avaliar desfibrilacao.',
        detectedAt: '2026-03-25T14:30:00Z',
        acknowledged: false,
      },
    ],
  },
  {
    id: 'p3',
    name: 'Maria Silva Santos',
    room: '301',
    bed: 'A',
    currentRhythm: 'NORMAL',
    heartRate: 74,
    lastUpdated: '2026-03-25T14:28:00Z',
    alertCount: 0,
    alerts: [],
  },
  {
    id: 'p4',
    name: 'Carlos Eduardo Nunes',
    room: '302',
    bed: 'B',
    currentRhythm: 'BRADYCARDIA',
    heartRate: 48,
    lastUpdated: '2026-03-25T14:25:00Z',
    alertCount: 2,
    alerts: [
      {
        id: 'al-5',
        patientId: 'p4',
        arrhythmiaType: 'BRADYCARDIA',
        heartRate: 48,
        confidence: 93,
        severity: 'MEDIUM',
        message: 'Bradicardia -- FC 48 bpm. Avaliar sintomas, medicacoes e necessidade de marca-passo.',
        detectedAt: '2026-03-25T14:25:00Z',
        acknowledged: false,
      },
      {
        id: 'al-6',
        patientId: 'p4',
        arrhythmiaType: 'AV_BLOCK',
        heartRate: 52,
        confidence: 62,
        severity: 'HIGH',
        message: 'Bloqueio atrioventricular suspeito. Avaliar grau e necessidade de marca-passo.',
        detectedAt: '2026-03-25T10:00:00Z',
        acknowledged: true,
      },
    ],
  },
  {
    id: 'p5',
    name: 'Francisca Almeida Costa',
    room: '210',
    bed: 'B',
    currentRhythm: 'TACHYCARDIA',
    heartRate: 108,
    lastUpdated: '2026-03-25T14:20:00Z',
    alertCount: 1,
    alerts: [
      {
        id: 'al-7',
        patientId: 'p5',
        arrhythmiaType: 'TACHYCARDIA',
        heartRate: 108,
        confidence: 90,
        severity: 'MEDIUM',
        message: 'Taquicardia sinusal -- FC 108 bpm. Investigar causa (dor, febre, hipovolemia).',
        detectedAt: '2026-03-25T14:20:00Z',
        acknowledged: false,
      },
    ],
  },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: 'h1', patientId: 'p1', patientName: 'Ana Paula Ferreira', arrhythmiaType: 'ATRIAL_FIBRILLATION', heartRate: 112, confidence: 87, severity: 'HIGH', detectedAt: '2026-03-25T14:32:00Z', acknowledged: false },
  { id: 'h2', patientId: 'p2', patientName: 'Roberto Mendes Lima', arrhythmiaType: 'VENTRICULAR_TACHYCARDIA', heartRate: 168, confidence: 74, severity: 'CRITICAL', detectedAt: '2026-03-25T14:30:00Z', acknowledged: false },
  { id: 'h3', patientId: 'p4', patientName: 'Carlos Eduardo Nunes', arrhythmiaType: 'BRADYCARDIA', heartRate: 48, confidence: 93, severity: 'MEDIUM', detectedAt: '2026-03-25T14:25:00Z', acknowledged: false },
  { id: 'h4', patientId: 'p5', patientName: 'Francisca Almeida Costa', arrhythmiaType: 'TACHYCARDIA', heartRate: 108, confidence: 90, severity: 'MEDIUM', detectedAt: '2026-03-25T14:20:00Z', acknowledged: false },
  { id: 'h5', patientId: 'p1', patientName: 'Ana Paula Ferreira', arrhythmiaType: 'TACHYCARDIA', heartRate: 105, confidence: 92, severity: 'MEDIUM', detectedAt: '2026-03-25T12:15:00Z', acknowledged: true },
  { id: 'h6', patientId: 'p4', patientName: 'Carlos Eduardo Nunes', arrhythmiaType: 'AV_BLOCK', heartRate: 52, confidence: 62, severity: 'HIGH', detectedAt: '2026-03-25T10:00:00Z', acknowledged: true },
  { id: 'h7', patientId: 'p1', patientName: 'Ana Paula Ferreira', arrhythmiaType: 'ATRIAL_FIBRILLATION', heartRate: 98, confidence: 78, severity: 'HIGH', detectedAt: '2026-03-25T08:45:00Z', acknowledged: true },
];

// ─── Config Maps ─────────────────────────────────────────────────────────────

const RHYTHM_CONFIG: Record<ArrhythmiaType, { label: string; labelPt: string; color: string }> = {
  NORMAL: { label: 'NSR', labelPt: 'Ritmo Sinusal Normal', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  ATRIAL_FIBRILLATION: { label: 'AFib', labelPt: 'Fibrilacao Atrial', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  ATRIAL_FLUTTER: { label: 'AFlut', labelPt: 'Flutter Atrial', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  VENTRICULAR_TACHYCARDIA: { label: 'VTach', labelPt: 'Taquicardia Ventricular', color: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' },
  BRADYCARDIA: { label: 'Brady', labelPt: 'Bradicardia', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  TACHYCARDIA: { label: 'Tachy', labelPt: 'Taquicardia', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  AV_BLOCK: { label: 'AVB', labelPt: 'Bloqueio AV', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  PREMATURE_VENTRICULAR_CONTRACTION: { label: 'PVC', labelPt: 'Extrassistole Ventricular', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Baixa', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  MEDIUM: { label: 'Media', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  HIGH: { label: 'Alta', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  CRITICAL: { label: 'Critica', color: 'text-red-400', bgColor: 'bg-red-500/20 animate-pulse' },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Patient Monitor Card ────────────────────────────────────────────────────

function PatientMonitorCard({
  patient,
  onSelect,
}: {
  patient: MonitoredPatient;
  onSelect: (p: MonitoredPatient) => void;
}) {
  const rhythmCfg = RHYTHM_CONFIG[patient.currentRhythm];
  const isCritical = patient.currentRhythm === 'VENTRICULAR_TACHYCARDIA';
  const hasAlerts = patient.alertCount > 0 && patient.alerts.some((a) => !a.acknowledged);

  return (
    <Card
      className={cn(
        'bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-emerald-500/40',
        isCritical && 'border-red-500/60 shadow-lg shadow-red-500/10',
      )}
      onClick={() => onSelect(patient)}
    >
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <div>
              <p className="font-medium text-slate-200 text-sm">{patient.name}</p>
              <p className="text-xs text-slate-500">
                Quarto {patient.room}{patient.bed}
              </p>
            </div>
          </div>
          {hasAlerts && (
            <div className="relative">
              <Bell className="h-4 w-4 text-amber-400" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
            </div>
          )}
        </div>

        {/* Heart rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart
              className={cn(
                'h-5 w-5',
                isCritical ? 'text-red-400 animate-pulse' : 'text-emerald-400',
              )}
            />
            <span className={cn(
              'text-2xl font-bold font-mono',
              isCritical ? 'text-red-400' : patient.heartRate < 60 ? 'text-blue-400' : patient.heartRate > 100 ? 'text-amber-400' : 'text-emerald-400',
            )}>
              {patient.heartRate}
            </span>
            <span className="text-xs text-slate-500">bpm</span>
          </div>
          <Badge variant="outline" className={cn('text-xs', rhythmCfg.color)}>
            {rhythmCfg.label}
          </Badge>
        </div>

        {/* Rhythm label */}
        <p className="text-xs text-slate-400">{rhythmCfg.labelPt}</p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(patient.lastUpdated)}
          </span>
          {patient.alertCount > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {patient.alertCount} alerta{patient.alertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ArrhythmiaMonitoringPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<MonitoredPatient | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const patients = MOCK_PATIENTS;
  const history = MOCK_HISTORY;

  // Summary stats
  const totalMonitored = patients.length;
  const totalAlerts = patients.reduce(
    (sum, p) => sum + p.alerts.filter((a) => !a.acknowledged).length,
    0,
  );
  const criticalCount = patients.filter(
    (p) => p.currentRhythm === 'VENTRICULAR_TACHYCARDIA',
  ).length;
  const normalCount = patients.filter(
    (p) => p.currentRhythm === 'NORMAL',
  ).length;

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.room.includes(q) ||
        RHYTHM_CONFIG[p.currentRhythm].labelPt.toLowerCase().includes(q),
    );
  }, [patients, searchQuery]);

  // Sort: critical first, then alerts, then normal
  const sortedPatients = useMemo(() => {
    const RHYTHM_PRIORITY: Record<ArrhythmiaType, number> = {
      VENTRICULAR_TACHYCARDIA: 0,
      ATRIAL_FIBRILLATION: 1,
      ATRIAL_FLUTTER: 1,
      AV_BLOCK: 2,
      TACHYCARDIA: 3,
      BRADYCARDIA: 3,
      PREMATURE_VENTRICULAR_CONTRACTION: 4,
      NORMAL: 5,
    };
    return [...filteredPatients].sort(
      (a, b) => RHYTHM_PRIORITY[a.currentRhythm] - RHYTHM_PRIORITY[b.currentRhythm],
    );
  }, [filteredPatients]);

  const handleSelectPatient = useCallback((p: MonitoredPatient) => {
    setSelectedPatient(p);
    setDetailOpen(true);
  }, []);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAcknowledgedAlerts((prev) => new Set([...prev, alertId]));
    toast.success('Alerta reconhecido');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Activity className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Monitoramento de Arritmias</h1>
            <p className="text-sm text-slate-400">
              Deteccao de arritmias assistida por IA — {totalMonitored} pacientes monitorados
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Heart className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Monitorados</p>
                <p className="text-2xl font-bold text-emerald-400">{totalMonitored}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Bell className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Alertas Ativos</p>
                <p className="text-2xl font-bold text-amber-400">{totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Zap className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Criticos</p>
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Ritmo Normal</p>
                <p className="text-2xl font-bold text-emerald-400">{normalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="monitor" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Activity className="h-4 w-4 mr-2" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Bell className="h-4 w-4 mr-2" />
            Alertas em Tempo Real
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <History className="h-4 w-4 mr-2" />
            Historico
          </TabsTrigger>
        </TabsList>

        {/* Monitor Tab */}
        <TabsContent value="monitor" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar paciente, quarto ou ritmo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPatients.map((patient) => (
              <PatientMonitorCard
                key={patient.id}
                patient={patient}
                onSelect={handleSelectPatient}
              />
            ))}
          </div>

          {sortedPatients.length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhum paciente encontrado para o filtro aplicado.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {patients
            .flatMap((p) =>
              p.alerts
                .filter((a) => !a.acknowledged && !acknowledgedAlerts.has(a.id))
                .map((a) => ({ ...a, patientName: p.name, room: p.room, bed: p.bed })),
            )
            .sort((a, b) => {
              const sevOrder: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
              return sevOrder[a.severity] - sevOrder[b.severity];
            })
            .map((alert) => {
              const sevCfg = SEVERITY_CONFIG[alert.severity];
              const rhythmCfg = RHYTHM_CONFIG[alert.arrhythmiaType];
              return (
                <Card
                  key={alert.id}
                  className={cn(
                    'bg-slate-900 border-slate-800',
                    alert.severity === 'CRITICAL' && 'border-red-500/60 shadow-lg shadow-red-500/10',
                  )}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg', sevCfg.bgColor)}>
                          <AlertTriangle className={cn('h-5 w-5', sevCfg.color)} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-200">{alert.patientName}</p>
                            <span className="text-xs text-slate-500">
                              Quarto {alert.room}{alert.bed}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={rhythmCfg.color}>
                              {rhythmCfg.label} -- FC {alert.heartRate} bpm
                            </Badge>
                            <Badge variant="outline" className={cn('text-xs', sevCfg.color)}>
                              {sevCfg.label}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Confianca: {alert.confidence}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-slate-500">{formatDateTime(alert.detectedAt)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="border-slate-600 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400"
                        >
                          <BellOff className="h-3 w-3 mr-1" />
                          Reconhecer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          {patients.flatMap((p) => p.alerts.filter((a) => !a.acknowledged && !acknowledgedAlerts.has(a.id))).length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-300">Nenhum alerta ativo</p>
                <p className="text-sm text-slate-500 mt-1">
                  Todos os alertas foram reconhecidos. Monitoramento continua.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-emerald-400" />
                Historico de Deteccoes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Data/Hora</TableHead>
                    <TableHead className="text-slate-400">Paciente</TableHead>
                    <TableHead className="text-slate-400">Arritmia</TableHead>
                    <TableHead className="text-slate-400">FC (bpm)</TableHead>
                    <TableHead className="text-slate-400">Confianca</TableHead>
                    <TableHead className="text-slate-400">Gravidade</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => {
                    const rhythmCfg = RHYTHM_CONFIG[entry.arrhythmiaType];
                    const sevCfg = SEVERITY_CONFIG[entry.severity];
                    return (
                      <TableRow key={entry.id} className="border-slate-800">
                        <TableCell className="text-sm text-slate-400">
                          {formatDateTime(entry.detectedAt)}
                        </TableCell>
                        <TableCell className="font-medium text-slate-200">
                          {entry.patientName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', rhythmCfg.color)}>
                            {rhythmCfg.labelPt}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-slate-300">
                          {entry.heartRate}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${entry.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">{entry.confidence}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', sevCfg.color)}>
                            {sevCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.acknowledged || acknowledgedAlerts.has(entry.id) ? (
                            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/40">
                              Reconhecido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/40">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Patient Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-emerald-400" />
              Detalhes do Paciente
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-200">{selectedPatient.name}</p>
                    <p className="text-sm text-slate-500">
                      Quarto {selectedPatient.room}{selectedPatient.bed}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-3xl font-bold font-mono',
                      selectedPatient.heartRate < 60 ? 'text-blue-400' :
                      selectedPatient.heartRate > 100 ? 'text-amber-400' : 'text-emerald-400',
                    )}>
                      {selectedPatient.heartRate}
                    </p>
                    <p className="text-xs text-slate-500">bpm</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-sm', RHYTHM_CONFIG[selectedPatient.currentRhythm].color)}
                >
                  {RHYTHM_CONFIG[selectedPatient.currentRhythm].labelPt}
                </Badge>
              </div>

              {/* Patient alerts */}
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">
                  Alertas recentes ({selectedPatient.alerts.length})
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedPatient.alerts.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Sem alertas nas ultimas 24h.
                    </p>
                  ) : (
                    selectedPatient.alerts.map((alert) => {
                      const sevCfg = SEVERITY_CONFIG[alert.severity];
                      const isAck = alert.acknowledged || acknowledgedAlerts.has(alert.id);
                      return (
                        <div
                          key={alert.id}
                          className={cn(
                            'p-3 rounded-lg border',
                            isAck ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-800 border-slate-700',
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn('text-xs', sevCfg.color)}>
                                {sevCfg.label}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {formatDateTime(alert.detectedAt)}
                              </span>
                            </div>
                            {!isAck && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-slate-400 hover:text-emerald-400"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                              >
                                <BellOff className="h-3 w-3 mr-1" />
                                Reconhecer
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{alert.message}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Confianca: {alert.confidence}% | FC: {alert.heartRate} bpm
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 italic">
                Analise algoritmica assistida por IA — NAO substitui interpretacao de cardiologista.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
