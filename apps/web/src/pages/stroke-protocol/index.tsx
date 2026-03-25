import { useState } from 'react';
import {
  Brain,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Timer,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useActiveStrokeCodes,
  useNihssAssessments,
  useStrokeChecklist,
  useActivateStrokeCode,
  useCreateNihssAssessment,
  useCompleteChecklistItem,
} from '@/services/stroke-protocol.service';
import type { StrokeCode } from '@/services/stroke-protocol.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StrokeCode['status'], { label: string; className: string }> = {
  ACTIVATED: { label: 'Ativado', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  IMAGING: { label: 'Imagem', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  DECISION: { label: 'Decisão', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  TREATMENT: { label: 'Tratamento', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  POST_TREATMENT: { label: 'Pós-tratamento', className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  COMPLETED: { label: 'Concluído', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  CANCELLED: { label: 'Cancelado', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

const STROKE_TYPE_LABELS: Record<StrokeCode['strokeType'], string> = {
  ISCHEMIC: 'Isquêmico', HEMORRHAGIC: 'Hemorrágico', TIA: 'AIT', UNDETERMINED: 'Indeterminado',
};

const NIHSS_ITEMS = [
  { key: 'consciousness', label: '1a. Nível de consciência', max: 3 },
  { key: 'consciousnessQuestions', label: '1b. Perguntas de consciência', max: 2 },
  { key: 'consciousnessCommands', label: '1c. Comandos de consciência', max: 2 },
  { key: 'bestGaze', label: '2. Melhor olhar conjugado', max: 2 },
  { key: 'visual', label: '3. Campos visuais', max: 3 },
  { key: 'facialPalsy', label: '4. Paralisia facial', max: 3 },
  { key: 'motorArmLeft', label: '5a. Motor braço esquerdo', max: 4 },
  { key: 'motorArmRight', label: '5b. Motor braço direito', max: 4 },
  { key: 'motorLegLeft', label: '6a. Motor perna esquerda', max: 4 },
  { key: 'motorLegRight', label: '6b. Motor perna direita', max: 4 },
  { key: 'limbAtaxia', label: '7. Ataxia de membros', max: 2 },
  { key: 'sensory', label: '8. Sensibilidade', max: 2 },
  { key: 'bestLanguage', label: '9. Linguagem', max: 3 },
  { key: 'dysarthria', label: '10. Disartria', max: 2 },
  { key: 'extinctionInattention', label: '11. Extinção e inatenção', max: 2 },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function getDoorToNeedleColor(mins: number | null): string {
  if (mins === null) return 'text-zinc-400';
  if (mins <= 60) return 'text-green-400';
  if (mins <= 90) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Activate Dialog ─────────────────────────────────────────────────────────

function ActivateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activate = useActivateStrokeCode();
  const [patientId, setPatientId] = useState('');
  const [strokeType, setStrokeType] = useState<StrokeCode['strokeType']>('ISCHEMIC');

  const handleSubmit = () => {
    if (!patientId) { toast.error('Informe o ID do paciente.'); return; }
    activate.mutate({ patientId, strokeType }, {
      onSuccess: () => {
        toast.success('Código AVC ativado! Equipe notificada.');
        onClose();
        setPatientId('');
      },
      onError: () => toast.error('Erro ao ativar Código AVC.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" /> Ativar Código AVC
          </DialogTitle>
          <DialogDescription>Esta ação notificará toda a equipe de neurologia e imagem.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>ID do Paciente *</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="ID do paciente" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Tipo de AVC</Label>
            <Select value={strokeType} onValueChange={(v) => setStrokeType(v as StrokeCode['strokeType'])}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {(Object.entries(STROKE_TYPE_LABELS) as [StrokeCode['strokeType'], string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={activate.isPending} className="bg-red-600 hover:bg-red-700">
            {activate.isPending ? 'Ativando...' : 'Ativar Código AVC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── NIHSS Panel ─────────────────────────────────────────────────────────────

function NihssPanel({ codeId }: { codeId: string }) {
  const { data: assessments = [] } = useNihssAssessments(codeId);
  const create = useCreateNihssAssessment();
  const [showForm, setShowForm] = useState(false);
  const [scores, setScores] = useState({
    consciousness: 0, consciousnessQuestions: 0, consciousnessCommands: 0,
    bestGaze: 0, visual: 0, facialPalsy: 0,
    motorArmLeft: 0, motorArmRight: 0, motorLegLeft: 0, motorLegRight: 0,
    limbAtaxia: 0, sensory: 0, bestLanguage: 0, dysarthria: 0, extinctionInattention: 0,
  });

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSubmit = () => {
    create.mutate(
      { strokeCodeId: codeId, ...scores },
      {
        onSuccess: () => { toast.success('NIHSS registrado!'); setShowForm(false); },
        onError: () => toast.error('Erro ao registrar NIHSS.'),
      },
    );
  };

  const getNihssSeverity = (score: number) => {
    if (score === 0) return { label: 'Normal', color: 'text-green-400' };
    if (score <= 4) return { label: 'Leve', color: 'text-yellow-400' };
    if (score <= 15) return { label: 'Moderado', color: 'text-orange-400' };
    if (score <= 24) return { label: 'Grave', color: 'text-red-400' };
    return { label: 'Muito Grave', color: 'text-red-600' };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-zinc-300">Histórico NIHSS ({assessments.length})</p>
        <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Avaliação
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-zinc-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Escala NIHSS</p>
            <div className={cn('text-lg font-bold', getNihssSeverity(totalScore).color)}>
              {totalScore} pts — {getNihssSeverity(totalScore).label}
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {NIHSS_ITEMS.map(({ key, label, max }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="text-xs flex-1 text-zinc-400">{label}</Label>
                <div className="flex gap-1">
                  {Array.from({ length: max + 1 }, (_, i) => i).map((v) => (
                    <button
                      key={v}
                      onClick={() => setScores({ ...scores, [key]: v })}
                      className={cn('w-7 h-7 rounded text-xs font-medium transition-colors',
                        scores[key as keyof typeof scores] === v ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="border-zinc-700 flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Registrar NIHSS'}
            </Button>
          </div>
        </div>
      )}

      {assessments.map((a) => {
        const sev = getNihssSeverity(a.totalScore);
        return (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
            <div>
              <p className="text-sm text-zinc-400">{formatDate(a.assessedAt)} — {a.assessedBy}</p>
            </div>
            <span className={cn('text-xl font-bold', sev.color)}>{a.totalScore} <span className="text-sm">{sev.label}</span></span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Checklist Panel ─────────────────────────────────────────────────────────

function ChecklistPanel({ codeId }: { codeId: string }) {
  const { data: checklist } = useStrokeChecklist(codeId);
  const completeItem = useCompleteChecklistItem();

  if (!checklist) return <p className="text-zinc-500 text-sm text-center py-4">Carregando checklist...</p>;

  const byCategory = checklist.items.reduce<Record<string, typeof checklist.items>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item];
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    THROMBOLYSIS: 'Trombólise', THROMBECTOMY: 'Trombectomia', GENERAL: 'Geral',
  };

  return (
    <div className="space-y-4">
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="rounded-lg border border-zinc-700 p-3">
          <p className="text-sm font-medium text-purple-400 mb-2">{categoryLabels[cat] ?? cat}</p>
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                disabled={item.completed}
                onClick={() => completeItem.mutate({ codeId, itemId: item.id }, {
                  onSuccess: () => toast.success('Item concluído!'),
                  onError: () => toast.error('Erro ao concluir item.'),
                })}
                className="flex items-start gap-3 w-full text-left p-2 rounded hover:bg-zinc-800 transition-colors disabled:cursor-default"
              >
                {item.completed
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <Circle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={cn('text-sm', item.completed && 'line-through text-zinc-500')}>{item.description}</p>
                  {item.completedAt && (
                    <p className="text-xs text-zinc-500">{formatDate(item.completedAt)} — {item.completedBy}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Code Card ───────────────────────────────────────────────────────────────

function CodeCard({ code }: { code: StrokeCode }) {
  const [tab, setTab] = useState<'nihss' | 'checklist' | null>(null);
  const cfg = STATUS_CONFIG[code.status];
  const dtnColor = getDoorToNeedleColor(code.doorToNeedleMinutes);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{code.patientName}</p>
            <p className="text-sm text-zinc-400">{code.mrn} · {STROKE_TYPE_LABELS[code.strokeType]}</p>
          </div>
          <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">NIHSS</p>
            <p className={cn('font-bold text-lg', code.nihssScore > 15 ? 'text-red-400' : code.nihssScore > 4 ? 'text-yellow-400' : 'text-green-400')}>
              {code.nihssScore}
            </p>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">Porta-Agulha</p>
            <p className={cn('font-bold', dtnColor)}>{code.doorToNeedleMinutes ?? '—'} {code.doorToNeedleMinutes !== null ? 'min' : ''}</p>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">Hora Porta</p>
            <p className="text-xs font-medium text-zinc-300">{formatDate(code.doorTime)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {code.thrombolysisEligible && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">Elegível Trombólise</Badge>
          )}
          {code.thrombectomyEligible && (
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">Elegível Trombectomia</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className={cn('flex-1 border-zinc-700', tab === 'nihss' && 'border-purple-500/50')} onClick={() => setTab(tab === 'nihss' ? null : 'nihss')}>
            NIHSS
          </Button>
          <Button size="sm" variant="outline" className={cn('flex-1 border-zinc-700', tab === 'checklist' && 'border-purple-500/50')} onClick={() => setTab(tab === 'checklist' ? null : 'checklist')}>
            Checklist
          </Button>
        </div>
        {tab === 'nihss' && <NihssPanel codeId={code.id} />}
        {tab === 'checklist' && <ChecklistPanel codeId={code.id} />}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StrokeProtocolPage() {
  const [activateDialog, setActivateDialog] = useState(false);
  const { data: codes = [], isLoading } = useActiveStrokeCodes();

  const avgDTN = codes.filter((c) => c.doorToNeedleMinutes !== null).reduce((sum, c, _, arr) =>
    sum + (c.doorToNeedleMinutes! / arr.length), 0);

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
          <Brain className="h-7 w-7 text-purple-400" />
          <h1 className="text-2xl font-bold">Protocolo AVC</h1>
          <Badge variant="outline" className="text-purple-400 border-purple-500/50">Tempo real</Badge>
        </div>
        <Button onClick={() => setActivateDialog(true)} className="bg-red-600 hover:bg-red-700">
          <Zap className="h-4 w-4 mr-2" /> Ativar Código AVC
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div><p className="text-xs text-zinc-400">Códigos Ativos</p><p className="text-2xl font-bold">{codes.length}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Timer className="h-5 w-5 text-yellow-400" />
            <div><p className="text-xs text-zinc-400">Porta-Agulha Médio</p><p className="text-2xl font-bold">{avgDTN > 0 ? `${Math.round(avgDTN)}min` : '—'}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="h-5 w-5 text-blue-400" />
            <div><p className="text-xs text-zinc-400">Elegíveis Trombólise</p><p className="text-2xl font-bold">{codes.filter((c) => c.thrombolysisEligible).length}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-purple-400" />
            <div><p className="text-xs text-zinc-400">Elegíveis Trombectomia</p><p className="text-2xl font-bold">{codes.filter((c) => c.thrombectomyEligible).length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="active">Casos Ativos</TabsTrigger>
          <TabsTrigger value="nihss">NIHSS</TabsTrigger>
          <TabsTrigger value="protocol">Protocolo de Trombólise</TabsTrigger>
        </TabsList>

        {/* Casos Ativos */}
        <TabsContent value="active" className="mt-4">
          {codes.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-10 text-center text-zinc-500">Nenhum código AVC ativo</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {codes.map((code) => <CodeCard key={code.id} code={code} />)}
            </div>
          )}
        </TabsContent>

        {/* NIHSS */}
        <TabsContent value="nihss" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Escala NIHSS — Referência</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {[
                  { range: '0', label: 'Normal', color: 'text-green-400' },
                  { range: '1–4', label: 'Leve', color: 'text-yellow-400' },
                  { range: '5–15', label: 'Moderado', color: 'text-orange-400' },
                  { range: '16–24', label: 'Grave', color: 'text-red-400' },
                  { range: '25–42', label: 'Muito Grave', color: 'text-red-600' },
                ].map(({ range, label, color }) => (
                  <div key={range} className="flex items-center justify-between p-2 rounded bg-zinc-800">
                    <span className="text-sm text-zinc-400">NIHSS {range}</span>
                    <span className={cn('font-medium text-sm', color)}>{label}</span>
                  </div>
                ))}
              </div>
              {codes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3 text-zinc-300">Avaliações por Caso</p>
                  {codes.map((code) => (
                    <div key={code.id} className="mb-4">
                      <p className="text-sm text-zinc-400 mb-2">{code.patientName} — NIHSS atual: {code.nihssScore}</p>
                      <NihssPanel codeId={code.id} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocolo de Trombólise */}
        <TabsContent value="protocol" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base text-blue-400">Critérios de Inclusão — rtPA</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  'Diagnóstico clínico de AVC isquêmico',
                  'Início dos sintomas ≤ 4,5 horas',
                  'NIHSS ≥ 4 (ou déficit clinicamente relevante)',
                  'Imagem sem hemorragia ou lesão multifocal grande',
                  'Consentimento informado ou decisão de emergência',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 p-2 rounded bg-zinc-800">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base text-red-400">Critérios de Exclusão</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  'AVC ou TCE grave nos últimos 3 meses',
                  'Hemorragia intracraniana prévia',
                  'PA > 185/110 mmHg não controlada',
                  'Glicemia < 50 ou > 400 mg/dL',
                  'Plaquetas < 100.000 / INR > 1,7',
                  'Cirurgia ou procedimento invasivo recente',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 p-2 rounded bg-zinc-800">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          {codes.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-3 text-zinc-300">Checklist por Caso</p>
              {codes.map((code) => (
                <Card key={code.id} className="bg-zinc-900 border-zinc-800 mb-4">
                  <CardHeader><CardTitle className="text-sm">{code.patientName}</CardTitle></CardHeader>
                  <CardContent><ChecklistPanel codeId={code.id} /></CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ActivateDialog open={activateDialog} onClose={() => setActivateDialog(false)} />
    </div>
  );
}
