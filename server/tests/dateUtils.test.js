import { describe, it, expect } from 'vitest';
import {
  toLocalMidnight,
  parseISODate,
  diffInDays,
  addDays,
  isBefore,
  isPast,
  dateRange,
  rangesOverlap,
  formatISODate,
  weekdayIndex,
  isWeekend,
} from '../src/utils/dateUtils.js';

describe('toLocalMidnight', () => {
  it('zeroes the time component', () => {
    const d = toLocalMidnight(new Date(2025, 4, 12, 15, 45, 30, 500));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
    expect(d.getDate()).toBe(12);
    expect(d.getMonth()).toBe(4);
  });

  it('throws on invalid input', () => {
    expect(() => toLocalMidnight('not-a-date')).toThrow(/Invalid date/);
  });
});

describe('parseISODate', () => {
  it('parses YYYY-MM-DD to local midnight', () => {
    const d = parseISODate('2025-05-12');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(0);
  });

  it('returns null for calendar-invalid dates', () => {
    expect(parseISODate('2025-02-30')).toBeNull();
    expect(parseISODate('2025-13-01')).toBeNull();
  });

  it('returns null for garbage strings', () => {
    expect(parseISODate('hello')).toBeNull();
    expect(parseISODate('')).toBeNull();
  });
});

describe('diffInDays', () => {
  it('is positive when b is after a', () => {
    expect(diffInDays('2025-05-10', '2025-05-13')).toBe(3);
  });

  it('is zero for the same day', () => {
    expect(diffInDays('2025-05-10', '2025-05-10')).toBe(0);
  });

  it('handles month rollover', () => {
    expect(diffInDays('2025-01-30', '2025-03-01')).toBe(30);
  });
});

describe('addDays', () => {
  it('adds across month boundaries', () => {
    const d = addDays('2025-01-30', 3);
    expect(formatISODate(d)).toBe('2025-02-02');
  });

  it('subtracts with negative days', () => {
    expect(formatISODate(addDays('2025-03-01', -1))).toBe('2025-02-28');
  });
});

describe('isBefore / isPast', () => {
  it('isBefore respects ordering', () => {
    expect(isBefore('2025-05-01', '2025-05-02')).toBe(true);
    expect(isBefore('2025-05-02', '2025-05-01')).toBe(false);
    expect(isBefore('2025-05-01', '2025-05-01')).toBe(false);
  });

  it('isPast is false for today', () => {
    expect(isPast(new Date())).toBe(false);
  });

  it('isPast is true for yesterday', () => {
    const yesterday = addDays(new Date(), -1);
    expect(isPast(yesterday)).toBe(true);
  });
});

describe('dateRange', () => {
  it('returns one night per day in [checkIn, checkOut)', () => {
    const nights = dateRange('2025-05-10', '2025-05-13');
    expect(nights).toHaveLength(3);
    expect(formatISODate(nights[0])).toBe('2025-05-10');
    expect(formatISODate(nights[2])).toBe('2025-05-12');
  });

  it('returns empty when checkOut is not after checkIn', () => {
    expect(dateRange('2025-05-10', '2025-05-10')).toHaveLength(0);
    expect(dateRange('2025-05-12', '2025-05-10')).toHaveLength(0);
  });
});

describe('rangesOverlap', () => {
  it('detects overlapping stays', () => {
    expect(rangesOverlap('2025-05-10', '2025-05-15', '2025-05-14', '2025-05-16')).toBe(true);
  });

  it('back-to-back stays do not overlap', () => {
    expect(rangesOverlap('2025-05-10', '2025-05-15', '2025-05-15', '2025-05-18')).toBe(false);
  });

  it('disjoint ranges do not overlap', () => {
    expect(rangesOverlap('2025-05-10', '2025-05-12', '2025-05-20', '2025-05-22')).toBe(false);
  });
});

describe('weekday helpers', () => {
  it('weekdayIndex maps 2025-05-11 (Sunday) to 0', () => {
    expect(weekdayIndex('2025-05-11')).toBe(0);
    expect(weekdayIndex('2025-05-17')).toBe(6);
    expect(weekdayIndex('2025-05-12')).toBe(1);
  });

  it('isWeekend flags Sat/Sun only', () => {
    expect(isWeekend('2025-05-11')).toBe(true);
    expect(isWeekend('2025-05-17')).toBe(true);
    expect(isWeekend('2025-05-12')).toBe(false);
  });
});
