import { useState } from 'react';
import {
  DoorOpen,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ClipboardCheck,
  Pill,
  Users,
  BedDouble,
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  useDischargeSummary,
  useActiveBarriers,
  useRoundingHistory,
  useCreateDischargeBarrier,
  useResolveBarrier,
  useBedAllocationSuggestion,
} from '@/services/discharge-planning.service';
import type { DischargeBarrier } from '@/services/discharge-planning.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const BARRIER_LABELS: Record<string, string> = {
  PENDING_TEST: 'Exame Pendente',
  PENDING_CONSULT: 'Consulta Pendente',
  SOCIAL_ISSUE: 'Questao Social',
  INSURANCE: 'Convenio/Seguro',
  FAMILY_READINESS: 'Familia',
  CLINICAL_INSTABILITY: 'Instabilidade Clinica',
  MEDICATION: 'Medicacao',
  EQUIPMENT: 'Equipamento',
  HOME_CARE: 'Home Care',
  OTHER: 'Outro',
};

const BARRIER_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-500/20 text-red-400 border-red-500/50',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
};

// ─── New Barrier Dialog ───────────────────────────────────────────────────

function NewBarrierDialog({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const create = useCreateDischargeBarrier();
  const [barrierType, setBarrierType] = useState('PENDING_TEST');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');

  const handleSubmit = () => {
    if (!description.trim()) { toast.error('Descreva a barreira.'); return; }
    create.mutate(
      { patientId, barrierType, description, responsiblePerson: responsible || undefined },
      {
        onSuccess: () => {
          toast.success('Barreira registrada!');
          onClose();
          setDescription('');
          setResponsible('');
        },
        onError: () => toast.error('Erro ao registrar barreira.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Barreira de Alta</DialogTitle>
          <DialogDescription>Registre o motivo que impede a alta do paciente</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Tipo de Barreira</Label>
            <Select value={barrierType} onValueChange={setBarrierType}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BARRIER_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descricao *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva a barreira..." className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Responsavel</Label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsavel" className="bg-zinc-950 border-zinc-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-red-600 hover:bg-red-700">
            {create.isPending ? 'Registrando...' : 'Registrar Barreira'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Barrier Card ─────────────────────────────────────────────────────────

function BarrierCard({ barrier, patientId }: { barrier: DischargeBarrier; patientId: string }) {
  const resolve = useResolveBarrier();
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState('');

  const handleResolve = () => {
    resolve.mutate(
      { barrierDocumentId: barrier.id, resolutionNotes: notes || undefined, patientId },
      {
        onSuccess: () => { toast.success('Barreira resolvida!'); setResolving(false); },
        onError: () => toast.error('Erro ao resolver barreira.'),
      },
    );
  };

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', barrier.status === 'ACTIVE' && 'border-red-500/30')}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className={BARRIER_COLORS[barrier.status] ?? BARRIER_COLORS.ACTIVE}>
              {barrier.status === 'RESOLVED' ? 'Resolvida' : barrier.status === 'IN_PROGRESS' ? 'Em andamento' : 'Ativa'}
            </Badge>
            <p className="font-medium text-sm mt-1">{BARRIER_LABELS[barrier.barrierType] ?? barrier.barrierType}</p>
          </div>
          {barrier.status !== 'RESOLVED' && (
            <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setResolving(true)}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
            </Button>
          )}
        </div>
        <p className="text-sm text-zinc-300">{barrier.description}</p>
        {barrier.responsiblePerson && <p className="text-xs text-zinc-500">Responsavel: {barrier.responsiblePerson}</p>}
        <p className="text-xs text-zinc-500">{formatDate(barrier.createdAt)}</p>

        {resolving && (
          <div className="mt-2 space-y-2 p-3 rounded bg-zinc-800">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observacoes da resolucao..." className="bg-zinc-950 border-zinc-700 text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleResolve} disabled={resolve.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                Confirmar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setResolving(false)} className="border-zinc-700">Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Checklist Card ───────────────────────────────────────────────────────

function ChecklistDisplay({ items, compliance, safeToDischarge }: { items: Record<string, boolean>; compliance: number; safeToDischarge: boolean }) {
  const labels: Record<string, string> = {
    medicationReconciliationDone: 'Reconciliacao medicamentosa realizada',
    dischargeInstructionsGiven: 'Orientacoes de alta entregues',
    followUpScheduled: 'Retorno agendado',
    pendingTestsReviewed: 'Exames pendentes revisados',
    patientEducationCompleted: 'Educacao do paciente concluida',
    transportArranged: 'Transporte providenciado',
    equipmentArranged: 'Equipamentos necessarios providenciados',
    homeCareReferralDone: 'Encaminhamento home care (se aplicavel)',
    primaryCarePhysicianNotified: 'Medico assistente notificado',
    dischargeSummaryCompleted: 'Sumario de alta completo',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 rounded-full bg-zinc-700">
            <div
              className={cn('h-2 rounded-full transition-all', compliance === 100 ? 'bg-emerald-500' : 'bg-yellow-500')}
              style={{ width: `${compliance}%` }}
            />
          </div>
          <span className="text-sm font-bold">{compliance}%</span>
        </div>
        <Badge variant="outline" className={cn(safeToDischarge ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50')}>
          {safeToDischarge ? 'Alta segura' : 'Alta nao segura'}
        </Badge>
      </div>
      <div className="space-y-1">
        {Object.entries(items).map(([key, done]) => (
          <div key={key} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800">
            {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-zinc-500 shrink-0" />}
            <span className={cn('text-sm', done ? 'text-zinc-400 line-through' : 'text-zinc-200')}>{labels[key] ?? key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function DischargePlanningPage() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [barrierDialog, setBarrierDialog] = useState(false);

  const { data: summary, isLoading } = useDischargeSummary(searchId);
  const { data: barriers = [] } = useActiveBarriers(searchId);
  const { data: rounds = [] } = useRoundingHistory(searchId);
  const bedAllocation = useBedAllocationSuggestion();

  const handleSearch = () => {
    if (!patientId.trim()) { toast.error('Informe o ID do paciente.'); return; }
    setSearchId(patientId.trim());
  };

  const handleBedSuggestion = () => {
    bedAllocation.mutate({}, {
      onSuccess: () => toast.success('Sugestao gerada!'),
      onError: () => toast.error('Erro ao gerar sugestao.'),
    });
  };

  const activeBarriersCount = barriers.length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Planejamento de Alta</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBedSuggestion} disabled={bedAllocation.isPending} className="border-zinc-700">
            <BedDouble className="h-4 w-4 mr-2" /> Sugestao de Leito (IA)
          </Button>
        </div>
      </div>

      {/* Patient Search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="ID do Paciente"
                className="bg-zinc-950 border-zinc-700"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">
              Carregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Bed Allocation Result */}
      {bedAllocation.data && (
        <Card className="bg-zinc-900 border-zinc-800 border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base">Sugestao IA de Alocacao de Leitos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded bg-zinc-800 p-3">
                <p className="text-xs text-zinc-400">Leitos Ocupados</p>
                <p className="text-2xl font-bold">{bedAllocation.data.totalOccupiedBeds}</p>
              </div>
              <div className="rounded bg-zinc-800 p-3">
                <p className="text-xs text-zinc-400">Alta Iminente</p>
                <p className="text-2xl font-bold text-emerald-400">{bedAllocation.data.patientsNearDischarge.length}</p>
              </div>
              <div className="rounded bg-zinc-800 p-3">
                <p className="text-xs text-zinc-400">Com Barreiras</p>
                <p className="text-2xl font-bold text-yellow-400">{bedAllocation.data.patientsWithBarriers}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-sm text-emerald-300">{bedAllocation.data.suggestion}</p>
            </div>
            {bedAllocation.data.patientsNearDischarge.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-medium">Pacientes com alta proxima:</p>
                {bedAllocation.data.patientsNearDischarge.slice(0, 5).map((p) => (
                  <div key={p.patientId} className="flex items-center justify-between p-2 rounded bg-zinc-800 text-sm">
                    <div>
                      <span className="font-medium">{p.patientName}</span>
                      <span className="text-zinc-400 ml-2">Leito {p.bed} - {p.ward}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/50">{p.dischargeReadiness}%</Badge>
                      {p.activeBarriers > 0 && <Badge variant="outline" className="text-yellow-400 border-yellow-500/50">{p.activeBarriers} barreiras</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && searchId && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      )}

      {searchId && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <ClipboardCheck className={cn('h-5 w-5', summary?.safeToDischarge ? 'text-emerald-400' : 'text-red-400')} />
                <div>
                  <p className="text-xs text-zinc-400">Checklist</p>
                  <p className="text-lg font-bold">{summary?.latestChecklist?.compliance ?? 0}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className={cn('h-5 w-5', activeBarriersCount > 0 ? 'text-red-400' : 'text-emerald-400')} />
                <div>
                  <p className="text-xs text-zinc-400">Barreiras Ativas</p>
                  <p className={cn('text-lg font-bold', activeBarriersCount > 0 && 'text-red-400')}>{activeBarriersCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-zinc-400">Rounds</p>
                  <p className="text-lg font-bold">{rounds.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className={cn('h-5 w-5', summary?.instructions ? 'text-emerald-400' : 'text-zinc-500')} />
                <div>
                  <p className="text-xs text-zinc-400">Orientacoes</p>
                  <p className="text-lg font-bold">{summary?.instructions ? 'Sim' : 'Nao'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="checklist">
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="checklist"><ClipboardCheck className="h-4 w-4 mr-1" /> Checklist</TabsTrigger>
              <TabsTrigger value="barriers"><AlertTriangle className="h-4 w-4 mr-1" /> Barreiras</TabsTrigger>
              <TabsTrigger value="instructions"><FileText className="h-4 w-4 mr-1" /> Orientacoes</TabsTrigger>
              <TabsTrigger value="prescription"><Pill className="h-4 w-4 mr-1" /> Prescricao Domiciliar</TabsTrigger>
              <TabsTrigger value="rounding"><Users className="h-4 w-4 mr-1" /> Rounds</TabsTrigger>
            </TabsList>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="mt-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Checklist de Alta Segura</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.latestChecklist ? (
                    <ChecklistDisplay
                      items={summary.latestChecklist.items}
                      compliance={summary.latestChecklist.compliance}
                      safeToDischarge={summary.latestChecklist.safeToDischarge}
                    />
                  ) : (
                    <p className="text-zinc-500 text-sm text-center py-6">Nenhum checklist de alta registrado</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Barriers Tab */}
            <TabsContent value="barriers" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setBarrierDialog(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="h-4 w-4 mr-2" /> Nova Barreira
                  </Button>
                </div>

                {/* Active Barriers */}
                {barriers.length === 0 ? (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="py-10 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-zinc-400">Nenhuma barreira ativa para alta</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {barriers.map((b) => <BarrierCard key={b.id} barrier={b} patientId={searchId} />)}
                  </div>
                )}

                {/* Resolved Barriers */}
                {summary?.resolvedBarriers && summary.resolvedBarriers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-zinc-400 font-medium mb-2">Barreiras Resolvidas ({summary.resolvedBarriers.length})</p>
                    <div className="space-y-2">
                      {summary.resolvedBarriers.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <div className="flex-1">
                            <span className="text-zinc-400 line-through">{b.description}</span>
                            {b.resolutionNotes && <p className="text-xs text-zinc-500 mt-1">{b.resolutionNotes}</p>}
                          </div>
                          <span className="text-xs text-zinc-500">{b.resolvedAt ? formatDate(b.resolvedAt) : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Instructions Tab */}
            <TabsContent value="instructions" className="mt-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Orientacoes de Alta</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.instructions ? (
                    <div className="space-y-4">
                      {/* Medications */}
                      <div>
                        <p className="text-sm font-medium text-emerald-400 mb-2">Medicamentos</p>
                        <div className="space-y-1">
                          {summary.instructions.medications.map((m, i) => (
                            <div key={i} className="p-2 rounded bg-zinc-800 text-sm">
                              <span className="font-medium">{m.name}</span> - {m.dose} - {m.frequency} - {m.duration}
                              {m.specialInstructions && <p className="text-xs text-zinc-400 mt-1">{m.specialInstructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Diet */}
                      <div>
                        <p className="text-sm font-medium text-emerald-400 mb-1">Dieta</p>
                        <p className="text-sm text-zinc-300 p-2 rounded bg-zinc-800">{summary.instructions.dietInstructions}</p>
                      </div>

                      {/* Activity */}
                      <div>
                        <p className="text-sm font-medium text-emerald-400 mb-1">Atividades</p>
                        <p className="text-sm text-zinc-300 p-2 rounded bg-zinc-800">{summary.instructions.activityRestrictions}</p>
                      </div>

                      {/* Warning Signs */}
                      <div>
                        <p className="text-sm font-medium text-red-400 mb-2">Sinais de Alerta - Procurar Emergencia</p>
                        <div className="space-y-1">
                          {summary.instructions.warningSigns.map((sign, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-red-500/10 border border-red-500/20">
                              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                              <span className="text-red-300">{sign}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Follow-up */}
                      <div>
                        <p className="text-sm font-medium text-emerald-400 mb-2">Retornos Agendados</p>
                        <div className="space-y-1">
                          {summary.instructions.followUpAppointments.map((apt, i) => (
                            <div key={i} className="p-2 rounded bg-zinc-800 text-sm">
                              <span className="font-medium">{apt.specialty}</span> - {apt.daysAfterDischarge} dias apos alta
                              {apt.location && <span className="text-zinc-400"> - {apt.location}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm text-center py-6">Nenhuma orientacao de alta registrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prescription Tab */}
            <TabsContent value="prescription" className="mt-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Prescricao Domiciliar</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.homePrescription ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded bg-zinc-800 p-3">
                          <p className="text-xs text-zinc-400">Total</p>
                          <p className="text-xl font-bold">{(summary.homePrescription as Record<string, number>).totalMedications ?? 0}</p>
                        </div>
                        <div className="rounded bg-zinc-800 p-3">
                          <p className="text-xs text-zinc-400">Uso Continuo</p>
                          <p className="text-xl font-bold text-blue-400">{(summary.homePrescription as Record<string, number>).continuousMedicationsCount ?? 0}</p>
                        </div>
                        <div className="rounded bg-zinc-800 p-3">
                          <p className="text-xs text-zinc-400">Temporario</p>
                          <p className="text-xl font-bold text-yellow-400">{(summary.homePrescription as Record<string, number>).temporaryMedicationsCount ?? 0}</p>
                        </div>
                      </div>
                      {Array.isArray((summary.homePrescription as Record<string, unknown>).medications) && (
                        <div className="space-y-1">
                          {((summary.homePrescription as Record<string, unknown>).medications as Array<Record<string, string>>).map((m, i) => (
                            <div key={i} className="p-2 rounded bg-zinc-800 text-sm flex items-center gap-2">
                              <Pill className="h-4 w-4 text-blue-400 shrink-0" />
                              <div>
                                <span className="font-medium">{m.name}</span> - {m.dose} - {m.frequency} ({m.route})
                                {m.continuousUse && <Badge variant="outline" className="ml-2 text-xs">Uso continuo</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm text-center py-6">Nenhuma prescricao domiciliar registrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rounding Tab */}
            <TabsContent value="rounding" className="mt-4">
              <div className="space-y-4">
                {rounds.length === 0 ? (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="py-10 text-center text-zinc-500">Nenhum round multidisciplinar registrado</CardContent>
                  </Card>
                ) : (
                  rounds.map((r) => (
                    <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Round Multidisciplinar</CardTitle>
                          <span className="text-xs text-zinc-500">{formatDate(r.roundedAt)}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Participants */}
                        <div>
                          <p className="text-xs text-zinc-400 mb-1">Participantes:</p>
                          <div className="flex flex-wrap gap-1">
                            {r.participants.map((p, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{p.name} ({p.role})</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Goals */}
                        <div>
                          <p className="text-xs text-zinc-400 mb-1">Metas do dia:</p>
                          <p className="text-sm text-zinc-300 p-2 rounded bg-zinc-800">{r.dailyGoals}</p>
                        </div>

                        {/* Pending Tasks */}
                        {r.pendingTasks.length > 0 && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Tarefas pendentes:</p>
                            <div className="space-y-1">
                              {r.pendingTasks.map((t, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded bg-zinc-800 text-sm">
                                  <Badge variant="outline" className={cn('text-xs',
                                    t.priority === 'HIGH' ? 'text-red-400 border-red-500/50' :
                                    t.priority === 'MEDIUM' ? 'text-yellow-400 border-yellow-500/50' :
                                    'text-zinc-400 border-zinc-500/50',
                                  )}>
                                    {t.priority === 'HIGH' ? 'Alta' : t.priority === 'MEDIUM' ? 'Media' : 'Baixa'}
                                  </Badge>
                                  <span>{t.description}</span>
                                  <span className="text-zinc-500 ml-auto text-xs">{t.assignedTo}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.estimatedDischargeDate && (
                          <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                            <Clock className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-emerald-300">Previsao de alta: {formatDate(r.estimatedDischargeDate)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <NewBarrierDialog open={barrierDialog} onClose={() => setBarrierDialog(false)} patientId={searchId} />
    </div>
  );
}
