import { useState, useEffect, useCallback } from 'react';
import {
  Microscope,
  Plus,
  AlertTriangle,
  Clock4,
  Bug,
  ShieldAlert,
  BarChart3,
  FlaskConical,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CultureListItem {
  id: string;
  barcode: string;
  patientId: string;
  sampleType: string;
  sampleSite: string;
  priority: string;
  status: string;
  isolateCount: number;
  hasResistance: boolean;
  collectedAt: string;
  createdAt: string;
  ageHours: number;
}

interface PendingResponse {
  total: number;
  cultures: CultureListItem[];
}

interface IsolateResult {
  id: string;
  organism: string;
  colonyCount: string | null;
  gramStain: string | null;
  morphology: string | null;
  astResults: {
    method: string;
    antibiotics: Array<{
      antibiotic: string;
      mic: number | null;
      interpretation: string;
    }>;
  } | null;
  resistanceMechanisms: string[];
}

interface CultureDetail {
  id: string;
  barcode: string;
  patientId: string;
  sampleType: string;
  sampleSite: string;
  collectedAt: string;
  clinicalIndication: string;
  priority: string;
  status: string;
  statusHistory: Array<{ status: string; timestamp: string }>;
  isolates: IsolateResult[];
  totalIsolates: number;
  hasResistance: boolean;
  documentId: string | null;
}

interface AntibiogramEntry {
  organism: string;
  antibiotics: Array<{
    antibiotic: string;
    tested: number;
    sensitive: number;
    resistant: number;
    sensitivityPercent: number;
  }>;
}

interface AntibiogramResponse {
  period: { from: string; to: string; months: number };
  totalCultures: number;
  totalIsolates: number;
  antibiogram: AntibiogramEntry[];
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const API_BASE = '/api/microbiology';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' })) as { message?: string };
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Status badge ────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    RECEIVED: { variant: 'outline', label: 'Recebida' },
    INCUBATING: { variant: 'secondary', label: 'Incubando' },
    GROWTH_DETECTED: { variant: 'default', label: 'Crescimento' },
    NO_GROWTH: { variant: 'secondary', label: 'Sem Crescimento' },
    PRELIMINARY: { variant: 'default', label: 'Preliminar' },
    FINAL: { variant: 'default', label: 'Final' },
    CANCELLED: { variant: 'destructive', label: 'Cancelada' },
  };
  const entry = map[status] ?? { variant: 'outline' as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function priorityBadge(priority: string) {
  if (priority === 'STAT') return <Badge variant="destructive">STAT</Badge>;
  if (priority === 'URGENT') return <Badge variant="destructive">Urgente</Badge>;
  return <Badge variant="outline">Rotina</Badge>;
}

function interpretationBadge(interpretation: string) {
  if (interpretation === 'SENSITIVE') return <span className="text-emerald-400 font-semibold">S</span>;
  if (interpretation === 'INTERMEDIATE') return <span className="text-yellow-400 font-semibold">I</span>;
  if (interpretation === 'RESISTANT') return <span className="text-red-400 font-semibold">R</span>;
  return <span className="text-gray-500">-</span>;
}

// ─── Register Culture Dialog ─────────────────────────────────────────────────

function RegisterCultureDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    encounterId: '',
    sampleType: 'BLOOD',
    sampleSite: '',
    collectedAt: '',
    clinicalIndication: '',
    priority: 'ROUTINE',
  });

  const handleSubmit = async () => {
    if (!form.patientId || !form.sampleSite || !form.collectedAt || !form.clinicalIndication) return;
    setLoading(true);
    try {
      await apiFetch('/cultures', {
        method: 'POST',
        body: JSON.stringify({
          patientId: form.patientId,
          encounterId: form.encounterId || undefined,
          sampleType: form.sampleType,
          sampleSite: form.sampleSite,
          collectedAt: form.collectedAt,
          clinicalIndication: form.clinicalIndication,
          priority: form.priority,
        }),
      });
      toast.success('Cultura registrada com sucesso');
      setOpen(false);
      setForm({ patientId: '', encounterId: '', sampleType: 'BLOOD', sampleSite: '', collectedAt: '', clinicalIndication: '', priority: 'ROUTINE' });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar cultura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Cultura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Nova Cultura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID do Paciente</Label>
              <Input
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                placeholder="UUID do paciente"
              />
            </div>
            <div className="space-y-1">
              <Label>ID do Atendimento (opcional)</Label>
              <Input
                value={form.encounterId}
                onChange={(e) => setForm((f) => ({ ...f, encounterId: e.target.value }))}
                placeholder="UUID do atendimento"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo de Amostra</Label>
              <Select value={form.sampleType} onValueChange={(v) => setForm((f) => ({ ...f, sampleType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOOD">Sangue</SelectItem>
                  <SelectItem value="URINE">Urina</SelectItem>
                  <SelectItem value="SPUTUM">Escarro</SelectItem>
                  <SelectItem value="WOUND">Ferida</SelectItem>
                  <SelectItem value="CSF">Liquor (LCR)</SelectItem>
                  <SelectItem value="STOOL">Fezes</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Rotina</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                  <SelectItem value="STAT">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Local da Coleta</Label>
            <Input
              value={form.sampleSite}
              onChange={(e) => setForm((f) => ({ ...f, sampleSite: e.target.value }))}
              placeholder="Ex: Veia periferica, Cateter central..."
            />
          </div>
          <div className="space-y-1">
            <Label>Data/Hora da Coleta</Label>
            <Input
              type="datetime-local"
              value={form.collectedAt}
              onChange={(e) => setForm((f) => ({ ...f, collectedAt: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Indicacao Clinica</Label>
            <Input
              value={form.clinicalIndication}
              onChange={(e) => setForm((f) => ({ ...f, clinicalIndication: e.target.value }))}
              placeholder="Ex: Sepse, ITU, Pneumonia..."
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!form.patientId || !form.sampleSite || !form.collectedAt || !form.clinicalIndication || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Registrando...' : 'Registrar Cultura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pending Cultures Tab ────────────────────────────────────────────────────

function PendingCulturesTab() {
  const [data, setData] = useState<PendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCulture, setSelectedCulture] = useState<CultureDetail | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<PendingResponse>('/pending');
      setData(result);
    } catch {
      toast.error('Erro ao carregar culturas pendentes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleViewCulture = async (id: string) => {
    try {
      const culture = await apiFetch<CultureDetail>(`/cultures/${id}`);
      setSelectedCulture(culture);
    } catch {
      toast.error('Erro ao carregar detalhes da cultura');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando culturas pendentes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} cultura(s) pendente(s)
        </p>
        <RegisterCultureDialog onSuccess={() => void loadData()} />
      </div>

      {!data?.cultures.length ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma cultura pendente</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Amostra</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Isolados</TableHead>
                <TableHead>Idade (h)</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cultures.map((c) => (
                <TableRow key={c.id} className={c.hasResistance ? 'bg-red-950/20' : ''}>
                  <TableCell className="font-mono text-xs">{c.barcode}</TableCell>
                  <TableCell className="text-sm">{sampleTypeLabel(c.sampleType)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.sampleSite}</TableCell>
                  <TableCell>{priorityBadge(c.priority)}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{c.isolateCount}</span>
                      {c.hasResistance && (
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.ageHours}h</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleViewCulture(c.id)}
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Culture Detail Dialog */}
      {selectedCulture && (
        <CultureDetailView
          culture={selectedCulture}
          onClose={() => setSelectedCulture(null)}
        />
      )}
    </div>
  );
}

// ─── Culture Detail View ─────────────────────────────────────────────────────

function CultureDetailView({ culture, onClose }: { culture: CultureDetail; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-emerald-400" />
            Cultura {culture.barcode}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Amostra: </span>
              <span className="font-medium">{sampleTypeLabel(culture.sampleType)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Local: </span>
              <span className="font-medium">{culture.sampleSite}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Indicacao: </span>
              <span className="font-medium">{culture.clinicalIndication}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              {statusBadge(culture.status)}
            </div>
            <div>
              <span className="text-muted-foreground">Coleta: </span>
              <span className="font-medium">
                {new Date(culture.collectedAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Prioridade: </span>
              {priorityBadge(culture.priority)}
            </div>
          </div>

          {/* Resistance alert */}
          {culture.hasResistance && (
            <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <span className="text-red-300 font-medium text-sm">
                ALERTA: Mecanismo de resistencia detectado nesta cultura
              </span>
            </div>
          )}

          {/* Isolates */}
          {culture.isolates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum isolado registrado</p>
          ) : (
            culture.isolates.map((isolate) => (
              <Card key={isolate.id} className="bg-gray-800/50">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-sm">{isolate.organism}</span>
                    {isolate.colonyCount && (
                      <Badge variant="outline" className="text-xs">{isolate.colonyCount}</Badge>
                    )}
                    {isolate.gramStain && (
                      <Badge variant="secondary" className="text-xs">{gramStainLabel(isolate.gramStain)}</Badge>
                    )}
                  </div>

                  {/* Resistance mechanisms */}
                  {isolate.resistanceMechanisms.length > 0 && (
                    <div className="space-y-1">
                      {isolate.resistanceMechanisms.map((mech, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-red-950/40 border border-red-900 rounded text-xs text-red-300"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {mech}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AST Table */}
                  {isolate.astResults && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Antibiograma ({astMethodLabel(isolate.astResults.method)})
                      </p>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Antibiotico</TableHead>
                              <TableHead>MIC</TableHead>
                              <TableHead>Resultado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isolate.astResults.antibiotics.map((abx, idx) => (
                              <TableRow
                                key={idx}
                                className={abx.interpretation === 'RESISTANT' ? 'bg-red-950/20' : ''}
                              >
                                <TableCell className="text-sm">{abx.antibiotic}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {abx.mic !== null ? `${abx.mic} mcg/mL` : '-'}
                                </TableCell>
                                <TableCell>{interpretationBadge(abx.interpretation)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Status History */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Historico de Status</p>
            <div className="flex flex-wrap gap-2">
              {culture.statusHistory.map((h, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock4 className="h-3 w-3" />
                  {statusBadge(h.status)}
                  <span>{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Antibiogram Tab ─────────────────────────────────────────────────────────

function AntibiogramTab() {
  const [data, setData] = useState<AntibiogramResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiFetch<AntibiogramResponse>('/antibiogram', {
          method: 'POST',
          body: JSON.stringify({ period: '6' }),
        });
        setData(result);
      } catch {
        toast.error('Erro ao carregar antibiograma institucional');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando antibiograma...</div>;
  }

  if (!data || data.antibiogram.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Sem dados suficientes para gerar o antibiograma institucional.
        <br />
        <span className="text-xs">Necessario culturas finalizadas nos ultimos 6 meses.</span>
      </div>
    );
  }

  // Collect all unique antibiotics
  const allAntibiotics = Array.from(
    new Set(data.antibiogram.flatMap((e) => e.antibiotics.map((a) => a.antibiotic))),
  ).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Periodo: {new Date(data.period.from).toLocaleDateString('pt-BR')} a{' '}
            {new Date(data.period.to).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.totalCultures} culturas, {data.totalIsolates} isolados
          </p>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-gray-900 z-10">Organismo</TableHead>
              {allAntibiotics.map((abx) => (
                <TableHead key={abx} className="text-center text-xs whitespace-nowrap">
                  {abx}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.antibiogram.map((entry) => (
              <TableRow key={entry.organism}>
                <TableCell className="sticky left-0 bg-gray-900 z-10 font-medium text-sm italic">
                  {entry.organism}
                </TableCell>
                {allAntibiotics.map((abx) => {
                  const abxData = entry.antibiotics.find((a) => a.antibiotic === abx);
                  if (!abxData) {
                    return <TableCell key={abx} className="text-center text-xs text-gray-600">-</TableCell>;
                  }
                  const pct = abxData.sensitivityPercent;
                  let colorClass = 'text-emerald-400';
                  if (pct < 50) colorClass = 'text-red-400';
                  else if (pct < 80) colorClass = 'text-yellow-400';
                  return (
                    <TableCell key={abx} className={`text-center text-xs font-mono ${colorClass}`}>
                      {pct}%
                      <span className="block text-[10px] text-muted-foreground">n={abxData.tested}</span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span>&ge; 80% sensibilidade</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span>50-79%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span>&lt; 50%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Label helpers ───────────────────────────────────────────────────────────

function sampleTypeLabel(type: string): string {
  const map: Record<string, string> = {
    BLOOD: 'Sangue',
    URINE: 'Urina',
    SPUTUM: 'Escarro',
    WOUND: 'Ferida',
    CSF: 'Liquor (LCR)',
    STOOL: 'Fezes',
    OTHER: 'Outro',
  };
  return map[type] ?? type;
}

function gramStainLabel(gram: string): string {
  const map: Record<string, string> = {
    GRAM_POS_COCCI: 'Gram+ Cocos',
    GRAM_POS_BACILLI: 'Gram+ Bacilos',
    GRAM_NEG_COCCI: 'Gram- Cocos',
    GRAM_NEG_BACILLI: 'Gram- Bacilos',
    YEAST: 'Leveduras',
    OTHER: 'Outro',
  };
  return map[gram] ?? gram;
}

function astMethodLabel(method: string): string {
  const map: Record<string, string> = {
    DISK_DIFFUSION: 'Disco-difusao',
    MIC_BROTH: 'MIC Microdiluicao',
    ETEST: 'E-test',
    VITEK: 'VITEK',
    AUTOMATED: 'Automatizado',
  };
  return map[method] ?? method;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MicrobiologyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-900/30 rounded-lg">
            <Microscope className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Microbiologia</h1>
            <p className="text-sm text-muted-foreground">
              Culturas, antibiogramas e mecanismos de resistencia
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<FlaskConical className="h-5 w-5 text-emerald-400" />}
          label="Culturas Pendentes"
          description="Aguardando resultado"
        />
        <SummaryCard
          icon={<Bug className="h-5 w-5 text-yellow-400" />}
          label="Crescimento Detectado"
          description="Isolados identificados"
        />
        <SummaryCard
          icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
          label="Alertas Resistencia"
          description="MRSA, ESBL, KPC, VRE"
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
          label="Antibiograma"
          description="Dados institucionais"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="pending" className="data-[state=active]:bg-emerald-900/50">
            <Clock4 className="h-4 w-4 mr-2" />
            Culturas Pendentes
          </TabsTrigger>
          <TabsTrigger value="antibiogram" className="data-[state=active]:bg-emerald-900/50">
            <BarChart3 className="h-4 w-4 mr-2" />
            Antibiograma Institucional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="pt-6">
              <PendingCulturesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="antibiogram">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="pt-6">
              <AntibiogramTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="pt-4 flex items-center gap-3">
        <div className="p-2 bg-gray-700/50 rounded-lg">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
