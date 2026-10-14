import type { ItemId, SectionId } from '@/lib/types';

import type {
  NavigationAction,
  NavigationLocation,
  NavigationModel,
  NavigationSection,
  NavigationState,
  Travel,
} from './types';

/* Pure navigation engine: no React, no content, no DOM. */

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return ((index % length) + length) % length;
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), length - 1);
}

function lastIndex(length: number): number {
  return Math.max(0, length - 1);
}

export function sectionAt(model: NavigationModel, index: number): NavigationSection | null {
  if (model.sections.length === 0) {
    return null;
  }
  return model.sections[wrapIndex(index, model.sections.length)] ?? null;
}

export function itemCountAt(model: NavigationModel, sectionIndex: number): number {
  return sectionAt(model, sectionIndex)?.itemIds.length ?? 0;
}

export function selectedSection(
  model: NavigationModel,
  state: NavigationLocation,
): NavigationSection | null {
  return sectionAt(model, state.sectionIndex);
}

/** `null` for an empty section, where `itemIndex` is meaningless. */
export function selectedItemId(model: NavigationModel, state: NavigationLocation): ItemId | null {
  const section = selectedSection(model, state);
  if (section === null) {
    return null;
  }
  return section.itemIds[clampIndex(state.itemIndex, section.itemIds.length)] ?? null;
}

export function selectedSectionId(
  model: NavigationModel,
  state: NavigationState,
): SectionId | null {
  return selectedSection(model, state)?.id ?? null;
}

export function createInitialState(): NavigationState {
  return { mode: 'gallery', sectionIndex: 0, itemIndex: 0, helpOpen: false, travel: null };
}

/** Actions that stay live while the modal help is open. */
const HELP_ACTIONS: ReadonlySet<NavigationAction['type']> = new Set([
  'toggleHelp',
  'closeHelp',
  'back',
  'restore',
]);

/** Sections wrap, items clamp; changing section keeps your row when it fits. */
export function reduce(
  model: NavigationModel,
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  if (state.helpOpen && !HELP_ACTIONS.has(action.type)) {
    return state;
  }

  switch (action.type) {
    case 'nextSection':
      return moveSection(model, state, 1);

    case 'previousSection':
      return moveSection(model, state, -1);

    case 'nextItem':
      return moveItem(model, state, 1);

    case 'previousItem':
      return moveItem(model, state, -1);

    case 'firstSection':
      return place(state, 0, 0);

    case 'lastSection':
      return place(state, lastIndex(model.sections.length), 0);

    case 'openSelected':
      return selectedItemId(model, state) === null
        ? state
        : { ...state, mode: 'detail', travel: null };

    case 'closeDetail':
      return state.mode === 'gallery' ? state : { ...state, mode: 'gallery', travel: null };

    case 'back':
      if (state.helpOpen) {
        return { ...state, helpOpen: false };
      }
      return state.mode === 'gallery' ? state : { ...state, mode: 'gallery', travel: null };

    case 'toggleHelp':
      return { ...state, helpOpen: !state.helpOpen };

    case 'closeHelp':
      return state.helpOpen ? { ...state, helpOpen: false } : state;

    case 'focusSection': {
      const target = clampIndex(action.index, model.sections.length);
      // A pointer can say which way it visually moved; that only applies to a real section change.
      const intended: Travel | undefined =
        action.direction === undefined || target === state.sectionIndex
          ? undefined
          : { axis: 'section', sign: action.direction };
      return place(state, target, 0, intended);
    }

    case 'focusItem':
      return place(
        state,
        state.sectionIndex,
        clampIndex(action.index, itemCountAt(model, state.sectionIndex)),
      );

    case 'restore':
      return restore(model, state, action.location);
  }
}

function restore(
  model: NavigationModel,
  state: NavigationState,
  location: NavigationLocation,
): NavigationState {
  const sectionIndex = clampIndex(location.sectionIndex, model.sections.length);
  const count = itemCountAt(model, sectionIndex);
  const itemIndex = clampIndex(location.itemIndex, count);
  const mode = location.mode === 'detail' && count > 0 ? 'detail' : 'gallery';

  if (
    !state.helpOpen &&
    state.mode === mode &&
    state.sectionIndex === sectionIndex &&
    state.itemIndex === itemIndex
  ) {
    return state;
  }
  return { mode, sectionIndex, itemIndex, helpOpen: false, travel: null };
}

/**
 * Moves the selection. Returns the same object when nothing changes, so React
 * can skip the render and the previous travel is left alone.
 *
 * Moves with an intended direction (the arrow keys) pass it; jumps are directed
 * by where they land.
 */
function place(
  state: NavigationState,
  sectionIndex: number,
  itemIndex: number,
  intended?: Travel,
): NavigationState {
  if (state.sectionIndex === sectionIndex && state.itemIndex === itemIndex) {
    return state;
  }

  const next = { ...state, sectionIndex, itemIndex };
  return { ...next, travel: intended ?? travelBetween(state, next) };
}

function travelBetween(from: NavigationState, to: NavigationState): Travel | null {
  if (from.sectionIndex !== to.sectionIndex) {
    return { axis: 'section', sign: to.sectionIndex > from.sectionIndex ? 1 : -1 };
  }
  if (from.itemIndex !== to.itemIndex) {
    return { axis: 'item', sign: to.itemIndex > from.itemIndex ? 1 : -1 };
  }
  return null;
}

function moveSection(
  model: NavigationModel,
  state: NavigationState,
  delta: 1 | -1,
): NavigationState {
  if (model.sections.length === 0) {
    return state;
  }

  const sectionIndex = wrapIndex(state.sectionIndex + delta, model.sections.length);
  return place(state, sectionIndex, clampIndex(state.itemIndex, itemCountAt(model, sectionIndex)), {
    axis: 'section',
    sign: delta,
  });
}

function moveItem(
  model: NavigationModel,
  state: NavigationState,
  delta: 1 | -1,
): NavigationState {
  const count = itemCountAt(model, state.sectionIndex);
  return place(state, state.sectionIndex, clampIndex(state.itemIndex + delta, count), {
    axis: 'item',
    sign: delta,
  });
}

const KEY_ACTIONS: Readonly<Record<string, NavigationAction>> = {
  ArrowLeft: { type: 'previousSection' },
  ArrowRight: { type: 'nextSection' },
  ArrowUp: { type: 'previousItem' },
  ArrowDown: { type: 'nextItem' },
  Home: { type: 'firstSection' },
  End: { type: 'lastSection' },
  Enter: { type: 'openSelected' },
  Escape: { type: 'back' },
  '?': { type: 'toggleHelp' },
};

export function keyToAction(key: string): NavigationAction | null {
  return KEY_ACTIONS[key] ?? null;
}

/** Holding these down must not flicker the dialog or re-open an item. */
export function ignoresKeyRepeat(action: NavigationAction): boolean {
  return action.type === 'openSelected' || action.type === 'toggleHelp' || action.type === 'back';
}

const SCROLL_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/** Only keys whose browser default is scrolling are cancelled; Enter and Escape keep theirs. */
export function preventsPageScroll(key: string): boolean {
  return SCROLL_KEYS.has(key);
}

/** The slice of `KeyboardEvent` the guard reads, so tests can pass a plain object. */
export interface KeyEventLike {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly target: unknown;
}

/**
 * Leaves alone: modifier combos, text fields, Enter on natively activatable
 * elements, and everything except the help keys while the modal help is open.
 */
export function shouldHandleKey(event: KeyEventLike, helpOpen = false): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  const action = keyToAction(event.key);
  if (action === null) {
    return false;
  }
  if (helpOpen && !HELP_ACTIONS.has(action.type)) {
    return false;
  }
  if (isTextEntryTarget(event.target)) {
    return false;
  }
  if (action.type === 'openSelected' && isNativeActivationTarget(event.target)) {
    return false;
  }

  return true;
}

function tagOf(target: unknown): string | null {
  if (typeof target !== 'object' || target === null || !('tagName' in target)) {
    return null;
  }
  const { tagName } = target;
  return typeof tagName === 'string' ? tagName.toLowerCase() : null;
}

function isTextEntryTarget(target: unknown): boolean {
  if (
    typeof target === 'object' &&
    target !== null &&
    'isContentEditable' in target &&
    target.isContentEditable === true
  ) {
    return true;
  }

  const tag = tagOf(target);
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function isNativeActivationTarget(target: unknown): boolean {
  const tag = tagOf(target);
  return tag === 'button' || tag === 'a' || tag === 'summary';
}
