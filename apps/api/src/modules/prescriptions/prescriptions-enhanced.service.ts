import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrescriptionType } from '@prisma/client';
import {
  FDAPregnancyCategory,
  LactationSafety,
  type CreateMedicationReconciliationDto,
  type CreateDischargeReconciliationDto,
  type CreateAntimicrobialStewardshipDto,
  type CalculateNPTDto,
  type CreatePCAProtocolDto,
} from './dto/prescriptions-enhanced.dto';

// ─── Order Set Interfaces ──────────────────────────────────────────────────

export interface OrderSetMedication {
  medicationName: string;
  activeIngredient: string;
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration?: string;
  durationUnit?: string;
  dilution?: string;
  dilutionVolume?: string;
  dilutionSolution?: string;
  infusionRate?: string;
  infusionRateUnit?: string;
  specialInstructions?: string;
  isHighAlert?: boolean;
  isAntibiotic?: boolean;
  sortOrder: number;
}

export interface OrderSet {
  id: string;
  name: string;
  description: string;
  category: string;
  medications: OrderSetMedication[];
}

// ─── Renal / Hepatic Interfaces ────────────────────────────────────────────

export interface RenalCalculationResult {
  cockcroftGault: number;
  ckdEpi: number;
  stage: string;
  alerts: string[];
}

export interface ChildPughInput {
  ascites: 'NONE' | 'MILD' | 'MODERATE_SEVERE';
  encephalopathy: 'NONE' | 'GRADE_1_2' | 'GRADE_3_4';
  bilirubinMgDl: number;
  albuminGDl: number;
  inr: number;
}

export interface ChildPughResult {
  score: number;
  classification: 'A' | 'B' | 'C';
  description: string;
  alerts: string[];
}

// ─── Infusion Pump Interfaces ──────────────────────────────────────────────

export interface InfusionPumpData {
  pumpBrand: 'ALARIS' | 'BBRAUN' | 'BAXTER';
  medication: string;
  totalDoseMg: number;
  diluentVolumeMl: number;
  prescribedRateMgH: number;
  concentrationMgMl: number;
  rateMlH: number;
  vtbiMl: number;
  estimatedDurationH: number;
  alerts: string[];
}

// ─── AI Interfaces ─────────────────────────────────────────────────────────

export interface CultureBasedRecommendation {
  organism: string;
  sensitivities: Array<{ antibiotic: string; mic: string; interpretation: 'S' | 'I' | 'R' }>;
  recommendedAntibiotic: string;
  recommendedDose: string;
  recommendedDuration: string;
  reasoning: string;
  deEscalationSuggestion?: string;
  alerts: string[];
}

export interface AdverseEffectPrediction {
  medication: string;
  riskFactors: string[];
  predictions: Array<{
    adverseEffect: string;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
    probability: number;
    reasoning: string;
    mitigationStrategy: string;
  }>;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH';
  alerts: string[];
}

// ─── PCA Activation Interface ──────────────────────────────────────────────

export interface PCAActivation {
  prescriptionItemId: string;
  activatedAt: Date;
  doseDelivered: number;
  doseUnit: string;
  wasLocked: boolean;
  painScoreBefore?: number;
  painScoreAfter?: number;
}

// ─── Order Sets Database ───────────────────────────────────────────────────

const ORDER_SETS_DB: OrderSet[] = [
  {
    id: 'os-iam',
    name: 'Admissão IAM',
    description: 'Protocolo de admissão para Infarto Agudo do Miocárdio',
    category: 'CARDIOLOGY',
    medications: [
      { medicationName: 'AAS', activeIngredient: 'Ácido acetilsalicílico', dose: '300', doseUnit: 'mg', route: 'VO', frequency: 'Dose única (ataque)', specialInstructions: 'Mastigar comprimido', sortOrder: 0 },
      { medicationName: 'AAS', activeIngredient: 'Ácido acetilsalicílico', dose: '100', doseUnit: 'mg', route: 'VO', frequency: '1x/dia', specialInstructions: 'Manutenção diária', sortOrder: 1 },
      { medicationName: 'Clopidogrel', activeIngredient: 'Clopidogrel', dose: '300', doseUnit: 'mg', route: 'VO', frequency: 'Dose única (ataque)', sortOrder: 2 },
      { medicationName: 'Clopidogrel', activeIngredient: 'Clopidogrel', dose: '75', doseUnit: 'mg', route: 'VO', frequency: '1x/dia', specialInstructions: 'Manutenção diária', sortOrder: 3 },
      { medicationName: 'Enoxaparina', activeIngredient: 'Enoxaparina sódica', dose: '1', doseUnit: 'mg/kg', route: 'SC', frequency: '12/12h', isHighAlert: true, sortOrder: 4 },
      { medicationName: 'Atorvastatina', activeIngredient: 'Atorvastatina cálcica', dose: '80', doseUnit: 'mg', route: 'VO', frequency: '1x/dia', sortOrder: 5 },
      { medicationName: 'Metoprolol', activeIngredient: 'Tartarato de metoprolol', dose: '25', doseUnit: 'mg', route: 'VO', frequency: '12/12h', specialInstructions: 'Se FC > 60 e PAS > 100', sortOrder: 6 },
      { medicationName: 'Morfina', activeIngredient: 'Sulfato de morfina', dose: '2', doseUnit: 'mg', route: 'IV', frequency: 'SOS', specialInstructions: 'Se dor precordial persistente. Diluir em 8mL SF.', isHighAlert: true, sortOrder: 7 },
      { medicationName: 'Nitroglicerina', activeIngredient: 'Nitroglicerina', dose: '5', doseUnit: 'mcg/min', route: 'IV', frequency: 'Contínuo', infusionRate: '5', infusionRateUnit: 'mcg/min', specialInstructions: 'Titular até alívio da dor. Máx 200mcg/min.', isHighAlert: true, sortOrder: 8 },
    ],
  },
  {
    id: 'os-colecistectomia',
    name: 'Pós-op Colecistectomia',
    description: 'Prescrição pós-operatória para colecistectomia videolaparoscópica',
    category: 'SURGERY',
    medications: [
      { medicationName: 'Dipirona', activeIngredient: 'Dipirona sódica', dose: '1', doseUnit: 'g', route: 'IV', frequency: '6/6h', dilution: 'Diluir em 100mL', dilutionSolution: 'SF 0,9%', sortOrder: 0 },
      { medicationName: 'Tramadol', activeIngredient: 'Cloridrato de tramadol', dose: '100', doseUnit: 'mg', route: 'IV', frequency: 'SOS', specialInstructions: 'Se dor moderada/intensa (EVA >= 5). Diluir em 100mL SF.', dilution: 'Diluir em 100mL', dilutionSolution: 'SF 0,9%', sortOrder: 1 },
      { medicationName: 'Ondansetrona', activeIngredient: 'Cloridrato de ondansetrona', dose: '8', doseUnit: 'mg', route: 'IV', frequency: '8/8h', specialInstructions: 'Se náusea ou vômitos', sortOrder: 2 },
      { medicationName: 'Omeprazol', activeIngredient: 'Omeprazol sódico', dose: '40', doseUnit: 'mg', route: 'IV', frequency: '1x/dia', specialInstructions: 'Em jejum', sortOrder: 3 },
      { medicationName: 'Enoxaparina', activeIngredient: 'Enoxaparina sódica', dose: '40', doseUnit: 'mg', route: 'SC', frequency: '1x/dia', specialInstructions: 'Profilaxia TVP. Iniciar 8h pós-op.', isHighAlert: true, sortOrder: 4 },
      { medicationName: 'Cefazolina', activeIngredient: 'Cefazolina sódica', dose: '1', doseUnit: 'g', route: 'IV', frequency: 'Dose única', specialInstructions: 'Profilaxia antibiótica. Dose intra-op.', isAntibiotic: true, sortOrder: 5 },
    ],
  },
  {
    id: 'os-cad',
    name: 'Cetoacidose Diabética',
    description: 'Protocolo de tratamento da cetoacidose diabética (CAD)',
    category: 'ENDOCRINOLOGY',
    medications: [
      { medicationName: 'SF 0,9%', activeIngredient: 'Cloreto de sódio 0,9%', dose: '1000', doseUnit: 'mL', route: 'IV', frequency: '1ª hora', infusionRate: '1000', infusionRateUnit: 'mL/h', specialInstructions: 'Reposição volêmica inicial', sortOrder: 0 },
      { medicationName: 'SF 0,9%', activeIngredient: 'Cloreto de sódio 0,9%', dose: '500', doseUnit: 'mL', route: 'IV', frequency: 'Contínuo', infusionRate: '250-500', infusionRateUnit: 'mL/h', specialInstructions: 'Manutenção: ajustar conforme débito urinário e hemodinâmica', sortOrder: 1 },
      { medicationName: 'Insulina Regular', activeIngredient: 'Insulina humana regular', dose: '0.1', doseUnit: 'UI/kg/h', route: 'IV', frequency: 'Contínuo', specialInstructions: 'BIC: 100UI em 100mL SF. Glicemia capilar 1/1h. Reduzir para 0,05UI/kg/h quando glicose < 200mg/dL.', isHighAlert: true, sortOrder: 2 },
      { medicationName: 'KCl 19,1%', activeIngredient: 'Cloreto de potássio', dose: '20', doseUnit: 'mEq', route: 'IV', frequency: 'Conforme K+', specialInstructions: 'Se K+ 3,3-5,3: 20-40mEq/L de soro. Se K+ < 3,3: corrigir antes de iniciar insulina.', isHighAlert: true, sortOrder: 3 },
      { medicationName: 'SG 5%', activeIngredient: 'Soro glicosado 5%', dose: '500', doseUnit: 'mL', route: 'IV', frequency: 'Quando glicose < 200', specialInstructions: 'Associar ao SF quando glicemia < 200mg/dL', sortOrder: 4 },
    ],
  },
  {
    id: 'os-sepsis',
    name: 'Sepsis Bundle',
    description: 'Pacote de 1 hora da sepse (Surviving Sepsis Campaign 2021)',
    category: 'CRITICAL_CARE',
    medications: [
      { medicationName: 'Ringer Lactato', activeIngredient: 'Solução de Ringer Lactato', dose: '30', doseUnit: 'mL/kg', route: 'IV', frequency: 'Bolus', specialInstructions: 'Ressuscitação volêmica inicial. Avaliar responsividade a fluidos.', sortOrder: 0 },
      { medicationName: 'Ceftriaxona', activeIngredient: 'Ceftriaxona sódica', dose: '2', doseUnit: 'g', route: 'IV', frequency: '1x/dia', specialInstructions: 'Antibiótico empírico AMPLO. Coletar culturas ANTES. Iniciar na 1ª hora.', isAntibiotic: true, sortOrder: 1 },
      { medicationName: 'Metronidazol', activeIngredient: 'Metronidazol', dose: '500', doseUnit: 'mg', route: 'IV', frequency: '8/8h', specialInstructions: 'Cobertura anaeróbia se foco abdominal', isAntibiotic: true, sortOrder: 2 },
      { medicationName: 'Noradrenalina', activeIngredient: 'Norepinefrina', dose: '0.1', doseUnit: 'mcg/kg/min', route: 'IV', frequency: 'Contínuo', specialInstructions: 'Se PAM < 65mmHg após ressuscitação volêmica. Titular para PAM >= 65.', isHighAlert: true, sortOrder: 3 },
      { medicationName: 'Hidrocortisona', activeIngredient: 'Succinato sódico de hidrocortisona', dose: '50', doseUnit: 'mg', route: 'IV', frequency: '6/6h', specialInstructions: 'Se choque refratário a vasopressor (> 0,25mcg/kg/min de noradrenalina por > 4h)', sortOrder: 4 },
    ],
  },
  {
    id: 'os-avc',
    name: 'Admissão AVC',
    description: 'Protocolo de admissão para AVC isquêmico agudo',
    category: 'NEUROLOGY',
    medications: [
      { medicationName: 'Alteplase', activeIngredient: 'Alteplase', dose: '0.9', doseUnit: 'mg/kg', route: 'IV', frequency: 'Dose única', specialInstructions: '10% em bolus em 1 min, 90% restante em 60 min. Máx 90mg. Janela: até 4,5h do ictus.', isHighAlert: true, sortOrder: 0 },
      { medicationName: 'SF 0,9%', activeIngredient: 'Cloreto de sódio 0,9%', dose: '1000', doseUnit: 'mL', route: 'IV', frequency: 'Contínuo', infusionRate: '80', infusionRateUnit: 'mL/h', specialInstructions: 'Hidratação. Evitar SG (hiperglicemia piora prognóstico).', sortOrder: 1 },
      { medicationName: 'Labetalol', activeIngredient: 'Cloridrato de labetalol', dose: '10-20', doseUnit: 'mg', route: 'IV', frequency: 'SOS', specialInstructions: 'Se PA > 185/110 (pré-trombólise) ou > 180/105 (pós-trombólise)', sortOrder: 2 },
      { medicationName: 'AAS', activeIngredient: 'Ácido acetilsalicílico', dose: '100', doseUnit: 'mg', route: 'VO', frequency: '1x/dia', specialInstructions: 'Iniciar 24h após trombólise. Se contraindicação à trombólise: iniciar imediatamente.', sortOrder: 3 },
      { medicationName: 'Enoxaparina', activeIngredient: 'Enoxaparina sódica', dose: '40', doseUnit: 'mg', route: 'SC', frequency: '1x/dia', specialInstructions: 'Profilaxia TVP. Iniciar 24h após trombólise.', isHighAlert: true, sortOrder: 4 },
    ],
  },
];

// ─── Antibiogram Sensitivity Database (mock) ───────────────────────────────

const ANTIBIOGRAM_RECOMMENDATIONS: Record<string, {
  firstLine: { antibiotic: string; dose: string; duration: string; reasoning: string };
  alternatives: Array<{ antibiotic: string; dose: string; reasoning: string }>;
  deEscalation?: string;
}> = {
  'escherichia coli': {
    firstLine: { antibiotic: 'Ceftriaxona', dose: '1g IV 1x/dia', duration: '7-14 dias', reasoning: 'E. coli comunitária geralmente sensível a cefalosporinas de 3ª geração' },
    alternatives: [
      { antibiotic: 'Ciprofloxacino', dose: '400mg IV 12/12h', reasoning: 'Alternativa se alergia a cefalosporinas' },
      { antibiotic: 'Meropenem', dose: '1g IV 8/8h', reasoning: 'Reservar para ESBL-positivo' },
    ],
    deEscalation: 'Se sensível a ampicilina, desescalonar para ampicilina 1g IV 6/6h',
  },
  'staphylococcus aureus': {
    firstLine: { antibiotic: 'Oxacilina', dose: '2g IV 4/4h', duration: '14 dias (bacteremia simples) ou 4-6 semanas (endocardite)', reasoning: 'MSSA — oxacilina é primeira escolha' },
    alternatives: [
      { antibiotic: 'Vancomicina', dose: '15-20mg/kg IV 12/12h', reasoning: 'Para MRSA. Monitorar nível sérico (vale: 15-20mcg/mL)' },
      { antibiotic: 'Daptomicina', dose: '6-8mg/kg IV 1x/dia', reasoning: 'Alternativa para MRSA. Não usar para pneumonia.' },
    ],
    deEscalation: 'Se MSSA confirmado, trocar vancomicina para oxacilina',
  },
  'klebsiella pneumoniae': {
    firstLine: { antibiotic: 'Ceftriaxona', dose: '2g IV 1x/dia', duration: '7-14 dias', reasoning: 'Klebsiella comunitária sensível a cefalosporinas 3ª geração' },
    alternatives: [
      { antibiotic: 'Meropenem', dose: '1g IV 8/8h', reasoning: 'Para KPC ou ESBL-positivo' },
      { antibiotic: 'Piperacilina-Tazobactam', dose: '4,5g IV 6/6h', reasoning: 'Alternativa de espectro ampliado' },
    ],
    deEscalation: 'Desescalonar conforme antibiograma para o agente de menor espectro',
  },
  'pseudomonas aeruginosa': {
    firstLine: { antibiotic: 'Piperacilina-Tazobactam', dose: '4,5g IV 6/6h', duration: '10-14 dias', reasoning: 'Cobertura anti-pseudomonas. Considerar infusão estendida (4h).' },
    alternatives: [
      { antibiotic: 'Meropenem', dose: '1-2g IV 8/8h', reasoning: 'Infusão estendida (3h) para otimizar PK/PD' },
      { antibiotic: 'Ceftazidima', dose: '2g IV 8/8h', reasoning: 'Cefalosporina anti-pseudomonas' },
    ],
    deEscalation: 'Evitar manter carbapenêmico se sensível a beta-lactâmico de menor espectro',
  },
  'enterococcus faecalis': {
    firstLine: { antibiotic: 'Ampicilina', dose: '2g IV 4/4h', duration: '7-14 dias', reasoning: 'E. faecalis geralmente sensível a ampicilina' },
    alternatives: [
      { antibiotic: 'Vancomicina', dose: '15-20mg/kg IV 12/12h', reasoning: 'Se resistente a ampicilina' },
      { antibiotic: 'Linezolida', dose: '600mg IV/VO 12/12h', reasoning: 'Para VRE (Enterococcus resistente a vancomicina)' },
    ],
  },
};

// ─── Adverse Effect Database ───────────────────────────────────────────────

const ADVERSE_EFFECT_DB: Record<string, Array<{
  effect: string;
  baseRisk: number;
  riskFactors: Array<{ factor: string; multiplier: number }>;
  mitigation: string;
}>> = {
  'metformina': [
    { effect: 'Acidose láctica', baseRisk: 0.01, riskFactors: [{ factor: 'insuficiência renal', multiplier: 10 }, { factor: 'insuficiência hepática', multiplier: 5 }, { factor: 'idade > 80', multiplier: 3 }, { factor: 'uso de contraste iodado', multiplier: 8 }], mitigation: 'Monitorar função renal. Suspender 48h antes de contraste iodado.' },
    { effect: 'Diarreia/náusea', baseRisk: 0.25, riskFactors: [{ factor: 'dose alta inicial', multiplier: 2 }], mitigation: 'Iniciar com dose baixa e titular gradualmente. Tomar com refeições.' },
    { effect: 'Deficiência de vitamina B12', baseRisk: 0.1, riskFactors: [{ factor: 'uso prolongado > 4 anos', multiplier: 3 }], mitigation: 'Monitorar B12 anualmente. Suplementar se deficiente.' },
  ],
  'varfarina': [
    { effect: 'Sangramento maior', baseRisk: 0.03, riskFactors: [{ factor: 'idade > 75', multiplier: 3 }, { factor: 'insuficiência renal', multiplier: 2 }, { factor: 'uso concomitante de AINE', multiplier: 4 }, { factor: 'histórico de sangramento GI', multiplier: 5 }], mitigation: 'INR alvo 2-3. Monitorar semanalmente no início. Evitar AINEs.' },
    { effect: 'Necrose cutânea', baseRisk: 0.001, riskFactors: [{ factor: 'deficiência proteína C', multiplier: 50 }], mitigation: 'Iniciar com dose baixa. Associar heparina nos primeiros dias.' },
  ],
  'amiodarona': [
    { effect: 'Toxicidade pulmonar', baseRisk: 0.05, riskFactors: [{ factor: 'dose > 400mg/dia', multiplier: 3 }, { factor: 'uso > 2 anos', multiplier: 2 }], mitigation: 'Raio-X tórax semestral. DLCO anual. Reduzir dose se possível.' },
    { effect: 'Disfunção tireoidiana', baseRisk: 0.15, riskFactors: [{ factor: 'doença tireoidiana prévia', multiplier: 3 }], mitigation: 'TSH a cada 3-6 meses.' },
    { effect: 'Hepatotoxicidade', baseRisk: 0.1, riskFactors: [{ factor: 'hepatopatia prévia', multiplier: 4 }], mitigation: 'TGO/TGP a cada 3 meses.' },
    { effect: 'Neuropatia periférica', baseRisk: 0.05, riskFactors: [{ factor: 'diabetes', multiplier: 2 }, { factor: 'uso prolongado', multiplier: 2 }], mitigation: 'Avaliação neurológica periódica.' },
  ],
  'enalapril': [
    { effect: 'Hipercalemia', baseRisk: 0.05, riskFactors: [{ factor: 'insuficiência renal', multiplier: 4 }, { factor: 'uso de espironolactona', multiplier: 3 }, { factor: 'diabetes', multiplier: 2 }], mitigation: 'Monitorar potássio sérico. Evitar associação com outros poupadores de potássio.' },
    { effect: 'Tosse seca', baseRisk: 0.15, riskFactors: [{ factor: 'sexo feminino', multiplier: 2 }], mitigation: 'Trocar por BRA (losartana) se intolerável.' },
    { effect: 'Angioedema', baseRisk: 0.002, riskFactors: [{ factor: 'afrodescendente', multiplier: 5 }, { factor: 'angioedema prévio', multiplier: 50 }], mitigation: 'Orientar procurar emergência se edema de lábios/língua/glote.' },
  ],
  'ciprofloxacino': [
    { effect: 'Ruptura de tendão', baseRisk: 0.01, riskFactors: [{ factor: 'idade > 60', multiplier: 5 }, { factor: 'uso de corticoide', multiplier: 4 }, { factor: 'transplante renal', multiplier: 6 }], mitigation: 'Suspender se dor tendínea. Evitar em > 60 anos se alternativa disponível.' },
    { effect: 'Prolongamento QT', baseRisk: 0.02, riskFactors: [{ factor: 'uso de antiarrítmico', multiplier: 3 }, { factor: 'hipocalemia', multiplier: 4 }], mitigation: 'ECG basal. Corrigir eletrólitos.' },
    { effect: 'Neuropatia periférica', baseRisk: 0.01, riskFactors: [{ factor: 'diabetes', multiplier: 3 }], mitigation: 'Monitorar sintomas neurológicos.' },
  ],
};

// ─── Pregnancy Drug Classification (FDA Categories) ─────────────────────

const PREGNANCY_DRUG_DB: Record<string, {
  category: FDAPregnancyCategory;
  description: string;
  recommendation: string;
}> = {
  'metformina': { category: FDAPregnancyCategory.B, description: 'Estudos em animais não demonstraram risco fetal. Dados humanos limitados mas encorajadores.', recommendation: 'Pode ser utilizada na gestação sob supervisão. Preferir insulina para diabetes gestacional.' },
  'metformin': { category: FDAPregnancyCategory.B, description: 'No animal reproductive risk demonstrated. Limited but encouraging human data.', recommendation: 'May be used in pregnancy under supervision. Prefer insulin for gestational diabetes.' },
  'enalapril': { category: FDAPregnancyCategory.D, description: 'Inibidores da ECA causam oligoidrâmnio, insuficiência renal fetal e morte neonatal no 2º/3º trimestre.', recommendation: 'CONTRAINDICADO no 2º/3º trimestre. Trocar para metildopa ou nifedipino.' },
  'losartana': { category: FDAPregnancyCategory.D, description: 'BRAs causam toxicidade fetal semelhante aos IECAs.', recommendation: 'CONTRAINDICADO em toda a gestação. Trocar para metildopa.' },
  'losartan': { category: FDAPregnancyCategory.D, description: 'ARBs cause fetal toxicity similar to ACEi.', recommendation: 'Contraindicated in pregnancy. Switch to methyldopa.' },
  'varfarina': { category: FDAPregnancyCategory.X, description: 'Embriopatia varfarínica: hipoplasia nasal, condrodisplasia punctata, defeitos do SNC.', recommendation: 'ABSOLUTAMENTE CONTRAINDICADA. Trocar para enoxaparina/heparina.' },
  'warfarin': { category: FDAPregnancyCategory.X, description: 'Warfarin embryopathy: nasal hypoplasia, chondrodysplasia punctata, CNS defects.', recommendation: 'ABSOLUTELY CONTRAINDICATED. Switch to enoxaparin/heparin.' },
  'isotretinoina': { category: FDAPregnancyCategory.X, description: 'Teratogênico comprovado. Malformações craniofaciais, cardíacas e do SNC.', recommendation: 'ABSOLUTAMENTE CONTRAINDICADA. Anticoncepção obrigatória. Teste de gravidez mensal.' },
  'metotrexato': { category: FDAPregnancyCategory.X, description: 'Abortifaciente e teratogênico. Defeitos craniofaciais e de membros.', recommendation: 'ABSOLUTAMENTE CONTRAINDICADO. Suspender 3 meses antes da concepção.' },
  'methotrexate': { category: FDAPregnancyCategory.X, description: 'Abortifacient and teratogenic.', recommendation: 'ABSOLUTELY CONTRAINDICATED. Discontinue 3 months before conception.' },
  'amoxicilina': { category: FDAPregnancyCategory.B, description: 'Ampla experiência em gestantes sem evidência de risco fetal.', recommendation: 'Segura na gestação. Antibiótico de primeira escolha para infecções comuns.' },
  'cefalexina': { category: FDAPregnancyCategory.B, description: 'Cefalosporina de primeira geração com bom perfil de segurança gestacional.', recommendation: 'Segura na gestação.' },
  'ciprofloxacino': { category: FDAPregnancyCategory.C, description: 'Fluoroquinolonas podem causar artropatia em animais. Dados humanos insuficientes.', recommendation: 'Evitar na gestação. Usar alternativas mais seguras (amoxicilina, cefalosporinas).' },
  'atorvastatina': { category: FDAPregnancyCategory.X, description: 'Estatinas podem causar defeitos congênitos. Colesterol é essencial para desenvolvimento fetal.', recommendation: 'ABSOLUTAMENTE CONTRAINDICADA na gestação e amamentação.' },
  'omeprazol': { category: FDAPregnancyCategory.C, description: 'Dados limitados. Estudos observacionais não sugerem risco significativo.', recommendation: 'Usar se benefício superar risco. Considerar antiácidos como primeira linha.' },
  'diclofenaco': { category: FDAPregnancyCategory.D, description: 'AINEs no 3º trimestre: fechamento prematuro do ducto arterioso, oligoidrâmnio.', recommendation: 'Contraindicado no 3º trimestre. Evitar durante toda a gestação se possível.' },
  'dipirona': { category: FDAPregnancyCategory.C, description: 'Dados limitados sobre segurança gestacional. Risco potencial de agranulocitose neonatal.', recommendation: 'Usar com cautela. Preferir paracetamol como analgésico/antipirético.' },
  'paracetamol': { category: FDAPregnancyCategory.B, description: 'Analgésico/antipirético mais seguro na gestação com ampla experiência.', recommendation: 'Primeira escolha para dor e febre na gestação.' },
};

// ─── Lactation Safety Database ───────────────────────────────────────────

const LACTATION_DRUG_DB: Record<string, {
  safety: LactationSafety;
  description: string;
  recommendation: string;
  halfLifeHours: number;
}> = {
  'metformina': { safety: LactationSafety.SAFE, description: 'Excreção mínima no leite materno. Sem efeitos adversos relatados no lactente.', recommendation: 'Compatível com amamentação.', halfLifeHours: 6.2 },
  'amoxicilina': { safety: LactationSafety.SAFE, description: 'Traços no leite materno. Pode causar diarreia leve ou rash no lactente.', recommendation: 'Compatível com amamentação. Monitorar lactente para diarreia.', halfLifeHours: 1.5 },
  'cefalexina': { safety: LactationSafety.SAFE, description: 'Baixa excreção no leite. Sem efeitos adversos significativos relatados.', recommendation: 'Compatível com amamentação.', halfLifeHours: 1.0 },
  'paracetamol': { safety: LactationSafety.SAFE, description: 'Excreção mínima no leite. Extensamente estudado.', recommendation: 'Compatível com amamentação. Primeira escolha para dor/febre.', halfLifeHours: 2.0 },
  'ibuprofeno': { safety: LactationSafety.SAFE, description: 'Excreção mínima no leite devido à alta ligação proteica.', recommendation: 'Compatível com amamentação. AINE de primeira escolha para lactantes.', halfLifeHours: 2.5 },
  'omeprazol': { safety: LactationSafety.PROBABLY_SAFE, description: 'Dados limitados. Provavelmente destruído pelo pH gástrico do lactente.', recommendation: 'Provavelmente compatível. Monitorar lactente.', halfLifeHours: 1.0 },
  'enalapril': { safety: LactationSafety.SAFE, description: 'Baixa excreção no leite. Sem efeitos adversos relatados.', recommendation: 'Compatível com amamentação. IECAs são seguros durante lactação.', halfLifeHours: 11.0 },
  'ciprofloxacino': { safety: LactationSafety.POTENTIALLY_HAZARDOUS, description: 'Excretado no leite em concentrações significativas. Risco teórico de artropatia.', recommendation: 'Evitar se possível. Se necessário, monitorar lactente para diarreia e candidíase.', halfLifeHours: 4.0 },
  'metotrexato': { safety: LactationSafety.CONTRAINDICATED, description: 'Excretado no leite. Imunossupressor com risco de neutropenia e toxicidade no lactente.', recommendation: 'CONTRAINDICADO. Suspender amamentação durante tratamento e por 1 semana após.', halfLifeHours: 8.0 },
  'varfarina': { safety: LactationSafety.SAFE, description: 'Excreção insignificante no leite. Sem efeitos anticoagulantes no lactente.', recommendation: 'Compatível com amamentação.', halfLifeHours: 40.0 },
  'diazepam': { safety: LactationSafety.POTENTIALLY_HAZARDOUS, description: 'Excretado no leite. Metabólito ativo acumula no lactente (meia-vida longa).', recommendation: 'Evitar uso prolongado. Se dose única, monitorar sedação no lactente.', halfLifeHours: 43.0 },
  'lítio': { safety: LactationSafety.POTENTIALLY_HAZARDOUS, description: 'Concentrações significativas no leite (30-50% do nível sérico materno).', recommendation: 'Contraindicação relativa. Se usado, monitorar níveis séricos no lactente.', halfLifeHours: 24.0 },
  'isotretinoina': { safety: LactationSafety.CONTRAINDICATED, description: 'Teratogênico. Dados insuficientes na lactação.', recommendation: 'CONTRAINDICADO. Não amamentar durante uso.', halfLifeHours: 20.0 },
  'amiodarona': { safety: LactationSafety.CONTRAINDICATED, description: 'Alta concentração no leite. Contém iodo que pode causar hipotireoidismo neonatal.', recommendation: 'CONTRAINDICADO na amamentação. Meia-vida extremamente longa.', halfLifeHours: 960.0 },
};

// ─── Drug-Food Interaction Database ──────────────────────────────────────

const FOOD_INTERACTION_DB: Record<string, {
  interactions: Array<{
    food: string;
    effect: string;
    severity: 'LOW' | 'MODERATE' | 'HIGH';
    recommendation: string;
  }>;
  generalGuidance: string;
}> = {
  'varfarina': {
    interactions: [
      { food: 'Alimentos ricos em vitamina K (brócolis, espinafre, couve)', effect: 'Redução do efeito anticoagulante', severity: 'HIGH', recommendation: 'Manter ingestão constante de vitamina K. Não eliminar, apenas manter regular.' },
      { food: 'Cranberry/mirtilo', effect: 'Potencialização do efeito anticoagulante (risco de sangramento)', severity: 'MODERATE', recommendation: 'Evitar consumo excessivo. Monitorar INR.' },
      { food: 'Álcool', effect: 'Consumo crônico induz metabolismo; binge potencializa efeito', severity: 'HIGH', recommendation: 'Evitar álcool ou limitar a 1 dose/dia. Monitorar INR frequentemente.' },
      { food: 'Chá verde', effect: 'Contém vitamina K — pode reduzir efeito anticoagulante', severity: 'MODERATE', recommendation: 'Consumo moderado e constante. Não iniciar/suspender abruptamente.' },
    ],
    generalGuidance: 'Manter dieta consistente em vitamina K. Monitorar INR após mudanças alimentares significativas.',
  },
  'warfarin': {
    interactions: [
      { food: 'Vitamin K-rich foods (broccoli, spinach, kale)', effect: 'Reduced anticoagulant effect', severity: 'HIGH', recommendation: 'Keep vitamin K intake consistent.' },
    ],
    generalGuidance: 'Maintain consistent vitamin K diet.',
  },
  'ciprofloxacino': {
    interactions: [
      { food: 'Laticínios (leite, iogurte, queijo)', effect: 'Quelação com cálcio — redução da absorção em até 50%', severity: 'HIGH', recommendation: 'Tomar 2h antes ou 6h após laticínios.' },
      { food: 'Alimentos ricos em ferro/cálcio', effect: 'Quelação — redução da absorção', severity: 'HIGH', recommendation: 'Separar da ingestão de suplementos de ferro/cálcio por 2-6h.' },
      { food: 'Cafeína', effect: 'Inibição do metabolismo da cafeína (CYP1A2) — nervosismo, insônia', severity: 'MODERATE', recommendation: 'Reduzir consumo de café durante tratamento.' },
    ],
    generalGuidance: 'Tomar em jejum, 2h antes ou 6h após refeições com cálcio/ferro.',
  },
  'metformina': {
    interactions: [
      { food: 'Álcool', effect: 'Aumento do risco de acidose láctica e hipoglicemia', severity: 'HIGH', recommendation: 'Evitar consumo de álcool durante tratamento.' },
    ],
    generalGuidance: 'Tomar com refeições para reduzir efeitos GI.',
  },
  'levotiroxina': {
    interactions: [
      { food: 'Café', effect: 'Redução da absorção em até 36%', severity: 'MODERATE', recommendation: 'Tomar 60 min antes do café.' },
      { food: 'Soja', effect: 'Redução da absorção', severity: 'MODERATE', recommendation: 'Separar por 4h de produtos de soja.' },
      { food: 'Alimentos ricos em fibra', effect: 'Redução da absorção', severity: 'LOW', recommendation: 'Tomar em jejum, 30-60 min antes do café da manhã.' },
      { food: 'Suplementos de cálcio/ferro', effect: 'Quelação — redução significativa da absorção', severity: 'HIGH', recommendation: 'Separar por 4h de cálcio e ferro.' },
    ],
    generalGuidance: 'Tomar em jejum, 30-60 min antes do café da manhã, apenas com água.',
  },
  'omeprazol': {
    interactions: [
      { food: 'Alimentos em geral', effect: 'Redução da absorção se tomado com alimento', severity: 'MODERATE', recommendation: 'Tomar 30 min antes da primeira refeição.' },
    ],
    generalGuidance: 'Tomar em jejum, 30 min antes do café da manhã.',
  },
  'atorvastatina': {
    interactions: [
      { food: 'Toranja/grapefruit', effect: 'Inibição CYP3A4 — aumento dos níveis plasmáticos (risco de miopatia)', severity: 'HIGH', recommendation: 'Evitar consumo de toranja/grapefruit e suco.' },
    ],
    generalGuidance: 'Pode ser tomada com ou sem alimentos, mas evitar grapefruit.',
  },
  'sinvastatina': {
    interactions: [
      { food: 'Toranja/grapefruit', effect: 'Aumento de até 15x nos níveis plasmáticos via CYP3A4', severity: 'HIGH', recommendation: 'Evitar completamente toranja/grapefruit.' },
    ],
    generalGuidance: 'Tomar à noite. Evitar grapefruit.',
  },
  'captopril': {
    interactions: [
      { food: 'Alimentos em geral', effect: 'Redução da absorção em 30-40%', severity: 'MODERATE', recommendation: 'Tomar 1h antes ou 2h após refeições.' },
    ],
    generalGuidance: 'Tomar em jejum para melhor absorção.',
  },
  'tetraciclina': {
    interactions: [
      { food: 'Laticínios', effect: 'Quelação com cálcio — absorção praticamente anulada', severity: 'HIGH', recommendation: 'Tomar 1h antes ou 2h após laticínios.' },
      { food: 'Antiácidos (alumínio, magnésio)', effect: 'Quelação — redução drástica da absorção', severity: 'HIGH', recommendation: 'Separar por 2-3h de antiácidos.' },
    ],
    generalGuidance: 'Tomar em jejum, 1h antes das refeições, apenas com água.',
  },
  'lítio': {
    interactions: [
      { food: 'Sal (sódio)', effect: 'Dieta hipossódica aumenta reabsorção renal de lítio (toxicidade)', severity: 'HIGH', recommendation: 'Manter ingestão de sódio constante. Não iniciar dieta hipossódica sem ajuste de dose.' },
      { food: 'Cafeína', effect: 'Consumo excessivo aumenta excreção renal de lítio', severity: 'MODERATE', recommendation: 'Manter consumo constante de cafeína.' },
    ],
    generalGuidance: 'Manter hidratação e ingestão de sódio constantes.',
  },
};

// ─── Generic Equivalents Database ────────────────────────────────────────

const GENERIC_EQUIVALENTS_DB: Record<string, {
  activeIngredient: string;
  equivalents: Array<{
    name: string;
    type: 'REFERENCE' | 'GENERIC' | 'SIMILAR';
    manufacturer: string;
    estimatedPriceReais: number;
  }>;
}> = {
  'losartana': {
    activeIngredient: 'Losartana potássica 50mg',
    equivalents: [
      { name: 'Cozaar', type: 'REFERENCE', manufacturer: 'MSD', estimatedPriceReais: 89.90 },
      { name: 'Losartana Potássica (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 12.90 },
      { name: 'Losartana Potássica (genérico)', type: 'GENERIC', manufacturer: 'Medley', estimatedPriceReais: 14.50 },
      { name: 'Losartana Potássica (genérico)', type: 'GENERIC', manufacturer: 'Neo Química', estimatedPriceReais: 11.90 },
      { name: 'Zaarpress', type: 'SIMILAR', manufacturer: 'Aché', estimatedPriceReais: 35.90 },
    ],
  },
  'atorvastatina': {
    activeIngredient: 'Atorvastatina cálcica 20mg',
    equivalents: [
      { name: 'Lipitor', type: 'REFERENCE', manufacturer: 'Pfizer', estimatedPriceReais: 119.90 },
      { name: 'Atorvastatina Cálcica (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 19.90 },
      { name: 'Atorvastatina Cálcica (genérico)', type: 'GENERIC', manufacturer: 'Sandoz', estimatedPriceReais: 22.50 },
      { name: 'Citalor', type: 'SIMILAR', manufacturer: 'Aché', estimatedPriceReais: 49.90 },
    ],
  },
  'metformina': {
    activeIngredient: 'Cloridrato de metformina 850mg',
    equivalents: [
      { name: 'Glifage', type: 'REFERENCE', manufacturer: 'Merck', estimatedPriceReais: 32.90 },
      { name: 'Cloridrato de Metformina (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 8.90 },
      { name: 'Cloridrato de Metformina (genérico)', type: 'GENERIC', manufacturer: 'Medley', estimatedPriceReais: 9.90 },
      { name: 'Glucoformin', type: 'SIMILAR', manufacturer: 'Eurofarma', estimatedPriceReais: 18.90 },
    ],
  },
  'omeprazol': {
    activeIngredient: 'Omeprazol 20mg',
    equivalents: [
      { name: 'Losec', type: 'REFERENCE', manufacturer: 'AstraZeneca', estimatedPriceReais: 69.90 },
      { name: 'Omeprazol (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 7.90 },
      { name: 'Omeprazol (genérico)', type: 'GENERIC', manufacturer: 'Medley', estimatedPriceReais: 8.50 },
      { name: 'Peprazol', type: 'SIMILAR', manufacturer: 'Aché', estimatedPriceReais: 24.90 },
    ],
  },
  'amoxicilina': {
    activeIngredient: 'Amoxicilina tri-hidratada 500mg',
    equivalents: [
      { name: 'Amoxil', type: 'REFERENCE', manufacturer: 'GSK', estimatedPriceReais: 45.90 },
      { name: 'Amoxicilina (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 11.90 },
      { name: 'Amoxicilina (genérico)', type: 'GENERIC', manufacturer: 'Eurofarma', estimatedPriceReais: 13.50 },
      { name: 'Novocilin', type: 'SIMILAR', manufacturer: 'Aché', estimatedPriceReais: 22.90 },
    ],
  },
  'enalapril': {
    activeIngredient: 'Maleato de enalapril 10mg',
    equivalents: [
      { name: 'Renitec', type: 'REFERENCE', manufacturer: 'MSD', estimatedPriceReais: 52.90 },
      { name: 'Maleato de Enalapril (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 9.90 },
      { name: 'Maleato de Enalapril (genérico)', type: 'GENERIC', manufacturer: 'Neo Química', estimatedPriceReais: 8.50 },
      { name: 'Vasopril', type: 'SIMILAR', manufacturer: 'Biolab', estimatedPriceReais: 28.90 },
    ],
  },
  'sinvastatina': {
    activeIngredient: 'Sinvastatina 20mg',
    equivalents: [
      { name: 'Zocor', type: 'REFERENCE', manufacturer: 'MSD', estimatedPriceReais: 79.90 },
      { name: 'Sinvastatina (genérico)', type: 'GENERIC', manufacturer: 'EMS', estimatedPriceReais: 10.90 },
      { name: 'Sinvastatina (genérico)', type: 'GENERIC', manufacturer: 'Medley', estimatedPriceReais: 12.90 },
      { name: 'Sinvascor', type: 'SIMILAR', manufacturer: 'Baldacci', estimatedPriceReais: 29.90 },
    ],
  },
};

// ─── DDD Reference Database (WHO ATC/DDD Index) ─────────────────────────

const DDD_REFERENCE_DB: Record<string, {
  atcCode: string;
  dddValue: number;
  unit: string;
  route: string;
}> = {
  'amoxicilina': { atcCode: 'J01CA04', dddValue: 1.5, unit: 'g', route: 'O' },
  'amoxicillin': { atcCode: 'J01CA04', dddValue: 1.5, unit: 'g', route: 'O' },
  'ampicilina': { atcCode: 'J01CA01', dddValue: 6, unit: 'g', route: 'P' },
  'ceftriaxona': { atcCode: 'J01DD04', dddValue: 2, unit: 'g', route: 'P' },
  'ceftriaxone': { atcCode: 'J01DD04', dddValue: 2, unit: 'g', route: 'P' },
  'cefazolina': { atcCode: 'J01DB04', dddValue: 3, unit: 'g', route: 'P' },
  'ciprofloxacino': { atcCode: 'J01MA02', dddValue: 1, unit: 'g', route: 'O' },
  'ciprofloxacin': { atcCode: 'J01MA02', dddValue: 1, unit: 'g', route: 'O' },
  'levofloxacino': { atcCode: 'J01MA12', dddValue: 0.5, unit: 'g', route: 'O' },
  'vancomicina': { atcCode: 'J01XA01', dddValue: 2, unit: 'g', route: 'P' },
  'vancomycin': { atcCode: 'J01XA01', dddValue: 2, unit: 'g', route: 'P' },
  'meropenem': { atcCode: 'J01DH02', dddValue: 3, unit: 'g', route: 'P' },
  'piperacilina-tazobactam': { atcCode: 'J01CR05', dddValue: 14, unit: 'g', route: 'P' },
  'metronidazol': { atcCode: 'J01XD01', dddValue: 1.5, unit: 'g', route: 'P' },
  'oxacilina': { atcCode: 'J01CF04', dddValue: 8, unit: 'g', route: 'P' },
  'gentamicina': { atcCode: 'J01GB03', dddValue: 0.24, unit: 'g', route: 'P' },
  'amicacina': { atcCode: 'J01GB06', dddValue: 1, unit: 'g', route: 'P' },
  'linezolida': { atcCode: 'J01XX08', dddValue: 1.2, unit: 'g', route: 'O' },
  'clindamicina': { atcCode: 'J01FF01', dddValue: 1.8, unit: 'g', route: 'P' },
  'daptomicina': { atcCode: 'J01XX09', dddValue: 0.28, unit: 'g', route: 'P' },
  'fluconazol': { atcCode: 'J02AC01', dddValue: 0.2, unit: 'g', route: 'O' },
};

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class PrescriptionsEnhancedService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Order Sets
  // ──────────────────────────────────────────────────────────────────────────

  listOrderSets(): OrderSet[] {
    return ORDER_SETS_DB.map((os) => ({
      ...os,
      medications: os.medications.map((m) => ({ ...m })),
    }));
  }

  getOrderSet(orderSetId: string): OrderSet {
    const os = ORDER_SETS_DB.find((o) => o.id === orderSetId);
    if (!os) {
      throw new NotFoundException(`Order set "${orderSetId}" not found`);
    }
    return os;
  }

  async activateOrderSet(
    tenantId: string,
    doctorId: string,
    input: {
      orderSetId: string;
      patientId: string;
      encounterId: string;
      patientWeight?: number;
    },
  ) {
    const orderSet = this.getOrderSet(input.orderSetId);

    const prescription = await this.prisma.prescription.create({
      data: {
        tenantId,
        doctorId,
        patientId: input.patientId,
        encounterId: input.encounterId,
        type: PrescriptionType.MEDICATION,
        wasGeneratedByAI: false,
        status: 'DRAFT',
        requiresDoubleCheck: orderSet.medications.some((m) => m.isHighAlert),
        items: {
          create: orderSet.medications.map((med) => {
            let adjustedDose = med.dose;
            // Adjust weight-based doses if weight provided
            if (input.patientWeight && med.doseUnit.includes('/kg')) {
              const baseDose = parseFloat(med.dose);
              if (!isNaN(baseDose)) {
                const calculated = baseDose * input.patientWeight;
                adjustedDose = calculated.toFixed(1);
              }
            }

            return {
              medicationName: med.medicationName,
              activeIngredient: med.activeIngredient,
              dose: adjustedDose,
              doseUnit: med.doseUnit.replace('/kg', '').replace('/kg/h', '/h'),
              route: med.route,
              frequency: med.frequency,
              duration: med.duration ?? null,
              durationUnit: med.durationUnit ?? null,
              dilution: med.dilution ?? null,
              dilutionVolume: med.dilutionVolume ?? null,
              dilutionSolution: med.dilutionSolution ?? null,
              infusionRate: med.infusionRate ?? null,
              infusionRateUnit: med.infusionRateUnit ?? null,
              specialInstructions: med.specialInstructions ?? null,
              isHighAlert: med.isHighAlert ?? false,
              isAntibiotic: med.isAntibiotic ?? false,
              sortOrder: med.sortOrder,
            };
          }),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return {
      prescription,
      orderSet: { id: orderSet.id, name: orderSet.name },
      message: `Order set "${orderSet.name}" aplicado com ${orderSet.medications.length} itens`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Renal Dose Adjustment — Enhanced with CKD-EPI
  // ──────────────────────────────────────────────────────────────────────────

  calculateRenalFunction(input: {
    patientAge: number;
    patientWeight: number;
    patientGender: string;
    serumCreatinine: number;
    isBlack?: boolean;
  }): RenalCalculationResult {
    const alerts: string[] = [];

    // Cockcroft-Gault (CrCl in mL/min)
    const isFemale = input.patientGender === 'F';
    let cockcroftGault = ((140 - input.patientAge) * input.patientWeight) / (72 * input.serumCreatinine);
    if (isFemale) cockcroftGault *= 0.85;
    cockcroftGault = Math.round(cockcroftGault * 10) / 10;

    // CKD-EPI 2021 (without race coefficient per 2021 update)
    let ckdEpi: number;
    const scr = input.serumCreatinine;
    if (isFemale) {
      const kappa = 0.7;
      const alpha = -0.241;
      const scrOverKappa = scr / kappa;
      ckdEpi = 142 *
        Math.pow(Math.min(scrOverKappa, 1), alpha) *
        Math.pow(Math.max(scrOverKappa, 1), -1.200) *
        Math.pow(0.9938, input.patientAge) *
        1.012;
    } else {
      const kappa = 0.9;
      const alpha = -0.302;
      const scrOverKappa = scr / kappa;
      ckdEpi = 142 *
        Math.pow(Math.min(scrOverKappa, 1), alpha) *
        Math.pow(Math.max(scrOverKappa, 1), -1.200) *
        Math.pow(0.9938, input.patientAge);
    }
    ckdEpi = Math.round(ckdEpi * 10) / 10;

    // Stage classification
    let stage: string;
    const gfr = ckdEpi;
    if (gfr >= 90) {
      stage = 'G1 — Normal ou elevada';
    } else if (gfr >= 60) {
      stage = 'G2 — Levemente reduzida';
    } else if (gfr >= 45) {
      stage = 'G3a — Leve a moderadamente reduzida';
      alerts.push('TFG reduzida: Revisar doses de medicamentos de eliminação renal.');
    } else if (gfr >= 30) {
      stage = 'G3b — Moderada a severamente reduzida';
      alerts.push('TFG moderadamente reduzida: Ajuste de dose necessário para muitos medicamentos.');
    } else if (gfr >= 15) {
      stage = 'G4 — Severamente reduzida';
      alerts.push('Insuficiência renal severa: Ajuste de dose obrigatório. Considerar nefrologista.');
    } else {
      stage = 'G5 — Falência renal';
      alerts.push('Falência renal (TFG < 15): Muitos medicamentos contraindicados. Diálise pode ser necessária.');
    }

    return { cockcroftGault, ckdEpi, stage, alerts };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Hepatic — Child-Pugh Score Calculator
  // ──────────────────────────────────────────────────────────────────────────

  calculateChildPugh(input: ChildPughInput): ChildPughResult {
    let score = 0;
    const alerts: string[] = [];

    // Ascites
    switch (input.ascites) {
      case 'NONE': score += 1; break;
      case 'MILD': score += 2; break;
      case 'MODERATE_SEVERE': score += 3; break;
    }

    // Encephalopathy
    switch (input.encephalopathy) {
      case 'NONE': score += 1; break;
      case 'GRADE_1_2': score += 2; break;
      case 'GRADE_3_4': score += 3; break;
    }

    // Bilirubin
    if (input.bilirubinMgDl < 2) score += 1;
    else if (input.bilirubinMgDl <= 3) score += 2;
    else score += 3;

    // Albumin
    if (input.albuminGDl > 3.5) score += 1;
    else if (input.albuminGDl >= 2.8) score += 2;
    else score += 3;

    // INR
    if (input.inr < 1.7) score += 1;
    else if (input.inr <= 2.3) score += 2;
    else score += 3;

    let classification: 'A' | 'B' | 'C';
    let description: string;

    if (score <= 6) {
      classification = 'A';
      description = 'Child-Pugh A (5-6 pontos): Doença hepática compensada. Sobrevida 1 ano: ~100%.';
    } else if (score <= 9) {
      classification = 'B';
      description = 'Child-Pugh B (7-9 pontos): Comprometimento funcional significativo. Sobrevida 1 ano: ~80%.';
      alerts.push('Hepatopatia moderada: Reduzir dose de medicamentos com metabolismo hepático.');
    } else {
      classification = 'C';
      description = 'Child-Pugh C (10-15 pontos): Doença hepática descompensada. Sobrevida 1 ano: ~45%.';
      alerts.push('Hepatopatia grave: Muitos medicamentos contraindicados. Avaliar risco-benefício rigorosamente.');
    }

    return { score, classification, description, alerts };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Smart Infusion Pump Integration
  // ──────────────────────────────────────────────────────────────────────────

  calculateInfusionPump(input: {
    pumpBrand: 'ALARIS' | 'BBRAUN' | 'BAXTER';
    medication: string;
    totalDoseMg: number;
    diluentVolumeMl: number;
    prescribedRateMgH: number;
    durationH?: number;
  }): InfusionPumpData {
    const alerts: string[] = [];

    if (input.diluentVolumeMl <= 0) {
      throw new BadRequestException('Volume do diluente deve ser maior que zero.');
    }

    const concentrationMgMl = input.totalDoseMg / input.diluentVolumeMl;
    const rateMlH = input.prescribedRateMgH / concentrationMgMl;
    const vtbiMl = input.diluentVolumeMl;
    const estimatedDurationH = input.durationH ?? vtbiMl / rateMlH;

    // Safety checks
    if (rateMlH > 999) {
      alerts.push(`Taxa de infusão muito alta (${rateMlH.toFixed(1)} mL/h). Verificar diluição.`);
    }
    if (rateMlH < 0.1) {
      alerts.push(`Taxa de infusão muito baixa (${rateMlH.toFixed(3)} mL/h). Considerar reconcentrar.`);
    }
    if (concentrationMgMl > 50) {
      alerts.push(`Concentração elevada (${concentrationMgMl.toFixed(2)} mg/mL). Verificar compatibilidade.`);
    }

    // Pump-specific limits
    switch (input.pumpBrand) {
      case 'ALARIS':
        if (rateMlH > 1200) alerts.push('Alaris: Taxa máxima 1200 mL/h excedida.');
        break;
      case 'BBRAUN':
        if (rateMlH > 1500) alerts.push('B.Braun: Taxa máxima 1500 mL/h excedida.');
        break;
      case 'BAXTER':
        if (rateMlH > 1000) alerts.push('Baxter Sigma: Taxa máxima 1000 mL/h excedida.');
        break;
    }

    return {
      pumpBrand: input.pumpBrand,
      medication: input.medication,
      totalDoseMg: input.totalDoseMg,
      diluentVolumeMl: input.diluentVolumeMl,
      prescribedRateMgH: input.prescribedRateMgH,
      concentrationMgMl: Math.round(concentrationMgMl * 1000) / 1000,
      rateMlH: Math.round(rateMlH * 100) / 100,
      vtbiMl,
      estimatedDurationH: Math.round(estimatedDurationH * 100) / 100,
      alerts,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PCA Activation Recording
  // ──────────────────────────────────────────────────────────────────────────

  async recordPCAActivation(
    tenantId: string,
    input: {
      prescriptionItemId: string;
      patientId: string;
      encounterId: string;
      doseDelivered: number;
      doseUnit: string;
      wasLocked: boolean;
      painScoreBefore?: number;
      painScoreAfter?: number;
    },
  ) {
    // Verify prescription item exists
    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id: input.prescriptionItemId },
      include: { prescription: true },
    });

    if (!item) {
      throw new NotFoundException(`Prescription item "${input.prescriptionItemId}" not found`);
    }

    if (item.prescription.tenantId !== tenantId) {
      throw new BadRequestException('Tenant mismatch');
    }

    // Store as clinical document
    const activation: PCAActivation = {
      prescriptionItemId: input.prescriptionItemId,
      activatedAt: new Date(),
      doseDelivered: input.doseDelivered,
      doseUnit: input.doseUnit,
      wasLocked: input.wasLocked,
      painScoreBefore: input.painScoreBefore,
      painScoreAfter: input.painScoreAfter,
    };

    const document = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: input.patientId,
        encounterId: input.encounterId,
        authorId: item.prescription.doctorId,
        type: 'CUSTOM',
        title: '[PCA:ACTIVATION] Ativação PCA',
        content: JSON.stringify(activation),
        status: 'FINAL',
      },
    });

    return {
      id: document.id,
      activation,
      message: input.wasLocked
        ? 'PCA bloqueada (lockout ativo). Dose não entregue.'
        : `PCA ativada: ${input.doseDelivered} ${input.doseUnit} entregue.`,
    };
  }

  async getPCAHistory(
    tenantId: string,
    prescriptionItemId: string,
    hours = 24,
  ) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: '[PCA:ACTIVATION] Ativação PCA',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by prescriptionItemId from content
    const activations = documents
      .filter((doc) => {
        if (!doc.content) return false;
        const content = JSON.parse(doc.content) as Record<string, unknown>;
        return content.prescriptionItemId === prescriptionItemId;
      })
      .map((doc) => JSON.parse(doc.content!) as PCAActivation);

    const totalActivations = activations.length;
    const totalDoseDelivered = activations
      .filter((a) => !a.wasLocked)
      .reduce((sum, a) => sum + a.doseDelivered, 0);
    const lockedAttempts = activations.filter((a) => a.wasLocked).length;

    return {
      activations,
      summary: {
        period: `${hours}h`,
        totalActivations,
        successfulDoses: totalActivations - lockedAttempts,
        lockedAttempts,
        totalDoseDelivered,
        doseUnit: activations[0]?.doseUnit ?? 'mg',
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. AI: Culture-based Antimicrobial Optimization
  // ──────────────────────────────────────────────────────────────────────────

  getCultureBasedRecommendation(input: {
    organism: string;
    sensitivities: Array<{ antibiotic: string; interpretation: 'S' | 'I' | 'R' }>;
    infectionSite?: string;
    patientAllergies?: string[];
    isImmunocompromised?: boolean;
    previousAntibiotics?: string[];
  }): CultureBasedRecommendation {
    const alerts: string[] = [];
    const organismKey = input.organism.toLowerCase().trim();

    const dbEntry = Object.entries(ANTIBIOGRAM_RECOMMENDATIONS).find(([key]) =>
      organismKey.includes(key),
    );

    if (!dbEntry) {
      return {
        organism: input.organism,
        sensitivities: input.sensitivities.map((s) => ({ ...s, mic: 'N/A' })),
        recommendedAntibiotic: 'Consultar infectologista',
        recommendedDose: 'N/A',
        recommendedDuration: 'N/A',
        reasoning: `Organismo "${input.organism}" não encontrado na base de recomendações. Consultar infectologista.`,
        alerts: ['Organismo não reconhecido — recomendação manual necessária.'],
      };
    }

    const recommendation = dbEntry[1];
    let selectedAntibiotic = recommendation.firstLine.antibiotic;
    let selectedDose = recommendation.firstLine.dose;
    let reasoning = recommendation.firstLine.reasoning;

    // Check if first-line is resistant
    const firstLineSensitivity = input.sensitivities.find(
      (s) => s.antibiotic.toLowerCase().includes(selectedAntibiotic.toLowerCase()),
    );

    if (firstLineSensitivity?.interpretation === 'R') {
      alerts.push(`${selectedAntibiotic} resistente no antibiograma. Buscando alternativa.`);
      // Find first sensitive alternative
      for (const alt of recommendation.alternatives) {
        const altSensitivity = input.sensitivities.find(
          (s) => s.antibiotic.toLowerCase().includes(alt.antibiotic.toLowerCase()),
        );
        if (!altSensitivity || altSensitivity.interpretation === 'S') {
          selectedAntibiotic = alt.antibiotic;
          selectedDose = alt.dose;
          reasoning = alt.reasoning;
          break;
        }
      }
    }

    // Check allergies
    if (input.patientAllergies?.length) {
      const isAllergic = input.patientAllergies.some((allergy) =>
        selectedAntibiotic.toLowerCase().includes(allergy.toLowerCase()),
      );
      if (isAllergic) {
        alerts.push(`Paciente alérgico a ${selectedAntibiotic}. Buscar alternativa.`);
        for (const alt of recommendation.alternatives) {
          const notAllergic = !input.patientAllergies.some((allergy) =>
            alt.antibiotic.toLowerCase().includes(allergy.toLowerCase()),
          );
          if (notAllergic) {
            selectedAntibiotic = alt.antibiotic;
            selectedDose = alt.dose;
            reasoning = alt.reasoning + ' (selecionado por alergia ao agente de primeira linha)';
            break;
          }
        }
      }
    }

    // Immunocompromised alert
    if (input.isImmunocompromised) {
      alerts.push('Paciente imunocomprometido: Considerar cobertura mais ampla e duração estendida.');
    }

    // Previous antibiotic exposure
    if (input.previousAntibiotics?.length) {
      const previousExposure = input.previousAntibiotics.some(
        (prev) => prev.toLowerCase().includes(selectedAntibiotic.toLowerCase()),
      );
      if (previousExposure) {
        alerts.push(`Exposição recente a ${selectedAntibiotic}: Considerar resistência adquirida.`);
      }
    }

    return {
      organism: input.organism,
      sensitivities: input.sensitivities.map((s) => ({ ...s, mic: 'N/A' })),
      recommendedAntibiotic: selectedAntibiotic,
      recommendedDose: selectedDose,
      recommendedDuration: recommendation.firstLine.duration,
      reasoning,
      deEscalationSuggestion: recommendation.deEscalation,
      alerts,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. AI: Personalized Adverse Effect Prediction
  // ──────────────────────────────────────────────────────────────────────────

  predictAdverseEffects(input: {
    medicationName: string;
    patientAge: number;
    patientGender: string;
    comorbidities: string[];
    currentMedications: string[];
    geneticProfile?: Record<string, string>;
  }): AdverseEffectPrediction {
    const name = input.medicationName.toLowerCase().trim();
    const alerts: string[] = [];
    const riskFactors: string[] = [];

    // Identify patient risk factors
    if (input.patientAge > 75) riskFactors.push('idade > 75');
    if (input.patientAge > 80) riskFactors.push('idade > 80');
    if (input.patientAge > 60) riskFactors.push('idade > 60');

    const comorbiditiesLower = input.comorbidities.map((c) => c.toLowerCase());
    if (comorbiditiesLower.some((c) => c.includes('renal') || c.includes('drc'))) {
      riskFactors.push('insuficiência renal');
    }
    if (comorbiditiesLower.some((c) => c.includes('hepát') || c.includes('cirrose') || c.includes('hepat'))) {
      riskFactors.push('insuficiência hepática');
      riskFactors.push('hepatopatia prévia');
    }
    if (comorbiditiesLower.some((c) => c.includes('diabetes'))) {
      riskFactors.push('diabetes');
    }
    if (comorbiditiesLower.some((c) => c.includes('tireoid'))) {
      riskFactors.push('doença tireoidiana prévia');
    }
    if (input.patientGender === 'F') riskFactors.push('sexo feminino');

    const medsLower = input.currentMedications.map((m) => m.toLowerCase());
    if (medsLower.some((m) => m.includes('aine') || m.includes('ibuprofeno') || m.includes('diclofenaco'))) {
      riskFactors.push('uso concomitante de AINE');
    }
    if (medsLower.some((m) => m.includes('corticoide') || m.includes('prednisona') || m.includes('dexametasona'))) {
      riskFactors.push('uso de corticoide');
    }
    if (medsLower.some((m) => m.includes('espironolactona'))) {
      riskFactors.push('uso de espironolactona');
    }

    // Find drug in database
    const drugEntry = Object.entries(ADVERSE_EFFECT_DB).find(([key]) => name.includes(key));

    if (!drugEntry) {
      return {
        medication: input.medicationName,
        riskFactors,
        predictions: [],
        overallRisk: 'LOW',
        alerts: ['Medicamento não encontrado na base de predição de efeitos adversos.'],
      };
    }

    const predictions = drugEntry[1].map((effect) => {
      let multiplier = 1;
      const matchedFactors: string[] = [];

      for (const rf of effect.riskFactors) {
        if (riskFactors.includes(rf.factor)) {
          multiplier *= rf.multiplier;
          matchedFactors.push(rf.factor);
        }
      }

      const probability = Math.min(effect.baseRisk * multiplier, 0.95);
      let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
      if (probability < 0.05) riskLevel = 'LOW';
      else if (probability < 0.15) riskLevel = 'MODERATE';
      else if (probability < 0.35) riskLevel = 'HIGH';
      else riskLevel = 'VERY_HIGH';

      if (riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH') {
        alerts.push(`RISCO ELEVADO de ${effect.effect} (${(probability * 100).toFixed(1)}%) — ${effect.mitigation}`);
      }

      return {
        adverseEffect: effect.effect,
        riskLevel,
        probability: Math.round(probability * 1000) / 1000,
        reasoning: matchedFactors.length > 0
          ? `Fatores de risco: ${matchedFactors.join(', ')}`
          : 'Risco basal da população geral',
        mitigationStrategy: effect.mitigation,
      };
    });

    const riskOrder = { LOW: 0, MODERATE: 1, HIGH: 2, VERY_HIGH: 3 } as const;
    let maxRiskValue = 0;
    for (const p of predictions) {
      const val = riskOrder[p.riskLevel];
      if (val > maxRiskValue) maxRiskValue = val;
    }
    const overallRisk: 'LOW' | 'MODERATE' | 'HIGH' =
      maxRiskValue >= 2 ? 'HIGH' : maxRiskValue === 1 ? 'MODERATE' : 'LOW';

    return {
      medication: input.medicationName,
      riskFactors,
      predictions,
      overallRisk,
      alerts,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Pregnancy Alert — FDA Category Check
  // ──────────────────────────────────────────────────────────────────────────

  checkPregnancyAlert(drugName: string): {
    drug: string;
    fdaCategory: FDAPregnancyCategory;
    description: string;
    recommendation: string;
    isContraindicated: boolean;
    alerts: string[];
  } {
    const name = drugName.toLowerCase().trim();
    const entry = Object.entries(PREGNANCY_DRUG_DB).find(([key]) => name.includes(key));

    if (!entry) {
      return {
        drug: drugName,
        fdaCategory: FDAPregnancyCategory.C,
        description: 'Categoria não encontrada na base de dados. Classificado como C por precaução.',
        recommendation: 'Consultar bula e referências atualizadas antes de prescrever.',
        isContraindicated: false,
        alerts: ['Medicamento não encontrado na base de classificação de risco gestacional.'],
      };
    }

    const data = entry[1];
    const isContraindicated = data.category === FDAPregnancyCategory.X;
    const alerts: string[] = [];

    if (isContraindicated) {
      alerts.push(`CONTRAINDICADO NA GESTAÇÃO: ${drugName} é categoria X — risco fetal comprovado supera qualquer benefício.`);
    } else if (data.category === FDAPregnancyCategory.D) {
      alerts.push(`RISCO FETAL COMPROVADO: ${drugName} é categoria D — usar somente se benefício justificar o risco.`);
    }

    return {
      drug: drugName,
      fdaCategory: data.category,
      description: data.description,
      recommendation: data.recommendation,
      isContraindicated,
      alerts,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Lactation Safety Check
  // ──────────────────────────────────────────────────────────────────────────

  checkLactationAlert(drugName: string): {
    drug: string;
    safety: LactationSafety;
    description: string;
    recommendation: string;
    halfLifeHours: number | null;
    alerts: string[];
  } {
    const name = drugName.toLowerCase().trim();
    const entry = Object.entries(LACTATION_DRUG_DB).find(([key]) => name.includes(key));

    if (!entry) {
      return {
        drug: drugName,
        safety: LactationSafety.UNKNOWN,
        description: 'Dados de segurança na lactação não disponíveis na base.',
        recommendation: 'Consultar LactMed/Hale antes de prescrever durante amamentação.',
        halfLifeHours: null,
        alerts: ['Segurança na lactação desconhecida — consultar referências especializadas.'],
      };
    }

    const data = entry[1];
    const alerts: string[] = [];

    if (data.safety === LactationSafety.CONTRAINDICATED) {
      alerts.push(`CONTRAINDICADO NA LACTAÇÃO: ${drugName} — suspender amamentação ou trocar medicamento.`);
    } else if (data.safety === LactationSafety.POTENTIALLY_HAZARDOUS) {
      alerts.push(`POTENCIALMENTE PERIGOSO NA LACTAÇÃO: ${drugName} — monitorar lactente e considerar alternativas.`);
    }

    return {
      drug: drugName,
      safety: data.safety,
      description: data.description,
      recommendation: data.recommendation,
      halfLifeHours: data.halfLifeHours,
      alerts,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Drug-Food Interactions
  // ──────────────────────────────────────────────────────────────────────────

  checkFoodInteraction(drugName: string): {
    drug: string;
    interactions: Array<{
      food: string;
      effect: string;
      severity: 'LOW' | 'MODERATE' | 'HIGH';
      recommendation: string;
    }>;
    generalGuidance: string;
  } {
    const name = drugName.toLowerCase().trim();
    const entry = Object.entries(FOOD_INTERACTION_DB).find(([key]) => name.includes(key));

    if (!entry) {
      return {
        drug: drugName,
        interactions: [],
        generalGuidance: 'Nenhuma interação alimentar significativa conhecida na base de dados.',
      };
    }

    return {
      drug: drugName,
      interactions: entry[1].interactions,
      generalGuidance: entry[1].generalGuidance,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Generic/Reference Equivalents
  // ──────────────────────────────────────────────────────────────────────────

  getGenericEquivalents(drugName: string): {
    drug: string;
    activeIngredient: string;
    equivalents: Array<{
      name: string;
      type: 'REFERENCE' | 'GENERIC' | 'SIMILAR';
      manufacturer: string;
      estimatedPriceReais: number;
    }>;
    bioequivalent: boolean;
  } {
    const name = drugName.toLowerCase().trim();
    const entry = Object.entries(GENERIC_EQUIVALENTS_DB).find(([key]) => name.includes(key));

    if (!entry) {
      return {
        drug: drugName,
        activeIngredient: 'Não identificado',
        equivalents: [],
        bioequivalent: false,
      };
    }

    return {
      drug: drugName,
      activeIngredient: entry[1].activeIngredient,
      equivalents: entry[1].equivalents,
      bioequivalent: true,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Medication Reconciliation (Admission)
  // ──────────────────────────────────────────────────────────────────────────

  async createMedicationReconciliation(
    tenantId: string,
    authorId: string,
    dto: CreateMedicationReconciliationDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const continuedMeds = dto.homeMedications.filter((m) => m.action === 'CONTINUE');
    const modifiedMeds = dto.homeMedications.filter((m) => m.action === 'MODIFY');
    const discontinuedMeds = dto.homeMedications.filter((m) => m.action === 'DISCONTINUE');
    const substitutedMeds = dto.homeMedications.filter((m) => m.action === 'SUBSTITUTE');
    const newMeds = dto.homeMedications.filter((m) => m.action === 'NEW');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[MEDICATION_RECONCILIATION:${dto.type}] ${patient.fullName}`,
        content: JSON.stringify({
          documentType: 'MEDICATION_RECONCILIATION',
          reconciliationType: dto.type,
          homeMedications: dto.homeMedications,
          summary: {
            total: dto.homeMedications.length,
            continued: continuedMeds.length,
            modified: modifiedMeds.length,
            discontinued: discontinuedMeds.length,
            substituted: substitutedMeds.length,
            new: newMeds.length,
          },
          notes: dto.notes,
          pharmacistNotes: dto.pharmacistNotes,
          reconciledAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
      include: {
        author: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });

    return {
      id: doc.id,
      type: dto.type,
      patient: { id: patient.id, name: patient.fullName },
      summary: {
        total: dto.homeMedications.length,
        continued: continuedMeds.length,
        modified: modifiedMeds.length,
        discontinued: discontinuedMeds.length,
        substituted: substitutedMeds.length,
        new: newMeds.length,
      },
      reconciledAt: doc.createdAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Discharge Reconciliation
  // ──────────────────────────────────────────────────────────────────────────

  async createDischargeReconciliation(
    tenantId: string,
    authorId: string,
    dto: CreateDischargeReconciliationDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    // Build unified discharge medication list
    const unifiedList = dto.dischargeMedications.map((med) => {
      const hospitalMatch = dto.hospitalMedications.find(
        (h) => h.medicationName.toLowerCase() === med.medicationName.toLowerCase(),
      );
      return {
        ...med,
        wasInHospital: !!hospitalMatch,
        hospitalDose: hospitalMatch?.dose,
        hospitalRoute: hospitalMatch?.route,
        doseChanged: hospitalMatch ? hospitalMatch.dose !== med.dose : false,
      };
    });

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[MEDICATION_RECONCILIATION:DISCHARGE] ${patient.fullName}`,
        content: JSON.stringify({
          documentType: 'DISCHARGE_RECONCILIATION',
          hospitalMedications: dto.hospitalMedications,
          dischargeMedications: dto.dischargeMedications,
          unifiedList,
          patientInstructions: dto.patientInstructions,
          pharmacistNotes: dto.pharmacistNotes,
          reconciledAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
      include: {
        author: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });

    return {
      id: doc.id,
      patient: { id: patient.id, name: patient.fullName },
      unifiedList,
      hospitalMedicationsCount: dto.hospitalMedications.length,
      dischargeMedicationsCount: dto.dischargeMedications.length,
      patientInstructions: dto.patientInstructions,
      reconciledAt: doc.createdAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Antimicrobial Stewardship (DDD/DOT tracking)
  // ──────────────────────────────────────────────────────────────────────────

  async createAntimicrobialStewardship(
    tenantId: string,
    authorId: string,
    dto: CreateAntimicrobialStewardshipDto,
  ) {
    // DDD (Defined Daily Dose) reference values from WHO ATC/DDD Index
    const dddReference = DDD_REFERENCE_DB[dto.antimicrobialName.toLowerCase()] ?? null;

    const dddPerThousandPatientDays = dddReference
      ? (dto.dailyDefinedDose / dddReference.dddValue) * 1000
      : null;

    const alerts: string[] = [];

    if (dto.daysOfTherapy > 14) {
      alerts.push(`Terapia prolongada (${dto.daysOfTherapy} dias). Considerar reavaliação.`);
    }
    if (dto.daysOfTherapy > 7 && dto.isEmpiric) {
      alerts.push('Terapia empírica > 7 dias. Solicitar culturas e considerar desescalonamento.');
    }
    if (dddReference && dto.dailyDefinedDose > dddReference.dddValue * 2) {
      alerts.push(`Dose diária (${dto.dailyDefinedDose}${dddReference.unit}) excede 2x a DDD da OMS (${dddReference.dddValue}${dddReference.unit}).`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[ANTIMICROBIAL_STEWARDSHIP] ${dto.antimicrobialName}`,
        content: JSON.stringify({
          documentType: 'ANTIMICROBIAL_STEWARDSHIP',
          antimicrobialName: dto.antimicrobialName,
          dailyDefinedDose: dto.dailyDefinedDose,
          daysOfTherapy: dto.daysOfTherapy,
          indication: dto.indication,
          cultureResult: dto.cultureResult,
          isEmpiric: dto.isEmpiric ?? true,
          startDate: dto.startDate ?? new Date().toISOString(),
          expectedEndDate: dto.expectedEndDate,
          deEscalationPlan: dto.deEscalationPlan,
          dddReference,
          dddPerThousandPatientDays,
          alerts,
          trackedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return {
      id: doc.id,
      antimicrobialName: dto.antimicrobialName,
      ddd: dto.dailyDefinedDose,
      dot: dto.daysOfTherapy,
      dddReference,
      dddPerThousandPatientDays,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Antimicrobial Dashboard (Enhanced)
  // ──────────────────────────────────────────────────────────────────────────

  async getAntimicrobialDashboard(
    tenantId: string,
    dateRange?: { startDate?: string; endDate?: string },
  ) {
    const where: Record<string, unknown> = {
      tenantId,
      title: { startsWith: '[ANTIMICROBIAL_STEWARDSHIP]' },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (dateRange.startDate) dateFilter.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) dateFilter.lte = new Date(dateRange.endDate);
      where.createdAt = dateFilter;
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const entries = docs.map((d) => JSON.parse(d.content ?? '{}'));

    // Aggregate metrics
    const byAgent: Record<string, { totalDDD: number; totalDOT: number; count: number }> = {};
    let totalDDD = 0;
    let totalDOT = 0;
    let empiricCount = 0;
    let targetedCount = 0;
    const prolongedTherapies: Array<{ antimicrobial: string; days: number; patientId: string }> = [];

    for (const entry of entries) {
      const agent = (entry.antimicrobialName as string) ?? 'Unknown';
      const ddd = (entry.dailyDefinedDose as number) ?? 0;
      const dot = (entry.daysOfTherapy as number) ?? 0;

      if (!byAgent[agent]) {
        byAgent[agent] = { totalDDD: 0, totalDOT: 0, count: 0 };
      }
      byAgent[agent].totalDDD += ddd;
      byAgent[agent].totalDOT += dot;
      byAgent[agent].count += 1;
      totalDDD += ddd;
      totalDOT += dot;

      if (entry.isEmpiric) empiricCount++;
      else targetedCount++;

      if (dot > 14) {
        prolongedTherapies.push({
          antimicrobial: agent,
          days: dot,
          patientId: (entry.patientId as string) ?? '',
        });
      }
    }

    return {
      period: {
        startDate: dateRange?.startDate ?? 'All time',
        endDate: dateRange?.endDate ?? 'Now',
      },
      totalEntries: entries.length,
      totalDDD,
      totalDOT,
      averageDOT: entries.length > 0 ? Math.round(totalDOT / entries.length * 10) / 10 : 0,
      empiricVsTargeted: {
        empiric: empiricCount,
        targeted: targetedCount,
        empiricPercentage: entries.length > 0
          ? Math.round((empiricCount / entries.length) * 100)
          : 0,
      },
      byAgent,
      prolongedTherapies,
      generatedAt: new Date().toISOString(),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 16. NPT — Parenteral Nutrition Calculation
  // ──────────────────────────────────────────────────────────────────────────

  calculateNPT(dto: CalculateNPTDto): {
    macronutrients: {
      aminoAcidsG: number;
      aminoAcidsMl: number;
      glucoseG: number;
      glucoseMl: number;
      lipidsG: number;
      lipidsMl: number;
    };
    calories: {
      fromProtein: number;
      fromGlucose: number;
      fromLipids: number;
      totalNonProtein: number;
      total: number;
      npCaloriesPerGN2Ratio: number;
    };
    electrolytes: {
      sodiumMEq: number;
      potassiumMEq: number;
      calciumMEq: number;
      magnesiumMEq: number;
      phosphorusMmol: number;
    };
    volume: {
      totalMl: number;
      infusionRateMlH: number;
      infusionHours: number;
    };
    osmolarity: {
      mOsmL: number;
      isPeripheralSafe: boolean;
    };
    alerts: string[];
  } {
    const alerts: string[] = [];

    // Protein/amino acids: target in g/kg/day, solution at 10% (100mg/mL)
    const proteinG = dto.proteinTarget * dto.patientWeight;
    const aminoAcidSolutionConcentration = 0.10; // 10% solution
    const aminoAcidsMl = proteinG / (aminoAcidSolutionConcentration * 1000) * 1000;

    // Glucose: typically 50% solution for central, 10% for peripheral
    const glucoseConcentration = dto.isPeripheral ? 0.10 : 0.50;
    const glucosePercentage = dto.glucosePercentage ?? 60; // % of non-protein calories from glucose
    const lipidPercentage = dto.lipidPercentage ?? 40; // % of non-protein calories from lipids

    // Calories: protein = 4 kcal/g, glucose = 3.4 kcal/g, lipids = 9 kcal/g (10 kcal/g in IV emulsion)
    const proteinCalories = proteinG * 4;
    const nonProteinCalories = dto.caloricTarget * dto.patientWeight - proteinCalories;
    const glucoseCalories = nonProteinCalories * (glucosePercentage / 100);
    const lipidCalories = nonProteinCalories * (lipidPercentage / 100);

    const glucoseG = glucoseCalories / 3.4;
    const glucoseMl = glucoseG / (glucoseConcentration * 1000) * 1000;

    // Lipids: 20% emulsion (2 kcal/mL)
    const lipidEmulsionConcentration = 0.20;
    const lipidsG = lipidCalories / 10; // IV lipid emulsion: ~10 kcal/g
    const lipidsMl = lipidsG / (lipidEmulsionConcentration * 1000) * 1000;

    // Electrolytes (default values based on standard adult needs)
    const sodiumMEq = dto.sodiumMEq ?? 1.0 * dto.patientWeight; // 1-2 mEq/kg/day
    const potassiumMEq = dto.potassiumMEq ?? 1.0 * dto.patientWeight; // 1-2 mEq/kg/day
    const calciumMEq = dto.calciumMEq ?? 10; // 10-15 mEq/day
    const magnesiumMEq = dto.magnesiumMEq ?? 8; // 8-20 mEq/day
    const phosphorusMmol = dto.phosphorusMmol ?? 15; // 15-30 mmol/day

    // Volume
    const totalVolumeMl = dto.volumeMl ?? (aminoAcidsMl + glucoseMl + lipidsMl + 200); // +200 for electrolytes/vitamins
    const infusionHours = 24;
    const infusionRateMlH = Math.round(totalVolumeMl / infusionHours * 10) / 10;

    // Osmolarity estimation (mOsm/L)
    // Glucose: 5.5 mOsm/g, Amino acids: ~8 mOsm/g, Electrolytes contribute ~2x mEq
    const osmolarity = Math.round(
      ((glucoseG * 5.5 + proteinG * 8 + (sodiumMEq + potassiumMEq) * 2) / totalVolumeMl) * 1000,
    );

    const isPeripheralSafe = osmolarity <= 900;

    // NPC:N2 ratio (ideal: 100-200:1 for most patients, 80-120:1 for critically ill)
    const nitrogenG = proteinG / 6.25;
    const npCaloriesPerGN2Ratio = nitrogenG > 0
      ? Math.round((glucoseCalories + lipidCalories) / nitrogenG)
      : 0;

    // Validation alerts
    if (dto.proteinTarget > 2.5) {
      alerts.push(`Oferta proteica alta (${dto.proteinTarget} g/kg/dia). Máximo recomendado: 2.0-2.5 g/kg/dia.`);
    }
    if (dto.proteinTarget < 0.8) {
      alerts.push(`Oferta proteica baixa (${dto.proteinTarget} g/kg/dia). Mínimo recomendado: 1.2-1.5 g/kg/dia para pacientes críticos.`);
    }

    const glucoseInfusionRateMgKgMin = (glucoseG * 1000) / (dto.patientWeight * 24 * 60);
    if (glucoseInfusionRateMgKgMin > 5) {
      alerts.push(`Taxa de infusão de glicose elevada (${glucoseInfusionRateMgKgMin.toFixed(1)} mg/kg/min). Máximo: 4-5 mg/kg/min.`);
    }

    if (lipidsG / dto.patientWeight > 2.5) {
      alerts.push(`Oferta lipídica elevada (${(lipidsG / dto.patientWeight).toFixed(1)} g/kg/dia). Máximo: 2.5 g/kg/dia.`);
    }

    if (!isPeripheralSafe && dto.isPeripheral) {
      alerts.push(`Osmolaridade (${osmolarity} mOsm/L) excede limite para acesso periférico (900 mOsm/L). Usar acesso central.`);
    }

    if (npCaloriesPerGN2Ratio < 80) {
      alerts.push(`Razão NPC:N2 baixa (${npCaloriesPerGN2Ratio}:1). Ideal: 100-200:1.`);
    } else if (npCaloriesPerGN2Ratio > 200) {
      alerts.push(`Razão NPC:N2 alta (${npCaloriesPerGN2Ratio}:1). Considerar aumentar aporte proteico.`);
    }

    return {
      macronutrients: {
        aminoAcidsG: Math.round(proteinG * 10) / 10,
        aminoAcidsMl: Math.round(aminoAcidsMl),
        glucoseG: Math.round(glucoseG * 10) / 10,
        glucoseMl: Math.round(glucoseMl),
        lipidsG: Math.round(lipidsG * 10) / 10,
        lipidsMl: Math.round(lipidsMl),
      },
      calories: {
        fromProtein: Math.round(proteinCalories),
        fromGlucose: Math.round(glucoseCalories),
        fromLipids: Math.round(lipidCalories),
        totalNonProtein: Math.round(glucoseCalories + lipidCalories),
        total: Math.round(proteinCalories + glucoseCalories + lipidCalories),
        npCaloriesPerGN2Ratio,
      },
      electrolytes: {
        sodiumMEq: Math.round(sodiumMEq * 10) / 10,
        potassiumMEq: Math.round(potassiumMEq * 10) / 10,
        calciumMEq: Math.round(calciumMEq * 10) / 10,
        magnesiumMEq: Math.round(magnesiumMEq * 10) / 10,
        phosphorusMmol: Math.round(phosphorusMmol * 10) / 10,
      },
      volume: {
        totalMl: Math.round(totalVolumeMl),
        infusionRateMlH,
        infusionHours,
      },
      osmolarity: {
        mOsmL: osmolarity,
        isPeripheralSafe,
      },
      alerts,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 17. PCA Protocol Creation
  // ──────────────────────────────────────────────────────────────────────────

  async createPCAProtocol(
    tenantId: string,
    authorId: string,
    dto: CreatePCAProtocolDto,
  ) {
    const alerts: string[] = [];

    // Safety validations
    if (dto.lockoutMinutes < 5) {
      alerts.push(`Lockout muito curto (${dto.lockoutMinutes} min). Mínimo recomendado: 5-10 minutos.`);
    }

    const maxDosesPerHourByLockout = 60 / dto.lockoutMinutes;
    const maxPossibleDosePerHour = maxDosesPerHourByLockout * dto.demandDose;
    if (maxPossibleDosePerHour > dto.maxDosePerHour) {
      alerts.push(`Dose máxima por hora (${dto.maxDosePerHour} ${dto.demandDoseUnit}) é menor que o máximo possível pelo lockout (${maxPossibleDosePerHour.toFixed(1)} ${dto.demandDoseUnit}). OK — segurança adicional.`);
    }

    if (dto.continuousRate && dto.continuousRate > 0) {
      const continuousDosePerHour = dto.continuousRate;
      const totalMaxPerHour = continuousDosePerHour + dto.maxDosePerHour;
      alerts.push(`Dose total máxima por hora (contínua + demanda): ${totalMaxPerHour.toFixed(1)} ${dto.demandDoseUnit}.`);
    }

    // Common PCA medication safety checks
    const medName = dto.medication.toLowerCase();
    if (medName.includes('morfina') || medName.includes('morphine')) {
      if (dto.demandDose > 3) {
        alerts.push(`Dose de demanda de morfina alta (${dto.demandDose} ${dto.demandDoseUnit}). Usual: 1-2 mg.`);
      }
      if (dto.maxDosePerHour > 10) {
        alerts.push(`Dose máxima horária de morfina alta (${dto.maxDosePerHour} mg). Usual: 6-10 mg/h.`);
      }
    }
    if (medName.includes('fentanil') || medName.includes('fentanyl')) {
      if (dto.demandDose > 50) {
        alerts.push(`Dose de demanda de fentanil alta (${dto.demandDose} ${dto.demandDoseUnit}). Usual: 10-20 mcg.`);
      }
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[PCA:PROTOCOL] ${dto.medication}`,
        content: JSON.stringify({
          documentType: 'PCA_PROTOCOL',
          medication: dto.medication,
          concentration: dto.concentration,
          concentrationUnit: dto.concentrationUnit,
          demandDose: dto.demandDose,
          demandDoseUnit: dto.demandDoseUnit,
          lockoutMinutes: dto.lockoutMinutes,
          continuousRate: dto.continuousRate ?? 0,
          continuousRateUnit: dto.continuousRateUnit ?? dto.demandDoseUnit + '/h',
          maxDosePerHour: dto.maxDosePerHour,
          maxDosePer4Hours: dto.maxDosePer4Hours,
          specialInstructions: dto.specialInstructions,
          alerts,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return {
      id: doc.id,
      medication: dto.medication,
      protocol: {
        demandDose: `${dto.demandDose} ${dto.demandDoseUnit}`,
        lockout: `${dto.lockoutMinutes} min`,
        continuousRate: dto.continuousRate
          ? `${dto.continuousRate} ${dto.continuousRateUnit ?? dto.demandDoseUnit + '/h'}`
          : 'Sem infusão contínua',
        maxPerHour: `${dto.maxDosePerHour} ${dto.demandDoseUnit}`,
        maxPer4Hours: `${dto.maxDosePer4Hours} ${dto.demandDoseUnit}`,
      },
      alerts,
      createdAt: doc.createdAt,
    };
  }
}
