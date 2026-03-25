import { useState } from 'react';
import { Home, Calendar, History, MapPin, Plus, CheckCircle2, Circle } from 'lucide-react';
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
  useHomeCareVisits,
  useCreateVisit,
  useCompleteVisit,
  useHomeCarePatients,
  type VisitStatus,
  type HomeCareVisit,
  type HomeCarePatient,
} from '@/services/home-care.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<VisitStatus, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-slate-500/20 text-slate-400',
  NO_SHOW: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<VisitStatus, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Não Compareceu',
};

const CARE_LEVEL_COLORS: Record<HomeCarePatient['careLevel'], string> = {
  BASIC: 'bg-emerald-500/20 text-emerald-400',
  INTERMEDIATE: 'bg-yellow-500/20 text-yellow-400',
  ADVANCED: 'bg-red-500/20 text-red-400',
};

const CARE_LEVEL_LABELS: Record<HomeCarePatient['careLevel'], string> = {
  BASIC: 'Básico',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeCarePage() {
  const [activeTab, setActiveTab] = useState('scheduled');
  const [statusFilter, setStatusFilter] = useState<VisitStatus | undefined>(undefined);

  const [visitOpen, setVisitOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({
    patientId: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '08:00',
    visitType: '',
    checklistItems: '',
    notes: '',
  });

  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<HomeCareVisit | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeDuration, setCompleteDuration] = useState('');

  const { data: visitsData, isLoading: visitsLoading } = useHomeCareVisits(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const { data: patientsData, isLoading: patientsLoading } = useHomeCarePatients();
  const createVisit = useCreateVisit();
  const completeVisit = useCompleteVisit();

  const scheduledVisits = visitsData?.data?.filter((v) => v.status === 'SCHEDULED') ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisits = scheduledVisits.filter((v) => v.scheduledDate === todayStr);

  const handleCreateVisit = async () => {
    if (!visitForm.patientId || !visitForm.visitType || !visitForm.scheduledDate) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createVisit.mutateAsync({
        patientId: visitForm.patientId,
        scheduledDate: visitForm.scheduledDate,
        scheduledTime: visitForm.scheduledTime,
        visitType: visitForm.visitType,
        checklist: visitForm.checklistItems.split(',').map((l) => ({ label: l.trim() })).filter((l) => l.label),
        notes: visitForm.notes,
      });
      toast.success('Visita agendada com sucesso.');
      setVisitOpen(false);
      setVisitForm({ patientId: '', scheduledDate: new Date().toISOString().slice(0, 10), scheduledTime: '08:00', visitType: '', checklistItems: '', notes: '' });
    } catch {
      toast.error('Erro ao agendar visita.');
    }
  };

  const handleCompleteVisit = async () => {
    if (!selectedVisit || !completeNotes || !completeDuration) {
      toast.error('Preencha as notas e a duração da visita.');
      return;
    }
    try {
      await completeVisit.mutateAsync({
        visitId: selectedVisit.id,
        checklist: selectedVisit.checklist.map((c) => ({ ...c, completed: true })),
        notes: completeNotes,
        duration: Number(completeDuration),
      });
      toast.success('Visita concluída com sucesso.');
      setCompleteOpen(false);
      setSelectedVisit(null);
      setCompleteNotes('');
      setCompleteDuration('');
    } catch {
      toast.error('Erro ao concluir visita.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Home className="h-6 w-6 text-primary" />
          Home Care — Atenção Domiciliar
        </h1>
        <p className="text-muted-foreground">
          Agendamento de visitas, histórico e roteirização de equipe domiciliar
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Visitas Hoje', value: todayVisits.length, color: 'text-blue-400' },
          { label: 'Agendadas', value: visitsData?.data?.filter((v) => v.status === 'SCHEDULED').length ?? 0, color: 'text-yellow-400' },
          { label: 'Concluídas', value: visitsData?.data?.filter((v) => v.status === 'COMPLETED').length ?? 0, color: 'text-emerald-400' },
          { label: 'Pacientes Ativos', value: patientsData?.data?.filter((p) => p.status === 'ACTIVE').length ?? 0, color: 'text-primary' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Visitas Agendadas
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Roteirização
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Visitas Agendadas ──────────────────────────────────────── */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['SCHEDULED', 'IN_PROGRESS', 'NO_SHOW'] as VisitStatus[]).map((s) => (
                <Badge
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  className={cn('cursor-pointer text-xs', STATUS_COLORS[s])}
                  onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
                >
                  {STATUS_LABELS[s]}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setVisitOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agendar Visita
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Visitas Agendadas ({visitsData?.total ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {visitsLoading ? <PageLoading /> : visitsData?.data && visitsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checklist</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitsData.data.map((v: HomeCareVisit) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.patientName}</TableCell>
                        <TableCell className="max-w-36 truncate text-sm text-muted-foreground">{v.patientAddress}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(v.scheduledDate).toLocaleDateString('pt-BR')} {v.scheduledTime}
                        </TableCell>
                        <TableCell className="text-sm">{v.visitType}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.professional}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', STATUS_COLORS[v.status])}>
                            {STATUS_LABELS[v.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {v.checklist.slice(0, 3).map((c) => (
                              c.completed
                                ? <CheckCircle2 key={c.id} className="h-4 w-4 text-emerald-400" />
                                : <Circle key={c.id} className="h-4 w-4 text-muted-foreground" />
                            ))}
                            {v.checklist.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{v.checklist.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {v.status === 'SCHEDULED' && (
                            <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-400"
                              onClick={() => { setSelectedVisit(v); setCompleteOpen(true); }}>
                              Concluir
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma visita encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          {patientsLoading ? <PageLoading /> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {patientsData?.data && patientsData.data.length > 0 ? patientsData.data.map((p: HomeCarePatient) => (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{p.patientName}</CardTitle>
                      <Badge className={cn('text-xs', CARE_LEVEL_COLORS[p.careLevel])}>
                        {CARE_LEVEL_LABELS[p.careLevel]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {p.address}
                    </p>
                    <p><span className="text-muted-foreground">Diagnóstico:</span> {p.diagnosis}</p>
                    <p><span className="text-muted-foreground">Total de visitas:</span> {p.totalVisits}</p>
                    {p.nextVisit && (
                      <p><span className="text-muted-foreground">Próxima visita:</span> {new Date(p.nextVisit).toLocaleDateString('pt-BR')}</p>
                    )}
                    <Badge className={cn('text-xs', p.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400')}>
                      {p.status === 'ACTIVE' ? 'Ativo' : p.status === 'DISCHARGED' ? 'Alta' : 'Suspenso'}
                    </Badge>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-3 text-center text-muted-foreground py-10">Nenhum paciente cadastrado.</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Roteirização ───────────────────────────────────────────── */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Roteirização do Dia — {new Date().toLocaleDateString('pt-BR')}</CardTitle></CardHeader>
            <CardContent>
              {visitsLoading ? <PageLoading /> : todayVisits.length > 0 ? (
                <div className="space-y-3">
                  {todayVisits
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((v, idx) => (
                      <div key={v.id} className="flex items-start gap-4 rounded-lg border border-border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{v.patientName}</span>
                            <Badge className={cn('text-xs', STATUS_COLORS[v.status])}>
                              {STATUS_LABELS[v.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" /> {v.patientAddress}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {v.scheduledTime} · {v.visitType} · {v.professional}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma visita agendada para hoje.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Agendar Visita ────────────────────────────────────────── */}
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar Visita Domiciliar</DialogTitle>
            <DialogDescription>Agende uma nova visita para o paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>ID do Paciente *</Label>
              <Input placeholder="UUID do paciente" value={visitForm.patientId}
                onChange={(e) => setVisitForm((p) => ({ ...p, patientId: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={visitForm.scheduledDate}
                  onChange={(e) => setVisitForm((p) => ({ ...p, scheduledDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Horário</Label>
                <Input type="time" value={visitForm.scheduledTime}
                  onChange={(e) => setVisitForm((p) => ({ ...p, scheduledTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tipo de Visita *</Label>
              <Select value={visitForm.visitType}
                onValueChange={(v) => setVisitForm((p) => ({ ...p, visitType: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta médica">Consulta médica</SelectItem>
                  <SelectItem value="Curativo">Curativo</SelectItem>
                  <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                  <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                  <SelectItem value="Coleta de exames">Coleta de exames</SelectItem>
                  <SelectItem value="Avaliação multiprofissional">Avaliação multiprofissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Itens do Checklist (separados por vírgula)</Label>
              <Input placeholder="Verificar pressão, Trocar curativo, Orientar família"
                value={visitForm.checklistItems}
                onChange={(e) => setVisitForm((p) => ({ ...p, checklistItems: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Informações adicionais" value={visitForm.notes}
                onChange={(e) => setVisitForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateVisit} disabled={createVisit.isPending}>
              {createVisit.isPending ? 'Agendando...' : 'Agendar Visita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Concluir Visita ───────────────────────────────────────── */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir Visita</DialogTitle>
            <DialogDescription>
              {selectedVisit ? `Registre a evolução da visita a ${selectedVisit.patientName}.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Evolução / Notas *</Label>
              <Input placeholder="Descreva o que foi realizado" value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Duração (minutos) *</Label>
              <Input type="number" placeholder="45" value={completeDuration}
                onChange={(e) => setCompleteDuration(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancelar</Button>
            <Button onClick={handleCompleteVisit} disabled={completeVisit.isPending}>
              {completeVisit.isPending ? 'Salvando...' : 'Concluir Visita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
