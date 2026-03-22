import { describe, it, expect } from 'vitest';
import {
  slugify,
  capitalize,
  maskCPF,
  maskPhone,
  formatCNPJ,
  removeAccents,
  truncate,
} from './string.js';

// ─── slugify ────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('should convert a simple string to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should remove accents', () => {
    expect(slugify('São Paulo')).toBe('sao-paulo');
  });

  it('should handle multiple spaces and special characters', () => {
    expect(slugify('  Clínica  Médica -- Geral  ')).toBe('clinica-medica-geral');
  });

  it('should handle already slugified string', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle numbers', () => {
    expect(slugify('Test 123')).toBe('test-123');
  });

  it('should remove leading/trailing hyphens', () => {
    expect(slugify('---test---')).toBe('test');
  });
});

// ─── capitalize ─────────────────────────────────────────────────────────────

describe('capitalize', () => {
  it('should capitalize first letter of each word', () => {
    expect(capitalize('hello world')).toBe('Hello World');
  });

  it('should handle all uppercase input', () => {
    expect(capitalize('HELLO WORLD')).toBe('Hello World');
  });

  it('should handle single word', () => {
    expect(capitalize('test')).toBe('Test');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle mixed case', () => {
    expect(capitalize('jOSÉ da SILVA')).toBe('José Da Silva');
  });
});

// ─── maskCPF ────────────────────────────────────────────────────────────────

describe('maskCPF', () => {
  it('should mask a valid CPF showing last 2 digits', () => {
    expect(maskCPF('52998224725')).toBe('***.***. ***-25');
  });

  it('should mask a formatted CPF', () => {
    expect(maskCPF('529.982.247-25')).toBe('***.***. ***-25');
  });

  it('should return original string if not 11 digits', () => {
    expect(maskCPF('1234')).toBe('1234');
  });

  it('should return original string for empty input', () => {
    expect(maskCPF('')).toBe('');
  });

  it('should mask CPF with all zeros', () => {
    expect(maskCPF('00000000000')).toBe('***.***. ***-00');
  });
});

// ─── maskPhone ──────────────────────────────────────────────────────────────

describe('maskPhone', () => {
  it('should mask a mobile phone number', () => {
    expect(maskPhone('11987654321')).toBe('*********21');
  });

  it('should mask a landline phone number', () => {
    expect(maskPhone('1134567890')).toBe('********90');
  });

  it('should mask a formatted phone number', () => {
    expect(maskPhone('(11) 98765-4321')).toBe('*********21');
  });

  it('should return original for very short input', () => {
    expect(maskPhone('12')).toBe('12');
  });

  it('should return original for empty input', () => {
    expect(maskPhone('')).toBe('');
  });

  it('should handle 4-digit number (minimum masking)', () => {
    expect(maskPhone('1234')).toBe('**34');
  });
});

// ─── formatCNPJ ─────────────────────────────────────────────────────────────

describe('formatCNPJ', () => {
  it('should format a valid 14-digit CNPJ', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('should strip non-digits and format', () => {
    expect(formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  it('should return original if not 14 digits', () => {
    expect(formatCNPJ('1234')).toBe('1234');
  });

  it('should return original for empty string', () => {
    expect(formatCNPJ('')).toBe('');
  });

  it('should format another CNPJ', () => {
    expect(formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
  });
});

// ─── removeAccents ──────────────────────────────────────────────────────────

describe('removeAccents', () => {
  it('should remove Portuguese accents', () => {
    expect(removeAccents('São Paulo')).toBe('Sao Paulo');
  });

  it('should remove cedilla', () => {
    expect(removeAccents('Ação')).toBe('Acao');
  });

  it('should handle string without accents', () => {
    expect(removeAccents('Hello World')).toBe('Hello World');
  });

  it('should handle empty string', () => {
    expect(removeAccents('')).toBe('');
  });

  it('should remove tildes and circumflexes', () => {
    expect(removeAccents('pão, ênfase, índio, ômega, último')).toBe(
      'pao, enfase, indio, omega, ultimo',
    );
  });

  it('should handle multiple accented characters', () => {
    expect(removeAccents('àáâãäèéêëìíîïòóôõöùúûü')).toBe(
      'aaaaaeeeeiiiiooooouuuu',
    );
  });
});

// ─── truncate ───────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('should not truncate string shorter than maxLength', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should not truncate string equal to maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should truncate and add ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('should truncate long text', () => {
    expect(truncate('This is a very long string that should be truncated', 20)).toBe(
      'This is a very lo...',
    );
  });

  it('should handle maxLength of 3 (minimum for ellipsis)', () => {
    expect(truncate('Hello', 3)).toBe('...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});
