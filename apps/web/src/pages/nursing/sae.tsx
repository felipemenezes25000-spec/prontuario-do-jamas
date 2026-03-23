import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Stethoscope,
  Target,
  Activity,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateNursingProcess } from '@/services/nursing.service';

// ============================================================================
// NANDA Diagnoses Data (top 20)
// ============================================================================

interface NandaDiagnosis {
  code: string;
  title: string;
  definition: string;
  relatedFactors: string[];
  definingCharacteristics: string[];
  domain: string;
}

const NANDA_DIAGNOSES: NandaDiagnosis[] = [
  {
    code: '00004',
    title: 'Risco de infeccao',
    definition: 'Suscetibilidade aumentada a invasao de organismos patogenicos.',
    relatedFactors: ['Procedimentos invasivos', 'Defesa primaria inadequada', 'Imunossupressao'],
    definingCharacteristics: [],
    domain: 'Seguranca/Protecao',
  },
  {
    code: '00132',
    title: 'Dor aguda',
    definition: 'Experiencia sensitiva e emocional desagradavel com inicio subito ou lento, de intensidade leve a intensa, com termino antecipado ou previsivel.',
    relatedFactors: ['Agentes lesivos biologicos', 'Agentes lesivos quimicos', 'Agentes lesivos fisicos'],
    definingCharacteristics: ['Relato verbal de dor', 'Expressao facial', 'Comportamento protetor', 'Alteracoes nos sinais vitais'],
    domain: 'Conforto',
  },
  {
    code: '00133',
    title: 'Dor cronica',
    definition: 'Experiencia sensitiva e emocional desagradavel com duracao superior a 3 meses.',
    relatedFactors: ['Condicao musculoesqueletica cronica', 'Lesao do sistema nervoso', 'Compressao do nervo'],
    definingCharacteristics: ['Relato verbal de dor', 'Expressao facial', 'Alteracao no padrao de sono'],
    domain: 'Conforto',
  },
  {
    code: '00032',
    title: 'Padrao respiratorio ineficaz',
    definition: 'Inspiracao e/ou expiracao que nao proporciona ventilacao adequada.',
    relatedFactors: ['Fadiga da musculatura respiratoria', 'Dor', 'Ansiedade', 'Posicao do corpo'],
    definingCharacteristics: ['Dispneia', 'Uso de musculatura acessoria', 'Alteracao na profundidade respiratoria'],
    domain: 'Atividade/Repouso',
  },
  {
    code: '00030',
    title: 'Troca de gases prejudicada',
    definition: 'Excesso ou deficit na oxigenacao e/ou na eliminacao de dioxido de carbono na membrana alveolocapilar.',
    relatedFactors: ['Desequilibrio na ventilacao-perfusao', 'Alteracoes na membrana alveolocapilar'],
    definingCharacteristics: ['Gasometria arterial anormal', 'Cianose', 'Confusao', 'Dispneia'],
    domain: 'Eliminacao e Troca',
  },
  {
    code: '00029',
    title: 'Debito cardiaco diminuido',
    definition: 'Quantidade insuficiente de sangue bombeado pelo coracao para atender as demandas metabolicas corporais.',
    relatedFactors: ['Alteracao na frequencia cardiaca', 'Alteracao no ritmo cardiaco', 'Alteracao na pre-carga'],
    definingCharacteristics: ['Bradicardia', 'Taquicardia', 'Arritmias', 'Pele fria e pegajosa'],
    domain: 'Atividade/Repouso',
  },
  {
    code: '00027',
    title: 'Volume de liquidos deficiente',
    definition: 'Diminuicao do liquido intravascular, intersticial e/ou intracelular.',
    relatedFactors: ['Perda ativa de volume de liquidos', 'Falha nos mecanismos reguladores'],
    definingCharacteristics: ['Diminuicao do turgor da pele', 'Mucosas secas', 'Aumento da frequencia de pulso', 'Hipotensao'],
    domain: 'Nutricao',
  },
  {
    code: '00046',
    title: 'Integridade da pele prejudicada',
    definition: 'Epiderme e/ou derme alterada.',
    relatedFactors: ['Pressao', 'Imobilidade fisica', 'Umidade', 'Estado nutricional alterado'],
    definingCharacteristics: ['Destruicao de camadas da pele', 'Rompimento da superficie da pele', 'Invasao das estruturas do corpo'],
    domain: 'Seguranca/Protecao',
  },
  {
    code: '00085',
    title: 'Mobilidade fisica prejudicada',
    definition: 'Limitacao no movimento fisico independente e voluntario do corpo ou de uma ou mais extremidades.',
    relatedFactors: ['Dor', 'Forca muscular diminuida', 'Prescricao de restricao de movimento'],
    definingCharacteristics: ['Capacidade limitada para realizar habilidades motoras grossas', 'Amplitude de movimentos limitada'],
    domain: 'Atividade/Repouso',
  },
  {
    code: '00155',
    title: 'Risco de queda',
    definition: 'Suscetibilidade aumentada a quedas que podem causar dano fisico.',
    relatedFactors: ['Idade acima de 65 anos', 'Historia de quedas', 'Uso de medicamentos que afetam equilibrio'],
    definingCharacteristics: [],
    domain: 'Seguranca/Protecao',
  },
  {
    code: '00002',
    title: 'Nutricao desequilibrada: menor que as necessidades corporais',
    definition: 'Ingestao de nutrientes insuficiente para satisfazer as necessidades metabolicas.',
    relatedFactors: ['Incapacidade de ingerir alimentos', 'Incapacidade de digerir alimentos', 'Fatores biologicos'],
    definingCharacteristics: ['Perda de peso com ingesta alimentar adequada', 'Dor abdominal', 'Falta de interesse por alimentos'],
    domain: 'Nutricao',
  },
  {
    code: '00011',
    title: 'Constipacao',
    definition: 'Diminuicao na frequencia normal de evacuacao, acompanhada de eliminacao dificil ou incompleta de fezes.',
    relatedFactors: ['Atividade fisica insuficiente', 'Habitos alimentares alterados', 'Ingestao de fibras insuficiente'],
    definingCharacteristics: ['Frequencia diminuida', 'Fezes duras e formadas', 'Esforco para evacuar'],
    domain: 'Eliminacao e Troca',
  },
  {
    code: '00146',
    title: 'Ansiedade',
    definition: 'Sentimento vago e incomodo de desconforto ou temor, acompanhado por resposta autonomica.',
    relatedFactors: ['Ameaca ao estado de saude', 'Estresse', 'Conflito de valores'],
    definingCharacteristics: ['Inquietacao', 'Agitacao', 'Insonia', 'Preocupacao expressa'],
    domain: 'Enfrentamento/Tolerancia ao Estresse',
  },
  {
    code: '00148',
    title: 'Medo',
    definition: 'Resposta a ameaca percebida que e conscientemente reconhecida como um perigo.',
    relatedFactors: ['Estimulos fobicos', 'Ambiente hospitalar', 'Separacao do sistema de apoio'],
    definingCharacteristics: ['Relato verbal de medo', 'Aumento da frequencia cardiaca', 'Tensao muscular'],
    domain: 'Enfrentamento/Tolerancia ao Estresse',
  },
  {
    code: '00108',
    title: 'Deficit no autocuidado para banho',
    definition: 'Capacidade prejudicada de realizar ou completar atividades de banho.',
    relatedFactors: ['Dor', 'Fraqueza', 'Prejuizo perceptivo', 'Prejuizo musculoesqueletico'],
    definingCharacteristics: ['Incapacidade de acessar o banheiro', 'Incapacidade de lavar o corpo'],
    domain: 'Atividade/Repouso',
  },
  {
    code: '00128',
    title: 'Confusao aguda',
    definition: 'Inicio abrupto de disturbios reversiveis de consciencia, atencao, cognicao e percepcao.',
    relatedFactors: ['Delirium', 'Demencia', 'Abuso de substancias', 'Idade acima de 60 anos'],
    definingCharacteristics: ['Flutuacao na cognicao', 'Flutuacao no nivel de consciencia', 'Agitacao'],
    domain: 'Percepcao/Cognicao',
  },
  {
    code: '00206',
    title: 'Risco de sangramento',
    definition: 'Suscetibilidade a reducao no volume de sangue que pode comprometer a saude.',
    relatedFactors: ['Coagulopatia', 'Uso de anticoagulantes', 'Trauma', 'Complicacoes pos-parto'],
    definingCharacteristics: [],
    domain: 'Seguranca/Protecao',
  },
  {
    code: '00008',
    title: 'Termorregulacao ineficaz',
    definition: 'Flutuacao da temperatura entre hipotermia e hipertermia.',
    relatedFactors: ['Doenca', 'Trauma', 'Extremos de idade', 'Medicamentos'],
    definingCharacteristics: ['Flutuacoes na temperatura corporal', 'Pele fria', 'Pele quente'],
    domain: 'Seguranca/Protecao',
  },
  {
    code: '00204',
    title: 'Perfusao tissular periferica ineficaz',
    definition: 'Diminuicao na circulacao sanguinea periferica que pode comprometer a saude.',
    relatedFactors: ['Hipertensao', 'Diabetes mellitus', 'Tabagismo', 'Conhecimento deficiente'],
    definingCharacteristics: ['Pulsos perifericos diminuidos', 'Edema', 'Claudicacao', 'Tempo de enchimento capilar > 3s'],
    domain: 'Atividade/Repouso',
  },
  {
    code: '00016',
    title: 'Eliminacao urinaria prejudicada',
    definition: 'Disturbio na eliminacao de urina.',
    relatedFactors: ['Infeccao do trato urinario', 'Obstrucao anatomica', 'Multicausalidade'],
    definingCharacteristics: ['Disuria', 'Frequencia urinaria', 'Retencao urinaria', 'Urgencia urinaria'],
    domain: 'Eliminacao e Troca',
  },
];

// ============================================================================
// Types for the wizard state
// ============================================================================

interface SelectedDiagnosis {
  nanda: NandaDiagnosis;
  relatedFactors: string[];
  definingCharacteristics: string[];
  outcomes: Array<{
    nocTitle: string;
    baselineScore: number;
    targetScore: number;
  }>;
  interventions: Array<{
    nicTitle: string;
    frequency: string;
    notes: string;
  }>;
}

// ============================================================================
// Step Components
// ============================================================================

const STEPS = [
  { label: 'Coleta de Dados', icon: ClipboardList },
  { label: 'Diagnosticos NANDA', icon: Stethoscope },
  { label: 'Resultados NOC', icon: Target },
  { label: 'Intervencoes NIC', icon: Activity },
  { label: 'Evolucao', icon: FileText },
];

export default function SAEPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const encounterId = searchParams.get('encounterId') ?? '';
  const patientId = searchParams.get('patientId') ?? '';

  const [currentStep, setCurrentStep] = useState(0);
  const [dataCollectionNotes, setDataCollectionNotes] = useState('');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<SelectedDiagnosis[]>([]);
  const [evolutionNotes, setEvolutionNotes] = useState('');
  const [corenNumber, setCorenNumber] = useState('');

  const createProcess = useCreateNursingProcess();

  const filteredNanda = useMemo(() => {
    if (!diagnosisSearch) return NANDA_DIAGNOSES;
    const lower = diagnosisSearch.toLowerCase();
    return NANDA_DIAGNOSES.filter(
      (d) =>
        d.title.toLowerCase().includes(lower) ||
        d.code.includes(lower) ||
        d.domain.toLowerCase().includes(lower),
    );
  }, [diagnosisSearch]);

  const addDiagnosis = useCallback((nanda: NandaDiagnosis) => {
    setSelectedDiagnoses((prev) => {
      if (prev.some((d) => d.nanda.code === nanda.code)) return prev;
      return [
        ...prev,
        {
          nanda,
          relatedFactors: [...nanda.relatedFactors],
          definingCharacteristics: [...nanda.definingCharacteristics],
          outcomes: [{ nocTitle: '', baselineScore: 1, targetScore: 5 }],
          interventions: [{ nicTitle: '', frequency: '', notes: '' }],
        },
      ];
    });
  }, []);

  const removeDiagnosis = useCallback((code: string) => {
    setSelectedDiagnoses((prev) => prev.filter((d) => d.nanda.code !== code));
  }, []);

  const updateOutcome = useCallback(
    (diagIdx: number, outcomeIdx: number, field: string, value: string | number) => {
      setSelectedDiagnoses((prev) => {
        const next = [...prev];
        const diag = { ...next[diagIdx] };
        const outcomes = [...diag.outcomes];
        outcomes[outcomeIdx] = { ...outcomes[outcomeIdx], [field]: value };
        diag.outcomes = outcomes;
        next[diagIdx] = diag;
        return next;
      });
    },
    [],
  );

  const addOutcome = useCallback((diagIdx: number) => {
    setSelectedDiagnoses((prev) => {
      const next = [...prev];
      const diag = { ...next[diagIdx] };
      diag.outcomes = [...diag.outcomes, { nocTitle: '', baselineScore: 1, targetScore: 5 }];
      next[diagIdx] = diag;
      return next;
    });
  }, []);

  const updateIntervention = useCallback(
    (diagIdx: number, intIdx: number, field: string, value: string) => {
      setSelectedDiagnoses((prev) => {
        const next = [...prev];
        const diag = { ...next[diagIdx] };
        const interventions = [...diag.interventions];
        interventions[intIdx] = { ...interventions[intIdx], [field]: value };
        diag.interventions = interventions;
        next[diagIdx] = diag;
        return next;
      });
    },
    [],
  );

  const addIntervention = useCallback((diagIdx: number) => {
    setSelectedDiagnoses((prev) => {
      const next = [...prev];
      const diag = { ...next[diagIdx] };
      diag.interventions = [...diag.interventions, { nicTitle: '', frequency: '', notes: '' }];
      next[diagIdx] = diag;
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!encounterId || !patientId) {
      toast.error('Encounter ID e Patient ID sao obrigatorios');
      return;
    }

    if (selectedDiagnoses.length === 0) {
      toast.error('Selecione ao menos um diagnostico');
      return;
    }

    createProcess.mutate(
      {
        encounterId,
        patientId,
        dataCollectionNotes,
      },
      {
        onSuccess: () => {
          toast.success('SAE salva com sucesso');
          navigate('/enfermagem');
        },
        onError: () => {
          toast.error('Erro ao salvar SAE');
        },
      },
    );
  }, [encounterId, patientId, dataCollectionNotes, selectedDiagnoses, createProcess, navigate]);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0:
        return true; // data collection is optional text
      case 1:
        return selectedDiagnoses.length > 0;
      case 2:
        return selectedDiagnoses.every((d) => d.outcomes.some((o) => o.nocTitle.trim()));
      case 3:
        return selectedDiagnoses.every((d) => d.interventions.some((i) => i.nicTitle.trim()));
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedDiagnoses]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          SAE - Sistematizacao da Assistencia de Enfermagem
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => (
          <div key={step.label} className="flex items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                idx === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : idx < currentStep
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              <step.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{idx + 1}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Data Collection */}
      {currentStep === 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Passo 1 - Coleta de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registre os dados relevantes do paciente: condicoes atuais, alergias, sinais vitais, prescricoes em uso.
            </p>
            {(!encounterId || !patientId) && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-sm text-amber-300">
                  Para uma SAE completa, acesse esta pagina a partir de um atendimento.
                  Use os parametros ?encounterId=...&patientId=...
                </p>
              </div>
            )}
            <div>
              <Label>Notas da Coleta de Dados</Label>
              <Textarea
                value={dataCollectionNotes}
                onChange={(e) => setDataCollectionNotes(e.target.value)}
                placeholder="Descreva o historico, queixas, exame fisico, medicamentos em uso, alergias..."
                className="min-h-[200px] bg-card border-border"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: NANDA Diagnoses */}
      {currentStep === 1 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Passo 2 - Diagnosticos de Enfermagem (NANDA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar diagnostico NANDA (ex: dor, risco, respiratorio)..."
                value={diagnosisSearch}
                onChange={(e) => setDiagnosisSearch(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            {/* Selected diagnoses */}
            {selectedDiagnoses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Diagnosticos selecionados ({selectedDiagnoses.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDiagnoses.map((d) => (
                    <Badge
                      key={d.nanda.code}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 text-xs bg-primary/20 text-primary"
                    >
                      {d.nanda.code} - {d.nanda.title}
                      <button
                        type="button"
                        onClick={() => removeDiagnosis(d.nanda.code)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available diagnoses */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredNanda.map((nanda) => {
                const isSelected = selectedDiagnoses.some((d) => d.nanda.code === nanda.code);
                return (
                  <div
                    key={nanda.code}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {nanda.code}
                          </Badge>
                          <span className="text-sm font-medium">{nanda.title}</span>
                          <Badge variant="secondary" className="text-[9px] text-muted-foreground">
                            {nanda.domain}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{nanda.definition}</p>
                        {nanda.relatedFactors.length > 0 && (
                          <div className="mt-1.5">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Fatores relacionados:{' '}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {nanda.relatedFactors.join(', ')}
                            </span>
                          </div>
                        )}
                        {nanda.definingCharacteristics.length > 0 && (
                          <div className="mt-0.5">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Caracteristicas definidoras:{' '}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {nanda.definingCharacteristics.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isSelected ? 'secondary' : 'default'}
                        className={cn(
                          'ml-3 shrink-0 h-7 text-xs',
                          !isSelected && 'bg-primary hover:bg-primary/90',
                        )}
                        onClick={() => isSelected ? removeDiagnosis(nanda.code) : addDiagnosis(nanda)}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Selecionado
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-3 w-3" />
                            Adicionar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: NOC Outcomes */}
      {currentStep === 2 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Passo 3 - Resultados Esperados (NOC)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedDiagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Volte ao passo anterior e selecione ao menos um diagnostico.
              </p>
            ) : (
              selectedDiagnoses.map((diag, diagIdx) => (
                <div key={diag.nanda.code} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{diag.nanda.code}</Badge>
                    <span className="text-sm font-medium">{diag.nanda.title}</span>
                  </div>

                  {diag.outcomes.map((outcome, outcomeIdx) => (
                    <div key={outcomeIdx} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                      <div>
                        <Label className="text-xs">Resultado NOC</Label>
                        <Input
                          value={outcome.nocTitle}
                          onChange={(e) =>
                            updateOutcome(diagIdx, outcomeIdx, 'nocTitle', e.target.value)
                          }
                          placeholder="Ex: Controle da dor, Nivel de mobilidade..."
                          className="bg-card border-border text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Baseline (1-5)</Label>
                        <Select
                          value={String(outcome.baselineScore)}
                          onValueChange={(v) =>
                            updateOutcome(diagIdx, outcomeIdx, 'baselineScore', parseInt(v, 10))
                          }
                        >
                          <SelectTrigger className="w-20 bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Meta (1-5)</Label>
                        <Select
                          value={String(outcome.targetScore)}
                          onValueChange={(v) =>
                            updateOutcome(diagIdx, outcomeIdx, 'targetScore', parseInt(v, 10))
                          }
                        >
                          <SelectTrigger className="w-20 bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => addOutcome(diagIdx)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar Resultado
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: NIC Interventions */}
      {currentStep === 3 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Passo 4 - Intervencoes de Enfermagem (NIC)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedDiagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Volte ao passo 2 e selecione ao menos um diagnostico.
              </p>
            ) : (
              selectedDiagnoses.map((diag, diagIdx) => (
                <div key={diag.nanda.code} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{diag.nanda.code}</Badge>
                    <span className="text-sm font-medium">{diag.nanda.title}</span>
                  </div>

                  {diag.interventions.map((intervention, intIdx) => (
                    <div key={intIdx} className="space-y-2">
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div>
                          <Label className="text-xs">Intervencao NIC</Label>
                          <Input
                            value={intervention.nicTitle}
                            onChange={(e) =>
                              updateIntervention(diagIdx, intIdx, 'nicTitle', e.target.value)
                            }
                            placeholder="Ex: Administracao de analgesico, Posicionamento..."
                            className="bg-card border-border text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Frequencia</Label>
                          <Select
                            value={intervention.frequency}
                            onValueChange={(v) =>
                              updateIntervention(diagIdx, intIdx, 'frequency', v)
                            }
                          >
                            <SelectTrigger className="w-36 bg-card border-border">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1x/dia">1x ao dia</SelectItem>
                              <SelectItem value="2x/dia">2x ao dia</SelectItem>
                              <SelectItem value="3x/dia">3x ao dia</SelectItem>
                              <SelectItem value="4/4h">A cada 4h</SelectItem>
                              <SelectItem value="6/6h">A cada 6h</SelectItem>
                              <SelectItem value="8/8h">A cada 8h</SelectItem>
                              <SelectItem value="12/12h">A cada 12h</SelectItem>
                              <SelectItem value="continuo">Continuo</SelectItem>
                              <SelectItem value="SN">Se necessario</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Notas</Label>
                        <Input
                          value={intervention.notes}
                          onChange={(e) =>
                            updateIntervention(diagIdx, intIdx, 'notes', e.target.value)
                          }
                          placeholder="Observacoes sobre a intervencao..."
                          className="bg-card border-border text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => addIntervention(diagIdx)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar Intervencao
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Evolution */}
      {currentStep === 4 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Passo 5 - Evolucao de Enfermagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Resumo da SAE:</p>
              <p className="text-xs">
                <span className="font-medium">{selectedDiagnoses.length}</span> diagnostico(s) selecionado(s)
              </p>
              {selectedDiagnoses.map((d) => (
                <div key={d.nanda.code} className="text-xs ml-2">
                  - {d.nanda.code}: {d.nanda.title} |{' '}
                  {d.outcomes.filter((o) => o.nocTitle).length} resultado(s) |{' '}
                  {d.interventions.filter((i) => i.nicTitle).length} intervencao(oes)
                </div>
              ))}
            </div>

            <div>
              <Label>Evolucao de Enfermagem</Label>
              <Textarea
                value={evolutionNotes}
                onChange={(e) => setEvolutionNotes(e.target.value)}
                placeholder="Descreva a evolucao do paciente, respostas aos cuidados, intercorrencias..."
                className="min-h-[150px] bg-card border-border"
              />
            </div>

            <div>
              <Label>Numero COREN</Label>
              <Input
                value={corenNumber}
                onChange={(e) => setCorenNumber(e.target.value)}
                placeholder="Ex: COREN-SP 123456"
                className="max-w-xs bg-card border-border"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-1.5 h-4 w-4" />
          Anterior
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
            disabled={!canGoNext}
            className="bg-primary hover:bg-primary/90"
          >
            Proximo
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={createProcess.isPending}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {createProcess.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Salvar SAE
          </Button>
        )}
      </div>
    </div>
  );
}
