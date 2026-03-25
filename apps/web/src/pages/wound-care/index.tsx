import { useState } from 'react';
import {
  Bandage,
  Plus,
  ChevronRight,
  Ruler,
  Camera,
  ClipboardList,
  Activity,
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
  useWounds,
  useWoundEvolutions,
  useDressingPlans,
  useCreateWound,
  useCreateEvolution,
  useCreateDressingPlan,
} from '@/services/wound-care.service';
import type { WoundClassification, Wound } from '@/services/wound-care.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const CLASSIFICATIONS: Record<WoundClassification, string> = {
  NPUAP_I: 'NPUAP I', NPUAP_II: 'NPUAP II', NPUAP_III: 'NPUAP III', NPUAP_IV: 'NPUAP IV',
  NPUAP_UNSTAGEABLE: 'NPUAP Inclassificável',
  WAGNER_0: 'Wagner 0', WAGNER_1: 'Wagner 1', WAGNER_2: 'Wagner 2',
  WAGNER_3: 'Wagner 3', WAGNER_4: 'Wagner 4', WAGNER_5: 'Wagner 5',
  SURGICAL: 'Cirúrgica', TRAUMATIC: 'Traumática', BURN: 'Queimadura',
};

const STATUS_CONFIG: Record<Wound['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'Ativa', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  HEALING: { label: 'Cicatrizando', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  HEALED: { label: 'Cicatrizada', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  WORSENING: { label: 'Piorando', className: 'bg-red-700/30 text-red-300 border-red-700/50' },
};

const EXUDATE_LABELS: Record<string, string> = {
  NONE: 'Ausente', SCANT: 'Escasso', MODERATE: 'Moderado', ABUNDANT: 'Abundante',
};

const DEMO_PATIENT_ID = 'demo-patient-1';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── New Wound Dialog ────────────────────────────────────────────────────────

function NewWoundDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWound();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    bodyLocation: '',
    classification: 'SURGICAL' as WoundClassification,
  });

  const handleSubmit = () => {
    if (!form.bodyLocation) { toast.error('Informe a localização da ferida.'); return; }
    create.mutate(form, {
      onSuccess: () => { toast.success('Ferida registrada!'); onClose(); setForm({ patientId: DEMO_PATIENT_ID, bodyLocation: '', classification: 'SURGICAL' }); },
      onError: () => toast.error('Erro ao registrar ferida.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Nova Ferida</DialogTitle>
          <DialogDescription>Cadastro de ferida ativa para acompanhamento</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Localização *</Label>
            <Input value={form.bodyLocation} onChange={(e) => setForm({ ...form, bodyLocation: e.target.value })}
              placeholder="ex: Pé direito, região plantar" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Classificação</Label>
            <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v as WoundClassification })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                {(Object.keys(CLASSIFICATIONS) as WoundClassification[]).map((k) => (
                  <SelectItem key={k} value={k}>{CLASSIFICATIONS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Evolution Dialog ────────────────────────────────────────────────────────

function EvolutionDialog({ woundId, open, onClose }: { woundId: string; open: boolean; onClose: () => void }) {
  const create = useCreateEvolution();
  const [form, setForm] = useState({
    woundId,
    length: '', width: '', depth: '',
    exudate: 'NONE' as 'NONE' | 'SCANT' | 'MODERATE' | 'ABUNDANT',
    exudateType: '', tissueType: '', edges: '', perilesionalSkin: '',
    pain: '0', observations: '',
  });

  const handleSubmit = () => {
    create.mutate(
      { ...form, woundId, length: Number(form.length) || 0, width: Number(form.width) || 0, depth: Number(form.depth) || 0, pain: Number(form.pain) || 0 },
      {
        onSuccess: () => { toast.success('Evolução registrada!'); onClose(); },
        onError: () => toast.error('Erro ao registrar evolução.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Evolução</DialogTitle>
          <DialogDescription>Registro de evolução da ferida</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {[
            { key: 'length', label: 'Comprimento (cm)' },
            { key: 'width', label: 'Largura (cm)' },
            { key: 'depth', label: 'Profundidade (cm)' },
            { key: 'pain', label: 'Dor (0–10)' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                type="number" className="bg-zinc-950 border-zinc-700" />
            </div>
          ))}
          <div className="col-span-2 space-y-1">
            <Label>Exsudato</Label>
            <Select value={form.exudate} onValueChange={(v) => setForm({ ...form, exudate: v as typeof form.exudate })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {Object.entries(EXUDATE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {[
            { key: 'exudateType', label: 'Tipo de Exsudato' },
            { key: 'tissueType', label: 'Tipo de Tecido' },
            { key: 'edges', label: 'Bordas' },
            { key: 'perilesionalSkin', label: 'Pele Perilesional' },
          ].map(({ key, label }) => (
            <div key={key} className="col-span-2 space-y-1">
              <Label>{label}</Label>
              <Input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="bg-zinc-950 border-zinc-700" />
            </div>
          ))}
          <div className="col-span-2 space-y-1">
            <Label>Observações</Label>
            <Input value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="bg-zinc-950 border-zinc-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Registrar Evolução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dressing Plan Dialog ────────────────────────────────────────────────────

function DressingPlanDialog({ woundId, open, onClose }: { woundId: string; open: boolean; onClose: () => void }) {
  const create = useCreateDressingPlan();
  const [form, setForm] = useState({ woundId, dressingType: '', frequency: '', instructions: '' });

  const handleSubmit = () => {
    if (!form.dressingType || !form.frequency) { toast.error('Preencha tipo e frequência.'); return; }
    create.mutate({ ...form, woundId }, {
      onSuccess: () => { toast.success('Plano de curativo criado!'); onClose(); },
      onError: () => toast.error('Erro ao criar plano.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Plano de Curativo</DialogTitle>
          <DialogDescription>Definir protocolo de curativo para esta ferida</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Tipo de Curativo *</Label>
            <Input value={form.dressingType} onChange={(e) => setForm({ ...form, dressingType: e.target.value })}
              placeholder="ex: Alginato de cálcio, Hidrogel" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Frequência *</Label>
            <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              placeholder="ex: Diário, a cada 48h" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Instruções</Label>
            <Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Procedimento detalhado..." className="bg-zinc-950 border-zinc-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Salvar Plano'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Wound Detail Panel ──────────────────────────────────────────────────────

function WoundDetailPanel({ wound }: { wound: Wound }) {
  const [evoDialog, setEvoDialog] = useState(false);
  const [planDialog, setPlanDialog] = useState(false);
  const { data: evolutions = [] } = useWoundEvolutions(wound.id);
  const { data: plans = [] } = useDressingPlans(wound.id);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => setEvoDialog(true)}>
          <Activity className="h-4 w-4 mr-1" /> Nova Evolução
        </Button>
        <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => setPlanDialog(true)}>
          <ClipboardList className="h-4 w-4 mr-1" /> Plano de Curativo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evolutions */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ruler className="h-4 w-4 text-blue-400" /> Evoluções ({evolutions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evolutions.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Sem evoluções registradas</p>
            ) : (
              evolutions.slice(0, 3).map((e) => (
                <div key={e.id} className="p-2 rounded bg-zinc-900 border border-zinc-700 text-sm">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{formatDate(e.evaluatedAt)}</span>
                    <span>{e.length}×{e.width}×{e.depth} cm</span>
                  </div>
                  <p className="text-xs">Exsudato: {EXUDATE_LABELS[e.exudate] ?? e.exudate} · Dor: {e.pain}/10</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Dressing Plans */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-400" /> Planos de Curativo ({plans.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plans.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Sem planos registrados</p>
            ) : (
              plans.map((p) => (
                <div key={p.id} className={cn('p-2 rounded border text-sm', p.active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-zinc-700')}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{p.dressingType}</span>
                    <Badge variant="outline" className={p.active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs' : 'text-zinc-500 text-xs'}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Frequência: {p.frequency}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <EvolutionDialog woundId={wound.id} open={evoDialog} onClose={() => setEvoDialog(false)} />
      <DressingPlanDialog woundId={wound.id} open={planDialog} onClose={() => setPlanDialog(false)} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WoundCarePage() {
  const [newWoundDialog, setNewWoundDialog] = useState(false);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  const [statusFilter] = useState('');

  const { data: wounds = [], isLoading } = useWounds(statusFilter ? { status: statusFilter } : undefined);

  const activeWounds = wounds.filter((w) => w.status === 'ACTIVE' || w.status === 'WORSENING');
  const healingWounds = wounds.filter((w) => w.status === 'HEALING');

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
          <Bandage className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Curativo e Feridas</h1>
        </div>
        <Button onClick={() => setNewWoundDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nova Ferida
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Feridas Ativas', count: activeWounds.length, color: 'text-red-400' },
          { label: 'Cicatrizando', count: healingWounds.length, color: 'text-yellow-400' },
          { label: 'Cicatrizadas', count: wounds.filter((w) => w.status === 'HEALED').length, color: 'text-green-400' },
          { label: 'Total', count: wounds.length, color: 'text-zinc-300' },
        ].map(({ label, count, color }) => (
          <Card key={label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-400">{label}</p>
              <p className={cn('text-2xl font-bold', color)}>{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="active">Feridas Ativas</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="dressing">Plano de Curativos</TabsTrigger>
        </TabsList>

        {/* Feridas Ativas */}
        <TabsContent value="active" className="mt-4">
          <div className="space-y-3">
            {wounds.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 text-center text-zinc-500">Nenhuma ferida registrada</CardContent>
              </Card>
            ) : (
              wounds.map((wound) => (
                <Card key={wound.id} className={cn('bg-zinc-900 border-zinc-800 cursor-pointer transition-colors hover:border-zinc-600',
                  selectedWound?.id === wound.id && 'border-emerald-500/50')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{wound.patientName}</p>
                          <p className="text-sm text-zinc-400">{wound.bodyLocation} · {CLASSIFICATIONS[wound.classification]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_CONFIG[wound.status].className}>
                          {STATUS_CONFIG[wound.status].label}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedWound(selectedWound?.id === wound.id ? null : wound)}>
                          <ChevronRight className={cn('h-4 w-4 transition-transform', selectedWound?.id === wound.id && 'rotate-90')} />
                        </Button>
                      </div>
                    </div>
                    {selectedWound?.id === wound.id && <WoundDetailPanel wound={wound} />}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Evolução */}
        <TabsContent value="evolution" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Seleção de Ferida para Evolução</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead>Paciente</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aberta em</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wounds.map((w) => (
                    <TableRow key={w.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-medium">{w.patientName}</TableCell>
                      <TableCell>{w.bodyLocation}</TableCell>
                      <TableCell className="text-zinc-400">{CLASSIFICATIONS[w.classification]}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_CONFIG[w.status].className}>{STATUS_CONFIG[w.status].label}</Badge></TableCell>
                      <TableCell className="text-zinc-400">{formatDate(w.openedAt)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="border-zinc-700"
                          onClick={() => setSelectedWound(w)}>
                          <Activity className="h-3 w-3 mr-1" /> Evoluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {selectedWound && (
            <div className="mt-4">
              <WoundDetailPanel wound={selectedWound} />
            </div>
          )}
        </TabsContent>

        {/* Plano de Curativos */}
        <TabsContent value="dressing" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Planos de Curativo por Ferida</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead>Paciente</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Leito</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wounds.map((w) => (
                    <TableRow key={w.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-medium">{w.patientName}</TableCell>
                      <TableCell>{w.bodyLocation}</TableCell>
                      <TableCell className="text-zinc-400">{w.bed ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_CONFIG[w.status].className}>{STATUS_CONFIG[w.status].label}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="border-zinc-700"
                          onClick={() => setSelectedWound(w)}>
                          <ClipboardList className="h-3 w-3 mr-1" /> Ver Plano
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {selectedWound && (
            <div className="mt-4">
              <WoundDetailPanel wound={selectedWound} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewWoundDialog open={newWoundDialog} onClose={() => setNewWoundDialog(false)} />
    </div>
  );
}
