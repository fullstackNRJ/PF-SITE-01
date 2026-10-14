import type { CardSize } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

import { COMPACT_LIST, FeaturedMark, ItemOption, OptionNumber, OptionType, isEmphasised, tileTone } from './ItemOption';
import type { ItemLayoutProps } from './types';

/** Tile widths; a featured tile takes the next size up. */
const TILE_WIDTH: Record<CardSize, readonly [normal: string, emphasised: string]> = {
  small: ['md:w-44', 'md:w-60'],
  medium: ['md:w-60', 'md:w-80'],
  large: ['md:w-80', 'md:w-[26rem]'],
};

/** A strip of tiles that scrolls sideways; the preview pane sits below it. */
export function HorizontalLayout({
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
      className={cn(
        COMPACT_LIST,
        'md:flex md:snap-x md:scroll-px-1 md:gap-3 md:overflow-x-auto md:overscroll-x-contain md:p-1 md:pb-3',
      )}
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
            className={cn(
              tileTone(selected),
              'md:shrink-0 md:snap-start md:p-4',
              TILE_WIDTH[cardSize][emphasised ? 1 : 0],
            )}
            contentClassName="flex-col gap-3"
          >
            <span className="flex items-baseline justify-between gap-3">
              <OptionNumber index={index} />
              {emphasised ? <FeaturedMark /> : <OptionType item={item} />}
            </span>
            <span className="font-serif text-2xl leading-tight">{item.title}</span>
            <span className="line-clamp-3 text-sm leading-snug text-fg-subtle">{item.summary}</span>
          </ItemOption>
        );
      })}
    </ul>
  );
}
