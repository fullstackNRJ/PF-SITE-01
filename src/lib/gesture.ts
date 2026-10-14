/**
 * Touch gestures, reduced to the keys they stand for.
 *
 * A swipe is translated into the key a keyboard user would press, so it reaches
 * the navigation engine through `keyToAction` exactly like that key does. Pure:
 * no DOM, no React.
 */

import type { NavigationMode } from './navigation/types.ts';

/** Which way the finger moved. */
export type SwipeDirection = 'left' | 'right';

export interface SwipeSample {
  /** Horizontal travel in CSS px, positive to the right. */
  readonly dx: number;
  /** Vertical travel in CSS px, positive downwards. */
  readonly dy: number;
  /** Duration in ms. */
  readonly ms: number;
}

export interface SwipeThresholds {
  /** Minimum horizontal travel. */
  readonly minDistance: number;
  /** Largest `|dy| / |dx|` still read as horizontal (0.5 ≈ 27°). */
  readonly maxSlope: number;
  /** Slower movements are a drag or a read, not a swipe. */
  readonly maxDuration: number;
}

export const SWIPE_THRESHOLDS: SwipeThresholds = {
  minDistance: 56,
  maxSlope: 0.5,
  maxDuration: 700,
};

/** `null` unless the movement was a deliberate, mostly horizontal flick. */
export function classifySwipe(
  sample: SwipeSample,
  thresholds: SwipeThresholds = SWIPE_THRESHOLDS,
): SwipeDirection | null {
  const distance = Math.abs(sample.dx);
  if (
    !Number.isFinite(distance) ||
    distance < thresholds.minDistance ||
    Math.abs(sample.dy) > distance * thresholds.maxSlope ||
    sample.ms > thresholds.maxDuration
  ) {
    return null;
  }
  return sample.dx < 0 ? 'left' : 'right';
}

export type SwipeKey = 'ArrowLeft' | 'ArrowRight' | 'Escape';

/**
 * The key a swipe stands for.
 *
 * Browsing, the content follows the finger: swiping left brings in the next
 * section (ArrowRight). In an item, swiping right goes back (Escape); swiping
 * left does nothing, so reading a long item can't skip sections by accident.
 */
export function swipeKey(direction: SwipeDirection, mode: NavigationMode): SwipeKey | null {
  if (mode === 'detail') {
    return direction === 'right' ? 'Escape' : null;
  }
  return direction === 'left' ? 'ArrowRight' : 'ArrowLeft';
}
