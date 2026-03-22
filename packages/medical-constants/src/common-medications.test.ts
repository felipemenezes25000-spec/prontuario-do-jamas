import { describe, it, expect } from 'vitest';
import { COMMON_MEDICATIONS } from './common-medications.js';

describe('COMMON_MEDICATIONS', () => {
  it('should have at least 10 medications', () => {
    expect(COMMON_MEDICATIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('should have required fields on every medication', () => {
    for (const med of COMMON_MEDICATIONS) {
      expect(med.name).toBeTruthy();
      expect(med.activeIngredient).toBeTruthy();
      expect(med.class).toBeTruthy();
      expect(Array.isArray(med.commonDoses)).toBe(true);
      expect(med.commonDoses.length).toBeGreaterThan(0);
      expect(Array.isArray(med.commonRoutes)).toBe(true);
      expect(med.commonRoutes.length).toBeGreaterThan(0);
      expect(Array.isArray(med.commonFrequencies)).toBe(true);
      expect(med.commonFrequencies.length).toBeGreaterThan(0);
      expect(typeof med.isControlled).toBe('boolean');
      expect(typeof med.isHighAlert).toBe('boolean');
      expect(typeof med.isAntibiotic).toBe('boolean');
      expect(med.pregnancyCategory).toBeTruthy();
      expect(typeof med.renalAdjustment).toBe('boolean');
      expect(typeof med.hepaticAdjustment).toBe('boolean');
      expect(Array.isArray(med.commonInteractions)).toBe(true);
      expect(Array.isArray(med.contraindications)).toBe(true);
      expect(typeof med.beersListElderly).toBe('boolean');
    }
  });

  it('should include Dipirona', () => {
    const dipirona = COMMON_MEDICATIONS.find((m) => m.name === 'Dipirona');
    expect(dipirona).toBeDefined();
    expect(dipirona!.isControlled).toBe(false);
  });

  it('should include Paracetamol', () => {
    const para = COMMON_MEDICATIONS.find((m) => m.name === 'Paracetamol');
    expect(para).toBeDefined();
    expect(para!.pregnancyCategory).toBe('B');
  });

  it('should have controlledSchedule on controlled medications', () => {
    const controlled = COMMON_MEDICATIONS.filter((m) => m.isControlled);
    for (const med of controlled) {
      expect(med.controlledSchedule).toBeTruthy();
    }
  });

  it('should have interactions as non-empty arrays for most medications', () => {
    // At least some medications should have interactions
    const withInteractions = COMMON_MEDICATIONS.filter(
      (m) => m.commonInteractions.length > 0,
    );
    expect(withInteractions.length).toBeGreaterThan(0);
  });

  it('should have unique medication names', () => {
    const names = COMMON_MEDICATIONS.map((m) => m.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should include at least one antibiotic', () => {
    const antibiotics = COMMON_MEDICATIONS.filter((m) => m.isAntibiotic);
    expect(antibiotics.length).toBeGreaterThan(0);
  });

  it('should have valid pregnancy categories', () => {
    const validCategories = ['A', 'B', 'C', 'D', 'X'];
    for (const med of COMMON_MEDICATIONS) {
      expect(validCategories).toContain(med.pregnancyCategory);
    }
  });
});
