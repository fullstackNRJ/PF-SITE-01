import { formatDate, formatTimeframe } from './format.ts';
import type { SectionItem } from './types';

/** Where a card sits in its list; `index` is zero-based. */
export interface CardPosition {
  readonly index: number;
  readonly total: number;
}

/**
 * The accessible name of a card, written for speech rather than for the eye.
 * The switch is exhaustive, so a new card type fails to compile until it has one.
 */
export function cardLabel(item: SectionItem, position?: CardPosition): string {
  const parts = [...describe(item)];
  if (position !== undefined) {
    parts.push(`${position.index + 1} of ${position.total}`);
  }
  return parts.join(', ');
}

function describe(item: SectionItem): readonly string[] {
  switch (item.type) {
    case 'project':
      return [item.title, 'project', ...(item.status === undefined ? [] : [item.status])];
    case 'experience':
      return [
        `${item.role} at ${item.company}`,
        'experience',
        ...(item.timeframe === undefined ? [] : [formatTimeframe(item.timeframe)]),
      ];
    case 'article':
      return [
        item.title,
        'article',
        `published ${formatDate(item.post.published)}`,
        `${item.post.readingTimeMinutes} minute read`,
        ...(item.post.platform === undefined ? [] : [`on ${item.post.platform}`]),
      ];
    case 'profile':
      return [item.title, 'profile', item.headline];
    case 'link':
      return item.href === undefined ? [item.title, item.domain] : [item.title, `link to ${item.domain}`];
    case 'stack':
      return [
        item.name,
        'stack',
        item.category,
        ...(item.proficiency === undefined ? [] : [item.proficiency]),
      ];
  }
}
