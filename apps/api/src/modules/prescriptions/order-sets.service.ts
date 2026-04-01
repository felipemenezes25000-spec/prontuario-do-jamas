import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrderSetCategory,
  OrderSetItemType,
  GFRFormula,
  GFRCategory,
  AscitesSeverity,
  EncephalopathyGrade,
  ChildPughClass,
  FDAPregnancyCategoryOS,
  InfantRisk,
  FoodInteractionType,
  InteractionSeverity,
  type CreateOrderSetDto,
  type ActivateOrderSetDto,
  type RenalAdjustmentDto,
  type RenalAdjustmentResultDto,
  type HepaticAdjustmentDto,
  type ChildPughResultDto,
  type PregnancyCheckDto,
  type PregnancyAlertDto,
  type LactationCheckDto,
  type LactationAlertDto,
  type FoodDrugInteractionDto,
  type OrderSetItemDto,
} from './dto/order-sets.dto';

// ─── Internal Types ───────────────────────────────────────────────────────────

export interface StoredOrderSet {
  id: string;
  name: string;
  description: string;
  category: OrderSetCategory;
  specialty: string;
  items: OrderSetItemDto[];
  createdAt: Date;
}

export interface RenalDoseRule {
  defaultDose: string;
  adjustments: Array<{
    gfrMin: number;
    gfrMax: number;
    dose: string;
    reason: string;
    monitoring: boolean;
  }>;
}

export interface HepaticDoseRule {
  defaultDose: string;
  adjustments: Record<ChildPughClass, { dose: string; recommendation: string }>;
}

export interface PregnancyDrugEntry {
  fdaCategory: FDAPregnancyCategoryOS;
  riskByTrimester: Record<number, string>;
  alternatives: string[];
}

export interface LactationDrugEntry {
  passesToMilk: boolean;
  infantRisk: InfantRisk;
  recommendation: string;
  alternatives: string[];
}

export interface FoodInteractionEntry {
  food: string;
  interactionType: FoodInteractionType;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
}

// ─── Reference Databases ──────────────────────────────────────────────────────

const RENAL_DOSE_RULES: Record<string, RenalDoseRule> = {
  metformina: {
    defaultDose: '850mg 8/8h',
    adjustments: [
      { gfrMin: 45, gfrMax: 59, dose: '850mg 12/12h', reason: 'TFG 45-59: reduzir frequência', monitoring: true },
      { gfrMin: 30, gfrMax: 44, dose: '500mg 1x/dia', reason: 'TFG 30-44: dose reduzida, monitorar lactato', monitoring: true },
      { gfrMin: 0, gfrMax: 29, dose: 'CONTRAINDICADA', reason: 'TFG < 30: risco de acidose lática', monitoring: true },
    ],
  },
  enoxaparina: {
    defaultDose: '1mg/kg 12/12h',
    adjustments: [
      { gfrMin: 15, gfrMax: 29, dose: '1mg/kg 1x/dia', reason: 'TFG 15-29: reduzir para dose única diária', monitoring: true },
      { gfrMin: 0, gfrMax: 14, dose: '0.5mg/kg 1x/dia', reason: 'TFG < 15: dose reduzida, monitorar anti-Xa', monitoring: true },
    ],
  },
  vancomicina: {
    defaultDose: '15-20mg/kg 12/12h',
    adjustments: [
      { gfrMin: 30, gfrMax: 49, dose: '15mg/kg 24/24h', reason: 'TFG 30-49: aumentar intervalo', monitoring: true },
      { gfrMin: 15, gfrMax: 29, dose: '15mg/kg 48/48h', reason: 'TFG 15-29: intervalo estendido, monitorar nível sérico', monitoring: true },
      { gfrMin: 0, gfrMax: 14, dose: '15mg/kg — redisar conforme nível sérico', reason: 'TFG < 15 ou diálise: dose guiada por nível', monitoring: true },
    ],
  },
  gabapentina: {
    defaultDose: '300-600mg 8/8h',
    adjustments: [
      { gfrMin: 30, gfrMax: 59, dose: '200-300mg 12/12h', reason: 'TFG 30-59: reduzir dose e frequência', monitoring: false },
      { gfrMin: 15, gfrMax: 29, dose: '100-300mg 1x/dia', reason: 'TFG 15-29: dose significativamente reduzida', monitoring: true },
      { gfrMin: 0, gfrMax: 14, dose: '100-150mg 1x/dia', reason: 'TFG < 15: dose mínima', monitoring: true },
    ],
  },
  amoxicilina: {
    defaultDose: '500mg 8/8h',
    adjustments: [
      { gfrMin: 10, gfrMax: 30, dose: '500mg 12/12h', reason: 'TFG 10-30: aumentar intervalo', monitoring: false },
      { gfrMin: 0, gfrMax: 9, dose: '500mg 24/24h', reason: 'TFG < 10: intervalo de 24h', monitoring: true },
    ],
  },
  ciprofloxacino: {
    defaultDose: '500mg 12/12h VO ou 400mg 12/12h IV',
    adjustments: [
      { gfrMin: 15, gfrMax: 29, dose: '250-500mg 12/12h VO ou 200-400mg 12/12h IV', reason: 'TFG 15-29: considerar redução de dose', monitoring: true },
      { gfrMin: 0, gfrMax: 14, dose: '250mg 12/12h VO ou 200mg 12/12h IV', reason: 'TFG < 15: dose reduzida', monitoring: true },
    ],
  },
  levofloxacino: {
    defaultDose: '500mg 1x/dia',
    adjustments: [
      { gfrMin: 20, gfrMax: 49, dose: '250mg 1x/dia', reason: 'TFG 20-49: reduzir dose pela metade', monitoring: false },
      { gfrMin: 0, gfrMax: 19, dose: '250mg 48/48h', reason: 'TFG < 20: intervalo estendido', monitoring: true },
    ],
  },
  alopurinol: {
    defaultDose: '300mg 1x/dia',
    adjustments: [
      { gfrMin: 30, gfrMax: 59, dose: '200mg 1x/dia', reason: 'TFG 30-59: reduzir dose', monitoring: true },
      { gfrMin: 10, gfrMax: 29, dose: '100mg 1x/dia', reason: 'TFG 10-29: dose mínima eficaz', monitoring: true },
      { gfrMin: 0, gfrMax: 9, dose: '100mg em dias alternados', reason: 'TFG < 10: risco de toxicidade', monitoring: true },
    ],
  },
};

const HEPATIC_DOSE_RULES: Record<string, HepaticDoseRule> = {
  paracetamol: {
    defaultDose: '750mg 6/6h (máx 3g/dia)',
    adjustments: {
      [ChildPughClass.A]: { dose: '500mg 6/6h (máx 2g/dia)', recommendation: 'Reduzir dose máxima diária. Evitar uso prolongado.' },
      [ChildPughClass.B]: { dose: '500mg 8/8h (máx 1.5g/dia)', recommendation: 'Dose reduzida. Monitorar TGO/TGP. Preferir dipirona se possível.' },
      [ChildPughClass.C]: { dose: 'EVITAR — risco de hepatotoxicidade', recommendation: 'Contraindicado em hepatopatia grave. Usar dipirona ou tramadol (com cautela).' },
    },
  },
  metronidazol: {
    defaultDose: '500mg 8/8h',
    adjustments: {
      [ChildPughClass.A]: { dose: '500mg 8/8h', recommendation: 'Dose habitual. Monitorar função hepática.' },
      [ChildPughClass.B]: { dose: '250mg 8/8h', recommendation: 'Reduzir dose pela metade. Monitorar nível sérico se disponível.' },
      [ChildPughClass.C]: { dose: '250mg 12/12h', recommendation: 'Dose significativamente reduzida. Considerar alternativas.' },
    },
  },
  diazepam: {
    defaultDose: '5-10mg 8/8h SOS',
    adjustments: {
      [ChildPughClass.A]: { dose: '5mg 8/8h SOS', recommendation: 'Usar dose menor. Benzodiazepínicos têm meia-vida prolongada em hepatopatas.' },
      [ChildPughClass.B]: { dose: '2.5mg 12/12h SOS', recommendation: 'Dose reduzida. Preferir lorazepam (metabolismo extrahepático).' },
      [ChildPughClass.C]: { dose: 'CONTRAINDICADO', recommendation: 'Risco de encefalopatia hepática. Usar lorazepam em dose baixa se necessário.' },
    },
  },
  omeprazol: {
    defaultDose: '20mg 1x/dia',
    adjustments: {
      [ChildPughClass.A]: { dose: '20mg 1x/dia', recommendation: 'Dose habitual.' },
      [ChildPughClass.B]: { dose: '20mg 1x/dia', recommendation: 'Manter dose habitual. Monitorar.' },
      [ChildPughClass.C]: { dose: '10mg 1x/dia', recommendation: 'Reduzir dose. Clearance hepático diminuído.' },
    },
  },
  tramadol: {
    defaultDose: '50-100mg 6/6h SOS',
    adjustments: {
      [ChildPughClass.A]: { dose: '50mg 6/6h SOS', recommendation: 'Usar dose menor, monitorar sedação.' },
      [ChildPughClass.B]: { dose: '50mg 12/12h SOS', recommendation: 'Dose reduzida, meia-vida prolongada em hepatopatia.' },
      [ChildPughClass.C]: { dose: 'EVITAR', recommendation: 'Metabolismo hepático extenso. Considerar morfina em dose baixa IV (titulável).' },
    },
  },
  sinvastatina: {
    defaultDose: '20-40mg 1x/dia',
    adjustments: {
      [ChildPughClass.A]: { dose: '10-20mg 1x/dia', recommendation: 'Reduzir dose. Monitorar CPK e TGO/TGP.' },
      [ChildPughClass.B]: { dose: 'CONTRAINDICADO', recommendation: 'Risco de rabdomiólise. Suspender estatina.' },
      [ChildPughClass.C]: { dose: 'CONTRAINDICADO', recommendation: 'Absolutamente contraindicado.' },
    },
  },
};

const PREGNANCY_DRUG_DB: Record<string, PregnancyDrugEntry> = {
  enalapril: {
    fdaCategory: FDAPregnancyCategoryOS.D,
    riskByTrimester: {
      1: 'Risco de malformações cardiovasculares e do SNC no 1º trimestre.',
      2: 'Toxicidade fetal: oligoidrâmnio, insuficiência renal fetal, hipoplasia pulmonar.',
      3: 'Anúria neonatal, hipotensão, insuficiência renal irreversível.',
    },
    alternatives: ['Metildopa', 'Nifedipina', 'Hidralazina'],
  },
  losartana: {
    fdaCategory: FDAPregnancyCategoryOS.D,
    riskByTrimester: {
      1: 'Dados limitados. Possível risco de malformações.',
      2: 'Efeitos fetotóxicos semelhantes aos IECA: oligoidrâmnio, displasia renal.',
      3: 'Mortalidade fetal/neonatal, anúria, hipoplasia craniofacial.',
    },
    alternatives: ['Metildopa', 'Nifedipina', 'Hidralazina'],
  },
  warfarina: {
    fdaCategory: FDAPregnancyCategoryOS.X,
    riskByTrimester: {
      1: 'Embriopatia warfarínica: hipoplasia nasal, condrodisplasia punctata (semanas 6-9).',
      2: 'Hemorragia fetal, anomalias do SNC.',
      3: 'Hemorragia neonatal, risco de parto prematuro.',
    },
    alternatives: ['Enoxaparina', 'Heparina não-fracionada'],
  },
  metotrexato: {
    fdaCategory: FDAPregnancyCategoryOS.X,
    riskByTrimester: {
      1: 'Embriopatia por metotrexato: defeitos de tubo neural, anomalias craniofaciais.',
      2: 'Toxicidade fetal direta. Aborto espontâneo.',
      3: 'Pancitopenia fetal, retardo de crescimento.',
    },
    alternatives: ['Azatioprina (com cautela)', 'Sulfassalazina'],
  },
  isotretinoina: {
    fdaCategory: FDAPregnancyCategoryOS.X,
    riskByTrimester: {
      1: 'Teratogenicidade grave: anomalias craniofaciais, cardíacas e do SNC.',
      2: 'Risco persistente de malformações graves.',
      3: 'Retardo cognitivo, malformações cardíacas.',
    },
    alternatives: ['Ácido azelaico tópico', 'Peróxido de benzoíla tópico', 'Eritromicina tópica'],
  },
  amoxicilina: {
    fdaCategory: FDAPregnancyCategoryOS.B,
    riskByTrimester: {
      1: 'Sem evidência de teratogenicidade em estudos humanos.',
      2: 'Considerada segura. Uso amplo na gestação.',
      3: 'Segura. Sem efeitos adversos fetais documentados.',
    },
    alternatives: [],
  },
  paracetamol: {
    fdaCategory: FDAPregnancyCategoryOS.B,
    riskByTrimester: {
      1: 'Analgésico de escolha na gestação.',
      2: 'Seguro em doses terapêuticas.',
      3: 'Seguro. Evitar uso prolongado em altas doses.',
    },
    alternatives: [],
  },
  dipirona: {
    fdaCategory: FDAPregnancyCategoryOS.C,
    riskByTrimester: {
      1: 'Dados limitados. Uso cauteloso.',
      2: 'Possível risco de agranulocitose fetal (teórico).',
      3: 'Risco de fechamento precoce do ducto arterioso (semelhante a AINEs). Evitar no 3º trimestre.',
    },
    alternatives: ['Paracetamol'],
  },
  ibuprofeno: {
    fdaCategory: FDAPregnancyCategoryOS.D,
    riskByTrimester: {
      1: 'Possível risco de aborto espontâneo.',
      2: 'Uso cauteloso. Monitorar função renal fetal.',
      3: 'CONTRAINDICADO: fechamento prematuro do ducto arterioso, oligoidrâmnio.',
    },
    alternatives: ['Paracetamol', 'Dipirona (até 2º trimestre)'],
  },
};

const LACTATION_DRUG_DB: Record<string, LactationDrugEntry> = {
  amoxicilina: {
    passesToMilk: true,
    infantRisk: InfantRisk.LOW,
    recommendation: 'Compatível com amamentação. Observar diarreia e candidíase no lactente.',
    alternatives: [],
  },
  metronidazol: {
    passesToMilk: true,
    infantRisk: InfantRisk.MODERATE,
    recommendation: 'Presente no leite. Se dose única (2g), suspender amamentação por 12-24h. Para uso prolongado, considerar alternativas.',
    alternatives: ['Amoxicilina + Ácido clavulânico'],
  },
  ciprofloxacino: {
    passesToMilk: true,
    infantRisk: InfantRisk.MODERATE,
    recommendation: 'Excretado no leite. Risco teórico de artropatia. Preferir alternativas.',
    alternatives: ['Amoxicilina', 'Cefalexina'],
  },
  metotrexato: {
    passesToMilk: true,
    infantRisk: InfantRisk.CONTRAINDICATED,
    recommendation: 'CONTRAINDICADO na lactação. Citotóxico — risco de imunossupressão e neutropenia no lactente.',
    alternatives: [],
  },
  lítio: {
    passesToMilk: true,
    infantRisk: InfantRisk.HIGH,
    recommendation: 'Risco significativo: toxicidade por lítio no lactente. Monitorar nível sérico no lactente se uso for imprescindível.',
    alternatives: ['Valproato (com cautela)', 'Lamotrigina'],
  },
  paracetamol: {
    passesToMilk: true,
    infantRisk: InfantRisk.LOW,
    recommendation: 'Analgésico de escolha durante amamentação. Excreção mínima no leite.',
    alternatives: [],
  },
  ibuprofeno: {
    passesToMilk: true,
    infantRisk: InfantRisk.LOW,
    recommendation: 'Compatível com amamentação. Meia-vida curta, excreção mínima no leite.',
    alternatives: [],
  },
  diazepam: {
    passesToMilk: true,
    infantRisk: InfantRisk.HIGH,
    recommendation: 'Acúmulo no lactente (meia-vida longa). Risco de sedação, letargia, perda ponderal.',
    alternatives: ['Lorazepam (meia-vida mais curta)'],
  },
  warfarina: {
    passesToMilk: false,
    infantRisk: InfantRisk.LOW,
    recommendation: 'Compatível com amamentação. Excreção mínima no leite, sem efeito anticoagulante no lactente.',
    alternatives: [],
  },
};

const FOOD_INTERACTION_DB: Record<string, FoodInteractionEntry[]> = {
  warfarina: [
    { food: 'Vegetais verde-escuros (couve, espinafre, brócolis)', interactionType: FoodInteractionType.EFFECT, severity: InteractionSeverity.MAJOR, description: 'Vitamina K antagoniza o efeito anticoagulante da warfarina.', recommendation: 'Manter ingestão constante de vitamina K. Não eliminar, mas não variar drasticamente.' },
    { food: 'Suco de cranberry', interactionType: FoodInteractionType.METABOLISM, severity: InteractionSeverity.MODERATE, description: 'Inibição do CYP2C9 pode potencializar o efeito anticoagulante.', recommendation: 'Evitar consumo regular de grandes volumes. Monitorar INR.' },
    { food: 'Álcool', interactionType: FoodInteractionType.METABOLISM, severity: InteractionSeverity.MAJOR, description: 'Uso agudo potencializa anticoagulação; uso crônico aumenta metabolismo.', recommendation: 'Evitar consumo excessivo. Manter INR monitorado.' },
  ],
  ciprofloxacino: [
    { food: 'Leite e derivados (cálcio)', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MAJOR, description: 'Cálcio quela fluoroquinolonas, reduzindo absorção em até 40%.', recommendation: 'Tomar 2h antes ou 6h após laticínios/antiácidos.' },
    { food: 'Cafeína', interactionType: FoodInteractionType.METABOLISM, severity: InteractionSeverity.MODERATE, description: 'Ciprofloxacino inibe CYP1A2, aumentando níveis de cafeína.', recommendation: 'Reduzir consumo de café durante tratamento. Monitorar taquicardia e insônia.' },
  ],
  levotiroxina: [
    { food: 'Soja e produtos à base de soja', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MODERATE, description: 'Proteína de soja pode reduzir absorção de levotiroxina.', recommendation: 'Tomar levotiroxina em jejum, 30-60min antes da refeição. Evitar soja próximo à dose.' },
    { food: 'Café', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MODERATE, description: 'Café pode reduzir absorção de levotiroxina em até 30%.', recommendation: 'Aguardar pelo menos 30 minutos após tomar levotiroxina para tomar café.' },
    { food: 'Fibras dietéticas em excesso', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MINOR, description: 'Fibras podem reduzir absorção gastrointestinal.', recommendation: 'Manter intervalo de 2-4h entre suplementos de fibra e levotiroxina.' },
  ],
  sinvastatina: [
    { food: 'Suco de grapefruit (toranja)', interactionType: FoodInteractionType.METABOLISM, severity: InteractionSeverity.MAJOR, description: 'Grapefruit inibe CYP3A4, aumentando biodisponibilidade da sinvastatina em até 16x. Risco de rabdomiólise.', recommendation: 'EVITAR grapefruit e suco de grapefruit durante uso de sinvastatina.' },
    { food: 'Álcool', interactionType: FoodInteractionType.EFFECT, severity: InteractionSeverity.MODERATE, description: 'Álcool potencializa hepatotoxicidade das estatinas.', recommendation: 'Limitar consumo de álcool. Monitorar TGO/TGP.' },
  ],
  metformina: [
    { food: 'Álcool', interactionType: FoodInteractionType.EFFECT, severity: InteractionSeverity.MAJOR, description: 'Álcool potencializa risco de acidose lática, especialmente em jejum.', recommendation: 'Evitar consumo excessivo de álcool. Nunca usar metformina em intoxicação alcoólica.' },
  ],
  captopril: [
    { food: 'Alimentos em geral', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MODERATE, description: 'Alimentos reduzem absorção de captopril em 30-40%.', recommendation: 'Tomar 1h antes ou 2h após refeições.' },
  ],
  tetraciclina: [
    { food: 'Leite e derivados (cálcio)', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MAJOR, description: 'Cálcio quela tetraciclinas, reduzindo absorção drasticamente.', recommendation: 'Tomar 1h antes ou 2h após laticínios. Evitar antiácidos contendo cálcio/magnésio/alumínio.' },
    { food: 'Alimentos ricos em ferro', interactionType: FoodInteractionType.ABSORPTION, severity: InteractionSeverity.MAJOR, description: 'Ferro forma quelatos com tetraciclinas, impedindo absorção.', recommendation: 'Separar administração de ferro por pelo menos 2-3h.' },
  ],
};

// ─── Pre-built Order Sets ─────────────────────────────────────────────────────

const BUILT_IN_ORDER_SETS: StoredOrderSet[] = [
  {
    id: 'os-iam-full',
    name: 'Admissão IAM',
    description: 'Protocolo completo de admissão para Infarto Agudo do Miocárdio — medicações, exames e dieta',
    category: OrderSetCategory.CARDIOLOGY,
    specialty: 'Cardiologia',
    createdAt: new Date('2024-01-01'),
    items: [
      { type: OrderSetItemType.MEDICATION, details: 'AAS 300mg VO mastigar (ataque)', defaultDose: '300mg', defaultFrequency: 'Dose única', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'AAS 100mg VO (manutenção)', defaultDose: '100mg', defaultFrequency: '1x/dia', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Clopidogrel 300mg VO (ataque)', defaultDose: '300mg', defaultFrequency: 'Dose única', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Clopidogrel 75mg VO (manutenção)', defaultDose: '75mg', defaultFrequency: '1x/dia', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Enoxaparina 1mg/kg SC', defaultDose: '1mg/kg', defaultFrequency: '12/12h', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Atorvastatina 80mg VO', defaultDose: '80mg', defaultFrequency: '1x/dia', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Metoprolol 25mg VO', defaultDose: '25mg', defaultFrequency: '12/12h', isRequired: false, conditionalOn: 'FC > 60 e PAS > 100' },
      { type: OrderSetItemType.MEDICATION, details: 'Morfina 2mg IV SOS', defaultDose: '2mg', defaultFrequency: 'SOS', isRequired: false, conditionalOn: 'Dor precordial persistente' },
      { type: OrderSetItemType.LAB, details: 'Troponina I ultrassensível seriada (0h, 3h, 6h)', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Hemograma, Ureia, Creatinina, Na, K, Mg', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Perfil lipídico, Glicemia, HbA1c', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Coagulograma (TP, TTPA, INR)', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.IMAGING, details: 'ECG 12 derivações seriado (admissão, 6h, 12h)', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.IMAGING, details: 'Raio-X de tórax PA', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.IMAGING, details: 'Ecocardiograma TT', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.DIET, details: 'Dieta hipossódica, hipolipídica', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.NURSING, details: 'Repouso absoluto no leito 12-24h', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.NURSING, details: 'Monitorização cardíaca contínua', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.NURSING, details: 'Oximetria contínua, O2 se SpO2 < 94%', isRequired: true, conditionalOn: undefined },
    ],
  },
  {
    id: 'os-sepsis-1h',
    name: 'Sepsis Bundle 1h',
    description: 'Pacote de 1 hora da sepse (Surviving Sepsis Campaign 2021)',
    category: OrderSetCategory.CRITICAL_CARE,
    specialty: 'Medicina Intensiva',
    createdAt: new Date('2024-01-01'),
    items: [
      { type: OrderSetItemType.LAB, details: 'Lactato sérico (resultado em 30min)', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Hemoculturas (2 pares) ANTES de antibiótico', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Hemograma, Ureia, Cr, Bilirrubinas, TGO/TGP, Gasometria arterial', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Antibiótico de amplo espectro IV na 1ª hora', defaultDose: 'Conforme foco', defaultFrequency: 'Imediato', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Ringer Lactato 30mL/kg bolus', defaultDose: '30mL/kg', defaultFrequency: 'Bolus', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Noradrenalina 0.1mcg/kg/min IV se PAM < 65', defaultDose: '0.1mcg/kg/min', defaultFrequency: 'Contínuo', isRequired: false, conditionalOn: 'PAM < 65 após volume' },
      { type: OrderSetItemType.MEDICATION, details: 'Hidrocortisona 50mg IV 6/6h', defaultDose: '50mg', defaultFrequency: '6/6h', isRequired: false, conditionalOn: 'Choque refratário a vasopressor' },
      { type: OrderSetItemType.NURSING, details: 'Monitorização invasiva PAM se vasopressor', isRequired: false, conditionalOn: 'Início de vasopressor' },
      { type: OrderSetItemType.NURSING, details: 'Sondagem vesical de demora — débito urinário horário', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.PROCEDURE, details: 'Acesso venoso central se vasopressor', isRequired: false, conditionalOn: 'Necessidade de vasopressor' },
    ],
  },
  {
    id: 'os-colecistectomia-pos',
    name: 'Pós-op Colecistectomia',
    description: 'Prescrição pós-operatória de colecistectomia videolaparoscópica',
    category: OrderSetCategory.SURGERY,
    specialty: 'Cirurgia Geral',
    createdAt: new Date('2024-01-01'),
    items: [
      { type: OrderSetItemType.MEDICATION, details: 'Dipirona 1g IV 6/6h', defaultDose: '1g', defaultFrequency: '6/6h', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Tramadol 100mg IV SOS', defaultDose: '100mg', defaultFrequency: 'SOS', isRequired: false, conditionalOn: 'EVA >= 5' },
      { type: OrderSetItemType.MEDICATION, details: 'Ondansetrona 8mg IV 8/8h SOS', defaultDose: '8mg', defaultFrequency: '8/8h', isRequired: false, conditionalOn: 'Náusea ou vômito' },
      { type: OrderSetItemType.MEDICATION, details: 'Omeprazol 40mg IV 1x/dia', defaultDose: '40mg', defaultFrequency: '1x/dia', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Enoxaparina 40mg SC 1x/dia', defaultDose: '40mg', defaultFrequency: '1x/dia', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.DIET, details: 'Dieta líquida → branda conforme aceitação', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.NURSING, details: 'Deambulação precoce (6h pós-op)', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.NURSING, details: 'Curativo oclusivo nos portais. Trocar em 24h.', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Hemograma e Bilirrubinas se intercorrência', isRequired: false, conditionalOn: 'Suspeita de complicação' },
    ],
  },
  {
    id: 'os-cad-protocolo',
    name: 'Cetoacidose Diabética',
    description: 'Protocolo de tratamento da cetoacidose diabética (CAD)',
    category: OrderSetCategory.ENDOCRINOLOGY,
    specialty: 'Endocrinologia',
    createdAt: new Date('2024-01-01'),
    items: [
      { type: OrderSetItemType.MEDICATION, details: 'SF 0,9% 1000mL IV na 1ª hora', defaultDose: '1000mL', defaultFrequency: '1ª hora', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'SF 0,9% 500mL/h manutenção', defaultDose: '500mL', defaultFrequency: 'Contínuo', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'Insulina Regular 0.1 UI/kg/h BIC', defaultDose: '0.1 UI/kg/h', defaultFrequency: 'Contínuo', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.MEDICATION, details: 'KCl 19,1% 20mEq conforme K+', defaultDose: '20mEq', defaultFrequency: 'Conforme K+', isRequired: true, conditionalOn: 'K+ 3.3-5.3' },
      { type: OrderSetItemType.MEDICATION, details: 'SG 5% 500mL quando glicose < 200', defaultDose: '500mL', defaultFrequency: 'Quando glicose < 200', isRequired: false, conditionalOn: 'Glicemia < 200mg/dL' },
      { type: OrderSetItemType.LAB, details: 'Glicemia capilar horária', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Gasometria arterial a cada 2-4h', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Eletrólitos (Na, K, Cl, Mg, P) a cada 4-6h', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.LAB, details: 'Cetonemia ou cetonúria seriada', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.NURSING, details: 'Balanço hídrico rigoroso', isRequired: true, conditionalOn: undefined },
      { type: OrderSetItemType.PROCEDURE, details: 'Acesso venoso periférico calibroso (2 acessos)', isRequired: true, conditionalOn: undefined },
    ],
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class OrderSetsService {
  private readonly customOrderSets: StoredOrderSet[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Order Set CRUD
  // ──────────────────────────────────────────────────────────────────────────

  createOrderSet(dto: CreateOrderSetDto): StoredOrderSet {
    const id = `os-custom-${Date.now()}`;
    const orderSet: StoredOrderSet = {
      id,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      specialty: dto.specialty,
      items: dto.items.map((item) => ({ ...item })),
      createdAt: new Date(),
    };
    this.customOrderSets.push(orderSet);
    return orderSet;
  }

  getOrderSets(filters?: {
    specialty?: string;
    category?: OrderSetCategory;
  }): StoredOrderSet[] {
    const all = [...BUILT_IN_ORDER_SETS, ...this.customOrderSets];

    return all.filter((os) => {
      if (filters?.specialty && !os.specialty.toLowerCase().includes(filters.specialty.toLowerCase())) {
        return false;
      }
      if (filters?.category && os.category !== filters.category) {
        return false;
      }
      return true;
    });
  }

  getOrderSetById(id: string): StoredOrderSet {
    const all = [...BUILT_IN_ORDER_SETS, ...this.customOrderSets];
    const found = all.find((os) => os.id === id);
    if (!found) {
      throw new NotFoundException(`Order set "${id}" not found`);
    }
    return found;
  }

  async activateOrderSet(
    tenantId: string,
    doctorId: string,
    dto: ActivateOrderSetDto,
  ) {
    const orderSet = this.getOrderSetById(dto.orderSetId);
    const modifications = dto.modifications ?? [];
    const skippedIndices = new Set(
      modifications.filter((m) => m.skip).map((m) => m.itemIndex),
    );

    const modMap = new Map(
      modifications
        .filter((m) => !m.skip)
        .map((m) => [m.itemIndex, m]),
    );

    const activatedItems: Array<{
      type: OrderSetItemType;
      details: string;
      dose: string | null;
      frequency: string | null;
      isRequired: boolean;
      wasModified: boolean;
    }> = [];

    for (let i = 0; i < orderSet.items.length; i++) {
      if (skippedIndices.has(i)) continue;

      const item = orderSet.items[i];
      const mod = modMap.get(i);

      activatedItems.push({
        type: item.type,
        details: item.details,
        dose: mod?.overrideDose ?? item.defaultDose ?? null,
        frequency: mod?.overrideFrequency ?? item.defaultFrequency ?? null,
        isRequired: item.isRequired,
        wasModified: !!mod,
      });
    }

    // Create medication prescription items for MEDICATION type entries
    const medicationItems = activatedItems.filter(
      (item) => item.type === OrderSetItemType.MEDICATION,
    );

    let prescriptionId: string | undefined;

    if (medicationItems.length > 0) {
      const prescription = await this.prisma.prescription.create({
        data: {
          tenantId,
          doctorId,
          patientId: dto.encounterId, // linked through encounter
          encounterId: dto.encounterId,
          type: 'MEDICATION',
          wasGeneratedByAI: false,
          status: 'DRAFT',
          requiresDoubleCheck: true,
          items: {
            create: medicationItems.map((med, idx) => ({
              medicationName: med.details,
              activeIngredient: med.details,
              dose: med.dose ?? '',
              doseUnit: '',
              route: '',
              frequency: med.frequency ?? '',
              specialInstructions: med.isRequired ? 'Item obrigatório do protocolo' : null,
              isHighAlert: false,
              isAntibiotic: false,
              sortOrder: idx,
            })),
          },
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      prescriptionId = prescription.id;
    }

    return {
      orderSetId: orderSet.id,
      orderSetName: orderSet.name,
      prescriptionId: prescriptionId ?? null,
      totalItems: orderSet.items.length,
      activatedItems: activatedItems.length,
      skippedItems: skippedIndices.size,
      modifiedItems: modifications.filter((m) => !m.skip).length,
      items: activatedItems,
      message: `Order set "${orderSet.name}" ativado com ${activatedItems.length} itens (${skippedIndices.size} pulados)`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GFR Calculation
  // ──────────────────────────────────────────────────────────────────────────

  calculateGFR(
    age: number,
    weight: number,
    gender: string,
    creatinine: number,
    formula: GFRFormula,
  ): { gfr: number; gfrCategory: GFRCategory } {
    const isFemale = gender.toUpperCase() === 'F';
    let gfr: number;

    switch (formula) {
      case GFRFormula.COCKCROFT_GAULT: {
        // Cockcroft-Gault: CrCl = (140 - age) × weight / (72 × Cr) × 0.85 if female
        gfr = ((140 - age) * weight) / (72 * creatinine);
        if (isFemale) gfr *= 0.85;
        break;
      }
      case GFRFormula.CKD_EPI: {
        // CKD-EPI 2021 (race-free equation)
        const scr = creatinine;
        if (isFemale) {
          const kappa = 0.7;
          const alpha = -0.241;
          const scrOverKappa = scr / kappa;
          gfr =
            142 *
            Math.pow(Math.min(scrOverKappa, 1), alpha) *
            Math.pow(Math.max(scrOverKappa, 1), -1.200) *
            Math.pow(0.9938, age) *
            1.012;
        } else {
          const kappa = 0.9;
          const alpha = -0.302;
          const scrOverKappa = scr / kappa;
          gfr =
            142 *
            Math.pow(Math.min(scrOverKappa, 1), alpha) *
            Math.pow(Math.max(scrOverKappa, 1), -1.200) *
            Math.pow(0.9938, age);
        }
        break;
      }
      case GFRFormula.MDRD: {
        // MDRD (4-variable, IDMS-traceable)
        // GFR = 175 × Cr^(-1.154) × Age^(-0.203) × 0.742 if female
        gfr = 175 * Math.pow(creatinine, -1.154) * Math.pow(age, -0.203);
        if (isFemale) gfr *= 0.742;
        break;
      }
    }

    gfr = Math.round(gfr * 10) / 10;

    const gfrCategory = this.classifyGFR(gfr);
    return { gfr, gfrCategory };
  }

  private classifyGFR(gfr: number): GFRCategory {
    if (gfr >= 90) return GFRCategory.G1;
    if (gfr >= 60) return GFRCategory.G2;
    if (gfr >= 45) return GFRCategory.G3a;
    if (gfr >= 30) return GFRCategory.G3b;
    if (gfr >= 15) return GFRCategory.G4;
    return GFRCategory.G5;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Child-Pugh Score Calculation
  // ──────────────────────────────────────────────────────────────────────────

  calculateChildPugh(
    bilirubin: number,
    albumin: number,
    inr: number,
    ascites: AscitesSeverity,
    encephalopathy: EncephalopathyGrade,
  ): { score: number; childPughClass: ChildPughClass } {
    let score = 0;

    // Bilirubin (mg/dL)
    if (bilirubin < 2) score += 1;
    else if (bilirubin <= 3) score += 2;
    else score += 3;

    // Albumin (g/dL)
    if (albumin > 3.5) score += 1;
    else if (albumin >= 2.8) score += 2;
    else score += 3;

    // INR
    if (inr < 1.7) score += 1;
    else if (inr <= 2.3) score += 2;
    else score += 3;

    // Ascites
    switch (ascites) {
      case AscitesSeverity.NONE:
        score += 1;
        break;
      case AscitesSeverity.MILD:
        score += 2;
        break;
      case AscitesSeverity.MODERATE_SEVERE:
        score += 3;
        break;
    }

    // Encephalopathy
    switch (encephalopathy) {
      case EncephalopathyGrade.NONE:
        score += 1;
        break;
      case EncephalopathyGrade.GRADE_1_2:
        score += 2;
        break;
      case EncephalopathyGrade.GRADE_3_4:
        score += 3;
        break;
    }

    let childPughClass: ChildPughClass;
    if (score <= 6) childPughClass = ChildPughClass.A;
    else if (score <= 9) childPughClass = ChildPughClass.B;
    else childPughClass = ChildPughClass.C;

    return { score, childPughClass };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Renal Dose Adjustment
  // ──────────────────────────────────────────────────────────────────────────

  checkRenalAdjustment(dto: RenalAdjustmentDto): RenalAdjustmentResultDto {
    const { gfr, gfrCategory } = this.calculateGFR(
      dto.age,
      dto.weight,
      dto.gender,
      dto.creatinine,
      dto.formula,
    );

    const medKey = dto.medicationId.toLowerCase().trim();
    const ruleEntry = Object.entries(RENAL_DOSE_RULES).find(([key]) =>
      medKey.includes(key),
    );

    if (!ruleEntry) {
      return {
        gfr,
        gfrCategory,
        currentDose: 'Dose padrão (sem dados de ajuste renal específico)',
        adjustedDose: 'Sem ajuste específico disponível — consultar bula',
        adjustmentReason: `TFG calculada: ${gfr} mL/min (${gfrCategory}). Medicamento não encontrado na base de ajuste renal.`,
        needsMonitoring: gfr < 45,
      };
    }

    const rule = ruleEntry[1];
    const applicable = rule.adjustments.find(
      (adj) => gfr >= adj.gfrMin && gfr <= adj.gfrMax,
    );

    if (!applicable) {
      return {
        gfr,
        gfrCategory,
        currentDose: rule.defaultDose,
        adjustedDose: rule.defaultDose,
        adjustmentReason: `TFG ${gfr} mL/min (${gfrCategory}): sem necessidade de ajuste de dose.`,
        needsMonitoring: false,
      };
    }

    return {
      gfr,
      gfrCategory,
      currentDose: rule.defaultDose,
      adjustedDose: applicable.dose,
      adjustmentReason: applicable.reason,
      needsMonitoring: applicable.monitoring,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hepatic Dose Adjustment
  // ──────────────────────────────────────────────────────────────────────────

  checkHepaticAdjustment(dto: HepaticAdjustmentDto): ChildPughResultDto {
    const { score, childPughClass } = this.calculateChildPugh(
      dto.bilirubin,
      dto.albumin,
      dto.inr,
      dto.ascites,
      dto.encephalopathy,
    );

    const medKey = dto.medicationId.toLowerCase().trim();
    const ruleEntry = Object.entries(HEPATIC_DOSE_RULES).find(([key]) =>
      medKey.includes(key),
    );

    if (!ruleEntry) {
      const classDescriptions: Record<ChildPughClass, string> = {
        [ChildPughClass.A]: 'Doença hepática compensada (5-6 pontos). Geralmente sem necessidade de ajuste.',
        [ChildPughClass.B]: 'Comprometimento funcional significativo (7-9 pontos). Revisar metabolismo hepático do fármaco.',
        [ChildPughClass.C]: 'Doença hepática descompensada (10-15 pontos). Evitar medicamentos com extenso metabolismo hepático.',
      };

      return {
        score,
        class: childPughClass,
        adjustedDose: 'Sem dados específicos — consultar bula',
        recommendation: classDescriptions[childPughClass],
      };
    }

    const rule = ruleEntry[1];
    const adjustment = rule.adjustments[childPughClass];

    return {
      score,
      class: childPughClass,
      adjustedDose: adjustment.dose,
      recommendation: adjustment.recommendation,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Pregnancy Alert
  // ──────────────────────────────────────────────────────────────────────────

  checkPregnancyAlert(dto: PregnancyCheckDto): PregnancyAlertDto {
    const medKey = dto.medicationId.toLowerCase().trim();
    const trimester = dto.trimester ?? 1;

    const entry = Object.entries(PREGNANCY_DRUG_DB).find(([key]) =>
      medKey.includes(key),
    );

    if (!entry) {
      return {
        medicationId: dto.medicationId,
        fdaCategory: FDAPregnancyCategoryOS.C,
        trimester,
        riskDescription:
          'Medicamento não encontrado na base de classificação gestacional. Classificado como C por precaução.',
        alternatives: [],
      };
    }

    const data = entry[1];
    return {
      medicationId: dto.medicationId,
      fdaCategory: data.fdaCategory,
      trimester,
      riskDescription:
        data.riskByTrimester[trimester] ??
        'Informação de risco não disponível para este trimestre.',
      alternatives: data.alternatives,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lactation Alert
  // ──────────────────────────────────────────────────────────────────────────

  checkLactationAlert(dto: LactationCheckDto): LactationAlertDto {
    const medKey = dto.medicationId.toLowerCase().trim();

    const entry = Object.entries(LACTATION_DRUG_DB).find(([key]) =>
      medKey.includes(key),
    );

    if (!entry) {
      return {
        medicationId: dto.medicationId,
        passesToMilk: false,
        infantRisk: InfantRisk.MODERATE,
        recommendation:
          'Dados de segurança na lactação não disponíveis. Consultar LactMed antes de prescrever.',
        alternatives: [],
      };
    }

    const data = entry[1];
    return {
      medicationId: dto.medicationId,
      passesToMilk: data.passesToMilk,
      infantRisk: data.infantRisk,
      recommendation: data.recommendation,
      alternatives: data.alternatives,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Food-Drug Interactions
  // ──────────────────────────────────────────────────────────────────────────

  checkFoodDrugInteractions(medicationId: string): FoodDrugInteractionDto[] {
    const medKey = medicationId.toLowerCase().trim();

    const entry = Object.entries(FOOD_INTERACTION_DB).find(([key]) =>
      medKey.includes(key),
    );

    if (!entry) {
      return [];
    }

    return entry[1].map((interaction) => ({
      medicationId,
      food: interaction.food,
      interactionType: interaction.interactionType,
      severity: interaction.severity,
      description: interaction.description,
      recommendation: interaction.recommendation,
    }));
  }
}
