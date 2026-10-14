import { formatTimeframe } from '@/lib/format';
import type { ExperienceItem } from '@/lib/types';

import { CardFrame } from './CardFrame';
import { HighlightList, MetaList } from './CardParts';
import type { CardRendererProps } from './types';

/** A role held at a company. */
export function ExperienceCard({ item, ...state }: CardRendererProps<ExperienceItem>) {
  return (
    <CardFrame item={item} qualifier={item.employment} {...state}>
      <MetaList
        rows={[
          ['Company', item.company],
          ['Role', item.role],
          ['When', item.timeframe === undefined ? '' : formatTimeframe(item.timeframe)],
          ['Where', item.location ?? ''],
        ]}
      />
      <HighlightList items={item.highlights} />
    </CardFrame>
  );
}
