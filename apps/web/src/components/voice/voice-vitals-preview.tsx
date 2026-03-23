import { useState } from 'react';
import {
  Heart,
  Gauge,
  Wind,
  Thermometer,
  Droplets,
  Activity,
  AlertTriangle,
  Stethoscope,
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

interface VitalsData {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  gcs?: number;
  painScale?: number;
  painLocation?: string;
  weight?: number;
  height?: number;
  glucoseLevel?: number;
  confidence: number;
  summary: string;
}

interface VitalsVoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: VitalsData | null;
  onConfirm: (data: VitalsData) => void;
  onDiscard: () => void;
}

// ── Helpers ────────────────────────────────────────────────

interface VitalFieldConfig {
  key: keyof VitalsData;
  label: string;
  unit: string;
  icon: React.ElementType;
  iconColor: string;
  isAbnormal?: (val: number) => boolean;
}

const vitalFields: VitalFieldConfig[] = [
  {
    key: 'systolicBP',
    label: 'PA Sistolica',
    unit: 'mmHg',
    icon: Gauge,
    iconColor: 'text-blue-400',
    isAbnormal: (v) => v > 140 || v < 90,
  },
  {
    key: 'diastolicBP',
    label: 'PA Diastolica',
    unit: 'mmHg',
    icon: Gauge,
    iconColor: 'text-blue-400',
    isAbnormal: (v) => v > 90 || v < 60,
  },
  {
    key: 'heartRate',
    label: 'Frequencia Cardiaca',
    unit: 'bpm',
    icon: Heart,
    iconColor: 'text-red-400',
    isAbnormal: (v) => v > 100 || v < 60,
  },
  {
    key: 'respiratoryRate',
    label: 'Frequencia Respiratoria',
    unit: 'irpm',
    icon: Wind,
    iconColor: 'text-cyan-400',
    isAbnormal: (v) => v > 20 || v < 12,
  },
  {
    key: 'temperature',
    label: 'Temperatura',
    unit: '°C',
    icon: Thermometer,
    iconColor: 'text-orange-400',
    isAbnormal: (v) => v > 37.5 || v < 35,
  },
  {
    key: 'oxygenSaturation',
    label: 'SpO2',
    unit: '%',
    icon: Droplets,
    iconColor: 'text-teal-400',
    isAbnormal: (v) => v < 95,
  },
  {
    key: 'glucoseLevel',
    label: 'Glicemia',
    unit: 'mg/dL',
    icon: Activity,
    iconColor: 'text-purple-400',
    isAbnormal: (v) => v > 200 || v < 70,
  },
  {
    key: 'painScale',
    label: 'Dor (EVA)',
    unit: '/10',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    isAbnormal: (v) => v >= 7,
  },
  {
    key: 'gcs',
    label: 'Glasgow',
    unit: '/15',
    icon: Stethoscope,
    iconColor: 'text-indigo-400',
    isAbnormal: (v) => v < 13,
  },
  {
    key: 'weight',
    label: 'Peso',
    unit: 'kg',
    icon: Gauge,
    iconColor: 'text-gray-400',
  },
  {
    key: 'height',
    label: 'Altura',
    unit: 'cm',
    icon: Gauge,
    iconColor: 'text-gray-400',
  },
];

// ── Component ──────────────────────────────────────────────

export function VitalsVoicePreview({
  open,
  onOpenChange,
  data,
  onConfirm,
  onDiscard,
}: VitalsVoicePreviewProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<VitalsData | null>(data);

  if (!editData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-400" />
              Sinais Vitais por Voz
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum sinal vital identificado.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const handleUpdate = (key: keyof VitalsData, value: string) => {
    const numVal = parseFloat(value);
    setEditData((prev) =>
      prev ? { ...prev, [key]: isNaN(numVal) ? undefined : numVal } : prev,
    );
  };

  const presentFields = vitalFields.filter(
    (f) => editData[f.key] != null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-400" />
            Sinais Vitais por Voz
          </DialogTitle>
          <DialogDescription>
            Valores extraidos da transcricao. Confirme para registrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">{editData.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {presentFields.map((field) => {
              const val = editData[field.key] as number;
              const abnormal = field.isAbnormal?.(val) ?? false;
              const Icon = field.icon;

              return (
                <div
                  key={field.key}
                  className={cn(
                    'flex items-center gap-2 rounded-md border p-2',
                    abnormal
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-border',
                  )}
                >
                  <Icon className={cn('h-4 w-4', field.iconColor)} />
                  <div className="flex-1">
                    <span className="text-[10px] text-muted-foreground">
                      {field.label}
                    </span>
                    {editing ? (
                      <input
                        type="number"
                        step="0.1"
                        className={cn(
                          'block w-full bg-transparent text-sm font-medium outline-none border-b border-border focus:border-red-500',
                          abnormal && 'text-red-400',
                        )}
                        value={val}
                        onChange={(e) => handleUpdate(field.key, e.target.value)}
                      />
                    ) : (
                      <p
                        className={cn(
                          'text-sm font-medium',
                          abnormal && 'text-red-400',
                        )}
                      >
                        {val}
                        {field.unit}
                        {abnormal && ' !!!'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
            className="bg-red-600 hover:bg-red-500"
            onClick={() => onConfirm(editData)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Salvar Sinais Vitais
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
