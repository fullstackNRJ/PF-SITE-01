import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

import {
  createRail,
  fitCount,
  followSelection,
  lengthToPx,
  mergeSpans,
  resizeRail,
  ringSpan,
  visibleSpan,
} from '@/lib/rail';
import type { RailState, Span } from '@/lib/rail';

/** Used for the server render and the first client render, before anything can be measured. */
const FALLBACK_VISIBLE = 5;

/** Cards kept mounted beyond each visible edge, so a slide never reveals a gap. */
const EDGE_BUFFER = 1;

/** Slightly longer than the track's transition, so cards stay mounted until it ends. */
const SETTLE_MS = 300;

export interface RailMetrics {
  /** Whole cards that fit in the viewport. */
  readonly visible: number;
  /** Card width plus gap in px at the current breakpoint; 0 until measured. */
  readonly pitchPx: number;
}

function sameMetrics(a: RailMetrics, b: RailMetrics): boolean {
  return a.visible === b.visible && a.pitchPx === b.pitchPx;
}

/**
 * How many whole cards fit, kept current as the viewport resizes. Card and gap
 * sizes come from the breakpoint's CSS variables, so this follows them too.
 */
export function useRailMetrics(viewport: RefObject<HTMLElement | null>): RailMetrics {
  const [metrics, setMetrics] = useState<RailMetrics>({ visible: FALLBACK_VISIBLE, pitchPx: 0 });

  useLayoutEffect(() => {
    const element = viewport.current;
    if (element === null) {
      return;
    }

    const measure = () => {
      const style = getComputedStyle(element);
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const card = lengthToPx(style.getPropertyValue('--rail-card'), rem);
      const gap = lengthToPx(style.getPropertyValue('--rail-gap'), rem);
      const next = { visible: fitCount(element.clientWidth, card, gap), pitchPx: card + gap };
      setMetrics((current) => (sameMetrics(current, next) ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [viewport]);

  return metrics;
}

/**
 * The rail's own state, derived from navigation state rather than owning it.
 *
 * `index` is the engine's canonical section index and `sign` the direction of
 * the move that produced it. The cursor is brought up to date during render, so
 * there is never a frame where the rail and the selection disagree.
 */
export function useRail(count: number, index: number, sign: 1 | -1, visible: number): RailState {
  const [rail, setRail] = useState(() => createRail(count, index, visible));

  const next =
    rail.count !== count
      ? createRail(count, index, visible)
      : resizeRail(followSelection(rail, index, sign), visible);

  if (next !== rail) {
    setRail(next);
  }

  return next;
}

function sameSpan(a: Span, b: Span): boolean {
  return a.lo === b.lo && a.hi === b.hi;
}

/** The track's on-screen position in cards; mid-slide this is where it visually is, not where it is heading. */
function shownScroll(track: HTMLElement, pitchPx: number): number {
  const transform = getComputedStyle(track).transform;
  const offsetPx = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  return -offsetPx / pitchPx;
}

/**
 * Which positions to keep mounted.
 *
 * That is what the viewport shows at the target, plus whatever is on screen
 * right now while the track is still sliding there. The second part is bounded
 * by how far the track lags, not by how many keys were pressed, so holding an
 * arrow key does not keep growing the set.
 */
export function useMountedSpan(
  rail: RailState,
  track: RefObject<HTMLElement | null>,
  pitchPx: number,
): Span {
  const needed = mergeSpans(
    visibleSpan(rail.scroll, rail.visible, EDGE_BUFFER),
    ringSpan(rail.active, rail.count),
  );

  const [held, setHeld] = useState<Span>(needed);

  // Before paint: replace what was held with what the slide can still reveal.
  useLayoutEffect(() => {
    const element = track.current;
    const tight =
      element === null || pitchPx <= 0
        ? needed
        : mergeSpans(
            needed,
            visibleSpan(Math.floor(shownScroll(element, pitchPx)), rail.visible + 1, EDGE_BUFFER),
          );
    setHeld((current) => (sameSpan(current, tight) ? current : tight));
  }, [rail.scroll, rail.active, rail.visible, rail.count, pitchPx]);

  // After the slide, release everything that is no longer needed.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHeld((current) => (sameSpan(current, needed) ? current : needed));
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [rail.scroll, rail.active, rail.visible, rail.count]);

  // Until the layout effect has run, anything new is covered by the union of both.
  return mergeSpans(held, needed);
}
