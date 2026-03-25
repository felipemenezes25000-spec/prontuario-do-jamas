import { useState } from 'react';
import {
  Heart,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Timer,
  Activity,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useChestPainActiveCases,
  useChestPainChecklist,
  useActivateChestPainProtocol,
  useCompleteChestPainChecklistItem,
} from '@/services/chest-pain.service';
import type { ChestPainCase, TimiCalculation } from '@/services/chest-pain.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ChestPainCase['status'], { label: string; className: string }> = {
  ACTIVATED: { label: 'Ativado', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  ECG_PENDING: { label: 'ECG Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  TROPONIN_PENDING: { label: 'Troponina Pendente', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  CATH_LAB: { label: 'Hemodinâmica', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  PCI: { label: 'ICP', className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  COMPLETED: { label: 'Concluído', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  CANCELLED: { label: 'Cancelado', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

const KILLIP_LABELS: Record<number, string> = {
  1: 'I — Sem ICC', 2: 'II — Estertores / B3', 3: 'III — Edema Pulmonar', 4: 'IV — Choque Cardiogênico',
};

const KILLIP_COLORS: Record<number, string> = {
  1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-orange-400', 4: 'text-red-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  ECG: 'ECG', TROPONIN: 'Troponina', MEDICATION: 'Medicação', HEMODYNAMIC: 'Hemodinâmica', CATH_LAB: 'Hemodinâmica — Cath Lab',
};

function getDTBColor(mins: number | null): string {
  if (mins === null) return 'text-zinc-400';
  if (mins <= 90) return 'text-green-400';
  if (mins <= 120) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Activate Dialog ─────────────────────────────────────────────────────────

function ActivateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activate = useActivateChestPainProtocol();
  const [patientId, setPatientId] = useState('');
  const [killipClass, setKillipClass] = useState<string>('1');
  const [timi, setTimi] = useState<Omit<TimiCalculation, 'totalScore' | 'riskLevel'>>({
    age65: false, aspirin7d: false, knownCoronary: false, stDeviation: false,
    angina24h: false, elevatedMarkers: false, riskFactors3: false,
  });

  const timiScore = Object.values(timi).filter(Boolean).length;
  const timiRisk = timiScore <= 2 ? 'Baixo' : timiScore <= 4 ? 'Intermediário' : 'Alto';
  const timiRiskColor = timiScore <= 2 ? 'text-green-400' : timiScore <= 4 ? 'text-yellow-400' : 'text-red-400';

  const handleSubmit = () => {
    if (!patientId) { toast.error('Informe o ID do paciente.'); return; }
    activate.mutate({ patientId, killipClass: Number(killipClass), timiData: timi }, {
      onSuccess: () => {
        toast.success('Protocolo Dor Torácica ativado! Equipe notificada.');
        onClose();
        setPatientId('');
      },
      onError: () => toast.error('Erro ao ativar protocolo.'),
    });
  };

  const TimiCheck = ({ field, label }: { field: keyof typeof timi; label: string }) => (
    <button onClick={() => setTimi({ ...timi, [field]: !timi[field] })} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800 w-full text-left transition-colors">
      {timi[field] ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-zinc-500 shrink-0" />}
      <span className={cn('text-sm', timi[field] && 'text-emerald-300')}>{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Heart className="h-5 w-5" /> Ativar Protocolo Dor Torácica
          </DialogTitle>
          <DialogDescription>Avaliação KILLIP e escore TIMI</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>ID do Paciente *</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="ID do paciente" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Classe KILLIP</Label>
            <Select value={killipClass} onValueChange={setKillipClass}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {[1, 2, 3, 4].map((k) => (
                  <SelectItem key={k} value={String(k)}>{KILLIP_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-zinc-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-400">Escore TIMI</p>
              <span className={cn('font-bold', timiRiskColor)}>{timiScore}/7 — {timiRisk}</span>
            </div>
            <TimiCheck field="age65" label="Idade ≥ 65 anos" />
            <TimiCheck field="aspirin7d" label="Uso de AAS nos últimos 7 dias" />
            <TimiCheck field="knownCoronary" label="Coronariopatia conhecida (estenose ≥ 50%)" />
            <TimiCheck field="stDeviation" label="Desvio ST ≥ 0,5 mm no ECG" />
            <TimiCheck field="angina24h" label="≥ 2 episódios de angina nas últimas 24h" />
            <TimiCheck field="elevatedMarkers" label="Marcadores de necrose elevados" />
            <TimiCheck field="riskFactors3" label="≥ 3 fatores de risco cardiovascular" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={activate.isPending} className="bg-red-600 hover:bg-red-700">
            {activate.isPending ? 'Ativando...' : 'Ativar Protocolo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Checklist Panel ─────────────────────────────────────────────────────────

function CaseChecklistPanel({ caseId }: { caseId: string }) {
  const { data: items = [] } = useChestPainChecklist(caseId);
  const completeItem = useCompleteChestPainChecklistItem();

  const byCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item];
    return acc;
  }, {});

  const total = items.length;
  const done = items.filter((i) => i.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Progresso geral</p>
        <span className="text-sm font-bold">{done}/{total} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-700">
        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className="rounded-lg border border-zinc-700 p-3">
          <p className="text-xs font-medium text-red-300 mb-2">{CATEGORY_LABELS[cat] ?? cat}</p>
          <div className="space-y-1">
            {catItems.map((item) => (
              <button key={item.id} disabled={item.completed} onClick={() =>
                completeItem.mutate({ caseId, itemId: item.id }, {
                  onSuccess: () => toast.success('Item concluído!'),
                  onError: () => toast.error('Erro ao concluir item.'),
                })}
                className="flex items-start gap-3 w-full text-left p-1.5 rounded hover:bg-zinc-800 transition-colors disabled:cursor-default"
              >
                {item.completed
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <Circle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />}
                <p className={cn('text-sm', item.completed && 'line-through text-zinc-500')}>{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Case Card ───────────────────────────────────────────────────────────────

function CaseCard({ c }: { c: ChestPainCase }) {
  const [showChecklist, setShowChecklist] = useState(false);
  const cfg = STATUS_CONFIG[c.status];
  const dtbColor = getDTBColor(c.doorToBalloonMinutes);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{c.patientName}</p>
            <p className="text-sm text-zinc-400">{c.mrn} · {c.bed ?? '—'}</p>
          </div>
          <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">KILLIP</p>
            <p className={cn('font-bold', KILLIP_COLORS[c.killipClass])}>Classe {c.killipClass}</p>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">TIMI</p>
            <p className={cn('font-bold', c.timiScore >= 5 ? 'text-red-400' : c.timiScore >= 3 ? 'text-yellow-400' : 'text-green-400')}>{c.timiScore}/7</p>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">Porta-Balão</p>
            <p className={cn('font-bold', dtbColor)}>{c.doorToBalloonMinutes !== null ? `${c.doorToBalloonMinutes}min` : '—'}</p>
          </div>
        </div>
        {c.diagnosis && (
          <p className="text-sm text-zinc-400">Diagnóstico: <span className="text-zinc-200">{c.diagnosis}</span></p>
        )}
        <Button size="sm" variant="outline" className="w-full border-zinc-700" onClick={() => setShowChecklist(!showChecklist)}>
          {showChecklist ? 'Ocultar Checklist' : 'Ver Checklist do Protocolo'}
        </Button>
        {showChecklist && <CaseChecklistPanel caseId={c.id} />}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChestPainPage() {
  const [activateDialog, setActivateDialog] = useState(false);
  const { data: cases = [], isLoading } = useChestPainActiveCases();

  const avgDTB = cases.filter((c) => c.doorToBalloonMinutes !== null).reduce((sum, c, _, arr) =>
    sum + (c.doorToBalloonMinutes! / arr.length), 0);

  const criticalKillip = cases.filter((c) => c.killipClass >= 3).length;

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
          <Heart className="h-7 w-7 text-red-400" />
          <h1 className="text-2xl font-bold">Protocolo Dor Torácica</h1>
          <Badge variant="outline" className="text-red-400 border-red-500/50">Tempo real</Badge>
        </div>
        <Button onClick={() => setActivateDialog(true)} className="bg-red-600 hover:bg-red-700">
          <Zap className="h-4 w-4 mr-2" /> Ativar Protocolo
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-red-400" />
            <div><p className="text-xs text-zinc-400">Casos Ativos</p><p className="text-2xl font-bold">{cases.length}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Timer className="h-5 w-5 text-yellow-400" />
            <div><p className="text-xs text-zinc-400">Porta-Balão Médio</p><p className="text-2xl font-bold">{avgDTB > 0 ? `${Math.round(avgDTB)}min` : '—'}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <div><p className="text-xs text-zinc-400">KILLIP III–IV</p><p className="text-2xl font-bold text-orange-400">{criticalKillip}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="h-5 w-5 text-blue-400" />
            <div><p className="text-xs text-zinc-400">Em Hemodinâmica</p><p className="text-2xl font-bold">{cases.filter((c) => c.status === 'CATH_LAB' || c.status === 'PCI').length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="active">Casos Ativos</TabsTrigger>
          <TabsTrigger value="protocol">Protocolo</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
        </TabsList>

        {/* Casos Ativos */}
        <TabsContent value="active" className="mt-4">
          {cases.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-10 text-center text-zinc-500">Nenhum caso de dor torácica ativo</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cases.map((c) => <CaseCard key={c.id} c={c} />)}
            </div>
          )}
        </TabsContent>

        {/* Protocolo */}
        <TabsContent value="protocol" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Fluxo do Protocolo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: '1', label: 'Triagem e ECG em ≤ 10 minutos', color: 'bg-red-500' },
                  { step: '2', label: 'Avaliação médica e troponina', color: 'bg-orange-500' },
                  { step: '3', label: 'Classificação KILLIP e TIMI', color: 'bg-yellow-500' },
                  { step: '4', label: 'Decisão terapêutica (ICP vs. trombolítico)', color: 'bg-blue-500' },
                  { step: '5', label: 'Ativação hemodinâmica se IAM com SST', color: 'bg-purple-500' },
                  { step: '6', label: 'Porta-balão ≤ 90 minutos (meta)', color: 'bg-emerald-500' },
                ].map(({ step, label, color }) => (
                  <div key={step} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', color)}>{step}</div>
                    <p className="text-sm text-zinc-300">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Tempos-Meta (AHA/ACC)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Porta-ECG', target: '≤ 10 min', icon: Clock },
                  { label: 'Porta-Troponina', target: '≤ 20 min', icon: Clock },
                  { label: 'Porta-Balão (ICP primária)', target: '≤ 90 min', icon: Timer },
                  { label: 'Porta-Agulha (fibrinólise)', target: '≤ 30 min', icon: Timer },
                  { label: 'Ativação Lab. Hem.', target: '≤ 20 min', icon: Zap },
                ].map(({ label, target, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-zinc-300">{label}</span>
                    </div>
                    <Badge variant="outline" className="bg-red-500/10 text-red-300 border-red-500/30">{target}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scores */}
        <TabsContent value="scores" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Classificação KILLIP</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { class: 'I', desc: 'Sem ICC. Sem sinais de descompensação.', mort: '~6%', color: 'text-green-400' },
                  { class: 'II', desc: 'ICC leve. Estertores, B3, hipertensão venosa.', mort: '~17%', color: 'text-yellow-400' },
                  { class: 'III', desc: 'ICC grave. Edema pulmonar.', mort: '~38%', color: 'text-orange-400' },
                  { class: 'IV', desc: 'Choque cardiogênico.', mort: '~81%', color: 'text-red-400' },
                ].map(({ class: cls, desc, mort, color }) => (
                  <div key={cls} className="p-3 rounded-lg bg-zinc-800 flex justify-between items-start">
                    <div>
                      <p className={cn('font-bold', color)}>Classe {cls}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 ml-2', color.replace('text-', 'border-').replace('-400', '-500/50'), 'bg-zinc-700')}>
                      Mort. {mort}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Escore TIMI para IAMSSST</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-700 hover:bg-transparent">
                      <TableHead>Pontuação</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Evento 14d</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { score: '0–2', risk: 'Baixo', event: '5%', color: 'text-green-400' },
                      { score: '3–4', risk: 'Intermediário', event: '13%', color: 'text-yellow-400' },
                      { score: '5–7', risk: 'Alto', event: '26%', color: 'text-red-400' },
                    ].map(({ score, risk, event, color }) => (
                      <TableRow key={score} className="border-zinc-700 hover:bg-zinc-800/50">
                        <TableCell>{score}</TableCell>
                        <TableCell className={color}>{risk}</TableCell>
                        <TableCell className="text-zinc-400">{event}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 space-y-2">
                  {[
                    'Idade ≥ 65 anos (+1)', 'AAS nos últimos 7 dias (+1)', 'Coronariopatia conhecida ≥50% (+1)',
                    'Desvio ST ≥ 0,5 mm (+1)', 'Angina nas últimas 24h ≥ 2 episódios (+1)',
                    'Marcadores de necrose elevados (+1)', '≥ 3 fatores de risco CV (+1)',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ActivateDialog open={activateDialog} onClose={() => setActivateDialog(false)} />
    </div>
  );
}
