import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  nightsBetween,
  todayISO,
  addDaysISO,
  relativeDays,
  titleCase,
} from './format.js';

describe('formatCurrency', () => {
  it('formats whole rupees without decimals', () => {
    expect(formatCurrency(3500)).toMatch(/3,500/);
  });

  it('handles zero and empty values', () => {
    expect(formatCurrency(0)).toMatch(/0/);
    expect(formatCurrency(null)).toMatch(/0/);
    expect(formatCurrency(undefined)).toMatch(/0/);
  });

  it('shows decimals for fractional amounts', () => {
    expect(formatCurrency(100.5)).toMatch(/100\.5/);
  });
});

describe('formatCompactCurrency', () => {
  it('abbreviates lakhs', () => {
    expect(formatCompactCurrency(250000)).toBe('₹2.5L');
  });

  it('abbreviates crores', () => {
    expect(formatCompactCurrency(12500000)).toBe('₹1.3Cr');
  });

  it('abbreviates thousands', () => {
    expect(formatCompactCurrency(4200)).toBe('₹4.2k');
  });

  it('falls back to full format under 1000', () => {
    expect(formatCompactCurrency(499)).toMatch(/499/);
  });
});

describe('formatDate', () => {
  it('returns a dash for empty input', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });

  it('returns a dash for invalid dates', () => {
    expect(formatDate('garbage')).toBe('—');
  });

  it('formats an ISO date string', () => {
    expect(formatDate('2025-05-12')).toMatch(/May/);
  });
});

describe('nightsBetween', () => {
  it('counts inclusive check-in, exclusive check-out', () => {
    expect(nightsBetween('2025-05-10', '2025-05-13')).toBe(3);
  });

  it('same-day stay is zero nights', () => {
    expect(nightsBetween('2025-05-10', '2025-05-10')).toBe(0);
  });

  it('never returns negative', () => {
    expect(nightsBetween('2025-05-13', '2025-05-10')).toBe(0);
  });

  it('returns 0 for garbage input', () => {
    expect(nightsBetween('nope', '2025-05-10')).toBe(0);
  });
});

describe('todayISO / addDaysISO', () => {
  it('todayISO matches YYYY-MM-DD shape', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('addDaysISO rolls over months correctly', () => {
    expect(addDaysISO('2025-01-30', 3)).toBe('2025-02-02');
    expect(addDaysISO('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('round-trips with nightsBetween', () => {
    const checkIn = todayISO();
    const checkOut = addDaysISO(checkIn, 5);
    expect(nightsBetween(checkIn, checkOut)).toBe(5);
  });
});

describe('relativeDays', () => {
  const iso = (offset) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };

  it('labels today, tomorrow and yesterday', () => {
    expect(relativeDays(iso(0))).toBe('Today');
    expect(relativeDays(iso(1))).toBe('Tomorrow');
    expect(relativeDays(iso(-1))).toBe('Yesterday');
  });

  it('labels future and past offsets', () => {
    expect(relativeDays(iso(3))).toBe('In 3 days');
    expect(relativeDays(iso(-10))).toBe('10 days ago');
  });

  it('is empty for empty input', () => {
    expect(relativeDays('')).toBe('');
  });
});

describe('titleCase', () => {
  it('title-cases hyphenated tokens', () => {
    expect(titleCase('air-conditioning')).toBe('Air Conditioning');
  });

  it('title-cases underscore tokens', () => {
    expect(titleCase('no_show')).toBe('No Show');
  });

  it('handles empty values', () => {
    expect(titleCase('')).toBe('');
    expect(titleCase(null)).toBe('');
  });
});
