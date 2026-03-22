// ─── Glasgow Coma Scale ──────────────────────────────────────────────────────

export interface GlasgowItem {
  score: number;
  description: string;
  descriptionEn: string;
}

export interface GlasgowInterpretation {
  range: [number, number];
  label: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
}

export const GLASGOW_SCALE = {
  eye: [
    { score: 4, description: 'Espontânea', descriptionEn: 'Spontaneous' },
    { score: 3, description: 'Ao comando verbal', descriptionEn: 'To voice' },
    { score: 2, description: 'À dor', descriptionEn: 'To pain' },
    { score: 1, description: 'Nenhuma', descriptionEn: 'None' },
  ] as readonly GlasgowItem[],
  verbal: [
    { score: 5, description: 'Orientado', descriptionEn: 'Oriented' },
    { score: 4, description: 'Confuso', descriptionEn: 'Confused' },
    { score: 3, description: 'Palavras inapropriadas', descriptionEn: 'Inappropriate words' },
    { score: 2, description: 'Sons incompreensíveis', descriptionEn: 'Incomprehensible sounds' },
    { score: 1, description: 'Nenhuma', descriptionEn: 'None' },
  ] as readonly GlasgowItem[],
  motor: [
    { score: 6, description: 'Obedece comandos', descriptionEn: 'Obeys commands' },
    { score: 5, description: 'Localiza dor', descriptionEn: 'Localizes pain' },
    { score: 4, description: 'Flexão normal (retirada)', descriptionEn: 'Withdrawal' },
    { score: 3, description: 'Flexão anormal (decorticação)', descriptionEn: 'Abnormal flexion' },
    { score: 2, description: 'Extensão (descerebração)', descriptionEn: 'Extension' },
    { score: 1, description: 'Nenhuma', descriptionEn: 'None' },
  ] as readonly GlasgowItem[],
  interpretation: [
    { range: [13, 15], label: 'Leve', severity: 'MILD' },
    { range: [9, 12], label: 'Moderado', severity: 'MODERATE' },
    { range: [3, 8], label: 'Grave', severity: 'SEVERE' },
  ] as readonly GlasgowInterpretation[],
} as const;

// ─── Braden Scale (Pressure Ulcer Risk) ──────────────────────────────────────

export interface BradenOption {
  score: number;
  label: string;
}

export interface BradenCategory {
  name: string;
  nameEn: string;
  options: readonly BradenOption[];
}

export interface BradenInterpretation {
  range: [number, number];
  label: string;
  color: string;
}

export const BRADEN_SCALE = {
  categories: [
    {
      name: 'Percepção Sensorial',
      nameEn: 'Sensory Perception',
      options: [
        { score: 1, label: 'Totalmente limitado' },
        { score: 2, label: 'Muito limitado' },
        { score: 3, label: 'Levemente limitado' },
        { score: 4, label: 'Nenhuma limitação' },
      ],
    },
    {
      name: 'Umidade',
      nameEn: 'Moisture',
      options: [
        { score: 1, label: 'Constantemente úmida' },
        { score: 2, label: 'Muito úmida' },
        { score: 3, label: 'Ocasionalmente úmida' },
        { score: 4, label: 'Raramente úmida' },
      ],
    },
    {
      name: 'Atividade',
      nameEn: 'Activity',
      options: [
        { score: 1, label: 'Acamado' },
        { score: 2, label: 'Confinado à cadeira' },
        { score: 3, label: 'Caminha ocasionalmente' },
        { score: 4, label: 'Caminha frequentemente' },
      ],
    },
    {
      name: 'Mobilidade',
      nameEn: 'Mobility',
      options: [
        { score: 1, label: 'Totalmente imóvel' },
        { score: 2, label: 'Muito limitada' },
        { score: 3, label: 'Levemente limitada' },
        { score: 4, label: 'Sem limitações' },
      ],
    },
    {
      name: 'Nutrição',
      nameEn: 'Nutrition',
      options: [
        { score: 1, label: 'Muito pobre' },
        { score: 2, label: 'Provavelmente inadequada' },
        { score: 3, label: 'Adequada' },
        { score: 4, label: 'Excelente' },
      ],
    },
    {
      name: 'Fricção e Cisalhamento',
      nameEn: 'Friction and Shear',
      options: [
        { score: 1, label: 'Problema' },
        { score: 2, label: 'Problema potencial' },
        { score: 3, label: 'Nenhum problema aparente' },
      ],
    },
  ] as readonly BradenCategory[],
  interpretation: [
    { range: [6, 11], label: 'Risco muito alto', color: 'red' },
    { range: [12, 14], label: 'Risco alto', color: 'orange' },
    { range: [15, 16], label: 'Risco moderado', color: 'yellow' },
    { range: [17, 18], label: 'Baixo risco', color: 'green' },
    { range: [19, 23], label: 'Sem risco', color: 'blue' },
  ] as readonly BradenInterpretation[],
} as const;

// ─── Morse Fall Risk Scale ───────────────────────────────────────────────────

export interface MorseOption {
  score: number;
  label: string;
}

export interface MorseCategory {
  name: string;
  nameEn: string;
  options: readonly MorseOption[];
}

export interface MorseInterpretation {
  range: [number, number];
  label: string;
  color: string;
}

export const MORSE_FALL_SCALE = {
  categories: [
    {
      name: 'Histórico de quedas',
      nameEn: 'History of falling',
      options: [
        { score: 0, label: 'Não' },
        { score: 25, label: 'Sim' },
      ],
    },
    {
      name: 'Diagnóstico secundário',
      nameEn: 'Secondary diagnosis',
      options: [
        { score: 0, label: 'Não' },
        { score: 15, label: 'Sim' },
      ],
    },
    {
      name: 'Auxílio para deambulação',
      nameEn: 'Ambulatory aid',
      options: [
        { score: 0, label: 'Nenhum / acamado / cadeira de rodas' },
        { score: 15, label: 'Muleta / bengala / andador' },
        { score: 30, label: 'Apoia em mobília' },
      ],
    },
    {
      name: 'Terapia IV / Dispositivo heparinizado',
      nameEn: 'IV therapy / Heparin lock',
      options: [
        { score: 0, label: 'Não' },
        { score: 20, label: 'Sim' },
      ],
    },
    {
      name: 'Marcha',
      nameEn: 'Gait',
      options: [
        { score: 0, label: 'Normal / acamado / cadeira de rodas' },
        { score: 10, label: 'Fraca' },
        { score: 20, label: 'Comprometida' },
      ],
    },
    {
      name: 'Estado mental',
      nameEn: 'Mental status',
      options: [
        { score: 0, label: 'Orientado / capaz' },
        { score: 15, label: 'Superestima capacidade / esquece limitações' },
      ],
    },
  ] as readonly MorseCategory[],
  interpretation: [
    { range: [0, 24], label: 'Baixo risco', color: 'green' },
    { range: [25, 44], label: 'Risco moderado', color: 'yellow' },
    { range: [45, 125], label: 'Risco alto', color: 'red' },
  ] as readonly MorseInterpretation[],
} as const;

// ─── MEWS - Modified Early Warning Score ─────────────────────────────────────

export interface MEWSScoreRange {
  range: [number | null, number | null];
  score: number;
}

export interface MEWSParameter {
  name: string;
  nameEn: string;
  unit: string;
  scores: readonly MEWSScoreRange[];
}

export interface MEWSInterpretation {
  range: [number, number];
  label: string;
  action: string;
}

export const MEWS_SCALE = {
  parameters: [
    {
      name: 'Frequência Respiratória',
      nameEn: 'Respiratory Rate',
      unit: 'irpm',
      scores: [
        { range: [null, 8], score: 2 },
        { range: [9, 14], score: 0 },
        { range: [15, 20], score: 1 },
        { range: [21, 29], score: 2 },
        { range: [30, null], score: 3 },
      ],
    },
    {
      name: 'Frequência Cardíaca',
      nameEn: 'Heart Rate',
      unit: 'bpm',
      scores: [
        { range: [null, 40], score: 2 },
        { range: [41, 50], score: 1 },
        { range: [51, 100], score: 0 },
        { range: [101, 110], score: 1 },
        { range: [111, 129], score: 2 },
        { range: [130, null], score: 3 },
      ],
    },
    {
      name: 'Pressão Arterial Sistólica',
      nameEn: 'Systolic Blood Pressure',
      unit: 'mmHg',
      scores: [
        { range: [null, 70], score: 3 },
        { range: [71, 80], score: 2 },
        { range: [81, 100], score: 1 },
        { range: [101, 199], score: 0 },
        { range: [200, null], score: 2 },
      ],
    },
    {
      name: 'Temperatura',
      nameEn: 'Temperature',
      unit: '°C',
      scores: [
        { range: [null, 35.0], score: 2 },
        { range: [35.1, 36.0], score: 1 },
        { range: [36.1, 38.0], score: 0 },
        { range: [38.1, 38.5], score: 1 },
        { range: [38.6, null], score: 2 },
      ],
    },
    {
      name: 'Nível de Consciência',
      nameEn: 'Level of Consciousness',
      unit: 'AVPU',
      scores: [
        { range: [0, 0], score: 0 },  // A - Alerta
        { range: [1, 1], score: 1 },  // V - Responde à voz
        { range: [2, 2], score: 2 },  // P - Responde à dor
        { range: [3, 3], score: 3 },  // U - Não responsivo
      ],
    },
  ] as readonly MEWSParameter[],
  consciousnessLabels: [
    { value: 0, label: 'Alerta (A)', labelEn: 'Alert (A)' },
    { value: 1, label: 'Responde à voz (V)', labelEn: 'Voice (V)' },
    { value: 2, label: 'Responde à dor (P)', labelEn: 'Pain (P)' },
    { value: 3, label: 'Não responsivo (U)', labelEn: 'Unresponsive (U)' },
  ] as const,
  interpretation: [
    { range: [0, 2], label: 'Baixo risco', action: 'Monitorização de rotina' },
    { range: [3, 4], label: 'Risco médio', action: 'Aumentar frequência de monitorização' },
    { range: [5, 6], label: 'Risco alto', action: 'Notificar médico, considerar UTI' },
    { range: [7, 14], label: 'Risco muito alto', action: 'Acionamento imediato time de resposta rápida' },
  ] as readonly MEWSInterpretation[],
} as const;

// ─── Pain Scale (Visual Analog Scale - EVA) ──────────────────────────────────

export interface PainLevel {
  range: [number, number];
  label: string;
  labelEn: string;
  color: string;
}

export const PAIN_SCALE = {
  levels: [
    { range: [0, 0], label: 'Sem dor', labelEn: 'No pain', color: '#16A34A' },
    { range: [1, 3], label: 'Dor leve', labelEn: 'Mild pain', color: '#84CC16' },
    { range: [4, 6], label: 'Dor moderada', labelEn: 'Moderate pain', color: '#EAB308' },
    { range: [7, 9], label: 'Dor intensa', labelEn: 'Severe pain', color: '#F97316' },
    { range: [10, 10], label: 'Dor insuportável', labelEn: 'Worst possible pain', color: '#DC2626' },
  ] as readonly PainLevel[],
} as const;

// ─── RASS - Richmond Agitation-Sedation Scale ────────────────────────────────

export interface RASSLevel {
  score: number;
  term: string;
  termEn: string;
  description: string;
}

export const RASS_SCALE = {
  levels: [
    { score: 4, term: 'Combativo', termEn: 'Combative', description: 'Combativo, violento, perigo imediato para a equipe' },
    { score: 3, term: 'Muito agitado', termEn: 'Very agitated', description: 'Puxa ou remove tubos/cateteres, agressivo' },
    { score: 2, term: 'Agitado', termEn: 'Agitated', description: 'Movimentos frequentes e sem propósito, luta com o ventilador' },
    { score: 1, term: 'Inquieto', termEn: 'Restless', description: 'Movimentos ansiosos, mas não agressivos ou vigorosos' },
    { score: 0, term: 'Alerta e calmo', termEn: 'Alert and calm', description: 'Alerta, calmo' },
    { score: -1, term: 'Sonolento', termEn: 'Drowsy', description: 'Não completamente alerta, mas mantém despertar sustentado (> 10s) ao comando verbal' },
    { score: -2, term: 'Sedação leve', termEn: 'Light sedation', description: 'Desperta brevemente ao comando verbal, contato visual (< 10s)' },
    { score: -3, term: 'Sedação moderada', termEn: 'Moderate sedation', description: 'Movimento ou abertura ocular ao comando verbal, sem contato visual' },
    { score: -4, term: 'Sedação profunda', termEn: 'Deep sedation', description: 'Sem resposta ao comando verbal, movimento ou abertura ocular ao estímulo físico' },
    { score: -5, term: 'Não responsivo', termEn: 'Unarousable', description: 'Sem resposta a comando verbal ou estímulo físico' },
  ] as readonly RASSLevel[],
} as const;

// ─── NEWS2 - National Early Warning Score 2 ──────────────────────────────────

export interface NEWS2ScoreRange {
  range: [number | null, number | null];
  score: number;
}

export interface NEWS2Parameter {
  name: string;
  nameEn: string;
  unit: string;
  scores: readonly NEWS2ScoreRange[];
}

export const NEWS2_SCALE = {
  parameters: [
    {
      name: 'Frequência Respiratória',
      nameEn: 'Respiration Rate',
      unit: 'irpm',
      scores: [
        { range: [null, 8], score: 3 },
        { range: [9, 11], score: 1 },
        { range: [12, 20], score: 0 },
        { range: [21, 24], score: 2 },
        { range: [25, null], score: 3 },
      ],
    },
    {
      name: 'SpO2 Escala 1 (sem DPOC)',
      nameEn: 'SpO2 Scale 1 (no COPD)',
      unit: '%',
      scores: [
        { range: [null, 91], score: 3 },
        { range: [92, 93], score: 2 },
        { range: [94, 95], score: 1 },
        { range: [96, null], score: 0 },
      ],
    },
    {
      name: 'SpO2 Escala 2 (DPOC)',
      nameEn: 'SpO2 Scale 2 (COPD)',
      unit: '%',
      scores: [
        { range: [null, 83], score: 3 },
        { range: [84, 85], score: 2 },
        { range: [86, 87], score: 1 },
        { range: [88, 92], score: 0 },
        { range: [93, 94], score: 1 },
        { range: [95, 96], score: 2 },
        { range: [97, null], score: 3 },
      ],
    },
    {
      name: 'Ar ambiente ou oxigênio',
      nameEn: 'Air or oxygen',
      unit: '',
      scores: [
        { range: [0, 0], score: 0 },  // Ar ambiente
        { range: [1, 1], score: 2 },  // Oxigênio suplementar
      ],
    },
    {
      name: 'Pressão Arterial Sistólica',
      nameEn: 'Systolic Blood Pressure',
      unit: 'mmHg',
      scores: [
        { range: [null, 90], score: 3 },
        { range: [91, 100], score: 2 },
        { range: [101, 110], score: 1 },
        { range: [111, 219], score: 0 },
        { range: [220, null], score: 3 },
      ],
    },
    {
      name: 'Frequência Cardíaca',
      nameEn: 'Pulse',
      unit: 'bpm',
      scores: [
        { range: [null, 40], score: 3 },
        { range: [41, 50], score: 1 },
        { range: [51, 90], score: 0 },
        { range: [91, 110], score: 1 },
        { range: [111, 130], score: 2 },
        { range: [131, null], score: 3 },
      ],
    },
    {
      name: 'Nível de Consciência',
      nameEn: 'Consciousness',
      unit: 'ACVPU',
      scores: [
        { range: [0, 0], score: 0 },  // Alerta
        { range: [1, 1], score: 3 },  // Confusão de novo
        { range: [2, 2], score: 3 },  // Voz
        { range: [3, 3], score: 3 },  // Dor
        { range: [4, 4], score: 3 },  // Não responsivo
      ],
    },
    {
      name: 'Temperatura',
      nameEn: 'Temperature',
      unit: '°C',
      scores: [
        { range: [null, 35.0], score: 3 },
        { range: [35.1, 36.0], score: 1 },
        { range: [36.1, 38.0], score: 0 },
        { range: [38.1, 39.0], score: 1 },
        { range: [39.1, null], score: 2 },
      ],
    },
  ] as readonly NEWS2Parameter[],
  interpretation: [
    { range: [0, 0], label: 'Baixo', action: 'Monitorização de rotina (mínimo 12/12h)', color: 'green' },
    { range: [1, 4], label: 'Baixo', action: 'Monitorização mínimo 4-6h, informar enfermeiro responsável', color: 'yellow' },
    { range: [5, 6], label: 'Médio', action: 'Aumentar frequência para mínimo 1/1h, avaliação médica urgente', color: 'orange' },
    { range: [7, 20], label: 'Alto', action: 'Monitorização contínua, emergência médica, considerar UTI', color: 'red' },
  ] as const,
} as const;

// ─── Apgar Score (Neonatal) ──────────────────────────────────────────────────

export interface ApgarCategory {
  name: string;
  nameEn: string;
  options: readonly { score: number; label: string }[];
}

export const APGAR_SCALE = {
  categories: [
    {
      name: 'Aparência (Cor)',
      nameEn: 'Appearance (Color)',
      options: [
        { score: 0, label: 'Cianose central / palidez' },
        { score: 1, label: 'Acrocianose / corpo rosado' },
        { score: 2, label: 'Rosado por completo' },
      ],
    },
    {
      name: 'Pulso (FC)',
      nameEn: 'Pulse (Heart Rate)',
      options: [
        { score: 0, label: 'Ausente' },
        { score: 1, label: '< 100 bpm' },
        { score: 2, label: '>= 100 bpm' },
      ],
    },
    {
      name: 'Irritabilidade reflexa (Careta)',
      nameEn: 'Grimace (Reflex irritability)',
      options: [
        { score: 0, label: 'Sem resposta' },
        { score: 1, label: 'Careta / choro fraco' },
        { score: 2, label: 'Choro vigoroso / tosse / espirro' },
      ],
    },
    {
      name: 'Atividade (Tônus muscular)',
      nameEn: 'Activity (Muscle tone)',
      options: [
        { score: 0, label: 'Flácido' },
        { score: 1, label: 'Alguma flexão' },
        { score: 2, label: 'Movimento ativo / boa flexão' },
      ],
    },
    {
      name: 'Respiração',
      nameEn: 'Respiration',
      options: [
        { score: 0, label: 'Ausente' },
        { score: 1, label: 'Irregular / fraca / gasping' },
        { score: 2, label: 'Choro forte / respiração regular' },
      ],
    },
  ] as readonly ApgarCategory[],
  interpretation: [
    { range: [7, 10], label: 'Normal', severity: 'NORMAL' as const },
    { range: [4, 6], label: 'Moderadamente deprimido', severity: 'MODERATE' as const },
    { range: [0, 3], label: 'Gravemente deprimido', severity: 'SEVERE' as const },
  ] as const,
  timingMinutes: [1, 5, 10] as const,
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Calcula escore de Glasgow dado os valores de abertura ocular, resposta verbal e resposta motora.
 */
export function calculateGlasgow(eye: number, verbal: number, motor: number): {
  total: number;
  label: string;
  severity: string;
} {
  const total = eye + verbal + motor;
  const interp = GLASGOW_SCALE.interpretation.find(
    (i) => total >= i.range[0] && total <= i.range[1],
  );
  return {
    total,
    label: interp?.label ?? 'Indeterminado',
    severity: interp?.severity ?? 'UNKNOWN',
  };
}

/**
 * Calcula escore de Braden dado os valores de cada categoria.
 */
export function calculateBraden(scores: number[]): {
  total: number;
  label: string;
  color: string;
} {
  const total = scores.reduce((acc, s) => acc + s, 0);
  const interp = BRADEN_SCALE.interpretation.find(
    (i) => total >= i.range[0] && total <= i.range[1],
  );
  return {
    total,
    label: interp?.label ?? 'Indeterminado',
    color: interp?.color ?? 'gray',
  };
}

/**
 * Calcula escore de Morse dado os valores de cada categoria.
 */
export function calculateMorse(scores: number[]): {
  total: number;
  label: string;
  color: string;
} {
  const total = scores.reduce((acc, s) => acc + s, 0);
  const interp = MORSE_FALL_SCALE.interpretation.find(
    (i) => total >= i.range[0] && total <= i.range[1],
  );
  return {
    total,
    label: interp?.label ?? 'Indeterminado',
    color: interp?.color ?? 'gray',
  };
}

/**
 * Retorna o nível de dor dado o valor EVA (0-10).
 */
export function getPainLevel(value: number): PainLevel | undefined {
  return PAIN_SCALE.levels.find(
    (l) => value >= l.range[0] && value <= l.range[1],
  );
}
