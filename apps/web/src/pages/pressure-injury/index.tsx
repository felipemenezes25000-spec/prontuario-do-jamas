import { useState } from 'react';
import {
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
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
  useSkinAssessments,
  useWoundRecords,
  useRepositioningSchedule,
  useCreateSkinAssessment,
  useCreateWoundRecord,
  useCompleteRepositioning,
} from '@/services/pressure-injury.service';
import type { NpuapStage } from '@/services/pressure-injury.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const NPUAP_LABELS: Record<NpuapStage, string> = {
  STAGE_I: 'Estágio I',
  STAGE_II: 'Estágio II',
  STAGE_III: 'Estágio III',
  STAGE_IV: 'Estágio IV',
  UNSTAGEABLE: 'Inclassificável',
  DEEP_TISSUE: 'Lesão Tecido Profundo',
};

const NPUAP_COLORS: Record<NpuapStage, string> = {
  STAGE_I: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  STAGE_II: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  STAGE_III: 'bg-red-500/20 text-red-400 border-red-500/50',
  STAGE_IV: 'bg-red-700/30 text-red-300 border-red-700/50',
  UNSTAGEABLE: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50',
  DEEP_TISSUE: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
};

const NPUAP_STAGES: NpuapStage[] = ['STAGE_I', 'STAGE_II', 'STAGE_III', 'STAGE_IV', 'UNSTAGEABLE', 'DEEP_TISSUE'];

const DEMO_PATIENT_ID = 'demo-patient-1';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function StageBadge({ stage }: { stage: NpuapStage }) {
  return (
    <Badge variant="outline" className={NPUAP_COLORS[stage]}>
      {NPUAP_LABELS[stage]}
    </Badge>
  );
}

// ─── Skin Assessment Dialog ──────────────────────────────────────────────────

function SkinAssessmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSkinAssessment();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    bodyRegion: '',
    skinIntegrity: 'INTACT',
    description: '',
  });

  const handleSubmit = () => {
    if (!form.bodyRegion || !form.description) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    create.mutate(form, {
      onSuccess: () => {
        toast.success('Avaliação de pele registrada!');
        onClose();
        setForm({ patientId: DEMO_PATIENT_ID, bodyRegion: '', skinIntegrity: 'INTACT', description: '' });
      },
      onError: () => toast.error('Erro ao registrar avaliação.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Nova Avaliação de Pele</DialogTitle>
          <DialogDescription>Registro de integridade cutânea do paciente</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Região do Corpo *</Label>
            <Input
              value={form.bodyRegion}
              onChange={(e) => setForm({ ...form, bodyRegion: e.target.value })}
              placeholder="ex: Região sacral, calcâneo esquerdo"
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>Integridade da Pele</Label>
            <Select value={form.skinIntegrity} onValueChange={(v) => setForm({ ...form, skinIntegrity: v })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="INTACT">Íntegra</SelectItem>
                <SelectItem value="COMPROMISED">Comprometida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o estado da pele"
              className="bg-zinc-950 border-zinc-700"
            />
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

// ─── Wound Record Dialog ─────────────────────────────────────────────────────

function WoundRecordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWoundRecord();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    bodyRegion: '',
    stage: 'STAGE_I' as NpuapStage,
    length: '',
    width: '',
    depth: '',
    exudate: '',
    tissueType: '',
    edges: '',
    bradenScore: '',
  });

  const handleSubmit = () => {
    if (!form.bodyRegion) {
      toast.error('Informe a região do corpo.');
      return;
    }
    create.mutate(
      {
        patientId: form.patientId,
        bodyRegion: form.bodyRegion,
        stage: form.stage,
        length: Number(form.length) || 0,
        width: Number(form.width) || 0,
        depth: Number(form.depth) || 0,
        exudate: form.exudate,
        tissueType: form.tissueType,
        edges: form.edges,
        bradenScore: form.bradenScore ? Number(form.bradenScore) : null,
      },
      {
        onSuccess: () => {
          toast.success('Lesão registrada!');
          onClose();
        },
        onError: () => toast.error('Erro ao registrar lesão.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Lesão por Pressão</DialogTitle>
          <DialogDescription>Classificação NPUAP da lesão</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <Label>Região do Corpo *</Label>
            <Input value={form.bodyRegion} onChange={(e) => setForm({ ...form, bodyRegion: e.target.value })}
              placeholder="ex: Sacral, calcâneo" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Estágio NPUAP</Label>
            <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as NpuapStage })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {NPUAP_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{NPUAP_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Comprimento (cm)</Label>
            <Input value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })}
              type="number" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Largura (cm)</Label>
            <Input value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })}
              type="number" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Profundidade (cm)</Label>
            <Input value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })}
              type="number" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Score Braden</Label>
            <Input value={form.bradenScore} onChange={(e) => setForm({ ...form, bradenScore: e.target.value })}
              type="number" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Tipo de Exsudato</Label>
            <Input value={form.exudate} onChange={(e) => setForm({ ...form, exudate: e.target.value })}
              placeholder="ex: Seroso, purulento" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Tipo de Tecido</Label>
            <Input value={form.tissueType} onChange={(e) => setForm({ ...form, tissueType: e.target.value })}
              placeholder="ex: Granulação, necrose" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Bordas</Label>
            <Input value={form.edges} onChange={(e) => setForm({ ...form, edges: e.target.value })}
              placeholder="ex: Regulares, maceradas" className="bg-zinc-950 border-zinc-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Registrar Lesão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PressureInjuryPage() {
  const [skinDialog, setSkinDialog] = useState(false);
  const [woundDialog, setWoundDialog] = useState(false);

  const { data: assessments = [], isLoading: assessLoading } = useSkinAssessments(DEMO_PATIENT_ID);
  const { data: wounds = [], isLoading: woundsLoading } = useWoundRecords();
  const { data: schedule = [], isLoading: schedLoading } = useRepositioningSchedule(DEMO_PATIENT_ID);
  const completeRepositioning = useCompleteRepositioning();

  const handleCompleteRepositioning = (scheduleId: string) => {
    completeRepositioning.mutate(
      { patientId: DEMO_PATIENT_ID, scheduleId },
      {
        onSuccess: () => toast.success('Mudança de decúbito registrada!'),
        onError: () => toast.error('Erro ao registrar mudança de decúbito.'),
      },
    );
  };

  const isLoading = assessLoading || woundsLoading || schedLoading;

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
          <Layers className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Lesão por Pressão</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700" onClick={() => setSkinDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Avaliação de Pele
          </Button>
          <Button variant="outline" className="border-zinc-700" onClick={() => setWoundDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Registrar Lesão
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-orange-400" />
            <div>
              <p className="text-xs text-zinc-400">Lesões Registradas</p>
              <p className="text-2xl font-bold">{wounds.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-zinc-400">Avaliações de Pele</p>
              <p className="text-2xl font-bold">{assessments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-400">Mudanças Agendadas</p>
              <p className="text-2xl font-bold">{schedule.filter((s) => !s.completedAt).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assessments">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="assessments">Avaliações</TabsTrigger>
          <TabsTrigger value="wounds">Registro de Lesões</TabsTrigger>
          <TabsTrigger value="repositioning">Mudança de Decúbito</TabsTrigger>
        </TabsList>

        {/* Avaliações */}
        <TabsContent value="assessments" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Avaliações de Integridade da Pele</CardTitle>
              <Button size="sm" onClick={() => setSkinDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Nova
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {assessments.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma avaliação registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Data</TableHead>
                      <TableHead>Região</TableHead>
                      <TableHead>Integridade</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Avaliado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((a) => (
                      <TableRow key={a.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{formatDate(a.assessedAt)}</TableCell>
                        <TableCell>{a.bodyRegion}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={a.skinIntegrity === 'INTACT'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border-red-500/50'}>
                            {a.skinIntegrity === 'INTACT' ? 'Íntegra' : 'Comprometida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 max-w-xs truncate">{a.description}</TableCell>
                        <TableCell className="text-zinc-400">{a.assessedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registro de Lesões */}
        <TabsContent value="wounds" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lesões por Pressão</CardTitle>
              <Button size="sm" onClick={() => setWoundDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Nova Lesão
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {wounds.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma lesão registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Paciente</TableHead>
                      <TableHead>Região</TableHead>
                      <TableHead>Estágio</TableHead>
                      <TableHead>Dimensões (cm)</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>Registrado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wounds.map((w) => (
                      <TableRow key={w.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium">{w.patientName}</TableCell>
                        <TableCell>{w.bodyRegion}</TableCell>
                        <TableCell><StageBadge stage={w.stage} /></TableCell>
                        <TableCell className="text-zinc-400">
                          {w.length}×{w.width}×{w.depth}
                        </TableCell>
                        <TableCell className="text-zinc-400">{w.bed ?? '—'}</TableCell>
                        <TableCell className="text-zinc-400">{formatDate(w.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mudança de Decúbito */}
        <TabsContent value="repositioning" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Cronograma de Mudança de Decúbito</CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum agendamento encontrado</p>
              ) : (
                <div className="space-y-3">
                  {schedule.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        s.completedAt
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-zinc-800/50 border-zinc-700',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {s.completedAt ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{s.position}</p>
                          <p className="text-xs text-zinc-400">
                            Agendado: {formatDate(s.scheduledAt)}
                          </p>
                          {s.completedAt && (
                            <p className="text-xs text-green-400">
                              Realizado: {formatDate(s.completedAt)} — {s.completedBy}
                            </p>
                          )}
                        </div>
                      </div>
                      {!s.completedAt && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteRepositioning(s.id)}
                          disabled={completeRepositioning.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SkinAssessmentDialog open={skinDialog} onClose={() => setSkinDialog(false)} />
      <WoundRecordDialog open={woundDialog} onClose={() => setWoundDialog(false)} />
    </div>
  );
}
