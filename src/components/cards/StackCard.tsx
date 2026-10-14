import type { StackItem } from '@/lib/types';

import { CardFrame } from './CardFrame';
import { MetaList } from './CardParts';
import type { CardRendererProps } from './types';

/** A technology, tool or practice the author works with. */
export function StackCard({ item, ...state }: CardRendererProps<StackItem>) {
  return (
    <CardFrame item={item} qualifier={item.category} {...state}>
      <MetaList
        rows={[
          ['Level', item.proficiency ?? ''],
          ['Years', item.years === undefined ? '' : String(item.years)],
        ]}
      />
    </CardFrame>
  );
}
