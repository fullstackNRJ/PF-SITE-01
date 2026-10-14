import type { Ref } from 'react';

import { CardRenderer } from '@/components/cards/CardRenderer';
import { TransitionSurface } from '@/components/motion/TransitionSurface';
import { Key } from '@/components/ui/Key';
import { pad2 } from '@/lib/format';
import { KEY_ENTER } from '@/lib/navigation/shortcuts';
import type { Travel } from '@/lib/navigation/types';
import type { Section, SectionItem } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

import { ItemCta } from './ItemCta';
import { ItemIndex } from './ItemIndex';
import { LAYOUT_REGISTRY } from './layouts/registry';

export interface BrowseViewProps {
  /** False for the exiting copy, which must carry no refs or handlers. */
  readonly live: boolean;
  readonly section: Section;
  /** Zero-based position of the section, for its folio. */
  readonly sectionIndex: number;
  readonly items: readonly SectionItem[];
  readonly selectedIndex: number;
  readonly itemTravel: Travel | null;
  readonly rowRef: Ref<HTMLLIElement>;
  readonly onSelectItem: (index: number) => void;
  readonly onOpenItem: (index: number) => void;
  readonly onOpenSelected: () => void;
}

/**
 * The window's gallery mode: the section's title and items, arranged by the
 * section's layout, beside a preview of the selected item. Below `md` every
 * layout collapses to a list that stands alone and a tap opens the item.
 */
export function BrowseView({
  live,
  section,
  sectionIndex,
  items,
  selectedIndex,
  itemTravel,
  rowRef,
  onSelectItem,
  onOpenItem,
  onOpenSelected,
}: BrowseViewProps) {
  const selected = items[selectedIndex] ?? null;
  const frame = LAYOUT_REGISTRY[section.layout.type];

  return (
    <div className={cn('grid min-h-0 flex-1 grid-rows-1', frame.frameClassName)}>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain p-4 md:gap-8 md:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <h2 className="font-serif text-4xl leading-none text-fg md:text-5xl lg:text-6xl">{section.title}</h2>
          <p className="max-w-sm text-sm leading-relaxed text-fg-muted">{section.summary}</p>
        </header>

        <ItemIndex
          sectionTitle={section.title}
          layout={section.layout}
          items={items}
          selectedIndex={selectedIndex}
          rowRef={live ? rowRef : undefined}
          onSelect={live ? onSelectItem : undefined}
          onOpen={live ? onOpenItem : undefined}
        />

        {/* The section's folio: closes the page, so a short section reads as finished rather than empty. */}
        <p aria-hidden="true" className="mt-auto flex items-end justify-between gap-4 pt-4">
          <span className="font-serif text-7xl leading-[0.8] text-line-strong md:text-8xl">
            {pad2(sectionIndex + 1)}
          </span>
          <span className="font-mono text-micro text-fg-subtle">
            end of {section.id} · {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </p>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-col border-line max-md:hidden',
          frame.previewClassName,
        )}
      >
        {selected === null ? (
          <p className="p-8 text-sm text-fg-subtle">There is nothing to preview.</p>
        ) : (
          <TransitionSurface
            transitionKey={`${section.id}/${selected.id}`}
            travel={itemTravel}
            className="min-h-0 flex-1"
            layerClassName="flex flex-col gap-8 overflow-y-auto p-6 lg:p-8"
            // Scrolls, so it must be reachable by keyboard; PageUp, PageDown and Space scroll it.
            layerProps={{ role: 'region', 'aria-label': 'Item preview', tabIndex: 0 }}
          >
            {() => (
              <>
                <CardRenderer
                  item={selected}
                  selected
                  position={{ index: selectedIndex, total: items.length }}
                />

                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
                  <ItemCta item={selected} />
                  <button
                    type="button"
                    onClick={live ? onOpenSelected : undefined}
                    className="ml-auto flex items-center gap-2 font-mono text-micro text-fg-muted transition-colors duration-(--duration-quick) hover:text-fg"
                  >
                    Open item
                    <span aria-hidden="true">
                      <Key label={KEY_ENTER} />
                    </span>
                  </button>
                </div>
              </>
            )}
          </TransitionSurface>
        )}
      </div>
    </div>
  );
}
