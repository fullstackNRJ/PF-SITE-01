import type {
  ContentSnapshot,
  Post,
  PostId,
  Section,
  SectionId,
  SectionItem,
  SiteConfig,
} from './types';

/**
 * Pure content access.
 *
 * This module has no Astro and no React dependency, which is what lets the same
 * API exist in two places:
 *
 *   build time   `src/lib/content.ts` loads, validates and wraps these functions
 *   render time  `ContentProvider` wraps them around a snapshot that arrived as props
 *
 * Hydrated islands cannot import `astro:content` and cannot receive functions as
 * props, so the accessors have to be reconstructible from plain data on the
 * client. That constraint is the reason this file exists separately.
 */

/** Canonical section order: `nav.order` first, then id for stability. */
export function sortSections(sections: readonly Section[]): Section[] {
  return [...sections].sort((a, b) => a.nav.order - b.nav.order || a.id.localeCompare(b.id));
}

/** Canonical item order within a section: `order`, then id for stability. */
export function sortItems(items: readonly SectionItem[]): SectionItem[] {
  return [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Newest post first, then id for stability. */
export function sortPostsByPublished(posts: readonly Post[]): Post[] {
  return [...posts].sort(
    (a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id),
  );
}

/** Sections the gallery may navigate to, in canonical order. */
export function navigableSections(sections: readonly Section[]): Section[] {
  return sortSections(sections.filter((section) => !section.nav.hidden));
}

/**
 * The read API over loaded content.
 *
 * Every method is synchronous and side-effect free: by the time you hold a
 * `ContentAccess`, the loading and validating are already done.
 */
export interface ContentAccess {
  getSiteConfig(): SiteConfig;
  getSections(): readonly Section[];
  getSection(id: SectionId): Section | null;
  getSectionItems(id: SectionId): readonly SectionItem[];
  getPost(id: PostId): Post | null;
}

/** Stable empty result, so `getSectionItems` does not allocate on a miss. */
const NO_ITEMS: readonly SectionItem[] = [];

/**
 * Builds an indexed accessor over a snapshot.
 *
 * Indexing happens once here, at construction, so callers that ask for the same
 * section on every render are doing a map lookup rather than a scan.
 */
export function createContentAccess(snapshot: ContentSnapshot): ContentAccess {
  const sections = sortSections(snapshot.sections);
  const posts = sortPostsByPublished(snapshot.posts);

  const sectionsById = new Map<SectionId, Section>(sections.map((section) => [section.id, section]));
  const itemsBySection = new Map<SectionId, readonly SectionItem[]>(
    sections.map((section) => [section.id, sortItems(section.items)]),
  );
  const postsById = new Map<PostId, Post>(posts.map((post) => [post.id, post]));

  return {
    getSiteConfig: () => snapshot.site,
    getSections: () => sections,
    getSection: (id) => sectionsById.get(id) ?? null,
    getSectionItems: (id) => itemsBySection.get(id) ?? NO_ITEMS,
    getPost: (id) => postsById.get(id) ?? null,
  };
}
