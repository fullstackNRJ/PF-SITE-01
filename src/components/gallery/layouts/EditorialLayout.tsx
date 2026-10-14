import { formatDate } from '@/lib/format';
import type { CardSize, SectionItem } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

import { COMPACT_LIST, FeaturedMark, ItemOption, OptionNumber, isEmphasised, rowTone } from './ItemOption';
import type { ItemLayoutProps } from './types';

const TITLE_SIZE: Record<CardSize, string> = {
  small: 'text-xl',
  medium: 'text-2xl lg:text-3xl',
  large: 'text-3xl lg:text-4xl',
};

/** A reading list: large titles with their standfirst, like a magazine contents page. */
export function EditorialLayout({
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
            className={cn(rowTone(selected), 'md:px-4 md:py-5')}
            contentClassName="flex-col gap-2"
          >
            <span className="flex items-baseline gap-3 font-mono text-micro text-fg-subtle">
              <OptionNumber index={index} />
              <span>{kicker(item)}</span>
              {isEmphasised(item, focusMode) ? <FeaturedMark /> : null}
            </span>
            <span className={cn('font-serif leading-[1.1]', TITLE_SIZE[cardSize])}>
              {item.title}
            </span>
            <span className="line-clamp-3 max-w-prose text-sm leading-relaxed text-fg-subtle">
              {item.summary}
            </span>
          </ItemOption>
        );
      })}
    </ul>
  );
}

function kicker(item: SectionItem): string {
  return item.type === 'article'
    ? `${formatDate(item.post.published)} · ${String(item.post.readingTimeMinutes)} min`
    : item.type;
}
