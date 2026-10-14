import { useId } from 'react';
import type { ReactNode, Ref } from 'react';

import { CardMedia } from '@/components/cards/CardMedia';
import { LinkList, MetaList, TagList } from '@/components/cards/CardParts';
import { Key } from '@/components/ui/Key';
import { formatDate, formatTimeframe } from '@/lib/format';
import { callToAction, classifyHref } from '@/lib/links';
import { KEY_ESCAPE } from '@/lib/navigation/shortcuts';
import type { SectionItem } from '@/lib/types';

import { ItemCta } from './ItemCta';

export interface ItemDetailProps {
  readonly item: SectionItem;
  readonly sectionTitle: string;
  /** Long-form content shown beside the metadata, e.g. a rendered post. */
  readonly body?: ReactNode;
  /** Takes focus when the view opens. Omitted on the exiting copy. */
  readonly panelRef?: Ref<HTMLElement>;
  readonly onBack?: () => void;
}

/**
 * Everything known about one item, laid out like a magazine page: the body in
 * the main column and the record (facts, tags, links) in a side column from
 * `lg` up. Props only, so it can be drawn twice during a transition.
 */
export function ItemDetail({ item, sectionTitle, body, panelRef, onBack }: ItemDetailProps) {
  const titleId = useId();
  const cta = callToAction(item);
  // The call to action already carries one link; listing it again is noise.
  const otherLinks = item.links.filter((link) => classifyHref(link.href)?.href !== cta?.href);

  return (
    <article
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      // The heading is announced and Back is the first tab stop, so the container needs no ring.
      className="flex flex-col gap-8 p-4 focus:outline-none md:p-6 lg:gap-10 lg:p-10"
    >
      <button
        type="button"
        onClick={onBack}
        className="-my-2 flex items-center gap-2 self-start py-2 font-mono text-micro text-fg-muted transition-colors duration-(--duration-quick) hover:text-fg"
      >
        <span aria-hidden="true">←</span>
        Back to {sectionTitle}
        <span aria-hidden="true" className="pointer-coarse:hidden">
          <Key label={KEY_ESCAPE} />
        </span>
      </button>

      <header className="flex max-w-3xl flex-col gap-4">
        <p className="font-mono text-micro text-fg-subtle">{item.type}</p>
        <h2 id={titleId} className="font-serif text-4xl leading-[1.05] text-fg md:text-5xl lg:text-6xl">
          {item.title}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-fg-muted">{item.summary}</p>
      </header>

      <CardMedia media={item.media} />

      <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
        <div className="flex flex-col gap-6 lg:order-last">
          <MetaList rows={describe(item)} />
          <TagList tags={item.tags} />
          {cta === null && otherLinks.length === 0 ? null : (
            <div className="flex flex-col items-start gap-4">
              <ItemCta item={item} />
              <LinkList links={otherLinks} />
            </div>
          )}
        </div>

        {body === undefined ? null : <div>{body}</div>}
      </div>
    </article>
  );
}

function describe(item: SectionItem): readonly (readonly [string, string])[] {
  switch (item.type) {
    case 'project':
      return [
        ['Role', item.role ?? ''],
        ['When', item.timeframe === undefined ? '' : formatTimeframe(item.timeframe)],
        ['Status', item.status ?? ''],
        ['Stack', item.stack.join(', ')],
      ];
    case 'experience':
      return [
        ['Company', item.company],
        ['Role', item.role],
        ['When', item.timeframe === undefined ? '' : formatTimeframe(item.timeframe)],
        ['Where', item.location ?? ''],
        ['Type', item.employment],
      ];
    case 'article':
      return [
        ['Published', formatDate(item.post.published)],
        ['Updated', item.post.updated === undefined ? '' : formatDate(item.post.updated)],
        ['Reading time', `${String(item.post.readingTimeMinutes)} min`],
        ['Platform', item.post.platform ?? ''],
        ['Draft', item.post.draft ? 'yes' : ''],
      ];
    case 'profile':
      return [
        ['Headline', item.headline],
        ['Based', item.location ?? ''],
        ['Pronouns', item.pronouns ?? ''],
        ['Email', item.email ?? ''],
        ['Focus', item.skills.join(', ')],
      ];
    case 'link':
      return [
        ['Domain', item.domain],
        ['Category', item.category ?? ''],
      ];
    case 'stack':
      return [
        ['Name', item.name],
        ['Category', item.category],
        ['Level', item.proficiency ?? ''],
        ['Years', item.years === undefined ? '' : String(item.years)],
      ];
  }
}
