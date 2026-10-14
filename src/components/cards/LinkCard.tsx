import type { LinkItem } from '@/lib/types';

import { CardFrame } from './CardFrame';
import type { CardRendererProps } from './types';

/** A reference to somewhere else on the internet; the preview's call to action links it. */
export function LinkCard({ item, ...state }: CardRendererProps<LinkItem>) {
  return (
    <CardFrame item={item} qualifier={item.category ?? 'link'} {...state}>
      <p className="font-mono text-sm text-fg">{item.domain}</p>
    </CardFrame>
  );
}
