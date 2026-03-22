import { describe, it, expect } from 'vitest';
import {
  GLASGOW_SCALE,
  BRADEN_SCALE,
  MORSE_FALL_SCALE,
  MEWS_SCALE,
  RASS_SCALE,
  NEWS2_SCALE,
  APGAR_SCALE,
  calculateGlasgow,
  calculateBraden,
  calculateMorse,
  getPainLevel,
} from './clinical-scales.js';

// ─── GLASGOW_SCALE structure ────────────────────────────────────────────────

describe('GLASGOW_SCALE', () => {
  it('should have eye responses with scores 1-4', () => {
    expect(GLASGOW_SCALE.eye).toHaveLength(4);
    const scores = GLASGOW_SCALE.eye.map((e) => e.score);
    expect(scores).toEqual([4, 3, 2, 1]);
  });

  it('should have verbal responses with scores 1-5', () => {
    expect(GLASGOW_SCALE.verbal).toHaveLength(5);
    const scores = GLASGOW_SCALE.verbal.map((v) => v.score);
    expect(scores).toEqual([5, 4, 3, 2, 1]);
  });

  it('should have motor responses with scores 1-6', () => {
    expect(GLASGOW_SCALE.motor).toHaveLength(6);
    const scores = GLASGOW_SCALE.motor.map((m) => m.score);
    expect(scores).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('should have 3 interpretation ranges', () => {
    expect(GLASGOW_SCALE.interpretation).toHaveLength(3);
  });

  it('should cover GCS range 3-15 in interpretation', () => {
    const ranges = GLASGOW_SCALE.interpretation;
    // Severe: 3-8, Moderate: 9-12, Mild: 13-15
    expect(ranges.some((r) => r.range[0] === 3)).toBe(true);
    expect(ranges.some((r) => r.range[1] === 15)).toBe(true);
  });

  it('should have description and descriptionEn for all eye items', () => {
    for (const item of GLASGOW_SCALE.eye) {
      expect(item.description).toBeTruthy();
      expect(item.descriptionEn).toBeTruthy();
    }
  });
});

// ─── calculateGlasgow ───────────────────────────────────────────────────────

describe('calculateGlasgow', () => {
  it('should return total 3 with severity SEVERE for minimum GCS', () => {
    const result = calculateGlasgow(1, 1, 1);
    expect(result.total).toBe(3);
    expect(result.severity).toBe('SEVERE');
  });

  it('should return total 15 with severity MILD for maximum GCS', () => {
    const result = calculateGlasgow(4, 5, 6);
    expect(result.total).toBe(15);
    expect(result.severity).toBe('MILD');
  });

  it('should return MODERATE for GCS 10', () => {
    const result = calculateGlasgow(3, 3, 4);
    expect(result.total).toBe(10);
    expect(result.severity).toBe('MODERATE');
  });

  it('should return SEVERE for GCS 8', () => {
    const result = calculateGlasgow(2, 2, 4);
    expect(result.total).toBe(8);
    expect(result.severity).toBe('SEVERE');
  });

  it('should return MILD for GCS 13', () => {
    const result = calculateGlasgow(4, 4, 5);
    expect(result.total).toBe(13);
    expect(result.severity).toBe('MILD');
  });
});

// ─── BRADEN_SCALE structure ─────────────────────────────────────────────────

describe('BRADEN_SCALE', () => {
  it('should have 6 categories', () => {
    expect(BRADEN_SCALE.categories).toHaveLength(6);
  });

  it('should have name and nameEn for each category', () => {
    for (const cat of BRADEN_SCALE.categories) {
      expect(cat.name).toBeTruthy();
      expect(cat.nameEn).toBeTruthy();
    }
  });

  it('should have min score 1 in each category (except Friction)', () => {
    for (const cat of BRADEN_SCALE.categories) {
      const minScore = Math.min(...cat.options.map((o) => o.score));
      expect(minScore).toBe(1);
    }
  });

  it('should have 5 interpretation ranges', () => {
    expect(BRADEN_SCALE.interpretation).toHaveLength(5);
  });

  it('should cover range 6-23 in interpretation', () => {
    const ranges = BRADEN_SCALE.interpretation;
    const minRange = Math.min(...ranges.map((r) => r.range[0]));
    const maxRange = Math.max(...ranges.map((r) => r.range[1]));
    expect(minRange).toBe(6);
    expect(maxRange).toBe(23);
  });
});

// ─── calculateBraden ────────────────────────────────────────────────────────

describe('calculateBraden', () => {
  it('should calculate minimum Braden score (all 1s) as very high risk', () => {
    const result = calculateBraden([1, 1, 1, 1, 1, 1]);
    expect(result.total).toBe(6);
    expect(result.label).toBe('Risco muito alto');
  });

  it('should calculate maximum Braden score (4,4,4,4,4,3) as no risk', () => {
    const result = calculateBraden([4, 4, 4, 4, 4, 3]);
    expect(result.total).toBe(23);
    expect(result.label).toBe('Sem risco');
  });

  it('should calculate moderate risk Braden score', () => {
    const result = calculateBraden([3, 3, 3, 3, 2, 2]);
    expect(result.total).toBe(16);
    expect(result.label).toBe('Risco moderado');
  });

  it('should calculate high risk score (total 12)', () => {
    const result = calculateBraden([2, 2, 2, 2, 2, 2]);
    expect(result.total).toBe(12);
    expect(result.label).toBe('Risco alto');
  });

  it('should calculate low risk score (total 17)', () => {
    const result = calculateBraden([3, 3, 3, 3, 3, 2]);
    expect(result.total).toBe(17);
    expect(result.label).toBe('Baixo risco');
  });
});

// ─── MORSE_FALL_SCALE structure ─────────────────────────────────────────────

describe('MORSE_FALL_SCALE', () => {
  it('should have 6 categories', () => {
    expect(MORSE_FALL_SCALE.categories).toHaveLength(6);
  });

  it('should have name and nameEn for each category', () => {
    for (const cat of MORSE_FALL_SCALE.categories) {
      expect(cat.name).toBeTruthy();
      expect(cat.nameEn).toBeTruthy();
    }
  });

  it('should have 3 interpretation ranges', () => {
    expect(MORSE_FALL_SCALE.interpretation).toHaveLength(3);
  });

  it('should start interpretation at 0', () => {
    expect(MORSE_FALL_SCALE.interpretation[0]!.range[0]).toBe(0);
  });

  it('should end interpretation at 125', () => {
    expect(MORSE_FALL_SCALE.interpretation[2]!.range[1]).toBe(125);
  });
});

// ─── calculateMorse ─────────────────────────────────────────────────────────

describe('calculateMorse', () => {
  it('should calculate 0 (low risk) when all scores are 0', () => {
    const result = calculateMorse([0, 0, 0, 0, 0, 0]);
    expect(result.total).toBe(0);
    expect(result.label).toBe('Baixo risco');
  });

  it('should calculate high risk for maximum scores', () => {
    const result = calculateMorse([25, 15, 30, 20, 20, 15]);
    expect(result.total).toBe(125);
    expect(result.label).toBe('Risco alto');
  });

  it('should calculate moderate risk', () => {
    const result = calculateMorse([25, 0, 0, 0, 0, 15]);
    expect(result.total).toBe(40);
    expect(result.label).toBe('Risco moderado');
  });

  it('should calculate low risk at boundary 24', () => {
    const result = calculateMorse([0, 0, 0, 20, 0, 0]);
    expect(result.total).toBe(20);
    expect(result.label).toBe('Baixo risco');
  });

  it('should calculate high risk at boundary 45', () => {
    const result = calculateMorse([25, 0, 0, 20, 0, 0]);
    expect(result.total).toBe(45);
    expect(result.label).toBe('Risco alto');
  });
});

// ─── getPainLevel ───────────────────────────────────────────────────────────

describe('getPainLevel', () => {
  it('should return "Sem dor" for 0', () => {
    const result = getPainLevel(0);
    expect(result).toBeDefined();
    expect(result!.label).toBe('Sem dor');
  });

  it('should return "Dor leve" for 2', () => {
    const result = getPainLevel(2);
    expect(result).toBeDefined();
    expect(result!.label).toBe('Dor leve');
  });

  it('should return "Dor moderada" for 5', () => {
    const result = getPainLevel(5);
    expect(result).toBeDefined();
    expect(result!.label).toBe('Dor moderada');
  });

  it('should return "Dor intensa" for 8', () => {
    const result = getPainLevel(8);
    expect(result).toBeDefined();
    expect(result!.label).toBe('Dor intensa');
  });

  it('should return "Dor insuportável" for 10', () => {
    const result = getPainLevel(10);
    expect(result).toBeDefined();
    expect(result!.label).toBe('Dor insuportável');
  });

  it('should return undefined for out-of-range value', () => {
    expect(getPainLevel(11)).toBeUndefined();
  });

  it('should return undefined for negative value', () => {
    expect(getPainLevel(-1)).toBeUndefined();
  });
});

// ─── MEWS_SCALE structure ───────────────────────────────────────────────────

describe('MEWS_SCALE', () => {
  it('should have 5 parameters', () => {
    expect(MEWS_SCALE.parameters).toHaveLength(5);
  });

  it('should have 4 interpretation levels', () => {
    expect(MEWS_SCALE.interpretation).toHaveLength(4);
  });

  it('should have parameters with name, nameEn, unit, and scores', () => {
    for (const param of MEWS_SCALE.parameters) {
      expect(param.name).toBeTruthy();
      expect(param.nameEn).toBeTruthy();
      expect(param.unit).toBeDefined();
      expect(param.scores.length).toBeGreaterThan(0);
    }
  });

  it('should have consciousnessLabels with 4 AVPU levels', () => {
    expect(MEWS_SCALE.consciousnessLabels).toHaveLength(4);
  });

  it('should start interpretation at 0', () => {
    expect(MEWS_SCALE.interpretation[0]!.range[0]).toBe(0);
  });
});

// ─── RASS_SCALE structure ───────────────────────────────────────────────────

describe('RASS_SCALE', () => {
  it('should have 10 levels from -5 to +4', () => {
    expect(RASS_SCALE.levels).toHaveLength(10);
  });

  it('should include score 0 (Alert and calm)', () => {
    const alertLevel = RASS_SCALE.levels.find((l) => l.score === 0);
    expect(alertLevel).toBeDefined();
    expect(alertLevel!.termEn).toBe('Alert and calm');
  });

  it('should have min score of -5', () => {
    const minScore = Math.min(...RASS_SCALE.levels.map((l) => l.score));
    expect(minScore).toBe(-5);
  });

  it('should have max score of 4', () => {
    const maxScore = Math.max(...RASS_SCALE.levels.map((l) => l.score));
    expect(maxScore).toBe(4);
  });

  it('should have term and description for all levels', () => {
    for (const level of RASS_SCALE.levels) {
      expect(level.term).toBeTruthy();
      expect(level.description).toBeTruthy();
    }
  });
});

// ─── NEWS2_SCALE structure ──────────────────────────────────────────────────

describe('NEWS2_SCALE', () => {
  it('should have 8 parameters', () => {
    expect(NEWS2_SCALE.parameters).toHaveLength(8);
  });

  it('should have 4 interpretation levels', () => {
    expect(NEWS2_SCALE.interpretation).toHaveLength(4);
  });

  it('should include SpO2 Scale 1 and Scale 2', () => {
    const names = NEWS2_SCALE.parameters.map((p) => p.nameEn);
    expect(names.some((n) => n.includes('Scale 1'))).toBe(true);
    expect(names.some((n) => n.includes('Scale 2'))).toBe(true);
  });

  it('should have all parameters with scores array', () => {
    for (const param of NEWS2_SCALE.parameters) {
      expect(param.scores.length).toBeGreaterThan(0);
    }
  });

  it('should include consciousness parameter', () => {
    const consciousness = NEWS2_SCALE.parameters.find((p) => p.nameEn === 'Consciousness');
    expect(consciousness).toBeDefined();
  });
});

// ─── APGAR_SCALE structure ──────────────────────────────────────────────────

describe('APGAR_SCALE', () => {
  it('should have 5 categories', () => {
    expect(APGAR_SCALE.categories).toHaveLength(5);
  });

  it('should have 3 interpretation levels', () => {
    expect(APGAR_SCALE.interpretation).toHaveLength(3);
  });

  it('should have timing at 1, 5, and 10 minutes', () => {
    expect([...APGAR_SCALE.timingMinutes]).toEqual([1, 5, 10]);
  });

  it('should have 3 options (0, 1, 2) per category', () => {
    for (const cat of APGAR_SCALE.categories) {
      expect(cat.options).toHaveLength(3);
      const scores = cat.options.map((o) => o.score);
      expect(scores).toEqual([0, 1, 2]);
    }
  });

  it('should cover interpretation range 0-10', () => {
    const ranges = APGAR_SCALE.interpretation;
    const minRange = Math.min(...ranges.map((r) => r.range[0]));
    const maxRange = Math.max(...ranges.map((r) => r.range[1]));
    expect(minRange).toBe(0);
    expect(maxRange).toBe(10);
  });
});
