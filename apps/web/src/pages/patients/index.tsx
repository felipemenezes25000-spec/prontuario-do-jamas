import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Mic, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, getInitials, calculateAge, formatCPF } from '@/lib/utils';
import { riskLevelInfo } from '@/lib/constants';
import type { RiskLevel } from '@/types';
import { usePatients } from '@/services/patients.service';

function riskLevelFromScore(score?: number): RiskLevel | undefined {
  if (score == null) return undefined;
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}
import { useDebounce } from '@/hooks/use-debounce';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

export default function PatientsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const { data: patientsData, isLoading, isError, refetch } = usePatients({
    search: debouncedSearch || undefined,
    riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
    page,
    limit: 20,
  });

  const filteredPatients = patientsData?.data ?? [];
  const totalPatients = patientsData?.total ?? 0;
  const totalPages = patientsData?.totalPages ?? 1;

  const maskCPF = (cpf: string) => {
    const formatted = formatCPF(cpf);
    return `***.${formatted.slice(4, 7)}.${formatted.slice(8, 11)}-**`;
  };

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
        <Button
          onClick={() => navigate('/pacientes/novo')}
          className="bg-teal-600 hover:bg-teal-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="group relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-focus-within:scale-110 group-focus-within:text-teal-600 dark:text-teal-400" />
          <Input
            placeholder="Buscar por nome, CPF ou prontuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border transition-all focus:border-teal-500/50 focus:ring-teal-500/20"
          />
        </div>
        <Button variant="outline" size="icon" className="shrink-0 border-border">
          <Mic className="h-4 w-4" />
        </Button>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <SelectValue placeholder="Nível de Risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os riscos</SelectItem>
            <SelectItem value="LOW">Baixo</SelectItem>
            <SelectItem value="MEDIUM">Médio</SelectItem>
            <SelectItem value="HIGH">Alto</SelectItem>
            <SelectItem value="CRITICAL">Crítico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Patient Table */}
      {filteredPatients.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            {/* Medical folder SVG illustration */}
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-muted-foreground">
              <rect x="12" y="20" width="56" height="44" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M28 20V16a4 4 0 014-4h16a4 4 0 014 4v4" stroke="currentColor" strokeWidth="2" />
              <path d="M40 34v16M32 42h16" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </svg>
            <h3 className="mt-4 text-lg font-medium">Nenhum paciente encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Prontuário</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Paciente</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">CPF</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Idade</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground lg:table-cell">Convênio</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground xl:table-cell">Tags</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Risco</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredPatients.map((patient) => {
                  const riskLevel = riskLevelFromScore(patient.riskScore);
                  const risk = riskLevel ? riskLevelInfo[riskLevel] : undefined;
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/pacientes/${patient.id}`)}
                      className="group cursor-pointer transition-all hover:bg-accent/30 border-l-2 border-l-transparent hover:border-l-primary hover:translate-x-0.5"
                    >
                      <td className="px-4 py-3">
                        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">
                          {patient.mrn}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={patient.photo} />
                            <AvatarFallback className="bg-secondary text-xs">
                              {getInitials(patient.name ?? patient.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{patient.name ?? patient.fullName}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">{patient.cpf ? maskCPF(patient.cpf) : '—'}</span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="text-sm">{calculateAge(patient.birthDate)} anos</span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {patient.insuranceProvider ?? 'Particular'}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {patient.tags.slice(0, 2).map((tag) => {
                            const tagColors: Record<string, string> = {
                              diabético: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
                              hipertenso: 'bg-red-500/15 text-red-400 border-red-500/20',
                              cardiopata: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
                              asmático: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
                              gestante: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
                              idoso: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
                              pediátrico: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
                              oncológico: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
                            };
                            const colorClass = tagColors[tag.toLowerCase()] ?? 'bg-muted/50 text-muted-foreground border-border';
                            return (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className={cn('text-[10px] border', colorClass)}
                              >
                                {tag}
                              </Badge>
                            );
                          })}
                          {patient.tags.length > 2 && (
                            <Badge variant="secondary" className="bg-secondary text-[10px] text-muted-foreground">
                              +{patient.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {risk && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-8 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  risk.score < 30
                                    ? 'bg-green-500'
                                    : risk.score < 60
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500',
                                )}
                                style={{ width: `${risk.score}%` }}
                              />
                            </div>
                            <span className={cn('text-xs font-medium', risk.color)}>
                              {risk.score}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pacientes/${patient.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {totalPatients} paciente{totalPatients !== 1 ? 's' : ''} encontrado{totalPatients !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                className="border-border text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button variant="outline" size="sm" className="border-border bg-teal-600/20 text-xs text-teal-600 dark:text-teal-400">
                {page}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                className="border-border text-xs"
                onClick={() => setPage((p) => p + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
