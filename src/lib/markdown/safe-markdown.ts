import { defineHastPlugin } from 'satteri';
import type { HastPluginDefinition } from 'satteri';

import { classifyHref, isSafeImageSrc } from '../links.ts';

/**
 * A Markdown HTML policy.
 *
 * Post bodies become HTML at build time and are injected into the page, so this
 * plugin is the trust boundary: whatever it lets through is what a reader's
 * browser will run. It is deliberately a small allow-by-construction pass rather
 * than a general sanitiser, because the content is the author's own and the only
 * goals are to keep it from breaking out of its panel and to keep it honest.
 *
 *   raw HTML     dropped. Markdown syntax is the only supported markup.
 *   headings     demoted so a post never adds a second `h1`/`h2` to the page,
 *                and given a `post-` id so they cannot collide with the app's.
 *   links        http(s), mailto and same-site paths only; external ones open
 *                in a new tab, safely, and say so to screen readers.
 *   images       http(s) or absolute `/…` paths only, lazy-loaded, never a
 *                relative path (those would silently 404 after the build).
 */

/** The page's own `h1` is the site title and the detail view owns `h2`/`h3`. */
const HEADING_DEMOTION: Readonly<Record<string, string>> = {
  h1: 'h3',
  h2: 'h3',
  h3: 'h4',
  h4: 'h5',
  h5: 'h6',
  h6: 'h6',
};

const HEADING_ID_PREFIX = 'post-';
const NEW_TAB_NOTICE = ' (opens in a new tab)';

/** `Why this works` -> `why-this-works`. Falls back to `section` when nothing survives. */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return slug === '' ? 'section' : slug;
}

/** Thrown from the plugin so a bad post fails the build instead of rendering half a page. */
export class MarkdownPolicyError extends Error {
  override readonly name = 'MarkdownPolicyError';
}

/** Creates a fresh plugin per document, so heading ids are de-duplicated per post. */
export function createSafeMarkdownPlugin(): HastPluginDefinition {
  const seenIds = new Map<string, number>();

  function uniqueId(text: string): string {
    const base = `${HEADING_ID_PREFIX}${slugifyHeading(text)}`;
    const count = seenIds.get(base) ?? 0;
    seenIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${String(count)}`;
  }

  return defineHastPlugin({
    name: 'safe-markdown',

    raw(node, ctx) {
      ctx.removeNode(node);
    },

    element: [
      {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        visit(node, ctx) {
          const tagName = HEADING_DEMOTION[node.tagName] ?? 'h6';
          ctx.replaceNode(node, {
            ...node,
            tagName,
            properties: { ...node.properties, id: uniqueId(ctx.textContent(node)) },
          });
        },
      },
      {
        filter: ['a'],
        visit(node, ctx) {
          const href = node.properties?.href;
          const target = typeof href === 'string' ? classifyHref(href) : null;

          if (target === null) {
            // An unsafe or missing destination keeps its text and loses the link.
            ctx.setProperty(node, 'href', null);
            return;
          }

          ctx.setProperty(node, 'href', target.href);
          if (target.kind !== 'external') {
            return;
          }

          ctx.setProperty(node, 'target', '_blank');
          ctx.setProperty(node, 'rel', ['noopener', 'noreferrer']);
          ctx.appendChild(node, {
            type: 'element',
            tagName: 'span',
            properties: { className: ['sr-only'] },
            children: [{ type: 'text', value: NEW_TAB_NOTICE }],
          });
        },
      },
      {
        filter: ['img'],
        visit(node, ctx) {
          const src = node.properties?.src;
          if (typeof src !== 'string' || !isSafeImageSrc(src)) {
            throw new MarkdownPolicyError(
              `Unsupported image source ${JSON.stringify(src)}. ` +
                'Images must be http(s) URLs or absolute paths into public/, e.g. /media/diagram.svg.',
            );
          }

          ctx.setProperty(node, 'loading', 'lazy');
          ctx.setProperty(node, 'decoding', 'async');
        },
      },
    ],
  });
}
