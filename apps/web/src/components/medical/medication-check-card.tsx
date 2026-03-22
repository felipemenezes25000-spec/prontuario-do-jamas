'use client';

import * as React from 'react';
import { Check, X, Mic, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MedicationCheckCardProps {
  check: {
    patientName: string;
    bedNumber: string;
    medicationName: string;
    dose: string;
    route: string;
    scheduledAt: string;
    status: 'PENDING' | 'ADMINISTERED' | 'NOT_ADMINISTERED';
    checkedAt?: string;
    refuseReason?: string;
  };
  onCheck: () => void;
  onRefuse: (reason: string) => void;
  className?: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

export function MedicationCheckCard({
  check,
  onCheck,
  onRefuse,
  className,
}: MedicationCheckCardProps) {
  const [showRefuseInput, setShowRefuseInput] = React.useState(false);
  const [refuseReason, setRefuseReason] = React.useState('');

  const borderColor =
    check.status === 'ADMINISTERED'
      ? 'border-l-teal-500'
      : check.status === 'NOT_ADMINISTERED'
        ? 'border-l-red-500'
        : 'border-l-amber-500';

  const overdue = check.status === 'PENDING' && isOverdue(check.scheduledAt);

  function handleRefuse() {
    if (refuseReason.trim()) {
      onRefuse(refuseReason.trim());
      setShowRefuseInput(false);
    }
  }

  return (
    <Card className={cn('border-l-4 p-3', borderColor, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                'font-mono text-lg font-bold',
                overdue ? 'text-red-400' : 'text-foreground',
              )}
            >
              {formatTime(check.scheduledAt)}
            </span>
            {overdue && (
              <Badge className="bg-red-500/15 px-1.5 py-0 text-[10px] font-semibold text-red-400 border-red-500/30">
                Atrasado
              </Badge>
            )}
            {check.status === 'ADMINISTERED' && (
              <Badge className="bg-teal-500/15 px-1.5 py-0 text-[10px] font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30">
                <Check className="mr-0.5 h-2.5 w-2.5" />
                Administrado
              </Badge>
            )}
            {check.status === 'NOT_ADMINISTERED' && (
              <Badge className="bg-red-500/15 px-1.5 py-0 text-[10px] font-semibold text-red-400 border-red-500/30">
                <X className="mr-0.5 h-2.5 w-2.5" />
                Não Administrado
              </Badge>
            )}
          </div>

          {/* Patient info */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              {check.patientName}
            </span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              Leito {check.bedNumber}
            </Badge>
          </div>

          {/* Medication */}
          <p className="text-xs text-muted-foreground">
            {check.medicationName} &middot; {check.dose} &middot; {check.route}
          </p>

          {/* Checked time */}
          {check.status === 'ADMINISTERED' && check.checkedAt && (
            <p className="text-[10px] text-teal-600 dark:text-teal-400/70">
              Checado às {formatTime(check.checkedAt)}
            </p>
          )}

          {/* Refuse reason */}
          {check.status === 'NOT_ADMINISTERED' && check.refuseReason && (
            <p className="text-[10px] text-red-400/70">
              Motivo: {check.refuseReason}
            </p>
          )}

          {/* Refuse input */}
          {showRefuseInput && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                placeholder="Motivo da não administração..."
                className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onKeyDown={(e) => e.key === 'Enter' && handleRefuse()}
              />
              <Button size="sm" variant="destructive" onClick={handleRefuse} className="h-8 text-xs">
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRefuseInput(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Actions for PENDING */}
        {check.status === 'PENDING' && !showRefuseInput && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={onCheck}
              className="h-8 gap-1 bg-teal-600 text-xs text-white hover:bg-teal-700"
            >
              <Check className="h-3.5 w-3.5" />
              Checar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRefuseInput(true)}
              className="h-8 text-xs text-muted-foreground hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
              aria-label="Checar por voz"
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
