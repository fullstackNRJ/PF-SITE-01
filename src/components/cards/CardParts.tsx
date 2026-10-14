import { SafeLink } from '@/components/ui/SafeLink';
import type { ContentLink } from '@/lib/types';

/**
 * Small building blocks shared by card renderers and the item view.
 *
 * Cards differ in what they emphasise but share these primitives, so a new card
 * type is usually just a `CardFrame` plus a couple of these.
 */

export interface MetaListProps {
  /** `[label, value]` pairs. Rows with an empty value are dropped. */
  readonly rows: readonly (readonly [string, string])[];
}

/** Compact key/value facts, e.g. role, company, timeframe. */
export function MetaList({ rows }: MetaListProps) {
  const visible = rows.filter(([, value]) => value.length > 0);
  if (visible.length === 0) {
    return null;
  }

  return (
    <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="pt-0.5 font-mono text-micro lowercase text-fg-subtle">{label}</dt>
          <dd className="text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface HighlightListProps {
  readonly items: readonly string[];
}

/** Notable outcomes. */
export function HighlightList({ items }: HighlightListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Highlights"
      className="flex max-w-prose list-[square] flex-col gap-1.5 pl-4 text-sm leading-relaxed text-fg-muted marker:text-signal"
    >
      {items.map((entry) => (
        <li key={entry}>{entry}</li>
      ))}
    </ul>
  );
}

export interface TagListProps {
  readonly tags: readonly string[];
}

/** An item's own tags, as quiet hashtags rather than chips. */
export function TagList({ tags }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Tags" className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-micro text-fg-subtle">
      {tags.map((tag) => (
        <li key={tag}>
          <span aria-hidden="true">#</span>
          {tag}
        </li>
      ))}
    </ul>
  );
}

export interface LinkListProps {
  readonly links: readonly ContentLink[];
}

/** An item's outbound links. */
export function LinkList({ links }: LinkListProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Links" className="flex flex-wrap gap-x-5 gap-y-2">
      {links.map((link) => (
        <li key={`${link.kind}:${link.href}`}>
          <SafeLink className={TEXT_LINK} href={link.href}>
            {link.label}
          </SafeLink>
        </li>
      ))}
    </ul>
  );
}

const TEXT_LINK =
  'font-mono text-xs text-fg underline decoration-signal underline-offset-4 transition-colors duration-(--duration-quick) hover:text-signal';
