import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, HeartPulse, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  usePatientConditions,
  useCreateCondition,
  useUpdateCondition,
} from '@/services/patients.service';
import { toast } from 'sonner';
import type { ChronicCondition, ConditionStatus } from '@/types';

// ── Antecedent definitions ──────────────────────────────────

interface AntecedentDef {
  name: string;
  code: string;
  group: string;
}

const ANTECEDENT_LIST: AntecedentDef[] = [
  // Cardiovasculares
  { name: 'HAS', code: 'I10', group: 'Cardiovascular' },
  { name: 'IAM', code: 'I21.9', group: 'Cardiovascular' },
  { name: 'AVC', code: 'I64', group: 'Cardiovascular' },
  { name: 'ICC', code: 'I50.9', group: 'Cardiovascular' },
  // Metabolicas
  { name: 'DM1', code: 'E10', group: 'Metabolica' },
  { name: 'DM2', code: 'E11.9', group: 'Metabolica' },
  { name: 'Dislipidemia', code: 'E78.5', group: 'Metabolica' },
  { name: 'Obesidade', code: 'E66.9', group: 'Metabolica' },
  // Respiratorias
  { name: 'DPOC', code: 'J44.9', group: 'Respiratoria' },
  { name: 'Asma', code: 'J45.9', group: 'Respiratoria' },
  // Habitos
  { name: 'Tabagismo', code: 'F17.2', group: 'Habitos' },
  { name: 'Etilismo', code: 'F10.2', group: 'Habitos' },
  // Renal
  { name: 'IRC', code: 'N18.9', group: 'Renal' },
  // Oncologia
  { name: 'Neoplasia', code: 'C80', group: 'Oncologia' },
  // Infecto
  { name: 'HIV/AIDS', code: 'B24', group: 'Infecto' },
];

const FAMILY_HISTORY_CONDITIONS = [
  { name: 'HAS familiar', code: 'Z82.3' },
  { name: 'DM familiar', code: 'Z83.3' },
  { name: 'CA familiar', code: 'Z80.9' },
];

// ── Component ───────────────────────────────────────────────

interface QuickAntecedentsProps {
  patientId: string;
}

export function QuickAntecedents({ patientId }: QuickAntecedentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [surgeryNotes, setSurgeryNotes] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');
  const [gestG, setGestG] = useState('');
  const [gestP, setGestP] = useState('');
  const [gestA, setGestA] = useState('');
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const { data: conditions = [], isLoading } = usePatientConditions(patientId);
  const createCondition = useCreateCondition();
  const updateCondition = useUpdateCondition();

  // Build a map of CID code -> condition for fast lookup
  const conditionMap = useMemo(() => {
    const map = new Map<string, ChronicCondition>();
    for (const c of conditions) {
      if (c.cidCode) {
        map.set(c.cidCode, c);
      }
    }
    return map;
  }, [conditions]);

  const activeConditions = useMemo(
    () => conditions.filter((c) => c.status === 'ACTIVE'),
    [conditions],
  );

  const isConditionActive = useCallback(
    (code: string): boolean => {
      const cond = conditionMap.get(code);
      return cond?.status === 'ACTIVE';
    },
    [conditionMap],
  );

  const handleToggle = useCallback(
    async (def: AntecedentDef, newValue: boolean) => {
      const key = def.code;
      setPendingToggles((prev) => new Set(prev).add(key));

      try {
        const existing = conditionMap.get(def.code);

        if (newValue) {
          if (existing) {
            // Reactivate existing condition
            await updateCondition.mutateAsync({
              patientId,
              conditionId: existing.id,
              status: 'ACTIVE' as ConditionStatus,
            });
          } else {
            // Create new condition
            await createCondition.mutateAsync({
              patientId,
              cidCode: def.code,
              cidDescription: def.name,
              status: 'ACTIVE' as ConditionStatus,
            });
          }
          toast.success(`${def.name} (${def.code}) ativado`);
        } else {
          if (existing) {
            await updateCondition.mutateAsync({
              patientId,
              conditionId: existing.id,
              status: 'INACTIVE' as ConditionStatus,
            });
            toast.success(`${def.name} (${def.code}) desativado`);
          }
        }
      } catch {
        toast.error(`Erro ao atualizar ${def.name}`);
      } finally {
        setPendingToggles((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [conditionMap, patientId, createCondition, updateCondition],
  );

  const handleSaveSurgeryNotes = useCallback(async () => {
    if (!surgeryNotes.trim()) return;
    try {
      await createCondition.mutateAsync({
        patientId,
        cidCode: 'Z98.8',
        cidDescription: 'Cirurgias previas',
        status: 'ACTIVE' as ConditionStatus,
        notes: surgeryNotes,
      });
      toast.success('Cirurgias previas registradas');
      setSurgeryNotes('');
    } catch {
      toast.error('Erro ao salvar cirurgias');
    }
  }, [surgeryNotes, patientId, createCondition]);

  const handleSaveAllergyNotes = useCallback(async () => {
    if (!allergyNotes.trim()) return;
    try {
      await createCondition.mutateAsync({
        patientId,
        cidCode: 'Z88.9',
        cidDescription: 'Alergias medicamentosas',
        status: 'ACTIVE' as ConditionStatus,
        notes: allergyNotes,
      });
      toast.success('Alergias registradas');
      setAllergyNotes('');
    } catch {
      toast.error('Erro ao salvar alergias');
    }
  }, [allergyNotes, patientId, createCondition]);

  const handleSaveGestations = useCallback(async () => {
    const text = `G${gestG || '0'} P${gestP || '0'} A${gestA || '0'}`;
    try {
      await createCondition.mutateAsync({
        patientId,
        cidCode: 'Z37.9',
        cidDescription: 'Historico obstetrico',
        status: 'ACTIVE' as ConditionStatus,
        notes: text,
      });
      toast.success('Historico obstetrico registrado');
      setGestG('');
      setGestP('');
      setGestA('');
    } catch {
      toast.error('Erro ao salvar historico obstetrico');
    }
  }, [gestG, gestP, gestA, patientId, createCondition]);

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-2 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando antecedentes...</span>
        </CardContent>
      </Card>
    );
  }

  // Groups for the expanded view
  const groups = new Map<string, AntecedentDef[]>();
  for (const def of ANTECEDENT_LIST) {
    const existing = groups.get(def.group) ?? [];
    existing.push(def);
    groups.set(def.group, existing);
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full text-left cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <HeartPulse className="h-3.5 w-3.5 text-emerald-500" />
            Antecedentes Rapidos
            <Badge variant="secondary" className="text-[10px] ml-1">
              {activeConditions.length}
            </Badge>
          </CardTitle>
        </button>
      </CardHeader>

      {/* Collapsed view: inline badges */}
      {!isExpanded && activeConditions.length > 0 && (
        <CardContent className="pb-3 pt-0">
          <div className="flex flex-wrap gap-1.5">
            {activeConditions.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className="text-[10px] border-emerald-500/30 text-emerald-400"
              >
                {c.cidDescription ?? c.cidCode}
                {c.cidCode && (
                  <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                    {c.cidCode}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}

      {/* Expanded view: toggle grid */}
      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Main antecedent toggles by group */}
          {Array.from(groups.entries()).map(([group, defs]) => (
            <div key={group}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                {defs.map((def) => {
                  const active = isConditionActive(def.code);
                  const isPending = pendingToggles.has(def.code);

                  return (
                    <label
                      key={def.code}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors cursor-pointer',
                        active
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-border bg-card hover:bg-accent/30',
                        isPending && 'opacity-60',
                      )}
                    >
                      <Switch
                        checked={active}
                        disabled={isPending}
                        onCheckedChange={(val) => void handleToggle(def, val)}
                        className="scale-75"
                      />
                      <span className="flex-1 text-xs">{def.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-[9px]',
                          active ? 'border-emerald-500/30 text-emerald-400' : 'text-muted-foreground',
                        )}
                      >
                        {def.code}
                      </Badge>
                      {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Family history checkboxes */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Historico Familiar
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {FAMILY_HISTORY_CONDITIONS.map((fh) => {
                const active = isConditionActive(fh.code);
                const isPending = pendingToggles.has(fh.code);
                return (
                  <label
                    key={fh.code}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors cursor-pointer',
                      active
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border bg-card hover:bg-accent/30',
                      isPending && 'opacity-60',
                    )}
                  >
                    <Switch
                      checked={active}
                      disabled={isPending}
                      onCheckedChange={(val) =>
                        void handleToggle({ name: fh.name, code: fh.code, group: 'Familiar' }, val)
                      }
                      className="scale-75"
                    />
                    <span className="flex-1 text-xs">{fh.name}</span>
                    <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">
                      {fh.code}
                    </Badge>
                    {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Surgery notes */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cirurgias Previas
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Descreva cirurgias previas..."
                value={surgeryNotes}
                onChange={(e) => setSurgeryNotes(e.target.value)}
                className="flex-1 bg-card border-border text-xs h-8"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-border"
                onClick={() => void handleSaveSurgeryNotes()}
                disabled={!surgeryNotes.trim()}
              >
                Salvar
              </Button>
            </div>
          </div>

          {/* Allergy notes */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Alergias Medicamentosas
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Descreva alergias medicamentosas..."
                value={allergyNotes}
                onChange={(e) => setAllergyNotes(e.target.value)}
                className="flex-1 bg-card border-border text-xs h-8"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-border"
                onClick={() => void handleSaveAllergyNotes()}
                disabled={!allergyNotes.trim()}
              >
                Salvar
              </Button>
            </div>
          </div>

          {/* Obstetric history */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gestacoes Anteriores
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">G</span>
                <Input
                  type="number"
                  min={0}
                  value={gestG}
                  onChange={(e) => setGestG(e.target.value)}
                  className="w-14 bg-card border-border text-xs h-8 text-center"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">P</span>
                <Input
                  type="number"
                  min={0}
                  value={gestP}
                  onChange={(e) => setGestP(e.target.value)}
                  className="w-14 bg-card border-border text-xs h-8 text-center"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">A</span>
                <Input
                  type="number"
                  min={0}
                  value={gestA}
                  onChange={(e) => setGestA(e.target.value)}
                  className="w-14 bg-card border-border text-xs h-8 text-center"
                  placeholder="0"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-border"
                onClick={() => void handleSaveGestations()}
                disabled={!gestG && !gestP && !gestA}
              >
                Salvar
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
