import { formatTimeframe } from '@/lib/format';
import type { ProjectItem } from '@/lib/types';

import { CardFrame } from './CardFrame';
import { HighlightList, MetaList } from './CardParts';
import type { CardRendererProps } from './types';

/** Something built: a product, a tool or a side project. */
export function ProjectCard({ item, ...state }: CardRendererProps<ProjectItem>) {
  return (
    <CardFrame item={item} qualifier={item.status ?? 'project'} {...state}>
      <MetaList
        rows={[
          ['Role', item.role ?? ''],
          ['When', item.timeframe === undefined ? '' : formatTimeframe(item.timeframe)],
          ['Stack', item.stack.join(', ')],
        ]}
      />
      <HighlightList items={item.highlights} />
    </CardFrame>
  );
}
