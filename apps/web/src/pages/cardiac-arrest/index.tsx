import { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Zap,
  Syringe,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useRecordCardiacArrest,
  type CardiacArrestPayload,
} from '@/services/emergency-board.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

// ─── CPR Stopwatch ────────────────────────────────────────────────────────────

function CprStopwatch({ running }: { running: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const minutes = Math.floor(elapsed / 60);
  const criticalColor =
    elapsed >= 600 ? 'text-red-400' : elapsed >= 300 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="text-center">
      <p className={`text-5xl font-mono font-bold ${criticalColor}`}>{formatElapsed(elapsed)}</p>
      <p className="text-xs text-zinc-500 mt-1">
        {minutes < 5
          ? 'Janela ideal para ROSC'
          : minutes < 10
          ? 'Considerar causas reversíveis (4H4T)'
          : 'Avaliar decisão de encerramento'}
      </p>
    </div>
  );
}

// ─── CPR Cycle Log ────────────────────────────────────────────────────────────

interface CprCycle {
  cycleNumber: number;
  startTime: string;
  rhythm: string;
  shockDelivered: boolean;
  joules?: number;
  drugs: string[];
  pulseCheck: 'no-pulse' | 'rosc' | 'pending';
}

function CprCycleCard({ cycle }: { cycle: CprCycle }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <Badge className="bg-zinc-700 text-zinc-300 border-zinc-600">
            Ciclo {cycle.cycleNumber}
          </Badge>
          <span className="text-xs text-zinc-500">{cycle.startTime}</span>
          {cycle.pulseCheck === 'rosc' && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              ROSC
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
          <div>
            <span>Ritmo: </span>
            <span className="text-white">{cycle.rhythm}</span>
          </div>
          {cycle.shockDelivered && (
            <div>
              <span>Choque: </span>
              <span className="text-yellow-400">{cycle.joules ?? '—'} J</span>
            </div>
          )}
          {cycle.drugs.length > 0 && (
            <div className="col-span-2">
              <span>Drogas: </span>
              <span className="text-purple-300">{cycle.drugs.join(', ')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CardiacArrestPage() {
  const recordArrest = useRecordCardiacArrest();

  // Protocol state
  const [codeActive, setCodeActive] = useState(false);
  const [codeStartTime] = useState(new Date().toISOString());
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [location, setLocation] = useState('');
  const [witnessedBy, setWitnessedBy] =
    useState<CardiacArrestPayload['witnessedBy']>('HEALTHCARE_PROVIDER');
  const [initialRhythm, setInitialRhythm] = useState('');
  const [arrivalRhythm, setArrivalRhythm] = useState('');
  const [bystanterCprPerformed, setBystanterCprPerformed] = useState(false);
  const [aedUsed, setAedUsed] = useState(false);
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [notes, setNotes] = useState('');

  // CPR cycles
  const [cycles, setCycles] = useState<CprCycle[]>([]);
  const [currentRhythm, setCurrentRhythm] = useState('FV');
  const [shockDelivered, setShockDelivered] = useState(false);
  const [joules, setJoules] = useState('200');
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [_roscAchieved, setRoscAchieved] = useState(false);
  const [_roscTime, setRoscTime] = useState('');

  const [result, setResult] = useState<{ rosc: boolean; roscTime: string | null } | null>(null);

  const toggleDrug = (drug: string) => {
    setSelectedDrugs((prev) =>
      prev.includes(drug) ? prev.filter((d) => d !== drug) : [...prev, drug],
    );
  };

  const addCycle = (pulseCheck: CprCycle['pulseCheck']) => {
    const newCycle: CprCycle = {
      cycleNumber: cycles.length + 1,
      startTime: new Date().toLocaleTimeString('pt-BR'),
      rhythm: currentRhythm,
      shockDelivered,
      joules: shockDelivered ? parseFloat(joules) : undefined,
      drugs: [...selectedDrugs],
      pulseCheck,
    };
    setCycles((prev) => [...prev, newCycle]);
    setShockDelivered(false);
    setSelectedDrugs([]);
    if (pulseCheck === 'rosc') {
      setRoscAchieved(true);
      setRoscTime(new Date().toISOString());
      setCodeActive(false);
      toast.success('ROSC alcançado! Registre o protocolo completo.');
    } else {
      toast.info(`Ciclo ${newCycle.cycleNumber} registrado — sem pulso.`);
    }
  };

  const handleActivateCode = () => {
    if (!patientId || !location || !initialRhythm) {
      toast.error('Informe paciente, local e ritmo inicial para ativar o Code Blue.');
      return;
    }
    setCodeActive(true);
    toast.error('Code Blue ativado!', { duration: 5000 });
  };

  const handleFinalize = () => {
    if (!patientId || !location || !initialRhythm || !arrivalRhythm || !teamLeaderId) {
      toast.error('Preencha todos os campos obrigatórios antes de finalizar.');
      return;
    }

    const payload: CardiacArrestPayload = {
      patientId,
      encounterId: encounterId || undefined,
      location,
      witnessedBy,
      initialRhythm,
      bystanterCprPerformed,
      aedUsed,
      arrivalRhythm,
      downtime: codeStartTime,
      teamLeaderId,
      notes: notes || undefined,
    };

    recordArrest.mutate(payload, {
      onSuccess: (data) => {
        toast.success('Protocolo de PCR registrado com sucesso.');
        setResult({ rosc: data.rosc ?? false, roscTime: data.roscTime });
        setCodeActive(false);
      },
      onError: () => toast.error('Erro ao registrar protocolo de PCR.'),
    });
  };

  const RHYTHMS = ['FV', 'TVSP', 'AESP', 'Assistolia', 'RS', 'BAV Total', 'FV Fina'];
  const DRUGS = [
    'Epinefrina 1mg',
    'Amiodarona 300mg',
    'Amiodarona 150mg',
    'Bicarbonato 50mL',
    'Cálcio 1g',
    'Sulfato Mg 2g',
    'Atropina 1mg',
    'Vasopressina 40U',
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart className="h-7 w-7 text-red-400" />
            Code Blue — Parada Cardiorrespiratória
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Protocolo PCR: ritmo inicial, ciclos de RCP, drogas, desfibrilações e ROSC
          </p>
        </div>
        <div className="flex items-center gap-3">
          {codeActive && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse">
              CODE BLUE ATIVO
            </Badge>
          )}
          {result && (
            <Badge
              className={
                result.rosc
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-700 text-zinc-300 border-zinc-600'
              }
            >
              {result.rosc
                ? `ROSC — ${result.roscTime ? formatDate(result.roscTime) : '—'}`
                : 'Sem ROSC'}
            </Badge>
          )}
        </div>
      </div>

      {/* Stopwatch + Quick Actions */}
      {codeActive && (
        <Card className="bg-red-950/30 border-red-500/40">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Timer className="h-8 w-8 text-red-400 shrink-0" />
                <CprStopwatch running={codeActive} />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => setShockDelivered(!shockDelivered)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  {shockDelivered ? `Choque: ${joules}J` : 'Marcar Choque'}
                </Button>
                {shockDelivered && (
                  <Input
                    type="number"
                    value={joules}
                    onChange={(e) => setJoules(e.target.value)}
                    className="w-24 bg-zinc-950 border-zinc-700 h-9"
                    placeholder="Joules"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — Patient Info */}
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Dados da PCR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>ID do Paciente</Label>
                  <Input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label>ID Atendimento</Label>
                  <Input
                    value={encounterId}
                    onChange={(e) => setEncounterId(e.target.value)}
                    className="bg-zinc-950 border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Local da PCR</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uti">UTI</SelectItem>
                    <SelectItem value="utin">UTI Neonatal</SelectItem>
                    <SelectItem value="pa">Pronto-Atendimento</SelectItem>
                    <SelectItem value="enfermaria">Enfermaria</SelectItem>
                    <SelectItem value="cc">Centro Cirúrgico</SelectItem>
                    <SelectItem value="corredor">Corredor</SelectItem>
                    <SelectItem value="externo">Fora do hospital</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Testemunhado por</Label>
                <Select value={witnessedBy} onValueChange={(v) => setWitnessedBy(v as CardiacArrestPayload['witnessedBy'])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HEALTHCARE_PROVIDER">Profissional de saúde</SelectItem>
                    <SelectItem value="LAYPERSON">Leigo</SelectItem>
                    <SelectItem value="UNWITNESSED">Não testemunhada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Ritmo Inicial</Label>
                  <Select value={initialRhythm} onValueChange={setInitialRhythm}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                      <SelectValue placeholder="Ritmo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RHYTHMS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ritmo na Chegada</Label>
                  <Select value={arrivalRhythm} onValueChange={setArrivalRhythm}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                      <SelectValue placeholder="Ritmo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RHYTHMS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBystanterCprPerformed(!bystanterCprPerformed)}
                    className={`border-zinc-700 text-xs ${bystanterCprPerformed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-zinc-400'}`}
                  >
                    RCP por Leigo
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAedUsed(!aedUsed)}
                    className={`border-zinc-700 text-xs ${aedUsed ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'text-zinc-400'}`}
                  >
                    DEA Utilizado
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Médico Líder (ID)</Label>
                <Input
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  placeholder="ID do médico responsável"
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Causas reversíveis investigadas, decisões clínicas..."
                  className="bg-zinc-950 border-zinc-700 min-h-16 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Activate / Finalize Buttons */}
          <div className="flex gap-3">
            {!codeActive && !result && (
              <Button
                onClick={handleActivateCode}
                className="flex-1 bg-red-600 hover:bg-red-700 font-semibold"
              >
                <Heart className="h-4 w-4 mr-2" />
                Ativar Code Blue
              </Button>
            )}
            <Button
              onClick={handleFinalize}
              disabled={recordArrest.isPending}
              variant={codeActive ? 'default' : 'outline'}
              className={`flex-1 ${codeActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-700 text-zinc-300'}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {recordArrest.isPending ? 'Registrando...' : 'Finalizar e Registrar PCR'}
            </Button>
          </div>
        </div>

        {/* Right — CPR Cycles */}
        <div className="space-y-4">
          {/* Cycle Recorder */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                Registrar Ciclo de RCP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Ritmo Atual</Label>
                <div className="flex flex-wrap gap-2">
                  {RHYTHMS.map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentRhythm(r)}
                      className={`border-zinc-700 text-xs ${currentRhythm === r ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-zinc-400'}`}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Drogas Administradas</Label>
                <div className="flex flex-wrap gap-2">
                  {DRUGS.map((drug) => (
                    <Button
                      key={drug}
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDrug(drug)}
                      className={`border-zinc-700 text-xs ${selectedDrugs.includes(drug) ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'text-zinc-400'}`}
                    >
                      <Syringe className="h-3 w-3 mr-1" />
                      {drug}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => addCycle('no-pulse')}
                  disabled={!codeActive}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Sem Pulso
                </Button>
                <Button
                  onClick={() => addCycle('rosc')}
                  disabled={!codeActive}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  ROSC!
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4H4T Checklist */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Causas Reversíveis — 4H 4T
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Hipóxia', type: '4H' },
                  { label: 'Hipo/Hipercalemia', type: '4H' },
                  { label: 'Hipotermia', type: '4H' },
                  { label: 'Hipovolemia', type: '4H' },
                  { label: 'Tamponamento', type: '4T' },
                  { label: 'Tromboembolismo', type: '4T' },
                  { label: 'Tensão pneumotórax', type: '4T' },
                  { label: 'Tóxicos', type: '4T' },
                ].map(({ label, type }) => (
                  <div key={label} className="flex items-center gap-2 text-zinc-400">
                    <Badge
                      className={
                        type === '4H'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs'
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs'
                      }
                    >
                      {type}
                    </Badge>
                    <span className="text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cycle Log */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">
              Ciclos Registrados ({cycles.length})
            </h3>
            {cycles.length === 0 ? (
              <p className="text-xs text-zinc-600">Nenhum ciclo registrado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...cycles].reverse().map((c) => (
                  <CprCycleCard key={c.cycleNumber} cycle={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
