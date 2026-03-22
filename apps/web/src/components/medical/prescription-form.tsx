'use client';

import * as React from 'react';
import { Mic, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PrescriptionItemData {
  medicationName: string;
  concentration: string;
  form: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  customSchedule: string;
  durationValue: string;
  durationUnit: string;
  isPRN: boolean;
  specialInstructions: string;
  dilution: string;
  isControlled: boolean;
  isAntibiotic: boolean;
  isHighAlert: boolean;
}

interface PrescriptionFormProps {
  onAdd: (item: PrescriptionItemData) => void;
  onCancel: () => void;
  className?: string;
}

const emptyItem: PrescriptionItemData = {
  medicationName: '',
  concentration: '',
  form: '',
  dose: '',
  unit: 'mg',
  route: 'VO',
  frequency: '',
  customSchedule: '',
  durationValue: '',
  durationUnit: 'dias',
  isPRN: false,
  specialInstructions: '',
  dilution: '',
  isControlled: false,
  isAntibiotic: false,
  isHighAlert: false,
};

const routeOptions = [
  { value: 'VO', label: 'Via Oral' },
  { value: 'IV', label: 'Intravenoso' },
  { value: 'IM', label: 'Intramuscular' },
  { value: 'SC', label: 'Subcutâneo' },
  { value: 'SL', label: 'Sublingual' },
  { value: 'TOP', label: 'Tópico' },
  { value: 'IN', label: 'Inalatório' },
  { value: 'VR', label: 'Via Retal' },
];

const frequencyOptions = [
  { value: '1x/dia', label: '1x ao dia' },
  { value: '2x/dia', label: '2x ao dia (12/12h)' },
  { value: '3x/dia', label: '3x ao dia (8/8h)' },
  { value: '4x/dia', label: '4x ao dia (6/6h)' },
  { value: '6x/dia', label: '6x ao dia (4/4h)' },
  { value: 'SOS', label: 'Se necessário (SOS)' },
  { value: 'custom', label: 'Horários customizados' },
];

const durationUnitOptions = [
  { value: 'dias', label: 'Dias' },
  { value: 'semanas', label: 'Semanas' },
  { value: 'meses', label: 'Meses' },
  { value: 'continuo', label: 'Uso contínuo' },
];

const formOptions = [
  { value: 'comprimido', label: 'Comprimido' },
  { value: 'capsula', label: 'Cápsula' },
  { value: 'solucao', label: 'Solução' },
  { value: 'suspensao', label: 'Suspensão' },
  { value: 'pomada', label: 'Pomada' },
  { value: 'creme', label: 'Creme' },
  { value: 'injetavel', label: 'Injetável' },
  { value: 'aerosol', label: 'Aerossol' },
  { value: 'gotas', label: 'Gotas' },
];

export function PrescriptionForm({
  onAdd,
  onCancel,
  className,
}: PrescriptionFormProps) {
  const [item, setItem] = React.useState<PrescriptionItemData>(emptyItem);
  const [errors, setErrors] = React.useState<string[]>([]);

  function update<K extends keyof PrescriptionItemData>(
    key: K,
    value: PrescriptionItemData[K],
  ) {
    setItem((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!item.medicationName.trim())
      errs.push('Nome do medicamento é obrigatório');
    if (!item.dose.trim()) errs.push('Dose é obrigatória');
    if (!item.frequency) errs.push('Frequência é obrigatória');
    if (
      item.isAntibiotic &&
      !item.durationValue &&
      item.durationUnit !== 'continuo'
    )
      errs.push('Antibióticos devem ter duração definida');
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    onAdd(item);
  }

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Adicionar Medicamento</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
          >
            <Mic className="h-3.5 w-3.5" />
            Adicionar por Voz
          </Button>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              {errors.map((err) => (
                <div
                  key={err}
                  className="flex items-center gap-2 text-xs text-red-400"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Medicamento section */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase text-muted-foreground">
              Medicamento
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label htmlFor="med-name" className="text-xs">
                  Nome do Medicamento
                </Label>
                <Input
                  id="med-name"
                  value={item.medicationName}
                  onChange={(e) => update('medicationName', e.target.value)}
                  placeholder="Ex: Dipirona, Amoxicilina..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="med-conc" className="text-xs">
                  Concentração
                </Label>
                <Input
                  id="med-conc"
                  value={item.concentration}
                  onChange={(e) => update('concentration', e.target.value)}
                  placeholder="Ex: 500mg"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="med-form" className="text-xs">
                  Forma Farmacêutica
                </Label>
                <Select
                  value={item.form}
                  onValueChange={(v) => update('form', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* Posologia section */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase text-muted-foreground">
              Posologia
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="med-dose" className="text-xs">
                  Dose
                </Label>
                <Input
                  id="med-dose"
                  value={item.dose}
                  onChange={(e) => update('dose', e.target.value)}
                  placeholder="Ex: 1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="med-unit" className="text-xs">
                  Unidade
                </Label>
                <Select
                  value={item.unit}
                  onValueChange={(v) => update('unit', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['mg', 'g', 'mL', 'gotas', 'UI', 'mcg', 'comp'].map(
                      (u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="med-route" className="text-xs">
                  Via
                </Label>
                <Select
                  value={item.route}
                  onValueChange={(v) => update('route', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {routeOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="med-freq" className="text-xs">
                  Frequência
                </Label>
                <Select
                  value={item.frequency}
                  onValueChange={(v) => update('frequency', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {item.frequency === 'custom' && (
              <div>
                <Label htmlFor="med-schedule" className="text-xs">
                  Horários Customizados
                </Label>
                <Input
                  id="med-schedule"
                  value={item.customSchedule}
                  onChange={(e) => update('customSchedule', e.target.value)}
                  placeholder="Ex: 08:00, 14:00, 22:00"
                  className="mt-1"
                />
              </div>
            )}
          </fieldset>

          {/* Duração section */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase text-muted-foreground">
              Duração
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="med-dur-val" className="text-xs">
                  Valor
                </Label>
                <Input
                  id="med-dur-val"
                  type="number"
                  min={1}
                  value={item.durationValue}
                  onChange={(e) => update('durationValue', e.target.value)}
                  placeholder="Ex: 7"
                  className="mt-1"
                  disabled={item.durationUnit === 'continuo'}
                />
              </div>
              <div>
                <Label htmlFor="med-dur-unit" className="text-xs">
                  Unidade
                </Label>
                <Select
                  value={item.durationUnit}
                  onValueChange={(v) => update('durationUnit', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationUnitOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={item.isPRN}
                    onCheckedChange={(c) => update('isPRN', Boolean(c))}
                  />
                  <span className="text-xs text-foreground">
                    Se necessário (SOS)
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

          {/* Observações section */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase text-muted-foreground">
              Observações
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="med-instr" className="text-xs">
                  Instruções Especiais
                </Label>
                <Textarea
                  id="med-instr"
                  value={item.specialInstructions}
                  onChange={(e) =>
                    update('specialInstructions', e.target.value)
                  }
                  placeholder="Em jejum, com alimentos..."
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="med-dil" className="text-xs">
                  Diluição
                </Label>
                <Textarea
                  id="med-dil"
                  value={item.dilution}
                  onChange={(e) => update('dilution', e.target.value)}
                  placeholder="Ex: SF 0,9% 100mL, infundir em 30min"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </fieldset>

          {/* Controle section */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase text-muted-foreground">
              Controle
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={item.isControlled}
                  onCheckedChange={(c) => update('isControlled', Boolean(c))}
                />
                <span className="text-xs text-amber-400">
                  Medicamento Controlado
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={item.isAntibiotic}
                  onCheckedChange={(c) => update('isAntibiotic', Boolean(c))}
                />
                <span className="text-xs text-blue-400">Antibiótico</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={item.isHighAlert}
                  onCheckedChange={(c) => update('isHighAlert', Boolean(c))}
                />
                <span className="text-xs text-red-400">
                  Alto Alerta
                </span>
              </label>
            </div>
          </fieldset>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="gap-1.5 bg-teal-600 text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
