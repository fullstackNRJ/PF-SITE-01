import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { classifySwipe } from '@/lib/gesture';
import type { SwipeDirection } from '@/lib/gesture';

/** A click this soon after a swipe is the tail of the swipe, not a tap. */
const CLICK_AFTER_SWIPE_MS = 400;

interface Start {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/**
 * Reports horizontal touch swipes on `target`.
 *
 * Touch and pen only, so mouse drags still select text. The element should
 * carry `touch-action: pan-y pinch-zoom`: the browser keeps vertical scrolling
 * and zoom, and a vertical scroll cancels the pointer before it can count.
 */
export function useSwipe(
  target: RefObject<HTMLElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
): void {
  const handler = useRef(onSwipe);
  useEffect(() => {
    handler.current = onSwipe;
  });

  useEffect(() => {
    const element = target.current;
    if (element === null) {
      return;
    }

    let start: Start | null = null;
    let swipedAt = Number.NEGATIVE_INFINITY;

    const onDown = (event: PointerEvent) => {
      start =
        event.pointerType === 'mouse' || !event.isPrimary
          ? null
          : { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp };
    };

    const onUp = (event: PointerEvent) => {
      if (start === null || event.pointerId !== start.id) {
        return;
      }
      const direction = classifySwipe({
        dx: event.clientX - start.x,
        dy: event.clientY - start.y,
        ms: event.timeStamp - start.t,
      });
      start = null;
      if (direction !== null) {
        swipedAt = event.timeStamp;
        handler.current(direction);
      }
    };

    const onCancel = () => {
      start = null;
    };

    // Capture phase, so the click never reaches React's handlers on the rows and cards.
    const onClick = (event: MouseEvent) => {
      if (event.timeStamp - swipedAt < CLICK_AFTER_SWIPE_MS) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onCancel);
    element.addEventListener('click', onClick, true);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onCancel);
      element.removeEventListener('click', onClick, true);
    };
  }, [target]);
}
