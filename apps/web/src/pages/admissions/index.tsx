import { useState } from 'react';
import {
  BedDouble,
  ArrowLeftRight,
  User,
  Clock,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
} from '@/components/ui/dialog';
import { cn, calculateAge } from '@/lib/utils';
import { useBeds } from '@/services/admissions.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { BedStatus } from '@/types';

const wards = [
  { id: 'ward-uti', name: 'UTI' },
  { id: 'ward-enf', name: 'Enfermaria' },
  { id: 'ward-obs', name: 'Observação' },
];

const statusConfig: Record<BedStatus, { label: string; color: string; borderColor: string; icon: typeof BedDouble }> = {
  AVAILABLE: { label: 'Disponível', color: 'bg-green-500', borderColor: 'border-green-500/40', icon: BedDouble },
  OCCUPIED: { label: 'Ocupado', color: 'bg-red-500', borderColor: 'border-red-500/40', icon: User },
  RESERVED: { label: 'Reservado', color: 'bg-blue-500', borderColor: 'border-blue-500/40', icon: Clock },
  CLEANING: { label: 'Limpeza', color: 'bg-yellow-500', borderColor: 'border-yellow-500/40', icon: Sparkles },
  MAINTENANCE: { label: 'Manutenção', color: 'bg-muted-foreground/80', borderColor: 'border-muted-foreground/40', icon: Wrench },
  BLOCKED: { label: 'Bloqueado', color: 'bg-zinc-600', borderColor: 'border-zinc-500/40', icon: Wrench },
};

export default function AdmissionsPage() {
  const [selectedWard, setSelectedWard] = useState('ward-enf');
  const [selectedBed, setSelectedBed] = useState<string | null>(null);

  const { data: allBeds = [], isLoading, isError, refetch } = useBeds();

  const wardBeds = allBeds.filter((b) => b.ward === selectedWard);
  const occupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
  const total = wardBeds.length;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const bedDetail = selectedBed ? allBeds.find((b) => b.id === selectedBed) : null;

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Internações</h1>

      <Tabs defaultValue="mapa">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="mapa" className="text-xs data-[state=active]:bg-teal-600">Mapa de Leitos</TabsTrigger>
          <TabsTrigger value="internados" className="text-xs data-[state=active]:bg-teal-600">Internados</TabsTrigger>
          <TabsTrigger value="transferencias" className="text-xs data-[state=active]:bg-teal-600">Transferências</TabsTrigger>
        </TabsList>

        {/* Mapa de Leitos */}
        <TabsContent value="mapa" className="space-y-4 mt-4">
          {/* Ward Selector & Stats */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="w-full sm:w-52 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Disponível ({total - occupied})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Ocupado ({occupied})</span>
              </div>
            </div>
          </div>

          {/* Occupancy Bar */}
          <Card className="border-border bg-card">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Ocupação</span>
                <span className={cn('text-sm font-bold', occupancyPct > 80 ? 'text-red-400' : occupancyPct > 60 ? 'text-amber-400' : 'text-teal-600 dark:text-teal-400')}>
                  {occupancyPct}%
                </span>
              </div>
              <Progress value={occupancyPct} className="h-2" />
            </CardContent>
          </Card>

          {/* Bed Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {wardBeds.map((bed) => {
              const config = statusConfig[bed.status];
              const patient = bed.currentPatient;
              return (
                <Card
                  key={bed.id}
                  onClick={() => setSelectedBed(bed.id)}
                  className={cn(
                    'cursor-pointer border-2 transition-all hover:scale-[1.02]',
                    config.borderColor,
                    'bg-card',
                    // 3D depth effect
                    'shadow-[0_2px_4px_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.1)]',
                    'hover:shadow-[0_4px_8px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.15)]',
                    // Available beds pulse green
                    bed.status === 'AVAILABLE' && 'animate-green-pulse',
                    // Long stay amber glow (simulate >7 days)
                    bed.status === 'OCCUPIED' && bed.bedNumber.includes('1') && 'glow-amber',
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{bed.bedNumber}</span>
                      <div className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                    </div>
                    {bed.status === 'OCCUPIED' && patient ? (
                      <div className="mt-2">
                        <p className="truncate text-xs font-medium">{patient.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {calculateAge(patient.birthDate)} anos
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Internados */}
        <TabsContent value="internados" className="mt-4">
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Leito</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Paciente</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Dias</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {allBeds
                    .filter((b) => b.status === 'OCCUPIED' && b.currentPatient)
                    .map((bed) => (
                      <tr key={bed.id} className="hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">{bed.bedNumber}</code>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{bed.currentPatient?.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {Math.floor(Math.random() * 10) + 1}d
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">Em acompanhamento</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Transferências */}
        <TabsContent value="transferencias" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center py-12">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma transferência pendente</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bed Detail Dialog */}
      <Dialog open={!!selectedBed} onOpenChange={() => setSelectedBed(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Leito {bedDetail?.bedNumber}</DialogTitle>
          </DialogHeader>
          {bedDetail && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded-full', statusConfig[bedDetail.status].color)} />
                <span className="text-sm">{statusConfig[bedDetail.status].label}</span>
              </div>
              {bedDetail.currentPatient && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="font-medium">{bedDetail.currentPatient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {calculateAge(bedDetail.currentPatient.birthDate)} anos —{' '}
                    {bedDetail.currentPatient.gender === 'F' ? 'Feminino' : 'Masculino'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Convênio: {bedDetail.currentPatient.insuranceProvider ?? 'Particular'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
