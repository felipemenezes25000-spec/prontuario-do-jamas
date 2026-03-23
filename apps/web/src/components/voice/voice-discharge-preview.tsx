import { useState } from 'react';
import {
  LogOut,
  CheckCircle2,
  Pencil,
  Trash2,
  Pill,
  AlertTriangle,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface DischargeData {
  dischargeType: string;
  condition: string;
  followUpDays?: number;
  instructions: string;
  followUpSpecialty?: string;
  warningSignals?: string[];
  homeMedications?: string[];
  restrictions?: string[];
  confidence: number;
}

interface DischargeVoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DischargeData | null;
  onConfirm: (data: DischargeData) => void;
  onDiscard: () => void;
}

// ── Component ──────────────────────────────────────────────

export function DischargeVoicePreview({
  open,
  onOpenChange,
  data,
  onConfirm,
  onDiscard,
}: DischargeVoicePreviewProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<DischargeData | null>(data);

  if (!editData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-emerald-400" />
              Alta por Voz
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nao foi possivel processar a alta.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const conditionColor = (c: string) => {
    const upper = c.toUpperCase();
    if (upper === 'ESTAVEL') return 'bg-green-500/20 text-green-400';
    if (upper === 'INSTAVEL') return 'bg-amber-500/20 text-amber-400';
    return 'bg-red-500/20 text-red-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-emerald-400" />
            Alta Hospitalar por Voz
          </DialogTitle>
          <DialogDescription>
            Revise as informacoes de alta antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 pr-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Tipo de Alta</span>
                {editing ? (
                  <input
                    className="block w-full bg-transparent text-sm font-medium outline-none border-b border-border focus:border-emerald-500"
                    value={editData.dischargeType}
                    onChange={(e) =>
                      setEditData({ ...editData, dischargeType: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{editData.dischargeType}</p>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Condicao</span>
                <div>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', conditionColor(editData.condition))}
                  >
                    {editData.condition}
                  </Badge>
                </div>
              </div>
              {editData.followUpDays != null && (
                <div>
                  <span className="text-xs text-muted-foreground">Retorno</span>
                  <p className="text-sm font-medium">
                    {editData.followUpDays} dia(s)
                    {editData.followUpSpecialty
                      ? ` — ${editData.followUpSpecialty}`
                      : ''}
                  </p>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-muted-foreground">
                Orientacoes ao Paciente
              </span>
              {editing ? (
                <textarea
                  className="mt-1 block w-full rounded-md border border-border bg-muted/30 p-3 text-sm outline-none focus:border-emerald-500 resize-y min-h-[80px]"
                  value={editData.instructions}
                  onChange={(e) =>
                    setEditData({ ...editData, instructions: e.target.value })
                  }
                />
              ) : (
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line rounded-md border border-border bg-muted/30 p-3">
                  {editData.instructions}
                </p>
              )}
            </div>

            {editData.homeMedications && editData.homeMedications.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">
                  Medicacoes Domiciliares
                </span>
                <ul className="mt-1 space-y-1">
                  {editData.homeMedications.map((med, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Pill className="h-3 w-3 text-teal-400" />
                      {med}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {editData.warningSignals && editData.warningSignals.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Sinais de Alerta
                </span>
                <ul className="mt-1 space-y-1">
                  {editData.warningSignals.map((s, i) => (
                    <li key={i} className="text-sm text-amber-300">
                      * {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {editData.restrictions && editData.restrictions.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Restricoes</span>
                <ul className="mt-1 space-y-1">
                  {editData.restrictions.map((r, i) => (
                    <li key={i} className="text-sm text-red-300">
                      * {r}
                    </li>
                  ))}
                </ul>
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
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            {editing ? 'Pronto' : 'Editar'}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={() => onConfirm(editData)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar Alta
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
