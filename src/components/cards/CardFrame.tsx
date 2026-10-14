import type { ReactNode } from 'react';

import { cardLabel } from '@/lib/card-label';
import type { SectionItem } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

import { CardMedia } from './CardMedia';
import { TagList } from './CardParts';
import type { CardState } from './types';

export interface CardFrameProps<TItem extends SectionItem> extends CardState {
  readonly item: TItem;
  /** Qualifies the type label, e.g. a project's status. */
  readonly qualifier?: string;
  readonly children?: ReactNode;
}

/**
 * Chrome shared by every card: the accessible name, the selected state and the
 * header. It holds no handlers and no focus logic; keyboard behaviour lives in
 * the navigation layer, and the card only reports what it is.
 *
 * A card is a glimpse: links and the full record live in the item view.
 */
export function CardFrame<TItem extends SectionItem>({
  item,
  qualifier,
  selected = false,
  position,
  children,
}: CardFrameProps<TItem>) {
  const typeLabel =
    qualifier === undefined || qualifier === item.type ? item.type : `${item.type} / ${qualifier}`;

  return (
    <article
      aria-label={cardLabel(item, position)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex flex-col gap-6 border-l-2 pl-5 transition-colors duration-(--duration-quick)',
        selected ? 'border-l-signal' : 'border-l-line',
      )}
    >
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-2 font-mono text-micro text-fg-subtle">
          {/* A shape cue, so the selected state never depends on colour alone. */}
          <span aria-hidden="true" className={cn('text-signal', !selected && 'invisible')}>
            ▸
          </span>
          {typeLabel}
        </p>
        <h3
          className={cn(
            'font-serif text-3xl leading-[1.1] md:text-4xl',
            selected ? 'text-fg' : 'text-fg-muted',
          )}
        >
          {item.title}
        </h3>
        <p className="max-w-prose text-base leading-relaxed text-fg-muted">{item.summary}</p>
      </header>

      <CardMedia media={item.media} />

      {children}

      <TagList tags={item.tags} />
    </article>
  );
}
