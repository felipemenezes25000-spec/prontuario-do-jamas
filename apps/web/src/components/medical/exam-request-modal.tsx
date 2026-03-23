import { useState, useMemo, useCallback } from 'react';
import {
  TestTube,
  Search,
  Plus,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useExamCatalog, useBulkRequestExams } from '@/services/exams.service';
import { toast } from 'sonner';
import type { ExamType } from '@/types';

// ── Types ───────────────────────────────────────────────────

interface CatalogItem {
  id: string;
  name: string;
  code: string;
  examType: ExamType;
  category: string;
  description?: string;
}

interface SelectedExamItem {
  examName: string;
  examCode: string;
  examType: ExamType;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  clinicalIndication: string;
}

// ── Component ───────────────────────────────────────────────

interface ExamRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  patientId: string;
}

const examTypeLabels: Record<string, string> = {
  LABORATORY: 'Laboratorial',
  IMAGING: 'Imagem',
  FUNCTIONAL: 'Funcional',
  PATHOLOGY: 'Patologia',
  GENETIC: 'Genetico',
  MICROBIOLOGICAL: 'Microbiologico',
  OTHER: 'Outro',
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  ROUTINE: { label: 'Rotina', color: 'bg-green-500/20 text-green-400' },
  URGENT: { label: 'Urgente', color: 'bg-amber-500/20 text-amber-400' },
  EMERGENCY: { label: 'Emergencia', color: 'bg-red-500/20 text-red-400' },
};

export function ExamRequestModal({
  open,
  onOpenChange,
  encounterId,
  patientId,
}: ExamRequestModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<SelectedExamItem[]>([]);
  const [currentPriority, setCurrentPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [currentIndication, setCurrentIndication] = useState('');

  const { data: catalogData = [], isLoading: catalogLoading } = useExamCatalog(
    searchTerm.length >= 2 ? searchTerm : undefined,
    typeFilter !== 'all' ? typeFilter : undefined,
  );

  const bulkRequest = useBulkRequestExams();

  const filteredCatalog = useMemo(() => {
    const catalog = catalogData as CatalogItem[];
    // Hide already selected items
    const selectedCodes = new Set(selectedItems.map((s) => s.examCode));
    return catalog.filter((c) => !selectedCodes.has(c.code));
  }, [catalogData, selectedItems]);

  const handleAddExam = useCallback(
    (item: CatalogItem) => {
      setSelectedItems((prev) => [
        ...prev,
        {
          examName: item.name,
          examCode: item.code,
          examType: item.examType,
          priority: currentPriority,
          clinicalIndication: currentIndication,
        },
      ]);
    },
    [currentPriority, currentIndication],
  );

  const handleRemoveExam = useCallback((index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedItems.length === 0) return;

    try {
      await bulkRequest.mutateAsync({
        encounterId,
        patientId,
        items: selectedItems.map((item) => ({
          examName: item.examName,
          examCode: item.examCode,
          examType: item.examType,
          priority: item.priority,
          clinicalIndication: item.clinicalIndication,
        })),
      });
      toast.success(`${selectedItems.length} exame(s) solicitado(s) com sucesso`);
      setSelectedItems([]);
      setSearchTerm('');
      setCurrentIndication('');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao solicitar exames');
    }
  }, [selectedItems, encounterId, patientId, bulkRequest, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-400" />
            Solicitar Exames
          </DialogTitle>
          <DialogDescription>
            Busque no catalogo e adicione os exames desejados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Search + filter bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou codigo TUSS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 bg-card border-border text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="LABORATORY">Lab</SelectItem>
                <SelectItem value="IMAGING">Imagem</SelectItem>
                <SelectItem value="FUNCTIONAL">Funcional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Global priority + indication */}
          <div className="flex gap-2">
            <Select
              value={currentPriority}
              onValueChange={(v) => setCurrentPriority(v as 'ROUTINE' | 'URGENT' | 'EMERGENCY')}
            >
              <SelectTrigger className="w-36 bg-card border-border text-xs">
                <SelectValue placeholder="Urgencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTINE">Rotina</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="EMERGENCY">Emergencia</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Indicacao clinica..."
              value={currentIndication}
              onChange={(e) => setCurrentIndication(e.target.value)}
              className="flex-1 bg-card border-border text-xs"
            />
          </div>

          {/* Catalog results */}
          {searchTerm.length >= 2 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Buscando...</span>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum exame encontrado
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredCatalog.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddExam(item)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/30 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {item.code}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px]">
                            {examTypeLabels[item.examType] ?? item.examType}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">{item.category}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected items */}
          {selectedItems.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Exames selecionados ({selectedItems.length})
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {selectedItems.map((item, idx) => (
                  <Card key={`${item.examCode}-${idx}`} className="border-border bg-card">
                    <CardContent className="flex items-center gap-2 py-2 px-3">
                      <TestTube className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.examName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {item.examCode}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn('text-[9px]', priorityLabels[item.priority]?.color)}
                          >
                            {priorityLabels[item.priority]?.label}
                          </Badge>
                          {item.clinicalIndication && (
                            <span className="text-[9px] text-muted-foreground truncate">
                              {item.clinicalIndication}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-300"
                        onClick={() => handleRemoveExam(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            className="bg-blue-600 hover:bg-blue-500"
            disabled={selectedItems.length === 0 || bulkRequest.isPending}
            onClick={() => void handleSubmit()}
          >
            {bulkRequest.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Solicitar {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
