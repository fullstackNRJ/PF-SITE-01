import type { ComponentType, Ref } from 'react';

import type { CardSize, FocusMode, SectionItem } from '@/lib/types';

/**
 * What every layout renderer receives. Selection and handlers come from the
 * parent, so a layout is pure presentation: it never reads navigation state.
 */
export interface ItemLayoutProps {
  readonly sectionTitle: string;
  readonly items: readonly SectionItem[];
  readonly selectedIndex: number;
  readonly cardSize: CardSize;
  readonly focusMode: FocusMode;
  /** Attached to the selected option. Omitted on the exiting copy. */
  readonly rowRef?: Ref<HTMLLIElement>;
  readonly onSelect?: (index: number) => void;
  readonly onOpen?: (index: number) => void;
}

/** A layout renderer plus how `BrowseView` frames it next to the preview pane (md and up). */
export interface LayoutDefinition {
  readonly Items: ComponentType<ItemLayoutProps>;
  /** Grid template for the [items | preview] frame. Below `md` the frame is one column. */
  readonly frameClassName: string;
  /** Border that separates the preview pane from the items. */
  readonly previewClassName: string;
}
