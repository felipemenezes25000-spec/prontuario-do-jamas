import { useState } from 'react';
import {
  AlertTriangle,
  Activity,
  Eye,
  Zap,
  Clock,
  Plus,
  User,
  Stethoscope,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useRecordTraumaProtocol,
  type TraumaProtocolPayload,
} from '@/services/emergency-board.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function levelColor(level: 'I' | 'II' | 'III') {
  if (level === 'I') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (level === 'II') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
}

// ─── ABCDE Checklist ─────────────────────────────────────────────────────────

interface AbcdeState {
  airwayPatent: boolean;
  airwayInterventions: string;
  breathingAdequate: boolean;
  breathingInterventions: string;
  circulationAdequate: boolean;
  circulationInterventions: string;
  disabilityGCS: string;
  disabilityPupils: string;
  exposureFindings: string;
}

function AbcdeTab({
  state,
  onChange,
}: {
  state: AbcdeState;
  onChange: (s: AbcdeState) => void;
}) {
  const set = (field: keyof AbcdeState, value: string | boolean) =>
    onChange({ ...state, [field]: value });

  const sections = [
    {
      letter: 'A',
      label: 'Airway — Via Aérea',
      color: 'text-red-400',
      checks: [{ field: 'airwayPatent' as const, label: 'Via aérea pérvea' }],
      interventions: { field: 'airwayInterventions' as const, placeholder: 'Cânula de Guedel, IOT, cricotireoidostomia...' },
    },
    {
      letter: 'B',
      label: 'Breathing — Ventilação',
      color: 'text-orange-400',
      checks: [{ field: 'breathingAdequate' as const, label: 'Ventilação adequada (SpO₂ ≥ 94%)' }],
      interventions: { field: 'breathingInterventions' as const, placeholder: 'O₂ máscara, intubação, descompressão...' },
    },
    {
      letter: 'C',
      label: 'Circulation — Circulação',
      color: 'text-yellow-400',
      checks: [{ field: 'circulationAdequate' as const, label: 'Circulação controlada (sem hemorragia ativa)' }],
      interventions: { field: 'circulationInterventions' as const, placeholder: 'Torniquete, compressão, acesso venoso, transfusão...' },
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <Card key={s.letter} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className={`text-2xl font-bold ${s.color}`}>{s.letter}</span>
              <span className="text-white">{s.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.checks.map((c) => (
              <div key={c.field} className="flex items-center gap-2">
                <Checkbox
                  id={c.field}
                  checked={state[c.field] as boolean}
                  onCheckedChange={(v) => set(c.field, !!v)}
                  className="border-zinc-600"
                />
                <Label htmlFor={c.field} className="cursor-pointer">
                  {c.label}
                </Label>
              </div>
            ))}
            <div className="space-y-1">
              <Label>Intervenções realizadas</Label>
              <Textarea
                value={state[s.interventions.field] as string}
                onChange={(e) => set(s.interventions.field, e.target.value)}
                placeholder={s.interventions.placeholder}
                className="bg-zinc-950 border-zinc-700 min-h-16 resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* D — Disability */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="text-2xl font-bold text-purple-400">D</span>
            <span className="text-white">Disability — Neurológico</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Glasgow (3-15)</Label>
            <Input
              type="number"
              min={3}
              max={15}
              value={state.disabilityGCS}
              onChange={(e) => set('disabilityGCS', e.target.value)}
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>Pupilas</Label>
            <Select value={state.disabilityPupils} onValueChange={(v) => set('disabilityPupils', v)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isocoric-reactive">Isocóricas e Fotorreativas</SelectItem>
                <SelectItem value="anisocoric">Anisocóricas</SelectItem>
                <SelectItem value="midriatic-fixed">Midriáticas Fixas</SelectItem>
                <SelectItem value="miotic">Mióticas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* E — Exposure */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="text-2xl font-bold text-cyan-400">E</span>
            <span className="text-white">Exposure — Exposição</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label>Achados (lesões visíveis, hipotermia, etc.)</Label>
            <Textarea
              value={state.exposureFindings}
              onChange={(e) => set('exposureFindings', e.target.value)}
              placeholder="Descreva as lesões encontradas no exame completo..."
              className="bg-zinc-950 border-zinc-700 min-h-20 resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── FAST Exam Tab ────────────────────────────────────────────────────────────

interface FastState {
  hepatorenal: 'positive' | 'negative' | 'indeterminate' | '';
  splenorenal: 'positive' | 'negative' | 'indeterminate' | '';
  pericardial: 'positive' | 'negative' | 'indeterminate' | '';
  suprapubic: 'positive' | 'negative' | 'indeterminate' | '';
  pneumothoraxRight: 'positive' | 'negative' | 'indeterminate' | '';
  pneumothoraxLeft: 'positive' | 'negative' | 'indeterminate' | '';
  notes: string;
}

const FAST_VIEWS = [
  { field: 'hepatorenal' as const, label: 'Hepatorrenal (Morrison)', icon: Eye },
  { field: 'splenorenal' as const, label: 'Espleno-renal (Koller)', icon: Eye },
  { field: 'pericardial' as const, label: 'Pericárdico (subxifoide)', icon: Eye },
  { field: 'suprapubic' as const, label: 'Suprapúbico (Douglas)', icon: Eye },
  { field: 'pneumothoraxRight' as const, label: 'Pneumotórax — Direito (eFAST)', icon: Activity },
  { field: 'pneumothoraxLeft' as const, label: 'Pneumotórax — Esquerdo (eFAST)', icon: Activity },
];

function FastTab({ state, onChange }: { state: FastState; onChange: (s: FastState) => void }) {
  const set = (field: keyof FastState, value: string) => onChange({ ...state, [field]: value });
  const resultColor = (v: string) => {
    if (v === 'positive') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (v === 'negative') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  };

  const positives = FAST_VIEWS.filter((v) => state[v.field] === 'positive').length;

  return (
    <div className="space-y-4">
      {positives > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-medium">
            FAST Positivo — {positives} janela(s) com líquido livre / pneumotórax detectado.
            Considerar ativação cirúrgica imediata.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {FAST_VIEWS.map(({ field, label, icon: Icon }) => (
          <Card key={field} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-zinc-400" />
                <p className="text-sm text-white font-medium">{label}</p>
              </div>
              <div className="flex gap-2">
                {(['negative', 'positive', 'indeterminate'] as const).map((opt) => (
                  <Button
                    key={opt}
                    size="sm"
                    variant="outline"
                    onClick={() => set(field, opt)}
                    className={`flex-1 text-xs border-zinc-700 ${state[field] === opt ? resultColor(opt) : 'text-zinc-400'}`}
                  >
                    {opt === 'negative' ? 'Negativo' : opt === 'positive' ? 'Positivo' : 'Indet.'}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-1">
        <Label>Notas do exame FAST/eFAST</Label>
        <Textarea
          value={state.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Observações sobre a qualidade da janela, limitações técnicas..."
          className="bg-zinc-950 border-zinc-700 min-h-20 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Scores Tab ───────────────────────────────────────────────────────────────

function ScoresTab({ vitalSigns }: { vitalSigns: TraumaProtocolPayload['vitalSigns'] | null }) {
  // RTS: Revised Trauma Score
  const rtsGcs = (gcs: number) => (gcs >= 13 ? 4 : gcs >= 9 ? 3 : gcs >= 6 ? 2 : gcs >= 4 ? 1 : 0);
  const rtsSbp = (sbp: number) => (sbp >= 90 ? 4 : sbp >= 76 ? 3 : sbp >= 50 ? 2 : sbp > 0 ? 1 : 0);
  const rtsRr = (rr: number) => (rr >= 10 && rr <= 29 ? 4 : rr >= 6 ? 3 : rr >= 1 ? 2 : rr > 29 ? 1 : 0);

  const vs = vitalSigns;
  const rts = vs
    ? (0.9368 * rtsGcs(vs.gcs) + 0.7326 * rtsSbp(vs.sbp) + 0.2908 * rtsRr(vs.rr)).toFixed(2)
    : null;

  const shockIndex = vs ? (vs.hr / (vs.sbp || 1)).toFixed(2) : null;

  return (
    <div className="space-y-4">
      {!vs ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center text-zinc-500">
            Registre um protocolo de trauma com sinais vitais para calcular os escores.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">RTS — Revised Trauma Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-400">{rts}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Máx: 7.84 — Sobrevida esperada proporcional ao score
              </p>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Glasgow ({vs.gcs})</span>
                  <span className="text-white">{rtsGcs(vs.gcs)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PAS ({vs.sbp} mmHg)</span>
                  <span className="text-white">{rtsSbp(vs.sbp)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FR ({vs.rr} ipm)</span>
                  <span className="text-white">{rtsRr(vs.rr)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Índice de Choque</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-3xl font-bold ${
                  parseFloat(shockIndex ?? '0') >= 1.0
                    ? 'text-red-400'
                    : parseFloat(shockIndex ?? '0') >= 0.8
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
                }`}
              >
                {shockIndex}
              </p>
              <p className="text-xs text-zinc-500 mt-1">FC / PAS — Normal: 0.5–0.7</p>
              <div className="mt-3 text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>FC</span>
                  <span className="text-white">{vs.hr} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span>PAS</span>
                  <span className="text-white">{vs.sbp} mmHg</span>
                </div>
                <div className="flex justify-between">
                  <span>SpO₂</span>
                  <span className="text-white">{vs.spo2}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Avaliação Neurológica</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-3xl font-bold ${
                  vs.gcs <= 8 ? 'text-red-400' : vs.gcs <= 12 ? 'text-yellow-400' : 'text-emerald-400'
                }`}
              >
                {vs.gcs}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Escala de Coma de Glasgow</p>
              <div className="mt-3 text-xs">
                <Badge
                  className={
                    vs.gcs <= 8
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : vs.gcs <= 12
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }
                >
                  {vs.gcs <= 8 ? 'TCE Grave' : vs.gcs <= 12 ? 'TCE Moderado' : 'TCE Leve / Normal'}
                </Badge>
                {vs.gcs <= 8 && (
                  <p className="text-red-400 mt-2 font-medium">
                    GCS ≤ 8: Considerar intubação de sequência rápida
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const initialAbcde: AbcdeState = {
  airwayPatent: false,
  airwayInterventions: '',
  breathingAdequate: false,
  breathingInterventions: '',
  circulationAdequate: false,
  circulationInterventions: '',
  disabilityGCS: '',
  disabilityPupils: '',
  exposureFindings: '',
};

const initialFast: FastState = {
  hepatorenal: '',
  splenorenal: '',
  pericardial: '',
  suprapubic: '',
  pneumothoraxRight: '',
  pneumothoraxLeft: '',
  notes: '',
};

export default function TraumaProtocolPage() {
  const record = useRecordTraumaProtocol();

  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [traumaType, setTraumaType] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [activationLevel, setActivationLevel] = useState<'I' | 'II' | 'III'>('II');
  const [teamActivated, setTeamActivated] = useState(false);
  const [vitalSigns, setVitalSigns] = useState({
    sbp: '',
    hr: '',
    rr: '',
    gcs: '',
    spo2: '',
    temperature: '',
  });
  const [injuries, setInjuries] = useState<string[]>([]);
  const [injuryInput, setInjuryInput] = useState('');
  const [notes, setNotes] = useState('');

  const [abcde, setAbcde] = useState<AbcdeState>(initialAbcde);
  const [fast, setFast] = useState<FastState>(initialFast);

  const [lastRecord, setLastRecord] =
    useState<{ activationLevel: 'I' | 'II' | 'III'; activatedAt: string } | null>(null);

  const parsedVitals = {
    sbp: parseFloat(vitalSigns.sbp) || 0,
    hr: parseFloat(vitalSigns.hr) || 0,
    rr: parseFloat(vitalSigns.rr) || 0,
    gcs: parseFloat(vitalSigns.gcs) || 0,
    spo2: parseFloat(vitalSigns.spo2) || 0,
    temperature: parseFloat(vitalSigns.temperature) || undefined,
  };

  const addInjury = () => {
    if (!injuryInput.trim()) return;
    setInjuries((prev) => [...prev, injuryInput.trim()]);
    setInjuryInput('');
  };

  const handleActivate = () => {
    if (!patientId || !encounterId || !traumaType || !mechanism) {
      toast.error('Preencha paciente, atendimento, tipo e mecanismo do trauma.');
      return;
    }
    if (!vitalSigns.sbp || !vitalSigns.hr || !vitalSigns.rr || !vitalSigns.gcs || !vitalSigns.spo2) {
      toast.error('Preencha todos os sinais vitais.');
      return;
    }

    const payload: TraumaProtocolPayload = {
      patientId,
      encounterId,
      traumaType,
      mechanism,
      vitalSigns: parsedVitals,
      injuries,
      teamActivated,
      activationLevel,
      notes: notes || undefined,
    };

    record.mutate(payload, {
      onSuccess: (data) => {
        toast.success(`Protocolo Trauma Nível ${activationLevel} ativado.`);
        setLastRecord({ activationLevel: data.activationLevel, activatedAt: data.activatedAt });
      },
      onError: () => toast.error('Erro ao registrar protocolo de trauma.'),
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-orange-400" />
            Protocolo de Trauma — ATLS
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Avaliação primária ABCDE, FAST/eFAST e escores ISS/RTS/TRISS
          </p>
        </div>
        {lastRecord && (
          <Badge className={levelColor(lastRecord.activationLevel)}>
            Nível {lastRecord.activationLevel} ativado — {formatDate(lastRecord.activatedAt)}
          </Badge>
        )}
      </div>

      {/* Patient + Activation */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-400" />
            Identificação e Ativação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>ID do Paciente</Label>
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="ID do paciente"
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>ID do Atendimento</Label>
            <Input
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              placeholder="ID do atendimento"
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo de Trauma</Label>
            <Select value={traumaType} onValueChange={setTraumaType}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blunt">Contuso (fechado)</SelectItem>
                <SelectItem value="penetrating">Penetrante</SelectItem>
                <SelectItem value="burn">Queimadura</SelectItem>
                <SelectItem value="blast">Explosão (blast)</SelectItem>
                <SelectItem value="drowning">Afogamento</SelectItem>
                <SelectItem value="mixed">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Mecanismo</Label>
            <Input
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value)}
              placeholder="ex: Capotamento, queda de moto, FAB..."
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>Nível de Ativação</Label>
            <Select value={activationLevel} onValueChange={(v) => setActivationLevel(v as 'I' | 'II' | 'III')}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="I">Nível I — Maior (risco de vida)</SelectItem>
                <SelectItem value="II">Nível II — Moderado</SelectItem>
                <SelectItem value="III">Nível III — Menor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTeamActivated(!teamActivated)}
              className={`flex-1 border-zinc-700 ${teamActivated ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-zinc-400'}`}
            >
              <Zap className="h-4 w-4 mr-2" />
              {teamActivated ? 'Equipe Ativada' : 'Ativar Equipe'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vital Signs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Sinais Vitais Iniciais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {(
            [
              { label: 'PAS (mmHg)', field: 'sbp' },
              { label: 'FC (bpm)', field: 'hr' },
              { label: 'FR (ipm)', field: 'rr' },
              { label: 'GCS (3-15)', field: 'gcs' },
              { label: 'SpO₂ (%)', field: 'spo2' },
              { label: 'Temp (°C)', field: 'temperature' },
            ] as { label: string; field: keyof typeof vitalSigns }[]
          ).map(({ label, field }) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                value={vitalSigns[field]}
                onChange={(e) =>
                  setVitalSigns((v) => ({ ...v, [field]: e.target.value }))
                }
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Injuries */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-400" />
            Lesões Identificadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={injuryInput}
              onChange={(e) => setInjuryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInjury()}
              placeholder="Descreva a lesão e pressione Enter..."
              className="bg-zinc-950 border-zinc-700 flex-1"
            />
            <Button
              onClick={addInjury}
              variant="outline"
              className="border-zinc-700 text-zinc-300"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {injuries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {injuries.map((inj, i) => (
                <Badge
                  key={i}
                  className="bg-orange-500/20 text-orange-300 border-orange-500/30 cursor-pointer"
                  onClick={() => setInjuries((prev) => prev.filter((_, j) => j !== i))}
                >
                  {inj} ×
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Tabs */}
      <Tabs defaultValue="abcde">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="abcde">Avaliação ABCDE</TabsTrigger>
          <TabsTrigger value="fast">FAST / eFAST</TabsTrigger>
          <TabsTrigger value="scores">Escores (RTS/ISS)</TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-1" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="abcde" className="mt-4">
          <AbcdeTab state={abcde} onChange={setAbcde} />
        </TabsContent>

        <TabsContent value="fast" className="mt-4">
          <FastTab state={fast} onChange={setFast} />
        </TabsContent>

        <TabsContent value="scores" className="mt-4">
          <ScoresTab
            vitalSigns={
              vitalSigns.sbp
                ? {
                    sbp: parseFloat(vitalSigns.sbp),
                    hr: parseFloat(vitalSigns.hr),
                    rr: parseFloat(vitalSigns.rr),
                    gcs: parseFloat(vitalSigns.gcs),
                    spo2: parseFloat(vitalSigns.spo2),
                    temperature: vitalSigns.temperature ? parseFloat(vitalSigns.temperature) : undefined,
                  }
                : null
            }
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">Chegada ao PS</p>
                  <p className="text-xs text-zinc-500">{formatDate(new Date().toISOString())}</p>
                </div>
              </div>
              {teamActivated && (
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-orange-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Equipe de Trauma Ativada</p>
                    <p className="text-xs text-zinc-500">Nível {activationLevel}</p>
                  </div>
                </div>
              )}
              {lastRecord && (
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Protocolo Registrado</p>
                    <p className="text-xs text-zinc-500">{formatDate(lastRecord.activatedAt)}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-600 pl-6">
                Meta porta-médico: &lt; 10 min | Porta-exames: &lt; 20 min
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes + Activate */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1">
            <Label>Observações Gerais</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto clínico adicional, decisões de equipe..."
              className="bg-zinc-950 border-zinc-700 min-h-20 resize-none"
            />
          </div>
          <Button
            onClick={handleActivate}
            disabled={record.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {record.isPending ? 'Registrando...' : `Registrar Protocolo Trauma — Nível ${activationLevel}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
