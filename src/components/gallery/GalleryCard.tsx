import type { ReactNode } from 'react';

import { useContent } from '@/components/content/ContentProvider';
import { pad2 } from '@/lib/format';
import type { SectionId } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export interface GalleryCardProps {
  readonly sectionId: SectionId;
  /** Zero-based canonical index of the section. */
  readonly index: number;
  readonly total: number;
  readonly active: boolean;
  readonly onSelect: () => void;
  /**
   * A visual-only second appearance of a section that is already in the rail.
   * Hidden from assistive technology and not focusable, but still clickable.
   */
  readonly repeat?: boolean;
  /** Whether the live control is in the tab order; only the active card is. */
  readonly tabbable?: boolean;
}

/** One section in the rail. Every string on it comes from the content API. */
export function GalleryCard({
  sectionId,
  index,
  total,
  active,
  onSelect,
  repeat = false,
  tabbable = true,
}: GalleryCardProps) {
  const content = useContent();
  const section = content.getSection(sectionId);
  if (section === null) {
    return null;
  }

  const count = content.getSectionItems(sectionId).length;

  const className = cn(
    'flex h-full w-full cursor-pointer flex-col gap-1.5 border p-2.5 text-left transition-colors duration-(--duration-quick) focus-visible:outline-offset-[-4px] md:gap-3 md:p-4',
    active
      ? 'border-x-line-strong border-b-line-strong border-t-0 bg-panel text-fg'
      : 'border-line bg-ink text-fg-muted hover:border-line-strong hover:text-fg',
  );

  const body: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className="flex items-center justify-between gap-2 font-mono text-micro tabular-nums text-fg-subtle"
      >
        <span className={cn(active && 'text-signal')}>{pad2(index + 1)}</span>
        <span className="max-md:hidden">
          {pad2(count)} {count === 1 ? 'item' : 'items'}
        </span>
      </span>

      <span aria-hidden="true" className="flex flex-col gap-2">
        <span className="truncate font-serif text-lg leading-none md:text-2xl lg:text-3xl">{section.title}</span>
        <span className="line-clamp-2 text-sm leading-snug text-fg-subtle max-md:hidden">
          {section.summary}
        </span>
      </span>
    </>
  );

  if (repeat) {
    return (
      <div aria-hidden="true" onClick={onSelect} className={className}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      tabIndex={tabbable ? 0 : -1}
      aria-current={active ? 'true' : undefined}
      aria-label={`${section.title}, section ${String(index + 1)} of ${String(total)}, ${String(count)} ${count === 1 ? 'item' : 'items'}`}
      onClick={onSelect}
      className={className}
    >
      {body}
    </button>
  );
}
