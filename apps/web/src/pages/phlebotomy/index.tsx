import { useState, useMemo, useCallback } from 'react';
import {
  Syringe,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  BarChart3,
  Droplets,
  User,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface TubeNeeded {
  color: string;
  sampleType: string;
  examName: string;
}

type PhlebotomyUrgency = 'STAT' | 'URGENT' | 'ROUTINE';

interface PhlebotomyWorklistItem {
  sampleId: string;
  patientId: string;
  patientName: string;
  room: string;
  bed: string;
  tubesNeeded: TubeNeeded[];
  fastingRequired: boolean;
  specialInstructions: string | null;
  collectionTime: string;
  urgency: PhlebotomyUrgency;
  ward: string;
}

interface WardGroup {
  ward: string;
  items: PhlebotomyWorklistItem[];
}

interface PhlebotomyStats {
  date: string;
  totalPending: number;
  totalCollected: number;
  totalRefused: number;
  byHour: Array<{ hour: number; pending: number; collected: number }>;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_WORKLIST: WardGroup[] = [
  {
    ward: 'Andar 3 — Clínica Médica',
    items: [
      {
        sampleId: 'a1b2c3d4-0001-4000-8000-000000000001',
        patientId: 'p1',
        patientName: 'Maria Silva Santos',
        room: '301',
        bed: 'A',
        tubesNeeded: [
          { color: 'Roxo (EDTA)', sampleType: 'BLOOD', examName: 'Hemograma Completo' },
          { color: 'Amarelo (Gel)', sampleType: 'BLOOD', examName: 'Bioquímica' },
        ],
        fastingRequired: true,
        specialInstructions: 'Paciente em jejum desde 22h. Acesso venoso periférico difícil — preferir mão D.',
        collectionTime: '2026-03-25T06:00:00Z',
        urgency: 'STAT',
        ward: 'Andar 3 — Clínica Médica',
      },
      {
        sampleId: 'a1b2c3d4-0001-4000-8000-000000000002',
        patientId: 'p2',
        patientName: 'João Carlos Oliveira',
        room: '305',
        bed: 'B',
        tubesNeeded: [
          { color: 'Azul (Citrato)', sampleType: 'BLOOD', examName: 'Coagulograma' },
        ],
        fastingRequired: false,
        specialInstructions: null,
        collectionTime: '2026-03-25T06:30:00Z',
        urgency: 'ROUTINE',
        ward: 'Andar 3 — Clínica Médica',
      },
    ],
  },
  {
    ward: 'Andar 5 — UTI',
    items: [
      {
        sampleId: 'a1b2c3d4-0001-4000-8000-000000000003',
        patientId: 'p3',
        patientName: 'Ana Paula Ferreira',
        room: '501',
        bed: 'C',
        tubesNeeded: [
          { color: 'Roxo (EDTA)', sampleType: 'BLOOD', examName: 'Hemograma' },
          { color: 'Verde (Heparina)', sampleType: 'BLOOD', examName: 'Gasometria' },
          { color: 'Amarelo (Gel)', sampleType: 'BLOOD', examName: 'Função Renal' },
        ],
        fastingRequired: false,
        specialInstructions: 'EMERGÊNCIA — Colher via CVC lúmen distal. Paciente entubada.',
        collectionTime: '2026-03-25T05:30:00Z',
        urgency: 'STAT',
        ward: 'Andar 5 — UTI',
      },
      {
        sampleId: 'a1b2c3d4-0001-4000-8000-000000000004',
        patientId: 'p4',
        patientName: 'Roberto Mendes Lima',
        room: '503',
        bed: 'A',
        tubesNeeded: [
          { color: 'Roxo (EDTA)', sampleType: 'BLOOD', examName: 'Hemograma' },
          { color: 'Amarelo (Gel)', sampleType: 'BLOOD', examName: 'Troponina' },
        ],
        fastingRequired: false,
        specialInstructions: 'Coleta seriada de troponina — 3ª amostra.',
        collectionTime: '2026-03-25T06:00:00Z',
        urgency: 'URGENT',
        ward: 'Andar 5 — UTI',
      },
    ],
  },
  {
    ward: 'Andar 2 — Cirúrgica',
    items: [
      {
        sampleId: 'a1b2c3d4-0001-4000-8000-000000000005',
        patientId: 'p5',
        patientName: 'Francisca Almeida Costa',
        room: '210',
        bed: 'B',
        tubesNeeded: [
          { color: 'Roxo (EDTA)', sampleType: 'BLOOD', examName: 'Hemograma' },
        ],
        fastingRequired: true,
        specialInstructions: 'Pré-operatório — cirurgia às 08h.',
        collectionTime: '2026-03-25T06:00:00Z',
        urgency: 'URGENT',
        ward: 'Andar 2 — Cirúrgica',
      },
    ],
  },
];

const MOCK_STATS: PhlebotomyStats = {
  date: '2026-03-25',
  totalPending: 23,
  totalCollected: 47,
  totalRefused: 2,
  byHour: [
    { hour: 5, pending: 3, collected: 8 },
    { hour: 6, pending: 12, collected: 20 },
    { hour: 7, pending: 5, collected: 12 },
    { hour: 8, pending: 2, collected: 5 },
    { hour: 9, pending: 1, collected: 2 },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<PhlebotomyUrgency, { label: string; className: string }> = {
  STAT: { label: 'STAT', className: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' },
  URGENT: { label: 'Urgente', className: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
  ROUTINE: { label: 'Rotina', className: 'bg-slate-500/20 text-slate-400 border-slate-500/50' },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatsCards({ stats }: { stats: PhlebotomyStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Pendentes</p>
              <p className="text-2xl font-bold text-amber-400">{stats.totalPending}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Coletadas</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.totalCollected}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Recusadas</p>
              <p className="text-2xl font-bold text-red-400">{stats.totalRefused}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Taxa de Coleta</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats.totalCollected + stats.totalPending > 0
                  ? Math.round((stats.totalCollected / (stats.totalCollected + stats.totalPending)) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TubeBadge({ tube }: { tube: TubeNeeded }) {
  const TUBE_STYLE: Record<string, string> = {
    'Roxo (EDTA)': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Amarelo (Gel)': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    'Azul (Citrato)': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Verde (Heparina)': 'bg-green-500/20 text-green-300 border-green-500/40',
    'Cinza': 'bg-gray-500/20 text-gray-300 border-gray-500/40',
  };

  return (
    <Badge
      variant="outline"
      className={cn('text-xs', TUBE_STYLE[tube.color] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/40')}
    >
      <Droplets className="h-3 w-3 mr-1" />
      {tube.color} — {tube.examName}
    </Badge>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PhlebotomyWorklistPage() {
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('2026-03-25');
  const [searchQuery, setSearchQuery] = useState('');
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<PhlebotomyWorklistItem | null>(null);
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());

  // In production, these would be TanStack Query hooks calling the API
  const worklist = MOCK_WORKLIST;
  const stats = MOCK_STATS;

  const allWards = useMemo(
    () => worklist.map((g) => g.ward),
    [worklist],
  );

  const filteredWorklist = useMemo(() => {
    let groups = worklist;

    if (wardFilter !== 'all') {
      groups = groups.filter((g) => g.ward === wardFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      groups = groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (item) =>
              item.patientName.toLowerCase().includes(q) ||
              item.room.includes(q) ||
              item.sampleId.includes(q),
          ),
        }))
        .filter((g) => g.items.length > 0);
    }

    // Exclude already collected items
    groups = groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => !collectedItems.has(item.sampleId)),
      }))
      .filter((g) => g.items.length > 0);

    return groups;
  }, [worklist, wardFilter, searchQuery, collectedItems]);

  const totalPendingFiltered = useMemo(
    () => filteredWorklist.reduce((sum, g) => sum + g.items.length, 0),
    [filteredWorklist],
  );

  const handleMarkCollected = useCallback(() => {
    if (!selectedSample) return;
    setCollectedItems((prev) => new Set([...prev, selectedSample.sampleId]));
    toast.success(`Coleta registrada — ${selectedSample.patientName} (Quarto ${selectedSample.room}${selectedSample.bed})`);
    setCollectDialogOpen(false);
    setSelectedSample(null);
  }, [selectedSample]);

  const openCollectDialog = useCallback((item: PhlebotomyWorklistItem) => {
    setSelectedSample(item);
    setCollectDialogOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Syringe className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mapa de Coleta</h1>
            <p className="text-sm text-slate-400">
              Phlebotomy Worklist — {totalPendingFiltered} coletas pendentes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-900 border-slate-700 text-slate-100 w-40"
          />
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Setor / Andar</Label>
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger className="w-64 bg-slate-900 border-slate-700">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all">Todos os setores</SelectItem>
              {allWards.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 max-w-md">
          <Label className="text-slate-400 text-xs">Buscar paciente / quarto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nome, quarto ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Worklist by Ward */}
      {filteredWorklist.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-300">
              Nenhuma coleta pendente
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Todas as coletas do filtro selecionado foram realizadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredWorklist.map((group) => (
          <Card key={group.ward} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-emerald-400" />
                {group.ward}
                <Badge variant="outline" className="ml-2 text-slate-400 border-slate-600">
                  {group.items.length} coleta{group.items.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Urgência</TableHead>
                    <TableHead className="text-slate-400">Paciente</TableHead>
                    <TableHead className="text-slate-400">Quarto/Leito</TableHead>
                    <TableHead className="text-slate-400">Tubos Necessários</TableHead>
                    <TableHead className="text-slate-400">Jejum</TableHead>
                    <TableHead className="text-slate-400">Horário</TableHead>
                    <TableHead className="text-slate-400">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((item) => (
                    <TableRow
                      key={item.sampleId}
                      className={cn(
                        'border-slate-800',
                        item.urgency === 'STAT' && 'bg-red-500/5 hover:bg-red-500/10',
                        item.urgency === 'URGENT' && 'bg-amber-500/5 hover:bg-amber-500/10',
                      )}
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={URGENCY_CONFIG[item.urgency].className}
                        >
                          {URGENCY_CONFIG[item.urgency].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-200">{item.patientName}</p>
                            {item.specialInstructions && (
                              <p className="text-xs text-amber-400 mt-0.5 max-w-xs truncate">
                                {item.specialInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-slate-300">
                          {item.room}{item.bed}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.tubesNeeded.map((tube, idx) => (
                            <TubeBadge key={idx} tube={tube} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.fastingRequired ? (
                          <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/40">
                            Jejum
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-400">
                          {formatTime(item.collectionTime)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openCollectDialog(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Coletar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Hourly Distribution */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Distribuição por Horário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {stats.byHour.map((h) => {
              const maxVal = Math.max(...stats.byHour.map((x) => x.pending + x.collected), 1);
              const totalHeight = ((h.pending + h.collected) / maxVal) * 100;
              const collectedHeight = (h.collected / maxVal) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-slate-700"
                      style={{ height: `${totalHeight}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-emerald-500/60"
                      style={{ height: `${collectedHeight}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{String(h.hour).padStart(2, '0')}h</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/60" />
              Coletadas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-700" />
              Pendentes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mark Collected Dialog */}
      <Dialog open={collectDialogOpen} onOpenChange={setCollectDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Confirmar Coleta
            </DialogTitle>
          </DialogHeader>
          {selectedSample && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800 space-y-2">
                <p className="font-medium text-slate-200">{selectedSample.patientName}</p>
                <p className="text-sm text-slate-400">
                  Quarto {selectedSample.room}{selectedSample.bed} — {selectedSample.ward}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedSample.tubesNeeded.map((tube, idx) => (
                    <TubeBadge key={idx} tube={tube} />
                  ))}
                </div>
                {selectedSample.specialInstructions && (
                  <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {selectedSample.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Observações da coleta (opcional)</Label>
                <Input
                  placeholder="Ex: coleta sem intercorrências, veia cubital D..."
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialogOpen(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button onClick={handleMarkCollected} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirmar Coleta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
