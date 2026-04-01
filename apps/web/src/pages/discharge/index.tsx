import { useState } from 'react';
import {
  FileText,
  Pill,
  CheckSquare,
  BedDouble,
  ShieldAlert,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCreateDischargeInstructions,
  useCreateDischargePrescription,
  useEvaluateSafeDischarge,
  useRequestBedRegulation,
  useBedRegulations,
  useRecordDischargeBarrier,
  useDischargeBarriers,
  useRecordMdtRound,
  type SafeDischargeResult,
  type BedRegulation,
  type DischargeBarrier,
} from '@/services/discharge-advanced.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function urgencyBadge(level: 'ROUTINE' | 'PRIORITY' | 'URGENT') {
  const map = {
    ROUTINE:  { label: 'Rotina',    variant: 'secondary' as const },
    PRIORITY: { label: 'Prioritário', variant: 'default' as const },
    URGENT:   { label: 'Urgente',   variant: 'destructive' as const },
  };
  const cfg = map[level];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function barrierSeverityColor(severity: DischargeBarrier['severity']) {
  if (severity === 'HIGH') return 'text-red-400';
  if (severity === 'MEDIUM') return 'text-yellow-400';
  return 'text-zinc-400';
}

// ─── Discharge Instructions Tab ───────────────────────────────────────────────

function InstructionsTab() {
  const createInstructions = useCreateDischargeInstructions();
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [activityRestrictions, setActivityRestrictions] = useState('');
  const [diet, setDiet] = useState('');
  const [returnCriteria, setReturnCriteria] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!patientId.trim() || !encounterId.trim() || !diagnosis.trim()) {
      toast.error('Preencha paciente, atendimento e diagnóstico.'); return;
    }
    createInstructions.mutate(
      {
        patientId,
        encounterId,
        authorId: 'current-user',
        diagnosis: diagnosis.split(',').map((s) => s.trim()).filter(Boolean),
        activityRestrictions: activityRestrictions.split(',').map((s) => s.trim()).filter(Boolean),
        dietInstructions: diet || undefined,
        returnToEdCriteria: returnCriteria.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContactPhone: emergencyPhone,
        followUpAppointments: [],
      },
      {
        onSuccess: () => { toast.success('Instruções de alta geradas.'); setSubmitted(true); },
        onError: () => toast.error('Erro ao gerar instruções de alta.'),
      },
    );
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <p className="text-lg font-semibold">Instruções de Alta Registradas</p>
        <p className="text-sm text-zinc-400">O documento está disponível para impressão no prontuário.</p>
        <Button variant="outline" className="border-zinc-700 mt-2" onClick={() => setSubmitted(false)}>
          Nova Instrução de Alta
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>ID do Paciente *</Label>
          <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="pat-001" />
        </div>
        <div className="space-y-1">
          <Label>ID do Atendimento *</Label>
          <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="enc-001" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Diagnósticos * <span className="text-zinc-500 font-normal text-xs">(separados por vírgula)</span></Label>
        <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Pneumonia bacteriana, Hipertensão" />
      </div>
      <div className="space-y-1">
        <Label>Restrições de Atividade <span className="text-zinc-500 font-normal text-xs">(separadas por vírgula)</span></Label>
        <Input value={activityRestrictions} onChange={(e) => setActivityRestrictions(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Repouso relativo por 7 dias, Evitar esforço" />
      </div>
      <div className="space-y-1">
        <Label>Instruções Alimentares</Label>
        <Input value={diet} onChange={(e) => setDiet(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Dieta hipossódica, fracionada" />
      </div>
      <div className="space-y-1">
        <Label>Critérios de Retorno ao PS <span className="text-zinc-500 font-normal text-xs">(separados por vírgula)</span></Label>
        <Input value={returnCriteria} onChange={(e) => setReturnCriteria(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Febre > 38°C, Piora da dispneia" />
      </div>
      <div className="space-y-1">
        <Label>Telefone de Emergência</Label>
        <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="(11) 99999-9999" />
      </div>
      <Button onClick={handleSubmit} disabled={createInstructions.isPending} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
        {createInstructions.isPending ? 'Gerando...' : 'Gerar Instruções de Alta'}
      </Button>
    </div>
  );
}

// ─── Discharge Prescription Tab ───────────────────────────────────────────────

function PrescriptionTab() {
  const createPrescription = useCreateDischargePrescription();
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Simple single-medication form for demonstration
  const [medName, setMedName] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('VO');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState('7');

  const handleSubmit = () => {
    if (!patientId.trim() || !encounterId.trim() || !medName.trim()) {
      toast.error('Preencha paciente, atendimento e ao menos um medicamento.'); return;
    }
    createPrescription.mutate(
      {
        patientId,
        encounterId,
        prescriberId: 'current-user',
        medications: [{
          medicationId: 'med-temp',
          medicationName: medName,
          dose,
          route,
          frequency,
          durationDays: Number(durationDays),
          quantity: Number(durationDays),
          newMedication: true,
        }],
        printFormat: 'BOTH',
      },
      {
        onSuccess: () => { toast.success('Prescrição de alta criada.'); setSubmitted(true); },
        onError: () => toast.error('Erro ao criar prescrição de alta.'),
      },
    );
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <p className="text-lg font-semibold">Prescrição de Alta Gerada</p>
        <Button variant="outline" className="border-zinc-700 mt-2" onClick={() => setSubmitted(false)}>
          Nova Prescrição de Alta
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>ID do Paciente *</Label>
          <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
        <div className="space-y-1">
          <Label>ID do Atendimento *</Label>
          <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
      </div>
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Medicamento</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label>Nome do Medicamento *</Label>
            <Input value={medName} onChange={(e) => setMedName(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Amoxicilina 500mg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Dose</Label>
              <Input value={dose} onChange={(e) => setDose(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="500mg" />
            </div>
            <div className="space-y-1">
              <Label>Via</Label>
              <Input value={route} onChange={(e) => setRoute(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="VO" />
            </div>
            <div className="space-y-1">
              <Label>Frequência</Label>
              <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="8/8h" />
            </div>
            <div className="space-y-1">
              <Label>Dias</Label>
              <Input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="bg-zinc-950 border-zinc-700" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSubmit} disabled={createPrescription.isPending} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
        {createPrescription.isPending ? 'Gerando...' : 'Gerar Prescrição de Alta'}
      </Button>
    </div>
  );
}

// ─── Safe Discharge Checklist Tab ─────────────────────────────────────────────

interface ChecklistItem {
  key: keyof Omit<SafeDischargeChecklist, 'patientId' | 'encounterId'>;
  label: string;
}

interface SafeDischargeChecklist {
  patientId: string;
  encounterId: string;
  transportArranged: boolean;
  caregiverPresent: boolean;
  instructionsProvided: boolean;
  medicationsReconciled: boolean;
  followUpScheduled: boolean;
  patientUnderstandsInstructions: boolean;
  teachBackCompleted: boolean;
  specialEquipmentArranged: boolean;
  homeHealthOrdered: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'transportArranged', label: 'Transporte organizado' },
  { key: 'caregiverPresent', label: 'Acompanhante/cuidador presente' },
  { key: 'instructionsProvided', label: 'Instruções de alta fornecidas' },
  { key: 'medicationsReconciled', label: 'Reconciliação medicamentosa realizada' },
  { key: 'followUpScheduled', label: 'Retorno agendado' },
  { key: 'patientUnderstandsInstructions', label: 'Paciente compreende as instruções' },
  { key: 'teachBackCompleted', label: 'Teach-back realizado' },
  { key: 'specialEquipmentArranged', label: 'Equipamentos especiais providenciados' },
  { key: 'homeHealthOrdered', label: 'Cuidados domiciliares prescritos (se necessário)' },
];

function SafeChecklistTab() {
  const evaluateSafe = useEvaluateSafeDischarge();
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<SafeDischargeResult | null>(null);

  const toggle = (key: string) => setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleEvaluate = () => {
    if (!patientId.trim() || !encounterId.trim()) { toast.error('Informe paciente e atendimento.'); return; }
    evaluateSafe.mutate(
      {
        patientId,
        encounterId,
        evaluatorId: 'current-user',
        transportArranged: !!checklist['transportArranged'],
        caregiverPresent: !!checklist['caregiverPresent'],
        instructionsProvided: !!checklist['instructionsProvided'],
        medicationsReconciled: !!checklist['medicationsReconciled'],
        followUpScheduled: !!checklist['followUpScheduled'],
        patientUnderstandsInstructions: !!checklist['patientUnderstandsInstructions'],
        teachBackCompleted: !!checklist['teachBackCompleted'],
        specialEquipmentArranged: !!checklist['specialEquipmentArranged'],
        homeHealthOrdered: !!checklist['homeHealthOrdered'],
      },
      {
        onSuccess: (data) => { setResult(data); },
        onError: () => toast.error('Erro ao avaliar checklist de alta segura.'),
      },
    );
  };

  const completedCount = CHECKLIST_ITEMS.filter((item) => !!checklist[item.key]).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>ID do Paciente *</Label>
          <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
        <div className="space-y-1">
          <Label>ID do Atendimento *</Label>
          <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Checklist de Alta Segura</span>
            <span className="text-emerald-400 font-normal text-xs">{completedCount}/{CHECKLIST_ITEMS.length} itens</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-3 py-1 border-b border-zinc-800 last:border-0">
              <Checkbox
                id={item.key}
                checked={!!checklist[item.key]}
                onCheckedChange={() => toggle(item.key)}
                className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <label
                htmlFor={item.key}
                className={cn('text-sm cursor-pointer', checklist[item.key] ? 'text-zinc-300 line-through' : 'text-zinc-100')}
              >
                {item.label}
              </label>
              {checklist[item.key]
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto shrink-0" />
                : <XCircle className="h-4 w-4 text-zinc-600 ml-auto shrink-0" />
              }
            </div>
          ))}
        </CardContent>
      </Card>

      {result && (
        <Card className={cn('border', result.safeToDischarge ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30')}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {result.safeToDischarge
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                : <AlertTriangle className="h-5 w-5 text-red-400" />
              }
              <p className={`font-semibold ${result.safeToDischarge ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.safeToDischarge ? 'Alta Segura Autorizada' : 'Alta Não Segura — Pendências'}
              </p>
              <span className="ml-auto text-xs text-zinc-400">Score: {result.score}/100</span>
            </div>
            {result.blockers.length > 0 && (
              <ul className="space-y-1 mt-2">
                {result.blockers.map((b, i) => (
                  <li key={i} className="text-sm text-red-300 flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Button onClick={handleEvaluate} disabled={evaluateSafe.isPending} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
        {evaluateSafe.isPending ? 'Avaliando...' : 'Avaliar Alta Segura'}
      </Button>
    </div>
  );
}

// ─── Bed Regulation Tab ───────────────────────────────────────────────────────

function BedRegulationTab() {
  const { data, isLoading } = useBedRegulations();
  const requestRegulation = useRequestBedRegulation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [originUnit, setOriginUnit] = useState('');
  const [destinationUnit, setDestinationUnit] = useState('');
  const [justification, setJustification] = useState('');
  const [urgency, setUrgency] = useState<BedRegulation['urgencyLevel']>('ROUTINE');

  const regulations: BedRegulation[] = data ?? [];

  const handleSave = () => {
    if (!patientId.trim() || !encounterId.trim() || !originUnit.trim() || !destinationUnit.trim() || !justification.trim()) {
      toast.error('Preencha todos os campos obrigatórios.'); return;
    }
    requestRegulation.mutate(
      { patientId, encounterId, originUnit, destinationUnit, clinicalJustification: justification, urgencyLevel: urgency, requestedBy: 'current-user' },
      {
        onSuccess: () => { toast.success('Solicitação de regulação registrada.'); setDialogOpen(false); setPatientId(''); setEncounterId(''); setOriginUnit(''); setDestinationUnit(''); setJustification(''); },
        onError: () => toast.error('Erro ao solicitar regulação.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Solicitar Regulação
        </Button>
      </div>
      {isLoading ? (
        <p className="text-center text-zinc-400 py-8">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Paciente</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead>Leito Alocado</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regulations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhuma regulação de leito.</TableCell></TableRow>
            ) : regulations.map((r) => (
              <TableRow key={r.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-mono text-xs">{r.patientId}</TableCell>
                <TableCell>{r.originUnit}</TableCell>
                <TableCell>{r.destinationUnit}</TableCell>
                <TableCell>{urgencyBadge(r.urgencyLevel)}</TableCell>
                <TableCell>{r.allocatedBed ?? <span className="text-zinc-500">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={
                    r.status === 'TRANSFERRED' ? 'default' :
                    r.status === 'CANCELLED' ? 'destructive' :
                    r.status === 'ALLOCATED' ? 'default' : 'secondary'
                  }>
                    {r.status === 'PENDING' ? 'Pendente' :
                     r.status === 'APPROVED' ? 'Aprovado' :
                     r.status === 'ALLOCATED' ? 'Leito Alocado' :
                     r.status === 'TRANSFERRED' ? 'Transferido' : 'Cancelado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitação de Regulação de Leito</DialogTitle>
            <DialogDescription>Solicite transferência interna ou externa de paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Paciente *</Label><Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Atendimento *</Label><Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Unidade Origem *</Label><Input value={originUnit} onChange={(e) => setOriginUnit(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: UTI Adulto" /></div>
              <div className="space-y-1"><Label>Unidade Destino *</Label><Input value={destinationUnit} onChange={(e) => setDestinationUnit(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Enfermaria" /></div>
            </div>
            <div className="space-y-1">
              <Label>Urgência</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as BedRegulation['urgencyLevel'])}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Rotina</SelectItem>
                  <SelectItem value="PRIORITY">Prioritário</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Justificativa Clínica *</Label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={requestRegulation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {requestRegulation.isPending ? 'Solicitando...' : 'Solicitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Barriers Tab ─────────────────────────────────────────────────────────────

function BarriersTab() {
  const [patientIdInput, setPatientIdInput] = useState('');
  const [activePatientId, setActivePatientId] = useState('');
  const { data, isLoading } = useDischargeBarriers(activePatientId);
  const recordBarrier = useRecordDischargeBarrier();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [encounterId, setEncounterId] = useState('');
  const [barrierType, setBarrierType] = useState<DischargeBarrier['barrierType']>('CLINICAL');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DischargeBarrier['severity']>('MEDIUM');

  const barriers: DischargeBarrier[] = data ?? [];

  const handleSearch = () => {
    if (!patientIdInput.trim()) { toast.error('Informe o ID do paciente.'); return; }
    setActivePatientId(patientIdInput.trim());
  };

  const handleSave = () => {
    if (!encounterId.trim() || !description.trim()) { toast.error('Preencha atendimento e descrição.'); return; }
    recordBarrier.mutate(
      { patientId: activePatientId, encounterId, reportedBy: 'current-user', barrierType, description, severity },
      {
        onSuccess: () => { toast.success('Barreira registrada.'); setDialogOpen(false); setEncounterId(''); setDescription(''); },
        onError: () => toast.error('Erro ao registrar barreira.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-sm">
        <Input
          value={patientIdInput}
          onChange={(e) => setPatientIdInput(e.target.value)}
          placeholder="ID do paciente"
          className="bg-zinc-950 border-zinc-700"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <Button onClick={handleSearch} variant="outline" className="border-zinc-700 shrink-0">Buscar</Button>
      </div>

      {activePatientId && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> Registrar Barreira
            </Button>
          </div>
          {isLoading ? (
            <p className="text-center text-zinc-400 py-8">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barriers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhuma barreira registrada para este paciente.</TableCell></TableRow>
                ) : barriers.map((b) => (
                  <TableRow key={b.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>{b.barrierType}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">{b.description}</TableCell>
                    <TableCell className={`font-medium ${barrierSeverityColor(b.severity)}`}>{b.severity}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'RESOLVED' ? 'default' : b.status === 'IN_PROGRESS' ? 'secondary' : 'destructive'}>
                        {b.status === 'OPEN' ? 'Aberta' : b.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Resolvida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(b.reportedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Barreira para Alta</DialogTitle>
            <DialogDescription>Identifique barreiras que impedem a alta segura do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Atendimento *</Label><Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={barrierType} onValueChange={(v) => setBarrierType(v as DischargeBarrier['barrierType'])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINICAL">Clínica</SelectItem>
                    <SelectItem value="SOCIAL">Social</SelectItem>
                    <SelectItem value="INSURANCE">Convênio</SelectItem>
                    <SelectItem value="FAMILY">Familiar</SelectItem>
                    <SelectItem value="TRANSPORT">Transporte</SelectItem>
                    <SelectItem value="HOME_SETUP">Domicílio</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Severidade</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as DischargeBarrier['severity'])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={recordBarrier.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {recordBarrier.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MDT Rounds Tab ───────────────────────────────────────────────────────────

function MdtRoundsTab() {
  const recordMdt = useRecordMdtRound();
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [dischargeGoal, setDischargeGoal] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!patientId.trim() || !encounterId.trim() || !clinicalSummary.trim() || !dischargeGoal.trim()) {
      toast.error('Preencha paciente, atendimento, resumo clínico e meta de alta.'); return;
    }
    recordMdt.mutate(
      {
        patientId,
        encounterId,
        facilitatorId: 'current-user',
        attendees: [],
        clinicalSummary,
        dischargeGoal,
        estimatedDischargeDatetime: estimatedDate || undefined,
        actionItems: [],
      },
      {
        onSuccess: () => { toast.success('Round MDT registrado.'); setSubmitted(true); },
        onError: () => toast.error('Erro ao registrar round MDT.'),
      },
    );
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <p className="text-lg font-semibold">Round MDT Registrado</p>
        <Button variant="outline" className="border-zinc-700 mt-2" onClick={() => setSubmitted(false)}>
          Novo Round MDT
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4 flex items-start gap-3">
        <Users className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-sm text-zinc-300">
          O Round MDT (Multi-Disciplinary Team) envolve médicos, enfermagem, fisioterapia, nutrição e serviço social para planejar alta segura e coordenada.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>ID do Paciente *</Label>
          <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
        <div className="space-y-1">
          <Label>ID do Atendimento *</Label>
          <Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Resumo Clínico *</Label>
        <textarea
          value={clinicalSummary}
          onChange={(e) => setClinicalSummary(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Descreva o quadro clínico atual do paciente..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Meta de Alta *</Label>
          <Input value={dischargeGoal} onChange={(e) => setDischargeGoal(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Alta para domicílio com cuidador" />
        </div>
        <div className="space-y-1">
          <Label>Data Estimada de Alta</Label>
          <Input type="datetime-local" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} className="bg-zinc-950 border-zinc-700" />
        </div>
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          Status de Pendências
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['Médico', 'Enfermagem', 'Fisioterapia', 'Nutrição', 'Serviço Social', 'Farmácia'].map((role) => (
            <div key={role} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-zinc-400">{role}</span>
            </div>
          ))}
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={recordMdt.isPending} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
        {recordMdt.isPending ? 'Registrando...' : 'Registrar Round MDT'}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DischargePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Alta</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Instruções, prescrição, checklist de alta segura, regulação de leito, barreiras e round MDT.</p>
      </div>

      <Tabs defaultValue="instructions">
        <TabsList className="bg-zinc-900 border border-zinc-800 h-auto flex-wrap gap-0.5 p-1">
          <TabsTrigger value="instructions" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" /> Instruções de Alta
          </TabsTrigger>
          <TabsTrigger value="prescription" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Pill className="h-3.5 w-3.5 mr-1" /> Prescrição de Alta
          </TabsTrigger>
          <TabsTrigger value="checklist" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <CheckSquare className="h-3.5 w-3.5 mr-1" /> Checklist Seguro
          </TabsTrigger>
          <TabsTrigger value="bed-regulation" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <BedDouble className="h-3.5 w-3.5 mr-1" /> Regulação de Leito
          </TabsTrigger>
          <TabsTrigger value="barriers" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Barreiras
          </TabsTrigger>
          <TabsTrigger value="mdt" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Users className="h-3.5 w-3.5 mr-1" /> Round MDT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" /> Instruções de Alta
              </CardTitle>
            </CardHeader>
            <CardContent><InstructionsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescription" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-400" /> Prescrição de Alta
              </CardTitle>
            </CardHeader>
            <CardContent><PrescriptionTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" /> Checklist de Alta Segura
              </CardTitle>
            </CardHeader>
            <CardContent><SafeChecklistTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bed-regulation" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-emerald-400" /> Regulação de Leito
              </CardTitle>
            </CardHeader>
            <CardContent><BedRegulationTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barriers" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-emerald-400" /> Barreiras para Alta
              </CardTitle>
            </CardHeader>
            <CardContent><BarriersTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mdt" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" /> Round MDT
              </CardTitle>
            </CardHeader>
            <CardContent><MdtRoundsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
