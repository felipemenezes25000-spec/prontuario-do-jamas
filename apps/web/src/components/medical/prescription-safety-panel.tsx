import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useValidatePrescriptionSafety,
  useGenerateSchedule,
  useFirstCheck,
  useDoubleCheck,
  type SafetyValidationResult,
  type ScheduleResult,
} from '@/services/prescription-safety.service';

// ============================================================================
// Recipe Type Badge
// ============================================================================

function RecipeTypeBadge({ recipeType }: { recipeType: string }) {
  const colorMap: Record<string, string> = {
    'Receita Amarela': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Receita Azul': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Receita Branca Especial': 'bg-white/10 text-gray-200 border-gray-400/30',
    'Receita Simples': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const matchKey = Object.keys(colorMap).find((k) => recipeType.includes(k));
  const color = matchKey ? colorMap[matchKey] : colorMap['Receita Simples'];

  return (
    <Badge variant="outline" className={cn('text-xs font-medium border', color)}>
      <FileText className="mr-1 h-3 w-3" />
      {recipeType}
    </Badge>
  );
}

// ============================================================================
// Alert Level Badge
// ============================================================================

function AlertLevelBadge({ level }: { level: 'HIGH' | 'CRITICAL' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-bold border',
        level === 'CRITICAL'
          ? 'bg-red-500/20 text-red-300 border-red-500/40'
          : 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      )}
    >
      {level === 'CRITICAL' ? 'CRITICO' : 'ALTO'}
    </Badge>
  );
}

// ============================================================================
// Safety Validation Form
// ============================================================================

interface SafetyValidationFormProps {
  onValidationResult?: (result: SafetyValidationResult) => void;
}

export function SafetyValidationForm({ onValidationResult }: SafetyValidationFormProps) {
  const [medicationName, setMedicationName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [concentration, setConcentration] = useState('');
  const [route, setRoute] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [isControlled, setIsControlled] = useState(false);
  const [controlType, setControlType] = useState('');
  const [isAntimicrobial, setIsAntimicrobial] = useState(false);
  const [patientGender, setPatientGender] = useState('');
  const [patientAge, setPatientAge] = useState('');

  const validateMutation = useValidatePrescriptionSafety();
  const scheduleMutation = useGenerateSchedule();

  const handleValidate = () => {
    if (!medicationName.trim()) return;

    validateMutation.mutate(
      {
        medicationName,
        activeIngredient: activeIngredient || undefined,
        concentration: concentration || undefined,
        route: route || undefined,
        frequency: frequency || undefined,
        durationDays: durationDays ? parseInt(durationDays, 10) : undefined,
        isControlled,
        controlType: isControlled && controlType ? controlType : undefined,
        isAntimicrobial,
        patientGender: patientGender || undefined,
        patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
      },
      {
        onSuccess: (result) => {
          onValidationResult?.(result);
        },
      },
    );
  };

  const handleGenerateSchedule = () => {
    if (!frequency.trim()) return;

    scheduleMutation.mutate({
      frequency,
      startTime: '08:00',
      medicationName: medicationName || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Medication Info */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="medName" className="text-xs text-muted-foreground">
            Nome do Medicamento *
          </Label>
          <Input
            id="medName"
            placeholder="Ex: Insulina NPH"
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            className="bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activeIng" className="text-xs text-muted-foreground">
            Princípio Ativo
          </Label>
          <Input
            id="activeIng"
            placeholder="Ex: Insulina humana"
            value={activeIngredient}
            onChange={(e) => setActiveIngredient(e.target.value)}
            className="bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conc" className="text-xs text-muted-foreground">
            Concentração
          </Label>
          <Input
            id="conc"
            placeholder="Ex: 100 UI/mL"
            value={concentration}
            onChange={(e) => setConcentration(e.target.value)}
            className="bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="route" className="text-xs text-muted-foreground">
            Via
          </Label>
          <Select value={route} onValueChange={setRoute}>
            <SelectTrigger id="route" className="bg-card border-border">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {['VO', 'IV', 'IM', 'SC', 'SL', 'TOP', 'INH', 'REC', 'OFT', 'OTO', 'NASAL'].map(
                (r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="freq" className="text-xs text-muted-foreground">
            Frequência
          </Label>
          <Input
            id="freq"
            placeholder="Ex: 8/8h, 1x/dia"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dur" className="text-xs text-muted-foreground">
            Duração (dias)
          </Label>
          <Input
            id="dur"
            type="number"
            min={1}
            placeholder="Ex: 7"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="bg-card border-border"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Switch checked={isControlled} onCheckedChange={setIsControlled} />
          <div>
            <p className="text-sm font-medium">Substância Controlada</p>
            <p className="text-xs text-muted-foreground">Portaria 344/98</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Switch checked={isAntimicrobial} onCheckedChange={setIsAntimicrobial} />
          <div>
            <p className="text-sm font-medium">Antimicrobiano</p>
            <p className="text-xs text-muted-foreground">RDC 471/2021</p>
          </div>
        </div>
      </div>

      {/* Controlled type selector */}
      {isControlled && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo de Controle</Label>
            <Select value={controlType} onValueChange={setControlType}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Lista..." />
              </SelectTrigger>
              <SelectContent>
                {[
                  { v: 'A1', l: 'A1 - Entorpecente' },
                  { v: 'A2', l: 'A2 - Entorpecente' },
                  { v: 'B1', l: 'B1 - Psicotrópico' },
                  { v: 'B2', l: 'B2 - Anorexígeno' },
                  { v: 'C1', l: 'C1 - Controlado' },
                  { v: 'C2', l: 'C2 - Retinóide' },
                  { v: 'C3', l: 'C3 - Imunossupressor' },
                  { v: 'C4', l: 'C4 - Anti-retroviral' },
                  { v: 'C5', l: 'C5 - Anabolizante' },
                ].map(({ v, l }) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sexo do Paciente</Label>
            <Select value={patientGender} onValueChange={setPatientGender}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Idade do Paciente</Label>
            <Input
              type="number"
              min={0}
              placeholder="Anos"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              className="bg-card border-border"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleValidate}
          disabled={!medicationName.trim() || validateMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          {validateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Validar Segurança
        </Button>
        {frequency && (
          <Button
            variant="outline"
            onClick={handleGenerateSchedule}
            disabled={scheduleMutation.isPending}
            className="border-border"
          >
            {scheduleMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            Gerar Aprazamento
          </Button>
        )}
      </div>

      {/* Validation Results */}
      {validateMutation.data && (
        <SafetyResultsPanel result={validateMutation.data} />
      )}

      {/* Schedule Results */}
      {scheduleMutation.data && (
        <SchedulePreview schedule={scheduleMutation.data} medicationName={medicationName} />
      )}

      {/* Error display */}
      {validateMutation.isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <XCircle className="mr-2 inline h-4 w-4" />
          Erro ao validar: {(validateMutation.error as Error)?.message ?? 'Erro desconhecido'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Safety Results Panel
// ============================================================================

function SafetyResultsPanel({ result }: { result: SafetyValidationResult }) {
  return (
    <div className="space-y-3">
      {/* Overall status */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border p-3',
          result.valid
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-red-500/30 bg-red-500/10',
        )}
      >
        {result.valid ? (
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-red-400" />
        )}
        <span className={cn('text-sm font-medium', result.valid ? 'text-emerald-300' : 'text-red-300')}>
          {result.valid
            ? 'Validação aprovada — sem erros encontrados'
            : `Validação reprovada — ${result.errors.length} erro(s) encontrado(s)`}
        </span>
      </div>

      {/* Errors (RED) */}
      {result.errors.length > 0 && (
        <div className="space-y-2">
          {result.errors.map((err, i) => (
            <div
              key={`err-${i}`}
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings (YELLOW) */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((warn, i) => (
            <div
              key={`warn-${i}`}
              className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recipe type (BLUE) */}
      {result.controlledSubstance && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-300">
          <Info className="h-4 w-4 shrink-0" />
          <span>Tipo de receita necessário:</span>
          <RecipeTypeBadge recipeType={result.controlledSubstance.requiredRecipeType} />
        </div>
      )}

      {/* Double-check info */}
      {result.doubleCheck && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border p-3 text-sm',
            result.doubleCheck.alertLevel === 'CRITICAL'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-orange-500/30 bg-orange-500/10 text-orange-300',
          )}
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Dupla checagem obrigatória</span>
          <AlertLevelBadge level={result.doubleCheck.alertLevel} />
          <span className="text-xs opacity-75">— {result.doubleCheck.reason}</span>
        </div>
      )}

      {/* Culture recommendation for antimicrobials */}
      {result.antimicrobial?.requiresCulture && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-300">
          <Info className="h-4 w-4 shrink-0" />
          <span>Recomendação: Solicitar cultura e antibiograma</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Schedule Preview
// ============================================================================

function SchedulePreview({
  schedule,
  medicationName,
}: {
  schedule: ScheduleResult;
  medicationName?: string;
}) {
  const formattedTimes = useMemo(() => {
    return schedule.times.map((t) => {
      const date = new Date(t);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    });
  }, [schedule.times]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-emerald-400" />
          Aprazamento — Próximas 24h
          {medicationName && (
            <span className="text-muted-foreground font-normal">({medicationName})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Intervalo: a cada {schedule.intervalHours}h
        </p>
        <div className="flex flex-wrap gap-2">
          {formattedTimes.map((time, i) => (
            <div
              key={`time-${i}`}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5"
            >
              <Clock className="h-3 w-3 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">{time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Double-Check Actions (for use in prescription detail/pharmacy pages)
// ============================================================================

interface DoubleCheckActionsProps {
  prescriptionId: string;
  requiresDoubleCheck: boolean;
  doubleCheckedAt?: string | null;
  doubleCheckedByName?: string | null;
}

export function DoubleCheckActions({
  prescriptionId,
  requiresDoubleCheck,
  doubleCheckedAt,
  doubleCheckedByName,
}: DoubleCheckActionsProps) {
  const firstCheckMutation = useFirstCheck();
  const doubleCheckMutation = useDoubleCheck();

  if (!requiresDoubleCheck) return null;

  const isDoubleChecked = !!doubleCheckedAt;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-400" />
        <span className="text-sm font-medium text-red-300">
          Medicamento de alto alerta — Dupla checagem obrigatória
        </span>
      </div>

      {isDoubleChecked ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">
            Dupla checagem realizada
            {doubleCheckedByName && ` por ${doubleCheckedByName}`}
            {doubleCheckedAt &&
              ` em ${new Date(doubleCheckedAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}`}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
            disabled={firstCheckMutation.isPending}
            onClick={() => firstCheckMutation.mutate(prescriptionId)}
          >
            {firstCheckMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-3 w-3" />
            )}
            1a Checagem
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            disabled={doubleCheckMutation.isPending}
            onClick={() => doubleCheckMutation.mutate(prescriptionId)}
          >
            {doubleCheckMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1.5 h-3 w-3" />
            )}
            Dupla Checagem
          </Button>
        </div>
      )}

      {/* Mutation error feedback */}
      {(firstCheckMutation.isError || doubleCheckMutation.isError) && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          <XCircle className="mr-1 inline h-3 w-3" />
          {(firstCheckMutation.error as Error)?.message ??
            (doubleCheckMutation.error as Error)?.message ??
            'Erro ao processar checagem'}
        </div>
      )}

      {/* Success feedback */}
      {firstCheckMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-300">
          <CheckCircle2 className="mr-1 inline h-3 w-3" />
          Primeira checagem realizada com sucesso
        </div>
      )}
    </div>
  );
}
