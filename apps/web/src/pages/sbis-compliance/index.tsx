import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  FileWarning,
  Scale,
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
  useSBISChecklist,
  useComplianceScore,
  useComplianceGaps,
  useCFMResolutions,
  useUpdateCheckItem,
  type ComplianceStatus,
  type Priority,
  type SBISCheckItem,
  type ComplianceGap,
  type CFMResolution,
} from '@/services/sbis-compliance.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  COMPLIANT: 'Conforme',
  PARTIAL: 'Parcial',
  NON_COMPLIANT: 'Não Conforme',
  NOT_APPLICABLE: 'N/A',
};

const STATUS_CLASS: Record<ComplianceStatus, string> = {
  COMPLIANT: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  PARTIAL: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  NON_COMPLIANT: 'bg-red-900/40 text-red-300 border-red-700',
  NOT_APPLICABLE: 'bg-gray-800 text-gray-400 border-gray-600',
};

const STATUS_ICON: Record<ComplianceStatus, typeof CheckCircle2> = {
  COMPLIANT: CheckCircle2,
  PARTIAL: Clock,
  NON_COMPLIANT: XCircle,
  NOT_APPLICABLE: AlertCircle,
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const PRIORITY_CLASS: Record<Priority, string> = {
  LOW: 'bg-gray-800 text-gray-300 border-gray-600',
  MEDIUM: 'bg-blue-900/40 text-blue-300 border-blue-700',
  HIGH: 'bg-orange-900/40 text-orange-300 border-orange-700',
  CRITICAL: 'bg-red-900/40 text-red-300 border-red-700',
};

// ─── Score Card ─────────────────────────────────────────────────────────────

function ScoreOverview() {
  const { data: score, isLoading } = useComplianceScore();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando score…</p>;
  if (!score) return <p className="text-gray-400 text-center py-8">Sem dados de conformidade.</p>;

  const overallColor = score.overall >= 80 ? 'text-emerald-400' : score.overall >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gray-900 border-gray-700 md:col-span-2 lg:col-span-1">
        <CardContent className="pt-4 text-center">
          <div className={cn('text-5xl font-bold', overallColor)}>{score.overall.toFixed(0)}%</div>
          <p className="text-gray-400 text-sm mt-1">Score Geral</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{score.ngs1.toFixed(0)}%</p>
          <p className="text-xs text-gray-400">NGS1</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{score.ngs2.toFixed(0)}%</p>
          <p className="text-xs text-gray-400">NGS2</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-medium">{score.totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Conformes</span>
              <span className="text-white font-medium">{score.compliantItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Parciais</span>
              <span className="text-white font-medium">{score.partialItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">Não conformes</span>
              <span className="text-white font-medium">{score.nonCompliantItems}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Checklist Tab ──────────────────────────────────────────────────────────

function ChecklistTab() {
  const { data, isLoading } = useSBISChecklist();
  const updateItem = useUpdateCheckItem();
  const [ngsFilter, setNgsFilter] = useState<'ALL' | 'NGS1' | 'NGS2'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'ALL'>('ALL');

  const items = data?.data ?? [];
  const filtered = items.filter((item: SBISCheckItem) => {
    if (ngsFilter !== 'ALL' && item.ngsLevel !== ngsFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  function handleStatusUpdate(id: string, status: ComplianceStatus) {
    updateItem.mutate(
      { id, status },
      {
        onSuccess: () => toast.success('Status atualizado.'),
        onError: () => toast.error('Erro ao atualizar status.'),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={ngsFilter} onValueChange={(v) => setNgsFilter(v as typeof ngsFilter)}>
          <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="ALL" className="text-white">Todos NGS</SelectItem>
            <SelectItem value="NGS1" className="text-white">NGS1</SelectItem>
            <SelectItem value="NGS2" className="text-white">NGS2</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44 bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="ALL" className="text-white">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as ComplianceStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-white">{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-gray-400 text-sm">{filtered.length} itens</span>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando checklist…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum item encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">NGS</TableHead>
              <TableHead className="text-gray-400">Categoria</TableHead>
              <TableHead className="text-gray-400">Requisito</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Revisado em</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item: SBISCheckItem) => {
              const Icon = STATUS_ICON[item.status];
              return (
                <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/50">
                  <TableCell>
                    <Badge className={item.ngsLevel === 'NGS1'
                      ? 'bg-blue-900/40 text-blue-300 border-blue-700 text-xs border'
                      : 'bg-purple-900/40 text-purple-300 border-purple-700 text-xs border'
                    }>
                      {item.ngsLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">{item.category}</TableCell>
                  <TableCell className="text-white text-sm max-w-[300px]">{item.requirement}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border flex items-center gap-1 w-fit', STATUS_CLASS[item.status])}>
                      <Icon className="w-3 h-3" />
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {item.lastReviewedAt ? new Date(item.lastReviewedAt).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.status !== 'COMPLIANT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 text-xs"
                          onClick={() => handleStatusUpdate(item.id, 'COMPLIANT')}
                          disabled={updateItem.isPending}
                        >
                          Aprovar
                        </Button>
                      )}
                      {item.status !== 'NON_COMPLIANT' && item.status !== 'COMPLIANT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-700 text-red-300 hover:bg-red-900/30 text-xs"
                          onClick={() => handleStatusUpdate(item.id, 'NON_COMPLIANT')}
                          disabled={updateItem.isPending}
                        >
                          Reprovar
                        </Button>
                      )}
                    </div>
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

// ─── Gaps Tab ───────────────────────────────────────────────────────────────

function GapsTab() {
  const { data, isLoading } = useComplianceGaps();
  const gaps = data?.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Lacunas identificadas na conformidade SBIS com ações recomendadas.
      </p>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando gaps…</p>
      ) : gaps.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="text-gray-400">Nenhuma lacuna encontrada. Parabéns!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap: ComplianceGap) => (
            <Card key={gap.id} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{gap.requirement}</p>
                    <p className="text-gray-400 text-sm mt-1">{gap.description}</p>
                    {gap.remediation && (
                      <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
                        <p className="text-emerald-400 text-xs font-medium">Ação Recomendada:</p>
                        <p className="text-gray-300 text-sm">{gap.remediation}</p>
                      </div>
                    )}
                    {gap.dueDate && (
                      <p className="text-gray-500 text-xs mt-2">
                        Prazo: {new Date(gap.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <Badge className={cn('text-xs border shrink-0', PRIORITY_CLASS[gap.priority])}>
                    {PRIORITY_LABEL[gap.priority]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CFM Tab ────────────────────────────────────────────────────────────────

function CfmTab() {
  const { data, isLoading } = useCFMResolutions();
  const resolutions = data?.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Resoluções do Conselho Federal de Medicina aplicáveis ao PEP.
      </p>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando resoluções…</p>
      ) : resolutions.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma resolução CFM cadastrada.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Resolução</TableHead>
              <TableHead className="text-gray-400">Título</TableHead>
              <TableHead className="text-gray-400">Descrição</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resolutions.map((res: CFMResolution) => (
              <TableRow key={res.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-mono font-bold">{res.resolutionNumber}</TableCell>
                <TableCell className="text-white font-medium">{res.title}</TableCell>
                <TableCell className="text-gray-300 text-sm max-w-[250px] truncate">{res.description}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', STATUS_CLASS[res.status])}>
                    {STATUS_LABEL[res.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(res.applicableDate).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SBISCompliancePage() {
  const [tab, setTab] = useState('checklist');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Conformidade SBIS</h1>
          <p className="text-sm text-gray-400">Checklist NGS1/NGS2, score de conformidade e resoluções CFM</p>
        </div>
      </div>

      {/* Score overview always visible */}
      <ScoreOverview />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="checklist" className="data-[state=active]:bg-gray-700 text-gray-300">
            <ShieldCheck className="w-4 h-4 mr-2" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="gaps" className="data-[state=active]:bg-gray-700 text-gray-300">
            <FileWarning className="w-4 h-4 mr-2" /> Lacunas
          </TabsTrigger>
          <TabsTrigger value="cfm" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Scale className="w-4 h-4 mr-2" /> Resoluções CFM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Checklist de Conformidade SBIS</CardTitle>
            </CardHeader>
            <CardContent><ChecklistTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-orange-400" /> Lacunas e Ações Recomendadas
              </CardTitle>
            </CardHeader>
            <CardContent><GapsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cfm">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-400" /> Resoluções CFM
              </CardTitle>
            </CardHeader>
            <CardContent><CfmTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
