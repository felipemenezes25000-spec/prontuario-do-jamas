import { useState } from 'react';
import { Activity, ClipboardList, Timer, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageLoading } from '@/components/common/page-loading';
import {
  usePhysioAssessments,
  useCreatePhysioAssessment,
  useRehabPlans,
  usePhysioSessions,
  useCreatePhysioSession,
  type PhysioAssessment,
  type RehabPlan,
  type PhysioSession,
} from '@/services/physiotherapy.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

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

function PainBadge({ value }: { value: number }) {
  const color =
    value <= 3 ? 'bg-emerald-500/20 text-emerald-400' :
    value <= 6 ? 'bg-yellow-500/20 text-yellow-400' :
    'bg-red-500/20 text-red-400';
  return <Badge className={cn('text-xs', color)}>{value}/10</Badge>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhysiotherapyPage() {
  const [activeTab, setActiveTab] = useState('assessments');

  // Assessment dialog
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    diagnosis: '',
    functionalCapacity: '',
    painScale: '',
    goals: '',
  });

  // Session dialog
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    patientId: '',
    planId: '',
    exercisesPerformed: '',
    evolution: '',
    painBefore: '',
    painAfter: '',
    duration: '',
  });

  const { data: assessmentsData, isLoading: assessmentsLoading } = usePhysioAssessments();
  const { data: plansData, isLoading: plansLoading } = useRehabPlans();
  const { data: sessionsData, isLoading: sessionsLoading } = usePhysioSessions();
  const createAssessment = useCreatePhysioAssessment();
  const createSession = useCreatePhysioSession();

  const handleCreateAssessment = async () => {
    if (!assessmentForm.patientId || !assessmentForm.diagnosis || !assessmentForm.painScale) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAssessment.mutateAsync({
        patientId: assessmentForm.patientId,
        encounterId: assessmentForm.encounterId,
        diagnosis: assessmentForm.diagnosis,
        muscleGroups: [],
        functionalCapacity: assessmentForm.functionalCapacity,
        painScale: Number(assessmentForm.painScale),
        goals: assessmentForm.goals,
      });
      toast.success('Avaliação fisioterapêutica registrada.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', diagnosis: '', functionalCapacity: '', painScale: '', goals: '' });
    } catch {
      toast.error('Erro ao registrar avaliação.');
    }
  };

  const handleCreateSession = async () => {
    if (!sessionForm.patientId || !sessionForm.planId || !sessionForm.evolution) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createSession.mutateAsync({
        patientId: sessionForm.patientId,
        planId: sessionForm.planId,
        exercisesPerformed: sessionForm.exercisesPerformed.split(',').map((e) => e.trim()).filter(Boolean),
        evolution: sessionForm.evolution,
        painBefore: Number(sessionForm.painBefore),
        painAfter: Number(sessionForm.painAfter),
        duration: Number(sessionForm.duration),
      });
      toast.success('Sessão registrada com sucesso.');
      setSessionOpen(false);
      setSessionForm({ patientId: '', planId: '', exercisesPerformed: '', evolution: '', painBefore: '', painAfter: '', duration: '' });
    } catch {
      toast.error('Erro ao registrar sessão.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Fisioterapia
        </h1>
        <p className="text-muted-foreground">
          Avaliações funcionais, planos de reabilitação e controle de sessões
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Planos Terapêuticos
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Sessões
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Avaliações ──────────────────────────────────────────────── */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{assessmentsData?.total ?? 0} avaliações</p>
            <Button onClick={() => setAssessmentOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Avaliações Fisioterapêuticas</CardTitle></CardHeader>
            <CardContent>
              {assessmentsLoading ? <PageLoading /> : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Capacidade Funcional</TableHead>
                      <TableHead>Dor (EVA)</TableHead>
                      <TableHead>Objetivos</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: PhysioAssessment) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell className="max-w-40 truncate">{a.diagnosis}</TableCell>
                        <TableCell className="max-w-36 truncate">{a.functionalCapacity}</TableCell>
                        <TableCell><PainBadge value={a.painScale} /></TableCell>
                        <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{a.goals}</TableCell>
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

        {/* ── Tab 2: Planos Terapêuticos ────────────────────────────────────── */}
        <TabsContent value="plans" className="space-y-4">
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
                    <p className="text-xs text-muted-foreground">Freq: {plan.frequency} · Duração: {plan.duration}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Exercícios</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.exercises.map((ex, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{ex}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{plan.goals}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado em: {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 text-center text-muted-foreground py-10">
                  Nenhum plano terapêutico cadastrado.
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Sessões ────────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{sessionsData?.total ?? 0} sessões realizadas</p>
            <Button onClick={() => setSessionOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Sessão
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Histórico de Sessões</CardTitle></CardHeader>
            <CardContent>
              {sessionsLoading ? <PageLoading /> : sessionsData?.data && sessionsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Dor Antes</TableHead>
                      <TableHead>Dor Depois</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Terapeuta</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsData.data.map((s: PhysioSession) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.patientName}</TableCell>
                        <TableCell className="max-w-48 truncate text-sm">{s.evolution}</TableCell>
                        <TableCell><PainBadge value={s.painBefore} /></TableCell>
                        <TableCell><PainBadge value={s.painAfter} /></TableCell>
                        <TableCell>{s.duration} min</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.therapist}</TableCell>
                        <TableCell>{new Date(s.date).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma sessão registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Avaliação ─────────────────────────────────────────── */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Fisioterapêutica</DialogTitle>
            <DialogDescription>Registre a avaliação funcional do paciente.</DialogDescription>
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
              <Label>Diagnóstico Fisioterapêutico *</Label>
              <Input placeholder="Ex: Hemiplegia D, Lombalgia crônica" value={assessmentForm.diagnosis}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, diagnosis: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Capacidade Funcional</Label>
              <Input placeholder="Ex: Independente, Dependente parcial" value={assessmentForm.functionalCapacity}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, functionalCapacity: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Escala de Dor EVA (0–10) *</Label>
              <Input type="number" min="0" max="10" placeholder="0" value={assessmentForm.painScale}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, painScale: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Objetivos do Tratamento</Label>
              <Input placeholder="Ex: Ganho de força, Marcha independente" value={assessmentForm.goals}
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

      {/* ── Dialog: Registrar Sessão ──────────────────────────────────────── */}
      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Sessão</DialogTitle>
            <DialogDescription>Registre a evolução da sessão de fisioterapia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={sessionForm.patientId}
                  onChange={(e) => setSessionForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID do Plano *</Label>
                <Input placeholder="UUID do plano" value={sessionForm.planId}
                  onChange={(e) => setSessionForm((p) => ({ ...p, planId: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Exercícios Realizados (separados por vírgula)</Label>
              <Input placeholder="Cinesioterapia, Eletroterapia" value={sessionForm.exercisesPerformed}
                onChange={(e) => setSessionForm((p) => ({ ...p, exercisesPerformed: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Evolução *</Label>
              <Input placeholder="Descreva a evolução da sessão" value={sessionForm.evolution}
                onChange={(e) => setSessionForm((p) => ({ ...p, evolution: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Dor Antes (0–10)</Label>
                <Input type="number" min="0" max="10" value={sessionForm.painBefore}
                  onChange={(e) => setSessionForm((p) => ({ ...p, painBefore: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Dor Depois (0–10)</Label>
                <Input type="number" min="0" max="10" value={sessionForm.painAfter}
                  onChange={(e) => setSessionForm((p) => ({ ...p, painAfter: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Duração (min)</Label>
                <Input type="number" placeholder="45" value={sessionForm.duration}
                  onChange={(e) => setSessionForm((p) => ({ ...p, duration: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSession} disabled={createSession.isPending}>
              {createSession.isPending ? 'Salvando...' : 'Registrar Sessão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
