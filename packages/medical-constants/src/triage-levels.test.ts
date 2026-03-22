import { describe, it, expect } from 'vitest';
import { TRIAGE_LEVELS } from './triage-levels.js';
import { TriageLevel } from '@voxpep/shared-types';

describe('TRIAGE_LEVELS', () => {
  it('should have exactly 5 Manchester triage levels', () => {
    expect(TRIAGE_LEVELS).toHaveLength(5);
  });

  it('should include RED level (Emergência)', () => {
    const red = TRIAGE_LEVELS.find((t) => t.level === TriageLevel.RED);
    expect(red).toBeDefined();
    expect(red!.label).toBe('Emergência');
    expect(red!.maxWaitMinutes).toBe(0);
  });

  it('should include ORANGE level (Muito Urgente)', () => {
    const orange = TRIAGE_LEVELS.find((t) => t.level === TriageLevel.ORANGE);
    expect(orange).toBeDefined();
    expect(orange!.label).toBe('Muito Urgente');
    expect(orange!.maxWaitMinutes).toBe(10);
  });

  it('should include YELLOW level (Urgente)', () => {
    const yellow = TRIAGE_LEVELS.find((t) => t.level === TriageLevel.YELLOW);
    expect(yellow).toBeDefined();
    expect(yellow!.label).toBe('Urgente');
    expect(yellow!.maxWaitMinutes).toBe(60);
  });

  it('should include GREEN level (Pouco Urgente)', () => {
    const green = TRIAGE_LEVELS.find((t) => t.level === TriageLevel.GREEN);
    expect(green).toBeDefined();
    expect(green!.label).toBe('Pouco Urgente');
    expect(green!.maxWaitMinutes).toBe(120);
  });

  it('should include BLUE level (Não Urgente)', () => {
    const blue = TRIAGE_LEVELS.find((t) => t.level === TriageLevel.BLUE);
    expect(blue).toBeDefined();
    expect(blue!.label).toBe('Não Urgente');
    expect(blue!.maxWaitMinutes).toBe(240);
  });

  it('should have increasing wait times from RED to BLUE', () => {
    const waitTimes = TRIAGE_LEVELS.map((t) => t.maxWaitMinutes);
    for (let i = 1; i < waitTimes.length; i++) {
      expect(waitTimes[i]!).toBeGreaterThan(waitTimes[i - 1]!);
    }
  });

  it('should have color and description for each level', () => {
    for (const level of TRIAGE_LEVELS) {
      expect(level.color).toBeTruthy();
      expect(level.description).toBeTruthy();
    }
  });

  it('should have valid hex colors', () => {
    for (const level of TRIAGE_LEVELS) {
      expect(level.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
