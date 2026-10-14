import type { CardSize } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

import { COMPACT_LIST, FeaturedMark, ItemOption, OptionNumber, isEmphasised, tileTone } from './ItemOption';
import type { ItemLayoutProps } from './types';

const COLUMNS: Record<CardSize, string> = {
  small: 'md:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]',
  medium: 'md:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]',
  large: 'md:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]',
};

/**
 * Tiles in reading order. Up/Down still walk the items linearly (left to
 * right, then down), so the keyboard contract matches every other layout.
 */
export function GridLayout({
  sectionTitle,
  items,
  selectedIndex,
  cardSize,
  focusMode,
  rowRef,
  onSelect,
  onOpen,
}: ItemLayoutProps) {
  return (
    <ul
      role="list"
      aria-label={`${sectionTitle} items`}
      className={cn(COMPACT_LIST, 'md:grid md:gap-2', COLUMNS[cardSize])}
    >
      {items.map((item, index) => {
        const selected = index === selectedIndex;
        const emphasised = isEmphasised(item, focusMode);
        return (
          <ItemOption
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            selected={selected}
            rowRef={rowRef}
            onSelect={onSelect}
            onOpen={onOpen}
            className={cn(tileTone(selected), 'md:p-3', emphasised && 'md:col-span-2')}
            contentClassName="flex-col gap-1.5"
          >
            <span className="flex items-baseline justify-between gap-2">
              <OptionNumber index={index} />
              {emphasised ? <FeaturedMark /> : null}
            </span>
            <span className="font-serif text-xl leading-tight">{item.title}</span>
            {/* Small tiles are names only; the preview carries the summary. */}
            {cardSize === 'small' ? null : (
              <span className="line-clamp-2 text-sm leading-snug text-fg-subtle">{item.summary}</span>
            )}
          </ItemOption>
        );
      })}
    </ul>
  );
}
