import { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Upload,
  Eye,
  Trash2,
  PenTool,
  Filter,
  FileBadge,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useDocuments,
  useSignDocument,
  useDeleteDocument,
  useCreateDocument,
  type DocumentFilters,
} from '@/services/documents.service';
import type { ClinicalDocument, DocumentType, DocumentStatus } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
// ─── Constants ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DocumentType, { label: string; icon: typeof FileText }> = {
  ATESTADO: { label: 'Atestado', icon: FileBadge },
  RECEITA: { label: 'Receita', icon: FileCheck },
  ENCAMINHAMENTO: { label: 'Encaminhamento', icon: FileText },
  LAUDO: { label: 'Laudo', icon: FileText },
  DECLARACAO: { label: 'Declaração', icon: FileText },
  CONSENTIMENTO: { label: 'TCLE', icon: FileText },
  TERMO_RESPONSABILIDADE: { label: 'Termo de Responsabilidade', icon: FileText },
  RELATORIO: { label: 'Relatório', icon: FileText },
  PRONTUARIO_RESUMO: { label: 'Resumo de Prontuário', icon: FileText },
  FICHA_INTERNACAO: { label: 'Ficha de Internação', icon: FileText },
  SUMARIO_ALTA: { label: 'Sumário de Alta', icon: FileText },
  BOLETIM_OCORRENCIA: { label: 'Boletim de Ocorrência', icon: FileText },
  CERTIDAO_OBITO: { label: 'Certidão de Óbito', icon: FileText },
  CUSTOM: { label: 'Personalizado', icon: FileText },
};

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-500/20 text-gray-400' },
  FINAL: { label: 'Final', color: 'bg-blue-500/20 text-blue-400' },
  SIGNED: { label: 'Assinado', color: 'bg-emerald-500/20 text-emerald-400' },
  VOIDED: { label: 'Anulado', color: 'bg-red-500/20 text-red-400' },
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    patientId: '',
    title: '',
    type: 'LAUDO' as DocumentType,
    content: '',
  });

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);

  const filters: DocumentFilters = {
    ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    page,
    limit: 25,
  };

  const { data, isLoading, error } = useDocuments(filters);
  const signDocument = useSignDocument();
  const deleteDocument = useDeleteDocument();
  const createDocument = useCreateDocument();

  const filteredDocs = useMemo(() => {
    if (!data?.data) return [];
    if (!debouncedSearch) return data.data;
    const q = debouncedSearch.toLowerCase();
    return data.data.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        (doc.patientId && doc.patientId.toLowerCase().includes(q)),
    );
  }, [data?.data, debouncedSearch]);

  const handleSign = async (doc: ClinicalDocument) => {
    try {
      await signDocument.mutateAsync(doc.id);
      toast.success('Documento assinado com sucesso.');
    } catch {
      toast.error('Erro ao assinar documento.');
    }
  };

  const handleDelete = async (doc: ClinicalDocument) => {
    try {
      await deleteDocument.mutateAsync(doc.id);
      toast.success('Documento excluído.');
    } catch {
      toast.error('Erro ao excluir documento.');
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.patientId || !uploadForm.title) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      await createDocument.mutateAsync({
        patientId: uploadForm.patientId,
        title: uploadForm.title,
        type: uploadForm.type,
        content: uploadForm.content,
      });
      toast.success('Documento criado com sucesso.');
      setUploadDialogOpen(false);
      setUploadForm({ patientId: '', title: '', type: 'LAUDO', content: '' });
    } catch {
      toast.error('Erro ao criar documento.');
    }
  };

  const openPreview = (doc: ClinicalDocument) => {
    setPreviewDoc(doc);
    setPreviewDialogOpen(true);
  };

  if (error) {
    return <PageError message="Erro ao carregar documentos." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-400" />
            Gestão de Documentos
          </h1>
          <p className="text-muted-foreground">
            Documentos clínicos: laudos, receitas, atestados, declarações e termos
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{data?.total ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-400">
              {data?.data?.filter((d) => d.status === 'SIGNED').length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Assinados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-400">
              {data?.data?.filter((d) => d.status === 'FINAL').length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Finalizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gray-400">
              {data?.data?.filter((d) => d.status === 'DRAFT').length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Rascunhos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou paciente..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as DocumentType | 'ALL'); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Tipos</SelectItem>
            {(Object.keys(TYPE_LABELS) as DocumentType[]).map((key) => (
              <SelectItem key={key} value={key}>{TYPE_LABELS[key].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as DocumentStatus | 'ALL'); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="DRAFT">Rascunho</SelectItem>
            <SelectItem value="FINAL">Final</SelectItem>
            <SelectItem value="SIGNED">Assinado</SelectItem>
            <SelectItem value="VOIDED">Anulado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Documentos
            {data?.total !== undefined && (
              <Badge variant="outline" className="ml-2">{data.total}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoading />
          ) : filteredDocs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => {
                    const typeCfg = TYPE_LABELS[doc.type] ?? { label: doc.type, icon: FileText };
                    const statusCfg = STATUS_CONFIG[doc.status as DocumentStatus] ?? { label: doc.status, color: 'bg-gray-500/20 text-gray-400' };
                    const TypeIcon = typeCfg.icon;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{typeCfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{doc.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.patientId ? doc.patientId.slice(0, 8) + '...' : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.createdAt
                            ? new Date(doc.createdAt).toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openPreview(doc)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                            {doc.status !== 'SIGNED' && doc.status !== 'VOIDED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-400"
                                onClick={() => handleSign(doc)}
                                disabled={signDocument.isPending}
                              >
                                <PenTool className="h-3 w-3 mr-1" />
                                Assinar
                              </Button>
                            )}
                            {doc.status === 'DRAFT' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-400"
                                onClick={() => handleDelete(doc)}
                                disabled={deleteDocument.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {data && data.total > 25 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {Math.ceil(data.total / 25)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 25)} onClick={() => setPage((p) => p + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum documento encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
            <DialogDescription>Crie um novo documento clínico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ID do Paciente *</label>
              <Input
                placeholder="UUID do paciente"
                value={uploadForm.patientId}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, patientId: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                placeholder="Título do documento"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={uploadForm.type}
                onValueChange={(val) => setUploadForm((prev) => ({ ...prev, type: val as DocumentType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as DocumentType[]).map((key) => (
                    <SelectItem key={key} value={key}>{TYPE_LABELS[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Conteúdo</label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Conteúdo do documento..."
                value={uploadForm.content}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, content: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={createDocument.isPending}>
              {createDocument.isPending ? 'Criando...' : 'Criar Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title ?? 'Documento'}</DialogTitle>
            <DialogDescription>
              {previewDoc?.type && TYPE_LABELS[previewDoc.type]?.label} |
              {previewDoc?.status && STATUS_CONFIG[previewDoc.status as DocumentStatus]?.label}
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="prose prose-sm dark:prose-invert max-h-96 overflow-y-auto">
            {previewDoc?.content ? (
              <div className="whitespace-pre-wrap text-sm">{previewDoc.content}</div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Conteúdo não disponível para preview.</p>
            )}
          </div>
          {previewDoc?.signedAt && (
            <div className="text-xs text-muted-foreground mt-2">
              Assinado em: {new Date(previewDoc.signedAt).toLocaleString('pt-BR')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
