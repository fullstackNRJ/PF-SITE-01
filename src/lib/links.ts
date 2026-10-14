import type { LinkKind, SectionItem } from './types';

export type LinkClass = 'external' | 'mailto' | 'internal';

export interface SafeTarget {
  readonly kind: LinkClass;
  readonly href: string;
}

/** Control characters and spaces are stripped by URL parsers, so `java\nscript:` must not slip past a scheme check. */
const IGNORED_BY_URL_PARSER = /[\u0000-\u0020\u007F]/g;
const SCHEME = /^([a-z][a-z\d+.-]*):/i;

/**
 * Classifies an authored href, or returns `null` when it must not become a link.
 *
 * Only http(s), mailto and same-site paths are allowed; every other scheme
 * (`javascript:`, `data:`, `vbscript:` ...) and protocol-relative `//host` are refused.
 */
export function classifyHref(href: string): SafeTarget | null {
  const cleaned = href.replace(IGNORED_BY_URL_PARSER, '');
  if (cleaned === '') {
    return null;
  }

  const scheme = SCHEME.exec(cleaned)?.[1]?.toLowerCase();
  if (scheme !== undefined) {
    if (scheme === 'http' || scheme === 'https') {
      return { kind: 'external', href: cleaned };
    }
    return scheme === 'mailto' ? { kind: 'mailto', href: cleaned } : null;
  }

  return cleaned.startsWith('//') ? null : { kind: 'internal', href: cleaned };
}

export interface CallToAction {
  readonly label: string;
  readonly href: string;
  readonly kind: LinkClass;
}

const IMAGE_SCHEME = /^https?:\/\//i;

/**
 * Whether an authored image source may be rendered.
 *
 * Allows http(s) URLs and absolute same-site paths (files under `public/`).
 * Refuses relative paths, which resolve against the page rather than the post
 * and so 404, plus protocol-relative `//host` and every other scheme
 * (`data:`, `javascript:` ...).
 */
export function isSafeImageSrc(src: string): boolean {
  const cleaned = src.replace(IGNORED_BY_URL_PARSER, '');
  if (IMAGE_SCHEME.test(cleaned)) {
    return classifyHref(cleaned)?.kind === 'external';
  }
  return cleaned.startsWith('/') && !cleaned.startsWith('//');
}

/** Which link wins when an item has several. */
const LINK_PRIORITY: readonly LinkKind[] = [
  'primary',
  'demo',
  'repository',
  'writeup',
  'external',
  'social',
  'email',
];

function labelFor(kind: LinkKind, label: string): string {
  switch (kind) {
    case 'primary':
      return `Open ${label}`;
    case 'demo':
      return 'Try the demo';
    case 'repository':
      return 'View the source';
    case 'writeup':
      return 'Read the write-up';
    case 'external':
      return `Visit ${label}`;
    case 'social':
      return `View on ${label}`;
    case 'email':
      return 'Send an email';
  }
}

/** The one action worth putting first, or `null` when the item has no usable URL. */
export function callToAction(item: SectionItem): CallToAction | null {
  if (item.type === 'link') {
    if (item.href === undefined) {
      return null;
    }
    const target = classifyHref(item.href);
    return target === null ? null : { label: `Visit ${item.domain}`, ...target };
  }

  if (item.type === 'article' && item.post.url !== undefined) {
    const target = classifyHref(item.post.url);
    if (target !== null) {
      const where = item.post.platform === undefined ? 'the original' : `on ${item.post.platform}`;
      return { label: `Read ${where}`, ...target };
    }
  }

  for (const kind of LINK_PRIORITY) {
    for (const link of item.links) {
      if (link.kind !== kind) {
        continue;
      }
      const target = classifyHref(link.href);
      if (target !== null) {
        return { label: labelFor(kind, link.label), ...target };
      }
    }
  }

  return null;
}
