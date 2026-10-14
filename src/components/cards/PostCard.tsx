import { formatDate } from '@/lib/format';
import type { ArticleItem } from '@/lib/types';

import { CardFrame } from './CardFrame';
import { MetaList } from './CardParts';
import type { CardRendererProps } from './types';

/**
 * A Markdown post as a card.
 *
 * Everything shown comes from the post's frontmatter, already resolved onto the
 * item (title, summary, tags, cover image) or its `post` summary (dates,
 * platform). It never sees the body.
 */
export function PostCard({ item, ...state }: CardRendererProps<ArticleItem>) {
  const { post } = item;

  return (
    <CardFrame
      item={item}
      qualifier={post.draft ? 'draft' : (post.platform ?? 'article')}
      {...state}
    >
      <MetaList
        rows={[
          ['Published', formatDate(post.published)],
          ['Updated', post.updated === undefined ? '' : formatDate(post.updated)],
          ['Reading', `${String(post.readingTimeMinutes)} min`],
          ['Platform', post.platform ?? ''],
        ]}
      />
    </CardFrame>
  );
}
