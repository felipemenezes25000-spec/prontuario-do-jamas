import { useMemo, useState } from 'react';
import {
  Pill,
  Search,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePrescriptions } from '@/services/prescriptions.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

export default function PharmacyPage() {
  const [search, setSearch] = useState('');
  const { data: prescriptionsData, isLoading, isError, refetch } = usePrescriptions();
  const prescriptions = prescriptionsData?.data ?? [];

  const kpiValues = useMemo(() => {
    const pending = prescriptions.filter((p) => p.status === 'ACTIVE' || p.status === 'DRAFT').length;
    const dispensed = prescriptions.filter((p) => p.status === 'COMPLETED').length;
    const totalItems = prescriptions.reduce((sum, p) => sum + (p.items?.length ?? 0), 0);
    const highAlertItems = prescriptions.reduce(
      (sum, p) => sum + (p.items?.filter((i) => i.isHighAlert).length ?? 0),
      0,
    );
    return { pending, dispensed, totalItems, highAlertItems };
  }, [prescriptions]);

  if (isLoading) return <PageLoading cards={4} showTable={false} />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Farmácia</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Prescrições Pendentes', value: String(kpiValues.pending), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Dispensadas', value: String(kpiValues.dispensed), icon: CheckCircle2, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'Itens Alto Alerta', value: String(kpiValues.highAlertItems), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Total de Itens', value: String(kpiValues.totalItems), icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.bg)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar medicamento ou prescrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Dispensing Queue */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fila de Dispensação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Pill className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescrição na fila</p>
            </div>
          ) : prescriptions.map((presc) => (
            <div key={presc.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Paciente {presc.patientId.slice(-6)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(presc.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] text-white',
                    presc.status === 'ACTIVE' ? 'bg-teal-600' : presc.status === 'DRAFT' ? 'bg-yellow-600' : 'bg-muted-foreground',
                  )}
                >
                  {presc.status === 'ACTIVE' ? 'Ativa' : presc.status === 'DRAFT' ? 'Rascunho' : presc.status}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {presc.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <Pill className={cn('h-3 w-3 shrink-0', item.isHighAlert ? 'text-red-400' : 'text-muted-foreground')} />
                    <span className={item.isHighAlert ? 'text-red-300' : ''}>{item.medicationName}</span>
                    <span className="text-muted-foreground">— {item.dose} {item.route} {item.frequency}</span>
                  </div>
                ))}
              </div>
              {presc.status === 'ACTIVE' && (
                <Button size="sm" className="mt-3 bg-teal-600 hover:bg-teal-500 text-xs h-7">
                  <CheckCircle2 className="mr-1.5 h-3 w-3" />
                  Dispensar
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
