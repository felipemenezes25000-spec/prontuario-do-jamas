import { describe, it, expect } from 'vitest';
import { MANCHESTER_FLOWCHARTS } from './manchester-discriminators.js';

describe('MANCHESTER_FLOWCHARTS', () => {
  it('should have at least 5 flowcharts', () => {
    expect(MANCHESTER_FLOWCHARTS.length).toBeGreaterThanOrEqual(5);
  });

  it('should have name and nameEn for every flowchart', () => {
    for (const fc of MANCHESTER_FLOWCHARTS) {
      expect(fc.name).toBeTruthy();
      expect(fc.nameEn).toBeTruthy();
    }
  });

  it('should have discriminators array in every flowchart', () => {
    for (const fc of MANCHESTER_FLOWCHARTS) {
      expect(Array.isArray(fc.discriminators)).toBe(true);
      expect(fc.discriminators.length).toBeGreaterThan(0);
    }
  });

  it('should have required fields on every discriminator', () => {
    for (const fc of MANCHESTER_FLOWCHARTS) {
      for (const disc of fc.discriminators) {
        expect(disc.id).toBeTruthy();
        expect(disc.flowchart).toBeTruthy();
        expect(disc.discriminator).toBeTruthy();
        expect(disc.level).toBeTruthy();
        expect(disc.description).toBeTruthy();
      }
    }
  });

  it('should have valid triage level values on all discriminators', () => {
    const validLevels = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'];
    for (const fc of MANCHESTER_FLOWCHARTS) {
      for (const disc of fc.discriminators) {
        expect(validLevels).toContain(disc.level);
      }
    }
  });

  it('should include Dor Torácica (Chest Pain) flowchart', () => {
    const chestPain = MANCHESTER_FLOWCHARTS.find((fc) => fc.nameEn === 'Chest Pain');
    expect(chestPain).toBeDefined();
  });

  it('should include Dispneia (Shortness of Breath) flowchart', () => {
    const dyspnea = MANCHESTER_FLOWCHARTS.find((fc) => fc.nameEn === 'Shortness of Breath');
    expect(dyspnea).toBeDefined();
  });

  it('should have unique discriminator IDs across all flowcharts', () => {
    const allIds = MANCHESTER_FLOWCHARTS.flatMap((fc) =>
      fc.discriminators.map((d) => d.id),
    );
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('should have at least one RED discriminator per flowchart', () => {
    for (const fc of MANCHESTER_FLOWCHARTS) {
      const hasRed = fc.discriminators.some((d) => d.level === 'RED');
      expect(hasRed).toBe(true);
    }
  });
});
