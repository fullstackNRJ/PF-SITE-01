import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampIndex,
  createInitialState,
  ignoresKeyRepeat,
  itemCountAt,
  keyToAction,
  preventsPageScroll,
  reduce,
  sectionAt,
  selectedItemId,
  selectedSectionId,
  shouldHandleKey,
  wrapIndex,
} from './engine.ts';
import type { KeyEventLike } from './engine.ts';
import { SHORTCUTS } from './shortcuts.ts';
import type { NavigationAction, NavigationModel, NavigationState } from './types.ts';

const model: NavigationModel = {
  sections: [
    { id: 'about', label: 'About', title: 'About', itemIds: ['a1', 'a2', 'a3'] },
    { id: 'work', label: 'Work', title: 'Work', itemIds: ['w1', 'w2'] },
    { id: 'products', label: 'Products', title: 'Products', itemIds: ['p1'] },
  ],
};

const emptyModel: NavigationModel = { sections: [] };

const modelWithEmptySection: NavigationModel = {
  sections: [
    { id: 'about', label: 'About', title: 'About', itemIds: ['a1'] },
    { id: 'empty', label: 'Empty', title: 'Empty', itemIds: [] },
  ],
};

function apply(
  state: NavigationState,
  ...actions: readonly NavigationAction[]
): NavigationState {
  return actions.reduce((current, action) => reduce(model, current, action), state);
}

function keyEvent(key: string, overrides: Partial<KeyEventLike> = {}): KeyEventLike {
  return { key, metaKey: false, ctrlKey: false, altKey: false, target: null, ...overrides };
}

describe('index helpers', () => {
  it('wraps forwards and backwards', () => {
    assert.equal(wrapIndex(3, 3), 0);
    assert.equal(wrapIndex(4, 3), 1);
    assert.equal(wrapIndex(-1, 3), 2);
    assert.equal(wrapIndex(-4, 3), 2);
  });

  it('clamps to the valid range', () => {
    assert.equal(clampIndex(-3, 3), 0);
    assert.equal(clampIndex(2, 3), 2);
    assert.equal(clampIndex(9, 3), 2);
  });

  it('degrades to 0 for an empty list', () => {
    assert.equal(wrapIndex(5, 0), 0);
    assert.equal(clampIndex(5, 0), 0);
  });
});

describe('section movement', () => {
  it('moves to the next and previous section', () => {
    assert.equal(apply(createInitialState(), { type: 'nextSection' }).sectionIndex, 1);
    assert.equal(
      apply(createInitialState(), { type: 'nextSection' }, { type: 'previousSection' })
        .sectionIndex,
      0,
    );
  });

  it('wraps at both ends', () => {
    assert.equal(apply(createInitialState(), { type: 'previousSection' }).sectionIndex, 2);
    assert.equal(
      apply(createInitialState(), { type: 'lastSection' }, { type: 'nextSection' }).sectionIndex,
      0,
    );
  });

  it('keeps the row when the new section is long enough', () => {
    const state = apply(createInitialState(), { type: 'focusItem', index: 1 }, { type: 'nextSection' });
    assert.equal(state.sectionIndex, 1);
    assert.equal(state.itemIndex, 1);
  });

  it('clamps the row when the new section is shorter', () => {
    const state = apply(createInitialState(), { type: 'focusItem', index: 2 }, { type: 'nextSection' });
    assert.equal(state.itemIndex, 1);
  });

  it('is a no-op on an empty model', () => {
    const state = createInitialState();
    assert.equal(reduce(emptyModel, state, { type: 'nextSection' }), state);
    assert.equal(reduce(emptyModel, state, { type: 'previousSection' }), state);
  });
});

describe('item movement', () => {
  it('moves within the current section', () => {
    const state = apply(createInitialState(), { type: 'nextItem' }, { type: 'nextItem' });
    assert.equal(state.sectionIndex, 0);
    assert.equal(state.itemIndex, 2);
  });

  it('clamps rather than wrapping', () => {
    assert.equal(apply(createInitialState(), { type: 'previousItem' }).itemIndex, 0);
    const atLast = apply(
      createInitialState(),
      { type: 'nextItem' },
      { type: 'nextItem' },
      { type: 'nextItem' },
    );
    assert.equal(atLast.itemIndex, 2);
  });

  it('returns the same state object when clamped, so React skips the render', () => {
    const state = createInitialState();
    assert.equal(reduce(model, state, { type: 'previousItem' }), state);
  });

  it('selects nothing in an empty section', () => {
    const state = reduce(
      modelWithEmptySection,
      { mode: 'gallery', sectionIndex: 1, itemIndex: 0, helpOpen: false, travel: null },
      { type: 'nextItem' },
    );
    assert.equal(state.itemIndex, 0);
    assert.equal(selectedItemId(modelWithEmptySection, state), null);
  });
});

describe('Home and End', () => {
  it('Home goes to the first section', () => {
    const state = apply(createInitialState(), { type: 'lastSection' }, { type: 'firstSection' });
    assert.equal(state.sectionIndex, 0);
    assert.equal(state.itemIndex, 0);
  });

  it('End goes to the last section', () => {
    assert.equal(apply(createInitialState(), { type: 'lastSection' }).sectionIndex, 2);
  });

  it('starts at the first item of the destination section', () => {
    const state = apply(createInitialState(), { type: 'focusItem', index: 2 }, { type: 'lastSection' });
    assert.equal(state.itemIndex, 0);
  });

  it('is a no-op when already there', () => {
    const state = createInitialState();
    assert.equal(reduce(model, state, { type: 'firstSection' }), state);
  });

  it('copes with an empty model', () => {
    const state = createInitialState();
    assert.equal(reduce(emptyModel, state, { type: 'lastSection' }), state);
  });
});

describe('detail mode', () => {
  it('opens the selected item', () => {
    assert.equal(apply(createInitialState(), { type: 'openSelected' }).mode, 'detail');
  });

  it('refuses to open an empty section', () => {
    const state: NavigationState = {
      mode: 'gallery',
      sectionIndex: 1,
      itemIndex: 0,
      helpOpen: false,
      travel: null,
    };
    assert.equal(reduce(modelWithEmptySection, state, { type: 'openSelected' }), state);
  });

  it('closeDetail returns to the gallery', () => {
    const state = apply(createInitialState(), { type: 'openSelected' }, { type: 'closeDetail' });
    assert.equal(state.mode, 'gallery');
  });

  it('back leaves detail mode and is a no-op in the gallery', () => {
    const detail = apply(createInitialState(), { type: 'openSelected' });
    assert.equal(reduce(model, detail, { type: 'back' }).mode, 'gallery');

    const gallery = createInitialState();
    assert.equal(reduce(model, gallery, { type: 'back' }), gallery);
  });

  it('keeps the mode while moving', () => {
    const state = apply(
      createInitialState(),
      { type: 'openSelected' },
      { type: 'nextSection' },
      { type: 'nextItem' },
    );
    assert.equal(state.mode, 'detail');
    assert.equal(state.sectionIndex, 1);
    assert.equal(state.itemIndex, 1);
  });
});

describe('keyboard help', () => {
  it('toggles open and closed', () => {
    const open = apply(createInitialState(), { type: 'toggleHelp' });
    assert.equal(open.helpOpen, true);
    assert.equal(reduce(model, open, { type: 'toggleHelp' }).helpOpen, false);
  });

  it('closeHelp is idempotent', () => {
    const state = createInitialState();
    assert.equal(reduce(model, state, { type: 'closeHelp' }), state);
  });

  it('suspends navigation while open', () => {
    const open = apply(createInitialState(), { type: 'toggleHelp' });
    const actions: readonly NavigationAction[] = [
      { type: 'nextSection' },
      { type: 'previousSection' },
      { type: 'nextItem' },
      { type: 'previousItem' },
      { type: 'firstSection' },
      { type: 'lastSection' },
      { type: 'openSelected' },
      { type: 'focusSection', index: 2 },
      { type: 'focusItem', index: 2 },
    ];
    for (const action of actions) {
      assert.equal(reduce(model, open, action), open, action.type);
    }
  });

  it('Escape closes help before it leaves detail mode', () => {
    const state = apply(createInitialState(), { type: 'openSelected' }, { type: 'toggleHelp' });
    const afterFirst = reduce(model, state, { type: 'back' });
    assert.equal(afterFirst.helpOpen, false);
    assert.equal(afterFirst.mode, 'detail');
    assert.equal(reduce(model, afterFirst, { type: 'back' }).mode, 'gallery');
  });
});

describe('travel direction', () => {
  const forwardSection = { axis: 'section', sign: 1 };
  const backwardSection = { axis: 'section', sign: -1 };
  const forwardItem = { axis: 'item', sign: 1 };
  const backwardItem = { axis: 'item', sign: -1 };

  it('starts without travel', () => {
    assert.equal(createInitialState().travel, null);
  });

  it('ArrowRight and ArrowLeft travel along sections', () => {
    assert.deepEqual(apply(createInitialState(), { type: 'nextSection' }).travel, forwardSection);
    const right = apply(createInitialState(), { type: 'nextSection' });
    assert.deepEqual(reduce(model, right, { type: 'previousSection' }).travel, backwardSection);
  });

  it('keeps the direction of the key when a section move wraps', () => {
    const atLast = apply(createInitialState(), { type: 'lastSection' });
    const wrappedForward = reduce(model, atLast, { type: 'nextSection' });
    assert.equal(wrappedForward.sectionIndex, 0);
    assert.deepEqual(wrappedForward.travel, forwardSection);

    const wrappedBackward = apply(createInitialState(), { type: 'previousSection' });
    assert.equal(wrappedBackward.sectionIndex, 2);
    assert.deepEqual(wrappedBackward.travel, backwardSection);
  });

  it('ArrowDown and ArrowUp travel along items', () => {
    const down = apply(createInitialState(), { type: 'nextItem' });
    assert.deepEqual(down.travel, forwardItem);
    assert.deepEqual(reduce(model, down, { type: 'previousItem' }).travel, backwardItem);
  });

  it('directs jumps by where they land', () => {
    assert.deepEqual(apply(createInitialState(), { type: 'lastSection' }).travel, forwardSection);

    const atLast = apply(createInitialState(), { type: 'lastSection' });
    assert.deepEqual(reduce(model, atLast, { type: 'firstSection' }).travel, backwardSection);
    assert.deepEqual(reduce(model, atLast, { type: 'focusSection', index: 1 }).travel, backwardSection);
  });

  it('lets a pointer selection state which way it visually moved', () => {
    const atLast = apply(createInitialState(), { type: 'lastSection' });

    // Canonical index 0 is higher-numbered than nothing, yet the card the user clicked sat to the right.
    const forward = reduce(model, atLast, { type: 'focusSection', index: 0, direction: 1 });
    assert.deepEqual(forward.travel, forwardSection);

    // The same section 0, clicked on a card that sat to the left.
    const backward = reduce(model, atLast, { type: 'focusSection', index: 0, direction: -1 });
    assert.deepEqual(backward.travel, backwardSection);
  });

  it('falls back to the landing direction when a pointer selection gives none', () => {
    const atLast = apply(createInitialState(), { type: 'lastSection' });
    assert.deepEqual(reduce(model, atLast, { type: 'focusSection', index: 0 }).travel, backwardSection);
  });

  it('ignores a stated direction when the section does not change', () => {
    const onSecondItem = apply(createInitialState(), { type: 'focusItem', index: 1 });
    const state = reduce(model, onSecondItem, { type: 'focusSection', index: 0, direction: 1 });
    assert.deepEqual(state.travel, backwardItem);
  });

  it('uses the item axis for a pointer selection within a section', () => {
    assert.deepEqual(
      apply(createInitialState(), { type: 'focusItem', index: 2 }).travel,
      forwardItem,
    );
  });

  it('keeps the previous travel when a move changes nothing', () => {
    const down = apply(createInitialState(), { type: 'nextItem' });
    const atEnd = apply(down, { type: 'nextItem' });
    assert.equal(reduce(model, atEnd, { type: 'nextItem' }), atEnd);
  });

  it('clears travel when an item is opened or closed, since that is not a spatial move', () => {
    const moved = apply(createInitialState(), { type: 'nextItem' });
    const opened = reduce(model, moved, { type: 'openSelected' });
    assert.equal(opened.travel, null);
    assert.equal(reduce(model, opened, { type: 'closeDetail' }).travel, null);
    assert.equal(reduce(model, opened, { type: 'back' }).travel, null);
  });

  it('does not disturb travel when the help opens or closes', () => {
    const moved = apply(createInitialState(), { type: 'nextSection' });
    const helped = reduce(model, moved, { type: 'toggleHelp' });
    assert.deepEqual(helped.travel, forwardSection);
    assert.deepEqual(reduce(model, helped, { type: 'closeHelp' }).travel, forwardSection);
  });
});

describe('direct focus', () => {
  it('clamps a section index and starts at its first item', () => {
    const state = apply(
      createInitialState(),
      { type: 'focusItem', index: 2 },
      { type: 'focusSection', index: 99 },
    );
    assert.equal(state.sectionIndex, 2);
    assert.equal(state.itemIndex, 0);
  });

  it('clamps an item index', () => {
    assert.equal(apply(createInitialState(), { type: 'focusItem', index: 99 }).itemIndex, 2);
    assert.equal(apply(createInitialState(), { type: 'focusItem', index: -5 }).itemIndex, 0);
  });
});

describe('restore', () => {
  it('jumps straight to a location without travel', () => {
    const state = apply(createInitialState(), {
      type: 'restore',
      location: { mode: 'detail', sectionIndex: 1, itemIndex: 1 },
    });
    assert.deepEqual(state, {
      mode: 'detail',
      sectionIndex: 1,
      itemIndex: 1,
      helpOpen: false,
      travel: null,
    });
  });

  it('clears travel left by an earlier move', () => {
    const moved = apply(createInitialState(), { type: 'nextSection' });
    const restored = apply(moved, {
      type: 'restore',
      location: { mode: 'gallery', sectionIndex: 0, itemIndex: 0 },
    });
    assert.equal(restored.travel, null);
    assert.equal(restored.sectionIndex, 0);
  });

  it('returns the same state when already there', () => {
    const state = createInitialState();
    assert.equal(
      reduce(model, state, {
        type: 'restore',
        location: { mode: 'gallery', sectionIndex: 0, itemIndex: 0 },
      }),
      state,
    );
  });

  it('clamps indexes and refuses detail for an empty section', () => {
    const clamped = apply(createInitialState(), {
      type: 'restore',
      location: { mode: 'detail', sectionIndex: 9, itemIndex: 9 },
    });
    assert.equal(clamped.sectionIndex, 2);
    assert.equal(clamped.itemIndex, 0);

    const empty = reduce(modelWithEmptySection, createInitialState(), {
      type: 'restore',
      location: { mode: 'detail', sectionIndex: 1, itemIndex: 0 },
    });
    assert.equal(empty.mode, 'gallery');
  });

  it('applies and closes help while help is open', () => {
    const open = apply(createInitialState(), { type: 'toggleHelp' });
    const restored = apply(open, {
      type: 'restore',
      location: { mode: 'gallery', sectionIndex: 1, itemIndex: 0 },
    });
    assert.equal(restored.helpOpen, false);
    assert.equal(restored.sectionIndex, 1);
  });
});

describe('keyboard mapping', () => {
  it('maps every documented key', () => {
    assert.deepEqual(keyToAction('ArrowLeft'), { type: 'previousSection' });
    assert.deepEqual(keyToAction('ArrowRight'), { type: 'nextSection' });
    assert.deepEqual(keyToAction('ArrowUp'), { type: 'previousItem' });
    assert.deepEqual(keyToAction('ArrowDown'), { type: 'nextItem' });
    assert.deepEqual(keyToAction('Home'), { type: 'firstSection' });
    assert.deepEqual(keyToAction('End'), { type: 'lastSection' });
    assert.deepEqual(keyToAction('Enter'), { type: 'openSelected' });
    assert.deepEqual(keyToAction('Escape'), { type: 'back' });
    assert.deepEqual(keyToAction('?'), { type: 'toggleHelp' });
  });

  it('ignores keys it does not own', () => {
    assert.equal(keyToAction('a'), null);
    assert.equal(keyToAction('Tab'), null);
  });

  it('every key advertised in the help is actually bound', () => {
    for (const shortcut of SHORTCUTS) {
      for (const label of shortcut.keys) {
        if (label.key !== null) {
          assert.notEqual(keyToAction(label.key), null, label.key);
        }
      }
    }
  });

  it('handles a plain arrow key', () => {
    assert.equal(shouldHandleKey(keyEvent('ArrowRight', { target: { tagName: 'DIV' } })), true);
  });

  it('leaves modifier combinations to the browser', () => {
    assert.equal(shouldHandleKey(keyEvent('ArrowLeft', { metaKey: true })), false);
    assert.equal(shouldHandleKey(keyEvent('ArrowUp', { ctrlKey: true })), false);
    assert.equal(shouldHandleKey(keyEvent('ArrowDown', { altKey: true })), false);
  });

  it('ignores unmapped keys', () => {
    assert.equal(shouldHandleKey(keyEvent('q')), false);
  });

  it('does not hijack typing in text fields', () => {
    assert.equal(shouldHandleKey(keyEvent('ArrowUp', { target: { tagName: 'INPUT' } })), false);
    assert.equal(shouldHandleKey(keyEvent('?', { target: { tagName: 'textarea' } })), false);
    assert.equal(
      shouldHandleKey(keyEvent('ArrowUp', { target: { isContentEditable: true } })),
      false,
    );
  });

  it('leaves Enter to elements the browser already activates', () => {
    assert.equal(shouldHandleKey(keyEvent('Enter', { target: { tagName: 'BUTTON' } })), false);
    assert.equal(shouldHandleKey(keyEvent('Enter', { target: { tagName: 'a' } })), false);
    assert.equal(shouldHandleKey(keyEvent('Enter', { target: { tagName: 'LI' } })), true);
  });

  it('only consumes the help keys while help is open', () => {
    assert.equal(shouldHandleKey(keyEvent('ArrowDown'), true), false);
    assert.equal(shouldHandleKey(keyEvent('Home'), true), false);
    assert.equal(shouldHandleKey(keyEvent('Enter'), true), false);
    assert.equal(shouldHandleKey(keyEvent('Escape'), true), true);
    assert.equal(shouldHandleKey(keyEvent('?'), true), true);
  });

  it('only cancels the default for keys that scroll the page', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      assert.equal(preventsPageScroll(key), true, key);
    }
    for (const key of ['Enter', 'Escape', '?']) {
      assert.equal(preventsPageScroll(key), false, key);
    }
  });

  it('ignores auto-repeat for one-shot actions only', () => {
    assert.equal(ignoresKeyRepeat({ type: 'openSelected' }), true);
    assert.equal(ignoresKeyRepeat({ type: 'toggleHelp' }), true);
    assert.equal(ignoresKeyRepeat({ type: 'back' }), true);
    assert.equal(ignoresKeyRepeat({ type: 'nextItem' }), false);
  });
});

describe('selectors', () => {
  it('resolves the selected section and item', () => {
    const state = apply(createInitialState(), { type: 'nextSection' }, { type: 'nextItem' });
    assert.equal(selectedSectionId(model, state), 'work');
    assert.equal(selectedItemId(model, state), 'w2');
  });

  it('returns null when there is nothing to select', () => {
    const state = createInitialState();
    assert.equal(selectedSectionId(emptyModel, state), null);
    assert.equal(selectedItemId(emptyModel, state), null);
    assert.equal(sectionAt(emptyModel, 0), null);
    assert.equal(itemCountAt(emptyModel, 0), 0);
  });

  it('reports the item count of each section', () => {
    assert.equal(itemCountAt(model, 0), 3);
    assert.equal(itemCountAt(model, 1), 2);
    assert.equal(itemCountAt(model, 2), 1);
  });
});
