import { useState } from 'react';
import {
  Flame,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Activity,
  BarChart3,
  Thermometer,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useSepsisActiveCases,
  useSepsisBundles,
  useSepsisCompliance,
  useCreateSepsisScreening,
  useCompleteBundleItem,
} from '@/services/sepsis.service';
import type { SepsisCase } from '@/services/sepsis.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SCREENING: { label: 'Triagem', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  SUSPECTED: { label: 'Suspeita', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  CONFIRMED: { label: 'Confirmada', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  SEPTIC_SHOCK: { label: 'Choque Séptico', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
  RESOLVED: { label: 'Resolvida', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  RULED_OUT: { label: 'Descartada', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Screening Dialog ────────────────────────────────────────────────────────

function ScreeningDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSepsisScreening();
  const [patientId, setPatientId] = useState('');
  const [qsofa, setQsofa] = useState({ qsofaAlteredMentation: false, qsofaSystolicBp: false, qsofaRespRate: false });
  const [sirs, setSirs] = useState({ sirsTemp: false, sirsHeartRate: false, sirsRespRate: false, sirsWbc: false });

  const qsofaScore = Object.values(qsofa).filter(Boolean).length;
  const sirsScore = Object.values(sirs).filter(Boolean).length;

  const handleSubmit = () => {
    if (!patientId) { toast.error('Informe o ID do paciente.'); return; }
    create.mutate({ patientId, ...qsofa, ...sirs }, {
      onSuccess: () => {
        toast.success('Triagem de sepse registrada!');
        onClose();
        setPatientId('');
        setQsofa({ qsofaAlteredMentation: false, qsofaSystolicBp: false, qsofaRespRate: false });
        setSirs({ sirsTemp: false, sirsHeartRate: false, sirsRespRate: false, sirsWbc: false });
      },
      onError: () => toast.error('Erro ao registrar triagem.'),
    });
  };

  const CheckItem = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 w-full text-left transition-colors">
      {checked ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <Circle className="h-5 w-5 text-zinc-500 shrink-0" />}
      <span className={cn('text-sm', checked && 'text-emerald-300')}>{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Triagem de Sepse</DialogTitle>
          <DialogDescription>Critérios qSOFA e SIRS</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>ID do Paciente *</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="ID do paciente" className="bg-zinc-950 border-zinc-700" />
          </div>

          <div className="rounded-lg border border-zinc-700 p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-yellow-400">Critérios qSOFA</p>
              <Badge variant="outline" className={cn('', qsofaScore >= 2 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50')}>
                {qsofaScore}/3
              </Badge>
            </div>
            <CheckItem label="Alteração do nível de consciência" checked={qsofa.qsofaAlteredMentation} onToggle={() => setQsofa({ ...qsofa, qsofaAlteredMentation: !qsofa.qsofaAlteredMentation })} />
            <CheckItem label="PAS ≤ 100 mmHg" checked={qsofa.qsofaSystolicBp} onToggle={() => setQsofa({ ...qsofa, qsofaSystolicBp: !qsofa.qsofaSystolicBp })} />
            <CheckItem label="FR ≥ 22 irpm" checked={qsofa.qsofaRespRate} onToggle={() => setQsofa({ ...qsofa, qsofaRespRate: !qsofa.qsofaRespRate })} />
          </div>

          <div className="rounded-lg border border-zinc-700 p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-orange-400">Critérios SIRS</p>
              <Badge variant="outline" className={cn('', sirsScore >= 2 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50')}>
                {sirsScore}/4
              </Badge>
            </div>
            <CheckItem label="Temperatura > 38°C ou < 36°C" checked={sirs.sirsTemp} onToggle={() => setSirs({ ...sirs, sirsTemp: !sirs.sirsTemp })} />
            <CheckItem label="FC > 90 bpm" checked={sirs.sirsHeartRate} onToggle={() => setSirs({ ...sirs, sirsHeartRate: !sirs.sirsHeartRate })} />
            <CheckItem label="FR > 20 irpm ou PaCO₂ < 32 mmHg" checked={sirs.sirsRespRate} onToggle={() => setSirs({ ...sirs, sirsRespRate: !sirs.sirsRespRate })} />
            <CheckItem label="Leucócitos > 12.000 ou < 4.000 ou > 10% bastões" checked={sirs.sirsWbc} onToggle={() => setSirs({ ...sirs, sirsWbc: !sirs.sirsWbc })} />
          </div>

          {qsofaScore >= 2 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-300">qSOFA ≥ 2 — Iniciar avaliação de sepse imediatamente!</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-red-600 hover:bg-red-700">
            {create.isPending ? 'Registrando...' : 'Registrar Triagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bundle Panel ────────────────────────────────────────────────────────────

function BundlePanel({ screeningId }: { screeningId: string }) {
  const { data: bundles = [] } = useSepsisBundles(screeningId);
  const completeItem = useCompleteBundleItem();

  const handleComplete = (bundleId: string, itemId: string) => {
    completeItem.mutate({ screeningId, bundleId, itemId }, {
      onSuccess: () => toast.success('Item do bundle concluído!'),
      onError: () => toast.error('Erro ao completar item.'),
    });
  };

  if (bundles.length === 0) return <p className="text-zinc-500 text-sm text-center py-4">Nenhum bundle disponível</p>;

  return (
    <div className="space-y-4">
      {bundles.map((bundle) => (
        <div key={bundle.id} className="rounded-lg border border-zinc-700 p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">{bundle.bundleType === 'HOUR_1' ? 'Bundle 1 hora' : 'Bundle 3 horas'}</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-zinc-700">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${bundle.compliance}%` }} />
              </div>
              <span className="text-xs text-zinc-400">{bundle.compliance}%</span>
            </div>
          </div>
          <div className="space-y-2">
            {bundle.items.map((item) => (
              <button
                key={item.id}
                onClick={() => !item.completed && handleComplete(bundle.id, item.id)}
                disabled={item.completed || completeItem.isPending}
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

// ─── Case Card ───────────────────────────────────────────────────────────────

function CaseCard({ c }: { c: SepsisCase }) {
  const [showBundles, setShowBundles] = useState(false);
  const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' };
  const isUrgent = c.elapsedMinutes >= 60;

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', isUrgent && 'border-red-500/40')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{c.patientName}</p>
            <p className="text-sm text-zinc-400">{c.mrn} · {c.bed ?? '—'} · {c.ward ?? '—'}</p>
          </div>
          <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">qSOFA</p>
            <p className={cn('font-bold', c.qsofaScore >= 2 ? 'text-red-400' : 'text-zinc-300')}>{c.qsofaScore}/3</p>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">SOFA</p>
            <p className="font-bold">{c.sofaScore ?? '—'}</p>
          </div>
          <div className={cn('rounded p-2', isUrgent ? 'bg-red-500/20' : 'bg-zinc-800')}>
            <p className="text-xs text-zinc-400">Tempo</p>
            <p className={cn('font-bold', isUrgent ? 'text-red-400' : 'text-zinc-300')}>{formatElapsed(c.elapsedMinutes)}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Bundle 1h</span>
            <span className={c.bundle1hCompliance === 100 ? 'text-emerald-400' : 'text-yellow-400'}>{c.bundle1hCompliance}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${c.bundle1hCompliance}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-2 mb-1">
            <span className="text-zinc-400">Bundle 3h</span>
            <span className={c.bundle3hCompliance === 100 ? 'text-emerald-400' : 'text-yellow-400'}>{c.bundle3hCompliance}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700">
            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${c.bundle3hCompliance}%` }} />
          </div>
        </div>
        <Button size="sm" variant="outline" className="w-full border-zinc-700" onClick={() => setShowBundles(!showBundles)}>
          {showBundles ? 'Ocultar Bundles' : 'Ver Bundles'}
        </Button>
        {showBundles && <BundlePanel screeningId={c.id} />}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SepsisPage() {
  const [screeningDialog, setScreeningDialog] = useState(false);

  const { data: cases = [], isLoading } = useSepsisActiveCases();
  const { data: compliance } = useSepsisCompliance();

  const shockCount = cases.filter((c) => c.status === 'SEPTIC_SHOCK').length;
  const criticalCount = cases.filter((c) => c.elapsedMinutes >= 60).length;

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
          <Flame className="h-7 w-7 text-orange-400" />
          <h1 className="text-2xl font-bold">Protocolo Sepse</h1>
          <Badge variant="outline" className="text-orange-400 border-orange-500/50">Tempo real</Badge>
        </div>
        <Button onClick={() => setScreeningDialog(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Nova Triagem
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-orange-400" />
            <div><p className="text-xs text-zinc-400">Casos Ativos</p><p className="text-2xl font-bold">{cases.length}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div><p className="text-xs text-zinc-400">Choque Séptico</p><p className="text-2xl font-bold text-red-400">{shockCount}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div><p className="text-xs text-zinc-400">Tempo Crítico (≥1h)</p><p className="text-2xl font-bold text-yellow-400">{criticalCount}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <div><p className="text-xs text-zinc-400">Bundle 1h</p><p className="text-2xl font-bold">{compliance?.bundle1hCompliance ?? 0}%</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="active">Casos Ativos</TabsTrigger>
          <TabsTrigger value="screening">Triagem</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Casos Ativos */}
        <TabsContent value="active" className="mt-4">
          {cases.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-10 text-center text-zinc-500">Nenhum caso ativo de sepse</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cases.map((c) => <CaseCard key={c.id} c={c} />)}
            </div>
          )}
        </TabsContent>

        {/* Triagem */}
        <TabsContent value="screening" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Triagem de Sepse — Critérios</CardTitle>
              <Button size="sm" onClick={() => setScreeningDialog(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-1" /> Nova Triagem
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'qSOFA', color: 'text-yellow-400', items: [
                      'Alteração do nível de consciência', 'Pressão sistólica ≤ 100 mmHg', 'Frequência respiratória ≥ 22 irpm',
                    ], threshold: '≥ 2 critérios — suspeita de sepse',
                  },
                  {
                    title: 'SIRS', color: 'text-orange-400', items: [
                      'Temperatura > 38°C ou < 36°C', 'FC > 90 bpm', 'FR > 20 irpm', 'Leucocitose/leucopenia/desvio à esquerda',
                    ], threshold: '≥ 2 critérios',
                  },
                  {
                    title: 'SOFA', color: 'text-red-400', items: [
                      'Respiração (PaO₂/FiO₂)', 'Coagulação (Plaquetas)', 'Fígado (Bilirrubina)', 'Cardiovascular (PAM/vasopressores)', 'SNC (Glasgow)', 'Renal (Creatinina/débito)',
                    ], threshold: 'Aumento ≥ 2 pontos — disfunção orgânica',
                  },
                ].map(({ title, color, items, threshold }) => (
                  <div key={title} className="rounded-lg border border-zinc-700 p-4">
                    <p className={cn('font-semibold mb-3', color)}>{title}</p>
                    <ul className="space-y-1 mb-3">
                      {items.map((item) => (
                        <li key={item} className="text-sm text-zinc-400 flex items-start gap-2">
                          <Thermometer className="h-3 w-3 mt-1 shrink-0 text-zinc-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-zinc-500 border-t border-zinc-700 pt-2">{threshold}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundles */}
        <TabsContent value="bundles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Bundle 1 hora', color: 'text-red-400', items: [
                  'Medir lactato', 'Obter hemoculturas antes de antibióticos', 'Administrar antibióticos de amplo espectro',
                  'Administrar 30 ml/kg de cristaloide para hipotensão ou lactato ≥ 4', 'Iniciar vasopressores se hipotensão persistir',
                ],
              },
              {
                title: 'Bundle 3 horas', color: 'text-orange-400', items: [
                  'Reavaliação do estado volêmico e perfusão tecidual', 'Medir lactato novamente se inicial > 2 mmol/L',
                  'Documentar reavaliação clínica', 'Otimizar vasopressores — manter PAM ≥ 65 mmHg',
                ],
              },
            ].map(({ title, color, items }) => (
              <Card key={title} className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className={cn('text-base', color)}>{title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => (
                    <div key={item} className="flex items-start gap-2 p-2 rounded bg-zinc-800">
                      <Circle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="mt-4">
          {!compliance ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-10 text-center text-zinc-500">Carregando dados de compliance...</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Indicadores de Qualidade</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Compliance Bundle 1h', value: compliance.bundle1hCompliance, unit: '%', color: 'bg-emerald-500' },
                    { label: 'Compliance Bundle 3h', value: compliance.bundle3hCompliance, unit: '%', color: 'bg-blue-500' },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">{label}</span>
                        <span className="font-bold">{value}{unit}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-700">
                        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Resumo do Período</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Total de Casos', value: compliance.totalCases },
                    { label: 'Taxa de Mortalidade', value: `${compliance.mortalityRate}%` },
                    { label: 'Tempo Médio até Antibiótico', value: `${compliance.avgTimeToAntibiotic} min` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center p-3 rounded-lg bg-zinc-800">
                      <span className="text-sm text-zinc-400">{label}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ScreeningDialog open={screeningDialog} onClose={() => setScreeningDialog(false)} />
    </div>
  );
}
