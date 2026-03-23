import { useState } from 'react';
import {
  FileText,
  Pencil,
  Trash2,
  FileDown,
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

interface CertificateData {
  days: number;
  cidCode?: string;
  cidDescription?: string;
  justification: string;
  certificateType: string;
  restrictions?: string;
  confidence: number;
}

interface CertificateVoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CertificateData | null;
  onConfirm: (data: CertificateData) => void;
  onDiscard: () => void;
}

// ── Component ──────────────────────────────────────────────

export function CertificateVoicePreview({
  open,
  onOpenChange,
  data,
  onConfirm,
  onDiscard,
}: CertificateVoicePreviewProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<CertificateData | null>(data);

  if (!editData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Atestado por Voz
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nao foi possivel gerar o atestado.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            Atestado Medico por Voz
          </DialogTitle>
          <DialogDescription>
            Revise o atestado gerado antes de emitir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-muted-foreground">Tipo</span>
              {editing ? (
                <input
                  className="block w-full bg-transparent text-sm font-medium outline-none border-b border-border focus:border-purple-500"
                  value={editData.certificateType}
                  onChange={(e) =>
                    setEditData({ ...editData, certificateType: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm font-medium">{editData.certificateType}</p>
              )}
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Dias</span>
              {editing ? (
                <input
                  type="number"
                  className="block w-full bg-transparent text-sm font-medium outline-none border-b border-border focus:border-purple-500"
                  value={editData.days}
                  onChange={(e) =>
                    setEditData({ ...editData, days: parseInt(e.target.value, 10) || 0 })
                  }
                />
              ) : (
                <p className="text-sm font-medium">{editData.days} dia(s)</p>
              )}
            </div>
            {editData.cidCode && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">CID-10</span>
                <p className="text-sm font-medium">
                  {editData.cidCode}
                  {editData.cidDescription ? ` — ${editData.cidDescription}` : ''}
                </p>
              </div>
            )}
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Justificativa</span>
            {editing ? (
              <textarea
                className="mt-1 block w-full rounded-md border border-border bg-muted/30 p-3 text-sm outline-none focus:border-purple-500 resize-y min-h-[80px]"
                value={editData.justification}
                onChange={(e) =>
                  setEditData({ ...editData, justification: e.target.value })
                }
              />
            ) : (
              <p className="mt-1 text-sm leading-relaxed rounded-md border border-border bg-muted/30 p-3">
                {editData.justification}
              </p>
            )}
          </div>

          {editData.restrictions && (
            <div>
              <span className="text-xs text-muted-foreground">Restricoes</span>
              <p className="mt-1 text-sm text-amber-400">{editData.restrictions}</p>
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
            className="bg-purple-600 hover:bg-purple-500"
            onClick={() => onConfirm(editData)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Gerar PDF
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
