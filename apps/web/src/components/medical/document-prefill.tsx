import { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Pill,
  Stethoscope,
  AlertTriangle,
  Heart,
  CreditCard,
  Loader2,
  Check,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useLastDocumentMetadata,
  usePatientCommonData,
  type PatientCommonData,
} from '@/services/document-replication.service';
import type { DocumentType } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface DocumentPrefillProps {
  patientId: string;
  documentType: DocumentType;
  onApply: (template: Record<string, unknown>) => void;
  className?: string;
}

interface SelectableField {
  key: string;
  label: string;
  value: unknown;
  category: 'document' | 'medication' | 'diagnosis' | 'allergy' | 'condition' | 'insurance';
}

// ============================================================================
// Helpers
// ============================================================================

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ATESTADO: 'Atestado',
  RECEITA: 'Receita',
  ENCAMINHAMENTO: 'Encaminhamento',
  LAUDO: 'Laudo',
  DECLARACAO: 'Declaração',
  CONSENTIMENTO: 'Consentimento',
  TERMO_RESPONSABILIDADE: 'Termo de Responsabilidade',
  RELATORIO: 'Relatório',
  PRONTUARIO_RESUMO: 'Resumo de Prontuário',
  FICHA_INTERNACAO: 'Ficha de Internação',
  SUMARIO_ALTA: 'Sumário de Alta',
  BOLETIM_OCORRENCIA: 'Boletim de Ocorrência',
  CERTIDAO_OBITO: 'Certidão de Óbito',
  CUSTOM: 'Personalizado',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

const SEVERITY_STYLES: Record<string, string> = {
  LIFE_THREATENING: 'bg-red-600/15 border-red-600/30 text-red-400',
  SEVERE: 'bg-red-500/15 border-red-500/30 text-red-400',
  MODERATE: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  MILD: 'bg-green-500/15 border-green-500/30 text-green-400',
};

// ============================================================================
// Sub-components
// ============================================================================

function MedicationBadge({ name }: { name: string }) {
  return (
    <Badge variant="secondary" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
      <Pill className="mr-1 h-3 w-3" />
      {name}
    </Badge>
  );
}

function AllergyTag({
  substance,
  severity,
}: {
  substance: string;
  severity: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border',
        SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.MODERATE,
      )}
    >
      <AlertTriangle className="mr-1 h-3 w-3" />
      {substance}
    </Badge>
  );
}

function ConditionTag({
  cidCode,
  description,
}: {
  cidCode: string | null;
  description: string | null;
}) {
  const label = cidCode
    ? `${cidCode}${description ? ` — ${description}` : ''}`
    : description ?? '—';
  return (
    <Badge variant="outline" className="bg-violet-500/10 border-violet-500/30 text-violet-400">
      <Heart className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentPrefill({
  patientId,
  documentType,
  onApply,
  className,
}: DocumentPrefillProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const {
    data: metadata,
    isLoading: metadataLoading,
  } = useLastDocumentMetadata(
    expanded ? patientId : undefined,
    expanded ? documentType : undefined,
  );

  const {
    data: patientData,
    isLoading: patientDataLoading,
  } = usePatientCommonData(expanded ? patientId : undefined);

  const isLoading = metadataLoading || patientDataLoading;

  // Build selectable fields from metadata and patient data
  const fields = useMemo<SelectableField[]>(() => {
    const result: SelectableField[] = [];

    if (metadata?.found && metadata.template) {
      const tpl = metadata.template;

      if (tpl.title) {
        result.push({
          key: 'doc_title',
          label: 'Título do documento',
          value: tpl.title,
          category: 'document',
        });
      }
      if (tpl.content) {
        result.push({
          key: 'doc_content',
          label: 'Conteúdo do documento',
          value: tpl.content,
          category: 'document',
        });
      }
      if (tpl.templateId) {
        result.push({
          key: 'doc_templateId',
          label: `Template: ${(tpl.templateName as string) ?? 'Último utilizado'}`,
          value: tpl.templateId,
          category: 'document',
        });
      }
      if (tpl.diagnosisCodes && Array.isArray(tpl.diagnosisCodes) && (tpl.diagnosisCodes as string[]).length > 0) {
        result.push({
          key: 'doc_diagnosisCodes',
          label: `Códigos CID-10: ${(tpl.diagnosisCodes as string[]).join(', ')}`,
          value: tpl.diagnosisCodes,
          category: 'diagnosis',
        });
      }
      if (tpl.lastComplaint) {
        result.push({
          key: 'doc_lastComplaint',
          label: 'Última queixa principal',
          value: tpl.lastComplaint,
          category: 'document',
        });
      }
      if (tpl.lastAssessment) {
        result.push({
          key: 'doc_lastAssessment',
          label: 'Última avaliação',
          value: tpl.lastAssessment,
          category: 'document',
        });
      }
      if (tpl.lastPlan) {
        result.push({
          key: 'doc_lastPlan',
          label: 'Último plano',
          value: tpl.lastPlan,
          category: 'document',
        });
      }
      if (tpl.medications && Array.isArray(tpl.medications)) {
        result.push({
          key: 'doc_medications',
          label: 'Medicamentos da última prescrição',
          value: tpl.medications,
          category: 'medication',
        });
      }
      if (tpl.exams && Array.isArray(tpl.exams) && (tpl.exams as unknown[]).length > 0) {
        result.push({
          key: 'doc_exams',
          label: 'Exames da última prescrição',
          value: tpl.exams,
          category: 'document',
        });
      }
    }

    if (patientData) {
      if (patientData.medications.length > 0) {
        result.push({
          key: 'common_medications',
          label: 'Medicamentos mais prescritos',
          value: patientData.medications,
          category: 'medication',
        });
      }
      if (patientData.diagnoses.length > 0) {
        result.push({
          key: 'common_diagnoses',
          label: 'Diagnósticos mais frequentes',
          value: patientData.diagnoses,
          category: 'diagnosis',
        });
      }
      if (patientData.allergies.length > 0) {
        result.push({
          key: 'common_allergies',
          label: 'Alergias ativas',
          value: patientData.allergies,
          category: 'allergy',
        });
      }
      if (patientData.conditions.length > 0) {
        result.push({
          key: 'common_conditions',
          label: 'Condições crônicas',
          value: patientData.conditions,
          category: 'condition',
        });
      }
      if (patientData.insurance.provider) {
        result.push({
          key: 'common_insurance',
          label: `Convênio: ${patientData.insurance.provider} — ${patientData.insurance.plan ?? ''}`,
          value: patientData.insurance,
          category: 'insurance',
        });
      }
    }

    return result;
  }, [metadata, patientData]);

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFields(new Set(fields.map((f) => f.key)));
  }, [fields]);

  const deselectAll = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  const handleApply = useCallback(() => {
    const template: Record<string, unknown> = {};
    for (const field of fields) {
      if (selectedFields.has(field.key)) {
        template[field.key] = field.value;
      }
    }
    onApply(template);
  }, [fields, selectedFields, onApply]);

  const typeLabel = DOCUMENT_TYPE_LABELS[documentType] ?? documentType;

  return (
    <Card className={cn('border-zinc-800 bg-zinc-900/50', className)}>
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Copy className="h-4 w-4 text-emerald-500" />
            Preencher com dados anteriores
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              <span className="ml-2 text-sm text-zinc-400">
                Carregando dados do paciente...
              </span>
            </div>
          )}

          {!isLoading && fields.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nenhum dado anterior encontrado para este paciente.
            </p>
          )}

          {!isLoading && fields.length > 0 && (
            <>
              {/* Last document header */}
              {metadata?.found && (
                <div className="rounded-md border border-zinc-800 bg-zinc-800/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    <span className="text-zinc-300">
                      Último <strong>{typeLabel}</strong> em{' '}
                      <strong>{formatDate(metadata.sourceDate)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Select/deselect all */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {selectedFields.size} de {fields.length} campo(s) selecionado(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                    onClick={selectAll}
                  >
                    Selecionar tudo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                    onClick={deselectAll}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Field list */}
              <div className="space-y-2">
                {fields.map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    checked={selectedFields.has(field.key)}
                    onToggle={() => toggleField(field.key)}
                  />
                ))}
              </div>

              <Separator className="bg-zinc-800" />

              {/* Patient data visual summary */}
              {patientData && <PatientDataSummary data={patientData} />}

              {/* Apply button */}
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={selectedFields.size === 0}
                onClick={handleApply}
              >
                <Check className="mr-2 h-4 w-4" />
                Aplicar {selectedFields.size} campo(s)
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// FieldRow
// ============================================================================

function FieldRow({
  field,
  checked,
  onToggle,
}: {
  field: SelectableField;
  checked: boolean;
  onToggle: () => void;
}) {
  const icon = useMemo(() => {
    switch (field.category) {
      case 'medication':
        return <Pill className="h-3.5 w-3.5 text-emerald-500" />;
      case 'diagnosis':
        return <Stethoscope className="h-3.5 w-3.5 text-blue-400" />;
      case 'allergy':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
      case 'condition':
        return <Heart className="h-3.5 w-3.5 text-violet-400" />;
      case 'insurance':
        return <CreditCard className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-zinc-400" />;
    }
  }, [field.category]);

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 bg-zinc-800/30 p-2.5 transition-colors hover:bg-zinc-800/60">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5 border-zinc-600 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-600"
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
          {icon}
          {field.label}
        </div>
        <FieldValuePreview field={field} />
      </div>
    </label>
  );
}

// ============================================================================
// FieldValuePreview
// ============================================================================

function FieldValuePreview({ field }: { field: SelectableField }) {
  if (field.category === 'medication' && Array.isArray(field.value)) {
    const items = field.value as Array<Record<string, string> | string>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => {
          const name = typeof item === 'string' ? item : item.medicationName ?? '—';
          return <MedicationBadge key={`${name}-${i}`} name={name} />;
        })}
      </div>
    );
  }

  if (field.category === 'allergy' && Array.isArray(field.value)) {
    const items = field.value as Array<{ substance: string; severity: string }>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((a) => (
          <AllergyTag
            key={a.substance}
            substance={a.substance}
            severity={a.severity}
          />
        ))}
      </div>
    );
  }

  if (field.category === 'condition' && Array.isArray(field.value)) {
    const items = field.value as Array<{
      cidCode: string | null;
      cidDescription: string | null;
    }>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((c, i) => (
          <ConditionTag
            key={c.cidCode ?? `cond-${i}`}
            cidCode={c.cidCode}
            description={c.cidDescription}
          />
        ))}
      </div>
    );
  }

  if (field.category === 'diagnosis' && Array.isArray(field.value)) {
    const codes = field.value as string[];
    return (
      <div className="flex flex-wrap gap-1">
        {codes.map((code) => (
          <Badge
            key={code}
            variant="outline"
            className="bg-blue-500/10 border-blue-500/30 text-blue-400"
          >
            {code}
          </Badge>
        ))}
      </div>
    );
  }

  if (field.category === 'insurance' && typeof field.value === 'object') {
    const ins = field.value as {
      provider: string | null;
      plan: string | null;
      number: string | null;
    };
    return (
      <span className="text-xs text-zinc-500">
        {[ins.provider, ins.plan, ins.number].filter(Boolean).join(' — ')}
      </span>
    );
  }

  // Default: truncated text preview
  const strValue = typeof field.value === 'string' ? field.value : '';
  if (!strValue) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="line-clamp-2 text-xs text-zinc-500">
            {strValue.length > 120 ? `${strValue.substring(0, 120)}...` : strValue}
          </p>
        </TooltipTrigger>
        {strValue.length > 120 && (
          <TooltipContent
            side="bottom"
            className="max-w-sm whitespace-pre-wrap border-zinc-700 bg-zinc-800 text-zinc-300"
          >
            {strValue.substring(0, 500)}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// PatientDataSummary — visual-only, always shown
// ============================================================================

function PatientDataSummary({ data }: { data: PatientCommonData }) {
  const hasAllergies = data.allergies.length > 0;
  const hasConditions = data.conditions.length > 0;

  if (!hasAllergies && !hasConditions) return null;

  return (
    <div className="space-y-3">
      {hasAllergies && (
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Alergias do paciente
          </span>
          <div className="flex flex-wrap gap-1">
            {data.allergies.map((a) => (
              <AllergyTag
                key={a.id}
                substance={a.substance}
                severity={a.severity}
              />
            ))}
          </div>
        </div>
      )}

      {hasConditions && (
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-violet-400">
            <Heart className="h-3 w-3" />
            Condições crônicas
          </span>
          <div className="flex flex-wrap gap-1">
            {data.conditions.map((c) => (
              <ConditionTag
                key={c.id}
                cidCode={c.cidCode}
                description={c.cidDescription}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
