'use client';

import * as React from 'react';
import { Shield, Mic, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPEditorProps {
  initialData?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  onSave: (data: SOAPData) => void;
  onSign: (data: SOAPData) => void;
  isReadOnly?: boolean;
  showVoiceButtons?: boolean;
  signedBy?: string;
  signedAt?: string;
  className?: string;
}

interface SectionConfig {
  key: keyof SOAPData;
  letter: string;
  label: string;
  color: string;
  bgColor: string;
  placeholder: string;
  isAI?: boolean;
}

const sections: SectionConfig[] = [
  {
    key: 'subjective',
    letter: 'S',
    label: 'Subjetivo',
    color: 'bg-blue-500 text-white',
    bgColor: 'border-blue-500/20',
    placeholder:
      'Queixa principal, história da doença atual, sintomas relatados pelo paciente...',
  },
  {
    key: 'objective',
    letter: 'O',
    label: 'Objetivo',
    color: 'bg-teal-500 text-white',
    bgColor: 'border-teal-500/20',
    placeholder:
      'Exame físico, sinais vitais, resultados de exames complementares...',
  },
  {
    key: 'assessment',
    letter: 'A',
    label: 'Avaliação',
    color: 'bg-amber-500 text-white',
    bgColor: 'border-amber-500/20',
    placeholder:
      'Diagnósticos, hipóteses diagnósticas, diagnósticos diferenciais...',
  },
  {
    key: 'plan',
    letter: 'P',
    label: 'Plano',
    color: 'bg-teal-600 text-white',
    bgColor: 'border-teal-600/20',
    placeholder:
      'Conduta terapêutica, exames solicitados, encaminhamentos, orientações...',
  },
];

export function SOAPEditor({
  initialData,
  onSave,
  onSign,
  isReadOnly = false,
  showVoiceButtons = true,
  signedBy,
  signedAt,
  className,
}: SOAPEditorProps) {
  const [data, setData] = React.useState<SOAPData>({
    subjective: initialData?.subjective ?? '',
    objective: initialData?.objective ?? '',
    assessment: initialData?.assessment ?? '',
    plan: initialData?.plan ?? '',
  });

  const [aiSections, setAiSections] = React.useState<Set<keyof SOAPData>>(
    new Set(),
  );

  const isSigned = Boolean(signedBy && signedAt);
  const readOnly = isReadOnly || isSigned;

  function handleChange(key: keyof SOAPData, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleVoiceDictate(key: keyof SOAPData) {
    // In a real implementation, this would trigger the voice recording
    // and pipe transcription into this specific section.
    // For now, simulate AI-generated content.
    const mockAI: Record<keyof SOAPData, string> = {
      subjective:
        'Paciente refere dor epigástrica em queimação há 3 dias, piora após alimentação, associada a náuseas. Nega vômitos, febre ou alterações intestinais.',
      objective:
        'BEG, corado, hidratado, acianótico, anictérico. Abdome: plano, RHA+, dor à palpação profunda em epigástrio, sem sinais de irritação peritoneal.',
      assessment:
        'Dispepsia funcional. Diagnósticos diferenciais: gastrite, úlcera péptica, DRGE.',
      plan: '1. Omeprazol 20mg 1x/dia em jejum por 30 dias\n2. Orientações dietéticas\n3. Retorno em 30 dias\n4. Se persistência, solicitar EDA',
    };

    setData((prev) => ({
      ...prev,
      [key]: prev[key] ? `${prev[key]}\n${mockAI[key]}` : mockAI[key],
    }));
    setAiSections((prev) => new Set(prev).add(key));
  }

  function handleSave() {
    onSave(data);
  }

  function handleSign() {
    onSign(data);
  }

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isSigned && 'border-teal-500/30',
        className,
      )}
    >
      {/* Signed state banner */}
      {isSigned && (
        <div className="flex items-center gap-2 border-b border-teal-500/20 bg-teal-500/5 px-4 py-2">
          <Shield className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
            Assinado por {signedBy} em {signedAt}
          </span>
        </div>
      )}

      <div className="space-y-4 p-4">
        {sections.map((section) => (
          <div key={section.key} className="space-y-2">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    section.color,
                  )}
                >
                  {section.letter}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {section.label}
                </span>
                {aiSections.has(section.key) && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-teal-500/30 px-1.5 py-0 text-[10px] text-teal-600 dark:text-teal-400"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    IA
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showVoiceButtons && !readOnly && (
                  <button
                    type="button"
                    onClick={() => handleVoiceDictate(section.key)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-colors hover:bg-teal-500/20 cursor-pointer"
                    aria-label={`Ditar ${section.label} por voz`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className="text-[10px] tabular-nums text-muted-foreground/50">
                  {data[section.key].length} caracteres
                </span>
              </div>
            </div>

            {/* Text area */}
            <Textarea
              value={data[section.key]}
              onChange={(e) => handleChange(section.key, e.target.value)}
              placeholder={section.placeholder}
              disabled={readOnly}
              rows={3}
              className={cn(
                'min-h-[76px] resize-y transition-colors',
                section.bgColor,
                readOnly && 'opacity-80',
              )}
            />
          </div>
        ))}

        {/* Actions */}
        {!isSigned && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleSave}>
              Salvar Rascunho
            </Button>
            <Button
              onClick={handleSign}
              className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
            >
              <Shield className="h-4 w-4" />
              Assinar
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
