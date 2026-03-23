import { useState, useCallback } from 'react';
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  ClipboardList,
  TestTube,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProactiveCopilot } from '@/hooks/use-proactive-copilot';

// ── Types ──────────────────────────────────────────────────

type SuggestionType = 'suggestion' | 'alert' | 'guideline' | 'exam';

interface CopilotSuggestionDisplay {
  text: string;
  field: string;
  reason: string;
  type: SuggestionType;
}

// ── Helpers ────────────────────────────────────────────────

function classifySuggestionType(text: string, field: string): SuggestionType {
  const lower = text.toLowerCase();
  if (
    lower.includes('alerta') ||
    lower.includes('atenção') ||
    lower.includes('risco') ||
    lower.includes('contraindicado') ||
    lower.includes('interação')
  ) {
    return 'alert';
  }
  if (
    lower.includes('exame') ||
    lower.includes('hemograma') ||
    lower.includes('hba1c') ||
    lower.includes('laborat') ||
    lower.includes('solicitar') ||
    lower.includes('rx') ||
    lower.includes('ultrassom') ||
    lower.includes('tomografia')
  ) {
    return 'exam';
  }
  if (
    lower.includes('protocolo') ||
    lower.includes('guideline') ||
    lower.includes('diretriz') ||
    lower.includes('consenso') ||
    lower.includes('recomenda')
  ) {
    return 'guideline';
  }
  if (field === 'assessment' || field === 'plan') {
    return 'suggestion';
  }
  return 'suggestion';
}

const typeConfig: Record<
  SuggestionType,
  { icon: React.ElementType; label: string; borderColor: string; bgColor: string; textColor: string }
> = {
  suggestion: {
    icon: Lightbulb,
    label: 'Sugestao',
    borderColor: 'border-teal-500/20',
    bgColor: 'bg-teal-500/5',
    textColor: 'text-teal-400',
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerta',
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/5',
    textColor: 'text-red-400',
  },
  guideline: {
    icon: ClipboardList,
    label: 'Guideline',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    textColor: 'text-blue-400',
  },
  exam: {
    icon: TestTube,
    label: 'Exame',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-500/5',
    textColor: 'text-purple-400',
  },
};

// ── Props ──────────────────────────────────────────────────

interface ProactiveCopilotSidebarProps {
  soapText: string;
  encounterId: string;
  currentField: string;
  onApplySuggestion?: (text: string, field: string) => void;
}

// ── Component ──────────────────────────────────────────────

export function ProactiveCopilotSidebar({
  soapText,
  encounterId,
  currentField,
  onApplySuggestion,
}: ProactiveCopilotSidebarProps) {
  const { data, isLoading, isFetching } = useProactiveCopilot(
    soapText,
    encounterId,
    currentField,
  );

  const [dismissedIndexes, setDismissedIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const [appliedIndexes, setAppliedIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const [collapsed, setCollapsed] = useState(false);

  const suggestions: CopilotSuggestionDisplay[] = (
    data?.suggestions ?? []
  ).map((s) => ({
    ...s,
    type: classifySuggestionType(s.text, s.field),
  }));

  const visibleSuggestions = suggestions.filter(
    (_, i) => !dismissedIndexes.has(i),
  );

  const handleDismiss = useCallback((index: number) => {
    setDismissedIndexes((prev) => new Set(prev).add(index));
  }, []);

  const handleApply = useCallback(
    (suggestion: CopilotSuggestionDisplay, index: number) => {
      onApplySuggestion?.(suggestion.text, suggestion.field);
      setAppliedIndexes((prev) => new Set(prev).add(index));
    },
    [onApplySuggestion],
  );

  const isActive = isLoading || isFetching;

  return (
    <Card
      className={cn(
        'border-teal-500/20 bg-teal-500/5 transition-all duration-300',
        collapsed && 'pb-0',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
            <Sparkles className="h-3.5 w-3.5" />
            Copilot Proativo
            {isActive && (
              <Loader2 className="h-3 w-3 animate-spin text-teal-600 dark:text-teal-400" />
            )}
            {visibleSuggestions.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-teal-500/20 text-[10px] text-teal-400"
              >
                {visibleSuggestions.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-2 pt-0">
          {/* Loading skeleton */}
          {isLoading && visibleSuggestions.length === 0 && (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-md border border-teal-500/10 bg-teal-500/5 p-3"
                >
                  <Skeleton className="mb-2 h-3 w-3/4 bg-teal-500/10" />
                  <Skeleton className="h-2 w-1/2 bg-teal-500/10" />
                </div>
              ))}
            </div>
          )}

          {/* Suggestions list */}
          {visibleSuggestions.map((suggestion, visibleIdx) => {
            // Find original index
            const originalIdx = suggestions.findIndex(
              (s) =>
                s.text === suggestion.text &&
                s.field === suggestion.field &&
                !dismissedIndexes.has(suggestions.indexOf(s)),
            );
            const realIdx = suggestions.indexOf(suggestion);
            const isApplied = appliedIndexes.has(realIdx);
            const config = typeConfig[suggestion.type];
            const Icon = config.icon;

            return (
              <div
                key={`${realIdx}-${suggestion.text.slice(0, 20)}`}
                className={cn(
                  'animate-fade-in rounded-md border p-3 transition-all duration-200',
                  config.borderColor,
                  config.bgColor,
                  isApplied && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0',
                      config.textColor,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed">{suggestion.text}</p>
                    {suggestion.reason && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {suggestion.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5 pl-5">
                  <Badge
                    variant="outline"
                    className={cn('text-[9px]', config.textColor)}
                  >
                    {config.label}
                  </Badge>
                  {!isApplied ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                        onClick={() => handleApply(suggestion, realIdx)}
                      >
                        <Check className="mr-0.5 h-2.5 w-2.5" />
                        Aplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-red-400"
                        onClick={() => handleDismiss(realIdx)}
                      >
                        <X className="mr-0.5 h-2.5 w-2.5" />
                        Ignorar
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] text-teal-400">
                      Aplicado
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {!isLoading && visibleSuggestions.length === 0 && (
            <div className="flex items-center gap-2 py-2">
              {isFetching ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-teal-500/50" />
                  <p className="text-[11px] text-muted-foreground">
                    IA analisando...
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  {soapText.length < 30
                    ? 'Continue editando o SOAP para ativar sugestoes...'
                    : 'Nenhuma sugestao no momento.'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
