import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ENTRY_LOCATION, formatHash, hashFor, parseHash, resolveHash } from './url.ts';
import type { NavigationModel } from './types.ts';

const model: NavigationModel = {
  sections: [
    { id: 'about', label: 'About', title: 'About', itemIds: ['a1', 'a2'] },
    { id: 'work', label: 'Work', title: 'Work', itemIds: ['w1', 'w 2/x'] },
    { id: 'empty', label: 'Empty', title: 'Empty', itemIds: [] },
  ],
};

describe('parseHash', () => {
  it('reads a section and an optional item', () => {
    assert.deepEqual(parseHash('#work'), { sectionId: 'work', itemId: null });
    assert.deepEqual(parseHash('#work/w1'), { sectionId: 'work', itemId: 'w1' });
    assert.deepEqual(parseHash('work/w1'), { sectionId: 'work', itemId: 'w1' });
  });

  it('decodes percent-encoding', () => {
    assert.deepEqual(parseHash('#work/w%202%2Fx'), { sectionId: 'work', itemId: 'w 2/x' });
  });

  it('treats empty and malformed hashes as no target', () => {
    assert.equal(parseHash(''), null);
    assert.equal(parseHash('#'), null);
    assert.equal(parseHash('#/w1'), null);
    assert.equal(parseHash('#%E0%A4%A'), null);
  });

  it('keeps the section when only the item is malformed or empty', () => {
    assert.deepEqual(parseHash('#work/%E0%A4%A'), { sectionId: 'work', itemId: null });
    assert.deepEqual(parseHash('#work/'), { sectionId: 'work', itemId: null });
  });
});

describe('formatHash', () => {
  it('encodes ids', () => {
    assert.equal(formatHash('work'), '#work');
    assert.equal(formatHash('work', 'w 2/x'), '#work/w%202%2Fx');
  });

  it('round-trips through parseHash', () => {
    for (const [section, item] of [
      ['about', null],
      ['a b', 'c/d#e?f'],
      ['ü', '%'],
    ] as const) {
      assert.deepEqual(parseHash(formatHash(section, item)), { sectionId: section, itemId: item });
    }
  });
});

describe('resolveHash', () => {
  it('opens a known item in detail mode', () => {
    assert.deepEqual(resolveHash(model, '#work/w%202%2Fx'), {
      mode: 'detail',
      sectionIndex: 1,
      itemIndex: 1,
    });
  });

  it('browses a section from its first item', () => {
    assert.deepEqual(resolveHash(model, '#work'), { mode: 'gallery', sectionIndex: 1, itemIndex: 0 });
  });

  it('falls back to the section root for an unknown item', () => {
    assert.deepEqual(resolveHash(model, '#work/nope'), {
      mode: 'gallery',
      sectionIndex: 1,
      itemIndex: 0,
    });
  });

  it('falls back to the entry for an unknown section or empty hash', () => {
    assert.deepEqual(resolveHash(model, '#nope/w1'), ENTRY_LOCATION);
    assert.deepEqual(resolveHash(model, ''), ENTRY_LOCATION);
    assert.deepEqual(resolveHash({ sections: [] }, '#about'), ENTRY_LOCATION);
  });
});

describe('hashFor', () => {
  it('names only the section while browsing', () => {
    assert.equal(hashFor(model, { mode: 'gallery', sectionIndex: 1, itemIndex: 1 }), '#work');
  });

  it('names the open item in detail mode', () => {
    assert.equal(
      hashFor(model, { mode: 'detail', sectionIndex: 1, itemIndex: 1 }),
      '#work/w%202%2Fx',
    );
  });

  it('omits the item of an empty section and is empty with no sections', () => {
    assert.equal(hashFor(model, { mode: 'detail', sectionIndex: 2, itemIndex: 0 }), '#empty');
    assert.equal(hashFor({ sections: [] }, ENTRY_LOCATION), '');
  });

  it('is canonical: resolving its output gives the same hash back', () => {
    for (const hash of ['#about', '#about/a2', '#work/w%202%2Fx', '#empty']) {
      assert.equal(hashFor(model, resolveHash(model, hash)), hash);
    }
  });
});
