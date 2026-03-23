import { useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle2,
  Pencil,
  Trash2,
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface ReferralData {
  specialty: string;
  reason: string;
  urgency: string;
  cidCode?: string;
  clinicalSummary?: string;
  questionsForSpecialist?: string;
  confidence: number;
}

interface ReferralVoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReferralData | null;
  onConfirm: (data: ReferralData) => void;
  onDiscard: () => void;
}

// ── Component ──────────────────────────────────────────────

export function ReferralVoicePreview({
  open,
  onOpenChange,
  data,
  onConfirm,
  onDiscard,
}: ReferralVoicePreviewProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<ReferralData | null>(data);

  if (!editData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-orange-400" />
              Encaminhamento por Voz
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nao foi possivel gerar o encaminhamento.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const urgencyColor = (u: string) => {
    const upper = u.toUpperCase();
    if (upper === 'URGENTE') return 'bg-red-500/20 text-red-400';
    if (upper === 'PRIORITARIO') return 'bg-amber-500/20 text-amber-400';
    return 'bg-green-500/20 text-green-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-orange-400" />
            Encaminhamento por Voz
          </DialogTitle>
          <DialogDescription>
            Revise o encaminhamento antes de emitir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-muted-foreground">Especialidade</span>
              {editing ? (
                <input
                  className="block w-full bg-transparent text-sm font-medium outline-none border-b border-border focus:border-orange-500"
                  value={editData.specialty}
                  onChange={(e) =>
                    setEditData({ ...editData, specialty: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm font-medium">{editData.specialty}</p>
              )}
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Urgencia</span>
              <div>
                <Badge
                  variant="secondary"
                  className={cn('text-xs', urgencyColor(editData.urgency))}
                >
                  {editData.urgency}
                </Badge>
              </div>
            </div>
            {editData.cidCode && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">CID-10</span>
                <p className="text-sm font-medium">{editData.cidCode}</p>
              </div>
            )}
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Motivo</span>
            {editing ? (
              <textarea
                className="mt-1 block w-full rounded-md border border-border bg-muted/30 p-3 text-sm outline-none focus:border-orange-500 resize-y min-h-[80px]"
                value={editData.reason}
                onChange={(e) =>
                  setEditData({ ...editData, reason: e.target.value })
                }
              />
            ) : (
              <p className="mt-1 text-sm leading-relaxed rounded-md border border-border bg-muted/30 p-3">
                {editData.reason}
              </p>
            )}
          </div>

          {editData.clinicalSummary && (
            <div>
              <span className="text-xs text-muted-foreground">Resumo Clinico</span>
              <p className="mt-1 text-sm leading-relaxed">
                {editData.clinicalSummary}
              </p>
            </div>
          )}

          {editData.questionsForSpecialist && (
            <div>
              <span className="text-xs text-muted-foreground">
                Perguntas para o Especialista
              </span>
              <p className="mt-1 text-sm italic text-muted-foreground">
                {editData.questionsForSpecialist}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px]',
                editData.confidence >= 0.8
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400',
              )}
            >
              Confianca: {Math.round(editData.confidence * 100)}%
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            {editing ? 'Pronto' : 'Editar'}
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-500"
            onClick={() => onConfirm(editData)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Gerar Encaminhamento
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
