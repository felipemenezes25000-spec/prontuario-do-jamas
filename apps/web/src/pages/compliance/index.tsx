import { useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  useSBISChecklist,
  useComplianceScore,
  useComplianceGaps,
  useCFMResolutions,
  useUpdateCheckItem,
  useSubmitEvidence,
  type ComplianceStatus,
  type SBISCheckItem,
} from '@/services/sbis-compliance.service';

function statusBadge(status: ComplianceStatus) {
  const map: Record<ComplianceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    COMPLIANT: { label: 'Conforme', variant: 'default' },
    PARTIAL: { label: 'Parcial', variant: 'secondary' },
    NON_COMPLIANT: { label: 'Não Conforme', variant: 'destructive' },
    NOT_APPLICABLE: { label: 'N/A', variant: 'outline' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? 'text-emerald-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-4xl font-bold ${color}`}>{value}%</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function EvidenceDialog({ item }: { item: SBISCheckItem }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const submitEvidence = useSubmitEvidence();

  const handleSubmit = () => {
    if (!file) return;
    submitEvidence.mutate(
      { checkItemId: item.id, file },
      {
        onSuccess: () => {
          toast.success('Evidência enviada com sucesso');
          setOpen(false);
          setFile(null);
        },
        onError: () => toast.error('Erro ao enviar evidência'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-3 w-3 mr-1" />
          Evidência
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Evidência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">{item.requirement}</p>
          <div className="space-y-1">
            <Label>Arquivo de Evidência</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!file || submitEvidence.isPending}
            onClick={handleSubmit}
          >
            {submitEvidence.isPending ? 'Enviando...' : 'Enviar Evidência'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistTab() {
  const { data, isLoading } = useSBISChecklist();
  const updateItem = useUpdateCheckItem();
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'NGS1' | 'NGS2'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ComplianceStatus | 'ALL'>('ALL');

  const items = data?.data ?? [];
  const filtered = items.filter((i) => {
    const levelOk = filterLevel === 'ALL' || i.ngsLevel === filterLevel;
    const statusOk = filterStatus === 'ALL' || i.status === filterStatus;
    return levelOk && statusOk;
  });

  const handleStatusChange = (item: SBISCheckItem, status: ComplianceStatus) => {
    updateItem.mutate(
      { id: item.id, status },
      {
        onSuccess: () => toast.success('Status atualizado'),
        onError: () => toast.error('Erro ao atualizar'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as typeof filterLevel)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Nível NGS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Níveis</SelectItem>
            <SelectItem value="NGS1">NGS1</SelectItem>
            <SelectItem value="NGS2">NGS2</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="COMPLIANT">Conforme</SelectItem>
            <SelectItem value="PARTIAL">Parcial</SelectItem>
            <SelectItem value="NON_COMPLIANT">Não Conforme</SelectItem>
            <SelectItem value="NOT_APPLICABLE">N/A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando checklist...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum item encontrado</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Requisito</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revisado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">{item.category}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{item.requirement}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.ngsLevel}</Badge>
                  </TableCell>
                  <TableCell>{statusBadge(item.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.lastReviewedAt
                      ? new Date(item.lastReviewedAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Select
                        value={item.status}
                        onValueChange={(v) => handleStatusChange(item, v as ComplianceStatus)}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPLIANT">Conforme</SelectItem>
                          <SelectItem value="PARTIAL">Parcial</SelectItem>
                          <SelectItem value="NON_COMPLIANT">Não Conforme</SelectItem>
                          <SelectItem value="NOT_APPLICABLE">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <EvidenceDialog item={item} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ScoreTab() {
  const { data: score, isLoading } = useComplianceScore();

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Calculando score...</div>;
  if (!score) return <div className="text-center py-12 text-muted-foreground">Score indisponível</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Score Geral</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <ScoreRing value={score.overall} label="Conformidade Total" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">NGS1</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <ScoreRing value={score.ngs1} label="Nível NGS1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">NGS2</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <ScoreRing value={score.ngs2} label="Nível NGS2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-400">{score.compliantItems}</p>
            <p className="text-sm text-muted-foreground mt-1">Conformes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-400">{score.partialItems}</p>
            <p className="text-sm text-muted-foreground mt-1">Parciais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-400">{score.nonCompliantItems}</p>
            <p className="text-sm text-muted-foreground mt-1">Não Conformes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{score.totalItems}</p>
            <p className="text-sm text-muted-foreground mt-1">Total de Itens</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GapsTab() {
  const { data, isLoading } = useComplianceGaps();

  const priorityMap = {
    LOW: { label: 'Baixa', color: 'text-blue-400' },
    MEDIUM: { label: 'Média', color: 'text-yellow-400' },
    HIGH: { label: 'Alta', color: 'text-orange-400' },
    CRITICAL: { label: 'Crítico', color: 'text-red-400' },
  };

  const gaps = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando gaps...</div>
      ) : gaps.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p>Nenhum gap identificado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => {
            const p = priorityMap[gap.priority];
            return (
              <Card key={gap.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${p.color}`} />
                        <span className="font-medium text-sm">{gap.requirement}</span>
                        <span className={`text-xs font-medium ${p.color}`}>{p.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{gap.description}</p>
                      {gap.remediation && (
                        <p className="text-xs text-emerald-400 mt-1">
                          Remediação: {gap.remediation}
                        </p>
                      )}
                    </div>
                    {gap.dueDate && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="text-sm font-medium">
                          {new Date(gap.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CFMTab() {
  const { data, isLoading } = useCFMResolutions();
  const resolutions = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando resoluções...</div>
      ) : resolutions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma resolução cadastrada</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Resolução</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Aplicação</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolutions.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.resolutionNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{r.title}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(r.applicableDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {r.notes ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function CompliancePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Conformidade SBIS / CFM</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de conformidade com os requisitos SBIS NGS1/NGS2 e resoluções CFM
          </p>
        </div>
      </div>

      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklist" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Checklist SBIS
          </TabsTrigger>
          <TabsTrigger value="score" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Score de Conformidade
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Gaps
          </TabsTrigger>
          <TabsTrigger value="cfm" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resoluções CFM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <ChecklistTab />
        </TabsContent>
        <TabsContent value="score">
          <ScoreTab />
        </TabsContent>
        <TabsContent value="gaps">
          <GapsTab />
        </TabsContent>
        <TabsContent value="cfm">
          <CFMTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
