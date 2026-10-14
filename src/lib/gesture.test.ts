import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SWIPE_THRESHOLDS, classifySwipe, swipeKey } from './gesture.ts';
import { keyToAction } from './navigation/engine.ts';

describe('classifySwipe', () => {
  it('reads a quick horizontal flick by its direction', () => {
    assert.equal(classifySwipe({ dx: -120, dy: 10, ms: 200 }), 'left');
    assert.equal(classifySwipe({ dx: 120, dy: -10, ms: 200 }), 'right');
  });

  it('ignores taps and short movements', () => {
    assert.equal(classifySwipe({ dx: 0, dy: 0, ms: 80 }), null);
    assert.equal(classifySwipe({ dx: SWIPE_THRESHOLDS.minDistance - 1, dy: 0, ms: 100 }), null);
    assert.equal(classifySwipe({ dx: SWIPE_THRESHOLDS.minDistance, dy: 0, ms: 100 }), 'right');
  });

  it('leaves vertical and diagonal movement to scrolling', () => {
    assert.equal(classifySwipe({ dx: 10, dy: 200, ms: 200 }), null);
    assert.equal(classifySwipe({ dx: -100, dy: 80, ms: 200 }), null);
    assert.equal(classifySwipe({ dx: -100, dy: 50, ms: 200 }), 'left');
  });

  it('ignores slow drags', () => {
    assert.equal(classifySwipe({ dx: -200, dy: 0, ms: SWIPE_THRESHOLDS.maxDuration + 1 }), null);
  });

  it('rejects non-finite input', () => {
    assert.equal(classifySwipe({ dx: Number.NaN, dy: 0, ms: 100 }), null);
  });
});

describe('swipeKey', () => {
  it('maps browsing swipes to the section arrows', () => {
    assert.equal(swipeKey('left', 'gallery'), 'ArrowRight');
    assert.equal(swipeKey('right', 'gallery'), 'ArrowLeft');
  });

  it('maps a right swipe in an item to Escape and ignores a left one', () => {
    assert.equal(swipeKey('right', 'detail'), 'Escape');
    assert.equal(swipeKey('left', 'detail'), null);
  });

  it('dispatches exactly what the keys dispatch', () => {
    assert.deepEqual(keyToAction(swipeKey('left', 'gallery') ?? ''), { type: 'nextSection' });
    assert.deepEqual(keyToAction(swipeKey('right', 'gallery') ?? ''), { type: 'previousSection' });
    assert.deepEqual(keyToAction(swipeKey('right', 'detail') ?? ''), { type: 'back' });
  });
});
