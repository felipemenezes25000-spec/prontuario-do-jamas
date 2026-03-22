import { useState, useMemo } from 'react';
import {
  Scissors,
  Clock,
  Circle,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSurgicalProcedures } from '@/services/surgical.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { SurgicalProcedure } from '@/types';

// Surgical rooms are a static UI concept (not managed via API)
interface SurgicalRoom {
  id: string;
  name: string;
  status: 'FREE' | 'IN_USE' | 'CLEANING' | 'MAINTENANCE';
  currentProcedure?: string;
  patient?: string;
  team?: string;
  elapsedMinutes?: number;
}

const roomStatusConfig = {
  FREE: { label: 'Livre', color: 'border-green-500/40', bg: 'bg-green-500', icon: Circle },
  IN_USE: { label: 'Em Uso', color: 'border-red-500/40', bg: 'bg-red-500', icon: Scissors },
  CLEANING: { label: 'Limpeza', color: 'border-yellow-500/40', bg: 'bg-yellow-500', icon: Circle },
  MAINTENANCE: { label: 'Manutenção', color: 'border-muted-foreground/40', bg: 'bg-muted-foreground/80', icon: Wrench },
};

const checklistPhases = [
  {
    name: 'Sign In',
    subtitle: 'Antes da indução anestésica',
    items: [
      'Identidade do paciente confirmada',
      'Procedimento e local marcados',
      'Consentimento assinado',
      'Oxímetro funcionando',
      'Alergias conhecidas verificadas',
      'Risco de via aérea difícil avaliado',
      'Risco de perda sanguínea avaliado',
    ],
  },
  {
    name: 'Time Out',
    subtitle: 'Antes da incisão',
    items: [
      'Equipe apresentada com nomes e funções',
      'Cirurgião confirma: paciente, procedimento, incisão',
      'Profilaxia antibiótica (últimos 60min)',
      'Imagens disponíveis',
      'Eventos críticos antecipados',
    ],
  },
  {
    name: 'Sign Out',
    subtitle: 'Antes do paciente sair da sala',
    items: [
      'Procedimento registrado',
      'Contagem de instrumentos/compressas correta',
      'Peças identificadas e rotuladas',
      'Problemas com equipamentos relatados',
      'Cuidados pós-operatórios definidos',
    ],
  },
];

function deriveSurgicalRooms(procedures: SurgicalProcedure[]): SurgicalRoom[] {
  const roomNames = ['Sala 01', 'Sala 02', 'Sala 03', 'Sala 04', 'Sala 05', 'Sala 06'];
  const inProgress = procedures.filter((p) => p.status === 'IN_PROGRESS');
  return roomNames.map((name, i) => {
    const proc = inProgress[i];
    if (proc) {
      const elapsed = proc.incisionAt
        ? Math.floor((Date.now() - new Date(proc.incisionAt).getTime()) / 60000)
        : proc.patientInAt
          ? Math.floor((Date.now() - new Date(proc.patientInAt).getTime()) / 60000)
          : 0;
      return {
        id: `sr-${String(i + 1).padStart(2, '0')}`,
        name,
        status: 'IN_USE' as const,
        currentProcedure: proc.procedureName,
        patient: proc.patient?.name ?? `Paciente ${proc.patientId.slice(-6)}`,
        team: proc.surgeon?.name ?? 'Equipe cirúrgica',
        elapsedMinutes: elapsed,
      };
    }
    return {
      id: `sr-${String(i + 1).padStart(2, '0')}`,
      name,
      status: (i === 3 ? 'CLEANING' : i === 4 ? 'MAINTENANCE' : 'FREE') as SurgicalRoom['status'],
    };
  });
}

export default function SurgicalPage() {
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { data: proceduresData, isLoading, isError, refetch } = useSurgicalProcedures();
  const allProcedures = proceduresData?.data ?? [];

  const surgicalRooms = useMemo(() => deriveSurgicalRooms(allProcedures), [allProcedures]);

  const todayProcedures = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allProcedures.filter((p) => {
      const schedDate = p.scheduledAt ? p.scheduledAt.slice(0, 10) : '';
      return schedDate === today || p.status === 'IN_PROGRESS';
    });
  }, [allProcedures]);

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const procedure = selectedProcedure ? allProcedures.find((p) => p.id === selectedProcedure) : null;

  if (isLoading) return <PageLoading cards={6} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Centro Cirúrgico</h1>

      {/* Room Map */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Mapa de Salas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {surgicalRooms.map((room) => {
            const config = roomStatusConfig[room.status];
            return (
              <Card key={room.id} className={cn('border-2', config.color, 'bg-card')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{room.name}</span>
                    <div className={cn('h-2.5 w-2.5 rounded-full', config.bg)} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{config.label}</p>
                  {room.status === 'IN_USE' && (
                    <div className="mt-2 space-y-1">
                      <p className="truncate text-xs font-medium">{room.currentProcedure}</p>
                      <p className="text-[10px] text-muted-foreground">{room.patient}</p>
                      <div className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Clock className="h-3 w-3" />
                        {room.elapsedMinutes}min
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Daily Schedule */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Programação do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {todayProcedures.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Scissors className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhum procedimento agendado para hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayProcedures.map((proc) => {
                const time = proc.scheduledAt
                  ? new Date(proc.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '—';
                return (
                  <div
                    key={proc.id}
                    onClick={() => setSelectedProcedure(proc.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
                  >
                    <div className="text-center w-12">
                      <p className="text-sm font-bold">{time}</p>
                    </div>
                    <div className="h-8 w-px bg-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{proc.procedureName}</p>
                      <p className="text-xs text-muted-foreground">
                        {proc.patient?.name ?? `Paciente ${proc.patientId.slice(-6)}`} — {proc.surgeon?.name ?? 'Cirurgião'}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] text-white',
                        proc.status === 'IN_PROGRESS' ? 'bg-teal-600' : proc.status === 'COMPLETED' ? 'bg-muted-foreground/80' : 'bg-muted-foreground',
                      )}
                    >
                      {proc.status === 'IN_PROGRESS' ? 'Em Andamento' : proc.status === 'COMPLETED' ? 'Concluído' : 'Agendado'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Procedure Detail Dialog with Checklist */}
      <Dialog open={!!selectedProcedure} onOpenChange={() => setSelectedProcedure(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{procedure?.procedureName}</DialogTitle>
          </DialogHeader>
          {procedure && (
            <div className="space-y-4">
              <div className="grid gap-2 grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Paciente:</span>{' '}
                  {procedure.patient?.name ?? `Paciente ${procedure.patientId.slice(-6)}`}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Cirurgião:</span>{' '}
                  {procedure.surgeon?.name ?? 'Cirurgião'}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Horário:</span>{' '}
                  {procedure.scheduledAt
                    ? new Date(procedure.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </div>
                {procedure.anesthesiaType && (
                  <div>
                    <span className="text-xs text-muted-foreground">Anestesia:</span>{' '}
                    {procedure.anesthesiaType}
                  </div>
                )}
              </div>

              <h3 className="text-sm font-medium">Checklist de Segurança Cirúrgica</h3>
              {checklistPhases.map((phase) => (
                <div key={phase.name} className="rounded-lg border border-border p-3">
                  <h4 className="text-sm font-medium">{phase.name}</h4>
                  <p className="text-[10px] text-muted-foreground mb-2">{phase.subtitle}</p>
                  <div className="space-y-2">
                    {phase.items.map((item) => {
                      const key = `${phase.name}-${item}`;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            checked={checkedItems.has(key)}
                            onCheckedChange={() => toggleCheck(key)}
                            className="border-border"
                          />
                          <span className={cn('text-xs', checkedItems.has(key) ? 'text-muted-foreground line-through' : '')}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
