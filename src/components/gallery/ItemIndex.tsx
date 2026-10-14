import type { Ref } from 'react';

import type { SectionItem, SectionLayout } from '@/lib/types';

import { LAYOUT_REGISTRY } from './layouts/registry';

export interface ItemIndexProps {
  readonly sectionTitle: string;
  readonly layout: SectionLayout;
  readonly items: readonly SectionItem[];
  readonly selectedIndex: number;
  /** Attached to the selected option. Omitted on the exiting copy. */
  readonly rowRef?: Ref<HTMLLIElement>;
  readonly onSelect?: (index: number) => void;
  readonly onOpen?: (index: number) => void;
}

/** A section's items, drawn by the renderer registered for `layout.type`. Selection comes from the parent. */
export function ItemIndex({ layout, ...props }: ItemIndexProps) {
  if (props.items.length === 0) {
    return <p className="text-sm text-fg-subtle">This section has no items yet.</p>;
  }

  const { Items } = LAYOUT_REGISTRY[layout.type];
  return <Items {...props} cardSize={layout.cardSize} focusMode={layout.focusMode} />;
}
