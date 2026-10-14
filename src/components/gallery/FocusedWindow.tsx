import { useEffect, useRef } from 'react';

import { useContent } from '@/components/content/ContentProvider';
import { TransitionSurface } from '@/components/motion/TransitionSurface';
import { useNavigation } from '@/components/navigation/NavigationProvider';
import { COMPACT_QUERY, useMediaQuery } from '@/components/navigation/useMediaQuery';
import { Key } from '@/components/ui/Key';
import { pad2 } from '@/lib/format';
import { KEY_ESCAPE } from '@/lib/navigation/shortcuts';
import type { SectionItem } from '@/lib/types';

import { BrowseView } from './BrowseView';
import { DetailView } from './DetailView';

const NO_ITEMS: readonly SectionItem[] = [];

/**
 * The large window. It presents navigation state and never owns it: selection,
 * mode and direction all come from `useNavigation()`, content from `useContent()`.
 *
 * It is also the only place DOM focus follows that state. The views below are
 * props-only, so the transition layer can draw a frozen copy of the previous one.
 */
export function FocusedWindow() {
  const content = useContent();
  const {
    selectedSection,
    selectedSectionIndex,
    sections,
    selectedItemIndex,
    isDetail,
    helpOpen,
    keyboardTick,
    travel,
    openSelected,
    closeDetail,
    focusItem,
  } = useNavigation();

  const section = selectedSection === null ? null : content.getSection(selectedSection.id);
  const items = section === null ? NO_ITEMS : content.getSectionItems(section.id);
  const selected = items[selectedItemIndex] ?? null;

  const selectedRow = useRef<HTMLLIElement | null>(null);
  const detailPanel = useRef<HTMLElement | null>(null);
  const wasDetail = useRef(isDetail);
  const seenTick = useRef(keyboardTick);
  const compact = useMediaQuery(COMPACT_QUERY);

  const openItem = (index: number) => {
    focusItem(index);
    openSelected();
  };

  // Focus follows selection for keyboard input only; pointer changes leave focus alone.
  useEffect(() => {
    if (seenTick.current === keyboardTick) {
      return;
    }
    seenTick.current = keyboardTick;

    if (!isDetail && !helpOpen) {
      selectedRow.current?.focus();
    }
    // Keyed on the tick alone on purpose.
  }, [keyboardTick]);

  // Leaving the item view by any means returns focus to the row you left.
  useEffect(() => {
    if (wasDetail.current && !isDetail) {
      selectedRow.current?.focus();
    }
    wasDetail.current = isDetail;
  }, [isDetail]);

  // The item view takes focus when it opens and when you move to another item.
  useEffect(() => {
    if (isDetail) {
      detailPanel.current?.focus();
    }
  }, [isDetail, section?.id, selected?.id]);

  if (section === null) {
    return (
      <p className="border border-b-0 border-line-strong bg-panel p-8 text-sm text-fg-subtle">
        There are no sections to show.
      </p>
    );
  }

  const sectionTravel = travel?.axis === 'section' ? travel : null;
  const itemTravel = travel?.axis === 'item' ? travel : null;
  const post = selected?.type === 'article' ? content.getPost(selected.post.id) : null;

  return (
    <section
      aria-label={section.title}
      // Fills what the header and rail leave (never sized by content), with a floor below which the page scrolls.
      className="flex min-h-[22rem] flex-1 flex-col border border-b-0 border-line-strong bg-panel shadow-[0_32px_64px_-32px_var(--color-ink)] md:min-h-[34rem] lg:min-h-[18rem]"
    >
      {/* Where you are, as a path: the site is a place to look around, not a page to scroll. */}
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-4 border-b border-line px-4 py-2 font-mono text-micro tabular-nums text-fg-subtle md:px-6"
      >
        <span className="flex min-w-0 items-center">
          <span className="truncate">
            ~/<span className="text-fg-muted">{section.id}</span>
            {isDetail && selected !== null ? (
              <>
                /<span className="text-fg">{selected.id}</span>
              </>
            ) : null}
          </span>
          <span className="ml-1 h-3 w-1.5 shrink-0 animate-blink bg-signal motion-reduce:animate-none" />
        </span>
        {isDetail ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap pointer-coarse:hidden">
            <Key label={KEY_ESCAPE} /> back
          </span>
        ) : (
          <span className="whitespace-nowrap">
            {pad2(selectedSectionIndex + 1)}/{pad2(sections.length)}
            {items.length === 0 ? null : (
              <span className="text-fg-muted">
                {' '}
                · {pad2(selectedItemIndex + 1)}/{pad2(items.length)}
              </span>
            )}
          </span>
        )}
      </div>

      <TransitionSurface
        transitionKey={section.id}
        travel={sectionTravel}
        className="min-h-0 flex-1"
        layerClassName="flex"
      >
        {(live) =>
          isDetail && selected !== null ? (
            <DetailView
              live={live}
              sectionId={section.id}
              sectionTitle={section.title}
              item={selected}
              post={post}
              itemTravel={itemTravel}
              panelRef={detailPanel}
              onBack={closeDetail}
            />
          ) : (
            <BrowseView
              live={live}
              section={section}
              sectionIndex={selectedSectionIndex}
              items={items}
              selectedIndex={selectedItemIndex}
              itemTravel={itemTravel}
              rowRef={selectedRow}
              // The compact layout has no preview pane, so a tap goes straight to the item.
              onSelectItem={compact ? openItem : focusItem}
              onOpenItem={openItem}
              onOpenSelected={openSelected}
            />
          )
        }
      </TransitionSurface>
    </section>
  );
}
