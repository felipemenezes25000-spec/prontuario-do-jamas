import { useState } from 'react';
import {
  Activity,
  Brain,
  Users,
  ClipboardList,
  Zap,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usePainScales,
  useRecordPain,
  useEliminations,
  useRecordElimination,
  useWounds,
  useRegisterWound,
  useCatheterBundles,
  useAssessFugulin,
  useCalculateStaffing,
  useAiFallRiskPrediction,
  useAiWoundPrediction,
  type PainRecord,
  type WoundRecord,
  type CatheterBundle,
} from '@/services/nursing-enhanced.service';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEMO_PATIENT_ID = 'demo-patient-1';
const DEMO_ENCOUNTER_ID = 'demo-encounter-1';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = score / max;
  const cls =
    pct >= 0.7
      ? 'bg-red-500/20 text-red-400 border-red-500/50'
      : pct >= 0.4
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
  return (
    <Badge variant="outline" className={cls}>
      {score}/{max}
    </Badge>
  );
}

// ─── Tab: Dor ────────────────────────────────────────────────────────────────

function PainTab() {
  const { data: records, isLoading } = usePainScales(DEMO_PATIENT_ID);
  const { mutate: recordPain, isPending } = useRecordPain();
  const [scale, setScale] = useState('EVA');
  const [score, setScore] = useState('');
  const [location, setLocation] = useState('');

  function handleSubmit() {
    const s = parseInt(score, 10);
    if (isNaN(s) || s < 0 || s > 10) {
      toast.error('Pontuação inválida (0–10)');
      return;
    }
    recordPain(
      { patientId: DEMO_PATIENT_ID, scaleType: scale, score: s, location },
      {
        onSuccess: () => {
          toast.success('Avaliação de dor registrada');
          setScore('');
          setLocation('');
        },
        onError: () => toast.error('Erro ao registrar dor'),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Nova Avaliação de Dor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Escala</Label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-gray-700">
                  <SelectItem value="EVA">EVA (0–10)</SelectItem>
                  <SelectItem value="FLACC">FLACC (comportamental)</SelectItem>
                  <SelectItem value="BPS">BPS (sedados)</SelectItem>
                  <SelectItem value="NRS">NRS Numérica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Pontuação</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="bg-[#0a0a0f] border-gray-700 text-white"
                placeholder="0–10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Localização</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-[#0a0a0f] border-gray-700 text-white"
                placeholder="Ex: lombar, torácica"
              />
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !score}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Histórico de Dor</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : !records?.length ? (
            <p className="text-gray-500 text-sm">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r: PainRecord) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] px-4 py-2"
                >
                  <div className="space-y-0.5">
                    <p className="text-white text-sm font-medium">{r.scaleType}</p>
                    <p className="text-gray-500 text-xs">
                      {r.location ?? '—'} · {formatDate(r.assessedAt)}
                    </p>
                  </div>
                  <ScoreBadge score={r.score} max={10} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Eliminações ────────────────────────────────────────────────────────

function EliminationsTab() {
  const { data: records, isLoading } = useEliminations(DEMO_PATIENT_ID);
  const { mutate: record, isPending } = useRecordElimination();
  const [type, setType] = useState('URINE');
  const [volume, setVolume] = useState('');
  const [bristol, setBristol] = useState('');

  function handleSubmit() {
    record(
      {
        patientId: DEMO_PATIENT_ID,
        type,
        volume: volume ? parseInt(volume, 10) : undefined,
        bristolScale: bristol ? parseInt(bristol, 10) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Eliminação registrada');
          setVolume('');
          setBristol('');
        },
        onError: () => toast.error('Erro ao registrar eliminação'),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Registrar Eliminação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-gray-700">
                  <SelectItem value="URINE">Diurese</SelectItem>
                  <SelectItem value="FECES">Fezes</SelectItem>
                  <SelectItem value="VOMIT">Vômito</SelectItem>
                  <SelectItem value="DRAIN">Dreno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Volume (mL)</Label>
              <Input
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="bg-[#0a0a0f] border-gray-700 text-white"
                placeholder="mL"
              />
            </div>
            {type === 'FECES' && (
              <div className="space-y-1">
                <Label className="text-gray-400 text-xs">Escala Bristol (1–7)</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={bristol}
                  onChange={(e) => setBristol(e.target.value)}
                  className="bg-[#0a0a0f] border-gray-700 text-white"
                  placeholder="1–7"
                />
              </div>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Histórico de Eliminações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : !Array.isArray(records) || !records.length ? (
            <p className="text-gray-500 text-sm">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-2">
              {(records as Array<Record<string, unknown>>).map((r, i) => (
                <div
                  key={String(r['id'] ?? i)}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] px-4 py-2"
                >
                  <p className="text-white text-sm">{String(r['type'] ?? '—')}</p>
                  <p className="text-gray-400 text-xs">
                    {r['volume'] != null ? `${String(r['volume'])} mL` : ''}
                    {r['bristolScale'] != null ? ` · Bristol ${String(r['bristolScale'])}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Admissão ────────────────────────────────────────────────────────────

const ADMISSION_ITEMS = [
  'Identificação do paciente conferida',
  'Pulseira de identificação colocada',
  'Alergias investigadas e registradas',
  'Medicamentos de uso domiciliar listados',
  'Sinais vitais aferidos',
  'Peso e altura registrados',
  'Orientações de admissão realizadas',
  'Familiar/acompanhante identificado',
  'Termo de consentimento assinado',
  'Avaliação de risco de queda (Morse)',
  'Avaliação de lesão por pressão (Braden)',
  'Acesso venoso periférico verificado',
];

function AdmissionTab() {
  const qc = useQueryClient();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  const { mutate: createChecklist, isPending } = useMutation({
    mutationFn: async (dto: { patientId: string; encounterId: string; items: Record<string, boolean>; notes: string }) => {
      const { data } = await api.post('/nursing-enhanced/admission-checklist', dto);
      return data;
    },
    onSuccess: () => {
      toast.success('Checklist de admissão salvo');
      qc.invalidateQueries({ queryKey: ['nursing-enhanced'] });
    },
    onError: () => toast.error('Erro ao salvar checklist'),
  });

  function toggle(item: string) {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-emerald-400" />
              Checklist de Admissão
            </span>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
              {completedCount}/{ADMISSION_ITEMS.length} itens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ADMISSION_ITEMS.map((item) => (
            <label
              key={item}
              className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-800 bg-[#0a0a0f] px-4 py-2 hover:border-gray-600 transition-colors"
            >
              <input
                type="checkbox"
                checked={!!checked[item]}
                onChange={() => toggle(item)}
                className="accent-emerald-500 h-4 w-4"
              />
              <span className={`text-sm ${checked[item] ? 'text-emerald-400 line-through' : 'text-gray-300'}`}>
                {item}
              </span>
              {checked[item] && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />}
            </label>
          ))}

          <div className="space-y-1 pt-2">
            <Label className="text-gray-400 text-xs">Observações</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Observações adicionais..."
            />
          </div>

          <Button
            onClick={() =>
              createChecklist({
                patientId: DEMO_PATIENT_ID,
                encounterId: DEMO_ENCOUNTER_ID,
                items: checked,
                notes,
              })
            }
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Salvar Checklist
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Análise de Feridas ─────────────────────────────────────────────────

function WoundAnalysisTab() {
  const { data: wounds, isLoading } = useWounds(DEMO_PATIENT_ID);
  const { mutate: registerWound, isPending } = useRegisterWound();
  const [woundLocation, setWoundLocation] = useState('');
  const [classification, setClassification] = useState('PRESSURE_INJURY');
  const [stage, setStage] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');

  function handleSubmit() {
    if (!woundLocation) {
      toast.error('Informe a localização da ferida');
      return;
    }
    registerWound(
      {
        patientId: DEMO_PATIENT_ID,
        location: woundLocation,
        classification,
        stage: stage || undefined,
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Ferida registrada com sucesso');
          setWoundLocation('');
          setStage('');
          setLength('');
          setWidth('');
        },
        onError: () => toast.error('Erro ao registrar ferida'),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Registro de Ferida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Localização</Label>
              <Input
                value={woundLocation}
                onChange={(e) => setWoundLocation(e.target.value)}
                className="bg-[#0a0a0f] border-gray-700 text-white"
                placeholder="Ex: sacral, calcâneo D"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Classificação</Label>
              <Select value={classification} onValueChange={setClassification}>
                <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-gray-700">
                  <SelectItem value="PRESSURE_INJURY">Lesão por Pressão</SelectItem>
                  <SelectItem value="SURGICAL">Ferida Cirúrgica</SelectItem>
                  <SelectItem value="TRAUMATIC">Ferida Traumática</SelectItem>
                  <SelectItem value="DIABETIC_ULCER">Úlcera Diabética</SelectItem>
                  <SelectItem value="VENOUS_ULCER">Úlcera Venosa</SelectItem>
                  <SelectItem value="BURN">Queimadura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Estágio</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-gray-700">
                  <SelectItem value="I">Estágio I</SelectItem>
                  <SelectItem value="II">Estágio II</SelectItem>
                  <SelectItem value="III">Estágio III</SelectItem>
                  <SelectItem value="IV">Estágio IV</SelectItem>
                  <SelectItem value="UNSTAGEABLE">Não classificável</SelectItem>
                  <SelectItem value="DTPI">DTPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-gray-400 text-xs">Comprimento (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="bg-[#0a0a0f] border-gray-700 text-white"
                  placeholder="cm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-400 text-xs">Largura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="bg-[#0a0a0f] border-gray-700 text-white"
                  placeholder="cm"
                />
              </div>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !woundLocation}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Registrar Ferida
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Feridas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : !wounds?.length ? (
            <p className="text-gray-500 text-sm">Nenhuma ferida registrada.</p>
          ) : (
            <div className="space-y-3">
              {wounds.map((w: WoundRecord) => (
                <div
                  key={w.id}
                  className="rounded-lg border border-gray-800 bg-[#0a0a0f] px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {w.classification} — {w.location}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {w.stage ? `Estágio ${w.stage} · ` : ''}
                        {w.length != null && w.width != null
                          ? `${w.length} x ${w.width} cm · `
                          : ''}
                        {w.area != null ? `Área: ${w.area} cm² · ` : ''}
                        {formatDate(w.assessedAt)}
                      </p>
                    </div>
                    {w.author && (
                      <span className="text-gray-500 text-xs">{w.author.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Plano de Cuidados ──────────────────────────────────────────────────

function CarePlanTab() {
  const qc = useQueryClient();
  const [diagnosis, setDiagnosis] = useState('');
  const [outcome, setOutcome] = useState('');
  const [interventions, setInterventions] = useState('');

  const { mutate: createCarePlan, isPending } = useMutation({
    mutationFn: async (dto: {
      patientId: string;
      encounterId: string;
      nursingDiagnosis: string;
      expectedOutcome: string;
      interventions: string[];
    }) => {
      const { data } = await api.post('/nursing-enhanced/care-plan', dto);
      return data;
    },
    onSuccess: () => {
      toast.success('Plano de cuidados criado');
      qc.invalidateQueries({ queryKey: ['nursing-enhanced'] });
      setDiagnosis('');
      setOutcome('');
      setInterventions('');
    },
    onError: () => toast.error('Erro ao criar plano de cuidados'),
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['nursing-enhanced', 'care-plans', DEMO_PATIENT_ID],
    queryFn: async () => {
      const { data } = await api.get(`/nursing-enhanced/care-plan/${DEMO_PATIENT_ID}`);
      return data as Array<Record<string, unknown>>;
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-400" />
            Novo Plano de Cuidados (SAE/NANDA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-400 text-xs">Diagnóstico de Enfermagem (NANDA)</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="bg-[#0a0a0f] border-gray-700 text-white"
              placeholder="Ex: Risco de queda relacionado a fraqueza muscular"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-400 text-xs">Resultado Esperado (NOC)</Label>
            <Input
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="bg-[#0a0a0f] border-gray-700 text-white"
              placeholder="Ex: Paciente sem quedas durante internação"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-400 text-xs">Intervenções (NIC) — uma por linha</Label>
            <textarea
              value={interventions}
              onChange={(e) => setInterventions(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Manter grades elevadas&#10;Orientar paciente sobre risco&#10;Instalar campainha ao alcance"
            />
          </div>
          <Button
            onClick={() =>
              createCarePlan({
                patientId: DEMO_PATIENT_ID,
                encounterId: DEMO_ENCOUNTER_ID,
                nursingDiagnosis: diagnosis,
                expectedOutcome: outcome,
                interventions: interventions.split('\n').filter(Boolean),
              })
            }
            disabled={isPending || !diagnosis}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Criar Plano
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Planos Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : !plans?.length ? (
            <p className="text-gray-500 text-sm">Nenhum plano ativo.</p>
          ) : (
            <div className="space-y-2">
              {plans.map((p, i) => (
                <div key={String(p['id'] ?? i)} className="rounded-lg border border-gray-800 bg-[#0a0a0f] px-4 py-3">
                  <p className="text-white text-sm font-medium">{String(p['nursingDiagnosis'] ?? '—')}</p>
                  <p className="text-gray-400 text-xs mt-1">{String(p['expectedOutcome'] ?? '')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Fugulin ────────────────────────────────────────────────────────────

const FUGULIN_FIELDS = [
  { key: 'mentalState', label: 'Estado Mental', max: 4 },
  { key: 'oxygenation', label: 'Oxigenação', max: 4 },
  { key: 'vitals', label: 'Sinais Vitais', max: 4 },
  { key: 'nutrition', label: 'Nutrição/Hidratação', max: 4 },
  { key: 'motility', label: 'Motilidade', max: 4 },
  { key: 'locomotion', label: 'Locomoção', max: 4 },
  { key: 'elimination', label: 'Eliminações', max: 4 },
  { key: 'skinIntegrity', label: 'Integridade Cutânea', max: 4 },
];

function FugulinTab() {
  const { mutate: assess, isPending, data: result } = useAssessFugulin();
  const [scores, setScores] = useState<Record<string, string>>({});

  function handleSubmit() {
    const dto: Record<string, unknown> = { patientId: DEMO_PATIENT_ID };
    for (const f of FUGULIN_FIELDS) {
      dto[f.key] = parseInt(scores[f.key] ?? '1', 10);
    }
    assess(dto, {
      onSuccess: () => toast.success('Classificação Fugulin registrada'),
      onError: () => toast.error('Erro ao calcular Fugulin'),
    });
  }

  const resultData = result as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            Índice de Fugulin — Classificação do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FUGULIN_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-gray-400 text-xs">{f.label} (1–{f.max})</Label>
                <Select
                  value={scores[f.key] ?? '1'}
                  onValueChange={(v) => setScores((prev) => ({ ...prev, [f.key]: v }))}
                >
                  <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12121a] border-gray-700">
                    {Array.from({ length: f.max }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Calcular Fugulin
          </Button>

          {resultData && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <p className="text-emerald-400 font-semibold">
                Classificação: {String(resultData['classification'] ?? '—')}
              </p>
              <p className="text-gray-300 text-sm">
                Pontuação Total: {String(resultData['totalScore'] ?? '—')}
              </p>
              {resultData['category'] != null && (
                <p className="text-gray-400 text-xs">{String(resultData['category']) as React.ReactNode}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Dimensionamento ────────────────────────────────────────────────────

function StaffingTab() {
  const { mutate: calculate, isPending, data: result } = useCalculateStaffing();
  const [form, setForm] = useState({
    totalMinimal: '',
    totalIntermediate: '',
    totalSemiIntensive: '',
    totalIntensive: '',
  });

  const staffingResult = result as import('@/services/nursing-enhanced.service').StaffingResult | undefined;

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            Dimensionamento COFEN 543/2017
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'totalMinimal', label: 'Cuidados Mínimos' },
              { key: 'totalIntermediate', label: 'Cuidados Intermediários' },
              { key: 'totalSemiIntensive', label: 'Semi-Intensivo' },
              { key: 'totalIntensive', label: 'Intensivo/UTI' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-gray-400 text-xs">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="bg-[#0a0a0f] border-gray-700 text-white"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <Button
            onClick={() =>
              calculate(
                {
                  totalMinimal: parseInt(form.totalMinimal || '0', 10),
                  totalIntermediate: parseInt(form.totalIntermediate || '0', 10),
                  totalSemiIntensive: parseInt(form.totalSemiIntensive || '0', 10),
                  totalIntensive: parseInt(form.totalIntensive || '0', 10),
                },
                {
                  onSuccess: () => toast.success('Dimensionamento calculado'),
                  onError: () => toast.error('Erro ao calcular dimensionamento'),
                },
              )
            }
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Calcular Dimensionamento
          </Button>

          {staffingResult && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{staffingResult.totalProfessionals}</p>
                <p className="text-gray-400 text-xs">Profissionais totais</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 text-center">
                <p className="text-2xl font-bold text-white">{staffingResult.totalHoursNeeded}h</p>
                <p className="text-gray-400 text-xs">Horas necessárias</p>
              </div>
              <div className="col-span-2 rounded-lg border border-gray-800 bg-[#0a0a0f] p-3">
                <p className="text-gray-400 text-xs mb-2">Distribuição por turno</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-white">Manhã: <strong className="text-emerald-400">{staffingResult.perShift.morning}</strong></span>
                  <span className="text-white">Tarde: <strong className="text-emerald-400">{staffingResult.perShift.afternoon}</strong></span>
                  <span className="text-white">Noite: <strong className="text-emerald-400">{staffingResult.perShift.night}</strong></span>
                </div>
              </div>
              <div className="col-span-2 text-xs text-gray-500">Referência: {staffingResult.reference}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Bundles ────────────────────────────────────────────────────────────

function BundlesTab() {
  const { data: bundles, isLoading } = useCatheterBundles(DEMO_PATIENT_ID);
  const qc = useQueryClient();

  const { mutate: createBundle, isPending } = useMutation({
    mutationFn: async (dto: { patientId: string; catheterType: string; insertionDate: string }) => {
      const { data } = await api.post('/nursing-enhanced/catheter-bundle', dto);
      return data;
    },
    onSuccess: () => {
      toast.success('Bundle de cateter registrado');
      qc.invalidateQueries({ queryKey: ['nursing-enhanced', 'catheters', DEMO_PATIENT_ID] });
    },
    onError: () => toast.error('Erro ao registrar bundle'),
  });

  const [catheterType, setCatheterType] = useState('CVC');
  const [insertionDate, setInsertionDate] = useState('');

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Novo Bundle de Cateter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Tipo de Cateter</Label>
              <Select value={catheterType} onValueChange={setCatheterType}>
                <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-gray-700">
                  <SelectItem value="CVC">CVC — Cateter Venoso Central</SelectItem>
                  <SelectItem value="SVD">SVD — Sonda Vesical de Demora</SelectItem>
                  <SelectItem value="PAM">PAM — Pressão Arterial Média</SelectItem>
                  <SelectItem value="PICC">PICC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Data de Inserção</Label>
              <Input
                type="date"
                value={insertionDate}
                onChange={(e) => setInsertionDate(e.target.value)}
                className="bg-[#0a0a0f] border-gray-700 text-white"
              />
            </div>
          </div>
          <Button
            onClick={() =>
              createBundle({ patientId: DEMO_PATIENT_ID, catheterType, insertionDate })
            }
            disabled={isPending || !insertionDate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Registrar Bundle
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Bundles Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : !bundles?.length ? (
            <p className="text-gray-500 text-sm">Nenhum bundle ativo.</p>
          ) : (
            <div className="space-y-3">
              {bundles.map((b: CatheterBundle) => (
                <div
                  key={b.id}
                  className={`rounded-lg border bg-[#0a0a0f] px-4 py-3 ${
                    b.isOverdue ? 'border-red-500/50' : 'border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{b.catheterType}</p>
                      <p className="text-gray-400 text-xs">
                        Inserção: {formatDate(b.insertionDate)} · {b.dwellDays} dias
                      </p>
                    </div>
                    {b.isOverdue && (
                      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Vencido
                      </Badge>
                    )}
                  </div>
                  {b.alertMessage && (
                    <p className="text-yellow-400 text-xs mt-2">{b.alertMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: IA Queda ────────────────────────────────────────────────────────────

function AiFallRiskTab() {
  const { data: prediction, isLoading, refetch } = useAiFallRiskPrediction(DEMO_PATIENT_ID);

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-400" />
              Predição IA — Risco de Queda
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Analisando com IA...</p>
          ) : !prediction ? (
            <p className="text-gray-500 text-sm">Sem predição disponível.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-2">
                  <p className="text-2xl font-bold text-emerald-400">{prediction.riskScore}%</p>
                </div>
                <div>
                  <p className="text-white font-medium">{prediction.predictedRisk}</p>
                  <p className="text-gray-400 text-xs">Risco previsto pelo modelo</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-2">Fatores identificados</p>
                <div className="space-y-1">
                  {prediction.factors.map((f) => (
                    <div
                      key={f.factor}
                      className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                        f.present ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-800/50'
                      }`}
                    >
                      <span className={f.present ? 'text-red-300' : 'text-gray-500'}>
                        {f.factor}
                      </span>
                      <Badge
                        variant="outline"
                        className={f.present ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'border-gray-700 text-gray-600'}
                      >
                        peso {f.weight}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-2">Recomendações</p>
                <ul className="space-y-1">
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: IA Ferida ───────────────────────────────────────────────────────────

function AiWoundTab() {
  const { data: prediction, isLoading, refetch } = useAiWoundPrediction(DEMO_PATIENT_ID);

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-400" />
              Predição IA — Deterioração de Feridas
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Analisando com IA...</p>
          ) : !prediction ? (
            <p className="text-gray-500 text-sm">Sem predição disponível.</p>
          ) : (
            <div className="space-y-4">
              {(prediction as Record<string, unknown>)['riskLevel'] != null && (
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-sm px-3 py-1"
                  >
                    {String((prediction as Record<string, unknown>)['riskLevel'])}
                  </Badge>
                  <p className="text-gray-300 text-sm">
                    {String((prediction as Record<string, unknown>)['summary'] ?? 'Análise de deterioração concluída')}
                  </p>
                </div>
              )}

              {Array.isArray((prediction as Record<string, unknown>)['recommendations']) && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Recomendações clínicas</p>
                  <ul className="space-y-1">
                    {((prediction as Record<string, unknown>)['recommendations'] as unknown[]).map(
                      (rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <TrendingUp className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                          {String(rec)}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3">
                <p className="text-gray-400 text-xs">Dados brutos da predição</p>
                <pre className="text-xs text-gray-300 mt-1 overflow-auto max-h-32">
                  {JSON.stringify(prediction, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Escala de Trabalho ──────────────────────────────────────────────────

const SHIFTS = ['Manhã (07h–13h)', 'Tarde (13h–19h)', 'Noite I (19h–01h)', 'Noite II (01h–07h)'];
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DEMO_STAFF = [
  { id: '1', name: 'Enf. Ana Paula', role: 'Enfermeira' },
  { id: '2', name: 'Tec. Carlos Lima', role: 'Técnico' },
  { id: '3', name: 'Enf. Marcia Costa', role: 'Enfermeira' },
  { id: '4', name: 'Tec. João Silva', role: 'Técnico' },
];

function WorkScheduleTab() {
  const [schedule, setSchedule] = useState<Record<string, Record<string, string>>>({});

  function toggleShift(staffId: string, day: string, shift: string) {
    setSchedule((prev) => {
      const staffSchedule = prev[staffId] ?? {};
      const current = staffSchedule[day];
      return {
        ...prev,
        [staffId]: {
          ...staffSchedule,
          [day]: current === shift ? '' : shift,
        },
      };
    });
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            Escala de Trabalho Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 font-normal pb-3 pr-4 min-w-[140px]">
                    Profissional
                  </th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-center text-gray-400 font-normal pb-3 px-2 min-w-[80px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {DEMO_STAFF.map((staff) => (
                  <tr key={staff.id} className="border-t border-gray-800">
                    <td className="py-2 pr-4">
                      <p className="text-white">{staff.name}</p>
                      <p className="text-gray-500 text-xs">{staff.role}</p>
                    </td>
                    {DAYS.map((day) => {
                      const assigned = schedule[staff.id]?.[day] ?? '';
                      return (
                        <td key={day} className="py-2 px-2 text-center">
                          <Select
                            value={assigned}
                            onValueChange={(v) => toggleShift(staff.id, day, v)}
                          >
                            <SelectTrigger className="h-7 text-xs bg-[#0a0a0f] border-gray-700 text-white w-full">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#12121a] border-gray-700">
                              <SelectItem value="">Folga</SelectItem>
                              {SHIFTS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.split(' ')[0]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            onClick={() => toast.success('Escala salva com sucesso')}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Salvar Escala
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: NEWS/MEWS ─────────────────────────────────────────────────────────

const NEWS_PARAMS = [
  { key: 'respRate', label: 'Frequência Respiratória (irpm)', placeholder: 'Ex: 18' },
  { key: 'spo2', label: 'SpO2 (%)', placeholder: 'Ex: 96' },
  { key: 'supO2', label: 'O2 Suplementar?', type: 'select' as const, options: [{ value: '0', label: 'Não' }, { value: '2', label: 'Sim' }] },
  { key: 'temperature', label: 'Temperatura (°C)', placeholder: 'Ex: 37.2' },
  { key: 'systolicBP', label: 'PA Sistólica (mmHg)', placeholder: 'Ex: 120' },
  { key: 'heartRate', label: 'Frequência Cardíaca (bpm)', placeholder: 'Ex: 80' },
  { key: 'consciousness', label: 'Nível de Consciência', type: 'select' as const, options: [{ value: '0', label: 'Alerta' }, { value: '1', label: 'Voz' }, { value: '2', label: 'Dor' }, { value: '3', label: 'Sem resposta' }] },
];

function getNewsScore(params: Record<string, string>): { total: number; details: Array<{ param: string; value: string; score: number }> } {
  const details: Array<{ param: string; value: string; score: number }> = [];

  // Respiratory rate scoring
  const rr = parseFloat(params['respRate'] ?? '0');
  let rrScore = 0;
  if (rr <= 8) rrScore = 3;
  else if (rr <= 11) rrScore = 1;
  else if (rr <= 20) rrScore = 0;
  else if (rr <= 24) rrScore = 2;
  else rrScore = 3;
  details.push({ param: 'Freq. Respiratória', value: `${rr} irpm`, score: rrScore });

  // SpO2 scoring
  const spo2 = parseFloat(params['spo2'] ?? '0');
  let spo2Score = 0;
  if (spo2 <= 91) spo2Score = 3;
  else if (spo2 <= 93) spo2Score = 2;
  else if (spo2 <= 95) spo2Score = 1;
  else spo2Score = 0;
  details.push({ param: 'SpO2', value: `${spo2}%`, score: spo2Score });

  // Supplemental O2
  const supO2 = parseInt(params['supO2'] ?? '0', 10);
  details.push({ param: 'O2 Suplementar', value: supO2 > 0 ? 'Sim' : 'Não', score: supO2 });

  // Temperature scoring
  const temp = parseFloat(params['temperature'] ?? '0');
  let tempScore = 0;
  if (temp <= 35.0) tempScore = 3;
  else if (temp <= 36.0) tempScore = 1;
  else if (temp <= 38.0) tempScore = 0;
  else if (temp <= 39.0) tempScore = 1;
  else tempScore = 2;
  details.push({ param: 'Temperatura', value: `${temp}°C`, score: tempScore });

  // Systolic BP scoring
  const sbp = parseFloat(params['systolicBP'] ?? '0');
  let sbpScore = 0;
  if (sbp <= 90) sbpScore = 3;
  else if (sbp <= 100) sbpScore = 2;
  else if (sbp <= 110) sbpScore = 1;
  else if (sbp <= 219) sbpScore = 0;
  else sbpScore = 3;
  details.push({ param: 'PA Sistólica', value: `${sbp} mmHg`, score: sbpScore });

  // Heart rate scoring
  const hr = parseFloat(params['heartRate'] ?? '0');
  let hrScore = 0;
  if (hr <= 40) hrScore = 3;
  else if (hr <= 50) hrScore = 1;
  else if (hr <= 90) hrScore = 0;
  else if (hr <= 110) hrScore = 1;
  else if (hr <= 130) hrScore = 2;
  else hrScore = 3;
  details.push({ param: 'Freq. Cardíaca', value: `${hr} bpm`, score: hrScore });

  // Consciousness scoring
  const consc = parseInt(params['consciousness'] ?? '0', 10);
  const conscLabels: Record<number, string> = { 0: 'Alerta', 1: 'Voz', 2: 'Dor', 3: 'Sem resposta' };
  details.push({ param: 'Consciência', value: conscLabels[consc] ?? 'Alerta', score: consc === 0 ? 0 : 3 });

  const total = details.reduce((sum, d) => sum + d.score, 0);
  return { total, details };
}

function getNewsRiskLevel(total: number): { level: string; color: string; action: string } {
  if (total >= 7) return { level: 'ALTO', color: 'bg-red-500/20 text-red-400 border-red-500/50', action: 'Acionar equipe de resposta rápida. Monitoramento contínuo.' };
  if (total >= 5) return { level: 'MÉDIO', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', action: 'Notificar médico responsável. Aumentar frequência de avaliação para 1h.' };
  if (total >= 1) return { level: 'BAIXO', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', action: 'Manter avaliação a cada 4–6h.' };
  return { level: 'ZERO', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', action: 'Manter avaliação a cada 12h.' };
}

function EarlyWarningTab() {
  const qc = useQueryClient();
  const [scoreType, setScoreType] = useState<'NEWS' | 'MEWS'>('NEWS');
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ total: number; details: Array<{ param: string; value: string; score: number }> } | null>(null);

  const { mutate: saveScore, isPending } = useMutation({
    mutationFn: async (dto: { patientId: string; scoreType: string; total: number; parameters: Record<string, string> }) => {
      const { data } = await api.post('/nursing-enhanced/early-warning-score', dto);
      return data;
    },
    onSuccess: () => {
      toast.success('Score registrado com sucesso');
      qc.invalidateQueries({ queryKey: ['nursing-enhanced'] });
    },
    onError: () => toast.error('Erro ao registrar score'),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['nursing-enhanced', 'ews', DEMO_PATIENT_ID],
    queryFn: async () => {
      const { data } = await api.get(`/nursing-enhanced/early-warning-score/${DEMO_PATIENT_ID}`);
      return data as Array<Record<string, unknown>>;
    },
  });

  function handleCalculate() {
    const computed = getNewsScore(params);
    setResult(computed);
  }

  function handleSave() {
    if (!result) return;
    saveScore({
      patientId: DEMO_PATIENT_ID,
      scoreType,
      total: result.total,
      parameters: params,
    });
  }

  const risk = result ? getNewsRiskLevel(result.total) : null;

  return (
    <div className="space-y-6">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-emerald-400" />
              Escore de Alerta Precoce
            </span>
            <Select value={scoreType} onValueChange={(v) => { setScoreType(v as 'NEWS' | 'MEWS'); setResult(null); }}>
              <SelectTrigger className="w-32 bg-[#0a0a0f] border-gray-700 text-white text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-gray-700">
                <SelectItem value="NEWS">NEWS</SelectItem>
                <SelectItem value="MEWS">MEWS</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {NEWS_PARAMS.map((p) => (
              <div key={p.key} className="space-y-1">
                <Label className="text-gray-400 text-xs">{p.label}</Label>
                {p.type === 'select' ? (
                  <Select
                    value={params[p.key] ?? (p.options?.[0]?.value ?? '')}
                    onValueChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))}
                  >
                    <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12121a] border-gray-700">
                      {p.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    step="0.1"
                    value={params[p.key] ?? ''}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                    className="bg-[#0a0a0f] border-gray-700 text-white"
                    placeholder={p.placeholder}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCalculate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Calcular {scoreType}
            </Button>
            {result && (
              <Button
                onClick={handleSave}
                disabled={isPending}
                variant="outline"
                className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
              >
                Salvar Score
              </Button>
            )}
          </div>

          {result && risk && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-4">
                <div className={`rounded-full border px-4 py-2 ${risk.color}`}>
                  <p className="text-2xl font-bold">{result.total}</p>
                </div>
                <div>
                  <Badge variant="outline" className={risk.color}>
                    Risco {risk.level}
                  </Badge>
                  <p className="text-gray-400 text-xs mt-1">{risk.action}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-gray-400 text-xs mb-2">Detalhamento por parâmetro</p>
                {result.details.map((d) => (
                  <div
                    key={d.param}
                    className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                      d.score >= 3 ? 'bg-red-500/10 border border-red-500/30' : d.score >= 1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-800/50'
                    }`}
                  >
                    <span className={d.score >= 3 ? 'text-red-300' : d.score >= 1 ? 'text-yellow-300' : 'text-gray-400'}>
                      {d.param}: {d.value}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        d.score >= 3
                          ? 'bg-red-500/20 text-red-400 border-red-500/50'
                          : d.score >= 1
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                            : 'border-gray-700 text-gray-600'
                      }
                    >
                      {d.score}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Histórico de Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : !Array.isArray(history) || !history.length ? (
            <p className="text-gray-500 text-sm">Nenhum score registrado.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => {
                const total = Number(h['total'] ?? 0);
                const hRisk = getNewsRiskLevel(total);
                return (
                  <div
                    key={String(h['id'] ?? i)}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] px-4 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="text-white text-sm font-medium">{String(h['scoreType'] ?? 'NEWS')}</p>
                      <p className="text-gray-500 text-xs">
                        {h['createdAt'] ? formatDate(String(h['createdAt'])) : '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className={hRisk.color}>
                      {total} — {hRisk.level}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NursingEnhancedPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            Enfermagem Avançada
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestão completa de cuidados de enfermagem com IA integrada
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
          <Zap className="h-3 w-3 mr-1" />
          IA Ativa
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pain" className="space-y-6">
        <TabsList className="bg-[#12121a] border border-gray-800 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="pain" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Dor
          </TabsTrigger>
          <TabsTrigger value="eliminations" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Eliminações
          </TabsTrigger>
          <TabsTrigger value="admission" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Admissão
          </TabsTrigger>
          <TabsTrigger value="wounds" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Feridas
          </TabsTrigger>
          <TabsTrigger value="careplan" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Plano Cuidados
          </TabsTrigger>
          <TabsTrigger value="fugulin" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Fugulin
          </TabsTrigger>
          <TabsTrigger value="staffing" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Dimensionamento
          </TabsTrigger>
          <TabsTrigger value="bundles" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Bundles
          </TabsTrigger>
          <TabsTrigger value="ai-fall" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            IA Queda
          </TabsTrigger>
          <TabsTrigger value="ai-wound" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            IA Ferida
          </TabsTrigger>
          <TabsTrigger value="ews" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            NEWS/MEWS
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 text-xs">
            Escala
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pain">
          <PainTab />
        </TabsContent>
        <TabsContent value="eliminations">
          <EliminationsTab />
        </TabsContent>
        <TabsContent value="admission">
          <AdmissionTab />
        </TabsContent>
        <TabsContent value="wounds">
          <WoundAnalysisTab />
        </TabsContent>
        <TabsContent value="careplan">
          <CarePlanTab />
        </TabsContent>
        <TabsContent value="fugulin">
          <FugulinTab />
        </TabsContent>
        <TabsContent value="staffing">
          <StaffingTab />
        </TabsContent>
        <TabsContent value="bundles">
          <BundlesTab />
        </TabsContent>
        <TabsContent value="ai-fall">
          <AiFallRiskTab />
        </TabsContent>
        <TabsContent value="ai-wound">
          <AiWoundTab />
        </TabsContent>
        <TabsContent value="ews">
          <EarlyWarningTab />
        </TabsContent>
        <TabsContent value="schedule">
          <WorkScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
