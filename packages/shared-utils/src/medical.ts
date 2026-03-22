/**
 * Classificação de pressão arterial.
 */
export type BPClassification =
  | 'NORMAL'
  | 'ELEVATED'
  | 'HYPERTENSION_1'
  | 'HYPERTENSION_2'
  | 'CRISIS';

/**
 * Classificação de IMC.
 */
export type BMIClassification =
  | 'UNDERWEIGHT'
  | 'NORMAL'
  | 'OVERWEIGHT'
  | 'OBESITY_1'
  | 'OBESITY_2'
  | 'OBESITY_3';

/**
 * Calcula o IMC (Índice de Massa Corporal).
 * @param weightKg Peso em quilogramas
 * @param heightCm Altura em centímetros
 * @returns IMC arredondado com 1 casa decimal
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) {
    throw new Error('Peso e altura devem ser maiores que zero.');
  }
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Classifica o IMC de acordo com a OMS.
 */
export function classifyBMI(bmi: number): BMIClassification {
  if (bmi < 18.5) return 'UNDERWEIGHT';
  if (bmi < 25) return 'NORMAL';
  if (bmi < 30) return 'OVERWEIGHT';
  if (bmi < 35) return 'OBESITY_1';
  if (bmi < 40) return 'OBESITY_2';
  return 'OBESITY_3';
}

/**
 * Calcula a PAM (Pressão Arterial Média).
 * PAM = PAD + 1/3 * (PAS - PAD)
 * @param systolic Pressão sistólica (mmHg)
 * @param diastolic Pressão diastólica (mmHg)
 * @returns PAM arredondada para inteiro
 */
export function calculateMAP(systolic: number, diastolic: number): number {
  if (systolic <= 0 || diastolic <= 0) {
    throw new Error('Valores de pressão devem ser maiores que zero.');
  }
  return Math.round(diastolic + (systolic - diastolic) / 3);
}

/**
 * Calcula a Escala de Coma de Glasgow (GCS).
 * @param eye Resposta ocular (1-4)
 * @param verbal Resposta verbal (1-5)
 * @param motor Resposta motora (1-6)
 * @returns Pontuação total (3-15)
 */
export function calculateGCS(eye: number, verbal: number, motor: number): number {
  if (eye < 1 || eye > 4) throw new Error('Resposta ocular deve ser entre 1 e 4.');
  if (verbal < 1 || verbal > 5) throw new Error('Resposta verbal deve ser entre 1 e 5.');
  if (motor < 1 || motor > 6) throw new Error('Resposta motora deve ser entre 1 e 6.');
  return eye + verbal + motor;
}

/**
 * Classifica a pressão arterial conforme AHA/ACC.
 * @param systolic Pressão sistólica (mmHg)
 * @param diastolic Pressão diastólica (mmHg)
 */
export function classifyBP(systolic: number, diastolic: number): BPClassification {
  if (systolic >= 180 || diastolic >= 120) return 'CRISIS';
  if (systolic >= 140 || diastolic >= 90) return 'HYPERTENSION_2';
  if (systolic >= 130 || diastolic >= 80) return 'HYPERTENSION_1';
  if (systolic >= 120 && diastolic < 80) return 'ELEVATED';
  return 'NORMAL';
}

/**
 * Calcula o Clearance de Creatinina pela fórmula de Cockcroft-Gault.
 * @param age Idade em anos
 * @param weightKg Peso em kg
 * @param serumCreatinine Creatinina sérica em mg/dL
 * @param isFemale Se o paciente é do sexo feminino
 * @returns CrCl em mL/min, arredondado com 1 casa decimal
 */
export function calculateCrClCockcroftGault(
  age: number,
  weightKg: number,
  serumCreatinine: number,
  isFemale: boolean,
): number {
  if (age <= 0 || weightKg <= 0 || serumCreatinine <= 0) {
    throw new Error('Todos os parâmetros devem ser maiores que zero.');
  }
  let result = ((140 - age) * weightKg) / (72 * serumCreatinine);
  if (isFemale) {
    result *= 0.85;
  }
  return Math.round(result * 10) / 10;
}

/**
 * Calcula o Anion Gap.
 * AG = Na+ - (Cl- + HCO3-)
 * @param sodium Na+ em mEq/L
 * @param chloride Cl- em mEq/L
 * @param bicarbonate HCO3- em mEq/L
 * @returns Anion Gap em mEq/L
 */
export function calculateAnionGap(
  sodium: number,
  chloride: number,
  bicarbonate: number,
): number {
  return Math.round((sodium - (chloride + bicarbonate)) * 10) / 10;
}

/**
 * Calcula o cálcio corrigido pela albumina.
 * Ca corrigido = Ca medido + 0.8 * (4.0 - albumina)
 * @param totalCalcium Cálcio total em mg/dL
 * @param albumin Albumina em g/dL
 * @returns Cálcio corrigido em mg/dL, arredondado com 1 casa decimal
 */
export function calculateCorrectedCalcium(totalCalcium: number, albumin: number): number {
  return Math.round((totalCalcium + 0.8 * (4.0 - albumin)) * 10) / 10;
}
