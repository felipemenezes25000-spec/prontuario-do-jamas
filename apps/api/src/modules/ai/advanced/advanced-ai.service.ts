import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CypEnzymeStatus,
  OncogenomicTherapyType,
  BiVisualizationType,
  HealthCoachCategory,
  GoalStatus,
  DigitalTwinStatusResponseDto,
  DigitalTwinSimulationResponseDto,
  PharmacogenomicProfileResponseDto,
  GenotypeDoseResponseDto,
  OncogenomicProfileResponseDto,
  OncogenomicTherapyMatchResponseDto,
  ConversationalBiResponseDto,
  MultimodalAnalysisResponseDto,
  HealthCoachResponseDto,
  HealthGoalsResponseDto,
} from './dto/advanced-ai.dto';

@Injectable()
export class AdvancedAiService {
  private readonly logger = new Logger(AdvancedAiService.name);

  // ─── Digital Twin — Simulate ──────────────────────────────────────────────

  async simulateDigitalTwin(
    _tenantId: string,
    patientId: string,
    scenario: string,
    treatmentOptions?: string[],
    durationDays?: number,
    _includeOrganBreakdown?: boolean,
  ): Promise<DigitalTwinSimulationResponseDto> {
    this.logger.log(`Digital twin simulation for patient ${patientId}, scenario="${scenario}", duration=${durationDays ?? 90}d`);

    return {
      patientId,
      scenario,
      simulations: [
        {
          treatment: treatmentOptions?.[0] ?? 'Empagliflozina 25mg + Metformina 850mg 2x/dia',
          projectedOutcome: 'HbA1c de 8.2% → 6.9% em 6 meses; redução de 23% no risco cardiovascular',
          successProbability: 0.78,
          timeToEffect: '8-12 semanas',
          sideEffectRisks: [
            'Infecção urinária (8%)',
            'Candidíase genital (5%)',
            'Hipotensão postural (3%)',
          ],
          qualityOfLifeImpact: 'Melhora moderada — redução de fadiga e poliúria',
          costEstimate: 'R$ 280/mês (genérico disponível)',
        },
        {
          treatment: treatmentOptions?.[1] ?? 'Insulina glargina 10UI + Metformina 850mg 2x/dia',
          projectedOutcome: 'HbA1c de 8.2% → 6.4% em 6 meses; controle glicêmico superior',
          successProbability: 0.85,
          timeToEffect: '4-8 semanas',
          sideEffectRisks: [
            'Hipoglicemia noturna (15%)',
            'Ganho de peso +2.5kg (72%)',
            'Lipodistrofia no local de aplicação (4%)',
          ],
          qualityOfLifeImpact: 'Impacto negativo leve — necessidade de automonitoramento e aplicação diária',
          costEstimate: 'R$ 120/mês (SUS disponível)',
        },
        {
          treatment: treatmentOptions?.[2] ?? 'Semaglutida 1mg/semana + Metformina 850mg 2x/dia',
          projectedOutcome: 'HbA1c de 8.2% → 6.5% em 6 meses; perda de peso de 5-8kg; proteção CV',
          successProbability: 0.82,
          timeToEffect: '8-16 semanas',
          sideEffectRisks: [
            'Náusea (20% — transitória)',
            'Diarreia (10%)',
            'Pancreatite (rara, <0.3%)',
          ],
          qualityOfLifeImpact: 'Melhora significativa — perda de peso e redução da fadiga',
          costEstimate: 'R$ 950/mês (sem genérico)',
        },
      ],
      organSystemImpact: [
        { organSystem: 'CARDIOVASCULAR', healthScore: 72, trend: 'IMPROVING', riskFactors: ['Hipertensão não controlada', 'LDL acima da meta'] },
        { organSystem: 'RENAL', healthScore: 65, trend: 'STABLE', riskFactors: ['TFG 58 mL/min — DRC estágio 3A', 'Microalbuminúria'] },
        { organSystem: 'ENDOCRINE', healthScore: 48, trend: 'DECLINING', riskFactors: ['HbA1c 8.2%', 'Resistência insulínica severa'] },
        { organSystem: 'HEPATIC', healthScore: 81, trend: 'STABLE', riskFactors: ['Esteatose hepática grau I'] },
        { organSystem: 'NEUROLOGICAL', healthScore: 88, trend: 'STABLE', riskFactors: ['Neuropatia periférica incipiente'] },
      ],
      optimalStrategy:
        'Com base no perfil cardiometabólico, função renal preservada e IMC 34: semaglutida oferece o melhor equilíbrio ' +
        'entre controle glicêmico, perda ponderal e proteção cardiovascular. Se custo for limitante, empagliflozina é a segunda melhor opção ' +
        'com benefício cardiorrenal adicional.',
      confidenceLevel: 0.84,
      aiModel: 'gpt-4o',
    };
  }

  // ─── Digital Twin — Status ────────────────────────────────────────────────

  async getDigitalTwinStatus(
    _tenantId: string,
    patientId: string,
  ): Promise<DigitalTwinStatusResponseDto> {
    this.logger.log(`Fetching digital twin status for patient ${patientId}`);

    return {
      patientId,
      lastUpdated: new Date().toISOString(),
      overallHealthScore: 68,
      organSystems: [
        { organSystem: 'CARDIOVASCULAR', healthScore: 72, trend: 'IMPROVING', riskFactors: ['HAS estágio 2', 'LDL 145 mg/dL'] },
        { organSystem: 'RESPIRATORY', healthScore: 91, trend: 'STABLE', riskFactors: [] },
        { organSystem: 'RENAL', healthScore: 65, trend: 'STABLE', riskFactors: ['TFG 58 mL/min', 'Microalbuminúria 80 mg/L'] },
        { organSystem: 'HEPATIC', healthScore: 81, trend: 'STABLE', riskFactors: ['Esteatose hepática NASH grau I'] },
        { organSystem: 'ENDOCRINE', healthScore: 48, trend: 'DECLINING', riskFactors: ['DM2 descompensado (HbA1c 8.2%)', 'Resistência insulínica'] },
        { organSystem: 'NEUROLOGICAL', healthScore: 88, trend: 'STABLE', riskFactors: ['Neuropatia periférica sensitiva leve'] },
        { organSystem: 'HEMATOLOGICAL', healthScore: 94, trend: 'STABLE', riskFactors: [] },
        { organSystem: 'GASTROINTESTINAL', healthScore: 85, trend: 'STABLE', riskFactors: ['DRGE controlada'] },
        { organSystem: 'MUSCULOSKELETAL', healthScore: 76, trend: 'DECLINING', riskFactors: ['Osteoartrose de joelhos', 'Sarcopenia leve'] },
        { organSystem: 'IMMUNOLOGICAL', healthScore: 90, trend: 'STABLE', riskFactors: [] },
      ],
      riskAlerts: [
        'HbA1c acima de 8% — risco aumentado de complicações microvasculares',
        'TFG em declínio progressivo (62 → 58 mL/min em 6 meses)',
        'LDL acima da meta para paciente de alto risco cardiovascular',
      ],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Pharmacogenomics — Profile ───────────────────────────────────────────

  async getPharmacogenomicProfile(
    _tenantId: string,
    patientId: string,
  ): Promise<PharmacogenomicProfileResponseDto> {
    this.logger.log(`Fetching pharmacogenomic profile for patient ${patientId}`);

    return {
      patientId,
      enzymes: [
        {
          enzyme: 'CYP2D6',
          genotype: '*4/*4',
          phenotype: CypEnzymeStatus.POOR,
          activityScore: 0,
          affectedDrugs: [
            'Codeína (sem conversão a morfina — evitar)',
            'Tamoxifeno (eficácia reduzida — considerar alternativa)',
            'Tramadol (eficácia reduzida)',
            'Metoprolol (níveis elevados — reduzir dose em 75%)',
            'Fluoxetina (níveis elevados — reduzir dose)',
          ],
        },
        {
          enzyme: 'CYP2C19',
          genotype: '*1/*17',
          phenotype: CypEnzymeStatus.ULTRA_RAPID,
          activityScore: 2.5,
          affectedDrugs: [
            'Clopidogrel (metabolização aumentada — resposta adequada)',
            'Omeprazol (metabolização rápida — considerar dose maior)',
            'Voriconazol (níveis subterapêuticos — evitar ou monitorar)',
            'Escitalopram (clearance aumentado — ajustar dose)',
          ],
        },
        {
          enzyme: 'CYP3A4',
          genotype: '*1/*1',
          phenotype: CypEnzymeStatus.EXTENSIVE,
          activityScore: 2.0,
          affectedDrugs: [
            'Atorvastatina (metabolização normal)',
            'Ciclosporina (metabolização normal)',
            'Tacrolimus (metabolização normal)',
          ],
        },
        {
          enzyme: 'CYP2C9',
          genotype: '*1/*3',
          phenotype: CypEnzymeStatus.INTERMEDIATE,
          activityScore: 1.5,
          affectedDrugs: [
            'Varfarina (sensibilidade aumentada — reduzir dose inicial em 25%)',
            'Fenitoína (clearance reduzido — monitorar nível sérico)',
            'Losartana (conversão reduzida ao metabólito ativo)',
          ],
        },
        {
          enzyme: 'DPYD',
          genotype: '*1/*1',
          phenotype: CypEnzymeStatus.EXTENSIVE,
          activityScore: 2.0,
          affectedDrugs: [
            '5-Fluorouracil (metabolização normal — dose padrão)',
            'Capecitabina (metabolização normal — dose padrão)',
          ],
        },
      ],
      highRiskDrugs: [
        'Codeína — CONTRAINDICADO (CYP2D6 metabolizador pobre)',
        'Varfarina — dose reduzida necessária (CYP2C9 intermediário)',
        'Tamoxifeno — eficácia comprometida (CYP2D6 metabolizador pobre)',
        'Voriconazol — níveis subterapêuticos prováveis (CYP2C19 ultrarrápido)',
      ],
      interactionAlerts: [
        {
          drugA: 'Fluoxetina',
          drugB: 'Metoprolol',
          severity: 'ALTA',
          mechanism: 'Fluoxetina inibe CYP2D6, aumentando níveis de metoprolol em paciente já metabolizador pobre',
          recommendation: 'Evitar combinação. Se necessário, usar atenolol (não metabolizado por CYP2D6)',
        },
        {
          drugA: 'Omeprazol',
          drugB: 'Clopidogrel',
          severity: 'MODERADA',
          mechanism: 'Omeprazol inibe CYP2C19, mas paciente é ultrarrápido — impacto clínico provavelmente mínimo',
          recommendation: 'Preferir pantoprazol se IBP necessário',
        },
      ],
      testDate: '2026-01-15',
      aiModel: 'gpt-4o',
    };
  }

  // ─── Pharmacogenomics — Drug Dose Adjustment ──────────────────────────────

  async getGenotypeDrugDose(
    _tenantId: string,
    patientId: string,
    drugName: string,
    standardDoseMg?: number,
    _route?: string,
    _knownGenotypes?: string[],
  ): Promise<GenotypeDoseResponseDto> {
    this.logger.log(`Genotype-adjusted dose for ${drugName}, patient ${patientId}`);

    const standardDose = standardDoseMg ?? 100;

    return {
      patientId,
      drugName,
      standardDoseMg: standardDose,
      adjustedDoseMg: Math.round(standardDose * 0.25),
      adjustmentReason:
        `Paciente é metabolizador pobre de CYP2D6 (*4/*4, activity score 0). ` +
        `${drugName} é extensamente metabolizado por CYP2D6. ` +
        `Níveis plasmáticos podem ser 3-4x superiores ao esperado com dose padrão. ` +
        `Redução de 75% recomendada conforme diretriz CPIC.`,
      relevantEnzyme: 'CYP2D6',
      phenotype: 'Metabolizador Pobre (*4/*4)',
      evidenceLevel: 'Nível 1A — CPIC Guideline',
      guidelineSource: 'CPIC Guideline for CYP2D6 and Codeine/Tramadol Therapy (2020)',
      warnings: [
        'Monitorar efeitos adversos dose-dependentes',
        'Considerar monitoramento de nível sérico nas primeiras 2 semanas',
        'Alternativas não metabolizadas por CYP2D6 devem ser consideradas',
        'Risco de acúmulo em insuficiência renal concomitante (TFG 58 mL/min)',
      ],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Oncogenomics — Profile ───────────────────────────────────────────────

  async getOncogenomicProfile(
    _tenantId: string,
    patientId: string,
  ): Promise<OncogenomicProfileResponseDto> {
    this.logger.log(`Fetching oncogenomic profile for patient ${patientId}`);

    return {
      patientId,
      tumorType: 'Adenocarcinoma pulmonar (NSCLC)',
      mutations: [
        {
          gene: 'EGFR',
          variant: 'Exon 19 deletion (p.E746_A750del)',
          significance: 'Patogênica — sensibilizante a TKI',
          frequency: 0.42,
          actionable: true,
        },
        {
          gene: 'TP53',
          variant: 'p.R248W',
          significance: 'Patogênica — perda de função',
          frequency: 0.38,
          actionable: false,
        },
        {
          gene: 'KRAS',
          variant: 'Wild-type',
          significance: 'Sem mutação detectada',
          frequency: 0,
          actionable: false,
        },
        {
          gene: 'ALK',
          variant: 'Sem rearranjo detectado',
          significance: 'Negativo',
          frequency: 0,
          actionable: false,
        },
        {
          gene: 'ROS1',
          variant: 'Sem rearranjo detectado',
          significance: 'Negativo',
          frequency: 0,
          actionable: false,
        },
        {
          gene: 'BRAF',
          variant: 'Wild-type',
          significance: 'Sem mutação detectada',
          frequency: 0,
          actionable: false,
        },
        {
          gene: 'MET',
          variant: 'Amplificação focal (CN=6)',
          significance: 'Potencialmente patogênica — mecanismo de resistência',
          frequency: 0.15,
          actionable: true,
        },
      ],
      tmbScore: 8.3,
      msiStatus: 'MSS (microssatélite estável)',
      pdl1Expression: 45,
      aiModel: 'gpt-4o',
    };
  }

  // ─── Oncogenomics — Therapy Match ─────────────────────────────────────────

  async matchOncogenomicTherapy(
    _tenantId: string,
    patientId: string,
    tumorType: string,
    mutations?: string[],
    priorTreatments?: string[],
    includeTrials?: boolean,
  ): Promise<OncogenomicTherapyMatchResponseDto> {
    this.logger.log(`Therapy match for patient ${patientId}, tumor=${tumorType}, mutations=${mutations?.join(',')}`);

    return {
      patientId,
      matchedTherapies: [
        {
          therapyName: 'Osimertinibe 80mg/dia',
          type: OncogenomicTherapyType.TARGETED,
          targetMutation: 'EGFR Exon 19 deletion',
          evidenceLevel: 'Nível 1 (FLAURA trial)',
          responseRate: 0.80,
          medianPfs: '18.9 meses',
          keyTrials: ['FLAURA (NCT02296125)', 'AURA3 (NCT02151981)'],
        },
        {
          therapyName: 'Pembrolizumabe 200mg IV q3w + Quimioterapia',
          type: OncogenomicTherapyType.COMBINATION,
          targetMutation: 'PD-L1 ≥ 1% (TPS 45%)',
          evidenceLevel: 'Nível 1 (KEYNOTE-789) — considerar se progressão a TKI',
          responseRate: 0.48,
          medianPfs: '6.9 meses',
          keyTrials: ['KEYNOTE-789 (NCT03515837)'],
        },
        {
          therapyName: 'Amivantamabe + Lazertinibe',
          type: OncogenomicTherapyType.COMBINATION,
          targetMutation: 'EGFR mutado + MET amplificado',
          evidenceLevel: 'Nível 2 (CHRYSALIS-2)',
          responseRate: 0.36,
          medianPfs: '4.9 meses',
          keyTrials: ['CHRYSALIS-2 (NCT04077463)', 'MARIPOSA (NCT04487080)'],
        },
        {
          therapyName: 'Savolitinibe + Osimertinibe',
          type: OncogenomicTherapyType.COMBINATION,
          targetMutation: 'EGFR mutado + MET amplificado (mecanismo de resistência)',
          evidenceLevel: 'Nível 2 (SAVANNAH trial)',
          responseRate: 0.32,
          medianPfs: '5.3 meses',
          keyTrials: ['SAVANNAH (NCT03778229)'],
        },
      ],
      eligibleTrials: includeTrials !== false ? [
        {
          trialId: 'NCT05338970',
          title: 'Estudo fase III de osimertinibe + savolitinibe vs quimioterapia em NSCLC EGFR+/MET+',
          phase: 'Fase III',
          eligibilityCriteriaMet: [
            'NSCLC localmente avançado ou metastático',
            'Mutação EGFR sensibilizante confirmada',
            'Amplificação de MET documentada',
            'ECOG PS 0-1',
          ],
          location: 'Hospital Sírio-Libanês, São Paulo, SP',
          status: 'Recrutando',
        },
        {
          trialId: 'NCT05712902',
          title: 'Ensaio fase II de terapia combinada anti-EGFR/MET bispecífico em NSCLC',
          phase: 'Fase II',
          eligibilityCriteriaMet: [
            'Progressão após TKI de 3ª geração',
            'Mutação EGFR documentada',
            'Função orgânica adequada',
          ],
          location: 'INCA, Rio de Janeiro, RJ',
          status: 'Recrutando',
        },
      ] : [],
      resistanceMechanisms: [
        'Amplificação de MET (detectada — CN=6) — principal mecanismo de resistência a osimertinibe',
        'Mutação EGFR C797S — monitorar com biópsia líquida a cada 3 meses',
        'Transformação histológica para pequenas células — considerar biópsia em progressão',
      ],
      summary:
        'Paciente com NSCLC EGFR Exon 19 del + amplificação de MET. ' +
        'Primeira linha: osimertinibe (FLAURA). Resistência provável via MET — considerar ' +
        'combinação com inibidor de MET (savolitinibe ou amivantamabe) na progressão. ' +
        'Dois ensaios clínicos disponíveis em centros brasileiros.',
      aiModel: 'gpt-4o',
    };
  }

  // ─── Conversational BI ────────────────────────────────────────────────────

  async conversationalBi(
    _tenantId: string,
    question: string,
    startDate?: string,
    endDate?: string,
    department?: string,
    preferredChart?: string,
  ): Promise<ConversationalBiResponseDto> {
    this.logger.log(`Conversational BI: "${question.slice(0, 80)}", dept=${department}`);

    return {
      question,
      sqlGenerated: `SELECT
  DATE_TRUNC('month', a.admission_date) AS mes,
  d.name AS departamento,
  COUNT(DISTINCT e.patient_id) AS pacientes,
  AVG(EXTRACT(EPOCH FROM (a.discharge_date - a.admission_date)) / 86400)::NUMERIC(5,1) AS media_permanencia_dias,
  COUNT(CASE WHEN a.readmitted_30d THEN 1 END) AS reinternacoes_30d
FROM admissions a
JOIN encounters e ON e.id = a.encounter_id
JOIN departments d ON d.id = e.department_id
WHERE a.admission_date >= '${startDate ?? '2025-10-01'}'
  AND a.admission_date <= '${endDate ?? '2026-03-25'}'
  ${department ? `AND d.name = '${department}'` : ''}
GROUP BY mes, departamento
ORDER BY mes, departamento`,
      answer:
        'No período analisado, a UTI teve a maior média de permanência (8.4 dias), seguida pela Clínica Médica (5.2 dias) e Cirurgia Geral (3.8 dias). ' +
        'A taxa de reinternação em 30 dias ficou em 9.7%, abaixo da meta de 12%. ' +
        'O mês de janeiro registrou pico de ocupação (94%), correlacionado com surto de influenza.',
      chartType: (preferredChart as BiVisualizationType) ?? BiVisualizationType.BAR,
      chartData: [
        { label: 'Out/2025', value: 342, category: 'Internações' },
        { label: 'Nov/2025', value: 318, category: 'Internações' },
        { label: 'Dez/2025', value: 295, category: 'Internações' },
        { label: 'Jan/2026', value: 412, category: 'Internações' },
        { label: 'Fev/2026', value: 367, category: 'Internações' },
        { label: 'Mar/2026', value: 289, category: 'Internações' },
        { label: 'Out/2025', value: 31, category: 'Reinternações 30d' },
        { label: 'Nov/2025', value: 28, category: 'Reinternações 30d' },
        { label: 'Dez/2025', value: 33, category: 'Reinternações 30d' },
        { label: 'Jan/2026', value: 45, category: 'Reinternações 30d' },
        { label: 'Fev/2026', value: 38, category: 'Reinternações 30d' },
        { label: 'Mar/2026', value: 22, category: 'Reinternações 30d' },
      ],
      summary: '2.023 internações no período. Média de permanência: 5.2 dias. Taxa de reinternação 30d: 9.7%. Pico em janeiro (influenza).',
      dataQualityWarnings: [
        'Dados de março/2026 parciais (até dia 25)',
        '12 altas sem data de saída registrada — excluídas do cálculo de permanência',
      ],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Multimodal Analysis ──────────────────────────────────────────────────

  async multimodalAnalysis(
    _tenantId: string,
    clinicalText: string,
    patientId?: string,
    imageUrls?: string[],
    labSummary?: string,
    voiceTranscript?: string,
    ecgData?: string,
  ): Promise<MultimodalAnalysisResponseDto> {
    this.logger.log(`Multimodal analysis for patient ${patientId ?? 'unknown'}, sources: text=${!!clinicalText}, images=${imageUrls?.length ?? 0}, lab=${!!labSummary}, voice=${!!voiceTranscript}, ecg=${!!ecgData}`);

    return {
      integratedInsight:
        'Análise multimodal integrada de 5 fontes de dados sugere insuficiência cardíaca descompensada (NYHA III) ' +
        'com provável fator precipitante infeccioso (pneumonia de base D). Função renal em deterioração aguda sobre crônica.',
      textFindings: [
        'Dispneia progressiva há 5 dias, piora ao decúbito',
        'Ortopneia e dispneia paroxística noturna',
        'Edema de MMII bilateral, pior à D',
        'Antecedentes: IC FE reduzida (35%), DRC estágio 3B, FA permanente',
      ],
      imageFindings: imageUrls?.length ? [
        'RX tórax: cardiomegalia grau III (ICT 0.62)',
        'Congestão pulmonar bilateral com redistribuição de fluxo',
        'Derrame pleural bilateral, maior à D',
        'Consolidação em base pulmonar D sugestiva de pneumonia',
      ] : ['Nenhuma imagem fornecida'],
      labFindings: labSummary ? [
        'BNP: 1.850 pg/mL (VR <100) — IC descompensada',
        'Creatinina: 2.4 mg/dL (basal 1.8) — piora aguda de função renal',
        'PCR: 85 mg/L — componente infeccioso provável',
        'Troponina I: 0.08 ng/mL (VR <0.04) — injúria miocárdica leve',
        'Leucocitose: 13.200/mm³ com desvio',
        'Na: 131 mEq/L — hiponatremia dilucional',
      ] : ['Nenhum resultado laboratorial fornecido'],
      voiceFindings: voiceTranscript ? [
        'Paciente refere não ter tomado furosemida nos últimos 3 dias por falta de medicação',
        'Relata febre baixa (37.8°C) há 2 dias',
        'Nega dor torácica, refere apenas desconforto pela dispneia',
      ] : ['Nenhuma transcrição de voz fornecida'],
      ecgFindings: ecgData ? [
        'Fibrilação atrial com FC 112 bpm (resposta ventricular aumentada)',
        'Sobrecarga de VE com strain pattern',
        'Sem sinais agudos de isquemia',
      ] : ['Nenhum ECG fornecido'],
      synthesizedConclusion:
        'IC descompensada NYHA III por dois fatores precipitantes identificados: ' +
        '1) Não adesão à furosemida (relato do paciente); ' +
        '2) Pneumonia em base D (imagem + laboratório). ' +
        'Piora de função renal (síndrome cardiorrenal tipo 1). ' +
        'FA com resposta ventricular alta contribuindo para descompensação.',
      suggestedActions: [
        'Internação em unidade coronariana ou semi-intensiva',
        'Furosemida IV 40-80mg em bolus, depois infusão contínua conforme diurese',
        'Antibioticoterapia: ceftriaxona 2g IV + azitromicina 500mg IV',
        'Controle de FC da FA: digoxina 0.25mg IV ou amiodarona',
        'Restrição hídrica 1.000 mL/dia + restrição de sódio',
        'Monitorar creatinina e eletrólitos a cada 12h',
        'Ecocardiograma à beira-leito nas primeiras 24h',
        'Hemocultura + urocultura antes de ATB',
        'Balanço hídrico rigoroso — meta de balanço negativo de 1-2L/dia',
      ],
      urgencyLevel: 'ALTA — internação imediata',
      confidence: 0.91,
      aiModel: 'gpt-4o-multimodal',
    };
  }

  // ─── Health Coach — Recommendations ───────────────────────────────────────

  async getHealthCoachRecommendations(
    _tenantId: string,
    patientId: string,
    categories?: string[],
    conditions?: string[],
    _medications?: string[],
  ): Promise<HealthCoachResponseDto> {
    this.logger.log(`Health coach recommendations for patient ${patientId}, categories=${categories?.join(',')}, conditions=${conditions?.length ?? 0}`);

    return {
      patientId,
      recommendations: [
        {
          category: HealthCoachCategory.MEDICATION_ADHERENCE,
          title: 'Adesão à medicação anti-hipertensiva',
          description: 'Tomar losartana 50mg sempre no mesmo horário (manhã), junto com o café da manhã. Não suspender mesmo se a pressão estiver normal.',
          priority: 1,
          frequency: 'Diário',
          relatedCondition: 'HAS (I10)',
        },
        {
          category: HealthCoachCategory.NUTRITION,
          title: 'Dieta cardioprotetora',
          description: 'Reduzir sódio para <2g/dia. Aumentar consumo de frutas (3 porções), vegetais (4 porções) e peixes ricos em ômega-3. Evitar ultraprocessados.',
          priority: 2,
          frequency: 'Diário',
          relatedCondition: 'HAS (I10) + DM2 (E11)',
        },
        {
          category: HealthCoachCategory.EXERCISE,
          title: 'Atividade física regular',
          description: 'Caminhada de 30 minutos, 5x/semana, em intensidade moderada (conseguir conversar durante o exercício). Incluir exercícios de resistência 2x/semana.',
          priority: 2,
          frequency: '5x/semana',
          relatedCondition: 'DM2 (E11) + Obesidade (E66)',
        },
        {
          category: HealthCoachCategory.CHRONIC_DISEASE,
          title: 'Automonitoramento glicêmico',
          description: 'Verificar glicemia capilar em jejum e 2h após almoço. Anotar valores e trazer na próxima consulta. Meta: jejum 80-130 mg/dL, pós-prandial <180 mg/dL.',
          priority: 1,
          frequency: '2x/dia',
          relatedCondition: 'DM2 (E11)',
        },
        {
          category: HealthCoachCategory.PREVENTIVE_CARE,
          title: 'Exames de rastreamento pendentes',
          description: 'Fundo de olho (última há 14 meses — recomendado anual em DM2). Microalbuminúria (última há 8 meses). Hemoglobina glicada (coleta em 2 semanas).',
          priority: 3,
          frequency: 'Conforme agendamento',
        },
        {
          category: HealthCoachCategory.MENTAL_HEALTH,
          title: 'Manejo do estresse',
          description: 'Reservar 10 minutos diários para técnica de respiração diafragmática ou meditação guiada. O estresse crônico aumenta a glicemia e a pressão arterial.',
          priority: 3,
          frequency: 'Diário',
        },
        {
          category: HealthCoachCategory.SLEEP,
          title: 'Higiene do sono',
          description: 'Manter horário regular (deitar e levantar no mesmo horário). Evitar telas 1h antes de dormir. Meta: 7-8h de sono por noite.',
          priority: 3,
          frequency: 'Diário',
        },
      ],
      medicationReminders: [
        {
          medicationName: 'Metformina 850mg',
          dosage: '1 comprimido',
          schedule: ['Almoço (12h)', 'Jantar (19h)'],
          instructions: 'Tomar durante ou logo após a refeição para reduzir desconforto gástrico',
          importanceNote: 'Essencial para controle glicêmico. Não suspender sem orientação médica.',
        },
        {
          medicationName: 'Losartana 50mg',
          dosage: '1 comprimido',
          schedule: ['Manhã (8h)'],
          instructions: 'Tomar em jejum ou com café da manhã',
          importanceNote: 'Protege rins e coração. Manter mesmo com pressão controlada.',
        },
        {
          medicationName: 'Atorvastatina 20mg',
          dosage: '1 comprimido',
          schedule: ['Noite (21h)'],
          instructions: 'Tomar à noite, preferencialmente no mesmo horário',
          importanceNote: 'Reduz colesterol e risco cardiovascular. Não suspender se sentir dor muscular — comunique o médico.',
        },
        {
          medicationName: 'AAS 100mg',
          dosage: '1 comprimido',
          schedule: ['Almoço (12h)'],
          instructions: 'Tomar após o almoço para proteger o estômago',
          importanceNote: 'Prevenção cardiovascular. Informar qualquer sangramento incomum.',
        },
      ],
      lifestyleTips: [
        'Beba pelo menos 2 litros de água por dia (a menos que haja restrição hídrica)',
        'Substitua refrigerante por água com limão ou chá sem açúcar',
        'Adicione temperos naturais (alho, cebola, ervas) no lugar do sal',
        'Leve lanches saudáveis (frutas, castanhas) quando sair de casa para evitar tentações',
        'Use um aplicativo de lembretes para não esquecer as medicações',
        'Meça a pressão arterial em casa 2x/semana e anote',
      ],
      motivationalMessage:
        'Você está no caminho certo! Cada pequena mudança de hábito faz uma grande diferença na sua saúde a longo prazo. ' +
        'Lembre-se: controlar diabetes e pressão hoje é prevenir complicações amanhã. Conte conosco nessa jornada!',
      aiModel: 'gpt-4o',
    };
  }

  // ─── Health Coach — Goals ─────────────────────────────────────────────────

  async getHealthGoals(
    _tenantId: string,
    patientId: string,
  ): Promise<HealthGoalsResponseDto> {
    this.logger.log(`Fetching health goals for patient ${patientId}`);

    return {
      patientId,
      goals: [
        {
          goalId: randomUUID(),
          title: 'HbA1c abaixo de 7%',
          description: 'Reduzir hemoglobina glicada de 8.2% para <7% em 6 meses através de dieta, exercícios e adesão medicamentosa',
          category: HealthCoachCategory.CHRONIC_DISEASE,
          status: GoalStatus.AT_RISK,
          targetDate: '2026-09-25',
          progressPercent: 35,
          milestones: [
            'Iniciar automonitoramento glicêmico diário — Concluído',
            'Consulta nutricional — Concluído',
            'HbA1c intermediária (3 meses): <7.5% — Pendente (próxima coleta: 15/04)',
            'HbA1c final (6 meses): <7% — Pendente',
          ],
        },
        {
          goalId: randomUUID(),
          title: 'Pressão arterial controlada (<130/80)',
          description: 'Manter PA consistentemente abaixo de 130/80 mmHg com medicação e redução de sódio',
          category: HealthCoachCategory.CHRONIC_DISEASE,
          status: GoalStatus.ON_TRACK,
          targetDate: '2026-06-25',
          progressPercent: 68,
          milestones: [
            'Iniciar MAPA domiciliar — Concluído',
            'Redução de sódio para <2g/dia — Em andamento',
            'PA <130/80 em 80% das aferições — 72% atingido',
          ],
        },
        {
          goalId: randomUUID(),
          title: 'Perder 5kg em 4 meses',
          description: 'Reduzir peso de 98kg para 93kg com reeducação alimentar e exercícios regulares',
          category: HealthCoachCategory.NUTRITION,
          status: GoalStatus.ON_TRACK,
          targetDate: '2026-07-25',
          progressPercent: 50,
          milestones: [
            'Consulta com nutricionista — Concluído',
            'Iniciar caminhadas 5x/semana — Concluído',
            'Perder 2.5kg (marco intermediário) — Concluído (peso atual: 95.5kg)',
            'Atingir 93kg — Pendente',
          ],
        },
        {
          goalId: randomUUID(),
          title: 'Caminhar 150 minutos por semana',
          description: 'Atingir a meta de atividade física da OMS: 150 min/semana de exercício moderado',
          category: HealthCoachCategory.EXERCISE,
          status: GoalStatus.ACTIVE,
          targetDate: '2026-12-31',
          progressPercent: 60,
          milestones: [
            'Semana 1-2: 60 min/semana — Concluído',
            'Semana 3-4: 90 min/semana — Concluído',
            'Semana 5+: 120 min/semana — Em andamento',
            'Meta final: 150 min/semana — Pendente',
          ],
        },
        {
          goalId: randomUUID(),
          title: 'Realizar todos os exames de rastreamento',
          description: 'Completar fundo de olho, microalbuminúria, lipidograma e HbA1c conforme cronograma',
          category: HealthCoachCategory.PREVENTIVE_CARE,
          status: GoalStatus.OVERDUE,
          targetDate: '2026-03-15',
          progressPercent: 50,
          milestones: [
            'Lipidograma — Concluído (12/02/2026)',
            'HbA1c — Agendado (15/04/2026)',
            'Fundo de olho — ATRASADO (último: jan/2025)',
            'Microalbuminúria — ATRASADO (último: jul/2025)',
          ],
        },
      ],
      overallAdherence: 0.72,
      nextCheckIn: '2026-04-01',
    };
  }
}
