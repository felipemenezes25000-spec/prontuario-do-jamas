import { useState } from 'react';
import {
  Pill,
  ShieldAlert,
  CheckCircle2,
  Pencil,
  Trash2,
  Loader2,
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
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────

interface PrescriptionItem {
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  confidence: number;
}

interface SafetyWarning {
  type: string;
  severity: string;
  message: string;
  items: string[];
}

interface PrescriptionVoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PrescriptionItem[];
  patientId?: string;
  encounterId?: string;
  onConfirm: (items: PrescriptionItem[]) => void;
  onDiscard: () => void;
}

// ── Component ──────────────────────────────────────────────

export function PrescriptionVoicePreview({
  open,
  onOpenChange,
  items: initialItems,
  patientId,
  encounterId,
  onConfirm,
  onDiscard,
}: PrescriptionVoicePreviewProps) {
  const [items, setItems] = useState<PrescriptionItem[]>(initialItems);
  const [editing, setEditing] = useState(false);
  const [safetyWarnings, setSafetyWarnings] = useState<SafetyWarning[]>([]);
  const [isSafetyChecked, setIsSafetyChecked] = useState(false);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);

  const handleSafetyCheck = async () => {
    if (items.length === 0 || !patientId) return;
    setIsCheckingSafety(true);
    try {
      const { data } = await api.post<{ safe: boolean; warnings: SafetyWarning[] }>(
        '/ai/prescription/check-safety',
        {
          items: items.map((i) => ({
            medicationName: i.medicationName,
            dose: i.dose,
          })),
          patientId,
        },
      );
      setSafetyWarnings(data.warnings);
      setIsSafetyChecked(true);
    } catch {
      setSafetyWarnings([
        {
          type: 'system_error',
          severity: 'high',
          message: 'Nao foi possivel verificar seguranca. Revise manualmente.',
          items: [],
        },
      ]);
      setIsSafetyChecked(true);
    } finally {
      setIsCheckingSafety(false);
    }
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, [field]: value } : it,
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Prescricao por Voz
          </DialogTitle>
          <DialogDescription>
            Medicamentos extraidos da sua fala. Revise antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[450px] space-y-3 overflow-y-auto">
          {items.map((item, idx) => (
            <Card
              key={idx}
              className={cn(
                'border-l-4 border-border bg-card',
                item.confidence < 0.5
                  ? 'border-l-red-500'
                  : item.confidence < 0.8
                    ? 'border-l-amber-500'
                    : 'border-l-teal-500',
              )}
            >
              <CardContent className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Pill className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    {editing ? (
                      <input
                        className="bg-transparent text-sm font-semibold text-foreground outline-none border-b border-border focus:border-teal-500 transition-colors w-full"
                        value={item.medicationName}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'medicationName', e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {item.medicationName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        item.confidence >= 0.8
                          ? 'bg-green-500/20 text-green-400'
                          : item.confidence >= 0.5
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-6 text-xs text-muted-foreground">
                  {editing ? (
                    <>
                      <div>
                        <label className="text-[10px]">Dose</label>
                        <input
                          className="block w-full bg-transparent text-xs outline-none border-b border-border/50 focus:border-teal-500 py-0.5"
                          value={item.dose ?? ''}
                          onChange={(e) => handleUpdateItem(idx, 'dose', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]">Via</label>
                        <input
                          className="block w-full bg-transparent text-xs outline-none border-b border-border/50 focus:border-teal-500 py-0.5"
                          value={item.route ?? ''}
                          onChange={(e) => handleUpdateItem(idx, 'route', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]">Frequencia</label>
                        <input
                          className="block w-full bg-transparent text-xs outline-none border-b border-border/50 focus:border-teal-500 py-0.5"
                          value={item.frequency ?? ''}
                          onChange={(e) => handleUpdateItem(idx, 'frequency', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]">Duracao</label>
                        <input
                          className="block w-full bg-transparent text-xs outline-none border-b border-border/50 focus:border-teal-500 py-0.5"
                          value={item.duration ?? ''}
                          onChange={(e) => handleUpdateItem(idx, 'duration', e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="col-span-2">
                      {[item.dose, item.route, item.frequency, item.duration]
                        .filter(Boolean)
                        .join(' — ')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Safety warnings */}
        {isSafetyChecked && safetyWarnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">
                Alertas de Seguranca
              </span>
            </div>
            {safetyWarnings.map((w, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-md border px-3 py-2 text-xs',
                  w.severity === 'critical' || w.severity === 'high'
                    ? 'border-red-500/30 bg-red-500/5 text-red-300'
                    : 'border-amber-500/20 bg-amber-500/5 text-amber-300',
                )}
              >
                {w.message}
              </div>
            ))}
          </div>
        )}

        {isSafetyChecked && safetyWarnings.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-xs text-green-400">
              Nenhum alerta de seguranca.
            </span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            {editing ? 'Pronto' : 'Editar'}
          </Button>
          {!isSafetyChecked ? (
            <Button
              onClick={() => void handleSafetyCheck()}
              disabled={isCheckingSafety || items.length === 0}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {isCheckingSafety ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-2 h-4 w-4" />
              )}
              Verificar Seguranca
            </Button>
          ) : (
            <Button
              onClick={() => onConfirm(items)}
              className="bg-teal-600 hover:bg-teal-500"
              disabled={items.length === 0}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          )}
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
