import { useState } from 'react';
import { Salad, ClipboardList, Plus, Scale } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import {
  useNutritionalAssessments,
  useCreateAssessment,
  useDietPlans,
  useCreateDietPlan,
  type ScreeningTool,
  type NutritionalRisk,
  type NutritionalAssessment,
  type DietPlan,
} from '@/services/nutrition.service';
import { cn } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_LABELS: Record<NutritionalRisk, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
};

const RISK_COLORS: Record<NutritionalRisk, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-red-500/20 text-red-400 border-red-500',
};

const STATUS_LABELS: Record<DietPlan['status'], string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  COMPLETED: 'Concluído',
};

const STATUS_COLORS: Record<DietPlan['status'], string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  SUSPENDED: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-slate-500/20 text-slate-400',
};

const SCREENING_TOOLS: ScreeningTool[] = ['MNA', 'NRS_2002', 'MUST', 'SGA'];

const TOOL_LABELS: Record<ScreeningTool, string> = {
  MNA: 'MNA (Mini Nutritional Assessment)',
  NRS_2002: 'NRS-2002 (Nutritional Risk Screening)',
  MUST: 'MUST (Malnutrition Universal Screening)',
  SGA: 'SGA (Subjective Global Assessment)',
};

// ─── BMI Helper ─────────────────────────────────────────────────────────────

function getBmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Baixo peso', color: 'text-blue-400' };
  if (bmi < 25) return { label: 'Peso normal', color: 'text-emerald-400' };
  if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-400' };
  return { label: 'Obesidade', color: 'text-red-400' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState('assessments');

  // Assessment dialog
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    screeningTool: '' as ScreeningTool,
    score: '',
    weight: '',
    height: '',
    notes: '',
  });

  // Diet plan dialog
  const [dietPlanOpen, setDietPlanOpen] = useState(false);
  const [dietPlanForm, setDietPlanForm] = useState({
    patientId: '',
    encounterId: '',
    dietType: '',
    calories: '',
    restrictions: '',
    mealPlan: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });

  // Data hooks
  const { data: assessmentsData, isLoading: assessmentsLoading } = useNutritionalAssessments();
  const { data: dietPlansData, isLoading: dietPlansLoading } = useDietPlans();
  const createAssessment = useCreateAssessment();
  const createDietPlan = useCreateDietPlan();

  const handleCreateAssessment = async () => {
    if (!assessmentForm.patientId || !assessmentForm.screeningTool || !assessmentForm.weight || !assessmentForm.height) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAssessment.mutateAsync({
        patientId: assessmentForm.patientId,
        encounterId: assessmentForm.encounterId,
        screeningTool: assessmentForm.screeningTool,
        score: Number(assessmentForm.score),
        weight: Number(assessmentForm.weight),
        height: Number(assessmentForm.height),
        notes: assessmentForm.notes,
      });
      toast.success('Avaliação nutricional registrada com sucesso.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', screeningTool: '' as ScreeningTool, score: '', weight: '', height: '', notes: '' });
    } catch {
      toast.error('Erro ao registrar avaliação nutricional.');
    }
  };

  const handleCreateDietPlan = async () => {
    if (!dietPlanForm.patientId || !dietPlanForm.dietType || !dietPlanForm.calories) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createDietPlan.mutateAsync({
        patientId: dietPlanForm.patientId,
        encounterId: dietPlanForm.encounterId,
        dietType: dietPlanForm.dietType,
        calories: Number(dietPlanForm.calories),
        restrictions: dietPlanForm.restrictions.split(',').map((r) => r.trim()).filter(Boolean),
        mealPlan: dietPlanForm.mealPlan,
        startDate: dietPlanForm.startDate,
        endDate: dietPlanForm.endDate || undefined,
      });
      toast.success('Plano dietético criado com sucesso.');
      setDietPlanOpen(false);
      setDietPlanForm({ patientId: '', encounterId: '', dietType: '', calories: '', restrictions: '', mealPlan: '', startDate: new Date().toISOString().slice(0, 10), endDate: '' });
    } catch {
      toast.error('Erro ao criar plano dietético.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Salad className="h-6 w-6 text-primary" />
          Nutrição Clínica
        </h1>
        <p className="text-muted-foreground">
          Avaliações nutricionais e planos dietéticos dos pacientes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Avaliações Nutricionais
          </TabsTrigger>
          <TabsTrigger value="diet-plans" className="flex items-center gap-2">
            <Salad className="h-4 w-4" />
            Planos Dietéticos
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Avaliações ─────────────────────────────────────────────── */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {assessmentsData?.total ?? 0} avaliações registradas
            </p>
            <Button onClick={() => setAssessmentOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Avaliações Nutricionais</CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentsLoading ? (
                <PageLoading />
              ) : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Ferramenta</TableHead>
                      <TableHead>Pontuação</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>IMC</TableHead>
                      <TableHead>Categoria IMC</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: NutritionalAssessment) => {
                      const bmiCat = getBmiCategory(a.bmi);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.patientName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {a.screeningTool.replace('_', '-')}
                            </Badge>
                          </TableCell>
                          <TableCell>{a.score}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', RISK_COLORS[a.risk])}>
                              {RISK_LABELS[a.risk]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn('font-semibold', bmiCat.color)}>
                              {a.bmi.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className={cn('text-xs', bmiCat.color)}>{bmiCat.label}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.assessedBy}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(a.assessedAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">
                  Nenhuma avaliação nutricional registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Planos Dietéticos ──────────────────────────────────────── */}
        <TabsContent value="diet-plans" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {dietPlansData?.total ?? 0} planos cadastrados
            </p>
            <Button onClick={() => setDietPlanOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Plano Dietético
            </Button>
          </div>

          {dietPlansLoading ? (
            <PageLoading />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dietPlansData?.data && dietPlansData.data.length > 0 ? (
                dietPlansData.data.map((plan: DietPlan) => (
                  <Card key={plan.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{plan.patientName}</CardTitle>
                        <Badge className={cn('text-xs', STATUS_COLORS[plan.status])}>
                          {STATUS_LABELS[plan.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.dietType}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{plan.calories} kcal/dia</span>
                      </div>
                      {plan.restrictions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {plan.restrictions.map((r) => (
                            <Badge key={r} variant="outline" className="text-xs">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{plan.mealPlan}</p>
                      <p className="text-xs text-muted-foreground">
                        Início: {new Date(plan.startDate).toLocaleDateString('pt-BR')}
                        {plan.endDate && ` · Fim: ${new Date(plan.endDate).toLocaleDateString('pt-BR')}`}
                      </p>
                      <p className="text-xs text-muted-foreground">Por: {plan.createdBy}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center text-muted-foreground py-10">
                  Nenhum plano dietético cadastrado.
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
            <DialogTitle>Nova Avaliação Nutricional</DialogTitle>
            <DialogDescription>Registre uma avaliação nutricional do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID do paciente" value={assessmentForm.patientId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID do Atendimento</Label>
                <Input placeholder="UUID do atendimento" value={assessmentForm.encounterId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, encounterId: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ferramenta de Triagem *</Label>
              <Select value={assessmentForm.screeningTool}
                onValueChange={(v) => setAssessmentForm((p) => ({ ...p, screeningTool: v as ScreeningTool }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a ferramenta" /></SelectTrigger>
                <SelectContent>
                  {SCREENING_TOOLS.map((t) => (
                    <SelectItem key={t} value={t}>{TOOL_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Pontuação</Label>
                <Input type="number" placeholder="Score" value={assessmentForm.score}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, score: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Peso (kg) *</Label>
                <Input type="number" placeholder="70" value={assessmentForm.weight}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, weight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Altura (cm) *</Label>
                <Input type="number" placeholder="170" value={assessmentForm.height}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, height: e.target.value }))} />
              </div>
            </div>
            {assessmentForm.weight && assessmentForm.height && (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                IMC calculado:{' '}
                <span className={cn('font-bold', getBmiCategory(
                  Number(assessmentForm.weight) / Math.pow(Number(assessmentForm.height) / 100, 2)
                ).color)}>
                  {(Number(assessmentForm.weight) / Math.pow(Number(assessmentForm.height) / 100, 2)).toFixed(1)}
                </span>
                {' — '}
                {getBmiCategory(Number(assessmentForm.weight) / Math.pow(Number(assessmentForm.height) / 100, 2)).label}
              </div>
            )}
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Observações clínicas" value={assessmentForm.notes}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, notes: e.target.value }))} />
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

      {/* ── Dialog: Novo Plano Dietético ──────────────────────────────────── */}
      <Dialog open={dietPlanOpen} onOpenChange={setDietPlanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Plano Dietético</DialogTitle>
            <DialogDescription>Prescreva um plano alimentar para o paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID do paciente" value={dietPlanForm.patientId}
                  onChange={(e) => setDietPlanForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID do Atendimento</Label>
                <Input placeholder="UUID do atendimento" value={dietPlanForm.encounterId}
                  onChange={(e) => setDietPlanForm((p) => ({ ...p, encounterId: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Dieta *</Label>
                <Input placeholder="Ex: Hipossódica, Líquida" value={dietPlanForm.dietType}
                  onChange={(e) => setDietPlanForm((p) => ({ ...p, dietType: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Calorias (kcal/dia) *</Label>
                <Input type="number" placeholder="2000" value={dietPlanForm.calories}
                  onChange={(e) => setDietPlanForm((p) => ({ ...p, calories: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Restrições (separadas por vírgula)</Label>
              <Input placeholder="Glúten, Lactose, Sódio" value={dietPlanForm.restrictions}
                onChange={(e) => setDietPlanForm((p) => ({ ...p, restrictions: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Plano de Refeições</Label>
              <Input placeholder="Descreva as refeições e horários" value={dietPlanForm.mealPlan}
                onChange={(e) => setDietPlanForm((p) => ({ ...p, mealPlan: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Início *</Label>
                <Input type="date" value={dietPlanForm.startDate}
                  onChange={(e) => setDietPlanForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data de Término</Label>
                <Input type="date" value={dietPlanForm.endDate}
                  onChange={(e) => setDietPlanForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDietPlanOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateDietPlan} disabled={createDietPlan.isPending}>
              {createDietPlan.isPending ? 'Salvando...' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
