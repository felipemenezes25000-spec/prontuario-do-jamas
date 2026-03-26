import { useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  Pen,
  Lock,
  Copy,
  AlertTriangle,
  Loader2,
  Zap,
  Link2,
  X,
  Eye,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import {
  useClinicalNotes,
  useClinicalNote,
  useCreateClinicalNote,
  useUpdateClinicalNote,
  useSignClinicalNote,
  useAddAddendum,
  type ClinicalNoteFilters,
} from '@/services/clinical-notes.service';
import {
  useSmartPhrases,
  useCreateSmartPhrase,
  useDeleteSmartPhrase,
} from '@/services/clinical-documentation.service';
import type { ClinicalNote, NoteType, NoteStatus, CreateClinicalNoteDto } from '@/types';

// ─── helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS_CONFIG: Record<NoteStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' },
  FINAL: { label: 'Finalizada', className: 'bg-blue-900/40 text-blue-300 border-blue-700' },
  SIGNED: { label: 'Assinada', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
  COSIGNED: { label: 'Co-assinada', className: 'bg-green-900/40 text-green-300 border-green-700' },
  AMENDED: { label: 'Adendo', className: 'bg-orange-900/40 text-orange-300 border-orange-700' },
  VOIDED: { label: 'Anulada', className: 'bg-red-900/40 text-red-300 border-red-700' },
};

const NOTE_TYPES: Record<string, string> = {
  SOAP: 'SOAP',
  ADMISSION: 'Admissão',
  EVOLUTION: 'Evolução',
  DISCHARGE_SUMMARY: 'Sumário de Alta',
  OPERATIVE_NOTE: 'Nota Operatória',
  CONSULTATION: 'Interconsulta',
  PROCEDURE_NOTE: 'Procedimento',
  PROGRESS_NOTE: 'Evolução',
  ADDENDUM: 'Adendo',
  CORRECTION: 'Correção',
  TRANSFER: 'Transferência',
};

// ─── SmartPhrases Panel ────────────────────────────────────────────────────

function SmartPhrasesPanel({
  onInsert,
}: {
  onInsert: (text: string) => void;
}) {
  const { data: phrases = [] } = useSmartPhrases();
  const createPhrase = useCreateSmartPhrase();
  const deletePhrase = useDeleteSmartPhrase();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleCreate = useCallback(() => {
    if (!newTitle || !newContent) {
      toast.error('Preencha título e conteúdo.');
      return;
    }
    createPhrase.mutate(
      { shortcut: newTitle, expansion: newContent },
      {
        onSuccess: () => {
          toast.success('SmartPhrase criada!');
          setShowCreate(false);
          setNewTitle('');
          setNewContent('');
        },
      },
    );
  }, [newTitle, newContent, createPhrase]);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            SmartPhrases
          </span>
          <Button size="sm" variant="ghost" className="text-gray-400 h-7" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {showCreate && (
          <div className="p-2 bg-gray-900 rounded border border-gray-600 space-y-2">
            <Input
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
              placeholder="Título (ex: .hda)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              className="bg-gray-800 border-gray-600 text-white text-xs min-h-[60px]"
              placeholder="Conteúdo expandido..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7" onClick={handleCreate}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" className="text-gray-400 text-xs h-7" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
        {phrases.length === 0 && !showCreate && (
          <p className="text-xs text-gray-500">Nenhuma SmartPhrase cadastrada.</p>
        )}
        {phrases.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-2 rounded bg-gray-900 border border-gray-700 hover:border-emerald-700 cursor-pointer transition-colors group"
            onClick={() => onInsert(p.content)}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-400 truncate">{p.title}</p>
              <p className="text-xs text-gray-500 truncate">{p.content.slice(0, 60)}...</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                deletePhrase.mutate(p.id, { onSuccess: () => toast.success('Removida.') });
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── SmartLinks resolver ───────────────────────────────────────────────────

function resolveSmartLinks(text: string): string {
  return text
    .replace(/@labrecente/gi, '[Lab Recente: ver resultados mais recentes]')
    .replace(/@sinaisvitais/gi, '[Sinais Vitais: ver última aferição]')
    .replace(/@alergias/gi, '[Alergias: ver lista de alergias do paciente]')
    .replace(/@medicamentos/gi, '[Medicamentos: ver prescrição atual]');
}

// ─── Note Editor Dialog ───────────────────────────────────────────────────

function NoteEditorDialog({
  open,
  onClose,
  existingNote,
  copyFromNote,
}: {
  open: boolean;
  onClose: () => void;
  existingNote?: ClinicalNote | null;
  copyFromNote?: ClinicalNote | null;
}) {
  const createNote = useCreateClinicalNote();
  const updateNote = useUpdateClinicalNote();
  const signNote = useSignClinicalNote();

  const isEditing = !!existingNote;
  const isSigned = existingNote?.status === 'SIGNED' || existingNote?.status === 'COSIGNED';

  const [form, setForm] = useState<CreateClinicalNoteDto>({
    encounterId: existingNote?.encounterId ?? copyFromNote?.encounterId ?? '',
    type: existingNote?.type ?? copyFromNote?.type ?? 'SOAP',
    subjective: existingNote?.subjective ?? copyFromNote?.subjective ?? '',
    objective: existingNote?.objective ?? copyFromNote?.objective ?? '',
    assessment: existingNote?.assessment ?? copyFromNote?.assessment ?? '',
    plan: existingNote?.plan ?? copyFromNote?.plan ?? '',
    freeText: existingNote?.freeText ?? copyFromNote?.freeText ?? '',
    diagnosisCodes: existingNote?.diagnosisCodes ?? copyFromNote?.diagnosisCodes ?? [],
    procedureCodes: existingNote?.procedureCodes ?? copyFromNote?.procedureCodes ?? [],
  });

  const [activeSection, setActiveSection] = useState<'S' | 'O' | 'A' | 'P' | 'free'>('S');

  const handleFieldChange = useCallback((field: keyof CreateClinicalNoteDto, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleInsertPhrase = useCallback((text: string) => {
    const fieldMap: Record<string, keyof CreateClinicalNoteDto> = {
      S: 'subjective',
      O: 'objective',
      A: 'assessment',
      P: 'plan',
      free: 'freeText',
    };
    const field = fieldMap[activeSection] ?? 'freeText';
    setForm((prev) => ({
      ...prev,
      [field]: ((prev[field] as string | undefined) ?? '') + text,
    }));
    toast.success('SmartPhrase inserida!');
  }, [activeSection]);

  const handleSaveDraft = useCallback(() => {
    if (!form.encounterId) {
      toast.error('Informe o ID do atendimento.');
      return;
    }
    if (isEditing && existingNote) {
      updateNote.mutate(
        { id: existingNote.id, ...form },
        {
          onSuccess: () => { toast.success('Nota atualizada!'); onClose(); },
          onError: () => toast.error('Erro ao atualizar nota.'),
        },
      );
    } else {
      createNote.mutate(form, {
        onSuccess: () => { toast.success('Nota criada como rascunho!'); onClose(); },
        onError: () => toast.error('Erro ao criar nota.'),
      });
    }
  }, [form, isEditing, existingNote, createNote, updateNote, onClose]);

  const handleSign = useCallback(() => {
    if (!existingNote) return;
    signNote.mutate(existingNote.id, {
      onSuccess: () => { toast.success('Nota assinada com sucesso!'); onClose(); },
      onError: () => toast.error('Erro ao assinar nota.'),
    });
  }, [existingNote, signNote, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isEditing ? <PenLine className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
            {isEditing ? 'Editar Nota Clínica' : copyFromNote ? 'Copy-Forward de Nota' : 'Nova Nota Clínica'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isSigned ? 'Nota assinada — somente leitura.' : 'Preencha as seções SOAP ou texto livre.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Editor */}
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">ID do Atendimento</Label>
                <Input
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  value={form.encounterId}
                  onChange={(e) => handleFieldChange('encounterId', e.target.value)}
                  disabled={isEditing || isSigned}
                  placeholder="UUID do atendimento"
                />
              </div>
              <div>
                <Label className="text-gray-300">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, type: v as NoteType }))}
                  disabled={isSigned}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(NOTE_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SOAP Tabs */}
            <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
              <TabsList className="bg-gray-800">
                <TabsTrigger value="S" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">S</TabsTrigger>
                <TabsTrigger value="O" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">O</TabsTrigger>
                <TabsTrigger value="A" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">A</TabsTrigger>
                <TabsTrigger value="P" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">P</TabsTrigger>
                <TabsTrigger value="free" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Livre</TabsTrigger>
              </TabsList>

              <TabsContent value="S">
                <div>
                  <Label className="text-gray-400 text-xs">Subjetivo (Queixa do paciente)</Label>
                  <Textarea
                    className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                    value={form.subjective ?? ''}
                    onChange={(e) => handleFieldChange('subjective', e.target.value)}
                    disabled={isSigned}
                    placeholder="Use @labrecente, @sinaisvitais para SmartLinks..."
                  />
                </div>
              </TabsContent>
              <TabsContent value="O">
                <div>
                  <Label className="text-gray-400 text-xs">Objetivo (Exame físico e dados)</Label>
                  <Textarea
                    className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                    value={form.objective ?? ''}
                    onChange={(e) => handleFieldChange('objective', e.target.value)}
                    disabled={isSigned}
                    placeholder="Exame físico, sinais vitais, exames..."
                  />
                </div>
              </TabsContent>
              <TabsContent value="A">
                <div>
                  <Label className="text-gray-400 text-xs">Avaliação (Diagnóstico/Impressão)</Label>
                  <Textarea
                    className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                    value={form.assessment ?? ''}
                    onChange={(e) => handleFieldChange('assessment', e.target.value)}
                    disabled={isSigned}
                    placeholder="Hipóteses diagnósticas, CID..."
                  />
                </div>
              </TabsContent>
              <TabsContent value="P">
                <div>
                  <Label className="text-gray-400 text-xs">Plano (Conduta)</Label>
                  <Textarea
                    className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                    value={form.plan ?? ''}
                    onChange={(e) => handleFieldChange('plan', e.target.value)}
                    disabled={isSigned}
                    placeholder="Prescrições, orientações, retorno..."
                  />
                </div>
              </TabsContent>
              <TabsContent value="free">
                <div>
                  <Label className="text-gray-400 text-xs">Texto Livre</Label>
                  <Textarea
                    className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                    value={form.freeText ?? ''}
                    onChange={(e) => handleFieldChange('freeText', e.target.value)}
                    disabled={isSigned}
                    placeholder="Texto livre para tipos não-SOAP..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* SmartLinks hint */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Link2 className="w-3 h-3" />
              SmartLinks: @labrecente, @sinaisvitais, @alergias, @medicamentos
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <SmartPhrasesPanel onInsert={handleInsertPhrase} />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Cancelar
          </Button>
          {!isSigned && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSaveDraft}
              disabled={createNote.isPending || updateNote.isPending}
            >
              {(createNote.isPending || updateNote.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Pen className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Salvar' : 'Criar Rascunho'}
            </Button>
          )}
          {isEditing && existingNote?.status === 'DRAFT' && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSign}
              disabled={signNote.isPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Assinar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Addendum Dialog ──────────────────────────────────────────────────────

function AddendumDialog({
  noteId,
  open,
  onClose,
}: {
  noteId: string;
  open: boolean;
  onClose: () => void;
}) {
  const addAddendum = useAddAddendum();
  const [content, setContent] = useState('');

  const handleSubmit = useCallback(() => {
    if (!content.trim()) {
      toast.error('O adendo não pode ser vazio.');
      return;
    }
    addAddendum.mutate(
      { parentNoteId: noteId, content },
      {
        onSuccess: () => {
          toast.success('Adendo adicionado com sucesso!');
          setContent('');
          onClose();
        },
        onError: () => toast.error('Erro ao adicionar adendo.'),
      },
    );
  }, [noteId, content, addAddendum, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Adendo</DialogTitle>
          <DialogDescription className="text-gray-400">
            Adendos são vinculados à nota original e não alteram o conteúdo assinado.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Texto do adendo..."
        />
        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={addAddendum.isPending}
            onClick={handleSubmit}
          >
            {addAddendum.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Adicionar Adendo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Note View Dialog ─────────────────────────────────────────────────────

function NoteViewDialog({
  noteId,
  open,
  onClose,
}: {
  noteId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: note, isLoading } = useClinicalNote(noteId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            Visualizar Nota
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : note ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('border', STATUS_CONFIG[note.status]?.className)}>
                {STATUS_CONFIG[note.status]?.label ?? note.status}
              </Badge>
              <Badge className="bg-gray-800 text-gray-300 border border-gray-600">
                {NOTE_TYPES[note.type] ?? note.type}
              </Badge>
              {note.wasGeneratedByAI && (
                <Badge className="bg-purple-900/40 text-purple-300 border border-purple-700">IA</Badge>
              )}
              <span className="text-xs text-gray-500 ml-auto">{formatDate(note.createdAt)}</span>
            </div>
            {note.subjective && (
              <Section title="Subjetivo (S)" content={resolveSmartLinks(note.subjective)} />
            )}
            {note.objective && (
              <Section title="Objetivo (O)" content={resolveSmartLinks(note.objective)} />
            )}
            {note.assessment && (
              <Section title="Avaliação (A)" content={resolveSmartLinks(note.assessment)} />
            )}
            {note.plan && (
              <Section title="Plano (P)" content={resolveSmartLinks(note.plan)} />
            )}
            {note.freeText && (
              <Section title="Texto Livre" content={resolveSmartLinks(note.freeText)} />
            )}
            {note.signedAt && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Assinada em {formatDate(note.signedAt)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Nota não encontrada.</p>
        )}
        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-3 bg-gray-800 rounded border border-gray-700">
      <h4 className="text-xs font-semibold text-emerald-400 mb-1">{title}</h4>
      <p className="text-sm text-gray-200 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ClinicalNotesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Dialogs
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
  const [copyFromNote, setCopyFromNote] = useState<ClinicalNote | null>(null);
  const [viewNoteId, setViewNoteId] = useState<string | null>(null);
  const [addendumNoteId, setAddendumNoteId] = useState<string | null>(null);

  const filters: ClinicalNoteFilters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? (typeFilter as NoteType) : undefined,
    page,
    limit: 20,
  };

  const { data: notesData, isLoading, isError, refetch } = useClinicalNotes(filters);
  const notes = notesData?.data ?? [];
  const totalPages = notesData?.totalPages ?? 1;

  const handleNewNote = useCallback(() => {
    setEditingNote(null);
    setCopyFromNote(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback((note: ClinicalNote) => {
    setEditingNote(note);
    setCopyFromNote(null);
    setEditorOpen(true);
  }, []);

  const handleCopyForward = useCallback((note: ClinicalNote) => {
    setEditingNote(null);
    setCopyFromNote(note);
    setEditorOpen(true);
    toast.info('Conteúdo copiado da nota anterior.');
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-emerald-400" />
          Notas Clínicas
        </h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNewNote}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Nota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-white">Todos os status</SelectItem>
            <SelectItem value="DRAFT" className="text-white">Rascunho</SelectItem>
            <SelectItem value="SIGNED" className="text-white">Assinada</SelectItem>
            <SelectItem value="COSIGNED" className="text-white">Co-assinada</SelectItem>
            <SelectItem value="AMENDED" className="text-white">Adendo</SelectItem>
            <SelectItem value="VOIDED" className="text-white">Anulada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-gray-200">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-white">Todos os tipos</SelectItem>
            {Object.entries(NOTE_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <p className="text-gray-400">Erro ao carregar notas.</p>
              <Button variant="outline" size="sm" className="mt-3 border-gray-600 text-gray-300" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Nenhuma nota encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Autor</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                  <TableHead className="text-gray-400">Resumo</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => {
                  const stConfig = STATUS_CONFIG[note.status] ?? STATUS_CONFIG.DRAFT;
                  const isSigned = note.status === 'SIGNED' || note.status === 'COSIGNED';
                  const preview = note.subjective ?? note.freeText ?? '—';
                  return (
                    <TableRow key={note.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell>
                        <Badge className="bg-gray-800 text-gray-300 border border-gray-600 text-xs">
                          {NOTE_TYPES[note.type] ?? note.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border text-xs', stConfig.className)}>
                          {stConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {note.author?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDate(note.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm max-w-[200px] truncate">
                        {preview.slice(0, 60)}{preview.length > 60 ? '...' : ''}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                            title="Visualizar"
                            onClick={() => setViewNoteId(note.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!isSigned && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-white h-8 w-8 p-0"
                              title="Editar"
                              onClick={() => handleEdit(note)}
                            >
                              <Pen className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                            title="Copy-forward"
                            onClick={() => handleCopyForward(note)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {isSigned && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-400 hover:text-orange-300 h-8 w-8 p-0"
                              title="Adendo"
                              onClick={() => setAddendumNoteId(note.id)}
                            >
                              <PenLine className="w-4 h-4" />
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {editorOpen && (
        <NoteEditorDialog
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditingNote(null); setCopyFromNote(null); }}
          existingNote={editingNote}
          copyFromNote={copyFromNote}
        />
      )}
      {viewNoteId && (
        <NoteViewDialog
          noteId={viewNoteId}
          open={!!viewNoteId}
          onClose={() => setViewNoteId(null)}
        />
      )}
      {addendumNoteId && (
        <AddendumDialog
          noteId={addendumNoteId}
          open={!!addendumNoteId}
          onClose={() => setAddendumNoteId(null)}
        />
      )}
    </div>
  );
}
