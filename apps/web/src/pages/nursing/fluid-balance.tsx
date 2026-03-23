import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Droplets,
  Plus,
  Loader2,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useFluidBalance,
  useFluidBalanceSummary,
  useRecordFluidBalance,
} from '@/services/nursing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

// ============================================================================
// Chart component (simple bar chart using divs, no recharts dependency needed)
// ============================================================================

interface ShiftData {
  label: string;
  input: number;
  output: number;
}

function ShiftBarChart({ data }: { data: ShiftData[] }) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.input, d.output)),
    1,
  );

  return (
    <div className="flex items-end gap-4 h-40">
      {data.map((shift) => (
        <div key={shift.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-1 h-28 w-full justify-center">
            <div
              className="w-8 bg-blue-500/60 rounded-t transition-all"
              style={{ height: `${(shift.input / maxValue) * 100}%`, minHeight: shift.input > 0 ? '4px' : '0' }}
              title={`Entrada: ${shift.input}mL`}
            />
            <div
              className="w-8 bg-amber-500/60 rounded-t transition-all"
              style={{ height: `${(shift.output / maxValue) * 100}%`, minHeight: shift.output > 0 ? '4px' : '0' }}
              title={`Saida: ${shift.output}mL`}
            />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium">{shift.label}</p>
            <div className="flex gap-2 text-[9px] text-muted-foreground">
              <span className="text-blue-400">{shift.input}</span>
              <span className="text-amber-400">{shift.output}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function FluidBalancePage() {
  const [searchParams] = useSearchParams();
  const encounterId = searchParams.get('encounterId') ?? '';
  const patientId = searchParams.get('patientId') ?? '';

  const [shiftFilter, setShiftFilter] = useState<string>('24h');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [recordType, setRecordType] = useState<'INPUT' | 'OUTPUT'>('INPUT');

  const [inputForm, setInputForm] = useState({
    intakeOral: 0,
    intakeIV: 0,
    intakeOther: 0,
    period: '',
  });

  const [outputForm, setOutputForm] = useState({
    outputUrine: 0,
    outputDrain: 0,
    outputEmesis: 0,
    outputStool: 0,
    outputOther: 0,
    period: '',
  });

  const {
    data: fluidRecords = [],
    isLoading,
    isError,
    refetch,
  } = useFluidBalance(encounterId);

  const { data: summary } = useFluidBalanceSummary(encounterId);
  const recordMutation = useRecordFluidBalance();

  const totalInput = summary?.totalInput ?? 0;
  const totalOutput = summary?.totalOutput ?? 0;
  const balance = summary?.balance ?? 0;

  const isAlertPositive = balance > 1000;
  const isAlertNegative = balance < -1000;
  const hasAlert = isAlertPositive || isAlertNegative;

  const shiftChartData = useMemo<ShiftData[]>(() => {
    if (!summary?.shifts) {
      return [
        { label: 'Manha (07-13h)', input: 0, output: 0 },
        { label: 'Tarde (13-19h)', input: 0, output: 0 },
        { label: 'Noite (19-07h)', input: 0, output: 0 },
      ];
    }
    return [
      { label: 'Manha (07-13h)', input: summary.shifts.morning.input, output: summary.shifts.morning.output },
      { label: 'Tarde (13-19h)', input: summary.shifts.afternoon.input, output: summary.shifts.afternoon.output },
      { label: 'Noite (19-07h)', input: summary.shifts.night.input, output: summary.shifts.night.output },
    ];
  }, [summary]);

  const filteredRecords = useMemo(() => {
    if (shiftFilter === '24h') return fluidRecords;
    let startHour: number;
    let endHour: number;

    switch (shiftFilter) {
      case 'morning':
        startHour = 7;
        endHour = 13;
        break;
      case 'afternoon':
        startHour = 13;
        endHour = 19;
        break;
      case 'night':
        startHour = 19;
        endHour = 7;
        break;
      default:
        return fluidRecords;
    }

    return fluidRecords.filter((r) => {
      const recordHour = new Date(r.recordedAt).getHours();
      if (shiftFilter === 'night') {
        return recordHour >= startHour || recordHour < endHour;
      }
      return recordHour >= startHour && recordHour < endHour;
    });
  }, [fluidRecords, shiftFilter]);

  const handleSaveRecord = useCallback(() => {
    if (!encounterId || !patientId) {
      toast.error('Encounter ID e Patient ID sao obrigatorios');
      return;
    }

    const data = {
      encounterId,
      patientId,
      period: recordType === 'INPUT' ? inputForm.period : outputForm.period,
      ...(recordType === 'INPUT'
        ? {
            intakeOral: inputForm.intakeOral,
            intakeIV: inputForm.intakeIV,
            intakeOther: inputForm.intakeOther,
          }
        : {
            outputUrine: outputForm.outputUrine,
            outputDrain: outputForm.outputDrain,
            outputEmesis: outputForm.outputEmesis,
            outputStool: outputForm.outputStool,
            outputOther: outputForm.outputOther,
          }),
    };

    recordMutation.mutate(data, {
      onSuccess: () => {
        toast.success(
          recordType === 'INPUT'
            ? 'Entrada registrada com sucesso'
            : 'Saida registrada com sucesso',
        );
        setAddDialogOpen(false);
        setInputForm({ intakeOral: 0, intakeIV: 0, intakeOther: 0, period: '' });
        setOutputForm({ outputUrine: 0, outputDrain: 0, outputEmesis: 0, outputStool: 0, outputOther: 0, period: '' });
      },
      onError: () => {
        toast.error('Erro ao registrar');
      },
    });
  }, [encounterId, patientId, recordType, inputForm, outputForm, recordMutation]);

  if (!encounterId) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Balanco Hidrico</h1>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-12">
            <Droplets className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Selecione um atendimento para visualizar o balanco hidrico.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Acesse via: /enfermagem/balanco-hidrico?encounterId=...&patientId=...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <PageLoading cards={3} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Balanco Hidrico</h1>
        <div className="flex gap-2">
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24h completas</SelectItem>
              <SelectItem value="morning">Manha (07-13h)</SelectItem>
              <SelectItem value="afternoon">Tarde (13-19h)</SelectItem>
              <SelectItem value="night">Noite (19-07h)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Alert */}
      {hasAlert && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border p-3',
            isAlertPositive
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-red-500/10 border-red-500/30',
          )}
        >
          <AlertTriangle
            className={cn(
              'h-5 w-5',
              isAlertPositive ? 'text-amber-400' : 'text-red-400',
            )}
          />
          <div>
            <p
              className={cn(
                'text-sm font-medium',
                isAlertPositive ? 'text-amber-300' : 'text-red-300',
              )}
            >
              {isAlertPositive
                ? `Balanco positivo elevado: +${balance}mL`
                : `Balanco negativo elevado: ${balance}mL`}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAlertPositive
                ? 'Risco de sobrecarga hidrica. Avaliar necessidade de diuretico.'
                : 'Risco de desidratacao. Avaliar reposicao volemica.'}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">{totalInput} mL</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <ArrowDownToLine className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Saidas</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">{totalOutput} mL</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ArrowUpFromLine className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'border-border bg-card',
            hasAlert && (isAlertPositive ? 'border-amber-500/50' : 'border-red-500/50'),
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balanco</p>
                <p
                  className={cn(
                    'mt-1 text-2xl font-bold',
                    balance > 0 ? 'text-blue-400' : balance < 0 ? 'text-amber-400' : 'text-emerald-400',
                  )}
                >
                  {balance > 0 ? '+' : ''}{balance} mL
                </p>
              </div>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  balance > 0 ? 'bg-blue-500/10' : balance < 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
                )}
              >
                {balance >= 0 ? (
                  <TrendingUp className={cn('h-5 w-5', balance > 0 ? 'text-blue-400' : 'text-emerald-400')} />
                ) : (
                  <TrendingDown className="h-5 w-5 text-amber-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Entradas vs Saidas por Turno (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="h-3 w-3 rounded bg-blue-500/60" />
              Entradas
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="h-3 w-3 rounded bg-amber-500/60" />
              Saidas
            </div>
          </div>
          <ShiftBarChart data={shiftChartData} />
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horario</TableHead>
                <TableHead className="text-right">Oral (mL)</TableHead>
                <TableHead className="text-right">IV (mL)</TableHead>
                <TableHead className="text-right">Outros (mL)</TableHead>
                <TableHead className="text-right">Urina (mL)</TableHead>
                <TableHead className="text-right">Dreno (mL)</TableHead>
                <TableHead className="text-right">Vomito (mL)</TableHead>
                <TableHead className="text-right">Fezes (mL)</TableHead>
                <TableHead className="text-right">Balanco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs">
                      {new Date(record.recordedAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-right text-xs text-blue-400">
                      {record.intakeOral > 0 ? record.intakeOral : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-blue-400">
                      {record.intakeIV > 0 ? record.intakeIV : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-blue-400">
                      {record.intakeOther > 0 ? record.intakeOther : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-400">
                      {record.outputUrine > 0 ? record.outputUrine : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-400">
                      {record.outputDrain > 0 ? record.outputDrain : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-400">
                      {record.outputEmesis > 0 ? record.outputEmesis : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-400">
                      {record.outputStool > 0 ? record.outputStool : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      <span
                        className={cn(
                          record.balance > 0
                            ? 'text-blue-400'
                            : record.balance < 0
                              ? 'text-amber-400'
                              : '',
                        )}
                      >
                        {record.balance > 0 ? '+' : ''}{record.balance}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Record Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Balanco Hidrico</DialogTitle>
            <DialogDescription>
              Registre entradas ou saidas de liquidos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                variant={recordType === 'INPUT' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  recordType === 'INPUT' && 'bg-blue-600 hover:bg-blue-500',
                )}
                onClick={() => setRecordType('INPUT')}
              >
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                Entrada
              </Button>
              <Button
                variant={recordType === 'OUTPUT' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  recordType === 'OUTPUT' && 'bg-amber-600 hover:bg-amber-500',
                )}
                onClick={() => setRecordType('OUTPUT')}
              >
                <ArrowUpFromLine className="mr-1.5 h-4 w-4" />
                Saida
              </Button>
            </div>

            {recordType === 'INPUT' ? (
              <div className="space-y-3">
                <div>
                  <Label>Via Oral (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputForm.intakeOral}
                    onChange={(e) =>
                      setInputForm((prev) => ({
                        ...prev,
                        intakeOral: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label>Soro IV (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputForm.intakeIV}
                    onChange={(e) =>
                      setInputForm((prev) => ({
                        ...prev,
                        intakeIV: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label>Outros (Medicacao IV, etc) (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputForm.intakeOther}
                    onChange={(e) =>
                      setInputForm((prev) => ({
                        ...prev,
                        intakeOther: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Diurese (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={outputForm.outputUrine}
                    onChange={(e) =>
                      setOutputForm((prev) => ({
                        ...prev,
                        outputUrine: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label>Drenagem (SNG, dreno toracico) (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={outputForm.outputDrain}
                    onChange={(e) =>
                      setOutputForm((prev) => ({
                        ...prev,
                        outputDrain: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label>Vomito (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={outputForm.outputEmesis}
                    onChange={(e) =>
                      setOutputForm((prev) => ({
                        ...prev,
                        outputEmesis: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label>Fezes (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={outputForm.outputStool}
                    onChange={(e) =>
                      setOutputForm((prev) => ({
                        ...prev,
                        outputStool: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
                <div>
                  <Label>Outros (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={outputForm.outputOther}
                    onChange={(e) =>
                      setOutputForm((prev) => ({
                        ...prev,
                        outputOther: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-card border-border"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Periodo/Turno</Label>
              <Select
                value={recordType === 'INPUT' ? inputForm.period : outputForm.period}
                onValueChange={(v) => {
                  if (recordType === 'INPUT') {
                    setInputForm((prev) => ({ ...prev, period: v }));
                  } else {
                    setOutputForm((prev) => ({ ...prev, period: v }));
                  }
                }}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Manha (07-13h)</SelectItem>
                  <SelectItem value="afternoon">Tarde (13-19h)</SelectItem>
                  <SelectItem value="night">Noite (19-07h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className={cn(
                recordType === 'INPUT'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-amber-600 hover:bg-amber-500',
              )}
              onClick={handleSaveRecord}
              disabled={recordMutation.isPending}
            >
              {recordMutation.isPending && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Registrar {recordType === 'INPUT' ? 'Entrada' : 'Saida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
