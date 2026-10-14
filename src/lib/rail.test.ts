import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createInitialState, reduce } from './navigation/engine.ts';
import type { NavigationAction, NavigationModel, NavigationState } from './navigation/types.ts';
import {
  canonicalIndex,
  centerScroll,
  containsSpan,
  createRail,
  fitCount,
  followSelection,
  isNearest,
  lengthToPx,
  mergeSpans,
  mod,
  nearestOffset,
  resizeRail,
  ringSpan,
  settleScroll,
  spanPositions,
  virtualStep,
  visibleSpan,
} from './rail.ts';
import type { RailState } from './rail.ts';

function modelOf(count: number): NavigationModel {
  return {
    sections: Array.from({ length: count }, (_, index) => ({
      id: `s${String(index)}`,
      label: `S${String(index)}`,
      title: `S${String(index)}`,
      itemIds: ['a', 'b', 'c'],
    })),
  };
}

describe('positions and canonical indexes', () => {
  it('maps any integer position back to a section', () => {
    assert.equal(mod(-1, 5), 4);
    assert.equal(canonicalIndex(0, 5), 0);
    assert.equal(canonicalIndex(7, 5), 2);
    assert.equal(canonicalIndex(-1, 5), 4);
    assert.equal(canonicalIndex(-11, 5), 4);
  });

  it('survives an empty ring', () => {
    assert.equal(canonicalIndex(3, 0), 0);
    assert.equal(virtualStep(0, 0, 0, 1), 0);
    assert.equal(nearestOffset(3, 0), 3);
  });
});

describe('virtualStep', () => {
  it('moves one card for a key press, including across the wrap', () => {
    assert.equal(virtualStep(1, 2, 5, 1), 1);
    assert.equal(virtualStep(4, 0, 5, 1), 1); // ArrowRight on the last section
    assert.equal(virtualStep(0, 4, 5, -1), -1); // ArrowLeft on the first section
    assert.equal(virtualStep(2, 1, 5, -1), -1);
  });

  it('keeps the stated direction for jumps and clicks', () => {
    assert.equal(virtualStep(3, 0, 5, -1), -3); // Home
    assert.equal(virtualStep(0, 4, 5, 1), 4); // End
    assert.equal(virtualStep(0, 4, 5, -1), -1); // click on the card to the left
    assert.equal(virtualStep(0, 3, 5, 1), 3); // click on a card three to the right
  });

  it('does not move when the target is where we already are', () => {
    assert.equal(virtualStep(2, 2, 5, 1), 0);
  });

  it('always lands on the requested section', () => {
    for (const count of [1, 2, 3, 5, 8]) {
      for (let from = 0; from < count; from += 1) {
        for (let to = 0; to < count; to += 1) {
          for (const sign of [1, -1] as const) {
            const step = virtualStep(from, to, count, sign);
            assert.equal(canonicalIndex(from + step, count), to, `${String(count)}:${String(from)}->${String(to)}`);
            assert.ok(Math.abs(step) < Math.max(count, 1), 'never travels a full lap or more');
            assert.ok(step === 0 || Math.sign(step) === sign, 'moves the way it was told');
          }
        }
      }
    }
  });
});

describe('nearest repeat', () => {
  it('picks the closest repeat, with ties going forward', () => {
    assert.deepEqual([-2, -1, 0, 1, 2].map((d) => nearestOffset(d, 5)), [-2, -1, 0, 1, 2]);
    assert.equal(nearestOffset(3, 5), -2);
    assert.equal(nearestOffset(-3, 5), 2);
    assert.equal(nearestOffset(2, 4), 2);
    assert.equal(nearestOffset(-2, 4), 2);
    assert.equal(nearestOffset(5, 1), 0);
  });

  it('marks exactly one repeat of every section as the one to expose', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 9]) {
      for (const active of [-7, 0, 3]) {
        const positions = spanPositions({ lo: active - 20, hi: active + 20 });
        const nearest = positions.filter((p) => isNearest(p, active, count));
        const sections = nearest.map((p) => canonicalIndex(p, count));
        assert.equal(new Set(sections).size, sections.length, 'no section exposed twice');
        assert.equal(sections.length, count, 'every section exposed once');
        assert.ok(isNearest(active, active, count), 'the active card is always the exposed one');
      }
    }
  });
});

describe('spans', () => {
  it('the ring holds every section exactly once, around the active card', () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const span = ringSpan(10, count);
      const positions = spanPositions(span);
      assert.equal(positions.length, count);
      assert.equal(new Set(positions.map((p) => canonicalIndex(p, count))).size, count);
      assert.ok(positions.includes(10));
      assert.ok(positions.every((p) => isNearest(p, 10, count)));
    }
  });

  it('computes, merges and compares ranges', () => {
    assert.deepEqual(visibleSpan(3, 5, 1), { lo: 2, hi: 8 });
    assert.deepEqual(mergeSpans({ lo: 0, hi: 4 }, { lo: 3, hi: 9 }), { lo: 0, hi: 9 });
    assert.equal(containsSpan({ lo: 0, hi: 9 }, { lo: 2, hi: 5 }), true);
    assert.equal(containsSpan({ lo: 0, hi: 4 }, { lo: 2, hi: 5 }), false);
    assert.deepEqual(spanPositions({ lo: -1, hi: 1 }), [-1, 0, 1]);
  });
});

describe('settling the viewport', () => {
  it('centres the active card to start', () => {
    assert.equal(centerScroll(10, 5), 8);
    assert.equal(centerScroll(10, 4), 9);
    assert.equal(centerScroll(10, 1), 10);
  });

  it('leaves the viewport alone while the active card is away from the edges', () => {
    assert.equal(settleScroll(8, 10, 5), 8); // slot 2
    assert.equal(settleScroll(8, 9, 5), 8); // slot 1
    assert.equal(settleScroll(8, 11, 5), 8); // slot 3
  });

  it('repositions as the active card nears an edge, by the least needed', () => {
    assert.equal(settleScroll(8, 12, 5), 9); // slot 4 -> keep one card beyond
    assert.equal(settleScroll(8, 8, 5), 7); // slot 0
    assert.equal(settleScroll(8, 20, 5), 17); // a long jump lands on the edge of the zone
  });

  it('copes with a viewport that fits fewer than three cards', () => {
    assert.equal(settleScroll(5, 5, 1), 5);
    assert.equal(settleScroll(5, 7, 1), 7);
    assert.equal(settleScroll(5, 6, 2), 5);
    assert.equal(settleScroll(5, 7, 2), 6);
  });
});

describe('following the selection', () => {
  it('keeps going the same way across the wrap, so the rail never has to jump', () => {
    let rail = createRail(5, 0, 5);
    const actives: number[] = [rail.active];
    for (let step = 1; step <= 12; step += 1) {
      rail = followSelection(rail, step % 5, 1);
      actives.push(rail.active);
    }
    assert.deepEqual(actives, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(canonicalIndex(rail.active, 5), 2);
  });

  it('does nothing when the selection has not changed', () => {
    const rail = createRail(5, 2, 5);
    assert.equal(followSelection(rail, 2, 1), rail);
  });

  it('re-settles when the viewport is resized, and ignores a resize to the same size', () => {
    const rail = createRail(5, 0, 5);
    assert.equal(resizeRail(rail, 5), rail);
    const narrow = resizeRail(rail, 2);
    assert.ok(narrow.active - narrow.scroll >= 0 && narrow.active - narrow.scroll <= 1);
  });
});

/** Small deterministic generator, so a failure is reproducible. */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function randomAction(next: () => number, count: number): NavigationAction {
  const pick = Math.floor(next() * 10);
  const cardOffset = Math.floor(next() * 7) - 3;
  switch (pick) {
    case 0:
    case 1:
    case 2:
      return { type: 'nextSection' };
    case 3:
    case 4:
      return { type: 'previousSection' };
    case 5:
      return { type: 'nextItem' };
    case 6:
      return { type: 'previousItem' };
    case 7:
      return { type: next() < 0.5 ? 'firstSection' : 'lastSection' };
    default:
      // A click on a card `cardOffset` places away from the active one.
      return {
        type: 'focusSection',
        index: mod(cardOffset, count),
        direction: cardOffset < 0 ? -1 : 1,
      };
  }
}

describe('driven by the real navigation engine', () => {
  for (const [count, visible] of [
    [5, 5],
    [5, 3],
    [5, 6],
    [4, 4],
    [2, 5],
    [7, 1],
    [1, 5],
  ] as const) {
    it(`stays canonical, in view and continuous: ${String(count)} sections, ${String(visible)} visible`, () => {
      const model = modelOf(count);
      const next = lcg(count * 100 + visible);
      let nav: NavigationState = createInitialState();
      let rail: RailState = createRail(count, nav.sectionIndex, visible);

      for (let step = 0; step < 400; step += 1) {
        const before = rail;
        nav = reduce(model, nav, randomAction(next, count));
        const sign = nav.travel?.axis === 'section' ? nav.travel.sign : 1;
        rail = followSelection(rail, nav.sectionIndex, sign);

        assert.equal(canonicalIndex(rail.active, count), nav.sectionIndex, `canonical at step ${String(step)}`);

        const slot = rail.active - rail.scroll;
        assert.ok(slot >= 0 && slot <= visible - 1, `active card in view at step ${String(step)}`);

        const moved = rail.active - before.active;
        assert.ok(Math.abs(moved) < Math.max(count, 1), 'never a full lap or more');
        if (moved !== 0) {
          assert.equal(Math.sign(moved), sign, 'moves the way it was told');
          const scrolled = rail.scroll - before.scroll;
          assert.ok(Math.abs(scrolled) <= Math.abs(moved), 'the viewport never moves further than the card');
          assert.ok(scrolled === 0 || Math.sign(scrolled) === sign, 'the viewport follows in the same direction');
        }
      }
    });
  }

  it('single key presses move the viewport at most one card', () => {
    const model = modelOf(5);
    let nav: NavigationState = createInitialState();
    let rail: RailState = createRail(5, 0, 5);

    for (let step = 0; step < 60; step += 1) {
      const before = rail;
      nav = reduce(model, nav, { type: step % 9 < 6 ? 'nextSection' : 'previousSection' });
      rail = followSelection(rail, nav.sectionIndex, nav.travel?.axis === 'section' ? nav.travel.sign : 1);
      assert.ok(Math.abs(rail.scroll - before.scroll) <= 1);
      assert.equal(Math.abs(rail.active - before.active), 1);
    }
  });

  it('is deterministic: the same keys always produce the same rail', () => {
    const run = (): RailState => {
      const model = modelOf(5);
      const next = lcg(42);
      let nav: NavigationState = createInitialState();
      let rail: RailState = createRail(5, 0, 5);
      for (let step = 0; step < 200; step += 1) {
        nav = reduce(model, nav, randomAction(next, 5));
        rail = followSelection(rail, nav.sectionIndex, nav.travel?.axis === 'section' ? nav.travel.sign : 1);
      }
      return rail;
    };
    assert.deepEqual(run(), run());
  });
});

describe('measuring the rail variables', () => {
  it('reads rem and px lengths as computed custom properties', () => {
    assert.equal(lengthToPx('13rem', 16), 208);
    assert.equal(lengthToPx(' 0.75rem', 16), 12);
    assert.equal(lengthToPx('.5rem', 16), 8);
    assert.equal(lengthToPx('10px', 16), 10);
    assert.equal(lengthToPx('', 16), 0);
    assert.equal(lengthToPx('calc(1rem + 2px)', 16), 0);
  });

  it('counts whole cards, with the last gap free', () => {
    // Desktop: 13rem cards, 0.75rem gap, a 72rem-wide rail.
    assert.equal(fitCount(72 * 16, 13 * 16, 12), 5);
    // Mobile: 6.5rem cards, 0.5rem gap in 343px.
    assert.equal(fitCount(343, 104, 8), 3);
    assert.equal(fitCount(104, 104, 8), 1);
  });

  it('never reports fewer than one card', () => {
    assert.equal(fitCount(0, 104, 8), 1);
    assert.equal(fitCount(500, 0, 0), 1);
  });
});
