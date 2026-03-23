import { useState } from 'react';
import {
  TestTube,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface ExamItem {
  examName: string;
  examType: string;
  tussCode?: string;
  urgency: string;
  clinicalIndication?: string;
  confidence: number;
}

interface ExamVoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ExamItem[];
  onConfirm: (items: ExamItem[]) => void;
  onDiscard: () => void;
}

// ── Component ──────────────────────────────────────────────

export function ExamVoicePreview({
  open,
  onOpenChange,
  items: initialItems,
  onConfirm,
  onDiscard,
}: ExamVoicePreviewProps) {
  const [items, setItems] = useState<ExamItem[]>(initialItems);
  const [editing, setEditing] = useState(false);

  const handleRemove = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdate = (idx: number, field: keyof ExamItem, value: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );
  };

  const urgencyColor = (u: string) => {
    const upper = u.toUpperCase();
    if (upper === 'EMERGENCIA') return 'bg-red-500/20 text-red-400';
    if (upper === 'URGENTE') return 'bg-amber-500/20 text-amber-400';
    return 'bg-green-500/20 text-green-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-400" />
            Exames Solicitados por Voz
          </DialogTitle>
          <DialogDescription>
            Exames extraidos da transcricao. Revise antes de solicitar.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] space-y-3 overflow-y-auto">
          {items.map((item, idx) => (
            <Card key={idx} className="border-border bg-card">
              <CardContent className="flex items-start gap-3 py-3">
                <TestTube className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      className="bg-transparent text-sm font-medium outline-none border-b border-border focus:border-blue-500 w-full"
                      value={item.examName}
                      onChange={(e) => handleUpdate(idx, 'examName', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{item.examName}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {item.examType}
                    </Badge>
                    <Badge variant="secondary" className={cn('text-[10px]', urgencyColor(item.urgency))}>
                      {item.urgency}
                    </Badge>
                    {item.tussCode && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        TUSS {item.tussCode}
                      </Badge>
                    )}
                  </div>
                  {item.clinicalIndication && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.clinicalIndication}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px]',
                      item.confidence >= 0.8
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400',
                    )}
                  >
                    {Math.round(item.confidence * 100)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={() => handleRemove(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum exame identificado.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            {editing ? 'Pronto' : 'Editar'}
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-500"
            disabled={items.length === 0}
            onClick={() => onConfirm(items)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Solicitar Exames
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onDiscard();
              onOpenChange(false);
            }}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
