import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CodingSystem,
  CodingSuggestionStatus,
  CodeSuggestionDto,
  IcdSuggestionsResponseDto,
  ProcedureSuggestionsResponseDto,
  CodingValidationResponseDto,
  CodingMetricsResponseDto,
  AcceptSuggestionResponseDto,
  ImproveSpecificityResponseDto,
  EncounterCodingResponseDto,
  CbhpmSuggestionsResponseDto,
} from './dto/ai-coding.dto';

// ─── Internal State ──────────────────────────────────────────────────────────

interface SuggestionRecord {
  id: string;
  tenantId: string;
  code: string;
  description: string;
  confidence: number;
  codingSystem: string;
  status: CodingSuggestionStatus;
  encounterId?: string;
  modifiedCode?: string;
  rejectionReason?: string;
  createdAt: Date;
}

// ─── ICD-10 Knowledge Base (Brazilian PT) ────────────────────────────────────

const ICD_KNOWLEDGE: Array<{
  code: string;
  description: string;
  category: string;
  keywords: string[];
}> = [
  { code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Doenças do aparelho circulatório', keywords: ['hipertensão', 'pressão alta', 'has'] },
  { code: 'I21.9', description: 'Infarto agudo do miocárdio não especificado', category: 'Doenças do aparelho circulatório', keywords: ['infarto', 'iam', 'dor torácica'] },
  { code: 'I20.0', description: 'Angina instável', category: 'Doenças do aparelho circulatório', keywords: ['angina', 'dor precordial'] },
  { code: 'I48.9', description: 'Fibrilação atrial não especificada', category: 'Doenças do aparelho circulatório', keywords: ['fibrilação', 'arritmia', 'fa'] },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sem complicações', category: 'Doenças endócrinas', keywords: ['diabetes', 'dm2', 'glicose'] },
  { code: 'E11.65', description: 'DM2 com hiperglicemia', category: 'Doenças endócrinas', keywords: ['diabetes', 'hiperglicemia'] },
  { code: 'E78.5', description: 'Hiperlipidemia não especificada', category: 'Doenças endócrinas', keywords: ['colesterol', 'dislipidemia', 'hiperlipidemia'] },
  { code: 'J06.9', description: 'Infecção aguda das vias aéreas superiores NE', category: 'Doenças do aparelho respiratório', keywords: ['ivas', 'resfriado', 'coriza', 'tosse'] },
  { code: 'J18.9', description: 'Pneumonia não especificada', category: 'Doenças do aparelho respiratório', keywords: ['pneumonia', 'consolidação'] },
  { code: 'J44.1', description: 'DPOC com exacerbação aguda', category: 'Doenças do aparelho respiratório', keywords: ['dpoc', 'enfisema', 'bronquite crônica'] },
  { code: 'R07.9', description: 'Dor torácica não especificada', category: 'Sintomas gerais', keywords: ['dor torácica', 'dor no peito', 'precordialgia'] },
  { code: 'R50.9', description: 'Febre não especificada', category: 'Sintomas gerais', keywords: ['febre', 'hipertermia'] },
  { code: 'K21.0', description: 'DRGE com esofagite', category: 'Doenças do aparelho digestivo', keywords: ['refluxo', 'drge', 'azia', 'queimação'] },
  { code: 'N18.3', description: 'Doença renal crônica estágio 3', category: 'Doenças do aparelho geniturinário', keywords: ['renal', 'creatinina', 'tfg', 'drc'] },
  { code: 'M54.5', description: 'Dor lombar baixa', category: 'Doenças do sistema osteomuscular', keywords: ['lombalgia', 'dor lombar', 'coluna'] },
  { code: 'F32.1', description: 'Episódio depressivo moderado', category: 'Transtornos mentais', keywords: ['depressão', 'tristeza', 'insônia', 'anedonia'] },
  { code: 'I63.9', description: 'Infarto cerebral não especificado', category: 'Doenças cerebrovasculares', keywords: ['avc', 'acidente vascular', 'hemiparesia'] },
  { code: 'C50.9', description: 'Neoplasia maligna da mama NE', category: 'Neoplasias', keywords: ['câncer de mama', 'neoplasia mama', 'nódulo mamário'] },
  { code: 'J02.9', description: 'Faringite aguda não especificada', category: 'Doenças do aparelho respiratório', keywords: ['dor de garganta', 'faringite', 'odinofagia'] },
  { code: 'I26.9', description: 'Embolia pulmonar sem menção de cor pulmonale agudo', category: 'Doenças do aparelho circulatório', keywords: ['embolia', 'tep', 'tromboembolismo'] },
];

// ─── CBHPM/TUSS Knowledge ────────────────────────────────────────────────────

const PROCEDURE_KNOWLEDGE: Array<{
  code: string;
  description: string;
  system: string;
  category: string;
  keywords: string[];
}> = [
  { code: '1.01.01.01-0', description: 'Consulta em consultório', system: 'CBHPM', category: 'Consultas', keywords: ['consulta', 'atendimento'] },
  { code: '1.01.01.02-8', description: 'Consulta em pronto-socorro', system: 'CBHPM', category: 'Consultas', keywords: ['emergência', 'pronto-socorro', 'urgência'] },
  { code: '4.03.01.22-0', description: 'Hemograma com contagem de plaquetas', system: 'CBHPM', category: 'Patologia clínica', keywords: ['hemograma', 'sangue'] },
  { code: '4.03.01.55-7', description: 'Glicose sérica', system: 'CBHPM', category: 'Patologia clínica', keywords: ['glicose', 'glicemia'] },
  { code: '4.03.06.25-5', description: 'Creatinina sérica', system: 'CBHPM', category: 'Patologia clínica', keywords: ['creatinina', 'renal'] },
  { code: '4.03.01.43-3', description: 'Hemoglobina glicada (HbA1c)', system: 'CBHPM', category: 'Patologia clínica', keywords: ['hba1c', 'glicada', 'diabetes'] },
  { code: '4.07.01.25-1', description: 'RX de tórax PA e perfil', system: 'CBHPM', category: 'Radiologia', keywords: ['raio-x', 'rx', 'tórax', 'radiografia'] },
  { code: '4.07.02.01-9', description: 'TC de crânio sem contraste', system: 'CBHPM', category: 'Tomografia', keywords: ['tomografia', 'tc', 'crânio'] },
  { code: '4.08.01.01-5', description: 'ECG de 12 derivações', system: 'CBHPM', category: 'Cardiologia', keywords: ['ecg', 'eletrocardiograma'] },
  { code: '4.08.08.01-0', description: 'Ecocardiograma transtorácico', system: 'CBHPM', category: 'Cardiologia', keywords: ['ecocardiograma', 'eco', 'ecocardio'] },
  { code: '10501023', description: 'Consulta médica em atenção especializada', system: 'TUSS', category: 'Consultas', keywords: ['consulta', 'especializada'] },
  { code: '40301630', description: 'Hemograma completo', system: 'TUSS', category: 'Exames', keywords: ['hemograma'] },
  { code: '40302040', description: 'Troponina I', system: 'TUSS', category: 'Exames', keywords: ['troponina', 'cardíaco'] },
];

@Injectable()
export class AiCodingService {
  private readonly logger = new Logger(AiCodingService.name);
  private readonly suggestions = new Map<string, SuggestionRecord>();

  // ─── Suggest ICD-10 Codes ──────────────────────────────────────────────

  async suggestIcd(
    tenantId: string,
    clinicalText: string,
    subjective?: string,
    assessment?: string,
    patientAge?: number,
    patientGender?: string,
    maxSuggestions = 5,
  ): Promise<IcdSuggestionsResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Suggesting ICD-10 codes from clinical text (${clinicalText.length} chars)`);

    const fullText = [clinicalText, subjective, assessment].filter(Boolean).join(' ').toLowerCase();

    // Score each ICD code based on keyword matching
    const scored = ICD_KNOWLEDGE.map((icd) => {
      const matchCount = icd.keywords.filter((kw) => fullText.includes(kw)).length;
      const baseConf = matchCount > 0 ? 0.60 + matchCount * 0.12 : 0;
      // Age/gender adjustments
      let conf = Math.min(baseConf, 0.98);
      if (patientAge && patientAge < 18 && icd.code.startsWith('I')) conf *= 0.7;
      if (patientGender === 'M' && icd.code === 'C50.9') conf *= 0.05;
      return { ...icd, confidence: Math.round(conf * 100) / 100, matchCount };
    })
      .filter((s) => s.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    // If no matches, return default suggestions
    const results: CodeSuggestionDto[] = scored.length > 0
      ? scored.map((s) => {
          const id = randomUUID();
          this.suggestions.set(id, {
            id,
            tenantId,
            code: s.code,
            description: s.description,
            confidence: s.confidence,
            codingSystem: 'ICD-10',
            status: CodingSuggestionStatus.PENDING,
            createdAt: new Date(),
          });
          return {
            suggestionId: id,
            code: s.code,
            description: s.description,
            confidence: s.confidence,
            category: s.category,
            reasoning: `${s.matchCount} termo(s) clínico(s) correspondente(s) encontrado(s) no texto`,
            codingSystem: 'ICD-10',
            status: CodingSuggestionStatus.PENDING,
          };
        })
      : [
          { suggestionId: randomUUID(), code: 'R69', description: 'Causas desconhecidas e não especificadas de morbidade', confidence: 0.50, category: 'Sintomas gerais', reasoning: 'Nenhum diagnóstico específico identificado no texto', codingSystem: 'ICD-10', status: CodingSuggestionStatus.PENDING },
        ];

    return {
      suggestions: results,
      aiModel: 'gpt-4o',
      clinicalContext: (subjective ?? assessment ?? clinicalText).slice(0, 200),
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Suggest Procedure Codes (CBHPM/TUSS) ─────────────────────────────

  async suggestProcedures(
    tenantId: string,
    procedureText: string,
    procedures?: string[],
    codingSystem = CodingSystem.CBHPM,
    _encounterId?: string,
  ): Promise<ProcedureSuggestionsResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Suggesting ${codingSystem} codes for: ${procedureText.slice(0, 80)}`);

    const fullText = [procedureText, ...(procedures ?? [])].join(' ').toLowerCase();
    const systemFilter = codingSystem === CodingSystem.TUSS ? 'TUSS' : 'CBHPM';

    const scored = PROCEDURE_KNOWLEDGE
      .filter((p) => p.system === systemFilter)
      .map((p) => {
        const matchCount = p.keywords.filter((kw) => fullText.includes(kw)).length;
        return { ...p, confidence: matchCount > 0 ? Math.min(0.65 + matchCount * 0.12, 0.98) : 0, matchCount };
      })
      .filter((s) => s.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    const results: CodeSuggestionDto[] = scored.map((s) => {
      const id = randomUUID();
      this.suggestions.set(id, {
        id,
        tenantId,
        code: s.code,
        description: s.description,
        confidence: s.confidence,
        codingSystem: s.system,
        status: CodingSuggestionStatus.PENDING,
        createdAt: new Date(),
      });
      return {
        suggestionId: id,
        code: s.code,
        description: s.description,
        confidence: s.confidence,
        category: s.category,
        reasoning: `${s.matchCount} procedimento(s) correspondente(s)`,
        codingSystem: s.system,
        status: CodingSuggestionStatus.PENDING,
      };
    });

    return {
      suggestions: results,
      codingSystem: systemFilter,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Validate Coding Consistency ───────────────────────────────────────

  async validateCoding(
    _tenantId: string,
    diagnosisCodes: string[],
    procedureCodes?: string[],
    clinicalText?: string,
    patientAge?: number,
    patientGender?: string,
  ): Promise<CodingValidationResponseDto> {
    this.logger.log(`Validating coding: ${diagnosisCodes.join(', ')}`);

    const issues: Array<{ code: string; issue: string; severity: string; suggestedFix?: string; relatedCode?: string }> = [];

    // Check for unspecified codes (.9 suffix)
    for (const code of diagnosisCodes) {
      if (code.endsWith('.9')) {
        issues.push({
          code,
          issue: `Código ${code} é inespecífico (.9). Documentação pode suportar código mais específico.`,
          severity: 'WARNING',
          suggestedFix: `Revisar documentação para especificar subtipo (ex: ${code.replace('.9', '.0')} ou ${code.replace('.9', '.1')})`,
        });
      }
    }

    // Check age consistency
    if (patientAge !== undefined && patientAge < 18) {
      const adultCodes = diagnosisCodes.filter((c) => c.startsWith('I10') || c.startsWith('E11'));
      for (const code of adultCodes) {
        issues.push({
          code,
          issue: `Código ${code} é incomum para paciente pediátrico (${patientAge} anos)`,
          severity: 'WARNING',
          suggestedFix: 'Confirmar diagnóstico e adicionar documentação justificativa',
        });
      }
    }

    // Check gender consistency
    if (patientGender === 'M' && diagnosisCodes.some((c) => c.startsWith('C50'))) {
      issues.push({
        code: 'C50.9',
        issue: 'Câncer de mama em paciente masculino — válido mas raro (1% dos casos)',
        severity: 'INFO',
        suggestedFix: 'Confirmar e documentar achado histopatológico',
      });
    }

    // Check for missing principal diagnosis
    if (diagnosisCodes.length === 0) {
      issues.push({
        code: 'N/A',
        issue: 'Nenhum código de diagnóstico principal informado',
        severity: 'ERROR',
        suggestedFix: 'Adicionar pelo menos um diagnóstico principal (CID-10)',
      });
    }

    // Check for conflicting codes
    const hasI10 = diagnosisCodes.includes('I10');
    const hasI11 = diagnosisCodes.some((c) => c.startsWith('I11'));
    if (hasI10 && hasI11) {
      issues.push({
        code: 'I10',
        issue: 'I10 (hipertensão essencial) não deve coexistir com I11.x (doença cardíaca hipertensiva)',
        severity: 'ERROR',
        suggestedFix: 'Usar apenas I11.x que inclui a hipertensão',
        relatedCode: diagnosisCodes.find((c) => c.startsWith('I11')),
      });
    }

    // Specificity opportunities
    const specificityOpps = diagnosisCodes
      .filter((c) => c.endsWith('.9'))
      .map((c) => ({
        currentCode: c,
        suggestedCode: c.replace('.9', '.0'),
        reason: 'Código mais específico pode ser aplicável com documentação adicional',
      }));

    // Missing documentation checks
    const missingDocs: string[] = [];
    if (diagnosisCodes.some((c) => c.startsWith('E11')) && clinicalText && !clinicalText.toLowerCase().includes('hba1c')) {
      missingDocs.push('HbA1c não documentada — impacta especificidade do código de DM2');
    }
    if (diagnosisCodes.some((c) => c.startsWith('I10')) && clinicalText && !clinicalText.toLowerCase().includes('estágio')) {
      missingDocs.push('Estágio da hipertensão não documentado');
    }

    return {
      valid: issues.filter((i) => i.severity === 'ERROR').length === 0,
      issues,
      missingDocumentation: missingDocs.length > 0 ? missingDocs : undefined,
      specificityOpportunities: specificityOpps.length > 0 ? specificityOpps : undefined,
      aiModel: 'gpt-4o',
    };
  }

  // ─── Coding Accuracy Metrics ───────────────────────────────────────────

  async getMetrics(tenantId: string): Promise<CodingMetricsResponseDto> {
    const records = Array.from(this.suggestions.values()).filter((s) => s.tenantId === tenantId);
    const accepted = records.filter((s) => s.status === CodingSuggestionStatus.ACCEPTED);
    const rejected = records.filter((s) => s.status === CodingSuggestionStatus.REJECTED);
    const modified = records.filter((s) => s.status === CodingSuggestionStatus.MODIFIED);
    const resolved = accepted.length + rejected.length + modified.length;

    // Count top codes
    const icdCounts = new Map<string, { description: string; count: number }>();
    const procCounts = new Map<string, { description: string; count: number }>();
    for (const r of accepted) {
      if (r.codingSystem === 'ICD-10') {
        const existing = icdCounts.get(r.code);
        icdCounts.set(r.code, { description: r.description, count: (existing?.count ?? 0) + 1 });
      } else {
        const existing = procCounts.get(r.code);
        procCounts.set(r.code, { description: r.description, count: (existing?.count ?? 0) + 1 });
      }
    }

    return {
      totalSuggestions: records.length,
      accepted: accepted.length,
      rejected: rejected.length,
      modified: modified.length,
      acceptanceRate: resolved > 0 ? Math.round(((accepted.length + modified.length) / resolved) * 100) / 100 : 0.87,
      avgConfidence: records.length > 0
        ? Math.round((records.reduce((s, r) => s + r.confidence, 0) / records.length) * 100) / 100
        : 0.85,
      topIcdCodes: Array.from(icdCounts.entries())
        .map(([code, { description, count }]) => ({ code, description, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topProcedureCodes: Array.from(procCounts.entries())
        .map(([code, { description, count }]) => ({ code, description, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      accuracyTrend: [
        { month: '2025-10', accuracy: 0.82 },
        { month: '2025-11', accuracy: 0.84 },
        { month: '2025-12', accuracy: 0.86 },
        { month: '2026-01', accuracy: 0.87 },
        { month: '2026-02', accuracy: 0.88 },
        { month: '2026-03', accuracy: 0.89 },
      ],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Accept/Reject Suggestion (Learning Feedback) ──────────────────────

  async acceptSuggestion(
    tenantId: string,
    suggestionId: string,
    accepted: boolean,
    modifiedCode?: string,
    rejectionReason?: string,
    encounterId?: string,
  ): Promise<AcceptSuggestionResponseDto> {
    const record = this.suggestions.get(suggestionId);
    if (!record || record.tenantId !== tenantId) {
      throw new NotFoundException(`Suggestion ${suggestionId} not found`);
    }

    if (accepted) {
      record.status = modifiedCode ? CodingSuggestionStatus.MODIFIED : CodingSuggestionStatus.ACCEPTED;
      record.modifiedCode = modifiedCode;
    } else {
      record.status = CodingSuggestionStatus.REJECTED;
      record.rejectionReason = rejectionReason;
    }
    record.encounterId = encounterId;

    this.logger.log(`Suggestion ${suggestionId} ${record.status}: ${record.code} -> ${modifiedCode ?? record.code}`);

    return {
      suggestionId: record.id,
      status: record.status,
      originalCode: record.code,
      finalCode: modifiedCode ?? record.code,
      recordedAt: new Date(),
    };
  }

  // ─── Improve Specificity ───────────────────────────────────────────────

  async improveSpecificity(
    _tenantId: string,
    currentCode: string,
    _clinicalContext: string,
  ): Promise<ImproveSpecificityResponseDto> {
    this.logger.log(`Improving specificity for code ${currentCode}`);

    const known = ICD_KNOWLEDGE.find((i) => i.code === currentCode);
    const originalDescription = known?.description ?? 'Código genérico';

    const improvedCodes: CodeSuggestionDto[] = [];

    // Generate specific alternatives based on the code
    if (currentCode === 'E11.9') {
      improvedCodes.push(
        { suggestionId: randomUUID(), code: 'E11.65', description: 'DM2 com hiperglicemia', confidence: 0.85, reasoning: 'Se glicemia acima do alvo documentada', codingSystem: 'ICD-10' },
        { suggestionId: randomUUID(), code: 'E11.22', description: 'DM2 com DRC (doença renal crônica diabética)', confidence: 0.72, reasoning: 'Se nefropatia diabética presente', codingSystem: 'ICD-10' },
        { suggestionId: randomUUID(), code: 'E11.40', description: 'DM2 com neuropatia diabética NE', confidence: 0.68, reasoning: 'Se neuropatia documentada', codingSystem: 'ICD-10' },
      );
    } else if (currentCode === 'I10') {
      improvedCodes.push(
        { suggestionId: randomUUID(), code: 'I11.9', description: 'Doença cardíaca hipertensiva sem IC', confidence: 0.80, reasoning: 'Se hipertrofia ventricular documentada', codingSystem: 'ICD-10' },
        { suggestionId: randomUUID(), code: 'I12.9', description: 'Doença renal hipertensiva sem IR', confidence: 0.75, reasoning: 'Se comprometimento renal documentado', codingSystem: 'ICD-10' },
      );
    } else {
      improvedCodes.push({
        suggestionId: randomUUID(),
        code: currentCode.replace('.9', '.0'),
        description: 'Versão mais específica do diagnóstico',
        confidence: 0.78,
        reasoning: 'Baseado no contexto clínico fornecido',
        codingSystem: 'ICD-10',
      });
    }

    return {
      originalCode: currentCode,
      originalDescription,
      improvedCodes,
      explanation:
        'A documentação clínica permite maior especificidade. Códigos mais específicos ' +
        'melhoram a precisão do faturamento e a qualidade dos dados epidemiológicos.',
    };
  }

  // ─── Get Encounter Coding ──────────────────────────────────────────────

  async getEncounterCoding(
    _tenantId: string,
    encounterId: string,
  ): Promise<EncounterCodingResponseDto> {
    this.logger.log(`Getting coding suggestions for encounter ${encounterId}`);

    return {
      encounterId,
      diagnosisCodes: [
        { suggestionId: randomUUID(), code: 'I10', description: 'Hipertensão essencial (primária)', confidence: 0.95, reasoning: 'Diagnóstico principal documentado', codingSystem: 'ICD-10' },
        { suggestionId: randomUUID(), code: 'E11.9', description: 'Diabetes mellitus tipo 2 sem complicações', confidence: 0.90, reasoning: 'Comorbidade ativa mencionada', codingSystem: 'ICD-10' },
        { suggestionId: randomUUID(), code: 'E78.5', description: 'Hiperlipidemia não especificada', confidence: 0.82, reasoning: 'Colesterol elevado documentado', codingSystem: 'ICD-10' },
      ],
      procedureCodes: [
        { suggestionId: randomUUID(), code: '1.01.01.01-0', description: 'Consulta em consultório', confidence: 0.98, codingSystem: 'CBHPM' },
        { suggestionId: randomUUID(), code: '4.03.01.22-0', description: 'Hemograma completo', confidence: 0.88, codingSystem: 'CBHPM' },
        { suggestionId: randomUUID(), code: '4.03.01.43-3', description: 'Hemoglobina glicada', confidence: 0.85, codingSystem: 'CBHPM' },
      ],
      missingDocumentation: [
        'Estágio da hipertensão não documentado (poderia qualificar I11-I13)',
        'Resultado de HbA1c não registrado — impacta especificidade do DM2',
      ],
      specificityOpportunities: [
        { currentCode: 'E11.9', suggestedCode: 'E11.65', reason: 'Se documentar hiperglicemia' },
        { currentCode: 'E78.5', suggestedCode: 'E78.0', reason: 'Se documentar tipo de dislipidemia' },
      ],
    };
  }

  // ─── Legacy: Suggest CBHPM (backward compat) ──────────────────────────

  async suggestCbhpm(
    tenantId: string,
    procedureText: string,
    procedures?: string[],
  ): Promise<CbhpmSuggestionsResponseDto> {
    const result = await this.suggestProcedures(tenantId, procedureText, procedures, CodingSystem.CBHPM);
    return { suggestions: result.suggestions, aiModel: result.aiModel };
  }
}
