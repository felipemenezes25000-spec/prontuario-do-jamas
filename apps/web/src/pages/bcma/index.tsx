import { useState } from 'react';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Pill,
  ShieldCheck,
  History,
  LayoutDashboard,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  usePendingMedications,
  useAdministrationHistory,
  useVerifyBarcode,
  useAdministerMedication,
  useHoldMedication,
} from '@/services/bcma.service';
import type { BcmaVerification, PendingMedication } from '@/services/bcma.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const FIVE_RIGHTS = [
  { key: 'rightPatient', label: 'Paciente Certo', icon: User },
  { key: 'rightMedication', label: 'Medicamento Certo', icon: Pill },
  { key: 'rightDose', label: 'Dose Certa', icon: ShieldCheck },
  { key: 'rightRoute', label: 'Via Certa', icon: ScanLine },
  { key: 'rightTime', label: 'Horário Certo', icon: Clock },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Verification Result Dialog ──────────────────────────────────────────────

function VerificationResultDialog({
  verification,
  open,
  onClose,
}: {
  verification: BcmaVerification | null;
  open: boolean;
  onClose: () => void;
}) {
  const administer = useAdministerMedication();
  const hold = useHoldMedication();
  const [notes, setNotes] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [mode, setMode] = useState<'view' | 'hold'>('view');

  if (!verification) return null;

  const allVerified = verification.allRightsVerified;

  const handleAdminister = () => {
    administer.mutate(
      { verificationId: verification.id, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success('Medicamento administrado e registrado!');
          onClose();
          setNotes('');
        },
        onError: () => toast.error('Erro ao registrar administração.'),
      },
    );
  };

  const handleHold = () => {
    if (!holdReason) { toast.error('Informe o motivo da suspensão.'); return; }
    hold.mutate(
      { pendingId: verification.prescriptionItemId, reason: holdReason },
      {
        onSuccess: () => {
          toast.success('Medicamento suspenso e registrado.');
          onClose();
          setHoldReason('');
          setMode('view');
        },
        onError: () => toast.error('Erro ao suspender medicamento.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-emerald-400" /> Verificação BCMA
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Patient + Med Info */}
          <div className="rounded-lg bg-zinc-800 p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Paciente</span>
              <span className="text-sm font-medium">{verification.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">MRN</span>
              <span className="text-sm font-mono">{verification.mrn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Medicamento</span>
              <span className="text-sm font-medium">{verification.medicationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Dose / Via</span>
              <span className="text-sm">{verification.dose} · {verification.route}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Horário Previsto</span>
              <span className="text-sm">{formatTime(verification.scheduledTime)}</span>
            </div>
          </div>

          {/* 5 Rights */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">5 Certos</p>
            <div className="grid grid-cols-1 gap-2">
              {FIVE_RIGHTS.map(({ key, label, icon: Icon }) => {
                const ok = verification[key as keyof BcmaVerification] as boolean;
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-lg border',
                      ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', ok ? 'text-green-400' : 'text-red-400')} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {ok
                      ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                      : <XCircle className="h-4 w-4 text-red-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {!allVerified && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">Um ou mais critérios NÃO foram verificados. Não administre antes de resolver as inconsistências.</p>
            </div>
          )}

          {mode === 'view' && allVerified && (
            <div className="space-y-1">
              <Label className="text-xs">Observações (opcional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Intercorrências, reações, etc." className="bg-zinc-950 border-zinc-700" />
            </div>
          )}

          {mode === 'hold' && (
            <div className="space-y-1">
              <Label className="text-xs">Motivo da Suspensão *</Label>
              <Input value={holdReason} onChange={(e) => setHoldReason(e.target.value)}
                placeholder="ex: Paciente em jejum, alergia identificada" className="bg-zinc-950 border-zinc-700" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-zinc-700" onClick={onClose}>Cancelar</Button>
          {mode === 'view' ? (
            <>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={() => setMode('hold')}>
                Suspender
              </Button>
              {allVerified && (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdminister} disabled={administer.isPending}>
                  {administer.isPending ? 'Registrando...' : 'Confirmar Administração'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" className="border-zinc-700" onClick={() => setMode('view')}>Voltar</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleHold} disabled={hold.isPending}>
                {hold.isPending ? 'Suspendendo...' : 'Confirmar Suspensão'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pending Card ────────────────────────────────────────────────────────────

function PendingMedCard({ med, onScan }: { med: PendingMedication; onScan: (barcode: string) => void }) {
  const isOverdue = med.status === 'OVERDUE';
  const scheduledDate = new Date(med.scheduledTime);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - scheduledDate.getTime()) / 60000);

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', isOverdue && 'border-red-500/40')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{med.patientName}</p>
            <p className="text-xs text-zinc-400">{med.mrn} · {med.bed ?? '—'} · {med.ward ?? '—'}</p>
          </div>
          {isOverdue ? (
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
              Atrasado {diffMin}min
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
              Pendente
            </Badge>
          )}
        </div>
        <div className="rounded-lg bg-zinc-800 p-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Medicamento</span>
            <span className="font-medium">{med.medicationName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Dose / Via</span>
            <span>{med.dose} · {med.route}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Horário</span>
            <span className={isOverdue ? 'text-red-400 font-medium' : ''}>{formatTime(med.scheduledTime)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Frequência</span>
            <span className="text-zinc-300">{med.frequency}</span>
          </div>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => onScan(med.barcode)}>
          <ScanLine className="h-4 w-4 mr-2" /> Escanear e Verificar
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BcmaPage() {
  const [manualBarcode, setManualBarcode] = useState('');
  const [verificationResult, setVerificationResult] = useState<BcmaVerification | null>(null);
  const [verifyDialog, setVerifyDialog] = useState(false);

  const { data: pending = [], isLoading: pendingLoading } = usePendingMedications();
  const { data: history = [], isLoading: historyLoading } = useAdministrationHistory();
  const verifyBarcode = useVerifyBarcode();

  const overdueCount = pending.filter((p) => p.status === 'OVERDUE').length;
  const allRightsCount = history.filter((h) => h.allRightsVerified).length;
  const complianceRate = history.length > 0 ? Math.round((allRightsCount / history.length) * 100) : 100;

  const handleScan = (barcode: string) => {
    if (!barcode) { toast.error('Informe o código de barras.'); return; }
    verifyBarcode.mutate(barcode, {
      onSuccess: (data) => {
        setVerificationResult(data);
        setVerifyDialog(true);
        setManualBarcode('');
      },
      onError: () => toast.error('Código de barras não encontrado ou medicamento não pendente.'),
    });
  };

  if (pendingLoading || historyLoading) {
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
          <ScanLine className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">BCMA — Verificação por Código de Barras</h1>
        </div>
      </div>

      {/* Scan Bar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-zinc-400 mb-1 block">Escanear ou digitar código de barras</Label>
              <Input
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan(manualBarcode)}
                placeholder="Aponte o leitor de código de barras ou digite manualmente..."
                className="bg-zinc-950 border-zinc-700 font-mono"
                autoFocus
              />
            </div>
            <Button
              className="self-end bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleScan(manualBarcode)}
              disabled={verifyBarcode.isPending || !manualBarcode}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              {verifyBarcode.isPending ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div><p className="text-xs text-zinc-400">Pendentes</p><p className="text-2xl font-bold">{pending.length}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div><p className="text-xs text-zinc-400">Atrasados</p><p className="text-2xl font-bold text-red-400">{overdueCount}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div><p className="text-xs text-zinc-400">Administrados (hoje)</p><p className="text-2xl font-bold">{history.length}</p></div>
          </CardContent>
        </Card>
        <Card className={cn('bg-zinc-900 border-zinc-800', complianceRate < 90 && 'border-yellow-500/30')}>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            <div><p className="text-xs text-zinc-400">Compliance 5 Certos</p><p className={cn('text-2xl font-bold', complianceRate >= 95 ? 'text-emerald-400' : complianceRate >= 80 ? 'text-yellow-400' : 'text-red-400')}>{complianceRate}%</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Verificações Pendentes
            {overdueCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs h-4 px-1">{overdueCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Verificações Pendentes */}
        <TabsContent value="pending" className="mt-4">
          {pending.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-zinc-400">Nenhuma medicação pendente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Sort overdue first */}
              {[...pending].sort((a, b) => (b.status === 'OVERDUE' ? 1 : 0) - (a.status === 'OVERDUE' ? 1 : 0)).map((med) => (
                <PendingMedCard key={med.id} med={med} onScan={handleScan} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Histórico de Administração</CardTitle></CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum registro de administração</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Paciente</TableHead>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Dose / Via</TableHead>
                      <TableHead>Horário Prev.</TableHead>
                      <TableHead>Administrado em</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>5 Certos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((rec) => (
                      <TableRow key={rec.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell>
                          <p className="font-medium text-sm">{rec.patientName}</p>
                          <p className="text-xs text-zinc-500">{rec.mrn}</p>
                        </TableCell>
                        <TableCell>{rec.medicationName}</TableCell>
                        <TableCell className="text-zinc-400">{rec.dose} · {rec.route}</TableCell>
                        <TableCell className="text-zinc-400">{formatTime(rec.scheduledTime)}</TableCell>
                        <TableCell className="text-zinc-400">{formatDate(rec.administeredAt)}</TableCell>
                        <TableCell className="text-zinc-400">{rec.administeredBy}</TableCell>
                        <TableCell>
                          {rec.allRightsVerified
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            : <XCircle className="h-4 w-4 text-red-400" />}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={rec.status === 'ADMINISTERED'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : rec.status === 'HELD'
                              ? 'bg-red-500/20 text-red-400 border-red-500/50'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50'}>
                            {rec.status === 'ADMINISTERED' ? 'Administrado' : rec.status === 'HELD' ? 'Suspenso' : rec.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Compliance — 5 Certos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#27272a" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke={complianceRate >= 95 ? '#10b981' : complianceRate >= 80 ? '#eab308' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${complianceRate} ${100 - complianceRate}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{complianceRate}%</span>
                      <span className="text-xs text-zinc-400">Compliance</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Verificações com 5 certos</span>
                    <span className="font-medium">{allRightsCount}/{history.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Pendentes agora</span>
                    <span className={pending.length > 0 ? 'text-yellow-400 font-medium' : 'text-emerald-400 font-medium'}>{pending.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Atrasados</span>
                    <span className={overdueCount > 0 ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>{overdueCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Os 5 Certos da Medicação</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {FIVE_RIGHTS.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800">
                    <Icon className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
                <p className="text-xs text-zinc-500 pt-2">
                  Todos os cinco critérios devem ser verificados via código de barras antes de cada administração.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <VerificationResultDialog
        verification={verificationResult}
        open={verifyDialog}
        onClose={() => { setVerifyDialog(false); setVerificationResult(null); }}
      />
    </div>
  );
}
