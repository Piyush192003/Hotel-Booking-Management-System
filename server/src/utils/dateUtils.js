/**
 * Date utilities. All dates are stored/compared as local midnight of the
 * booking date to avoid timezone drift (server-local timezone).
 */

/** Normalise a date-ish value to a Date at local midnight. */
export function toLocalMidnight(value) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse 'YYYY-MM-DD' into a local-midnight Date. Returns null for garbage. */
export function parseISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return toLocalMidnight(d);
    } catch {
      return null;
    }
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return toLocalMidnight(date);
}

/** Whole days from a to b (positive when b after a). */
export function diffInDays(a, b) {
  const ms = toLocalMidnight(b).getTime() - toLocalMidnight(a).getTime();
  return Math.round(ms / 86400000);
}

export function addDays(value, days) {
  const d = toLocalMidnight(value);
  d.setDate(d.getDate() + days);
  return d;
}

export function isBefore(a, b) {
  return toLocalMidnight(a).getTime() < toLocalMidnight(b).getTime();
}

export function isPast(value, now = new Date()) {
  return toLocalMidnight(value).getTime() < toLocalMidnight(now).getTime();
}

/** Array of { date } midnight Dates for each night in [checkIn, checkOut). */
export function dateRange(checkIn, checkOut) {
  const start = toLocalMidnight(checkIn);
  const end = toLocalMidnight(checkOut);
  if (!isBefore(start, end)) return [];
  const out = [];
  let cursor = new Date(start);
  while (isBefore(cursor, end)) {
    out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** True when the two [aIn,aOut) and [bIn,bOut) ranges overlap. */
export function rangesOverlap(aIn, aOut, bIn, bOut) {
  const ai = toLocalMidnight(aIn).getTime();
  const ao = toLocalMidnight(aOut).getTime();
  const bi = toLocalMidnight(bIn).getTime();
  const bo = toLocalMidnight(bOut).getTime();
  return ai < bo && bi < ao;
}

export function formatISODate(value) {
  const d = toLocalMidnight(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekdayIndex(value) {
  return toLocalMidnight(value).getDay(); // 0 Sunday ... 6 Saturday
}

export const isWeekend = (value) => {
  const wd = weekdayIndex(value);
  return wd === 0 || wd === 6;
};