import type { Ref } from 'react';

import { MarkdownBody } from '@/components/content/MarkdownBody';
import { TransitionSurface } from '@/components/motion/TransitionSurface';
import type { Travel } from '@/lib/navigation/types';
import type { Post, SectionId, SectionItem } from '@/lib/types';

import { ItemDetail } from './ItemDetail';
import { PostDetail } from './PostDetail';

export interface DetailViewProps {
  /** False for the exiting copy, which must carry no refs or handlers. */
  readonly live: boolean;
  readonly sectionId: SectionId;
  readonly sectionTitle: string;
  readonly item: SectionItem;
  /** The rendered post when `item` is an article; otherwise `null`. */
  readonly post: Post | null;
  readonly itemTravel: Travel | null;
  readonly panelRef: Ref<HTMLElement>;
  readonly onBack: () => void;
}

/** The window's item mode: one item in full, sliding when you move to another. */
export function DetailView({
  live,
  sectionId,
  sectionTitle,
  item,
  post,
  itemTravel,
  panelRef,
  onBack,
}: DetailViewProps) {
  return (
    <TransitionSurface
      transitionKey={`${sectionId}/${item.id}`}
      travel={itemTravel}
      className="min-h-0 flex-1"
      layerClassName="overflow-y-auto"
    >
      {() =>
        item.type === 'article' && post !== null ? (
          <PostDetail
            item={item}
            post={post}
            sectionTitle={sectionTitle}
            panelRef={live ? panelRef : undefined}
            onBack={live ? onBack : undefined}
          />
        ) : (
          <ItemDetail
            item={item}
            sectionTitle={sectionTitle}
            body={bodyOf(item)}
            panelRef={live ? panelRef : undefined}
            onBack={live ? onBack : undefined}
          />
        )
      }
    </TransitionSurface>
  );
}

/** The Markdown body of a file-backed item, if it has one. */
function bodyOf(item: SectionItem) {
  return (item.type === 'project' || item.type === 'experience') && item.html !== '' ? (
    <MarkdownBody html={item.html} />
  ) : undefined;
}
