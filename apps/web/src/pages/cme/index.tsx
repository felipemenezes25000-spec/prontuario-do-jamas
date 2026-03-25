import { useState } from 'react';
import {
  FlaskConical,
  Scan,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useInstruments,
  useSterilizationCycles,
  useSurgicalKits,
  useCMEStats,
  useUpdateInstrumentStatus,
  type InstrumentStatus,
  type CycleResult,
} from '@/services/cme.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const INSTRUMENT_STATUS_LABEL: Record<InstrumentStatus, string> = {
  DIRTY: 'Sujo',
  WASHING: 'Em Lavagem',
  STERILIZING: 'Em Esterilização',
  STERILE: 'Estéril',
  IN_USE: 'Em Uso',
  EXPIRED: 'Expirado',
};

const INSTRUMENT_STATUS_CLASS: Record<InstrumentStatus, string> = {
  DIRTY: 'bg-red-900/40 text-red-300 border-red-700',
  WASHING: 'bg-blue-900/40 text-blue-300 border-blue-700',
  STERILIZING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  STERILE: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  IN_USE: 'bg-purple-900/40 text-purple-300 border-purple-700',
  EXPIRED: 'bg-orange-900/40 text-orange-300 border-orange-700',
};

const CYCLE_RESULT_CLASS: Record<CycleResult, string> = {
  APPROVED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  FAILED: 'bg-red-900/40 text-red-300 border-red-700',
  PENDING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
};

const CYCLE_RESULT_LABEL: Record<CycleResult, string> = {
  APPROVED: 'Aprovado',
  FAILED: 'Reprovado',
  PENDING: 'Pendente',
};

function CycleResultBadge({ result }: { result: CycleResult }) {
  return (
    <Badge className={cn('text-xs border', CYCLE_RESULT_CLASS[result])}>
      {CYCLE_RESULT_LABEL[result]}
    </Badge>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats } = useCMEStats();
  if (!stats) return null;

  const cards = [
    { label: 'Total Instrumentos', value: stats.totalInstruments, icon: Scan, color: 'text-blue-400' },
    { label: 'Estéreis', value: stats.sterileCount, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Em Processo', value: stats.inProcessCount, icon: Clock, color: 'text-yellow-400' },
    { label: 'Expirados', value: stats.expiredCount, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Ciclos Hoje', value: stats.cyclesToday, icon: FlaskConical, color: 'text-purple-400' },
    { label: 'Conformidade', value: `${stats.complianceRate.toFixed(1)}%`, icon: BarChart3, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-3">
            <Icon className={cn('w-5 h-5 mb-1', color)} />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Instruments Tab ─────────────────────────────────────────────────────────

function InstrumentsTab() {
  const [statusFilter, setStatusFilter] = useState<InstrumentStatus | undefined>();
  const { data, isLoading } = useInstruments({ status: statusFilter });
  const update = useUpdateInstrumentStatus();

  const instruments = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter ?? 'ALL'}
          onValueChange={(v) => setStatusFilter(v === 'ALL' ? undefined : (v as InstrumentStatus))}
        >
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="ALL" className="text-white">Todos os status</SelectItem>
            {(Object.keys(INSTRUMENT_STATUS_LABEL) as InstrumentStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-white">
                {INSTRUMENT_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-gray-400 text-sm">{data?.total ?? 0} instrumentos</span>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : instruments.length === 0 ? (
        <div className="text-center py-12">
          <Scan className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum instrumento encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Nome</TableHead>
              <TableHead className="text-gray-400">Código de Barras</TableHead>
              <TableHead className="text-gray-400">Kit</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Esterilizado em</TableHead>
              <TableHead className="text-gray-400">Expira em</TableHead>
              <TableHead className="text-gray-400">Avançar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instruments.map((inst) => {
              const nextStatus: Partial<Record<InstrumentStatus, InstrumentStatus>> = {
                DIRTY: 'WASHING',
                WASHING: 'STERILIZING',
                STERILIZING: 'STERILE',
                STERILE: 'IN_USE',
                IN_USE: 'DIRTY',
              };
              const next = nextStatus[inst.status];
              return (
                <TableRow key={inst.id} className="border-gray-700 hover:bg-gray-800/50">
                  <TableCell className="text-white font-medium">{inst.name}</TableCell>
                  <TableCell className="text-gray-300 font-mono text-xs">{inst.barcode}</TableCell>
                  <TableCell className="text-gray-300 text-sm">{inst.kitName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', INSTRUMENT_STATUS_CLASS[inst.status])}>
                      {INSTRUMENT_STATUS_LABEL[inst.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {inst.lastSterilizedAt ? new Date(inst.lastSterilizedAt).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {inst.expiresAt ? new Date(inst.expiresAt).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell>
                    {next && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 text-xs"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate(
                            { id: inst.id, status: next },
                            { onSuccess: () => toast.success(`Movido para: ${INSTRUMENT_STATUS_LABEL[next]}`) },
                          )
                        }
                      >
                        → {INSTRUMENT_STATUS_LABEL[next]}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Cycles Tab ──────────────────────────────────────────────────────────────

function CyclesTab() {
  const { data, isLoading } = useSterilizationCycles();
  const cycles = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : cycles.length === 0 ? (
        <div className="text-center py-12">
          <FlaskConical className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum ciclo de esterilização registrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Nº Ciclo</TableHead>
              <TableHead className="text-gray-400">Equipamento</TableHead>
              <TableHead className="text-gray-400">Temperatura</TableHead>
              <TableHead className="text-gray-400">Pressão</TableHead>
              <TableHead className="text-gray-400">Duração</TableHead>
              <TableHead className="text-gray-400">Indicador Bio.</TableHead>
              <TableHead className="text-gray-400">Indicador Quím.</TableHead>
              <TableHead className="text-gray-400">Resultado</TableHead>
              <TableHead className="text-gray-400">Início</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.map((cycle) => (
              <TableRow key={cycle.id} className="border-gray-700">
                <TableCell className="text-white font-mono">{cycle.cycleNumber}</TableCell>
                <TableCell className="text-gray-300 text-sm">{cycle.equipmentName ?? cycle.equipmentId}</TableCell>
                <TableCell className="text-gray-300">{cycle.temperature}°C</TableCell>
                <TableCell className="text-gray-300">{cycle.pressure} kPa</TableCell>
                <TableCell className="text-gray-300">{cycle.duration} min</TableCell>
                <TableCell><CycleResultBadge result={cycle.biologicalIndicator} /></TableCell>
                <TableCell><CycleResultBadge result={cycle.chemicalIndicator} /></TableCell>
                <TableCell><CycleResultBadge result={cycle.result} /></TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(cycle.startedAt).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Kits Tab ─────────────────────────────────────────────────────────────────

function KitsTab() {
  const { data, isLoading } = useSurgicalKits();
  const kits = data?.data ?? [];

  const kitStatusClass: Record<string, string> = {
    READY: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    IN_USE: 'bg-purple-900/40 text-purple-300 border-purple-700',
    INCOMPLETE: 'bg-red-900/40 text-red-300 border-red-700',
    STERILIZING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  };

  const kitStatusLabel: Record<string, string> = {
    READY: 'Pronto',
    IN_USE: 'Em Uso',
    INCOMPLETE: 'Incompleto',
    STERILIZING: 'Em Esterilização',
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : kits.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum kit cirúrgico cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {kits.map((kit) => (
            <Card key={kit.id} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">{kit.name}</p>
                    <p className="text-gray-400 text-sm">{kit.specialty}</p>
                  </div>
                  <Badge className={cn('text-xs border', kitStatusClass[kit.status])}>
                    {kitStatusLabel[kit.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {kit.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={cn('text-sm', kit.isComplete ? 'text-emerald-400' : 'text-red-400')}>
                    {kit.isComplete ? 'Kit completo' : 'Kit incompleto'}
                  </span>
                  <span className="text-gray-500 text-sm">· {kit.instruments.length} instrumento(s)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {kit.instruments.slice(0, 6).map((inst) => (
                    <Badge key={inst.id} className={cn('text-xs border', INSTRUMENT_STATUS_CLASS[inst.status])}>
                      {inst.name}
                    </Badge>
                  ))}
                  {kit.instruments.length > 6 && (
                    <Badge className="text-xs bg-gray-800 text-gray-400 border-gray-600">
                      +{kit.instruments.length - 6}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CMEPage() {
  const [tab, setTab] = useState('instruments');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-900/40 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">CME — Central de Material e Esterilização</h1>
          <p className="text-sm text-gray-400">Rastreabilidade de instrumentos, ciclos e kits cirúrgicos</p>
        </div>
      </div>

      <StatsBar />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="instruments" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Scan className="w-4 h-4 mr-2" /> Itens Estéreis
          </TabsTrigger>
          <TabsTrigger value="cycles" className="data-[state=active]:bg-gray-700 text-gray-300">
            <FlaskConical className="w-4 h-4 mr-2" /> Lotes de Esterilização
          </TabsTrigger>
          <TabsTrigger value="kits" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Package className="w-4 h-4 mr-2" /> Kits Cirúrgicos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instruments">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-400" /> Instrumentos
              </CardTitle>
            </CardHeader>
            <CardContent><InstrumentsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycles">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-yellow-400" /> Lotes de Esterilização
              </CardTitle>
            </CardHeader>
            <CardContent><CyclesTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kits">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" /> Kits Cirúrgicos
              </CardTitle>
            </CardHeader>
            <CardContent><KitsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
