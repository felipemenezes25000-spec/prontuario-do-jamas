import { useState } from 'react';
import { HeartHandshake, ClipboardList, Send, Plus } from 'lucide-react';
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
  useSocialAssessments,
  useCreateSocialAssessment,
  useSocialReferrals,
  useCreateReferral,
  useUpdateReferralStatus,
  type VulnerabilityLevel,
  type ReferralStatus,
  type SocialAssessment,
  type SocialReferral,
} from '@/services/social-work.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const VULN_COLORS: Record<VulnerabilityLevel, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500',
};

const VULN_LABELS: Record<VulnerabilityLevel, string> = {
  LOW: 'Baixa',
  MODERATE: 'Moderada',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const REFERRAL_STATUS_COLORS: Record<ReferralStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-slate-500/20 text-slate-400',
};

const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SocialWorkPage() {
  const [activeTab, setActiveTab] = useState('assessments');

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    housingStatus: '',
    employmentStatus: '',
    familySupport: '',
    incomeRange: '',
    healthInsurance: '',
    vulnerabilityLevel: '' as VulnerabilityLevel,
    vulnerabilityIndicators: '',
    socialNetwork: '',
    notes: '',
  });

  const [referralOpen, setReferralOpen] = useState(false);
  const [referralForm, setReferralForm] = useState({
    patientId: '',
    assessmentId: '',
    referralType: '',
    destination: '',
    reason: '',
    notes: '',
  });

  const { data: assessmentsData, isLoading: assessmentsLoading } = useSocialAssessments();
  const { data: referralsData, isLoading: referralsLoading } = useSocialReferrals();
  const createAssessment = useCreateSocialAssessment();
  const createReferral = useCreateReferral();
  const updateStatus = useUpdateReferralStatus();

  const handleCreateAssessment = async () => {
    if (!assessmentForm.patientId || !assessmentForm.vulnerabilityLevel || !assessmentForm.housingStatus) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAssessment.mutateAsync({
        patientId: assessmentForm.patientId,
        encounterId: assessmentForm.encounterId,
        housingStatus: assessmentForm.housingStatus,
        employmentStatus: assessmentForm.employmentStatus,
        familySupport: assessmentForm.familySupport,
        incomeRange: assessmentForm.incomeRange,
        healthInsurance: assessmentForm.healthInsurance,
        vulnerabilityLevel: assessmentForm.vulnerabilityLevel,
        vulnerabilityIndicators: assessmentForm.vulnerabilityIndicators.split(',').map((v) => v.trim()).filter(Boolean),
        socialNetwork: assessmentForm.socialNetwork,
        notes: assessmentForm.notes,
      });
      toast.success('Avaliação social registrada com sucesso.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', housingStatus: '', employmentStatus: '', familySupport: '', incomeRange: '', healthInsurance: '', vulnerabilityLevel: '' as VulnerabilityLevel, vulnerabilityIndicators: '', socialNetwork: '', notes: '' });
    } catch {
      toast.error('Erro ao registrar avaliação social.');
    }
  };

  const handleCreateReferral = async () => {
    if (!referralForm.patientId || !referralForm.referralType || !referralForm.destination || !referralForm.reason) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createReferral.mutateAsync({
        patientId: referralForm.patientId,
        assessmentId: referralForm.assessmentId,
        referralType: referralForm.referralType,
        destination: referralForm.destination,
        reason: referralForm.reason,
        notes: referralForm.notes,
      });
      toast.success('Encaminhamento criado com sucesso.');
      setReferralOpen(false);
      setReferralForm({ patientId: '', assessmentId: '', referralType: '', destination: '', reason: '', notes: '' });
    } catch {
      toast.error('Erro ao criar encaminhamento.');
    }
  };

  const handleUpdateStatus = async (id: string, status: ReferralStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success('Status atualizado.');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-primary" />
          Serviço Social
        </h1>
        <p className="text-muted-foreground">
          Avaliações socioeconômicas, vulnerabilidade e encaminhamentos sociais
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Avaliações Sociais
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Encaminhamentos
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Avaliações Sociais ─────────────────────────────────────── */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{assessmentsData?.total ?? 0} avaliações</p>
            <Button onClick={() => setAssessmentOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação Social
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Avaliações Socioeconômicas</CardTitle></CardHeader>
            <CardContent>
              {assessmentsLoading ? <PageLoading /> : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Moradia</TableHead>
                      <TableHead>Emprego</TableHead>
                      <TableHead>Plano de Saúde</TableHead>
                      <TableHead>Vulnerabilidade</TableHead>
                      <TableHead>Indicadores</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: SocialAssessment) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell className="text-sm">{a.housingStatus}</TableCell>
                        <TableCell className="text-sm">{a.employmentStatus}</TableCell>
                        <TableCell className="text-sm">{a.healthInsurance}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', VULN_COLORS[a.vulnerabilityLevel])}>
                            {VULN_LABELS[a.vulnerabilityLevel]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {a.vulnerabilityIndicators.slice(0, 2).map((ind, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{ind}</Badge>
                            ))}
                            {a.vulnerabilityIndicators.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{a.vulnerabilityIndicators.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.assessedBy}</TableCell>
                        <TableCell>{new Date(a.assessedAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma avaliação social registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Encaminhamentos ────────────────────────────────────────── */}
        <TabsContent value="referrals" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as ReferralStatus[]).map((s) => (
                <Badge key={s} className={cn('text-xs', REFERRAL_STATUS_COLORS[s])}>
                  {REFERRAL_STATUS_LABELS[s]}: {referralsData?.data?.filter((r: SocialReferral) => r.status === s).length ?? 0}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setReferralOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Encaminhamento
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Encaminhamentos Sociais ({referralsData?.total ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {referralsLoading ? <PageLoading /> : referralsData?.data && referralsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado por</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralsData.data.map((r: SocialReferral) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.patientName}</TableCell>
                        <TableCell className="text-sm">{r.referralType}</TableCell>
                        <TableCell className="text-sm">{r.destination}</TableCell>
                        <TableCell className="max-w-40 truncate text-sm">{r.reason}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', REFERRAL_STATUS_COLORS[r.status])}>
                            {REFERRAL_STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.createdBy}</TableCell>
                        <TableCell>{new Date(r.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          {r.status === 'PENDING' && (
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={() => handleUpdateStatus(r.id, 'IN_PROGRESS')}
                              disabled={updateStatus.isPending}>
                              Iniciar
                            </Button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-400"
                              onClick={() => handleUpdateStatus(r.id, 'COMPLETED')}
                              disabled={updateStatus.isPending}>
                              Concluir
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhum encaminhamento registrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Avaliação Social ─────────────────────────────────── */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Social</DialogTitle>
            <DialogDescription>Registre a situação socioeconômica do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={assessmentForm.patientId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nível de Vulnerabilidade *</Label>
                <Select value={assessmentForm.vulnerabilityLevel}
                  onValueChange={(v) => setAssessmentForm((p) => ({ ...p, vulnerabilityLevel: v as VulnerabilityLevel }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MODERATE">Moderada</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Situação de Moradia *</Label>
                <Input placeholder="Própria, Alugada, Abrigo" value={assessmentForm.housingStatus}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, housingStatus: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Situação de Emprego</Label>
                <Input placeholder="Empregado, Desempregado" value={assessmentForm.employmentStatus}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, employmentStatus: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Apoio Familiar</Label>
                <Input placeholder="Presente, Ausente, Parcial" value={assessmentForm.familySupport}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, familySupport: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Faixa de Renda</Label>
                <Input placeholder="Até 1 SM, 1–3 SM" value={assessmentForm.incomeRange}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, incomeRange: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Plano de Saúde</Label>
              <Input placeholder="SUS, Particular, Convênio" value={assessmentForm.healthInsurance}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, healthInsurance: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Indicadores de Vulnerabilidade (separados por vírgula)</Label>
              <Input placeholder="Violência doméstica, Uso de drogas" value={assessmentForm.vulnerabilityIndicators}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, vulnerabilityIndicators: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Observações adicionais" value={assessmentForm.notes}
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

      {/* ── Dialog: Novo Encaminhamento ───────────────────────────────────── */}
      <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Encaminhamento Social</DialogTitle>
            <DialogDescription>Registre o encaminhamento do paciente para serviço externo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={referralForm.patientId}
                  onChange={(e) => setReferralForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID da Avaliação</Label>
                <Input placeholder="UUID da avaliação" value={referralForm.assessmentId}
                  onChange={(e) => setReferralForm((p) => ({ ...p, assessmentId: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Encaminhamento *</Label>
                <Input placeholder="CAPS, CRAS, Abrigo" value={referralForm.referralType}
                  onChange={(e) => setReferralForm((p) => ({ ...p, referralType: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Destino *</Label>
                <Input placeholder="Nome da instituição" value={referralForm.destination}
                  onChange={(e) => setReferralForm((p) => ({ ...p, destination: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Input placeholder="Descreva o motivo do encaminhamento" value={referralForm.reason}
                onChange={(e) => setReferralForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Informações adicionais" value={referralForm.notes}
                onChange={(e) => setReferralForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferralOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateReferral} disabled={createReferral.isPending}>
              {createReferral.isPending ? 'Salvando...' : 'Criar Encaminhamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
