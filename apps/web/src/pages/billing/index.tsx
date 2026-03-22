import { useState, useMemo } from 'react';
import {
  Receipt,
  TrendingDown,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBillingEntries } from '@/services/billing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-600' },
  SUBMITTED: { label: 'Enviado', color: 'bg-blue-600' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-600' },
  PARTIALLY_APPROVED: { label: 'Parcial', color: 'bg-amber-600' },
  DENIED: { label: 'Glosado', color: 'bg-red-600' },
  APPEALED: { label: 'Em Recurso', color: 'bg-purple-600' },
  PAID: { label: 'Pago', color: 'bg-teal-600' },
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function BillingPage() {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const { data: billingData, isLoading, isError, refetch } = useBillingEntries();
  const allBilling = billingData?.data ?? [];

  const totalBilled = useMemo(() => allBilling.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0), [allBilling]);
  const totalApproved = useMemo(() => allBilling.filter((b) => b.status === 'APPROVED' || b.status === 'PAID').reduce((sum, b) => sum + (b.approvedAmount ?? b.totalAmount ?? 0), 0), [allBilling]);
  const totalDenied = useMemo(() => allBilling.filter((b) => b.status === 'DENIED').reduce((sum, b) => sum + (b.glosedAmount ?? b.totalAmount ?? 0), 0), [allBilling]);
  const totalPending = useMemo(() => allBilling.filter((b) => b.status === 'PENDING' || b.status === 'SUBMITTED').reduce((sum, b) => sum + (b.totalAmount ?? 0), 0), [allBilling]);

  const detail = selectedEntry ? allBilling.find((b) => b.id === selectedEntry) : null;

  const kpis = [
    { label: 'Total Faturado', value: formatCurrency(totalBilled), icon: Receipt, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-500/10' },
    { label: 'Aprovado', value: formatCurrency(totalApproved), icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { label: 'Glosado', value: formatCurrency(totalDenied), icon: TrendingDown, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    { label: 'Pendente', value: formatCurrency(totalPending), icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  ];

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.bgColor)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing Table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lançamentos</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Guia TISS</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Convênio</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Valor</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {allBilling.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry.id)}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                >
                  <td className="px-4 py-3 text-sm">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-muted-foreground font-mono sm:table-cell">{entry.guideNumber ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">{entry.insuranceProvider ?? 'Particular'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-right">{formatCurrency(entry.totalAmount ?? 0)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn('text-[10px] text-white', statusConfig[entry.status]?.color)}>
                      {statusConfig[entry.status]?.label ?? entry.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Detalhes do Lançamento</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid gap-3 grid-cols-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Data</p><p>{new Date(detail.createdAt).toLocaleDateString('pt-BR')}</p></div>
                <div><p className="text-xs text-muted-foreground">Convênio</p><p>{detail.insuranceProvider ?? 'Particular'}</p></div>
                <div><p className="text-xs text-muted-foreground">Guia TISS</p><p className="font-mono text-xs">{detail.guideNumber ?? '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Tipo</p><p>{detail.guideType ?? '—'}</p></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm text-muted-foreground">Valor Total</span>
                <span className="text-lg font-bold">{formatCurrency(detail.totalAmount ?? 0)}</span>
              </div>
              {(detail.approvedAmount != null || detail.glosedAmount != null) && (
                <div className="grid gap-3 grid-cols-2">
                  {detail.approvedAmount != null && (
                    <div className="flex items-center justify-between rounded-lg border border-green-500/20 p-2">
                      <span className="text-xs text-muted-foreground">Aprovado</span>
                      <span className="text-sm font-medium text-green-400">{formatCurrency(detail.approvedAmount)}</span>
                    </div>
                  )}
                  {detail.glosedAmount != null && (
                    <div className="flex items-center justify-between rounded-lg border border-red-500/20 p-2">
                      <span className="text-xs text-muted-foreground">Glosado</span>
                      <span className="text-sm font-medium text-red-400">{formatCurrency(detail.glosedAmount)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="secondary" className={cn('text-xs text-white', statusConfig[detail.status]?.color)}>
                  {statusConfig[detail.status]?.label ?? detail.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
