import { describe, it, expect } from 'vitest';
import { formatDateBR, formatDateTimeBR, calculateAge, isExpired, getShift } from './date.js';
import { Shift } from '@voxpep/shared-types';

// ─── formatDateBR ───────────────────────────────────────────────────────────

describe('formatDateBR', () => {
  it('should format a date in DD/MM/YYYY', () => {
    expect(formatDateBR(new Date(2025, 0, 15))).toBe('15/01/2025');
  });

  it('should pad single-digit day and month', () => {
    expect(formatDateBR(new Date(2025, 2, 5))).toBe('05/03/2025');
  });

  it('should format December 31', () => {
    expect(formatDateBR(new Date(2024, 11, 31))).toBe('31/12/2024');
  });

  it('should format January 1', () => {
    expect(formatDateBR(new Date(2025, 0, 1))).toBe('01/01/2025');
  });

  it('should format February 29 on leap year', () => {
    expect(formatDateBR(new Date(2024, 1, 29))).toBe('29/02/2024');
  });
});

// ─── formatDateTimeBR ───────────────────────────────────────────────────────

describe('formatDateTimeBR', () => {
  it('should format date and time', () => {
    const d = new Date(2025, 5, 15, 14, 30);
    expect(formatDateTimeBR(d)).toBe('15/06/2025 14:30');
  });

  it('should pad single-digit hours and minutes', () => {
    const d = new Date(2025, 0, 1, 8, 5);
    expect(formatDateTimeBR(d)).toBe('01/01/2025 08:05');
  });

  it('should format midnight', () => {
    const d = new Date(2025, 0, 1, 0, 0);
    expect(formatDateTimeBR(d)).toBe('01/01/2025 00:00');
  });

  it('should format 23:59', () => {
    const d = new Date(2025, 11, 31, 23, 59);
    expect(formatDateTimeBR(d)).toBe('31/12/2025 23:59');
  });

  it('should format noon', () => {
    const d = new Date(2025, 6, 4, 12, 0);
    expect(formatDateTimeBR(d)).toBe('04/07/2025 12:00');
  });
});

// ─── calculateAge ───────────────────────────────────────────────────────────

describe('calculateAge', () => {
  it('should calculate age correctly', () => {
    expect(calculateAge(new Date(1990, 0, 1), new Date(2025, 0, 1))).toBe(35);
  });

  it('should subtract 1 if birthday has not occurred yet this year', () => {
    expect(calculateAge(new Date(1990, 6, 15), new Date(2025, 5, 10))).toBe(34);
  });

  it('should return 0 for newborn', () => {
    const today = new Date(2025, 3, 15);
    expect(calculateAge(new Date(2025, 3, 15), today)).toBe(0);
  });

  it('should handle birthday on same day (exact birthday)', () => {
    expect(calculateAge(new Date(1985, 3, 15), new Date(2025, 3, 15))).toBe(40);
  });

  it('should handle day before birthday', () => {
    expect(calculateAge(new Date(1985, 3, 15), new Date(2025, 3, 14))).toBe(39);
  });

  it('should handle leap year birthday (Feb 29)', () => {
    expect(calculateAge(new Date(2000, 1, 29), new Date(2025, 2, 1))).toBe(25);
  });
});

// ─── isExpired ──────────────────────────────────────────────────────────────

describe('isExpired', () => {
  it('should return true for a past expiration date', () => {
    expect(isExpired(new Date(2020, 0, 1), new Date(2025, 0, 1))).toBe(true);
  });

  it('should return false for a future expiration date', () => {
    expect(isExpired(new Date(2030, 0, 1), new Date(2025, 0, 1))).toBe(false);
  });

  it('should return false when expiration equals reference (same millisecond)', () => {
    const d = new Date(2025, 0, 1, 12, 0, 0, 0);
    expect(isExpired(d, d)).toBe(false);
  });

  it('should return true when expired by 1 millisecond', () => {
    const exp = new Date(2025, 0, 1, 12, 0, 0, 0);
    const ref = new Date(2025, 0, 1, 12, 0, 0, 1);
    expect(isExpired(exp, ref)).toBe(true);
  });

  it('should return false when not yet expired by 1 millisecond', () => {
    const exp = new Date(2025, 0, 1, 12, 0, 0, 1);
    const ref = new Date(2025, 0, 1, 12, 0, 0, 0);
    expect(isExpired(exp, ref)).toBe(false);
  });
});

// ─── getShift ───────────────────────────────────────────────────────────────

describe('getShift', () => {
  it('should return MORNING for 7:00', () => {
    expect(getShift(7)).toBe(Shift.MORNING);
  });

  it('should return MORNING for 12:00', () => {
    expect(getShift(12)).toBe(Shift.MORNING);
  });

  it('should return AFTERNOON for 13:00', () => {
    expect(getShift(13)).toBe(Shift.AFTERNOON);
  });

  it('should return AFTERNOON for 18:00', () => {
    expect(getShift(18)).toBe(Shift.AFTERNOON);
  });

  it('should return NIGHT for 19:00', () => {
    expect(getShift(19)).toBe(Shift.NIGHT);
  });

  it('should return NIGHT for 0:00 (midnight)', () => {
    expect(getShift(0)).toBe(Shift.NIGHT);
  });

  it('should return NIGHT for 6:00', () => {
    expect(getShift(6)).toBe(Shift.NIGHT);
  });

  it('should return MORNING for boundary 7', () => {
    expect(getShift(7)).toBe(Shift.MORNING);
  });
});
