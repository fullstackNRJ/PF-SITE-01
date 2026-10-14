import type { CardSize } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

import { COMPACT_LIST, FeaturedMark, ItemOption, OptionNumber, OptionType, isEmphasised, rowTone } from './ItemOption';
import type { ItemLayoutProps } from './types';

const ROW_SIZE: Record<CardSize, string> = {
  small: 'md:py-2 md:text-base',
  medium: 'md:py-3 md:text-lg',
  large: 'md:py-4 md:text-2xl',
};

/** The default: a numbered vertical index beside the preview pane. */
export function ListLayout({
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
      className={cn(COMPACT_LIST, 'md:flex md:flex-col md:border-y md:border-line')}
    >
      {items.map((item, index) => {
        const selected = index === selectedIndex;
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
            className={cn(rowTone(selected), 'md:px-3', ROW_SIZE[cardSize])}
            contentClassName="items-baseline gap-4"
          >
            <OptionNumber index={index} />
            <span className="flex-1 font-serif leading-snug">{item.title}</span>
            {isEmphasised(item, focusMode) ? <FeaturedMark /> : null}
            <OptionType item={item} />
          </ItemOption>
        );
      })}
    </ul>
  );
}
