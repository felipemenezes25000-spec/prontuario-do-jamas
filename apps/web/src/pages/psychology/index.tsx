import { useState } from 'react';
import { Brain, ClipboardList, Users, AlertTriangle, Plus } from 'lucide-react';
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
  usePsychAssessments,
  useCreatePsychAssessment,
  usePsychSessions,
  useCreatePsychSession,
  useSuicideRiskAssessments,
  useCreateRiskAssessment,
  type ScaleType,
  type RiskLevel,
  type PsychologicalAssessment,
  type PsychSession,
  type SuicideRiskAssessment,
} from '@/services/psychology.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCALE_LABELS: Record<ScaleType, string> = {
  PHQ9: 'PHQ-9 (Depressão)',
  GAD7: 'GAD-7 (Ansiedade)',
  BDI: 'BDI (Inventário Beck — Depressão)',
  BAI: 'BAI (Inventário Beck — Ansiedade)',
  MINI: 'MINI (Entrevista Neuropsiquiátrica)',
  WHOQOL: 'WHOQOL (Qualidade de Vida)',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

const SESSION_TYPE_LABELS: Record<PsychSession['type'], string> = {
  INDIVIDUAL: 'Individual',
  GROUP: 'Grupo',
  FAMILY: 'Família',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PsychologyPage() {
  const [activeTab, setActiveTab] = useState('assessments');

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    scaleType: '' as ScaleType,
    notes: '',
  });

  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    patientId: '',
    encounterId: '',
    type: '' as PsychSession['type'],
    topics: '',
    notes: '',
    moodBefore: '',
    moodAfter: '',
    nextSessionPlan: '',
    duration: '',
  });

  const [riskOpen, setRiskOpen] = useState(false);
  const [riskForm, setRiskForm] = useState({
    patientId: '',
    encounterId: '',
    riskLevel: '' as RiskLevel,
    riskFactors: '',
    protectiveFactors: '',
    plan: '',
    safetyPlan: '',
  });

  const { data: assessmentsData, isLoading: assessmentsLoading } = usePsychAssessments();
  const { data: sessionsData, isLoading: sessionsLoading } = usePsychSessions();
  const { data: riskData, isLoading: riskLoading } = useSuicideRiskAssessments();
  const createAssessment = useCreatePsychAssessment();
  const createSession = useCreatePsychSession();
  const createRisk = useCreateRiskAssessment();

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
        responses: [],
        notes: assessmentForm.notes,
      });
      toast.success('Avaliação psicológica registrada.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', scaleType: '' as ScaleType, notes: '' });
    } catch {
      toast.error('Erro ao registrar avaliação.');
    }
  };

  const handleCreateSession = async () => {
    if (!sessionForm.patientId || !sessionForm.type || !sessionForm.notes) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createSession.mutateAsync({
        patientId: sessionForm.patientId,
        encounterId: sessionForm.encounterId,
        type: sessionForm.type,
        topics: sessionForm.topics.split(',').map((t) => t.trim()).filter(Boolean),
        notes: sessionForm.notes,
        moodBefore: Number(sessionForm.moodBefore),
        moodAfter: Number(sessionForm.moodAfter),
        nextSessionPlan: sessionForm.nextSessionPlan,
        duration: Number(sessionForm.duration),
      });
      toast.success('Sessão registrada com sucesso.');
      setSessionOpen(false);
      setSessionForm({ patientId: '', encounterId: '', type: '' as PsychSession['type'], topics: '', notes: '', moodBefore: '', moodAfter: '', nextSessionPlan: '', duration: '' });
    } catch {
      toast.error('Erro ao registrar sessão.');
    }
  };

  const handleCreateRisk = async () => {
    if (!riskForm.patientId || !riskForm.riskLevel || !riskForm.plan || !riskForm.safetyPlan) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createRisk.mutateAsync({
        patientId: riskForm.patientId,
        encounterId: riskForm.encounterId,
        riskLevel: riskForm.riskLevel,
        riskFactors: riskForm.riskFactors.split(',').map((r) => r.trim()).filter(Boolean),
        protectiveFactors: riskForm.protectiveFactors.split(',').map((r) => r.trim()).filter(Boolean),
        plan: riskForm.plan,
        safetyPlan: riskForm.safetyPlan,
      });
      toast.success('Avaliação de risco registrada.');
      setRiskOpen(false);
      setRiskForm({ patientId: '', encounterId: '', riskLevel: '' as RiskLevel, riskFactors: '', protectiveFactors: '', plan: '', safetyPlan: '' });
    } catch {
      toast.error('Erro ao registrar avaliação de risco.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Psicologia
        </h1>
        <p className="text-muted-foreground">
          Avaliações psicométricas, sessões terapêuticas e avaliação de risco de suicídio
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Escalas Psicométricas
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risco de Suicídio
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
            <CardHeader><CardTitle>Avaliações Psicométricas</CardTitle></CardHeader>
            <CardContent>
              {assessmentsLoading ? <PageLoading /> : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Escala</TableHead>
                      <TableHead>Pontuação</TableHead>
                      <TableHead>Interpretação</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: PsychologicalAssessment) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{a.scaleType.replace(/(\d)/, '-$1')}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{a.score}</span>
                          <span className="text-muted-foreground text-xs">/{a.maxScore}</span>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm">{a.interpretation}</TableCell>
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

        {/* ── Tab 2: Sessões ────────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{sessionsData?.total ?? 0} sessões</p>
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
                      <TableHead>Sessão #</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Humor Antes</TableHead>
                      <TableHead>Humor Depois</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Terapeuta</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsData.data.map((s: PsychSession) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.patientName}</TableCell>
                        <TableCell>#{s.sessionNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{SESSION_TYPE_LABELS[s.type]}</Badge>
                        </TableCell>
                        <TableCell>{s.moodBefore}/10</TableCell>
                        <TableCell>
                          <span className={cn('font-semibold text-sm', s.moodAfter > s.moodBefore ? 'text-emerald-400' : s.moodAfter < s.moodBefore ? 'text-red-400' : 'text-muted-foreground')}>
                            {s.moodAfter}/10
                          </span>
                        </TableCell>
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

        {/* ── Tab 3: Risco de Suicídio ──────────────────────────────────────── */}
        <TabsContent value="risk" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((r) => (
                <Badge key={r} variant="outline" className={cn('text-xs', RISK_COLORS[r])}>
                  {RISK_LABELS[r]}: {riskData?.data?.filter((a: SuicideRiskAssessment) => a.riskLevel === r).length ?? 0}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setRiskOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação de Risco
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Avaliações de Risco de Suicídio</CardTitle></CardHeader>
            <CardContent>
              {riskLoading ? <PageLoading /> : riskData?.data && riskData.data.length > 0 ? (
                <div className="space-y-3">
                  {riskData.data.map((r: SuicideRiskAssessment) => (
                    <div key={r.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.patientName}</span>
                        <Badge variant="outline" className={cn('text-xs', RISK_COLORS[r.riskLevel])}>
                          Risco {RISK_LABELS[r.riskLevel]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Fatores de Risco</p>
                          <div className="flex flex-wrap gap-1">
                            {r.riskFactors.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-red-500/30 text-red-400">{f}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Fatores Protetores</p>
                          <div className="flex flex-wrap gap-1">
                            {r.protectiveFactors.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{f}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Avaliado por {r.assessedBy} em {new Date(r.assessedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma avaliação de risco registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Avaliação ─────────────────────────────────────────── */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Psicométrica</DialogTitle>
            <DialogDescription>Registre a aplicação de uma escala psicológica.</DialogDescription>
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
              <Label>Observações Clínicas</Label>
              <Input placeholder="Observações sobre a avaliação" value={assessmentForm.notes}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessmentOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAssessment} disabled={createAssessment.isPending}>
              {createAssessment.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Registrar Sessão ──────────────────────────────────────── */}
      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Sessão Terapêutica</DialogTitle>
            <DialogDescription>Documente a sessão de psicoterapia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={sessionForm.patientId}
                  onChange={(e) => setSessionForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Sessão *</Label>
                <Select value={sessionForm.type}
                  onValueChange={(v) => setSessionForm((p) => ({ ...p, type: v as PsychSession['type'] }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="GROUP">Grupo</SelectItem>
                    <SelectItem value="FAMILY">Família</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tópicos abordados (separados por vírgula)</Label>
              <Input placeholder="Ansiedade, Relações familiares" value={sessionForm.topics}
                onChange={(e) => setSessionForm((p) => ({ ...p, topics: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Evolução da sessão *</Label>
              <Input placeholder="Descreva a evolução" value={sessionForm.notes}
                onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Humor Antes (0–10)</Label>
                <Input type="number" min="0" max="10" value={sessionForm.moodBefore}
                  onChange={(e) => setSessionForm((p) => ({ ...p, moodBefore: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Humor Depois (0–10)</Label>
                <Input type="number" min="0" max="10" value={sessionForm.moodAfter}
                  onChange={(e) => setSessionForm((p) => ({ ...p, moodAfter: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Duração (min)</Label>
                <Input type="number" placeholder="50" value={sessionForm.duration}
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

      {/* ── Dialog: Nova Avaliação de Risco ──────────────────────────────── */}
      <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Avaliação de Risco de Suicídio</DialogTitle>
            <DialogDescription>Registre a avaliação de risco e o plano de segurança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={riskForm.patientId}
                  onChange={(e) => setRiskForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nível de Risco *</Label>
                <Select value={riskForm.riskLevel}
                  onValueChange={(v) => setRiskForm((p) => ({ ...p, riskLevel: v as RiskLevel }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixo</SelectItem>
                    <SelectItem value="MODERATE">Moderado</SelectItem>
                    <SelectItem value="HIGH">Alto</SelectItem>
                    <SelectItem value="CRITICAL">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fatores de Risco (separados por vírgula)</Label>
              <Input placeholder="Ideação ativa, Plano, Tentativa prévia" value={riskForm.riskFactors}
                onChange={(e) => setRiskForm((p) => ({ ...p, riskFactors: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fatores Protetores (separados por vírgula)</Label>
              <Input placeholder="Suporte familiar, Religiosidade" value={riskForm.protectiveFactors}
                onChange={(e) => setRiskForm((p) => ({ ...p, protectiveFactors: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Plano de Intervenção *</Label>
              <Input placeholder="Descreva o plano de manejo" value={riskForm.plan}
                onChange={(e) => setRiskForm((p) => ({ ...p, plan: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Plano de Segurança *</Label>
              <Input placeholder="Contatos de crise, remoção de meios" value={riskForm.safetyPlan}
                onChange={(e) => setRiskForm((p) => ({ ...p, safetyPlan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateRisk} disabled={createRisk.isPending}>
              {createRisk.isPending ? 'Salvando...' : 'Registrar Avaliação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
