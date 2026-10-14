import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import type { Travel } from '@/lib/navigation/types';
import { cn } from '@/lib/utils/cn';

import { travelToken } from './travel';
import type { TravelToken } from './travel';

/** `live` is false for the exiting copy, which must carry no refs or handlers. */
type RenderLayer = (live: boolean) => ReactNode;

export interface TransitionSurfaceProps {
  /** Changes when the content is replaced by different content. */
  readonly transitionKey: string;
  /** Direction of this change; `null` swaps instantly. */
  readonly travel: Travel | null;
  readonly className?: string;
  readonly layerClassName?: string;
  /** Applied to the live layer only. */
  readonly layerProps?: Omit<ComponentPropsWithRef<'div'>, 'className' | 'children'>;
  readonly children: RenderLayer;
}

interface Ghost {
  readonly id: number;
  readonly render: RenderLayer;
  readonly token: TravelToken;
}

/** Safety net if `animationend` never arrives. */
const GHOST_TIMEOUT_MS = 400;

let ghostCounter = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Slides content in the direction the user moved, and slides the previous
 * content out the other way.
 *
 * The live layer is committed in the same render as the state change, so
 * nothing is delayed and it is never hidden from assistive technology. The
 * exiting layer is a purely visual copy of the previous render: `inert` and
 * `aria-hidden`, so it takes no focus and is never announced. Both layers are
 * absolutely positioned inside a surface the caller sizes, so a transition
 * cannot change the layout around it.
 */
export function TransitionSurface({
  transitionKey,
  travel,
  className,
  layerClassName,
  layerProps,
  children,
}: TransitionSurfaceProps) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const previous = useRef({ key: transitionKey, render: children });

  // Runs before paint, so the exiting copy is in place on the first frame of the change.
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { key: transitionKey, render: children };

    if (before.key === transitionKey) {
      return;
    }
    if (travel === null || prefersReducedMotion()) {
      setGhost(null);
      return;
    }

    ghostCounter += 1;
    setGhost({ id: ghostCounter, render: before.render, token: travelToken(travel) });
  });

  useEffect(() => {
    if (ghost === null) {
      return;
    }

    const { id } = ghost;
    const timer = window.setTimeout(() => {
      setGhost((current) => (current?.id === id ? null : current));
    }, GHOST_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ghost]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        key={transitionKey}
        {...layerProps}
        data-motion={travel === null ? undefined : 'enter'}
        data-travel={travel === null ? undefined : travelToken(travel)}
        className={cn('absolute inset-0', layerClassName)}
      >
        {children(true)}
      </div>

      {ghost === null ? null : (
        <div
          key={ghost.id}
          aria-hidden="true"
          inert
          data-motion="exit"
          data-travel={ghost.token}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              setGhost((current) => (current?.id === ghost.id ? null : current));
            }
          }}
          className={cn('pointer-events-none absolute inset-0', layerClassName)}
        >
          {ghost.render(false)}
        </div>
      )}
    </div>
  );
}
