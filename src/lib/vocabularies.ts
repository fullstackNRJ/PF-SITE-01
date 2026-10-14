/**
 * Runtime vocabulary lists.
 *
 * These arrays are the single source of truth for every string union in the
 * content model. `types.ts` derives its unions from them with
 * `(typeof LIST)[number]`, and `content.config.ts` builds its Zod enums from
 * the same arrays. That means the authoring schema and the domain model cannot
 * drift: adding a card type here immediately widens the union *and* the
 * validator, and everywhere that must handle it fails to compile until it does.
 *
 * This module has no dependencies and is never bundled for the client: the
 * domain types it feeds are only ever imported with `import type`.
 */

export const CARD_TYPES = [
  'project',
  'experience',
  'article',
  'profile',
  'link',
  'stack',
] as const;

export const SECTION_KINDS = ['intro', 'profile', 'collection', 'index'] as const;

export const ITEM_STATUSES = [
  'shipped',
  'in-progress',
  'experiment',
  'archived',
  'planned',
] as const;

export const LINK_KINDS = [
  'primary',
  'repository',
  'demo',
  'writeup',
  'external',
  'social',
  'email',
] as const;

export const EMPLOYMENT_KINDS = [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
  'volunteer',
] as const;

export const STACK_CATEGORIES = [
  'language',
  'framework',
  'runtime',
  'data',
  'platform',
  'tooling',
  'design',
  'practice',
] as const;

export const PROFICIENCIES = ['learning', 'working', 'strong', 'expert'] as const;

export const MEDIA_ASPECTS = ['wide', 'square', 'tall'] as const;

/** How a section arranges its items in the window. Each needs a renderer in the layout registry. */
export const LAYOUT_TYPES = ['list', 'horizontal', 'grid', 'editorial'] as const;

export const CARD_SIZES = ['small', 'medium', 'large'] as const;

/** `featured` gives items flagged `featured: true` extra weight in the layout. */
export const FOCUS_MODES = ['default', 'featured'] as const;
