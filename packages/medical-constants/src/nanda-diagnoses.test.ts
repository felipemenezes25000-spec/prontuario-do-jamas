import { describe, it, expect } from 'vitest';
import { NANDA_DIAGNOSES, getNANDAByCode, getNANDAByDomain } from './nanda-diagnoses.js';

describe('NANDA_DIAGNOSES', () => {
  it('should have at least 20 diagnoses', () => {
    expect(NANDA_DIAGNOSES.length).toBeGreaterThanOrEqual(20);
  });

  it('should have required fields on every diagnosis', () => {
    for (const diag of NANDA_DIAGNOSES) {
      expect(diag.code).toBeTruthy();
      expect(diag.domain).toBeTruthy();
      expect(diag.class).toBeTruthy();
      expect(diag.title).toBeTruthy();
      expect(diag.titleEn).toBeTruthy();
      expect(diag.definition).toBeTruthy();
      expect(Array.isArray(diag.relatedFactors)).toBe(true);
      expect(Array.isArray(diag.definingCharacteristics)).toBe(true);
    }
  });

  it('should have unique codes', () => {
    const codes = NANDA_DIAGNOSES.map((d) => d.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should include Dor aguda (code 00132)', () => {
    const acutePain = NANDA_DIAGNOSES.find((d) => d.code === '00132');
    expect(acutePain).toBeDefined();
    expect(acutePain!.titleEn).toBe('Acute Pain');
  });

  it('should include Risco de infecção (code 00004)', () => {
    const riskInfection = NANDA_DIAGNOSES.find((d) => d.code === '00004');
    expect(riskInfection).toBeDefined();
    expect(riskInfection!.riskFactors).toBeDefined();
    expect(riskInfection!.riskFactors!.length).toBeGreaterThan(0);
  });

  it('should have risk diagnoses with empty definingCharacteristics', () => {
    const riskDiagnoses = NANDA_DIAGNOSES.filter((d) => d.title.startsWith('Risco'));
    for (const diag of riskDiagnoses) {
      expect(diag.definingCharacteristics).toHaveLength(0);
    }
  });
});

describe('getNANDAByCode', () => {
  it('should find diagnosis by code 00132', () => {
    const result = getNANDAByCode('00132');
    expect(result).toBeDefined();
    expect(result!.title).toBe('Dor aguda');
  });

  it('should find diagnosis by code 00004', () => {
    const result = getNANDAByCode('00004');
    expect(result).toBeDefined();
    expect(result!.titleEn).toBe('Risk for Infection');
  });

  it('should return undefined for non-existent code', () => {
    expect(getNANDAByCode('99999')).toBeUndefined();
  });

  it('should return undefined for empty code', () => {
    expect(getNANDAByCode('')).toBeUndefined();
  });

  it('should find diagnosis by code 00146 (Ansiedade)', () => {
    const result = getNANDAByCode('00146');
    expect(result).toBeDefined();
    expect(result!.titleEn).toBe('Anxiety');
  });
});

describe('getNANDAByDomain', () => {
  it('should find diagnoses in domain Conforto', () => {
    const results = getNANDAByDomain('Conforto');
    expect(results.length).toBeGreaterThan(0);
    for (const diag of results) {
      expect(diag.domain).toBe('Conforto');
    }
  });

  it('should be case-insensitive', () => {
    const results = getNANDAByDomain('conforto');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty array for non-existent domain', () => {
    const results = getNANDAByDomain('NonExistentDomain');
    expect(results).toHaveLength(0);
  });

  it('should find diagnoses in Segurança/Proteção domain', () => {
    const results = getNANDAByDomain('Segurança/Proteção');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should find diagnoses in Nutrição domain', () => {
    const results = getNANDAByDomain('Nutrição');
    expect(results.length).toBeGreaterThan(0);
  });
});
