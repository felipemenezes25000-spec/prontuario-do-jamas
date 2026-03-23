import { useState, useCallback } from 'react';
import {
  ArrowRightLeft,
  Brain,
  Check,
  ClipboardList,
  History,
  Loader2,
  Search,
  Send,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import {
  useHandoffHistory,
  useCreateHandoff,
  useGenerateSbar,
  type HandoffPatient,
  type SbarData,
  type NursingHandoff,
} from '@/services/handoff.service';

// ============================================================================
// Mocked patient list — in production would come from API filtered by sector
// ============================================================================

interface SectorPatient {
  id: string;
  name: string;
  bed: string;
  diagnosis: string;
}

// Placeholder patients for UI demo
const MOCK_PATIENTS: SectorPatient[] = [
  { id: '1', name: 'Maria da Silva', bed: 'UTI-01', diagnosis: 'Pneumonia grave' },
  { id: '2', name: 'José Santos', bed: 'UTI-03', diagnosis: 'IAM anterior' },
  { id: '3', name: 'Ana Beatriz Costa', bed: 'ENF-05', diagnosis: 'Pós-op colecistectomia' },
  { id: '4', name: 'Pedro Oliveira', bed: 'ENF-08', diagnosis: 'DPOC exacerbado' },
  { id: '5', name: 'Lúcia Ferreira', bed: 'ENF-12', diagnosis: 'Quimioterapia — CA mama' },
];

const EMPTY_SBAR: SbarData = { s: '', b: '', a: '', r: '' };

type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Manhã (07h-13h)',
  AFTERNOON: 'Tarde (13h-19h)',
  NIGHT: 'Noite (19h-07h)',
};

function getCurrentShift(): Shift {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 13) return 'MORNING';
  if (hour >= 13 && hour < 19) return 'AFTERNOON';
  return 'NIGHT';
}

// ============================================================================
// Patient SBAR Card
// ============================================================================

function PatientSbarCard({
  patient,
  sbar,
  notes,
  onSbarChange,
  onNotesChange,
}: {
  patient: SectorPatient;
  sbar: SbarData;
  notes: string;
  onSbarChange: (sbar: SbarData) => void;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {patient.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {patient.bed}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{patient.diagnosis}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-emerald-400">S — Situação</label>
          <Textarea
            value={sbar.s}
            onChange={(e) => onSbarChange({ ...sbar, s: e.target.value })}
            placeholder="Diagnóstico principal, motivo da internação, leito..."
            className="min-h-[60px] resize-none bg-secondary/30 border-border text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-blue-400">B — Background</label>
          <Textarea
            value={sbar.b}
            onChange={(e) => onSbarChange({ ...sbar, b: e.target.value })}
            placeholder="Antecedentes, eventos relevantes nas últimas 24h..."
            className="min-h-[60px] resize-none bg-secondary/30 border-border text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-amber-400">A — Avaliação</label>
          <Textarea
            value={sbar.a}
            onChange={(e) => onSbarChange({ ...sbar, a: e.target.value })}
            placeholder="Estado atual, sinais vitais, alertas, NEWS score..."
            className="min-h-[60px] resize-none bg-secondary/30 border-border text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-red-400">R — Recomendação</label>
          <Textarea
            value={sbar.r}
            onChange={(e) => onSbarChange({ ...sbar, r: e.target.value })}
            placeholder="Pendências, exames, medicações especiais..."
            className="min-h-[60px] resize-none bg-secondary/30 border-border text-xs"
          />
        </div>
        <Separator className="bg-secondary" />
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Notas adicionais</label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Observações do enfermeiro..."
            className="min-h-[40px] resize-none bg-secondary/30 border-border text-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Handoff History Card
// ============================================================================

function HandoffHistoryCard({ handoff }: { handoff: NursingHandoff }) {
  const patients = handoff.patients as HandoffPatient[];
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium">{handoff.fromNurse.name}</span>
            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{handoff.toNurse.name}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {handoff.shift ?? '-'}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {new Date(handoff.createdAt).toLocaleString('pt-BR')}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {patients.length} paciente(s) transferido(s)
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function HandoffPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('passagem');
  const [search, setSearch] = useState('');
  const [shift, setShift] = useState<Shift>(getCurrentShift());
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [receivingNurseId, setReceivingNurseId] = useState('');

  // SBAR state per patient
  const [sbarMap, setSbarMap] = useState<Record<string, SbarData>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const { data: historyData, isLoading: historyLoading } = useHandoffHistory();
  const createHandoff = useCreateHandoff();
  const generateSbar = useGenerateSbar();

  const filteredPatients = MOCK_PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.bed.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSbarChange = useCallback(
    (patientId: string, sbar: SbarData) => {
      setSbarMap((prev) => ({ ...prev, [patientId]: sbar }));
    },
    [],
  );

  const handleNotesChange = useCallback(
    (patientId: string, notes: string) => {
      setNotesMap((prev) => ({ ...prev, [patientId]: notes }));
    },
    [],
  );

  const handleGenerateSbar = async () => {
    try {
      const result = await generateSbar.mutateAsync({
        ward: 'UTI/Enfermaria',
        shift,
        patientIds: MOCK_PATIENTS.map((p) => p.id),
      });

      // Auto-fill first patient SBAR from summary as example
      if (MOCK_PATIENTS.length > 0) {
        const firstPatient = MOCK_PATIENTS[0];
        setSbarMap((prev) => ({
          ...prev,
          [firstPatient.id]: {
            s: result.summary.substring(0, 200),
            b: result.criticalItems.map((c) => `${c.patient}: ${c.item}`).join('; '),
            a: 'Gerado por IA - revise os dados',
            r: result.pendingTasks.map((t) => `${t.patient}: ${t.task}`).join('; '),
          },
        }));
      }

      toast.success('SBAR gerado por IA. Revise os dados antes de transferir.');
    } catch {
      toast.error('Erro ao gerar SBAR por IA.');
    }
  };

  const handleTransferHandoff = async () => {
    if (!receivingNurseId || !user) return;

    const patients: HandoffPatient[] = MOCK_PATIENTS.map((p) => ({
      patientId: p.id,
      sbar: sbarMap[p.id] ?? EMPTY_SBAR,
      notes: notesMap[p.id],
    }));

    try {
      await createHandoff.mutateAsync({
        fromNurseId: user.id ?? '',
        toNurseId: receivingNurseId,
        patients,
        shift,
      });
      toast.success('Passagem de plantão registrada com sucesso!');
      setTransferDialogOpen(false);
      setSbarMap({});
      setNotesMap({});
    } catch {
      toast.error('Erro ao registrar passagem de plantão.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Passagem de Plantão</h1>
          <p className="text-sm text-muted-foreground">
            Registro digital de passagem de plantão com SBAR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
            <SelectTrigger className="w-48 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MORNING">{SHIFT_LABELS.MORNING}</SelectItem>
              <SelectItem value="AFTERNOON">{SHIFT_LABELS.AFTERNOON}</SelectItem>
              <SelectItem value="NIGHT">{SHIFT_LABELS.NIGHT}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="passagem" className="text-xs data-[state=active]:bg-teal-600">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Passagem Atual
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs data-[state=active]:bg-teal-600">
            <History className="mr-1.5 h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* Current Handoff */}
        <TabsContent value="passagem" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente ou leito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <Button
              onClick={handleGenerateSbar}
              disabled={generateSbar.isPending}
              variant="outline"
              className="border-border"
            >
              {generateSbar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4 text-purple-400" />
              )}
              Gerar SBAR por IA
            </Button>
            <Button
              onClick={() => setTransferDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-500"
            >
              <Send className="mr-2 h-4 w-4" />
              Transferir Plantão
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredPatients.map((patient) => (
              <PatientSbarCard
                key={patient.id}
                patient={patient}
                sbar={sbarMap[patient.id] ?? EMPTY_SBAR}
                notes={notesMap[patient.id] ?? ''}
                onSbarChange={(sbar) => handleSbarChange(patient.id, sbar)}
                onNotesChange={(notes) => handleNotesChange(patient.id, notes)}
              />
            ))}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="historico" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm">Histórico de Passagens</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (historyData?.data?.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma passagem de plantão registrada.
                </p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    {historyData?.data.map((handoff) => (
                      <HandoffHistoryCard key={handoff.id} handoff={handoff} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Plantão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entregando:</label>
              <p className="text-sm text-muted-foreground">
                {user?.name ?? 'Enfermeiro atual'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Recebendo:</label>
              <Select value={receivingNurseId} onValueChange={setReceivingNurseId}>
                <SelectTrigger className="bg-secondary/30 border-border">
                  <SelectValue placeholder="Selecionar enfermeiro..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurse-1">Patrícia Santos</SelectItem>
                  <SelectItem value="nurse-2">João Almeida</SelectItem>
                  <SelectItem value="nurse-3">Ana Paula Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">
                {MOCK_PATIENTS.length} paciente(s) serão transferidos.
                Turno: {SHIFT_LABELS[shift]}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransferHandoff}
              disabled={!receivingNurseId || createHandoff.isPending}
              className="bg-teal-600 hover:bg-teal-500"
            >
              {createHandoff.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirmar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
