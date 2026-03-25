import { useState } from 'react';
import {
  Zap,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CapturedCharge {
  chargeId: string;
  encounterId: string;
  patientName: string;
  mrn: string;
  procedureCode: string;
  procedureName: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  capturedAt: string;
  source: 'AUTO' | 'MANUAL' | 'INTEGRATION';
  status: 'PENDING' | 'REVIEWED' | 'BILLED' | 'CANCELLED';
}

interface ChargeSummary {
  totalCharges: number;
  totalValue: number;
  pendingReview: number;
  autoCaptures: number;
  period: string;
}

// ─── Keys ───────────────────────────────────────────────────────────────────

const chargeKeys = {
  all: ['charge-capture'] as const,
  list: (filters?: Record<string, unknown>) => [...chargeKeys.all, 'list', filters] as const,
  summary: () => [...chargeKeys.all, 'summary'] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useCharges(filters?: { status?: string; encounterId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: chargeKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<CapturedCharge[]>('/billing/charge-capture', { params: filters });
      return data;
    },
  });
}

function useChargeSummary() {
  return useQuery({
    queryKey: chargeKeys.summary(),
    queryFn: async () => {
      const { data } = await api.get<ChargeSummary>('/billing/charge-capture/summary');
      return data;
    },
  });
}

function useRunAutoCapture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/charge-capture/auto-capture');
      return data as { captured: number; totalValue: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chargeKeys.all });
    },
  });
}

function useReviewCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chargeId: string) => {
      const { data } = await api.patch(`/billing/charge-capture/${chargeId}/review`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chargeKeys.all });
    },
  });
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente', REVIEWED: 'Revisado', BILLED: 'Faturado', CANCELLED: 'Cancelado',
};
const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  REVIEWED: 'bg-blue-900/40 text-blue-300 border-blue-700',
  BILLED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  CANCELLED: 'bg-red-900/40 text-red-300 border-red-700',
};
const sourceLabel: Record<string, string> = { AUTO: 'Automático', MANUAL: 'Manual', INTEGRATION: 'Integração' };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChargeCapturesPage() {
  const [encounterId, setEncounterId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filters = {
    encounterId: encounterId || undefined,
    status: statusFilter || undefined,
  };

  const { data: charges = [], isFetching } = useCharges(filters);
  const { data: summary } = useChargeSummary();
  const autoCapture = useRunAutoCapture();
  const reviewCharge = useReviewCharge();

  function handleAutoCapture() {
    autoCapture.mutate(undefined, {
      onSuccess: (r) => toast.success(`${r.captured} cobranças capturadas automaticamente (${fmt(r.totalValue)}).`),
      onError: () => toast.error('Erro ao executar captura automática.'),
    });
  }

  return (
    <div className="bg-[#0a0a0f] min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Charge Capture</h1>
            <p className="text-sm text-gray-400">Captura automática de cobranças por procedimentos realizados</p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleAutoCapture}
          disabled={autoCapture.isPending}
        >
          {autoCapture.isPending
            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
            : <RefreshCw className="w-4 h-4 mr-2" />}
          Captura Automática
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Cobranças', value: summary.totalCharges.toString(), icon: Zap, color: 'text-emerald-400' },
            { label: 'Valor Total', value: fmt(summary.totalValue), icon: DollarSign, color: 'text-blue-400' },
            { label: 'Pendentes Revisão', value: summary.pendingReview.toString(), icon: AlertTriangle, color: 'text-yellow-400' },
            { label: 'Capturas Auto', value: summary.autoCaptures.toString(), icon: CheckCircle, color: 'text-purple-400' },
          ].map((card) => (
            <Card key={card.label} className="bg-[#12121a] border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={cn('w-4 h-4', card.color)} />
                  <p className="text-gray-400 text-xs">{card.label}</p>
                </div>
                <p className="text-white text-xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="bg-[#12121a] border-gray-800">
        <CardContent className="pt-4 flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Label className="text-gray-400 text-xs">Atendimento ID</Label>
            <div className="flex gap-2 mt-1">
              <Input
                className="bg-[#0a0a0f] border-gray-700 text-white"
                placeholder="UUID do atendimento..."
                value={encounterId}
                onChange={(e) => setEncounterId(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-gray-400 text-xs">Status</Label>
            <select
              className="mt-1 block bg-[#0a0a0f] border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="REVIEWED">Revisado</option>
              <option value="BILLED">Faturado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            {isFetching ? 'Carregando...' : `${charges.length} cobrança(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 && !isFetching ? (
            <p className="text-gray-500 text-center py-10 text-sm">Nenhuma cobrança encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Paciente</TableHead>
                  <TableHead className="text-gray-400">MRN</TableHead>
                  <TableHead className="text-gray-400">Procedimento</TableHead>
                  <TableHead className="text-gray-400">Qtd</TableHead>
                  <TableHead className="text-gray-400">Valor Unit.</TableHead>
                  <TableHead className="text-gray-400">Total</TableHead>
                  <TableHead className="text-gray-400">Origem</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.chargeId} className="border-gray-800">
                    <TableCell className="text-white text-sm">{c.patientName}</TableCell>
                    <TableCell className="text-gray-300 font-mono text-xs">{c.mrn}</TableCell>
                    <TableCell>
                      <p className="text-white text-xs">{c.procedureName}</p>
                      <p className="text-gray-500 text-xs font-mono">{c.procedureCode}</p>
                    </TableCell>
                    <TableCell className="text-gray-300">{c.quantity}</TableCell>
                    <TableCell className="text-gray-300">{fmt(c.unitValue)}</TableCell>
                    <TableCell className="text-white font-semibold">{fmt(c.totalValue)}</TableCell>
                    <TableCell>
                      <Badge className="bg-gray-700 text-xs">{sourceLabel[c.source] ?? c.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border', statusColor[c.status] ?? '')}>
                        {statusLabel[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === 'PENDING' && (
                        <Button
                          size="sm"
                          className="bg-blue-700 hover:bg-blue-600 text-white text-xs h-7"
                          onClick={() => reviewCharge.mutate(c.chargeId, {
                            onSuccess: () => toast.success('Cobrança marcada como revisada.'),
                          })}
                          disabled={reviewCharge.isPending}
                        >
                          Revisar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
