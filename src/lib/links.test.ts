import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { callToAction, classifyHref } from './links.ts';
import type { ContentLink, SectionItem } from './types.ts';

const base = { order: 0, tags: [], featured: false } as const;

function project(links: readonly ContentLink[]): SectionItem {
  return {
    ...base,
    id: 'p',
    type: 'project',
    projectId: 'p',
    html: '',
    title: 'Alpha',
    summary: '',
    links,
    stack: [],
    highlights: [],
  };
}

describe('classifyHref', () => {
  it('treats http and https as external, whatever the case', () => {
    assert.deepEqual(classifyHref('https://example.com/a'), { kind: 'external', href: 'https://example.com/a' });
    assert.equal(classifyHref('http://example.com')?.kind, 'external');
    assert.equal(classifyHref('HTTPS://example.com')?.kind, 'external');
  });

  it('recognises mailto and same-site paths', () => {
    assert.equal(classifyHref('mailto:a@b.co')?.kind, 'mailto');
    assert.equal(classifyHref('/work')?.kind, 'internal');
    assert.equal(classifyHref('#section')?.kind, 'internal');
    assert.equal(classifyHref('notes/one')?.kind, 'internal');
  });

  it('refuses schemes that can run code or carry content', () => {
    for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,hi', 'vbscript:x', 'file:///etc/passwd']) {
      assert.equal(classifyHref(href), null, href);
    }
  });

  it('is not fooled by characters a URL parser ignores', () => {
    assert.equal(classifyHref('java\nscript:alert(1)'), null);
    assert.equal(classifyHref('java\tscript:alert(1)'), null);
    assert.equal(classifyHref(' \u0000javascript:alert(1)'), null);
  });

  it('refuses protocol-relative and empty hrefs', () => {
    assert.equal(classifyHref('//evil.example'), null);
    assert.equal(classifyHref(''), null);
    assert.equal(classifyHref('   '), null);
  });
});

describe('callToAction', () => {
  it('sends an article to its original publication, named by platform', () => {
    const article: SectionItem = {
      ...base,
      id: 'a',
      type: 'article',
      title: 'Notes',
      summary: '',
      links: [],
      post: {
        id: 'notes',
        title: 'Notes',
        description: '',
        published: '2025-06-02',
        tags: [],
        draft: false,
        readingTimeMinutes: 1,
        platform: 'Hashnode',
        url: 'https://example.hashnode.dev/notes',
      },
    };
    assert.deepEqual(callToAction(article), {
      label: 'Read on Hashnode',
      kind: 'external',
      href: 'https://example.hashnode.dev/notes',
    });
  });

  it('falls back to no action for an article with no usable url', () => {
    const article: SectionItem = {
      ...base,
      id: 'a',
      type: 'article',
      title: 'Notes',
      summary: '',
      links: [],
      post: {
        id: 'notes',
        title: 'Notes',
        description: '',
        published: '2025-06-02',
        tags: [],
        draft: false,
        readingTimeMinutes: 1,
        url: 'javascript:alert(1)',
      },
    };
    assert.equal(callToAction(article), null);
  });

  it('uses the href of a link item', () => {
    const item: SectionItem = {
      ...base,
      id: 'l',
      type: 'link',
      title: 'Docs',
      summary: '',
      links: [],
      href: 'https://example.com/docs',
      domain: 'example.com',
    };
    assert.deepEqual(callToAction(item), {
      label: 'Visit example.com',
      kind: 'external',
      href: 'https://example.com/docs',
    });
  });

  it('prefers a primary link, then a demo, then the source', () => {
    const source: ContentLink = { label: 'Source', href: 'https://example.com/src', kind: 'repository' };
    const demo: ContentLink = { label: 'Demo', href: 'https://example.com/demo', kind: 'demo' };
    const primary: ContentLink = { label: 'site.app', href: 'https://example.com', kind: 'primary' };

    assert.equal(callToAction(project([source, demo, primary]))?.label, 'Open site.app');
    assert.equal(callToAction(project([source, demo]))?.label, 'Try the demo');
    assert.equal(callToAction(project([source]))?.label, 'View the source');
  });

  it('words the action for the kind of link', () => {
    const only = (kind: ContentLink['kind'], label = 'Name'): string | undefined =>
      callToAction(project([{ label, href: 'https://example.com', kind }]))?.label;

    assert.equal(only('writeup'), 'Read the write-up');
    assert.equal(only('external', 'Docs'), 'Visit Docs');
    assert.equal(only('social', 'GitHub'), 'View on GitHub');
    assert.equal(only('email'), 'Send an email');
  });

  it('returns null when there is no URL', () => {
    assert.equal(callToAction(project([])), null);
  });

  it('skips an unsafe link and falls back to the next usable one', () => {
    const unsafe: ContentLink = { label: 'Bad', href: 'javascript:alert(1)', kind: 'primary' };
    const safe: ContentLink = { label: 'Source', href: 'https://example.com/src', kind: 'repository' };

    assert.equal(callToAction(project([unsafe, safe]))?.label, 'View the source');
    assert.equal(callToAction(project([unsafe])), null);
  });
});
