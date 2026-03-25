import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const TRIAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  RED: { label: 'Emergência', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' },
  ORANGE: { label: 'Muito Urgente', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
  YELLOW: { label: 'Urgente', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
  GREEN: { label: 'Pouco Urgente', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
  BLUE: { label: 'Não Urgente', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
};

const STATUS_COLUMNS = [
  { key: 'WAITING' as const, label: 'Espera', icon: Clock, color: 'text-yellow-400' },
  { key: 'IN_CARE' as const, label: 'Em Atendimento', icon: Activity, color: 'text-emerald-400' },
  { key: 'OBSERVATION' as const, label: 'Observação', icon: BedDouble, color: 'text-blue-400' },
  { key: 'DISCHARGE' as const, label: 'Alta', icon: LogOut, color: 'text-zinc-400' },
];

const PROTOCOLS = [
  { key: 'AVC' as const, label: 'Protocolo AVC', icon: Brain, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { key: 'IAM' as const, label: 'Protocolo IAM', icon: Heart, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  { key: 'SEPSIS' as const, label: 'Protocolo Sepsis', icon: Flame, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  { key: 'TRAUMA' as const, label: 'Protocolo Trauma', icon: ShieldAlert, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
];

// ============================================================================
// Helper
// ============================================================================

function formatWaitTime(arrivalTime: string): string {
  const diff = Date.now() - new Date(arrivalTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours}h${remaining > 0 ? ` ${remaining}min` : ''}`;
}

// ============================================================================
// Component
// ============================================================================

export default function EmergencyPage() {
  const [protocolDialog, setProtocolDialog] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<typeof PROTOCOLS[number] | null>(null);
  const [protocolPatientId, setProtocolPatientId] = useState('');
  const [protocolEncounterId, setProtocolEncounterId] = useState('');
  const [protocolNotes, setProtocolNotes] = useState('');
  const [search, setSearch] = useState('');

  // Advanced panels
  const [reclassifyRecordId, setReclassifyRecordId] = useState('');
  const [reclassifyForm, setReclassifyForm] = useState<{ authorId: string; newManchesterLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE'; justification: string; chiefComplaint: string }>({ authorId: '', newManchesterLevel: 'YELLOW', justification: '', chiefComplaint: '' });
  const [nedocsForm, setNedocsForm] = useState({ totalEdBeds: '', totalEdPatients: '', ventilatorsInUse: '', admittedWaitingBed: '', longestWaitHours: '', totalHospitalBeds: '', admissionsLastHour: '' });
  const [nedocsResult, setNedocsResult] = useState<NedocsResult | null>(null);
  const [fastTrackRecordId, setFastTrackRecordId] = useState('');
  const [fastTrackResult, setFastTrackResult] = useState<{ eligible: boolean; message: string; assignedArea?: string } | null>(null);

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
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.chiefComplaint.toLowerCase().includes(q),
    );
  }, [board, search]);

  const grouped = useMemo(() => {
    const map: Record<EmergencyPatient['status'], EmergencyPatient[]> = {
      WAITING: [],
      IN_CARE: [],
      OBSERVATION: [],
      DISCHARGE: [],
    };
    filteredBoard.forEach((p) => {
      if (map[p.status]) map[p.status].push(p);
    });
    return map;
  }, [filteredBoard]);

  const handleReclassify = () => {
    if (!reclassifyRecordId || !reclassifyForm.authorId || !reclassifyForm.justification) return;
    reclassify.mutate(
      { recordId: reclassifyRecordId, ...reclassifyForm },
      {
        onSuccess: () => {
          toast.success('Reclassificação registrada com auditoria');
          setReclassifyRecordId('');
          setReclassifyForm({ authorId: '', newManchesterLevel: 'YELLOW', justification: '', chiefComplaint: '' });
        },
        onError: () => toast.error('Erro ao reclassificar'),
      },
    );
  };

  const handleNedocs = () => {
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
          toast[data.level === 'OVERCROWDED' ? 'error' : data.level === 'EXTREMELY_BUSY' ? 'warning' : 'success'](`NEDOCS: ${data.nedocsScore} — ${data.level}`);
        },
        onError: () => toast.error('Erro ao calcular NEDOCS'),
      },
    );
  };

  const handleActivateProtocol = () => {
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
          setProtocolDialog(false);
          resetProtocolForm();
        },
        onError: () => toast.error('Erro ao ativar protocolo.'),
      },
    );
  };

  const resetProtocolForm = () => {
    setSelectedProtocol(null);
    setProtocolPatientId('');
    setProtocolEncounterId('');
    setProtocolNotes('');
  };

  const handleMovePatient = (patientId: string, newStatus: EmergencyPatient['status']) => {
    updateStatus.mutate(
      { patientId, status: newStatus },
      {
        onSuccess: () => toast.success('Status atualizado.'),
        onError: () => toast.error('Erro ao atualizar status.'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Siren className="h-7 w-7 text-red-400" />
          <h1 className="text-2xl font-bold">Pronto-Socorro</h1>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/50">
            Tempo real
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-zinc-900 border-zinc-700"
          />
        </div>
      </div>

      {/* Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Timer className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-xs text-zinc-400">Porta-Médico</p>
                <p className="text-lg font-bold">{metrics.avgDoorToDoc}min</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-zinc-400">Ocupação</p>
                <p className="text-lg font-bold">{metrics.occupancyRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-xs text-zinc-400">Em Espera</p>
                <p className="text-lg font-bold">{metrics.waitingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-xs text-zinc-400">Atendimento</p>
                <p className="text-lg font-bold">{metrics.inCareCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <BedDouble className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-zinc-400">Observação</p>
                <p className="text-lg font-bold">{metrics.observationCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Total Hoje</p>
                <p className="text-lg font-bold">{metrics.totalToday}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs: Board + Reclassification + Fast Track + NEDOCS */}
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="board" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Painel PS
          </TabsTrigger>
          <TabsTrigger value="reclassify" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reclassificacao Manchester
          </TabsTrigger>
          <TabsTrigger value="fasttrack" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Fast Track
          </TabsTrigger>
          <TabsTrigger value="nedocs" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            NEDOCS
          </TabsTrigger>
        </TabsList>

        {/* Board Tab */}
        <TabsContent value="board">
          {/* Protocol Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PROTOCOLS.map((proto) => {
              const Icon = proto.icon;
              return (
                <Button
                  key={proto.key}
                  variant="outline"
                  className={cn('border-zinc-700 hover:border-zinc-500', proto.bgColor)}
                  onClick={() => {
                    setSelectedProtocol(proto);
                    setProtocolDialog(true);
                  }}
                >
                  <Icon className={cn('h-4 w-4 mr-2', proto.color)} />
                  {proto.label}
                </Button>
              );
            })}
          </div>

          {/* Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUS_COLUMNS.map((col) => {
              const Icon = col.icon;
              const patients = grouped[col.key];
              return (
                <div key={col.key} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <Icon className={cn('h-5 w-5', col.color)} />
                    <h2 className="font-semibold">{col.label}</h2>
                    <Badge variant="secondary" className="ml-auto bg-zinc-800 text-zinc-300">
                      {patients.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[calc(100vh-480px)] overflow-y-auto pr-1">
                    {patients.length === 0 && (
                      <p className="text-sm text-zinc-500 text-center py-8">Nenhum paciente</p>
                    )}
                    {patients.map((patient) => {
                      const triage = TRIAGE_CONFIG[patient.triageLevel] ?? { label: 'Nao Urgente', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' };
                      return (
                        <Card
                          key={patient.id}
                          className={cn(
                            'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer',
                            triage.border,
                          )}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={cn('w-2 h-2 rounded-full shrink-0', triage.bg.replace('/20', ''))} />
                                <span className="font-medium text-sm truncate">{patient.patientName}</span>
                              </div>
                              <Badge className={cn('text-[10px] shrink-0', triage.bg, triage.color)} variant="outline">
                                {triage.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-1">{patient.chiefComplaint}</p>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
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
                              <p className="text-[10px] text-zinc-500">
                                Porta-medico: {patient.doorToDocMinutes}min
                              </p>
                            )}
                            <div className="flex gap-1 pt-1">
                              {STATUS_COLUMNS.filter((s) => s.key !== col.key).map((target) => (
                                <Button
                                  key={target.key}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 text-zinc-500 hover:text-zinc-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePatient(patient.id, target.key);
                                  }}
                                >
                                  {target.label}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Reclassification Tab */}
        <TabsContent value="reclassify">
          <div className="space-y-6 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              Reclassificacao do nivel Manchester com auditoria completa. Toda alteracao gera registro de justificativa e autor.
            </p>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>ID do Registro de Emergencia</Label>
                    <Input
                      value={reclassifyRecordId}
                      onChange={(e) => setReclassifyRecordId(e.target.value)}
                      placeholder="UUID do registro"
                      className="bg-zinc-950 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>ID do Autor (Profissional)</Label>
                    <Input
                      value={reclassifyForm.authorId}
                      onChange={(e) => setReclassifyForm((f) => ({ ...f, authorId: e.target.value }))}
                      placeholder="UUID do profissional"
                      className="bg-zinc-950 border-zinc-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Novo Nivel Manchester</Label>
                    <Select
                      value={reclassifyForm.newManchesterLevel}
                      onValueChange={(v) => setReclassifyForm((f) => ({ ...f, newManchesterLevel: v as 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' }))}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RED"><span className="text-red-400">Emergencia (Vermelho)</span></SelectItem>
                        <SelectItem value="ORANGE"><span className="text-orange-400">Muito Urgente (Laranja)</span></SelectItem>
                        <SelectItem value="YELLOW"><span className="text-yellow-400">Urgente (Amarelo)</span></SelectItem>
                        <SelectItem value="GREEN"><span className="text-green-400">Pouco Urgente (Verde)</span></SelectItem>
                        <SelectItem value="BLUE"><span className="text-blue-400">Nao Urgente (Azul)</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Queixa Principal (opcional)</Label>
                    <Input
                      value={reclassifyForm.chiefComplaint}
                      onChange={(e) => setReclassifyForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
                      placeholder="Atualizar queixa..."
                      className="bg-zinc-950 border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Justificativa (obrigatoria)</Label>
                  <Textarea
                    value={reclassifyForm.justification}
                    onChange={(e) => setReclassifyForm((f) => ({ ...f, justification: e.target.value }))}
                    placeholder="Motivo da reclassificacao..."
                    className="bg-zinc-950 border-zinc-700"
                    rows={3}
                  />
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
            {/* Manchester Level Reference */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3 text-zinc-300">Referencia de Niveis Manchester</p>
                <div className="space-y-2">
                  {Object.entries(TRIAGE_CONFIG).map(([key, cfg]) => (
                    <div key={key} className={cn('flex items-center gap-3 p-2 rounded-md', cfg.bg)}>
                      <div className={cn('w-3 h-3 rounded-full', cfg.bg.replace('/20', ''))} />
                      <span className={cn('font-medium text-sm', cfg.color)}>{cfg.label}</span>
                      <span className="text-xs text-zinc-400 ml-auto">{key}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fast Track Tab */}
        <TabsContent value="fasttrack">
          <div className="space-y-6 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              Protocolo Fast Track para pacientes de baixa complexidade (Verde/Azul). Avaliacao automatica de elegibilidade com encaminhamento ao fluxo rapido.
            </p>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <Label>ID do Registro de Emergencia</Label>
                  <Input
                    value={fastTrackRecordId}
                    onChange={(e) => setFastTrackRecordId(e.target.value)}
                    placeholder="UUID do registro de emergencia"
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    if (!fastTrackRecordId) { toast.error('Informe o ID do registro.'); return; }
                    assignFastTrack.mutate(fastTrackRecordId, {
                      onSuccess: (data) => {
                        setFastTrackResult(data);
                        toast[data.eligible ? 'success' : 'warning'](data.message);
                      },
                      onError: () => toast.error('Erro ao avaliar Fast Track'),
                    });
                  }}
                  disabled={assignFastTrack.isPending || !fastTrackRecordId}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {assignFastTrack.isPending ? 'Avaliando...' : 'Avaliar Elegibilidade Fast Track'}
                </Button>
              </CardContent>
            </Card>
            {fastTrackResult && (
              <Card className={fastTrackResult.eligible ? 'bg-emerald-950/30 border-emerald-700/50' : 'bg-yellow-950/30 border-yellow-700/50'}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {fastTrackResult.eligible ? <Zap className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                    <span className={cn('font-semibold', fastTrackResult.eligible ? 'text-emerald-300' : 'text-yellow-300')}>
                      {fastTrackResult.eligible ? 'ELEGIVEL para Fast Track' : 'NAO ELEGIVEL para Fast Track'}
                    </span>
                  </div>
                  <p className="text-sm">{fastTrackResult.message}</p>
                  {fastTrackResult.assignedArea && (
                    <p className="text-sm text-muted-foreground">Area atribuida: <span className="text-white font-medium">{fastTrackResult.assignedArea}</span></p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3 text-zinc-300">Criterios de Elegibilidade Fast Track</p>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-emerald-400" /> Classificacao Verde ou Azul no Manchester</li>
                  <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-emerald-400" /> Sem sinais de instabilidade hemodinamica</li>
                  <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-emerald-400" /> Queixa unica e de baixa complexidade</li>
                  <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-emerald-400" /> Sem necessidade de exames laboratoriais complexos</li>
                  <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-emerald-400" /> Tempo estimado de atendimento &lt; 60 minutos</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NEDOCS Tab */}
        <TabsContent value="nedocs">
          <div className="space-y-6 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              National Emergency Department Overcrowding Score — avalia superlotacao do PS com recomendacoes de acao.
            </p>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Leitos do PS (total)</Label>
                    <Input type="number" value={nedocsForm.totalEdBeds} onChange={(e) => setNedocsForm((f) => ({ ...f, totalEdBeds: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="30" />
                  </div>
                  <div className="space-y-1">
                    <Label>Pacientes no PS (atual)</Label>
                    <Input type="number" value={nedocsForm.totalEdPatients} onChange={(e) => setNedocsForm((f) => ({ ...f, totalEdPatients: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="25" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Ventiladores em uso</Label>
                    <Input type="number" value={nedocsForm.ventilatorsInUse} onChange={(e) => setNedocsForm((f) => ({ ...f, ventilatorsInUse: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="3" />
                  </div>
                  <div className="space-y-1">
                    <Label>Internados aguardando leito</Label>
                    <Input type="number" value={nedocsForm.admittedWaitingBed} onChange={(e) => setNedocsForm((f) => ({ ...f, admittedWaitingBed: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="5" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Maior espera (horas)</Label>
                    <Input type="number" value={nedocsForm.longestWaitHours} onChange={(e) => setNedocsForm((f) => ({ ...f, longestWaitHours: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="4" />
                  </div>
                  <div className="space-y-1">
                    <Label>Leitos hospital (total)</Label>
                    <Input type="number" value={nedocsForm.totalHospitalBeds} onChange={(e) => setNedocsForm((f) => ({ ...f, totalHospitalBeds: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="200" />
                  </div>
                  <div className="space-y-1">
                    <Label>Admissoes na ultima hora</Label>
                    <Input type="number" value={nedocsForm.admissionsLastHour} onChange={(e) => setNedocsForm((f) => ({ ...f, admissionsLastHour: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="2" />
                  </div>
                </div>
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handleNedocs}
                  disabled={calculateNedocs.isPending || !nedocsForm.totalEdBeds || !nedocsForm.totalEdPatients || !nedocsForm.totalHospitalBeds}
                >
                  {calculateNedocs.isPending ? 'Calculando...' : 'Calcular NEDOCS'}
                </Button>
              </CardContent>
            </Card>
            {nedocsResult && (
              <Card className={cn('border', {
                'bg-emerald-950/30 border-emerald-700/50': nedocsResult.level === 'NOT_BUSY',
                'bg-yellow-950/30 border-yellow-700/50': nedocsResult.level === 'BUSY',
                'bg-orange-950/30 border-orange-700/50': nedocsResult.level === 'EXTREMELY_BUSY',
                'bg-red-950/30 border-red-700/50': nedocsResult.level === 'OVERCROWDED',
              })}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className={cn('h-6 w-6', {
                        'text-emerald-400': nedocsResult.level === 'NOT_BUSY',
                        'text-yellow-400': nedocsResult.level === 'BUSY',
                        'text-orange-400': nedocsResult.level === 'EXTREMELY_BUSY',
                        'text-red-400': nedocsResult.level === 'OVERCROWDED',
                      })} />
                      <div>
                        <p className="text-sm font-medium text-zinc-300">Score NEDOCS</p>
                        <p className="text-3xl font-bold">{nedocsResult.nedocsScore}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-sm px-3 py-1', {
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/50': nedocsResult.level === 'NOT_BUSY',
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/50': nedocsResult.level === 'BUSY',
                      'bg-orange-500/20 text-orange-400 border-orange-500/50': nedocsResult.level === 'EXTREMELY_BUSY',
                      'bg-red-500/20 text-red-400 border-red-500/50': nedocsResult.level === 'OVERCROWDED',
                    })}>
                      {nedocsResult.level.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{nedocsResult.recommendation}</p>
                </CardContent>
              </Card>
            )}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3 text-zinc-300">Escala NEDOCS</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-md bg-emerald-500/10">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-400 font-medium">0-20: Not Busy</span>
                    <span className="text-xs text-zinc-400 ml-auto">Normal</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-md bg-yellow-500/10">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-yellow-400 font-medium">21-60: Busy</span>
                    <span className="text-xs text-zinc-400 ml-auto">Ocupado</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-md bg-orange-500/10">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-sm text-orange-400 font-medium">61-100: Extremely Busy</span>
                    <span className="text-xs text-zinc-400 ml-auto">Muito Lotado</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-md bg-red-500/10">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-red-400 font-medium">101+: Overcrowded</span>
                    <span className="text-xs text-zinc-400 ml-auto">Superlotado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Protocol Activation Dialog */}
      <Dialog open={protocolDialog} onOpenChange={setProtocolDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProtocol && (
                <>
                  <AlertTriangle className={cn('h-5 w-5', selectedProtocol.color)} />
                  Ativar {selectedProtocol.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Confirme a ativacao do protocolo de emergencia. Esta acao notificara toda a equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Paciente (ID)</Label>
              <Input
                value={protocolPatientId}
                onChange={(e) => setProtocolPatientId(e.target.value)}
                placeholder="ID do paciente"
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Atendimento (ID)</Label>
              <Input
                value={protocolEncounterId}
                onChange={(e) => setProtocolEncounterId(e.target.value)}
                placeholder="ID do atendimento"
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={protocolNotes}
                onChange={(e) => setProtocolNotes(e.target.value)}
                placeholder="Informacoes adicionais..."
                className="bg-zinc-950 border-zinc-700"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProtocolDialog(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button
              onClick={handleActivateProtocol}
              disabled={!protocolPatientId || activateProtocol.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {activateProtocol.isPending ? 'Ativando...' : 'Ativar Protocolo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
