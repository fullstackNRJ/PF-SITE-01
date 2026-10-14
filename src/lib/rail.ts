/**
 * Geometry of a finite ring shown as an endless rail.
 *
 * The rail keeps an unbounded integer cursor (`active`) alongside the canonical
 * index the navigation engine owns, with `canonical = mod(active, count)`.
 * Moving past either end only changes the cursor, so the track keeps moving the
 * same way and never has to jump; wrapping exists only when a position is turned
 * back into a section. Everything here is pure.
 */

/**
 * Card width, gap and rail height are CSS custom properties (`--rail-card`,
 * `--rail-gap`, `--rail-height` in global.css) so each breakpoint sizes the
 * rail without JS. Layout uses them through `calc()`; measurement reads them back.
 */
export const RAIL_PITCH = 'calc(var(--rail-card) + var(--rail-gap))';

/** A rail variable in px. Only `rem` and `px` are used for them; anything else reads as 0. */
export function lengthToPx(value: string, remPx: number): number {
  const match = /^\s*(-?\d*\.?\d+)(rem|px)\s*$/.exec(value);
  if (match === null) {
    return 0;
  }
  const amount = Number(match[1]);
  return match[2] === 'rem' ? amount * remPx : amount;
}

/** Whole cards that fit in `viewportPx`; always at least one. */
export function fitCount(viewportPx: number, cardPx: number, gapPx: number): number {
  const pitch = cardPx + gapPx;
  if (!(pitch > 0)) {
    return 1;
  }
  return Math.max(1, Math.floor((viewportPx + gapPx) / pitch));
}

/** Always non-negative, unlike `%`. */
export function mod(value: number, size: number): number {
  return ((value % size) + size) % size;
}

export function canonicalIndex(position: number, count: number): number {
  return count <= 0 ? 0 : mod(position, count);
}

/**
 * How far the cursor moves to land on `to`, in the direction the user meant.
 *
 * `sign` comes from the key or click, never from comparing indexes, so going
 * forward from the last section to the first is `+1`, not `-(count - 1)`.
 */
export function virtualStep(from: number, to: number, count: number, sign: 1 | -1): number {
  if (count <= 0 || from === to) {
    return 0;
  }
  return sign * mod(sign * (to - from), count);
}

/**
 * The offset from `active` to the nearest repeat of a position, in
 * `[-(count - 1 - half), half]` where `half = floor(count / 2)`.
 * An exact tie goes forward, so the choice is deterministic.
 */
export function nearestOffset(distance: number, count: number): number {
  if (count <= 0) {
    return distance;
  }
  const shift = count - 1 - Math.floor(count / 2);
  return mod(distance + shift, count) - shift;
}

/** True for the one repeat of each section that sits nearest the active card. */
export function isNearest(position: number, active: number, count: number): boolean {
  const distance = position - active;
  return distance === nearestOffset(distance, count);
}

/** An inclusive range of positions. */
export interface Span {
  readonly lo: number;
  readonly hi: number;
}

/** The `count` positions around `active` that hold every section exactly once. */
export function ringSpan(active: number, count: number): Span {
  if (count <= 0) {
    return { lo: active, hi: active };
  }
  return { lo: active - (count - 1 - Math.floor(count / 2)), hi: active + Math.floor(count / 2) };
}

/** What the viewport shows from `scroll`, plus `buffer` positions beyond each edge. */
export function visibleSpan(scroll: number, visible: number, buffer: number): Span {
  return { lo: scroll - buffer, hi: scroll + visible - 1 + buffer };
}

export function mergeSpans(a: Span, b: Span): Span {
  return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
}

export function containsSpan(outer: Span, inner: Span): boolean {
  return outer.lo <= inner.lo && outer.hi >= inner.hi;
}

export function spanPositions(span: Span): readonly number[] {
  return Array.from({ length: span.hi - span.lo + 1 }, (_, offset) => span.lo + offset);
}

/** Where the viewport starts when the active card is centred. */
export function centerScroll(active: number, visible: number): number {
  return active - Math.floor((visible - 1) / 2);
}

/**
 * Moves the viewport only as far as needed to keep the active card out of the
 * outer card on either side, so the rail repositions as the card nears an edge.
 */
export function settleScroll(scroll: number, active: number, visible: number): number {
  const margin = Math.min(1, Math.floor((visible - 1) / 2));
  const slot = active - scroll;

  if (slot < margin) {
    return active - margin;
  }
  if (slot > visible - 1 - margin) {
    return active - (visible - 1 - margin);
  }
  return scroll;
}

export interface RailState {
  readonly count: number;
  /** Whole cards that fit in the viewport. */
  readonly visible: number;
  /** Unbounded cursor; `canonicalIndex(active, count)` is the selected section. */
  readonly active: number;
  /** Position at the viewport's left edge. */
  readonly scroll: number;
}

export function createRail(count: number, index: number, visible: number): RailState {
  const active = canonicalIndex(index, count);
  return { count, visible, active, scroll: centerScroll(active, visible) };
}

/** Follows the engine's selection, moving the cursor in the direction the user meant. */
export function followSelection(state: RailState, index: number, sign: 1 | -1): RailState {
  const current = canonicalIndex(state.active, state.count);
  if (current === index) {
    return state;
  }

  const active = state.active + virtualStep(current, index, state.count, sign);
  return { ...state, active, scroll: settleScroll(state.scroll, active, state.visible) };
}

export function resizeRail(state: RailState, visible: number): RailState {
  if (state.visible === visible) {
    return state;
  }
  return { ...state, visible, scroll: settleScroll(state.scroll, state.active, visible) };
}
