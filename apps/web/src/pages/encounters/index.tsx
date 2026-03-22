import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, getInitials } from '@/lib/utils';
import { encounterStatusLabels, encounterTypeLabels, triageLevelColors } from '@/lib/constants';
import { useEncounters } from '@/services/encounters.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}min`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function EncountersListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: encountersData, isLoading, isError, refetch } = useEncounters();
  const allEncounters = encountersData?.data ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return allEncounters;
    if (statusFilter === 'active') {
      return allEncounters.filter((e) =>
        ['IN_PROGRESS', 'IN_TRIAGE', 'ON_HOLD'].includes(e.status),
      );
    }
    if (statusFilter === 'waiting') {
      return allEncounters.filter((e) => e.status === 'WAITING' || e.status === 'SCHEDULED');
    }
    if (statusFilter === 'completed') {
      return allEncounters.filter((e) => e.status === 'COMPLETED' || e.status === 'CANCELLED');
    }
    return allEncounters;
  }, [statusFilter, allEncounters]);

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Atendimentos</h1>
        <Button className="bg-teal-600 hover:bg-teal-500" onClick={() => navigate('/atendimentos/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Atendimento
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-teal-600">
            Todos ({allEncounters.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs data-[state=active]:bg-teal-600">
            Em Andamento ({allEncounters.filter((e) => ['IN_PROGRESS', 'IN_TRIAGE', 'ON_HOLD'].includes(e.status)).length})
          </TabsTrigger>
          <TabsTrigger value="waiting" className="text-xs data-[state=active]:bg-teal-600">
            Aguardando ({allEncounters.filter((e) => e.status === 'WAITING' || e.status === 'SCHEDULED').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-teal-600">
            Concluídos ({allEncounters.filter((e) => e.status === 'COMPLETED' || e.status === 'CANCELLED').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Encounters Table */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileX className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhum atendimento encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Não há atendimentos com este filtro</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Horário</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Paciente</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Médico</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground lg:table-cell">Classificação</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((enc) => {
                  const statusInfo = encounterStatusLabels[enc.status];
                  const triageInfo = enc.triageLevel ? triageLevelColors[enc.triageLevel] : null;
                  return (
                    <tr
                      key={enc.id}
                      onClick={() => navigate(`/atendimentos/${enc.id}`)}
                      className="cursor-pointer transition-colors hover:bg-accent/30"
                    >
                      <td className="px-4 py-3 text-sm">
                        {enc.startedAt ? new Date(enc.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-xs">
                              {enc.patient ? getInitials(enc.patient.name ?? enc.patient.fullName) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{enc.patient?.name ?? enc.patient?.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{enc.chiefComplaint}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Badge variant="secondary" className="bg-secondary text-xs text-foreground">
                          {encounterTypeLabels[enc.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                          {statusInfo?.label}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {enc.primaryDoctor?.name}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {triageInfo && (
                          <div className="flex items-center gap-2">
                            <div className={cn('h-3 w-3 rounded-full', triageInfo.bg)} />
                            <span className={cn('text-xs', triageInfo.text)}>{triageInfo.label}</span>
                          </div>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {enc.startedAt ? timeSince(enc.startedAt) : '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
