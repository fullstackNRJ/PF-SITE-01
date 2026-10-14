import type { IsoDate, IsoMonth, Timeframe } from './types';

/**
 * Presentation formatting for content values.
 *
 * Pure and dependency-free. Kept in `lib` rather than in the card folder so any
 * renderer — or a future post view — formats dates the same way.
 */

const MONTH_NAMES: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `3` -> `"03"`. */
export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `"2025-03"` -> `"Mar 2025"`. Returns the input unchanged if it is not a month. */
export function formatMonth(value: IsoMonth): string {
  const [year, month] = value.split('-');
  if (year === undefined || month === undefined) {
    return value;
  }

  const name = MONTH_NAMES[Number(month) - 1];
  return name === undefined ? value : `${name} ${year}`;
}

/** `"2025-03-14"` -> `"14 Mar 2025"`. Returns the input unchanged if it is not a date. */
export function formatDate(value: IsoDate): string {
  const [year, month, day] = value.split('-');
  if (year === undefined || month === undefined || day === undefined) {
    return value;
  }

  const name = MONTH_NAMES[Number(month) - 1];
  if (name === undefined) {
    return value;
  }

  return `${Number(day)} ${name} ${year}`;
}

/** Human-readable range. An open-ended timeframe reads as `"Mar 2022 — present"`. */
export function formatTimeframe(timeframe: Timeframe): string {
  if (timeframe.label !== undefined) {
    return timeframe.label;
  }

  const start = formatMonth(timeframe.start);
  const end = timeframe.end === undefined ? 'present' : formatMonth(timeframe.end);
  return `${start} — ${end}`;
}
