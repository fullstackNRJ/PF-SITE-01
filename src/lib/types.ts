/**
 * Portfolio content model.
 *
 * This module is the authoritative description of everything the site can
 * display. It is deliberately free of Astro, React and DOM dependencies so the
 * same shapes can be produced by a file loader, a CMS or a test fixture.
 *
 * Two layers cooperate:
 *
 *   authoring   `src/content/**` + `src/content.config.ts`
 *               What a human writes: JSON files and Markdown. Deliberately
 *               permissive, because the loader fills in sensible defaults.
 *
 *   domain      this file
 *               What the UI consumes: fully resolved, no authoring shortcuts,
 *               no `undefined` where a value is guaranteed to exist.
 *
 * `src/lib/content.ts` performs the translation and is annotated with the types
 * below, so any drift between the two layers is a compile error.
 *
 * Adding a new portfolio item never requires touching a React component: add
 * an object to a section's `items` array in `src/content/sections/*.json`,
 * using one of the `CardType` discriminants below.
 */

import type {
  CARD_SIZES,
  CARD_TYPES,
  EMPLOYMENT_KINDS,
  FOCUS_MODES,
  ITEM_STATUSES,
  LAYOUT_TYPES,
  LINK_KINDS,
  MEDIA_ASPECTS,
  PROFICIENCIES,
  SECTION_KINDS,
  STACK_CATEGORIES,
} from './vocabularies';

/* ------------------------------------------------------------------ *
 * Identifiers
 * ------------------------------------------------------------------ */

/**
 * A section identifier. Always the file name of `src/content/sections/<id>.json`
 * without the extension, so the id cannot drift from the file that defines it.
 */
export type SectionId = string;

/** An item identifier, unique within its section. Authored explicitly so it is stable across reordering. */
export type ItemId = string;

/** A Markdown post identifier: `src/content/posts/<id>.md` without the extension. */
export type PostId = string;

/** A Markdown project identifier: `src/content/projects/<id>.md` without the extension. */
export type ProjectId = string;

/** A Markdown role identifier: `src/content/experience/<id>.md` without the extension. */
export type ExperienceId = string;

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/** A location in the gallery's 2D coordinate space. Positive `y` points down. */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/** Calendar date in `YYYY-MM-DD` form. */
export type IsoDate = string;

/** Calendar month in `YYYY-MM` form. Used where a day would be false precision. */
export type IsoMonth = string;

/** Lifecycle stage of an item. Unset means "no claim made". */
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** What a link points at, so renderers can pick sensible affordances. */
export type LinkKind = (typeof LINK_KINDS)[number];

/** An outbound reference attached to an item or to the site itself. */
export interface ContentLink {
  readonly label: string;
  readonly href: string;
  readonly kind: LinkKind;
}

/** An inclusive-exclusive month range. A missing `end` means "still going". */
export interface Timeframe {
  readonly start: IsoMonth;
  /** Omitted while the role or project is ongoing. */
  readonly end?: IsoMonth;
  /** Human-readable override, e.g. `"2023 — present"`. */
  readonly label?: string;
}

/** Optional artwork for an item. */
export interface Media {
  readonly src: string;
  readonly alt: string;
  readonly aspect?: (typeof MEDIA_ASPECTS)[number];
}

/* ------------------------------------------------------------------ *
 * Global site configuration
 * ------------------------------------------------------------------ */

/** The person the site is about. */
export interface AuthorProfile {
  readonly name: string;
  readonly headline: string;
  readonly location?: string;
  readonly email?: string;
  readonly avatar?: string;
}

/** Site-wide settings, authored once in `src/content/site.json`. */
export interface SiteConfig {
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly url?: string;
  /** BCP-47 language tag. */
  readonly locale: string;
  readonly keywords: readonly string[];
  readonly author: AuthorProfile;
  readonly social: readonly ContentLink[];
  /**
   * Section the gallery opens on. When unset, the first section flagged
   * `nav.entry` wins, falling back to the first visible section.
   */
  readonly entrySection?: SectionId;
}

/* ------------------------------------------------------------------ *
 * Navigation metadata
 * ------------------------------------------------------------------ */

/**
 * Everything the navigation engine and rail need to know about a section.
 *
 * Keeping this nested under `nav` means presentation concerns never leak into
 * the section's content fields, and the graph builder has exactly one place to
 * read from.
 */
export interface NavigationMetadata {
  /** Short label for the rail. Defaults to the section title when omitted. */
  readonly label: string;
  /** Sort position for linear traversal and the rail. */
  readonly order: number;
  /** Location in the gallery's 2D space. */
  readonly position: Position;
  /** Single-character shortcut hint. */
  readonly shortcut?: string;
  /** Hidden sections are excluded from the graph and the rail entirely. */
  readonly hidden: boolean;
  /** Marks the preferred entry node when `SiteConfig.entrySection` is unset. */
  readonly entry: boolean;
}

/* ------------------------------------------------------------------ *
 * Markdown posts
 * ------------------------------------------------------------------ */

/**
 * Everything about a post except its body. Safe to embed in cards.
 *
 * This is the Markdown frontmatter, resolved: it is what cards render from.
 */
export interface PostSummary {
  readonly id: PostId;
  readonly title: string;
  readonly description: string;
  readonly published: IsoDate;
  readonly updated?: IsoDate;
  readonly tags: readonly string[];
  readonly draft: boolean;
  /** Where the post is also published, e.g. `Hashnode`. */
  readonly platform?: string;
  /** The canonical copy elsewhere. Always http(s). */
  readonly url?: string;
  /** Cover artwork. Falls back to nothing, never to a placeholder. */
  readonly image?: Media;
  /** Estimated from word count at load time. Always at least 1. */
  readonly readingTimeMinutes: number;
}

/**
 * A post with its body rendered to HTML.
 *
 * `html` is produced at build time by the Markdown pipeline in
 * `src/lib/markdown/`, which drops raw HTML and vets every link and image, so
 * it is safe to inject. It is the Markdown body and nothing else.
 */
export interface Post extends PostSummary {
  readonly html: string;
}

/* ------------------------------------------------------------------ *
 * Section items
 * ------------------------------------------------------------------ */

/** The renderer a `SectionItem` resolves to through the card registry. */
export type CardType = (typeof CARD_TYPES)[number];

/** Fields every item carries, whatever its type. */
export interface BaseItem {
  readonly id: ItemId;
  readonly type: CardType;
  readonly title: string;
  readonly summary: string;
  /** Authoring order within the section; falls back to array position. */
  readonly order: number;
  readonly tags: readonly string[];
  readonly featured: boolean;
  readonly status?: ItemStatus;
  readonly links: readonly ContentLink[];
  readonly media?: Media;
}

/**
 * Something built: a product, a tool, a side project.
 *
 * Authored as `src/content/projects/<projectId>.md`; the section item only
 * references it and may override title, summary and the core fields.
 */
export interface ProjectItem extends BaseItem {
  readonly type: 'project';
  readonly projectId: ProjectId;
  /** The Markdown body as sanitised HTML (see `Post.html`). Empty when the file has no body. */
  readonly html: string;
  readonly role?: string;
  readonly timeframe?: Timeframe;
  readonly stack: readonly string[];
  readonly highlights: readonly string[];
}

/** Why the item is in the list, so renderers can label it. */
export type EmploymentKind = (typeof EMPLOYMENT_KINDS)[number];

/** A role held at a company. Authored as `src/content/experience/<experienceId>.md`. */
export interface ExperienceItem extends BaseItem {
  readonly type: 'experience';
  readonly experienceId: ExperienceId;
  /** The Markdown body as sanitised HTML. Empty when the file has no body. */
  readonly html: string;
  readonly company: string;
  readonly role: string;
  readonly timeframe?: Timeframe;
  readonly location?: string;
  readonly employment: EmploymentKind;
  readonly highlights: readonly string[];
}

/**
 * A pointer to a Markdown post.
 *
 * The loader resolves `postId` against the posts collection and attaches the
 * summary, so a card can render without ever loading the body. Title and
 * summary are inherited from the post unless the item overrides them.
 */
export interface ArticleItem extends BaseItem {
  readonly type: 'article';
  readonly post: PostSummary;
}

/** The person behind the site, as a first-class item. */
export interface ProfileItem extends BaseItem {
  readonly type: 'profile';
  readonly headline: string;
  readonly location?: string;
  readonly pronouns?: string;
  readonly email?: string;
  readonly skills: readonly string[];
}

/** A reference to somewhere else on the internet. */
export interface LinkItem extends BaseItem {
  readonly type: 'link';
  /** Absent for places without a stable public URL; the card then shows `domain` as text. */
  readonly href?: string;
  /** Derived from `href` when not authored explicitly. */
  readonly domain: string;
  readonly category?: string;
}

/** A grouping of technologies, tools and practices. */
export type StackCategory = (typeof STACK_CATEGORIES)[number];

export type Proficiency = (typeof PROFICIENCIES)[number];

/** A technology, tool or practice the author works with. */
export interface StackItem extends BaseItem {
  readonly type: 'stack';
  readonly name: string;
  readonly category: StackCategory;
  readonly proficiency?: Proficiency;
  readonly years?: number;
}

/**
 * Every item that can appear in a section.
 *
 * Discriminated on `type`, which is what lets the card registry stay
 * exhaustive: adding a member to `CARD_TYPES` breaks compilation everywhere
 * that must handle all of them, and nowhere else.
 */
export type SectionItem =
  | ProjectItem
  | ExperienceItem
  | ArticleItem
  | ProfileItem
  | LinkItem
  | StackItem;

/** Narrow `SectionItem` to one variant, e.g. `SectionItemOf<'project'>`. */
export type SectionItemOf<TType extends CardType> = Extract<
  SectionItem,
  { readonly type: TType }
>;

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

/** How a section is meant to be presented. */
export type SectionKind = (typeof SECTION_KINDS)[number];

export type LayoutType = (typeof LAYOUT_TYPES)[number];

export type CardSize = (typeof CARD_SIZES)[number];

export type FocusMode = (typeof FOCUS_MODES)[number];

/**
 * How the window arranges a section's items. Presentation only: navigation is
 * linear in every layout (Up/Down walks items in canonical order).
 */
export interface SectionLayout {
  readonly type: LayoutType;
  readonly cardSize: CardSize;
  readonly focusMode: FocusMode;
}

/** A navigable node in the gallery and the items it owns. */
export interface Section {
  readonly id: SectionId;
  readonly kind: SectionKind;
  readonly title: string;
  readonly summary: string;
  readonly nav: NavigationMetadata;
  readonly layout: SectionLayout;
  readonly items: readonly SectionItem[];
}

/* ------------------------------------------------------------------ *
 * Loaded content
 * ------------------------------------------------------------------ */

/**
 * Everything the content layer can hand out, fully resolved and serializable.
 *
 * This is the unit of transfer between the build-time loader and the UI. It is
 * plain data — no class instances, no functions — so it survives being passed
 * into a hydrated island as props.
 */
export interface ContentSnapshot {
  readonly site: SiteConfig;
  readonly sections: readonly Section[];
  readonly posts: readonly Post[];
}
