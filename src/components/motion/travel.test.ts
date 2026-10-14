import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createInitialState, reduce } from '../../lib/navigation/engine.ts';
import type { NavigationModel } from '../../lib/navigation/types.ts';

import { travelToken } from './travel.ts';

const model: NavigationModel = {
  sections: [
    { id: 'a', label: 'A', title: 'A', itemIds: ['a1', 'a2'] },
    { id: 'b', label: 'B', title: 'B', itemIds: ['b1', 'b2'] },
    { id: 'c', label: 'C', title: 'C', itemIds: ['c1'] },
  ],
};

/** The token a key produces, end to end from the engine. */
function tokenFor(key: 'nextSection' | 'previousSection' | 'nextItem' | 'previousItem', setup: readonly ('lastSection' | 'nextItem')[] = []) {
  let state = createInitialState();
  for (const type of setup) {
    state = reduce(model, state, { type });
  }
  const { travel } = reduce(model, state, { type: key });
  return travel === null ? null : travelToken(travel);
}

describe('travelToken', () => {
  it('maps each axis and direction to its own token', () => {
    assert.equal(travelToken({ axis: 'section', sign: 1 }), 'section-forward');
    assert.equal(travelToken({ axis: 'section', sign: -1 }), 'section-backward');
    assert.equal(travelToken({ axis: 'item', sign: 1 }), 'item-forward');
    assert.equal(travelToken({ axis: 'item', sign: -1 }), 'item-backward');
  });

  it('ArrowRight and ArrowLeft are opposite section directions', () => {
    assert.equal(tokenFor('nextSection'), 'section-forward');
    assert.equal(tokenFor('previousSection', ['lastSection']), 'section-backward');
  });

  it('ArrowDown and ArrowUp are opposite item directions', () => {
    assert.equal(tokenFor('nextItem'), 'item-forward');
    assert.equal(tokenFor('previousItem', ['nextItem']), 'item-backward');
  });

  it('keeps ArrowRight forward when it wraps from the last section to the first', () => {
    assert.equal(tokenFor('nextSection', ['lastSection']), 'section-forward');
  });

  it('keeps ArrowLeft backward when it wraps from the first section to the last', () => {
    assert.equal(tokenFor('previousSection'), 'section-backward');
  });
});
