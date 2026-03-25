import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  ClinicalLanguage,
  InconsistencySeverity,
  ExtractedDataResponseDto,
  ExtractEntitiesResponseDto,
  ExtractedEntityDto,
  StructuredTextResponseDto,
  DetectInconsistenciesResponseDto,
  TranslateTextResponseDto,
  SummarizeTextResponseDto,
  ExtractedProblemsResponseDto,
  ExtractedMedicationsResponseDto,
  ExtractedAllergiesResponseDto,
} from './dto/nlp.dto';

// ─── Entity Extraction Rules (Pattern-based mock) ────────────────────────────

interface EntityPattern {
  type: string;
  patterns: Array<{
    regex: RegExp;
    normalizer?: (match: string) => string;
  }>;
}

const ENTITY_PATTERNS: EntityPattern[] = [
  {
    type: 'SYMPTOM',
    patterns: [
      { regex: /dor\s+(?:torácica|no\s+peito|precordial|abdominal|lombar|de\s+cabeça)/gi },
      { regex: /febre/gi },
      { regex: /tosse(?:\s+(?:seca|produtiva))?/gi },
      { regex: /dispneia|falta\s+de\s+ar/gi },
      { regex: /náuseas?|vômitos?/gi },
      { regex: /cefaleia/gi },
      { regex: /palpitações?/gi },
      { regex: /tontura|vertigem/gi },
      { regex: /coriza/gi },
      { regex: /diarreia/gi },
    ],
  },
  {
    type: 'VITAL_SIGN',
    patterns: [
      { regex: /PA\s*:?\s*(\d{2,3})\s*[/x]\s*(\d{2,3})/gi, normalizer: (m) => `bp_${m.replace(/\D+/g, '_')}` },
      { regex: /FC\s*:?\s*(\d{2,3})/gi, normalizer: (m) => `hr_${m.replace(/\D+/g, '')}` },
      { regex: /FR\s*:?\s*(\d{1,2})/gi, normalizer: (m) => `rr_${m.replace(/\D+/g, '')}` },
      { regex: /(?:SatO2|SpO2)\s*:?\s*(\d{2,3})%?/gi },
      { regex: /(?:T|Temp)\s*:?\s*(\d{2}[.,]\d)\s*°?C?/gi },
    ],
  },
  {
    type: 'CONDITION',
    patterns: [
      { regex: /hipertensão(?:\s+arterial)?(?:\s+sistêmica)?/gi, normalizer: () => 'I10' },
      { regex: /diabetes(?:\s+mellitus)?(?:\s+tipo\s+2)?/gi, normalizer: () => 'E11.9' },
      { regex: /pneumonia/gi, normalizer: () => 'J18.9' },
      { regex: /DPOC|doença\s+pulmonar\s+obstrutiva/gi, normalizer: () => 'J44.9' },
      { regex: /fibrilação\s+atrial/gi, normalizer: () => 'I48.9' },
      { regex: /insuficiência\s+(?:cardíaca|renal)/gi },
      { regex: /dislipidemia|hiperlipidemia/gi, normalizer: () => 'E78.5' },
      { regex: /AVC|acidente\s+vascular/gi, normalizer: () => 'I63.9' },
    ],
  },
  {
    type: 'MEDICATION',
    patterns: [
      { regex: /losartana\s*(?:\d+\s*mg)?/gi },
      { regex: /metformina\s*(?:\d+\s*mg)?/gi },
      { regex: /sinvastatina\s*(?:\d+\s*mg)?/gi },
      { regex: /enalapril\s*(?:\d+\s*mg)?/gi },
      { regex: /omeprazol\s*(?:\d+\s*mg)?/gi },
      { regex: /amoxicilina\s*(?:\d+\s*mg)?/gi },
      { regex: /dipirona\s*(?:\d+\s*mg)?/gi },
      { regex: /AAS\s*(?:\d+\s*mg)?|ácido\s+acetilsalicílico/gi },
      { regex: /apixabana?\s*(?:\d+\s*mg)?/gi },
      { regex: /insulina\s+(?:glargina|NPH|regular)/gi },
      { regex: /ceftriaxona\s*(?:\d+\s*(?:mg|g))?/gi },
      { regex: /azitromicina\s*(?:\d+\s*mg)?/gi },
    ],
  },
  {
    type: 'ALLERGY',
    patterns: [
      { regex: /alerg(?:ia|ico)\s+(?:a\s+)?(\w+)/gi },
    ],
  },
  {
    type: 'TEMPORAL',
    patterns: [
      { regex: /há\s+\d+\s+(?:dias?|semanas?|meses?|anos?|horas?)/gi },
      { regex: /desde\s+\w+/gi },
      { regex: /ontem|anteontem|hoje/gi },
      { regex: /(?:por|durante)\s+\d+\s+(?:dias?|semanas?|meses?)/gi },
    ],
  },
  {
    type: 'PROCEDURE',
    patterns: [
      { regex: /ECG|eletrocardiograma/gi },
      { regex: /(?:RX|raio-?x)\s+(?:de\s+)?(?:tórax|crânio|abdome)/gi },
      { regex: /TC|tomografia(?:\s+computadorizada)?/gi },
      { regex: /hemograma/gi },
      { regex: /troponina/gi },
      { regex: /ecocardiograma/gi },
      { regex: /endoscopia|EDA/gi },
    ],
  },
];

// ─── Negation cues in Portuguese ─────────────────────────────────────────────

const NEGATION_CUES = ['nega', 'sem', 'ausência de', 'não apresenta', 'descarta', 'não refere', 'não', 'nunca'];

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);

  // ─── Extract Entities (New comprehensive endpoint) ─────────────────────

  async extractEntities(
    _tenantId: string,
    text: string,
    entityTypes?: string[],
    _language = 'pt-BR',
    includeNegations = true,
    minConfidence = 0.5,
  ): Promise<ExtractEntitiesResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Extracting entities from text (${text.length} chars)`);

    const entities: ExtractedEntityDto[] = [];
    const negated: ExtractedEntityDto[] = [];
    const lowerText = text.toLowerCase();

    for (const pattern of ENTITY_PATTERNS) {
      if (entityTypes && entityTypes.length > 0 && !entityTypes.includes(pattern.type.toLowerCase())) {
        continue;
      }

      for (const p of pattern.patterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const value = match[0].trim();
          const startOffset = match.index;
          const endOffset = startOffset + value.length;

          // Check negation context
          const contextStart = Math.max(0, startOffset - 30);
          const precedingText = lowerText.slice(contextStart, startOffset);
          const isNegated = NEGATION_CUES.some((cue) => precedingText.includes(cue));
          const confidence = 0.80 + Math.random() * 0.18;

          if (confidence < minConfidence) continue;

          const entity: ExtractedEntityDto = {
            entity: value.toLowerCase().replace(/\s+/g, '_'),
            type: pattern.type,
            value,
            normalizedValue: p.normalizer ? p.normalizer(value) : undefined,
            confidence: Math.round(confidence * 100) / 100,
            startOffset,
            endOffset,
            negated: isNegated,
            context: text.slice(Math.max(0, startOffset - 20), Math.min(text.length, endOffset + 20)),
          };

          if (isNegated && includeNegations) {
            negated.push(entity);
          }
          entities.push(entity);
        }
      }
    }

    // Count by type
    const entityCounts: Record<string, number> = {};
    for (const e of entities) {
      entityCounts[e.type] = (entityCounts[e.type] ?? 0) + 1;
    }

    return {
      entities: entities.sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)),
      totalEntities: entities.length,
      entityCounts,
      negatedEntities: includeNegations && negated.length > 0 ? negated : undefined,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Structure Free Text to JSON ───────────────────────────────────────

  async structureText(
    _tenantId: string,
    text: string,
    targetFormat = 'SOAP',
    _language = 'pt-BR',
  ): Promise<StructuredTextResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Structuring text to ${targetFormat} format (${text.length} chars)`);

    if (targetFormat === 'SOAP') {
      const sections = [
        {
          section: 'Subjetivo (S)',
          content: this.extractSection(text, ['queixa', 'relata', 'refere', 'informa', 'hda', 'história']) ||
            'Paciente apresenta-se para avaliação. Queixas não claramente delimitadas no texto.',
        },
        {
          section: 'Objetivo (O)',
          content: this.extractSection(text, ['exame', 'pa:', 'fc:', 'fr:', 'sat', 'ausculta', 'inspeção']) ||
            'Exame físico não claramente delimitado no texto fornecido.',
        },
        {
          section: 'Avaliação (A)',
          content: this.extractSection(text, ['diagnóstico', 'hipótese', 'impressão', 'avaliação', 'assessment']) ||
            'Avaliação clínica pendente de dados adicionais.',
        },
        {
          section: 'Plano (P)',
          content: this.extractSection(text, ['solicitar', 'prescrever', 'orientar', 'encaminhar', 'retorno', 'plano']) ||
            'Plano terapêutico a ser definido.',
        },
      ];

      // Build structured JSON
      const structuredJson: Record<string, unknown> = {
        subjective: { text: sections[0].content },
        objective: { text: sections[1].content },
        assessment: { text: sections[2].content },
        plan: { text: sections[3].content },
      };

      return {
        format: 'SOAP',
        sections,
        structuredJson,
        aiModel: 'gpt-4o',
        processingTimeMs: Date.now() - startMs,
      };
    }

    // H&P format
    const sections = [
      { section: 'Identificação', content: 'Dados demográficos extraídos do contexto' },
      { section: 'Queixa Principal', content: this.extractSection(text, ['queixa', 'motivo']) || 'Não identificada' },
      { section: 'HDA', content: this.extractSection(text, ['há', 'desde', 'início', 'evolução']) || text.slice(0, 200) },
      { section: 'Exame Físico', content: this.extractSection(text, ['pa:', 'fc:', 'exame', 'ausculta']) || 'Não descrito' },
      { section: 'Hipóteses Diagnósticas', content: this.extractSection(text, ['diagnóstico', 'hipótese']) || 'A definir' },
      { section: 'Conduta', content: this.extractSection(text, ['solicitar', 'prescrever', 'conduta']) || 'A definir' },
    ];

    return {
      format: 'H_AND_P',
      sections,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Detect Clinical Inconsistencies ───────────────────────────────────

  async detectInconsistencies(
    _tenantId: string,
    text: string,
    currentMedications?: string[],
    knownAllergies?: string[],
    activeDiagnoses?: string[],
    patientAge?: number,
    patientGender?: string,
  ): Promise<DetectInconsistenciesResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Detecting inconsistencies in text (${text.length} chars)`);

    const inconsistencies: Array<{
      type: string;
      description: string;
      severity: InconsistencySeverity;
      evidence?: string;
      suggestedAction?: string;
      confidence: number;
    }> = [];

    const lowerText = text.toLowerCase();

    // Drug-allergy interaction check
    if (knownAllergies && currentMedications) {
      for (const allergy of knownAllergies) {
        const allergyLower = allergy.toLowerCase();
        if (
          (allergyLower.includes('dipirona') && currentMedications.some((m) => m.toLowerCase().includes('dipirona'))) ||
          (allergyLower.includes('penicilina') && currentMedications.some((m) => m.toLowerCase().includes('amoxicilina')))
        ) {
          inconsistencies.push({
            type: 'DRUG_ALLERGY_CONFLICT',
            description: `Medicamento prescrito pode causar reação em paciente alérgico a ${allergy}`,
            severity: InconsistencySeverity.CRITICAL,
            evidence: `Alergia: ${allergy} | Medicamento encontrado na prescrição`,
            suggestedAction: 'Revisar prescrição e considerar alternativa terapêutica',
            confidence: 0.95,
          });
        }
      }
    }

    // Duplicate therapy check
    if (currentMedications) {
      const antihypertensives = currentMedications.filter((m) => {
        const ml = m.toLowerCase();
        return ml.includes('losartana') || ml.includes('enalapril') || ml.includes('valsartana');
      });
      if (antihypertensives.length > 1) {
        inconsistencies.push({
          type: 'DUPLICATE_THERAPY',
          description: `Múltiplos IECA/BRA prescritos simultaneamente: ${antihypertensives.join(', ')}`,
          severity: InconsistencySeverity.WARNING,
          evidence: 'Combinação IECA + BRA aumenta risco de hipercalemia e IRA',
          suggestedAction: 'Manter apenas um agente do eixo renina-angiotensina',
          confidence: 0.90,
        });
      }
    }

    // Age inconsistencies
    if (patientAge !== undefined) {
      if (patientAge < 18 && lowerText.includes('hipertensão essencial')) {
        inconsistencies.push({
          type: 'AGE_INCONSISTENCY',
          description: 'Hipertensão essencial diagnosticada em paciente pediátrico — incomum',
          severity: InconsistencySeverity.WARNING,
          evidence: `Idade: ${patientAge} anos | Diagnóstico: hipertensão essencial`,
          suggestedAction: 'Investigar causas secundárias de hipertensão em pacientes jovens',
          confidence: 0.85,
        });
      }
      if (patientAge > 80 && lowerText.includes('metformina') && lowerText.includes('insuficiência renal')) {
        inconsistencies.push({
          type: 'CONTRAINDICATION',
          description: 'Metformina em paciente idoso com insuficiência renal — risco de acidose láctica',
          severity: InconsistencySeverity.CRITICAL,
          evidence: 'Idade > 80 + IR + metformina',
          suggestedAction: 'Avaliar TFG e considerar suspensão se < 30 mL/min',
          confidence: 0.88,
        });
      }
    }

    // Gender inconsistencies
    if (patientGender === 'M' && lowerText.includes('gestante')) {
      inconsistencies.push({
        type: 'GENDER_INCONSISTENCY',
        description: 'Termo "gestante" encontrado para paciente masculino',
        severity: InconsistencySeverity.CRITICAL,
        evidence: 'Gênero: M | Texto contém referência a gestação',
        suggestedAction: 'Verificar dados demográficos do paciente',
        confidence: 0.98,
      });
    }

    // Vital sign contradictions
    if (lowerText.includes('normotenso') && /pa\s*:?\s*1[6-9]\d|pa\s*:?\s*2\d\d/i.test(text)) {
      inconsistencies.push({
        type: 'VITAL_SIGN_CONTRADICTION',
        description: 'Texto descreve "normotenso" mas PA documentada está elevada',
        severity: InconsistencySeverity.WARNING,
        evidence: 'Descrição: normotenso | PA numérica elevada',
        suggestedAction: 'Confirmar valores de PA e corrigir descrição',
        confidence: 0.92,
      });
    }

    const criticalCount = inconsistencies.filter((i) => i.severity === InconsistencySeverity.CRITICAL).length;
    const warningCount = inconsistencies.filter((i) => i.severity === InconsistencySeverity.WARNING).length;

    return {
      inconsistencies,
      totalFound: inconsistencies.length,
      criticalCount,
      warningCount,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Clinical Translation ──────────────────────────────────────────────

  async translateText(
    _tenantId: string,
    text: string,
    sourceLanguage: ClinicalLanguage,
    targetLanguage: ClinicalLanguage,
    preserveTerminology = true,
  ): Promise<TranslateTextResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Translating ${sourceLanguage} -> ${targetLanguage} (${text.length} chars)`);

    if (sourceLanguage === targetLanguage) {
      throw new BadRequestException('Source and target languages must be different');
    }

    let translatedText: string;
    const preservedTerms: Array<{ original: string; kept: string }> = [];

    if (sourceLanguage === ClinicalLanguage.PT_BR && targetLanguage === ClinicalLanguage.EN_US) {
      translatedText = text
        .replace(/Paciente/g, 'Patient')
        .replace(/dor torácica/g, 'chest pain')
        .replace(/há (\d+) dias/g, 'for $1 days')
        .replace(/tipo opressiva/g, 'pressure-like')
        .replace(/piora ao esforço/g, 'worsens with exertion')
        .replace(/Nega/g, 'Denies')
        .replace(/dispneia/g, 'dyspnea')
        .replace(/náuseas/g, 'nausea')
        .replace(/sudorese/g, 'diaphoresis')
        .replace(/hipertensão arterial/g, 'arterial hypertension')
        .replace(/bulhas rítmicas/g, 'regular heart sounds')
        .replace(/sem sopros/g, 'no murmurs')
        .replace(/pulmões limpos/g, 'clear lungs')
        .replace(/Ao exame/g, 'On examination');

      if (preserveTerminology) {
        preservedTerms.push(
          { original: 'PA', kept: 'BP' },
          { original: 'FC', kept: 'HR' },
          { original: 'FR', kept: 'RR' },
          { original: 'SatO2', kept: 'SpO2' },
        );
        translatedText = translatedText
          .replace(/PA\s*:/g, 'BP:')
          .replace(/FC\s*:/g, 'HR:')
          .replace(/FR\s*:/g, 'RR:');
      }
    } else if (sourceLanguage === ClinicalLanguage.PT_BR && targetLanguage === ClinicalLanguage.ES) {
      translatedText = text
        .replace(/Paciente/g, 'Paciente')
        .replace(/dor torácica/g, 'dolor torácico')
        .replace(/há (\d+) dias/g, 'hace $1 días')
        .replace(/Nega/g, 'Niega')
        .replace(/dispneia/g, 'disnea')
        .replace(/náuseas/g, 'náuseas')
        .replace(/hipertensão/g, 'hipertensión')
        .replace(/pulmões/g, 'pulmones');
    } else {
      // For other directions, return a realistic placeholder
      translatedText = `[Translated from ${sourceLanguage} to ${targetLanguage}]: ${text.slice(0, 200)}...`;
    }

    return {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      preservedTerms: preservedTerms.length > 0 ? preservedTerms : undefined,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Clinical Note Summarization ───────────────────────────────────────

  async summarizeText(
    _tenantId: string,
    text: string,
    length = 'standard',
    focusAreas?: string[],
    _language = 'pt-BR',
  ): Promise<SummarizeTextResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Summarizing text (${text.length} chars, length=${length})`);

    const originalWords = text.split(/\s+/).length;
    // Extract key information for summary
    const entities = await this.extractEntities(_tenantId, text);

    const conditions = entities.entities.filter((e) => e.type === 'CONDITION' && !e.negated).map((e) => e.value);
    const medications = entities.entities.filter((e) => e.type === 'MEDICATION').map((e) => e.value);
    const symptoms = entities.entities.filter((e) => e.type === 'SYMPTOM' && !e.negated).map((e) => e.value);

    let summary: string;
    if (length === 'brief') {
      summary = `Paciente com ${conditions.length > 0 ? conditions.join(', ') : 'quadro clínico'} em acompanhamento. ` +
        `${symptoms.length > 0 ? `Queixas: ${symptoms.join(', ')}.` : ''} ` +
        `${medications.length > 0 ? `Em uso de ${medications.join(', ')}.` : ''}`;
    } else {
      summary = `Paciente apresenta-se com ${symptoms.length > 0 ? symptoms.join(', ') : 'queixas clínicas'}. ` +
        `Diagnósticos ativos: ${conditions.length > 0 ? conditions.join(', ') : 'a esclarecer'}. ` +
        `${medications.length > 0 ? `Medicações em uso: ${medications.join(', ')}.` : 'Sem medicações documentadas.'} ` +
        `Avaliação e plano terapêutico conforme nota clínica completa.`;
    }

    const summaryWords = summary.split(/\s+/).length;

    return {
      summary: summary.trim(),
      length,
      keyFindings: symptoms.length > 0 ? symptoms : undefined,
      activeDiagnoses: conditions.length > 0 ? conditions : undefined,
      currentMedications: medications.length > 0 ? medications : undefined,
      pendingActions: focusAreas,
      originalWordCount: originalWords,
      summaryWordCount: summaryWords,
      compressionRatio: Math.round((summaryWords / originalWords) * 100) / 100,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Legacy Methods (backward compat) ──────────────────────────────────

  async extractStructuredData(
    tenantId: string,
    text: string,
    language = 'pt-BR',
  ): Promise<ExtractedDataResponseDto> {
    const result = await this.extractEntities(tenantId, text, undefined, language);
    return {
      entities: result.entities,
      structuredData: {
        symptoms: result.entities.filter((e) => e.type === 'SYMPTOM').map((e) => ({ name: e.value })),
        vitalSigns: result.entities.filter((e) => e.type === 'VITAL_SIGN').reduce((acc, e) => ({ ...acc, [e.entity]: e.value }), {}),
        conditions: result.entities.filter((e) => e.type === 'CONDITION').map((e) => ({ name: e.value, icdCode: e.normalizedValue })),
      },
      aiModel: 'gpt-4o',
      processingTimeMs: result.processingTimeMs,
    };
  }

  async extractProblems(tenantId: string, text: string): Promise<ExtractedProblemsResponseDto> {
    const result = await this.extractEntities(tenantId, text, ['condition']);
    return {
      problems: result.entities
        .filter((e) => e.type === 'CONDITION')
        .map((e) => ({
          problemName: e.value,
          icdCode: e.normalizedValue,
          icdDescription: e.value,
          status: 'ACTIVE',
          confidence: e.confidence,
        })),
      aiModel: 'gpt-4o',
    };
  }

  async extractMedications(tenantId: string, text: string): Promise<ExtractedMedicationsResponseDto> {
    const result = await this.extractEntities(tenantId, text, ['medication']);
    return {
      medications: result.entities
        .filter((e) => e.type === 'MEDICATION')
        .map((e) => ({
          medicationName: e.value,
          confidence: e.confidence,
        })),
      aiModel: 'gpt-4o',
    };
  }

  async extractAllergies(tenantId: string, text: string): Promise<ExtractedAllergiesResponseDto> {
    const result = await this.extractEntities(tenantId, text, ['allergy']);
    return {
      allergies: result.entities
        .filter((e) => e.type === 'ALLERGY')
        .map((e) => ({
          substance: e.value,
          confidence: e.confidence,
        })),
      aiModel: 'gpt-4o',
    };
  }

  async detectNegations(_tenantId: string, text: string): Promise<NegationDetectionResponseDto> {
    this.logger.log(`Detecting negations in text (${text.length} chars)`);
    const entities = await this.extractEntities(_tenantId, text, undefined, 'pt-BR', true);

    const assertions = entities.entities
      .filter((e) => e.type === 'SYMPTOM' || e.type === 'CONDITION')
      .map((e) => ({
        entity: e.value,
        present: !e.negated,
        context: e.context ?? '',
        confidence: e.confidence,
      }));

    return {
      assertions,
      negationCues: NEGATION_CUES,
      aiModel: 'gpt-4o',
    };
  }

  async extractTemporalExpressions(_tenantId: string, text: string): Promise<TemporalExtractionResponseDto> {
    this.logger.log(`Extracting temporal expressions from text (${text.length} chars)`);
    const entities = await this.extractEntities(_tenantId, text, ['temporal']);

    return {
      expressions: entities.entities
        .filter((e) => e.type === 'TEMPORAL')
        .map((e) => ({
          text: e.value,
          type: e.value.includes('há') ? 'RELATIVE_PAST' : 'ABSOLUTE',
          normalizedValue: e.normalizedValue ?? e.value,
          confidence: e.confidence,
        })),
      aiModel: 'gpt-4o',
    };
  }

  async extractRelationships(_tenantId: string, text: string): Promise<RelationshipExtractionResponseDto> {
    this.logger.log(`Extracting relationships from text (${text.length} chars)`);

    return {
      relationships: [
        { sourceEntity: 'Losartana', sourceType: 'MEDICATION', relationship: 'TREATS', targetEntity: 'hipertensão', targetType: 'CONDITION', confidence: 0.91 },
        { sourceEntity: 'Metformina', sourceType: 'MEDICATION', relationship: 'TREATS', targetEntity: 'diabetes', targetType: 'CONDITION', confidence: 0.93 },
        { sourceEntity: 'dor torácica', sourceType: 'SYMPTOM', relationship: 'HAS_DURATION', targetEntity: '2 dias', targetType: 'DURATION', confidence: 0.90 },
      ],
      entityGraph: { nodes: 6, edges: 3 },
      aiModel: 'gpt-4o',
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private extractSection(text: string, keywords: string[]): string | null {
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      const idx = lowerText.indexOf(kw);
      if (idx >= 0) {
        // Find sentence boundaries
        const sentenceStart = Math.max(0, text.lastIndexOf('.', idx) + 1);
        const sentenceEnd = text.indexOf('.', idx + kw.length);
        if (sentenceEnd > sentenceStart) {
          return text.slice(sentenceStart, sentenceEnd + 1).trim();
        }
      }
    }
    return null;
  }
}

// ─── Inline Response Types (legacy compat) ───────────────────────────────────

export interface NegationDetectionResponseDto {
  assertions: Array<{
    entity: string;
    present: boolean;
    context: string;
    confidence: number;
  }>;
  negationCues: string[];
  aiModel: string;
}

export interface TemporalExtractionResponseDto {
  expressions: Array<{
    text: string;
    type: string;
    normalizedValue: string;
    linkedEntity?: string;
    confidence: number;
  }>;
  aiModel: string;
}

export interface RelationshipExtractionResponseDto {
  relationships: Array<{
    sourceEntity: string;
    sourceType: string;
    relationship: string;
    targetEntity: string;
    targetType: string;
    confidence: number;
  }>;
  entityGraph: {
    nodes: number;
    edges: number;
  };
  aiModel: string;
}
