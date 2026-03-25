import { useState } from 'react';
import { Puzzle, ClipboardList, Target, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import {
  useOTAssessments,
  useCreateOTAssessment,
  useOTPlans,
  useCreateOTPlan,
  type ScaleType,
  type OTAssessment,
  type RehabPlan,
} from '@/services/occupational-therapy.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCALE_LABELS: Record<ScaleType, string> = {
  BARTHEL: 'Índice de Barthel',
  FIM: 'MIF — Medida de Independência Funcional',
  KATZ: 'Índice de Katz',
  LAWTON: 'Escala de Lawton',
};

const PLAN_STATUS_COLORS: Record<RehabPlan['status'], string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  COMPLETED: 'bg-slate-500/20 text-slate-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

const PLAN_STATUS_LABELS: Record<RehabPlan['status'], string> = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

function IndependenceBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold w-12 text-right">{score}/{max}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OccupationalTherapyPage() {
  const [activeTab, setActiveTab] = useState('assessments');

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    scaleType: '' as ScaleType,
    goals: '',
  });

  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    patientId: '',
    assessmentId: '',
    objectives: '',
    activities: '',
    frequency: '',
    duration: '',
    adaptations: '',
  });

  const { data: assessmentsData, isLoading: assessmentsLoading } = useOTAssessments();
  const { data: plansData, isLoading: plansLoading } = useOTPlans();
  const createAssessment = useCreateOTAssessment();
  const createPlan = useCreateOTPlan();

  const handleCreateAssessment = async () => {
    if (!assessmentForm.patientId || !assessmentForm.scaleType) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAssessment.mutateAsync({
        patientId: assessmentForm.patientId,
        encounterId: assessmentForm.encounterId,
        scaleType: assessmentForm.scaleType,
        items: [],
        goals: assessmentForm.goals,
      });
      toast.success('Avaliação TO registrada com sucesso.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', scaleType: '' as ScaleType, goals: '' });
    } catch {
      toast.error('Erro ao registrar avaliação.');
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.patientId || !planForm.assessmentId || !planForm.frequency || !planForm.duration) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createPlan.mutateAsync({
        patientId: planForm.patientId,
        assessmentId: planForm.assessmentId,
        objectives: planForm.objectives.split(',').map((o) => o.trim()).filter(Boolean),
        activities: planForm.activities.split(',').map((a) => a.trim()).filter(Boolean),
        frequency: planForm.frequency,
        duration: planForm.duration,
        adaptations: planForm.adaptations,
      });
      toast.success('Plano de reabilitação criado.');
      setPlanOpen(false);
      setPlanForm({ patientId: '', assessmentId: '', objectives: '', activities: '', frequency: '', duration: '', adaptations: '' });
    } catch {
      toast.error('Erro ao criar plano.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Puzzle className="h-6 w-6 text-primary" />
          Terapia Ocupacional
        </h1>
        <p className="text-muted-foreground">
          Avaliações de independência funcional (Barthel / MIF) e planos de reabilitação
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Avaliações (Barthel / MIF)
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Planos de Reabilitação
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Avaliações ─────────────────────────────────────────────── */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{assessmentsData?.total ?? 0} avaliações</p>
            <Button onClick={() => setAssessmentOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Avaliações de Independência para AVDs</CardTitle></CardHeader>
            <CardContent>
              {assessmentsLoading ? <PageLoading /> : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Escala</TableHead>
                      <TableHead>Pontuação</TableHead>
                      <TableHead>Independência</TableHead>
                      <TableHead>Interpretação</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: OTAssessment) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{SCALE_LABELS[a.scaleType]}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{a.totalScore}/{a.maxTotalScore}</TableCell>
                        <TableCell className="min-w-36">
                          <IndependenceBar score={a.totalScore} max={a.maxTotalScore} />
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-sm">{a.interpretation}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.assessedBy}</TableCell>
                        <TableCell>{new Date(a.assessedAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma avaliação registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Planos de Reabilitação ─────────────────────────────────── */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{plansData?.total ?? 0} planos</p>
            <Button onClick={() => setPlanOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          </div>

          {plansLoading ? <PageLoading /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {plansData?.data && plansData.data.length > 0 ? plansData.data.map((plan: RehabPlan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{plan.patientName}</CardTitle>
                      <Badge className={cn('text-xs', PLAN_STATUS_COLORS[plan.status])}>
                        {PLAN_STATUS_LABELS[plan.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.frequency} · {plan.duration}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Objetivos</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.objectives.map((obj, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{obj}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Atividades</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.activities.map((act, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{act}</Badge>
                        ))}
                      </div>
                    </div>
                    {plan.adaptations && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Adaptações:</span> {plan.adaptations}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Criado em: {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 text-center text-muted-foreground py-10">
                  Nenhum plano de reabilitação cadastrado.
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Avaliação ─────────────────────────────────────────── */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Funcional</DialogTitle>
            <DialogDescription>Aplique uma escala de independência para AVDs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={assessmentForm.patientId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID do Atendimento</Label>
                <Input placeholder="UUID" value={assessmentForm.encounterId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, encounterId: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Escala *</Label>
              <Select value={assessmentForm.scaleType}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, scaleType: v as ScaleType }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a escala" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCALE_LABELS) as ScaleType[]).map((k) => (
                    <SelectItem key={k} value={k}>{SCALE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Objetivos do Tratamento</Label>
              <Input placeholder="Ex: Ganho de independência no autocuidado" value={assessmentForm.goals}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, goals: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessmentOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAssessment} disabled={createAssessment.isPending}>
              {createAssessment.isPending ? 'Salvando...' : 'Registrar Avaliação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Novo Plano ────────────────────────────────────────────── */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Plano de Reabilitação Ocupacional</DialogTitle>
            <DialogDescription>Defina as metas e atividades terapêuticas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={planForm.patientId}
                  onChange={(e) => setPlanForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID da Avaliação *</Label>
                <Input placeholder="UUID da avaliação" value={planForm.assessmentId}
                  onChange={(e) => setPlanForm((p) => ({ ...p, assessmentId: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Objetivos (separados por vírgula)</Label>
              <Input placeholder="Independência no banho, Uso de talheres" value={planForm.objectives}
                onChange={(e) => setPlanForm((p) => ({ ...p, objectives: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Atividades (separadas por vírgula)</Label>
              <Input placeholder="Treino de AVDs, Coordenação fina" value={planForm.activities}
                onChange={(e) => setPlanForm((p) => ({ ...p, activities: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Frequência *</Label>
                <Input placeholder="3x/semana" value={planForm.frequency}
                  onChange={(e) => setPlanForm((p) => ({ ...p, frequency: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Duração *</Label>
                <Input placeholder="4 semanas" value={planForm.duration}
                  onChange={(e) => setPlanForm((p) => ({ ...p, duration: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Adaptações / Órteses</Label>
              <Input placeholder="Bengala, Órtese de punho" value={planForm.adaptations}
                onChange={(e) => setPlanForm((p) => ({ ...p, adaptations: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePlan} disabled={createPlan.isPending}>
              {createPlan.isPending ? 'Salvando...' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
