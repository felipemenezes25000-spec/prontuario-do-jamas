import { Injectable, Logger } from '@nestjs/common';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ClinicalInsight {
  type: 'WARNING' | 'SUGGESTION' | 'INFO' | 'REMINDER' | 'QUALITY';
  category: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  actionable: boolean;
  suggestedAction?: string;
  confidence: number;
}

export interface ClinicalAnalysisResult {
  patientId: string;
  dataType: string;
  findings: ClinicalFinding[];
  riskFactors: RiskFactor[];
  recommendations: string[];
  qualityGaps: QualityGap[];
  analyzedAt: string;
}

export interface ClinicalFinding {
  finding: string;
  significance: 'NORMAL' | 'BORDERLINE' | 'ABNORMAL' | 'CRITICAL';
  context: string;
}

export interface RiskFactor {
  factor: string;
  level: 'LOW' | 'MODERATE' | 'HIGH';
  modifiable: boolean;
  intervention?: string;
}

export interface QualityGap {
  measure: string;
  status: 'MET' | 'NOT_MET' | 'PENDING';
  recommendation: string;
  deadline?: string;
}

export interface DrugInteractionCheckResult {
  safe: boolean;
  interactions: DrugInteraction[];
  allergyConflicts: AllergyConflict[];
  doseWarnings: DoseWarning[];
  duplicateTherapy: DuplicateTherapyWarning[];
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  mechanism: string;
  clinicalEffect: string;
  management: string;
  reference: string;
}

export interface AllergyConflict {
  medication: string;
  allergen: string;
  crossReactivity: boolean;
  severity: 'HIGH' | 'CRITICAL';
  alternative: string;
}

export interface DoseWarning {
  medication: string;
  prescribedDose: string;
  maxRecommendedDose: string;
  reason: string;
  adjustment: string;
}

export interface DuplicateTherapyWarning {
  medications: string[];
  therapeuticClass: string;
  recommendation: string;
}

export interface CriticalLabAlert {
  labName: string;
  value: number;
  unit: string;
  normalRange: string;
  severity: 'WARNING' | 'CRITICAL' | 'PANIC';
  clinicalSignificance: string;
  suggestedAction: string;
}

export interface PreventiveScreeningRecommendation {
  screening: string;
  frequency: string;
  lastPerformed?: string;
  dueDate?: string;
  guideline: string;
  priority: 'ROUTINE' | 'OVERDUE' | 'URGENT';
}

// ─── Drug Interaction Database ──────────────────────────────────────────────

interface DrugInteractionRule {
  drug1Patterns: RegExp[];
  drug2Patterns: RegExp[];
  severity: DrugInteraction['severity'];
  mechanism: string;
  clinicalEffect: string;
  management: string;
  reference: string;
}

const DRUG_INTERACTIONS: DrugInteractionRule[] = [
  {
    drug1Patterns: [/varfarina|marevan|coumadin/i],
    drug2Patterns: [/amiodarona|ancoron/i],
    severity: 'CRITICAL',
    mechanism: 'Inibicao CYP2C9/3A4 pela amiodarona reduz metabolismo da varfarina',
    clinicalEffect: 'Aumento de 30-50% no INR, risco significativo de sangramento',
    management: 'Reduzir varfarina em 30-50%. Monitorar INR semanalmente por 6-8 semanas',
    reference: 'Sanoski CA. Ann Pharmacother 2009;43:322-8',
  },
  {
    drug1Patterns: [/varfarina|marevan/i],
    drug2Patterns: [/aas|aspirina|acido acetilsalicilico/i],
    severity: 'MAJOR',
    mechanism: 'Efeito antiplaquetuario aditivo + anticoagulacao',
    clinicalEffect: 'Risco aumentado de sangramento GI e intracraniano',
    management: 'Avaliar risco-beneficio. Associar IBP se necessario',
    reference: 'Dentali F et al. Arch Intern Med 2007;167:117-24',
  },
  {
    drug1Patterns: [/metformina|glifage|glucoformin/i],
    drug2Patterns: [/contraste iodado/i],
    severity: 'MAJOR',
    mechanism: 'Nefrotoxicidade do contraste reduz clearance de metformina',
    clinicalEffect: 'Risco de acidose lactica por acumulo',
    management: 'Suspender metformina 48h antes e apos contraste. Checar creatinina',
    reference: 'ACR Manual on Contrast Media 2023',
  },
  {
    drug1Patterns: [/enalapril|captopril|ramipril|lisinopril|perindopril/i],
    drug2Patterns: [/espironolactona|amilorida|eplerenona/i],
    severity: 'MAJOR',
    mechanism: 'Ambos reteem potassio por mecanismos diferentes',
    clinicalEffect: 'Hipercalemia potencialmente fatal, especialmente em DRC ou DM',
    management: 'Monitorar potassio em 1 semana e mensalmente. Evitar suplemento de K+',
    reference: 'Juurlink DN et al. NEJM 2004;351:543-51',
  },
  {
    drug1Patterns: [/losartana|valsartana|candesartana|telmisartana|irbesartana|olmesartana/i],
    drug2Patterns: [/enalapril|captopril|ramipril|lisinopril|perindopril/i],
    severity: 'MAJOR',
    mechanism: 'Bloqueio duplo do SRAA',
    clinicalEffect: 'Hipotensao, hipercalemia e IRA',
    management: 'Evitar combinacao. Usar apenas uma classe',
    reference: 'ONTARGET. NEJM 2008;358:1547-59',
  },
  {
    drug1Patterns: [/fluoxetina|sertralina|paroxetina|citalopram|escitalopram|venlafaxina|duloxetina/i],
    drug2Patterns: [/tramadol|tramal/i],
    severity: 'MAJOR',
    mechanism: 'Efeito serotoninergico aditivo',
    clinicalEffect: 'Risco de sindrome serotoninergica (agitacao, tremor, hipertermia)',
    management: 'Evitar ou monitorar rigorosamente. Preferir analgesico alternativo',
    reference: 'Boyer EW, Shannon M. NEJM 2005;352:1112-20',
  },
  {
    drug1Patterns: [/fluoxetina|sertralina|paroxetina|citalopram|escitalopram/i],
    drug2Patterns: [/imao|fenelzina|tranilcipromina|selegilina|isocarboxazida/i],
    severity: 'CRITICAL',
    mechanism: 'Acumulo extremo de serotonina sinaptica',
    clinicalEffect: 'Sindrome serotoninergica grave, potencialmente fatal',
    management: 'CONTRAINDICACAO ABSOLUTA. Intervalo minimo de 14 dias (5 semanas para fluoxetina)',
    reference: 'FDA Black Box Warning',
  },
  {
    drug1Patterns: [/sinvastatina|atorvastatina|rosuvastatina/i],
    drug2Patterns: [/eritromicina|claritromicina|cetoconazol|itraconazol/i],
    severity: 'MODERATE',
    mechanism: 'Inibicao CYP3A4 aumenta niveis sericos de estatinas',
    clinicalEffect: 'Risco de miopatia e rabdomiolise',
    management: 'Suspender estatina durante tratamento ou trocar para azitromicina',
    reference: 'Grunden JW et al. Pharmacotherapy 1997;17:1060-3',
  },
  {
    drug1Patterns: [/omeprazol|esomeprazol/i],
    drug2Patterns: [/clopidogrel|plavix/i],
    severity: 'MODERATE',
    mechanism: 'Inibicao CYP2C19 reduz ativacao do clopidogrel',
    clinicalEffect: 'Reducao do efeito antiplaquetuario',
    management: 'Preferir pantoprazol. Evitar omeprazol com clopidogrel',
    reference: 'FDA Drug Safety Communication 2009',
  },
  {
    drug1Patterns: [/levotiroxina|puran|euthyrox|synthroid/i],
    drug2Patterns: [/carbonato de calcio|calcio|sulfato ferroso|ferro/i],
    severity: 'MINOR',
    mechanism: 'Calcio e ferro formam complexos insoluveis com levotiroxina',
    clinicalEffect: 'Reducao da absorcao de levotiroxina',
    management: 'Separar administracao por pelo menos 4 horas',
    reference: 'Singh N et al. JAMA Intern Med 2000;160:1452-6',
  },
  {
    drug1Patterns: [/digoxina|lanoxin/i],
    drug2Patterns: [/amiodarona|ancoron/i],
    severity: 'MAJOR',
    mechanism: 'Amiodarona inibe P-gp, aumentando niveis de digoxina',
    clinicalEffect: 'Toxicidade digitalica (nausea, arritmias, disturbios visuais)',
    management: 'Reduzir digoxina em 50%. Monitorar nivel serico',
    reference: 'Hager WD et al. Ann Intern Med 1979;90:456-60',
  },
  {
    drug1Patterns: [/liti(o|um)|carbolitium/i],
    drug2Patterns: [/ibuprofeno|naproxeno|diclofenaco|cetoprofeno|aine|anti.?inflamatorio/i],
    severity: 'MAJOR',
    mechanism: 'AINEs reduzem clearance renal do litio',
    clinicalEffect: 'Toxicidade por litio (tremor, ataxia, confusao)',
    management: 'Evitar AINEs. Se necessario, monitorar litemia frequentemente. Preferir paracetamol',
    reference: 'Finley PR et al. J Clin Psychopharmacol 1995;15:389-95',
  },
  {
    drug1Patterns: [/ciprofloxacino|levofloxacino|norfloxacino/i],
    drug2Patterns: [/teofilina|aminofilina/i],
    severity: 'MODERATE',
    mechanism: 'Fluoroquinolonas inibem CYP1A2, aumentando niveis de teofilina',
    clinicalEffect: 'Toxicidade por teofilina (taquicardia, convulsoes)',
    management: 'Monitorar nivel serico de teofilina. Reduzir dose em 25-50%',
    reference: 'Stahlmann R et al. Drugs 1999;58:37-42',
  },
  {
    drug1Patterns: [/metronidazol|flagyl/i],
    drug2Patterns: [/alcool|etanol/i],
    severity: 'MAJOR',
    mechanism: 'Reacao dissulfiram-like por inibicao da aldeido desidrogenase',
    clinicalEffect: 'Nausea intensa, vomitos, cefaleia, rubor facial, taquicardia',
    management: 'Evitar alcool durante tratamento e ate 48h apos. Orientar paciente',
    reference: 'Visapaa JP et al. Ann Pharmacother 2002;36:971-4',
  },
  {
    drug1Patterns: [/clonidina|atensina/i],
    drug2Patterns: [/propranolol|atenolol|metoprolol|beta.?bloqueador/i],
    severity: 'MODERATE',
    mechanism: 'Suspensao abrupta de clonidina com beta-bloqueador pode causar crise hipertensiva rebote',
    clinicalEffect: 'Hipertensao grave rebote por ativacao simptica sem oposicao',
    management: 'Nunca suspender clonidina abruptamente. Descontinuar beta-bloq antes da clonidina',
    reference: 'Houston MC. Am Heart J 1981;102:415-20',
  },
  {
    drug1Patterns: [/insulina|glargina|nph|lispro|asparte/i],
    drug2Patterns: [/propranolol|atenolol|metoprolol/i],
    severity: 'MODERATE',
    mechanism: 'Beta-bloqueadores mascaram sintomas adrenergicos de hipoglicemia',
    clinicalEffect: 'Hipoglicemia nao reconhecida, prolongada',
    management: 'Monitorar glicemia com mais frequencia. Preferir beta-bloqueadores seletivos (metoprolol)',
    reference: 'Shorr RI et al. JAMA 1997;278:40-3',
  },
];

// ─── Allergy Cross-Reactivity Database ──────────────────────────────────────

interface AllergyCrossReactivity {
  allergenPatterns: RegExp[];
  crossReactivePatterns: RegExp[];
  crossReactivityRate: string;
  alternative: string;
}

const ALLERGY_CROSS_REACTIVITY: AllergyCrossReactivity[] = [
  {
    allergenPatterns: [/penicilina|amoxicilina|ampicilina/i],
    crossReactivePatterns: [/cefalosporina|cefazolina|ceftriaxona|cefalexina|cefepime/i],
    crossReactivityRate: '1-2% (historicamente superestimada)',
    alternative: 'Azitromicina, fluoroquinolona, ou cefalosporina com teste cutaneo previo',
  },
  {
    allergenPatterns: [/penicilina|amoxicilina|ampicilina/i],
    crossReactivePatterns: [/amoxicilina|ampicilina|penicilina|piperacilina|oxacilina/i],
    crossReactivityRate: '100% (mesma classe)',
    alternative: 'Azitromicina, clindamicina, ou fluoroquinolona',
  },
  {
    allergenPatterns: [/sulfa|sulfametoxazol|bactrim/i],
    crossReactivePatterns: [/sulfadiazina|sulfassalazina/i],
    crossReactivityRate: 'Alta (mesma classe)',
    alternative: 'Trimetoprima isolada ou classe diferente',
  },
  {
    allergenPatterns: [/dipirona|metamizol/i],
    crossReactivePatterns: [/aine|ibuprofeno|naproxeno|diclofenaco|cetoprofeno/i],
    crossReactivityRate: 'Variavel (10-30% em pacientes com hipersensibilidade a AINEs)',
    alternative: 'Paracetamol (geralmente seguro). Considerar teste provocativo',
  },
  {
    allergenPatterns: [/latex/i],
    crossReactivePatterns: [/banana|kiwi|abacate|castanha/i],
    crossReactivityRate: '30-50% (sindrome latex-fruta)',
    alternative: 'Luvas sem latex. Evitar alimentos com reatividade cruzada',
  },
  {
    allergenPatterns: [/contraste iodado/i],
    crossReactivePatterns: [/iodo|povidona|betadine/i],
    crossReactivityRate: 'NAO existe reatividade cruzada real (mito)',
    alternative: 'Pre-medicacao com corticoide + anti-histaminico se necessario',
  },
];

// ─── Therapeutic Class Database ─────────────────────────────────────────────

interface TherapeuticClass {
  className: string;
  patterns: RegExp[];
}

const THERAPEUTIC_CLASSES: TherapeuticClass[] = [
  { className: 'IECA', patterns: [/enalapril|captopril|ramipril|lisinopril|perindopril/i] },
  { className: 'BRA', patterns: [/losartana|valsartana|candesartana|telmisartana|irbesartana|olmesartana/i] },
  { className: 'Estatina', patterns: [/sinvastatina|atorvastatina|rosuvastatina|pravastatina/i] },
  { className: 'ISRS', patterns: [/fluoxetina|sertralina|paroxetina|citalopram|escitalopram/i] },
  { className: 'IBP', patterns: [/omeprazol|pantoprazol|lansoprazol|esomeprazol|rabeprazol/i] },
  { className: 'Beta-bloqueador', patterns: [/propranolol|atenolol|metoprolol|carvedilol|bisoprolol/i] },
  { className: 'Benzodiazepínico', patterns: [/diazepam|clonazepam|alprazolam|lorazepam|midazolam/i] },
  { className: 'AINE', patterns: [/ibuprofeno|naproxeno|diclofenaco|cetoprofeno|meloxicam|piroxicam/i] },
  { className: 'Tiazídico', patterns: [/hidroclorotiazida|clortalidona|indapamida/i] },
  { className: 'Bloqueador de canal de cálcio', patterns: [/anlodipino|nifedipino|verapamil|diltiazem/i] },
  { className: 'Sulfoniluréia', patterns: [/glibenclamida|glicazida|glimepirida/i] },
  { className: 'Opioide', patterns: [/morfina|codeina|tramadol|oxicodona|fentanil|metadona/i] },
];

// ─── Critical Lab Values ────────────────────────────────────────────────────

interface CriticalLabRange {
  labNamePatterns: RegExp[];
  displayName: string;
  unit: string;
  normalRange: string;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  panicLow?: number;
  panicHigh?: number;
  clinicalSignificanceLow: string;
  clinicalSignificanceHigh: string;
  actionLow: string;
  actionHigh: string;
}

const CRITICAL_LAB_RANGES: CriticalLabRange[] = [
  {
    labNamePatterns: [/potassio|k\+?$/i],
    displayName: 'Potássio',
    unit: 'mEq/L',
    normalRange: '3.5-5.0',
    warningLow: 3.0, warningHigh: 5.5,
    criticalLow: 2.5, criticalHigh: 6.0,
    panicLow: 2.0, panicHigh: 6.5,
    clinicalSignificanceLow: 'Hipocalemia — risco de arritmias, fraqueza muscular, ileo paralitico',
    clinicalSignificanceHigh: 'Hipercalemia — risco de arritmias fatais (fibrilacao ventricular)',
    actionLow: 'Reposicao de potassio (KCl VO ou IV). ECG. Monitorar magnesio',
    actionHigh: 'ECG urgente. Gluconato de calcio se alteracoes ECG. Insulina + glicose. Resina de troca',
  },
  {
    labNamePatterns: [/sodio|na\+?$/i],
    displayName: 'Sódio',
    unit: 'mEq/L',
    normalRange: '135-145',
    warningLow: 130, warningHigh: 150,
    criticalLow: 125, criticalHigh: 155,
    panicLow: 120, panicHigh: 160,
    clinicalSignificanceLow: 'Hiponatremia — risco de edema cerebral, convulsoes, coma',
    clinicalSignificanceHigh: 'Hipernatremia — desidratacao grave, alteracao de consciencia',
    actionLow: 'Restricao hidrica. Se sintomatica: NaCl 3% (correcao max 8 mEq/24h para evitar mielinolise)',
    actionHigh: 'Hidratacao com SG5% ou SF 0.45%. Correcao gradual (max 10 mEq/24h)',
  },
  {
    labNamePatterns: [/glicose|glicemia|dextro|hgt/i],
    displayName: 'Glicemia',
    unit: 'mg/dL',
    normalRange: '70-99 (jejum)',
    warningLow: 60, warningHigh: 250,
    criticalLow: 50, criticalHigh: 400,
    panicLow: 40, panicHigh: 600,
    clinicalSignificanceLow: 'Hipoglicemia — neurogicopenia, convulsoes, coma',
    clinicalSignificanceHigh: 'Hiperglicemia grave — risco de CAD/EHH',
    actionLow: 'Glicose IV (25-50mL de G50%) se incapaz de VO. Investigar causa',
    actionHigh: 'Hidratacao vigorosa, insulina regular IV, monitorar potassio, gasometria',
  },
  {
    labNamePatterns: [/hemoglobina|hb$/i],
    displayName: 'Hemoglobina',
    unit: 'g/dL',
    normalRange: '12-17',
    warningLow: 8.0, warningHigh: 18.0,
    criticalLow: 7.0, criticalHigh: 20.0,
    panicLow: 5.0, panicHigh: undefined,
    clinicalSignificanceLow: 'Anemia grave — risco de insuficiencia cardiaca de alto debito, isquemia',
    clinicalSignificanceHigh: 'Policitemia — risco tromboembolico aumentado',
    actionLow: 'Transfusao de concentrado de hemacias. Investigar causa (sangramento, hemolise)',
    actionHigh: 'Investigar policitemia vera. Flebotomia se sintomatico',
  },
  {
    labNamePatterns: [/plaqueta|plaq/i],
    displayName: 'Plaquetas',
    unit: '/mm³',
    normalRange: '150.000-400.000',
    warningLow: 100000, warningHigh: 500000,
    criticalLow: 50000, criticalHigh: 1000000,
    panicLow: 20000, panicHigh: undefined,
    clinicalSignificanceLow: 'Trombocitopenia grave — risco de sangramento espontaneo',
    clinicalSignificanceHigh: 'Trombocitose — risco tromboembolico',
    actionLow: 'Transfusao de plaquetas se < 10.000 ou sangramento ativo. Investigar causa',
    actionHigh: 'Investigar causa reativa vs neoplasica. AAS se trombotico',
  },
  {
    labNamePatterns: [/creatinina|cr$/i],
    displayName: 'Creatinina',
    unit: 'mg/dL',
    normalRange: '0.7-1.3',
    warningHigh: 2.0,
    criticalHigh: 4.0,
    panicHigh: 8.0,
    clinicalSignificanceLow: '',
    clinicalSignificanceHigh: 'Insuficiencia renal — risco de hipercalemia, acidose, uremia',
    actionLow: '',
    actionHigh: 'Hidratacao. Avaliar TFG. Ajustar medicacoes nefrotoxicas. Considerar dialise se indicado',
  },
  {
    labNamePatterns: [/troponina|tnl|tni/i],
    displayName: 'Troponina',
    unit: 'ng/mL',
    normalRange: '< 0.04',
    warningHigh: 0.04,
    criticalHigh: 0.4,
    panicHigh: 2.0,
    clinicalSignificanceLow: '',
    clinicalSignificanceHigh: 'Lesao miocardica — IAM ate prova em contrario',
    actionLow: '',
    actionHigh: 'ECG imediato. Avaliar para SCA. Troponina seriada. Cardiologia urgente se elevada',
  },
  {
    labNamePatterns: [/lactato/i],
    displayName: 'Lactato',
    unit: 'mmol/L',
    normalRange: '0.5-2.0',
    warningHigh: 2.0,
    criticalHigh: 4.0,
    panicHigh: 8.0,
    clinicalSignificanceLow: '',
    clinicalSignificanceHigh: 'Hiperlactatemia — hipoperfusao tecidual, sepse, choque',
    actionLow: '',
    actionHigh: 'Ressuscitacao volemica. Identificar e tratar causa. Monitorar clearance de lactato',
  },
  {
    labNamePatterns: [/inr$/i],
    displayName: 'INR',
    unit: '',
    normalRange: '0.8-1.2 (sem anticoagulacao)',
    warningHigh: 3.5,
    criticalHigh: 5.0,
    panicHigh: 9.0,
    clinicalSignificanceLow: '',
    clinicalSignificanceHigh: 'Coagulopatia — risco significativo de sangramento',
    actionLow: '',
    actionHigh: 'Suspender anticoagulante. Vitamina K se > 5. PFC ou CCP se sangramento ativo',
  },
  {
    labNamePatterns: [/pcr|proteina c reativa/i],
    displayName: 'PCR',
    unit: 'mg/L',
    normalRange: '< 5',
    warningHigh: 50,
    criticalHigh: 100,
    panicHigh: 200,
    clinicalSignificanceLow: '',
    clinicalSignificanceHigh: 'Inflamacao/infeccao significativa',
    actionLow: '',
    actionHigh: 'Investigar foco infeccioso. Hemoculturas. Considerar inicio empirico de ATB se sepse',
  },
];

// ─── Preventive Screening Guidelines ────────────────────────────────────────

interface ScreeningGuideline {
  screening: string;
  frequency: string;
  guideline: string;
  applicableGender?: 'M' | 'F';
  minAge?: number;
  maxAge?: number;
  conditions?: RegExp[];
}

const SCREENING_GUIDELINES: ScreeningGuideline[] = [
  { screening: 'Mamografia', frequency: 'Anual a partir dos 40 anos (SBM) ou bienal 50-69 (MS)', guideline: 'MS/INCA 2023 + SBM 2023', applicableGender: 'F', minAge: 40, maxAge: 74 },
  { screening: 'Papanicolau', frequency: 'A cada 3 anos (25-64 anos)', guideline: 'MS/INCA 2023', applicableGender: 'F', minAge: 25, maxAge: 64 },
  { screening: 'Colonoscopia', frequency: 'A cada 10 anos (45-75 anos) ou a cada 5 anos se risco aumentado', guideline: 'ACS 2023 / SBG 2022', minAge: 45, maxAge: 75 },
  { screening: 'PSA + Toque retal', frequency: 'Anual a partir dos 50 anos (ou 45 se afrodescendente/historico familiar)', guideline: 'SBU 2023', applicableGender: 'M', minAge: 50 },
  { screening: 'HbA1c (rastreio DM2)', frequency: 'A cada 3 anos se IMC >= 25 e >= 45 anos', guideline: 'ADA 2024 / SBD 2023', minAge: 45 },
  { screening: 'Perfil lipidico', frequency: 'A cada 5 anos (adultos). Anual se fatores de risco', guideline: 'SBC 2022', minAge: 20 },
  { screening: 'Densitometria ossea', frequency: 'A cada 2 anos (mulheres >= 65 ou pos-menopausa com fatores de risco)', guideline: 'ISCD 2023', applicableGender: 'F', minAge: 65 },
  { screening: 'Rastreio de cancer colorretal (SOF)', frequency: 'Anual (50-75 anos) como alternativa a colonoscopia', guideline: 'MS 2023', minAge: 50, maxAge: 75 },
  { screening: 'Funcao tireoidiana (TSH)', frequency: 'A cada 5 anos em mulheres >= 35 anos', guideline: 'ATA 2022', applicableGender: 'F', minAge: 35 },
  { screening: 'Rastreio de aneurisma de aorta abdominal (USG)', frequency: 'Uma vez entre 65-75 anos em homens tabagistas', guideline: 'USPSTF 2022', applicableGender: 'M', minAge: 65, maxAge: 75 },
  { screening: 'Vacina Influenza', frequency: 'Anual (todos >= 6 meses, prioridade >= 60 anos)', guideline: 'PNI/MS 2024', minAge: 60 },
  { screening: 'Vacina Pneumococica (Pneumo23/13)', frequency: 'Dose unica >= 65 anos ou condicoes especiais', guideline: 'PNI/MS 2024', minAge: 65 },
];

// ─── Service Implementation ─────────────────────────────────────────────────

@Injectable()
export class ClinicalAiService {
  private readonly logger = new Logger(ClinicalAiService.name);

  /**
   * Generate clinical insights for a patient based on demographics, conditions, medications, and labs
   */
  async getClinicalInsights(
    patientId: string,
    tenantId: string,
    patientData?: {
      age?: number;
      gender?: string;
      conditions?: string[];
      medications?: string[];
      allergies?: string[];
      lastLabResults?: Array<{ name: string; value: number; unit: string; date?: string }>;
      lastScreenings?: Array<{ type: string; date: string }>;
    },
  ): Promise<{
    patientId: string;
    tenantId: string;
    insights: ClinicalInsight[];
    preventiveScreenings: PreventiveScreeningRecommendation[];
    criticalLabAlerts: CriticalLabAlert[];
    generatedAt: string;
  }> {
    this.logger.log(`Generating clinical insights for patient ${patientId}`);
    const insights: ClinicalInsight[] = [];
    const criticalLabAlerts: CriticalLabAlert[] = [];

    if (patientData) {
      // Check drug interactions
      if (patientData.medications && patientData.medications.length > 1) {
        const interactionResult = this.checkDrugInteractions(
          patientData.medications,
          patientData.allergies ?? [],
        );
        for (const interaction of interactionResult.interactions) {
          insights.push({
            type: 'WARNING',
            category: 'DRUG_INTERACTION',
            title: `Interacao: ${interaction.drug1} x ${interaction.drug2}`,
            description: interaction.clinicalEffect,
            severity: interaction.severity === 'CRITICAL' ? 'CRITICAL' : interaction.severity === 'MAJOR' ? 'HIGH' : 'MEDIUM',
            source: interaction.reference,
            actionable: true,
            suggestedAction: interaction.management,
            confidence: 0.95,
          });
        }
        for (const conflict of interactionResult.allergyConflicts) {
          insights.push({
            type: 'WARNING',
            category: 'ALLERGY_CONFLICT',
            title: `Alergia: ${conflict.medication} — paciente alergico a ${conflict.allergen}`,
            description: `Reatividade cruzada: ${conflict.crossReactivity ? 'SIM' : 'NAO'}`,
            severity: 'CRITICAL',
            source: 'Base de reatividade cruzada',
            actionable: true,
            suggestedAction: `Alternativa: ${conflict.alternative}`,
            confidence: 0.92,
          });
        }
        for (const dup of interactionResult.duplicateTherapy) {
          insights.push({
            type: 'WARNING',
            category: 'DUPLICATE_THERAPY',
            title: `Duplicidade terapeutica: ${dup.therapeuticClass}`,
            description: `Medicamentos: ${dup.medications.join(', ')}`,
            severity: 'MEDIUM',
            source: 'Analise de classe terapeutica',
            actionable: true,
            suggestedAction: dup.recommendation,
            confidence: 0.90,
          });
        }
      }

      // Check critical lab values
      if (patientData.lastLabResults) {
        for (const lab of patientData.lastLabResults) {
          const alerts = this.checkCriticalLabValue(lab.name, lab.value, lab.unit);
          criticalLabAlerts.push(...alerts);
          for (const alert of alerts) {
            insights.push({
              type: 'WARNING',
              category: 'CRITICAL_LAB',
              title: `${alert.labName}: ${alert.value} ${alert.unit} (${alert.severity})`,
              description: alert.clinicalSignificance,
              severity: alert.severity === 'PANIC' ? 'CRITICAL' : alert.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              source: 'Valores criticos laboratoriais',
              actionable: true,
              suggestedAction: alert.suggestedAction,
              confidence: 0.98,
            });
          }
        }
      }

      // Check preventive screenings for this patient
      if (patientData.conditions) {
        // Condition-specific reminders
        const conditionsText = patientData.conditions.join(' ').toLowerCase();
        if (conditionsText.match(/diabetes|dm2|dm1/i)) {
          insights.push({
            type: 'REMINDER',
            category: 'CHRONIC_DISEASE_MANAGEMENT',
            title: 'Controle de Diabetes — verificar HbA1c',
            description: 'Paciente diabetico deve ter HbA1c monitorada a cada 3-6 meses',
            severity: 'MEDIUM',
            source: 'ADA Standards of Care 2024 / SBD 2023',
            actionable: true,
            suggestedAction: 'Solicitar HbA1c se ultimo resultado > 3 meses. Alvo: < 7% (individualizar)',
            confidence: 0.90,
          });
          insights.push({
            type: 'REMINDER',
            category: 'CHRONIC_DISEASE_MANAGEMENT',
            title: 'Rastreio complicacoes DM — fundo de olho',
            description: 'Exame de fundo de olho anual para rastreio de retinopatia diabetica',
            severity: 'MEDIUM',
            source: 'ADA 2024',
            actionable: true,
            suggestedAction: 'Encaminhar oftalmologia para fundoscopia dilatada',
            confidence: 0.88,
          });
        }
        if (conditionsText.match(/hipertens|has/i)) {
          insights.push({
            type: 'INFO',
            category: 'CHRONIC_DISEASE_MANAGEMENT',
            title: 'Meta pressoria',
            description: 'Alvo PA < 130/80 mmHg para maioria dos hipertensos (< 140/90 em idosos frageis)',
            severity: 'LOW',
            source: 'Diretriz Brasileira de Hipertensao Arterial — SBC 2020',
            actionable: false,
            confidence: 0.85,
          });
        }
        if (conditionsText.match(/fibrilacao atrial|fa /i) && patientData.age && patientData.age >= 65) {
          insights.push({
            type: 'SUGGESTION',
            category: 'ANTICOAGULATION',
            title: 'Avaliar anticoagulacao em FA',
            description: 'Paciente com FA e idade >= 65 — calcular CHA2DS2-VASc para indicacao de anticoagulacao',
            severity: 'HIGH',
            source: 'ESC Guidelines on AF 2024',
            actionable: true,
            suggestedAction: 'Calcular CHA2DS2-VASc. Se >= 2 (homem) ou >= 3 (mulher): anticoagulacao indicada',
            confidence: 0.92,
          });
        }
        if (conditionsText.match(/insuficiencia cardiaca|ic /i)) {
          insights.push({
            type: 'REMINDER',
            category: 'CHRONIC_DISEASE_MANAGEMENT',
            title: 'Pilares do tratamento de IC',
            description: 'Verificar se paciente esta em uso dos 4 pilares: IECA/BRA/ARNI + BB + antialdosteronico + iSGLT2',
            severity: 'HIGH',
            source: 'ESC/SBC Guidelines on HF 2023',
            actionable: true,
            suggestedAction: 'Revisar prescricao: sacubitril/valsartana + carvedilol/bisoprolol + espironolactona + dapagliflozina/empagliflozina',
            confidence: 0.88,
          });
        }
      }

      // Elderly-specific insights
      if (patientData.age && patientData.age >= 65) {
        // Beers criteria check
        const beersMeds = this.checkBeersCriteria(patientData.medications ?? [], patientData.age);
        for (const beers of beersMeds) {
          insights.push({
            type: 'WARNING',
            category: 'BEERS_CRITERIA',
            title: `Criterios de Beers: ${beers.medication}`,
            description: beers.reason,
            severity: 'MEDIUM',
            source: 'AGS Beers Criteria 2023',
            actionable: true,
            suggestedAction: beers.alternative,
            confidence: 0.88,
          });
        }
      }
    }

    // Preventive screenings
    const preventiveScreenings = this.getPreventiveScreenings(
      patientData?.age,
      patientData?.gender,
      patientData?.conditions,
      patientData?.lastScreenings,
    );

    return {
      patientId,
      tenantId,
      insights: insights.sort((a, b) => {
        const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
      }),
      preventiveScreenings,
      criticalLabAlerts,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze specific clinical data types for a patient
   */
  async analyzeClinicalData(
    patientId: string,
    dataType: string,
    tenantId: string,
    data?: Record<string, unknown>,
  ): Promise<ClinicalAnalysisResult> {
    this.logger.log(`Analyzing ${dataType} for patient ${patientId}`);

    const findings: ClinicalFinding[] = [];
    const riskFactors: RiskFactor[] = [];
    const recommendations: string[] = [];
    const qualityGaps: QualityGap[] = [];

    if (dataType === 'cardiovascular' && data) {
      const age = Number(data['age'] ?? 50);
      const sbp = Number(data['systolicBP'] ?? 120);
      const dbp = Number(data['diastolicBP'] ?? 80);
      const totalChol = Number(data['totalCholesterol'] ?? 200);
      const ldl = Number(data['ldl'] ?? 100);
      const hdl = Number(data['hdl'] ?? 50);
      const smoker = Boolean(data['smoker']);
      const diabetic = Boolean(data['diabetic']);

      // Blood pressure assessment
      if (sbp >= 180 || dbp >= 110) {
        findings.push({ finding: `PA ${sbp}/${dbp} mmHg — Hipertensao estagio 3 (crise hipertensiva)`, significance: 'CRITICAL', context: 'Necessita tratamento imediato' });
      } else if (sbp >= 160 || dbp >= 100) {
        findings.push({ finding: `PA ${sbp}/${dbp} mmHg — Hipertensao estagio 2`, significance: 'ABNORMAL', context: 'Considerar terapia combinada' });
      } else if (sbp >= 140 || dbp >= 90) {
        findings.push({ finding: `PA ${sbp}/${dbp} mmHg — Hipertensao estagio 1`, significance: 'ABNORMAL', context: 'Iniciar monoterapia + MEV' });
      } else if (sbp >= 130 || dbp >= 85) {
        findings.push({ finding: `PA ${sbp}/${dbp} mmHg — Pre-hipertensao`, significance: 'BORDERLINE', context: 'Mudancas de estilo de vida. Tratar se DM ou DRC' });
      }

      // Lipid assessment
      if (ldl > 190) {
        findings.push({ finding: `LDL ${ldl} mg/dL — muito elevado`, significance: 'CRITICAL', context: 'Indicacao absoluta de estatina de alta potencia' });
        recommendations.push('Iniciar atorvastatina 40-80mg ou rosuvastatina 20-40mg');
      } else if (ldl > 160) {
        findings.push({ finding: `LDL ${ldl} mg/dL — elevado`, significance: 'ABNORMAL', context: 'Estatina indicada se risco CV moderado/alto' });
      }
      if (hdl < 40) {
        findings.push({ finding: `HDL ${hdl} mg/dL — baixo`, significance: 'ABNORMAL', context: 'Fator de risco cardiovascular independente' });
      }

      // Risk factors
      if (age > 55) riskFactors.push({ factor: 'Idade > 55 anos', level: 'MODERATE', modifiable: false });
      if (smoker) riskFactors.push({ factor: 'Tabagismo ativo', level: 'HIGH', modifiable: true, intervention: 'Cessacao tabagica — vareniclina/bupropiona + aconselhamento' });
      if (diabetic) riskFactors.push({ factor: 'Diabetes mellitus', level: 'HIGH', modifiable: true, intervention: 'Controle glicemico — alvo HbA1c < 7%' });
      if (totalChol > 240) riskFactors.push({ factor: `Colesterol total ${totalChol} mg/dL`, level: 'HIGH', modifiable: true, intervention: 'Estatina + dieta hipolipidica' });

      // Framingham simplified risk estimate
      let framinghamScore = 0;
      if (age >= 45) framinghamScore += 2;
      if (age >= 55) framinghamScore += 2;
      if (sbp >= 140) framinghamScore += 2;
      if (smoker) framinghamScore += 2;
      if (diabetic) framinghamScore += 2;
      if (totalChol >= 240) framinghamScore += 1;
      if (hdl < 40) framinghamScore += 1;

      const riskPercent = Math.min(30, framinghamScore * 2.5);
      findings.push({
        finding: `Risco cardiovascular estimado em 10 anos: ${riskPercent.toFixed(0)}%`,
        significance: riskPercent >= 20 ? 'CRITICAL' : riskPercent >= 10 ? 'ABNORMAL' : riskPercent >= 5 ? 'BORDERLINE' : 'NORMAL',
        context: `Baseado em idade, PA, colesterol, tabagismo, DM (Framingham simplificado)`,
      });
    }

    if (dataType === 'renal' && data) {
      const creatinine = Number(data['creatinine'] ?? 1.0);
      const age = Number(data['age'] ?? 50);
      const isFemale = data['gender'] === 'F';

      // CKD-EPI calculation (simplified)
      const tfg = this.calculateCKDEPI(creatinine, age, isFemale);
      let stage = '';
      let significance: ClinicalFinding['significance'] = 'NORMAL';

      if (tfg >= 90) { stage = 'G1 (normal)'; significance = 'NORMAL'; }
      else if (tfg >= 60) { stage = 'G2 (leve)'; significance = 'BORDERLINE'; }
      else if (tfg >= 45) { stage = 'G3a (leve-moderada)'; significance = 'ABNORMAL'; }
      else if (tfg >= 30) { stage = 'G3b (moderada-grave)'; significance = 'ABNORMAL'; }
      else if (tfg >= 15) { stage = 'G4 (grave)'; significance = 'CRITICAL'; }
      else { stage = 'G5 (falencia renal)'; significance = 'CRITICAL'; }

      findings.push({ finding: `TFG estimada (CKD-EPI): ${tfg.toFixed(0)} mL/min/1.73m² — DRC ${stage}`, significance, context: `Creatinina: ${creatinine} mg/dL` });

      if (tfg < 60) {
        recommendations.push('Encaminhar nefrologia');
        recommendations.push('Evitar medicamentos nefrotoxicos (AINEs, aminoglicosideos, contraste)');
        recommendations.push('Ajustar doses de medicamentos de excrecao renal');
      }
      if (tfg < 30) {
        recommendations.push('Avaliar preparacao para terapia renal substitutiva');
        recommendations.push('Restringir potassio e fosforo na dieta');
      }
    }

    return {
      patientId,
      dataType,
      findings,
      riskFactors,
      recommendations,
      qualityGaps,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Check drug interactions between a list of medications
   */
  checkDrugInteractions(
    medications: string[],
    allergies: string[],
  ): DrugInteractionCheckResult {
    const interactions: DrugInteraction[] = [];
    const allergyConflicts: AllergyConflict[] = [];
    const duplicateTherapy: DuplicateTherapyWarning[] = [];

    // Check pairwise interactions
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];
        for (const rule of DRUG_INTERACTIONS) {
          const match1 = rule.drug1Patterns.some(p => p.test(med1)) && rule.drug2Patterns.some(p => p.test(med2));
          const match2 = rule.drug1Patterns.some(p => p.test(med2)) && rule.drug2Patterns.some(p => p.test(med1));
          if (match1 || match2) {
            interactions.push({
              drug1: med1,
              drug2: med2,
              severity: rule.severity,
              mechanism: rule.mechanism,
              clinicalEffect: rule.clinicalEffect,
              management: rule.management,
              reference: rule.reference,
            });
          }
        }
      }
    }

    // Check allergy cross-reactivity
    for (const allergy of allergies) {
      for (const med of medications) {
        for (const rule of ALLERGY_CROSS_REACTIVITY) {
          const allergyMatch = rule.allergenPatterns.some(p => p.test(allergy));
          const medMatch = rule.crossReactivePatterns.some(p => p.test(med));
          if (allergyMatch && medMatch) {
            // Check it's not the same allergen/med (e.g., allergic to amoxicilina AND prescribed amoxicilina)
            allergyConflicts.push({
              medication: med,
              allergen: allergy,
              crossReactivity: true,
              severity: 'CRITICAL',
              alternative: rule.alternative,
            });
          }
        }
      }
    }

    // Check duplicate therapeutic classes
    const classMap = new Map<string, string[]>();
    for (const med of medications) {
      for (const tc of THERAPEUTIC_CLASSES) {
        if (tc.patterns.some(p => p.test(med))) {
          const existing = classMap.get(tc.className) ?? [];
          existing.push(med);
          classMap.set(tc.className, existing);
        }
      }
    }
    for (const [className, meds] of classMap) {
      if (meds.length > 1) {
        duplicateTherapy.push({
          medications: meds,
          therapeuticClass: className,
          recommendation: `Multiplos ${className} prescritos (${meds.join(', ')}). Avaliar necessidade de combinacao.`,
        });
      }
    }

    const hasAny = interactions.length > 0 || allergyConflicts.length > 0;

    return {
      safe: !hasAny,
      interactions: interactions.sort((a, b) => {
        const sevOrder = { CRITICAL: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
        return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
      }),
      allergyConflicts,
      doseWarnings: [],
      duplicateTherapy,
    };
  }

  /**
   * Check a lab value against critical ranges
   */
  checkCriticalLabValue(labName: string, value: number, unit: string): CriticalLabAlert[] {
    const alerts: CriticalLabAlert[] = [];

    for (const range of CRITICAL_LAB_RANGES) {
      if (!range.labNamePatterns.some(p => p.test(labName))) continue;

      // Check panic values first
      if (range.panicLow !== undefined && value < range.panicLow) {
        alerts.push({
          labName: range.displayName, value, unit: unit || range.unit,
          normalRange: range.normalRange, severity: 'PANIC',
          clinicalSignificance: range.clinicalSignificanceLow,
          suggestedAction: range.actionLow,
        });
      } else if (range.panicHigh !== undefined && value > range.panicHigh) {
        alerts.push({
          labName: range.displayName, value, unit: unit || range.unit,
          normalRange: range.normalRange, severity: 'PANIC',
          clinicalSignificance: range.clinicalSignificanceHigh,
          suggestedAction: range.actionHigh,
        });
      } else if (range.criticalLow !== undefined && value < range.criticalLow) {
        alerts.push({
          labName: range.displayName, value, unit: unit || range.unit,
          normalRange: range.normalRange, severity: 'CRITICAL',
          clinicalSignificance: range.clinicalSignificanceLow,
          suggestedAction: range.actionLow,
        });
      } else if (range.criticalHigh !== undefined && value > range.criticalHigh) {
        alerts.push({
          labName: range.displayName, value, unit: unit || range.unit,
          normalRange: range.normalRange, severity: 'CRITICAL',
          clinicalSignificance: range.clinicalSignificanceHigh,
          suggestedAction: range.actionHigh,
        });
      } else if (range.warningLow !== undefined && value < range.warningLow) {
        alerts.push({
          labName: range.displayName, value, unit: unit || range.unit,
          normalRange: range.normalRange, severity: 'WARNING',
          clinicalSignificance: range.clinicalSignificanceLow,
          suggestedAction: range.actionLow,
        });
      } else if (range.warningHigh !== undefined && value > range.warningHigh) {
        alerts.push({
          labName: range.displayName, value, unit: unit || range.unit,
          normalRange: range.normalRange, severity: 'WARNING',
          clinicalSignificance: range.clinicalSignificanceHigh,
          suggestedAction: range.actionHigh,
        });
      }
    }

    return alerts;
  }

  /**
   * Get preventive screening recommendations based on patient demographics
   */
  getPreventiveScreenings(
    age?: number,
    gender?: string,
    conditions?: string[],
    lastScreenings?: Array<{ type: string; date: string }>,
  ): PreventiveScreeningRecommendation[] {
    if (!age) return [];

    const recommendations: PreventiveScreeningRecommendation[] = [];
    const now = new Date();

    for (const guideline of SCREENING_GUIDELINES) {
      // Age filter
      if (guideline.minAge !== undefined && age < guideline.minAge) continue;
      if (guideline.maxAge !== undefined && age > guideline.maxAge) continue;

      // Gender filter
      if (guideline.applicableGender && guideline.applicableGender !== gender) continue;

      // Condition filter
      if (guideline.conditions) {
        const conditionsText = (conditions ?? []).join(' ').toLowerCase();
        if (!guideline.conditions.some(c => c.test(conditionsText))) continue;
      }

      // Check if screening was recently performed
      const lastDone = lastScreenings?.find(s =>
        s.type.toLowerCase().includes(guideline.screening.toLowerCase().split(' ')[0]),
      );

      let priority: PreventiveScreeningRecommendation['priority'] = 'ROUTINE';
      if (lastDone) {
        const lastDate = new Date(lastDone.date);
        const monthsSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSince > 24) priority = 'OVERDUE';
      } else {
        priority = 'OVERDUE';
      }

      recommendations.push({
        screening: guideline.screening,
        frequency: guideline.frequency,
        lastPerformed: lastDone?.date,
        guideline: guideline.guideline,
        priority,
      });
    }

    return recommendations;
  }

  /**
   * Beers Criteria check for elderly patients
   */
  private checkBeersCriteria(
    medications: string[],
    age: number,
  ): Array<{ medication: string; reason: string; alternative: string }> {
    if (age < 65) return [];

    const beersRules: Array<{ pattern: RegExp; reason: string; alternative: string }> = [
      { pattern: /diazepam|clonazepam|alprazolam|lorazepam|bromazepam/i, reason: 'Benzodiazepinicos em idosos: aumento de risco de quedas, fraturas, delirium e comprometimento cognitivo', alternative: 'Trazodona (insonia), ISRS (ansiedade), terapia nao farmacologica' },
      { pattern: /amitriptilina|imipramina|nortriptilina|clomipramina/i, reason: 'Antidepressivos triciclicos em idosos: efeitos anticolinergicos (confusao, retencao urinaria, constipacao, hipotensao ortostatica)', alternative: 'ISRS (sertralina, escitalopram) ou mirtazapina' },
      { pattern: /hidroxizina|prometazina|dimenidrinato/i, reason: 'Anti-histaminicos de 1a geracao: efeitos anticolinergicos, sedacao excessiva em idosos', alternative: 'Loratadina, cetirizina (2a geracao), ondansetrona (nausea)' },
      { pattern: /glibenclamida|clorpropamida/i, reason: 'Sulfoniluréias de longa acao em idosos: risco de hipoglicemia prolongada', alternative: 'Metformina (1a linha), glicazida MR, iDPP4, iSGLT2' },
      { pattern: /digoxina/i, reason: 'Digoxina em idosos: janela terapeutica estreita, risco de intoxicacao (especialmente com DRC)', alternative: 'Manter dose <= 0.125mg/dia. Monitorar nivel serico (0.5-0.9 ng/mL)' },
      { pattern: /ibuprofeno|naproxeno|diclofenaco|cetoprofeno|piroxicam|meloxicam/i, reason: 'AINEs em idosos: risco GI (ulcera, sangramento), renal (IRA) e cardiovascular', alternative: 'Paracetamol. Se AINE necessario: celecoxibe em menor dose e menor duracao + IBP' },
      { pattern: /nitrofurantoina/i, reason: 'Nitrofurantoina em idosos com TFG < 30: neuropatia periferica, toxicidade pulmonar', alternative: 'Fosfomicina (ITU nao complicada) ou cefalexina' },
      { pattern: /carisoprodol|ciclobenzaprina|orfenadrina/i, reason: 'Relaxantes musculares em idosos: efeitos anticolinergicos, sedacao, risco de quedas', alternative: 'Terapia fisica, calor local, paracetamol' },
      { pattern: /metoclopramida|plasil/i, reason: 'Metoclopramida em idosos: risco de efeitos extrapiramidais, discinesia tardia', alternative: 'Ondansetrona, domperidona (menor risco SNC)' },
    ];

    const results: Array<{ medication: string; reason: string; alternative: string }> = [];

    for (const med of medications) {
      for (const rule of beersRules) {
        if (rule.pattern.test(med)) {
          results.push({ medication: med, reason: rule.reason, alternative: rule.alternative });
          break;
        }
      }
    }

    return results;
  }

  /**
   * CKD-EPI formula for estimated GFR
   */
  private calculateCKDEPI(creatinine: number, age: number, isFemale: boolean): number {
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const femaleFactor = isFemale ? 1.012 : 1.0;

    const crRatio = creatinine / kappa;
    const minCrRatio = Math.min(crRatio, 1);
    const maxCrRatio = Math.max(crRatio, 1);

    const tfg = 142 * Math.pow(minCrRatio, alpha) * Math.pow(maxCrRatio, -1.2) * Math.pow(0.9938, age) * femaleFactor;
    return Math.round(tfg * 10) / 10;
  }
}
