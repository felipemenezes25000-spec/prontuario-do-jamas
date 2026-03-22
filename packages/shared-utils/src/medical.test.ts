import { describe, it, expect } from 'vitest';
import {
  calculateBMI,
  classifyBMI,
  calculateMAP,
  calculateGCS,
  classifyBP,
  calculateCrClCockcroftGault,
  calculateAnionGap,
  calculateCorrectedCalcium,
} from './medical.js';

// ─── calculateBMI ───────────────────────────────────────────────────────────

describe('calculateBMI', () => {
  it('should calculate normal BMI correctly (70 kg, 175 cm)', () => {
    // 70 / (1.75^2) = 70 / 3.0625 = 22.857... => 22.9
    expect(calculateBMI(70, 175)).toBe(22.9);
  });

  it('should calculate underweight BMI (50 kg, 175 cm)', () => {
    // 50 / 3.0625 = 16.326... => 16.3
    expect(calculateBMI(50, 175)).toBe(16.3);
  });

  it('should calculate overweight BMI (85 kg, 175 cm)', () => {
    // 85 / 3.0625 = 27.755... => 27.8
    expect(calculateBMI(85, 175)).toBe(27.8);
  });

  it('should calculate obese BMI (120 kg, 170 cm)', () => {
    // 120 / (1.7^2) = 120 / 2.89 = 41.52... => 41.5
    expect(calculateBMI(120, 170)).toBe(41.5);
  });

  it('should handle short height (60 kg, 150 cm)', () => {
    // 60 / (1.5^2) = 60 / 2.25 = 26.666... => 26.7
    expect(calculateBMI(60, 150)).toBe(26.7);
  });

  it('should throw on zero weight', () => {
    expect(() => calculateBMI(0, 175)).toThrow();
  });

  it('should throw on zero height', () => {
    expect(() => calculateBMI(70, 0)).toThrow();
  });

  it('should throw on negative weight', () => {
    expect(() => calculateBMI(-70, 175)).toThrow();
  });

  it('should throw on negative height', () => {
    expect(() => calculateBMI(70, -175)).toThrow();
  });
});

// ─── classifyBMI ────────────────────────────────────────────────────────────

describe('classifyBMI', () => {
  it('should classify underweight (BMI < 18.5)', () => {
    expect(classifyBMI(16.3)).toBe('UNDERWEIGHT');
  });

  it('should classify normal (18.5 <= BMI < 25)', () => {
    expect(classifyBMI(22.9)).toBe('NORMAL');
  });

  it('should classify overweight (25 <= BMI < 30)', () => {
    expect(classifyBMI(27.8)).toBe('OVERWEIGHT');
  });

  it('should classify obesity 1 (30 <= BMI < 35)', () => {
    expect(classifyBMI(32)).toBe('OBESITY_1');
  });

  it('should classify obesity 2 (35 <= BMI < 40)', () => {
    expect(classifyBMI(37)).toBe('OBESITY_2');
  });

  it('should classify obesity 3 (BMI >= 40)', () => {
    expect(classifyBMI(41.5)).toBe('OBESITY_3');
  });

  it('should classify boundary at 18.5 as NORMAL', () => {
    expect(classifyBMI(18.5)).toBe('NORMAL');
  });

  it('should classify boundary at 25 as OVERWEIGHT', () => {
    expect(classifyBMI(25)).toBe('OVERWEIGHT');
  });
});

// ─── calculateMAP ───────────────────────────────────────────────────────────

describe('calculateMAP', () => {
  it('should calculate MAP for normal BP (120/80)', () => {
    // 80 + (120 - 80) / 3 = 80 + 13.33 = 93.33 => 93
    expect(calculateMAP(120, 80)).toBe(93);
  });

  it('should calculate MAP for hypertension (180/110)', () => {
    // 110 + (180 - 110) / 3 = 110 + 23.33 = 133.33 => 133
    expect(calculateMAP(180, 110)).toBe(133);
  });

  it('should calculate MAP for hypotension (90/60)', () => {
    // 60 + (90 - 60) / 3 = 60 + 10 = 70
    expect(calculateMAP(90, 60)).toBe(70);
  });

  it('should calculate MAP for equal systolic and diastolic', () => {
    // 100 + (100 - 100) / 3 = 100
    expect(calculateMAP(100, 100)).toBe(100);
  });

  it('should throw on zero systolic', () => {
    expect(() => calculateMAP(0, 80)).toThrow();
  });

  it('should throw on zero diastolic', () => {
    expect(() => calculateMAP(120, 0)).toThrow();
  });

  it('should throw on negative values', () => {
    expect(() => calculateMAP(-120, 80)).toThrow();
  });
});

// ─── calculateGCS ───────────────────────────────────────────────────────────

describe('calculateGCS', () => {
  it('should return minimum GCS of 3 (1+1+1)', () => {
    expect(calculateGCS(1, 1, 1)).toBe(3);
  });

  it('should return maximum GCS of 15 (4+5+6)', () => {
    expect(calculateGCS(4, 5, 6)).toBe(15);
  });

  it('should calculate moderate GCS (3+3+5 = 11)', () => {
    expect(calculateGCS(3, 3, 5)).toBe(11);
  });

  it('should calculate GCS of 8 (2+2+4)', () => {
    expect(calculateGCS(2, 2, 4)).toBe(8);
  });

  it('should calculate GCS of 7 (2+1+4)', () => {
    expect(calculateGCS(2, 1, 4)).toBe(7);
  });

  it('should throw on eye value out of range (0)', () => {
    expect(() => calculateGCS(0, 5, 6)).toThrow();
  });

  it('should throw on eye value out of range (5)', () => {
    expect(() => calculateGCS(5, 5, 6)).toThrow();
  });

  it('should throw on verbal value out of range (0)', () => {
    expect(() => calculateGCS(4, 0, 6)).toThrow();
  });

  it('should throw on verbal value out of range (6)', () => {
    expect(() => calculateGCS(4, 6, 6)).toThrow();
  });

  it('should throw on motor value out of range (0)', () => {
    expect(() => calculateGCS(4, 5, 0)).toThrow();
  });

  it('should throw on motor value out of range (7)', () => {
    expect(() => calculateGCS(4, 5, 7)).toThrow();
  });
});

// ─── classifyBP ─────────────────────────────────────────────────────────────

describe('classifyBP', () => {
  it('should classify normal BP (110/70)', () => {
    expect(classifyBP(110, 70)).toBe('NORMAL');
  });

  it('should classify elevated BP (125/75)', () => {
    expect(classifyBP(125, 75)).toBe('ELEVATED');
  });

  it('should classify hypertension stage 1 (135/85)', () => {
    expect(classifyBP(135, 85)).toBe('HYPERTENSION_1');
  });

  it('should classify hypertension stage 1 based on diastolic only (125/82)', () => {
    expect(classifyBP(125, 82)).toBe('HYPERTENSION_1');
  });

  it('should classify hypertension stage 2 (150/95)', () => {
    expect(classifyBP(150, 95)).toBe('HYPERTENSION_2');
  });

  it('should classify hypertension stage 2 based on diastolic only (130/92)', () => {
    expect(classifyBP(130, 92)).toBe('HYPERTENSION_2');
  });

  it('should classify crisis (180/120)', () => {
    expect(classifyBP(180, 120)).toBe('CRISIS');
  });

  it('should classify crisis based on systolic only (185/90)', () => {
    expect(classifyBP(185, 90)).toBe('CRISIS');
  });

  it('should classify crisis based on diastolic only (140/125)', () => {
    expect(classifyBP(140, 125)).toBe('CRISIS');
  });

  it('should classify boundary 120/79 as ELEVATED', () => {
    expect(classifyBP(120, 79)).toBe('ELEVATED');
  });

  it('should classify 119/79 as NORMAL', () => {
    expect(classifyBP(119, 79)).toBe('NORMAL');
  });
});

// ─── calculateCrClCockcroftGault ────────────────────────────────────────────

describe('calculateCrClCockcroftGault', () => {
  it('should calculate CrCl for a 40yo male, 70 kg, creatinine 1.0', () => {
    // (140 - 40) * 70 / (72 * 1.0) = 100 * 70 / 72 = 7000 / 72 = 97.222... => 97.2
    expect(calculateCrClCockcroftGault(40, 70, 1.0, false)).toBe(97.2);
  });

  it('should calculate CrCl for a 40yo female, 70 kg, creatinine 1.0', () => {
    // 97.222 * 0.85 = 82.638... => 82.6
    expect(calculateCrClCockcroftGault(40, 70, 1.0, true)).toBe(82.6);
  });

  it('should calculate CrCl for an elderly patient (80yo male, 60 kg, creatinine 1.5)', () => {
    // (140 - 80) * 60 / (72 * 1.5) = 60 * 60 / 108 = 3600 / 108 = 33.333... => 33.3
    expect(calculateCrClCockcroftGault(80, 60, 1.5, false)).toBe(33.3);
  });

  it('should calculate CrCl for a young heavy patient (25yo male, 100 kg, creatinine 0.8)', () => {
    // (140 - 25) * 100 / (72 * 0.8) = 115 * 100 / 57.6 = 11500 / 57.6 = 199.652... => 199.7
    expect(calculateCrClCockcroftGault(25, 100, 0.8, false)).toBe(199.7);
  });

  it('should calculate CrCl for elderly female (75yo, 55 kg, creatinine 1.2)', () => {
    // (140 - 75) * 55 / (72 * 1.2) = 65 * 55 / 86.4 = 3575 / 86.4 = 41.377... * 0.85 = 35.17... => 35.2
    expect(calculateCrClCockcroftGault(75, 55, 1.2, true)).toBe(35.2);
  });

  it('should throw on zero age', () => {
    expect(() => calculateCrClCockcroftGault(0, 70, 1.0, false)).toThrow();
  });

  it('should throw on zero weight', () => {
    expect(() => calculateCrClCockcroftGault(40, 0, 1.0, false)).toThrow();
  });

  it('should throw on zero creatinine', () => {
    expect(() => calculateCrClCockcroftGault(40, 70, 0, false)).toThrow();
  });

  it('should throw on negative parameters', () => {
    expect(() => calculateCrClCockcroftGault(-5, 70, 1.0, false)).toThrow();
  });
});

// ─── calculateAnionGap ──────────────────────────────────────────────────────

describe('calculateAnionGap', () => {
  it('should calculate normal anion gap (Na=140, Cl=104, HCO3=24)', () => {
    // 140 - (104 + 24) = 12
    expect(calculateAnionGap(140, 104, 24)).toBe(12);
  });

  it('should calculate elevated anion gap (Na=145, Cl=100, HCO3=15)', () => {
    // 145 - (100 + 15) = 30
    expect(calculateAnionGap(145, 100, 15)).toBe(30);
  });

  it('should calculate low anion gap (Na=135, Cl=110, HCO3=28)', () => {
    // 135 - (110 + 28) = -3
    expect(calculateAnionGap(135, 110, 28)).toBe(-3);
  });

  it('should handle zero values', () => {
    expect(calculateAnionGap(140, 0, 0)).toBe(140);
  });

  it('should return 0 when Na equals Cl + HCO3', () => {
    expect(calculateAnionGap(140, 100, 40)).toBe(0);
  });
});

// ─── calculateCorrectedCalcium ──────────────────────────────────────────────

describe('calculateCorrectedCalcium', () => {
  it('should return same calcium when albumin is 4.0', () => {
    // 9.0 + 0.8 * (4.0 - 4.0) = 9.0
    expect(calculateCorrectedCalcium(9.0, 4.0)).toBe(9);
  });

  it('should correct upward for low albumin (albumin 2.0)', () => {
    // 8.0 + 0.8 * (4.0 - 2.0) = 8.0 + 1.6 = 9.6
    expect(calculateCorrectedCalcium(8.0, 2.0)).toBe(9.6);
  });

  it('should correct downward for high albumin (albumin 5.5)', () => {
    // 10.0 + 0.8 * (4.0 - 5.5) = 10.0 - 1.2 = 8.8
    expect(calculateCorrectedCalcium(10.0, 5.5)).toBe(8.8);
  });

  it('should handle very low albumin (albumin 1.0)', () => {
    // 7.5 + 0.8 * (4.0 - 1.0) = 7.5 + 2.4 = 9.9
    expect(calculateCorrectedCalcium(7.5, 1.0)).toBe(9.9);
  });

  it('should handle normal albumin (albumin 3.5)', () => {
    // 9.0 + 0.8 * (4.0 - 3.5) = 9.0 + 0.4 = 9.4
    expect(calculateCorrectedCalcium(9.0, 3.5)).toBe(9.4);
  });
});
