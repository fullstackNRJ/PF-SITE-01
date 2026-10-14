import type { Ref } from 'react';

import { MarkdownBody } from '@/components/content/MarkdownBody';
import type { ArticleItem, Post } from '@/lib/types';

import { ItemDetail } from './ItemDetail';

export interface PostDetailProps {
  readonly item: ArticleItem;
  /** The post's rendered body; metadata comes from `item`. */
  readonly post: Post;
  readonly sectionTitle: string;
  readonly panelRef?: Ref<HTMLElement>;
  readonly onBack?: () => void;
}

/** A post in full: its metadata from the frontmatter, its body from the Markdown. */
export function PostDetail({ item, post, sectionTitle, panelRef, onBack }: PostDetailProps) {
  return (
    <ItemDetail
      item={item}
      sectionTitle={sectionTitle}
      panelRef={panelRef}
      onBack={onBack}
      body={<MarkdownBody html={post.html} />}
    />
  );
}
