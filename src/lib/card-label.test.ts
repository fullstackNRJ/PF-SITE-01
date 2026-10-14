import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cardLabel } from './card-label.ts';
import type { SectionItem } from './types.ts';
import { CARD_TYPES } from './vocabularies.ts';

const base = { order: 0, tags: [], featured: false, links: [] } as const;

const fixtures: readonly SectionItem[] = [
  {
    ...base,
    id: 'p',
    type: 'project',
    projectId: 'p',
    html: '',
    title: 'Alpha',
    summary: '',
    status: 'shipped',
    stack: [],
    highlights: [],
  },
  {
    ...base,
    id: 'e',
    type: 'experience',
    experienceId: 'e',
    html: '',
    title: 'ignored',
    summary: '',
    company: 'Acme',
    role: 'Engineer',
    timeframe: { start: '2022-03' },
    employment: 'full-time',
    highlights: [],
  },
  {
    ...base,
    id: 'a',
    type: 'article',
    title: 'Notes',
    summary: '',
    post: {
      id: 'notes',
      title: 'Notes',
      description: '',
      published: '2025-06-02',
      tags: [],
      draft: false,
      readingTimeMinutes: 4,
    },
  },
  {
    ...base,
    id: 'pr',
    type: 'profile',
    title: 'Ada',
    summary: '',
    headline: 'Engineer',
    skills: [],
  },
  {
    ...base,
    id: 'l',
    type: 'link',
    title: 'Docs',
    summary: '',
    href: 'https://example.com/docs',
    domain: 'example.com',
  },
  {
    ...base,
    id: 's',
    type: 'stack',
    title: 'ignored',
    summary: '',
    name: 'TypeScript',
    category: 'language',
    proficiency: 'expert',
  },
];

function fixture(type: SectionItem['type']): SectionItem {
  const found = fixtures.find((item) => item.type === type);
  assert.notEqual(found, undefined, `no fixture for ${type}`);
  return found as SectionItem;
}

describe('cardLabel', () => {
  it('has a fixture for every card type, so no type goes untested', () => {
    assert.deepEqual(new Set(fixtures.map((item) => item.type)), new Set(CARD_TYPES));
  });

  it('describes each type in words', () => {
    assert.equal(cardLabel(fixture('project')), 'Alpha, project, shipped');
    assert.equal(cardLabel(fixture('experience')), 'Engineer at Acme, experience, Mar 2022 — present');
    assert.equal(
      cardLabel(fixture('article')),
      'Notes, article, published 2 Jun 2025, 4 minute read',
    );
    assert.equal(cardLabel(fixture('profile')), 'Ada, profile, Engineer');
  });

  it('names the platform an article is also published on', () => {
    const article = fixture('article');
    assert.equal(article.type, 'article');
    const onHashnode = {
      ...article,
      post: { ...(article as Extract<SectionItem, { type: 'article' }>).post, platform: 'Hashnode' },
    } as SectionItem;
    assert.equal(
      cardLabel(onHashnode),
      'Notes, article, published 2 Jun 2025, 4 minute read, on Hashnode',
    );
  });

  it('describes the remaining types', () => {
    assert.equal(cardLabel(fixture('link')), 'Docs, link to example.com');
    assert.equal(cardLabel(fixture('stack')), 'TypeScript, stack, language, expert');
  });

  it('leaves out optional parts that are absent', () => {
    const noStatus = { ...fixture('project'), status: undefined } as SectionItem;
    assert.equal(cardLabel(noStatus), 'Alpha, project');
  });

  it('appends a one-based position when given', () => {
    assert.equal(
      cardLabel(fixture('link'), { index: 1, total: 6 }),
      'Docs, link to example.com, 2 of 6',
    );
  });

  it('never returns an empty label', () => {
    for (const item of fixtures) {
      assert.notEqual(cardLabel(item).trim(), '', item.type);
    }
  });
});
