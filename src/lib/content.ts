import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';

import {
  createContentAccess,
  sortPostsByPublished,
  sortSections,
  sortItems,
} from './content-access';
import type { ContentAccess } from './content-access';
import type {
  AuthorProfile,
  ContentLink,
  ContentSnapshot,
  ExperienceId,
  IsoDate,
  Media,
  Post,
  PostId,
  PostSummary,
  ProjectId,
  Section,
  SectionId,
  SectionItem,
  SectionLayout,
  SiteConfig,
  Timeframe,
} from './types';

/**
 * The portfolio content API.
 *
 * This is the one place that reads `src/content/**`. It:
 *
 *   1. loads JSON sections and Markdown posts through Astro's content layer,
 *      which validates each file against the Zod schemas in `src/content.config.ts`;
 *   2. validates the *relationships* Astro cannot see, also with Zod;
 *   3. assembles the fully resolved domain model from `src/lib/types.ts`;
 *   4. hands out a synchronous, indexed `ContentAccess`.
 *
 * ## Server only
 *
 * This module imports `astro:content`, so it must never be imported by a React
 * component: hydrated islands cannot reach Astro's content layer and the build
 * will fail. Pages call it and pass the resulting snapshot into the island as
 * props; components then read that snapshot through `useContent()`. Both paths
 * expose the identical five methods.
 *
 *   page        await getSectionItems('work')
 *   component   useContent().getSectionItems('work')
 */

/** Raised when authored content is structurally valid but semantically broken. */
export class ContentError extends Error {
  override readonly name = 'ContentError';
}

/* ------------------------------------------------------------------ *
 * Runtime validation
 * ------------------------------------------------------------------ */

/**
 * Relationship rules that per-file schemas cannot express.
 *
 * Astro guarantees each entry matches its schema. It cannot know that an
 * `article` item's `postId` names a real post, or that `entrySection` names a
 * real section, because both are plain strings rather than `reference()` values.
 * Zod is reused here so content failures surface as one readable report.
 */
const rawContentSchema = z
  .object({
    siteEntries: z.array(
      z.object({
        data: z.object({
          entrySection: z.string().min(1).optional(),
        }),
      }),
    ),
    sectionEntries: z.array(
      z.object({
        id: z.string().min(1),
        data: z.object({
          nav: z.object({ entry: z.boolean() }),
          items: z.array(
            z.object({
              id: z.string().min(1),
              type: z.string().min(1),
              /** Only present on `article` items; enforced below. */
              postId: z.string().min(1).optional(),
              projectId: z.string().min(1).optional(),
              experienceId: z.string().min(1).optional(),
            }),
          ),
        }),
      }),
    ),
    postEntries: z.array(z.object({ id: z.string().min(1) })),
    projectEntries: z.array(z.object({ id: z.string().min(1) })),
    experienceEntries: z.array(z.object({ id: z.string().min(1) })),
  })
  .superRefine((raw, ctx) => {
    const sectionIds = new Set(raw.sectionEntries.map((entry) => entry.id));
    const postIds = new Set(raw.postEntries.map((entry) => entry.id));
    const projectIds = new Set(raw.projectEntries.map((entry) => entry.id));
    const experienceIds = new Set(raw.experienceEntries.map((entry) => entry.id));

    if (raw.siteEntries.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['siteEntries'],
        message: `Expected exactly one site config (src/content/site.json), found ${raw.siteEntries.length}.`,
      });
    }

    const site = raw.siteEntries[0];
    const entrySection = site?.data.entrySection;
    if (entrySection !== undefined && !sectionIds.has(entrySection)) {
      ctx.addIssue({
        code: 'custom',
        path: ['siteEntries', 0, 'data', 'entrySection'],
        message: `Site config points at unknown section "${entrySection}". Known sections: ${listIds(sectionIds)}.`,
      });
    }

    const flagged = raw.sectionEntries.filter((entry) => entry.data.nav.entry);
    if (flagged.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['sectionEntries'],
        message: `Only one section may set nav.entry, but ${String(flagged.length)} do: ${flagged.map((entry) => entry.id).join(', ')}.`,
      });
    }

    for (const section of raw.sectionEntries) {
      const seenItemIds = new Set<string>();

      for (const item of section.data.items) {
        if (seenItemIds.has(item.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['sectionEntries'],
            message: `Section "${section.id}" declares item id "${item.id}" more than once. Item ids must be unique within a section.`,
          });
        }
        seenItemIds.add(item.id);

        if (item.type === 'article' && (item.postId === undefined || !postIds.has(item.postId))) {
          const target = item.postId ?? '(missing postId)';
          ctx.addIssue({
            code: 'custom',
            path: ['sectionEntries'],
            message:
              `Section "${section.id}" item "${item.id}" points at ${target}, which is not a post. ` +
              `Expected src/content/posts/${item.postId ?? '<id>'}.md. Known posts: ${listIds(postIds)}.`,
          });
        }

        if (
          item.type === 'project' &&
          (item.projectId === undefined || !projectIds.has(item.projectId))
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['sectionEntries'],
            message:
              `Section "${section.id}" item "${item.id}" points at ${item.projectId ?? '(missing projectId)'}, which is not a project. ` +
              `Expected src/content/projects/${item.projectId ?? '<id>'}.md. Known projects: ${listIds(projectIds)}.`,
          });
        }

        if (
          item.type === 'experience' &&
          (item.experienceId === undefined || !experienceIds.has(item.experienceId))
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['sectionEntries'],
            message:
              `Section "${section.id}" item "${item.id}" points at ${item.experienceId ?? '(missing experienceId)'}, which is not an experience entry. ` +
              `Expected src/content/experience/${item.experienceId ?? '<id>'}.md. Known entries: ${listIds(experienceIds)}.`,
          });
        }
      }
    }
  });

function listIds(ids: ReadonlySet<string>): string {
  return ids.size === 0 ? 'none' : [...ids].sort().join(', ');
}

interface RawContent {
  readonly siteEntries: readonly CollectionEntry<'site'>[];
  readonly sectionEntries: readonly CollectionEntry<'sections'>[];
  readonly postEntries: readonly CollectionEntry<'posts'>[];
  readonly projectEntries: readonly CollectionEntry<'projects'>[];
  readonly experienceEntries: readonly CollectionEntry<'experience'>[];
}

function validateRelationships(raw: RawContent): void {
  const result = rawContentSchema.safeParse(raw);
  if (result.success) {
    return;
  }

  const details = result.error.issues
    .map((issue) => `  • ${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`)
    .join('\n');

  throw new ContentError(`Content validation failed:\n${details}`);
}

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

let snapshotPromise: Promise<ContentSnapshot> | undefined;
let accessCache: ContentAccess | undefined;

/**
 * Loads, validates and assembles the whole site. Runs once per process.
 *
 * The promise itself is memoized, so concurrent callers share a single pass
 * over the content layer rather than each triggering their own.
 */
export function getContentSnapshot(): Promise<ContentSnapshot> {
  snapshotPromise ??= loadSnapshot().catch((error: unknown) => {
    // Never cache a failure: a fix in the dev server should be retryable.
    snapshotPromise = undefined;
    throw error;
  });

  return snapshotPromise;
}

/** Loads the content once and returns the indexed, synchronous accessor. */
export async function getContentAccess(): Promise<ContentAccess> {
  const snapshot = await getContentSnapshot();
  accessCache ??= createContentAccess(snapshot);
  return accessCache;
}

async function loadSnapshot(): Promise<ContentSnapshot> {
  const [siteEntries, sectionEntries, postEntries, projectEntries, experienceEntries] =
    await Promise.all([
      getCollection('site'),
      getCollection('sections'),
      getCollection('posts'),
      getCollection('projects'),
      getCollection('experience'),
    ]);

  validateRelationships({
    siteEntries,
    sectionEntries,
    postEntries,
    projectEntries,
    experienceEntries,
  });

  const posts = sortPostsByPublished(postEntries.map(toPost));
  // Cards get the metadata only; the rendered body stays on `snapshot.posts`.
  const postsById = new Map<PostId, PostSummary>(
    posts.map(({ html: _html, ...summary }) => [summary.id, summary]),
  );
  const sources: ItemSources = {
    postsById,
    projectsById: new Map(projectEntries.map((entry) => [entry.id, entry])),
    experienceById: new Map(experienceEntries.map((entry) => [entry.id, entry])),
  };

  return {
    site: toSiteConfig(siteEntries[0]),
    sections: sortSections(sectionEntries.map((entry) => toSection(entry, sources))),
    posts,
  };
}

/* ------------------------------------------------------------------ *
 * Public API
 *
 * Each method mirrors one on `ContentAccess`; they are async only because the
 * first call has to await Astro's content layer.
 * ------------------------------------------------------------------ */

/** Global site configuration from `src/content/site.json`. */
export async function getSiteConfig(): Promise<SiteConfig> {
  return (await getContentSnapshot()).site;
}

/** Every section, in canonical navigation order. */
export async function getSections(): Promise<readonly Section[]> {
  return (await getContentSnapshot()).sections;
}

/** One section by id, or `null` when it does not exist. */
export async function getSection(id: SectionId): Promise<Section | null> {
  return (await getContentAccess()).getSection(id);
}

/** The items owned by a section, in canonical order. Empty for unknown ids. */
export async function getSectionItems(id: SectionId): Promise<readonly SectionItem[]> {
  return (await getContentAccess()).getSectionItems(id);
}

/** One Markdown post including its body, or `null` when it does not exist. */
export async function getPost(id: PostId): Promise<Post | null> {
  return (await getContentAccess()).getPost(id);
}

/* ------------------------------------------------------------------ *
 * Assembly: authoring shapes -> domain shapes
 * ------------------------------------------------------------------ */

type SiteEntry = CollectionEntry<'site'>;
type SectionEntry = CollectionEntry<'sections'>;
type PostEntry = CollectionEntry<'posts'>;
type ProjectEntry = CollectionEntry<'projects'>;
type ExperienceEntry = CollectionEntry<'experience'>;
type ItemEntry = SectionEntry['data']['items'][number];

/** The Markdown collections section items may reference. */
interface ItemSources {
  readonly postsById: ReadonlyMap<PostId, PostSummary>;
  readonly projectsById: ReadonlyMap<ProjectId, ProjectEntry>;
  readonly experienceById: ReadonlyMap<ExperienceId, ExperienceEntry>;
}

const DEFAULT_LAYOUT: SectionLayout = { type: 'list', cardSize: 'medium', focusMode: 'default' };

const WORDS_PER_MINUTE = 220;

function toSiteConfig(entry: SiteEntry | undefined): SiteConfig {
  if (entry === undefined) {
    throw new ContentError('Missing site configuration. Expected src/content/site.json.');
  }

  const { data } = entry;

  return {
    title: data.title,
    tagline: data.tagline,
    description: data.description,
    url: data.url,
    locale: data.locale,
    keywords: data.keywords,
    entrySection: data.entrySection,
    author: toAuthor(data.author),
    social: data.social.map(toLink),
  };
}

function toAuthor(author: SiteEntry['data']['author']): AuthorProfile {
  return {
    name: author.name,
    headline: author.headline,
    location: author.location,
    email: author.email,
    avatar: author.avatar,
  };
}

function toSection(entry: SectionEntry, sources: ItemSources): Section {
  const { data } = entry;

  return {
    id: entry.id,
    kind: data.kind,
    title: data.title,
    summary: data.summary,
    nav: {
      label: data.nav.label ?? data.title,
      order: data.nav.order,
      position: { x: data.nav.position.x, y: data.nav.position.y },
      shortcut: data.nav.shortcut,
      hidden: data.nav.hidden,
      entry: data.nav.entry,
    },
    layout: {
      type: data.layout?.type ?? DEFAULT_LAYOUT.type,
      cardSize: data.layout?.cardSize ?? DEFAULT_LAYOUT.cardSize,
      focusMode: data.layout?.focusMode ?? DEFAULT_LAYOUT.focusMode,
    },
    items: sortItems(data.items.map((item, index) => toItem(item, entry.id, index, sources))),
  };
}

/**
 * Resolves one authored item into the domain union.
 *
 * The switch is exhaustive over `ItemEntry['type']`. Because the function
 * returns `SectionItem` and has no trailing return, adding a card type to the
 * schema without handling it here is a compile error rather than a blank card.
 */
function toItem(
  item: ItemEntry,
  sectionId: SectionId,
  index: number,
  sources: ItemSources,
): SectionItem {
  const core = {
    id: item.id,
    order: item.order ?? index,
    tags: item.tags ?? [],
    featured: item.featured ?? false,
    status: item.status,
    links: (item.links ?? []).map(toLink),
    media: toOptionalMedia(item.media),
  };

  switch (item.type) {
    case 'project': {
      const source = sources.projectsById.get(item.projectId);
      if (source === undefined) {
        throw new ContentError(
          `Section "${sectionId}" item "${item.id}" references unknown project "${item.projectId}".`,
        );
      }
      const { data } = source;

      return {
        ...core,
        ...inheritCore(item, data),
        type: 'project',
        projectId: source.id,
        html: markdownHtml(source),
        role: data.role,
        timeframe: data.timeframe === undefined ? undefined : toTimeframe(data.timeframe),
        stack: data.stack,
        highlights: data.highlights,
      };
    }

    case 'experience': {
      const source = sources.experienceById.get(item.experienceId);
      if (source === undefined) {
        throw new ContentError(
          `Section "${sectionId}" item "${item.id}" references unknown experience "${item.experienceId}".`,
        );
      }
      const { data } = source;

      return {
        ...core,
        ...inheritCore(item, data),
        type: 'experience',
        experienceId: source.id,
        html: markdownHtml(source),
        company: data.company,
        role: data.role,
        timeframe: data.timeframe === undefined ? undefined : toTimeframe(data.timeframe),
        location: data.location,
        employment: data.employment,
        highlights: data.highlights,
      };
    }

    case 'article': {
      // `validateRelationships` has already proven this lookup succeeds; the
      // guard keeps the type checker honest without a cast.
      const post = sources.postsById.get(item.postId);
      if (post === undefined) {
        throw new ContentError(
          `Section "${sectionId}" item "${item.id}" references unknown post "${item.postId}".`,
        );
      }

      // The post's frontmatter drives the card; the item may only override.
      return {
        ...core,
        type: 'article',
        title: item.title ?? post.title,
        summary: item.summary ?? post.description,
        tags: item.tags.length > 0 ? item.tags : post.tags,
        media: core.media ?? post.image,
        post,
      };
    }

    case 'profile':
      return {
        ...core,
        type: 'profile',
        title: item.title,
        summary: item.summary,
        headline: item.headline,
        location: item.location,
        pronouns: item.pronouns,
        email: item.email,
        skills: item.skills,
      };

    case 'link':
      return {
        ...core,
        type: 'link',
        title: item.title,
        summary: item.summary,
        href: item.href,
        domain: item.domain ?? domainOf(item.href ?? ''),
        category: item.category,
      };

    case 'stack':
      return {
        ...core,
        type: 'stack',
        title: item.title,
        summary: item.summary,
        name: item.name,
        category: item.category,
        proficiency: item.proficiency,
        years: item.years,
      };
  }
}

/**
 * Fields a Markdown-backed item takes from its file unless the section item
 * overrides them.
 */
function inheritCore(
  item: Extract<ItemEntry, { type: 'project' | 'experience' }>,
  data: ProjectEntry['data'] | ExperienceEntry['data'],
) {
  return {
    title: item.title ?? data.title,
    summary: item.summary ?? data.summary,
    tags: item.tags ?? data.tags,
    featured: item.featured ?? data.featured,
    status: item.status ?? data.status,
    links: (item.links ?? data.links).map(toLink),
    media: toOptionalMedia(item.media ?? data.media),
  };
}

/**
 * The sanitised HTML Astro rendered for a Markdown entry ('' for an empty body).
 *
 * Astro's glob loader logs a render failure and carries on with no HTML, so a
 * broken file would otherwise ship as an empty page.
 */
function markdownHtml(entry: PostEntry | ProjectEntry | ExperienceEntry): string {
  const html = entry.rendered?.html;
  if (html !== undefined) {
    return html;
  }
  if ((entry.body ?? '').trim() === '') {
    return '';
  }
  throw new ContentError(
    `"${entry.collection}/${entry.id}" produced no HTML. Check the build log above for the Markdown error ` +
      '(unsupported image path, malformed frontmatter ...).',
  );
}

function toPost(entry: PostEntry): Post {
  const image = entry.data.image;

  return {
    id: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    published: toIsoDate(entry.data.published),
    updated: entry.data.updated === undefined ? undefined : toIsoDate(entry.data.updated),
    tags: entry.data.tags,
    draft: entry.data.draft,
    platform: entry.data.platform,
    url: entry.data.url,
    // A bare string is decorative, so it gets empty alt text.
    image: image === undefined ? undefined : typeof image === 'string' ? { src: image, alt: '' } : toMedia(image),
    readingTimeMinutes: readingTimeMinutes(entry.body ?? ''),
    html: markdownHtml(entry),
  };
}

/* ------------------------------------------------------------------ *
 * Value coercion
 * ------------------------------------------------------------------ */

function toLink(link: { label: string; href: string; kind: ContentLink['kind'] }): ContentLink {
  return { label: link.label, href: link.href, kind: link.kind };
}

function toTimeframe(timeframe: {
  start: string;
  end?: string | undefined;
  label?: string | undefined;
}): Timeframe {
  return { start: timeframe.start, end: timeframe.end, label: timeframe.label };
}

function toMedia(media: { src: string; alt: string; aspect?: Media['aspect'] }): Media {
  return { src: media.src, alt: media.alt, aspect: media.aspect };
}

function toOptionalMedia(
  media: { src: string; alt: string; aspect?: Media['aspect'] } | undefined,
): Media | undefined {
  return media === undefined ? undefined : toMedia(media);
}

function readingTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Best-effort hostname for display. Falls back to the raw href for non-URLs like `mailto:`. */
function domainOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./u, '');
  } catch {
    return href;
  }
}

/**
 * Normalises a frontmatter date to `YYYY-MM-DD`.
 *
 * Authors may write `2025-08-19` unquoted, which YAML hands us as a `Date` at
 * UTC midnight, or quote it and get a string. Both end up in the same shape.
 */
function toIsoDate(value: string | Date): IsoDate {
  return typeof value === 'string' ? value : value.toISOString().slice(0, 10);
}
