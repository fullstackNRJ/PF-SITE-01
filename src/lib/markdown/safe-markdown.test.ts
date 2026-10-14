import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { markdownToHtml } from 'satteri';

import { createSafeMarkdownPlugin, slugifyHeading } from './safe-markdown.ts';

/** Runs Markdown through the real Sätteri pipeline with the policy applied. */
async function render(markdown: string): Promise<string> {
  const result = await markdownToHtml(markdown, {
    hastPlugins: [() => createSafeMarkdownPlugin()],
  });
  return result.html;
}

describe('slugifyHeading', () => {
  it('lowercases, hyphenates and strips accents', async () => {
    assert.equal(slugifyHeading('Why  this works!'), 'why-this-works');
    assert.equal(slugifyHeading('Crème brûlée'), 'creme-brulee');
  });

  it('never returns an empty slug', async () => {
    assert.equal(slugifyHeading('***'), 'section');
  });
});

describe('safe markdown policy', () => {
  it('demotes headings so a post cannot add a page-level h1 or h2', async () => {
    const html = await render('# One\n\n## Two\n\n### Three\n\n#### Four');
    assert.doesNotMatch(html, /<h1|<h2/u);
    assert.match(html, /<h3 id="post-one">One<\/h3>/u);
    assert.match(html, /<h3 id="post-two">Two<\/h3>/u);
    assert.match(html, /<h4 id="post-three">Three<\/h4>/u);
    assert.match(html, /<h5 id="post-four">Four<\/h5>/u);
  });

  it('prefixes and de-duplicates heading ids', async () => {
    const html = await render('## Same\n\n## Same\n\n## Same');
    assert.match(html, /id="post-same"/u);
    assert.match(html, /id="post-same-1"/u);
    assert.match(html, /id="post-same-2"/u);
  });

  it('opens external links in a new tab, safely, and says so', async () => {
    const html = await render('[docs](https://example.com/a)');
    assert.match(html, /href="https:\/\/example\.com\/a"/u);
    assert.match(html, /target="_blank"/u);
    assert.match(html, /rel="noopener noreferrer"/u);
    assert.match(html, /\(opens in a new tab\)/u);
  });

  it('leaves same-site and mailto links in place', async () => {
    const html = await render('[a](/about) and [b](mailto:hi@example.com)');
    assert.match(html, /href="\/about"/u);
    assert.match(html, /href="mailto:hi@example\.com"/u);
    assert.doesNotMatch(html, /target=/u);
  });

  it('strips the destination from a link with an unsafe scheme', async () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x']) {
      const html = await render(`[click](${href})`);
      assert.doesNotMatch(html, /href=/u, href);
      assert.match(html, /click/u, href);
    }
  });

  it('drops raw html instead of passing it through', async () => {
    const html = await render(
      'Before\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\nAfter <b onclick="x()">inline</b>',
    );
    assert.doesNotMatch(html, /<script|onerror|onclick|<img|<b /u);
    assert.match(html, /Before/u);
    assert.match(html, /After/u);
  });

  it('lazy-loads images from public paths and urls', async () => {
    const html = await render('![chart](/media/a.svg)\n\n![remote](https://example.com/a.png)');
    assert.equal((html.match(/loading="lazy"/gu) ?? []).length, 2);
    assert.match(html, /decoding="async"/u);
    assert.match(html, /alt="chart"/u);
  });

  it('refuses a relative image path loudly, since it would silently 404', async () => {
    await assert.rejects(render('![x](pictures/a.png)'), /absolute paths into public/u);
  });

  it('refuses scripted image sources', async () => {
    await assert.rejects(render('![x](javascript:alert(1))'), /Unsupported image source/u);
  });

  it('keeps the structures posts rely on', async () => {
    const html = await render(
      '- a\n- b\n\n1. one\n2. two\n\n> quoted\n\n`inline`\n\n```ts\nconst x = 1;\n```',
    );
    assert.match(html, /<ul>/u);
    assert.match(html, /<ol>/u);
    assert.match(html, /<blockquote>/u);
    assert.match(html, /<code>inline<\/code>/u);
    assert.match(html, /<pre><code class="language-ts">/u);
  });
});
