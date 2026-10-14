import { useEffect, useRef, useState } from 'react';

import { useNavigation } from '@/components/navigation/NavigationProvider';
import { RAIL_PITCH, canonicalIndex, isNearest, spanPositions } from '@/lib/rail';
import { cn } from '@/lib/utils/cn';

import { GalleryCard } from './GalleryCard';
import { useMountedSpan, useRail, useRailMetrics } from './useRail';

/**
 * A finite set of sections presented as an endless rail.
 *
 * The data is read as it is; nothing is copied. What repeats is only a card on
 * screen: a position is an unbounded integer and `canonicalIndex` turns it back
 * into a section. Moving past the last section keeps sliding the same way, with
 * the first one arriving from the edge, so nothing ever jumps.
 *
 * Each section is exposed once, as the repeat nearest the active card; the rest
 * are visual only. The list's top border is the window's bottom edge, and the
 * active card is lifted over it so it reads as part of the window.
 */
export function CardRail() {
  const { sections, selectedSectionIndex, travel, focusSection } = useNavigation();
  const count = sections.length;

  const viewport = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLUListElement | null>(null);
  const metrics = useRailMetrics(viewport);
  const rail = useRail(
    count,
    selectedSectionIndex,
    travel?.axis === 'section' ? travel.sign : 1,
    metrics.visible,
  );
  const span = useMountedSpan(rail, track, metrics.pitchPx);

  // Off until the first measurement has been applied, so loading does not animate.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(true);
  }, []);

  if (count === 0) {
    return null;
  }

  // A restore from the URL (load, back/forward) has no travel and jumps without sliding.
  const moving = animate && travel !== null;

  return (
    <nav aria-label="Portfolio sections">
      {/* Card size and height are per-breakpoint CSS variables; positions are multiples of the pitch. */}
      <div ref={viewport} className="relative h-(--rail-height) overflow-hidden">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line-strong" />

        <ul
          ref={track}
          role="list"
          className={cn(
            'absolute inset-y-0 left-0',
            moving && 'transition-transform duration-(--duration-travel) ease-travel',
          )}
          style={{ transform: `translateX(calc(${RAIL_PITCH} * ${String(-rail.scroll)}))` }}
        >
          {spanPositions(span).map((position) => {
            const index = canonicalIndex(position, count);
            const section = sections[index];
            if (section === undefined) {
              return null;
            }

            const active = position === rail.active;
            const exposed = isNearest(position, rail.active, count);

            return (
              <li
                key={position}
                aria-hidden={exposed ? undefined : true}
                data-canonical={index}
                className={cn(
                  'absolute inset-y-0',
                  moving && 'transition-[padding] duration-(--duration-travel) ease-travel',
                  active ? 'pt-0' : 'pt-(--rail-lift)',
                )}
                style={{ left: `calc(${RAIL_PITCH} * ${String(position)})`, width: 'var(--rail-card)' }}
              >
                <GalleryCard
                  sectionId={section.id}
                  index={index}
                  total={count}
                  active={active}
                  repeat={!exposed}
                  tabbable={active}
                  onSelect={() => {
                    if (position !== rail.active) {
                      // The direction is where the card sat on screen, not which index is larger.
                      focusSection(index, position > rail.active ? 1 : -1);
                    }
                  }}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
