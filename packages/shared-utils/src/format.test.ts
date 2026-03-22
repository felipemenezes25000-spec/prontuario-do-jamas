import { describe, it, expect } from 'vitest';
import { formatMRN, formatCurrency, formatVitalSign } from './format.js';

// ─── formatMRN ──────────────────────────────────────────────────────────────

describe('formatMRN', () => {
  it('should pad small number to 8 digits', () => {
    expect(formatMRN(1)).toBe('00000001');
  });

  it('should pad medium number to 8 digits', () => {
    expect(formatMRN(12345)).toBe('00012345');
  });

  it('should not pad number already 8 digits', () => {
    expect(formatMRN(12345678)).toBe('12345678');
  });

  it('should handle number larger than 8 digits (no truncation)', () => {
    expect(formatMRN(123456789)).toBe('123456789');
  });

  it('should handle zero', () => {
    expect(formatMRN(0)).toBe('00000000');
  });
});

// ─── formatCurrency ─────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('should format a positive value in BRL', () => {
    const result = formatCurrency(1234.56);
    // Depending on locale, could be "R$ 1.234,56" or "R$\u00a01.234,56"
    expect(result).toContain('R$');
    expect(result).toContain('1.234');
    expect(result).toContain('56');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R$');
    expect(result).toContain('0,00');
  });

  it('should format negative value', () => {
    const result = formatCurrency(-100.5);
    expect(result).toContain('R$');
    expect(result).toContain('100');
  });

  it('should format large value', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('R$');
    expect(result).toContain('1.000.000');
  });

  it('should format small decimal value', () => {
    const result = formatCurrency(0.99);
    expect(result).toContain('R$');
    expect(result).toContain('0,99');
  });
});

// ─── formatVitalSign ────────────────────────────────────────────────────────

describe('formatVitalSign', () => {
  it('should format blood pressure value', () => {
    expect(formatVitalSign(120, 'mmHg')).toBe('120 mmHg');
  });

  it('should format heart rate', () => {
    expect(formatVitalSign(80, 'bpm')).toBe('80 bpm');
  });

  it('should format temperature', () => {
    expect(formatVitalSign(36.5, '°C')).toBe('36.5 °C');
  });

  it('should format SpO2', () => {
    expect(formatVitalSign(98, '%')).toBe('98 %');
  });

  it('should format respiratory rate', () => {
    expect(formatVitalSign(16, 'irpm')).toBe('16 irpm');
  });
});
