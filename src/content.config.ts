import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import {
  CARD_SIZES,
  EMPLOYMENT_KINDS,
  FOCUS_MODES,
  ITEM_STATUSES,
  LAYOUT_TYPES,
  LINK_KINDS,
  MEDIA_ASPECTS,
  PROFICIENCIES,
  SECTION_KINDS,
  STACK_CATEGORIES,
} from './lib/vocabularies';
import { classifyHref, isSafeImageSrc } from './lib/links';

/**
 * Authoring schemas.
 *
 * These describe what a human is allowed to write in `src/content/**`. They are
 * deliberately a little more permissive than the domain model in
 * `src/lib/types.ts`: `order` may be omitted, `title`/`summary` may be omitted
 * on article items, and so on. `src/lib/content.ts` resolves those defaults and
 * is annotated with the domain types, so the two layers cannot drift without a
 * compile error.
 *
 * Every enum is built from `src/lib/vocabularies.ts`, which is also what the
 * domain unions are derived from.
 */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * YAML parses an unquoted `2025-08-19` in Markdown frontmatter as a `Date`, so
 * accept either form and let the loader normalise it to an ISO date string.
 * Quoting the date still works; forgetting to is no longer a confusing error.
 */
const dateValue = z.union([
  z.string().regex(DATE_PATTERN, 'Expected a date as YYYY-MM-DD'),
  z.date(),
]);

const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  kind: z.enum(LINK_KINDS).default('external'),
});

const mediaSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  aspect: z.enum(MEDIA_ASPECTS).optional(),
});

const timeframeSchema = z.object({
  start: z.string().regex(MONTH_PATTERN, 'Expected a month as YYYY-MM'),
  end: z.string().regex(MONTH_PATTERN, 'Expected a month as YYYY-MM').optional(),
  label: z.string().optional(),
});

/** Fields shared by every item, whatever its card type. */
const itemCore = {
  id: z.string().min(1),
  /** Optional: falls back to the item's position in the array. */
  order: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  status: z.enum(ITEM_STATUSES).optional(),
  links: z.array(linkSchema).default([]),
  media: mediaSchema.optional(),
};

/**
 * Overrides a section may apply to a Markdown-backed item. Everything is
 * optional: an omitted field is inherited from the referenced file.
 */
const referenceOverrides = {
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  links: z.array(linkSchema).optional(),
};

const projectItemSchema = z.object({
  ...itemCore,
  ...referenceOverrides,
  type: z.literal('project'),
  /** Resolved against the `projects` collection at load time. */
  projectId: z.string().min(1),
});

const experienceItemSchema = z.object({
  ...itemCore,
  ...referenceOverrides,
  type: z.literal('experience'),
  /** Resolved against the `experience` collection at load time. */
  experienceId: z.string().min(1),
});

const articleItemSchema = z.object({
  ...itemCore,
  type: z.literal('article'),
  /** Resolved against the `posts` collection at load time. */
  postId: z.string().min(1),
  /** Both optional: inherited from the post when omitted. */
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
});

const profileItemSchema = z.object({
  ...itemCore,
  type: z.literal('profile'),
  title: z.string().min(1),
  summary: z.string(),
  headline: z.string().min(1),
  location: z.string().optional(),
  pronouns: z.string().optional(),
  email: z.string().optional(),
  skills: z.array(z.string()).default([]),
});

const linkItemSchema = z
  .object({
    ...itemCore,
    type: z.literal('link'),
    title: z.string().min(1),
    summary: z.string(),
    /** Optional for places without a stable public URL, e.g. a Discord handle. */
    href: z.string().min(1).optional(),
    /** Derived from `href` when omitted; required when there is no `href`. */
    domain: z.string().min(1).optional(),
    category: z.string().optional(),
  })
  .refine((item) => item.href !== undefined || item.domain !== undefined, {
    message: 'A link item without `href` needs a `domain` to display',
    path: ['domain'],
  });

const stackItemSchema = z.object({
  ...itemCore,
  type: z.literal('stack'),
  title: z.string().min(1),
  summary: z.string(),
  name: z.string().min(1),
  category: z.enum(STACK_CATEGORIES),
  proficiency: z.enum(PROFICIENCIES).optional(),
  years: z.number().nonnegative().optional(),
});

const sectionItemSchema = z.discriminatedUnion('type', [
  projectItemSchema,
  experienceItemSchema,
  articleItemSchema,
  profileItemSchema,
  linkItemSchema,
  stackItemSchema,
]);

const sectionSchema = z.object({
  kind: z.enum(SECTION_KINDS),
  title: z.string().min(1),
  summary: z.string(),
  nav: z.object({
    /** Defaults to the section title. */
    label: z.string().min(1).optional(),
    order: z.number().int().nonnegative(),
    position: z.object({ x: z.number(), y: z.number() }),
    shortcut: z.string().length(1).optional(),
    hidden: z.boolean().default(false),
    entry: z.boolean().default(false),
  }),
  /** Presentation of the item area. Every field falls back to a default in `src/lib/content.ts`. */
  layout: z
    .object({
      type: z.enum(LAYOUT_TYPES).optional(),
      cardSize: z.enum(CARD_SIZES).optional(),
      focusMode: z.enum(FOCUS_MODES).optional(),
    })
    .optional(),
  items: z.array(sectionItemSchema).default([]),
});

const siteSchema = z.object({
  title: z.string().min(1),
  tagline: z.string(),
  description: z.string(),
  url: z.url().optional(),
  locale: z.string().default('en'),
  keywords: z.array(z.string()).default([]),
  entrySection: z.string().min(1).optional(),
  author: z.object({
    name: z.string().min(1),
    headline: z.string(),
    location: z.string().optional(),
    email: z.string().optional(),
    avatar: z.string().optional(),
  }),
  social: z.array(linkSchema).default([]),
});

const POST_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const markdownId = z
  .string()
  .regex(POST_ID_PATTERN, 'Use lowercase letters, digits and single hyphens')
  .optional();

/** An http(s) URL. `z.url()` alone would also accept `javascript:` and `data:`. */
const webUrl = z
  .url()
  .refine((value) => classifyHref(value)?.kind === 'external', 'Expected an http(s) URL');

const imageSource = z
  .string()
  .refine(
    isSafeImageSrc,
    'Expected an http(s) URL or an absolute path into public/, e.g. /media/cover.svg',
  );

/**
 * Cover image. A bare string is decorative (empty alt text); use the object
 * form when the image carries meaning.
 */
const postImageSchema = z.union([
  imageSource,
  z.object({
    src: imageSource,
    alt: z.string(),
    aspect: z.enum(MEDIA_ASPECTS).optional(),
  }),
]);

const postSchema = z.object({
  /** Optional: defaults to the file name without its extension. */
  id: markdownId,
  title: z.string().min(1),
  description: z.string(),
  published: dateValue,
  updated: dateValue.optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  platform: z.string().min(1).optional(),
  url: webUrl.optional(),
  image: postImageSchema.optional(),
});

/** Frontmatter fields shared by Markdown-backed section items. */
const itemFrontmatter = {
  id: markdownId,
  title: z.string().min(1),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  status: z.enum(ITEM_STATUSES).optional(),
  links: z.array(linkSchema).default([]),
  media: mediaSchema.optional(),
  highlights: z.array(z.string()).default([]),
};

const projectSchema = z.object({
  ...itemFrontmatter,
  role: z.string().optional(),
  timeframe: timeframeSchema.optional(),
  stack: z.array(z.string()).default([]),
});

const experienceSchema = z.object({
  ...itemFrontmatter,
  company: z.string().min(1),
  role: z.string().min(1),
  timeframe: timeframeSchema.optional(),
  location: z.string().optional(),
  employment: z.enum(EMPLOYMENT_KINDS).default('full-time'),
});

/** A folder of Markdown files whose id is the frontmatter `id` or else the file name. */
function markdownLoader(base: string) {
  return glob({
    base,
    pattern: '**/*.md',
    // Astro rejects duplicate ids.
    generateId: ({ entry, data }) =>
      typeof data.id === 'string' ? data.id : entry.replace(/\.md$/u, ''),
  });
}

/**
 * Collections.
 *
 * `sections` is JSON so that adding an item is a data edit, never a code edit.
 * Section ids come from file names, which is why `nav.entry`, `entrySection`
 * and item `postId` / `projectId` / `experienceId` references all point at
 * things you can find in the tree.
 */
export const collections = {
  site: defineCollection({
    loader: glob({ base: './src/content', pattern: 'site.json' }),
    schema: siteSchema,
  }),
  sections: defineCollection({
    loader: glob({ base: './src/content/sections', pattern: '*.json' }),
    schema: sectionSchema,
  }),
  posts: defineCollection({
    loader: markdownLoader('./src/content/posts'),
    schema: postSchema,
  }),
  projects: defineCollection({
    loader: markdownLoader('./src/content/projects'),
    schema: projectSchema,
  }),
  experience: defineCollection({
    loader: markdownLoader('./src/content/experience'),
    schema: experienceSchema,
  }),
};
