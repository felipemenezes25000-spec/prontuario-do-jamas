import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrescriptionType } from '@prisma/client';

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
}
