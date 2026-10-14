import type { ReactNode, Ref } from 'react';

import { pad2 } from '@/lib/format';
import type { FocusMode, SectionItem } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

/** True when the section asks for featured items to stand out and this one is featured. */
export function isEmphasised(item: SectionItem, focusMode: FocusMode): boolean {
  return focusMode === 'featured' && item.featured;
}

/** Every layout's `<ul>` collapses to the same ruled vertical list below `md`. */
export const COMPACT_LIST = 'max-md:flex max-md:flex-col max-md:border-y max-md:border-line';

/** A ruled row (list, editorial) from `md` up: signal bar on the left when selected. */
export function rowTone(selected: boolean): string {
  return cn(
    'md:flex md:border-b md:border-l-2 md:border-b-line md:last:border-b-0',
    selected
      ? 'md:border-l-signal md:bg-raised md:text-fg'
      : 'md:border-l-transparent md:text-fg-muted md:hover:bg-raised/50 md:hover:text-fg',
  );
}

/** A boxed tile (grid, horizontal) from `md` up. */
export function tileTone(selected: boolean): string {
  return cn(
    'md:flex md:border',
    selected
      ? 'md:border-fg-subtle md:bg-raised md:text-fg'
      : 'md:border-line md:text-fg-muted md:hover:border-line-strong md:hover:text-fg',
  );
}

export interface ItemOptionProps {
  readonly item: SectionItem;
  readonly index: number;
  readonly total: number;
  readonly selected: boolean;
  readonly rowRef?: Ref<HTMLLIElement>;
  readonly onSelect?: (index: number) => void;
  readonly onOpen?: (index: number) => void;
  /** The option's box from `md` up; below `md` the option is a standard list row. */
  readonly className: string;
  /** Arrangement of `children` (flex direction, gap...). */
  readonly contentClassName: string;
  /** Layout-specific content, shown from `md` up. */
  readonly children: ReactNode;
}

/**
 * One selectable item, shared by every layout so the accessibility contract is
 * identical everywhere: roving tabindex, `aria-current`, the same label, and
 * click to select / double-click to open. Only the look differs per layout.
 */
export function ItemOption({
  item,
  index,
  total,
  selected,
  rowRef,
  onSelect,
  onOpen,
  className,
  contentClassName,
  children,
}: ItemOptionProps) {
  return (
    <li
      ref={selected ? rowRef : undefined}
      // Roving tabindex: Tab lands on the selected option once, arrows do the rest.
      tabIndex={selected ? 0 : -1}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${item.title}, ${item.type}, ${String(index + 1)} of ${String(total)}`}
      onClick={
        onSelect === undefined
          ? undefined
          : () => {
              onSelect(index);
            }
      }
      onDoubleClick={
        onOpen === undefined
          ? undefined
          : () => {
              onOpen(index);
            }
      }
      className={cn(
        'group cursor-pointer transition-colors duration-(--duration-quick)',
        'max-md:flex max-md:border-b max-md:border-l-2 max-md:border-b-line max-md:px-3 max-md:py-3 max-md:last:border-b-0',
        selected
          ? 'max-md:border-l-signal max-md:bg-raised max-md:text-fg'
          : 'max-md:border-l-transparent max-md:text-fg-muted',
        className,
      )}
    >
      {/* Real boxes, not `display: contents`: Chromium ignores aria-hidden on those. */}
      <span aria-hidden="true" className="flex flex-1 items-baseline gap-4 md:hidden">
        <CompactRow item={item} index={index} total={total} />
      </span>
      <span aria-hidden="true" className={cn('flex min-w-0 flex-1 max-md:hidden', contentClassName)}>
        {children}
      </span>
    </li>
  );
}

/** The row every layout collapses to on small screens. Short sections show the whole summary. */
function CompactRow({
  item,
  index,
  total,
}: {
  readonly item: SectionItem;
  readonly index: number;
  readonly total: number;
}) {
  return (
    <>
      <OptionNumber index={index} />
      <span className="flex flex-1 flex-col gap-1">
        <span className="font-serif text-xl leading-tight">{item.title}</span>
        <span className={cn('text-sm leading-snug text-fg-subtle', total > 3 && 'line-clamp-2')}>
          {item.summary}
        </span>
      </span>
      <OptionType item={item} />
    </>
  );
}

/** The option's ordinal; it takes the signal colour when its option is selected. */
export function OptionNumber({ index }: { readonly index: number }) {
  return (
    <span className="font-mono text-micro tabular-nums text-fg-subtle group-aria-[current=true]:text-signal">
      {pad2(index + 1)}
    </span>
  );
}

export function OptionType({ item }: { readonly item: SectionItem }) {
  return <span className="font-mono text-micro text-fg-subtle">{item.type}</span>;
}

export function FeaturedMark() {
  return <span className="font-mono text-micro text-signal">✦</span>;
}
