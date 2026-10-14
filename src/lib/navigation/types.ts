import type { ItemId, SectionId } from '@/lib/types';

/**
 * Navigation model and state.
 *
 * The hierarchy is two levels and deliberately linear:
 *
 *     Portfolio
 *       └── Sections     ordered
 *             └── Items  ordered, within their section
 *
 * Section order comes from `nav.order`; item order from each item's `order`.
 * Nothing here knows about the 2D coordinates stored in content — directional
 * movement is defined by the keyboard contract, not by geometry.
 */

/** Browsing the gallery, or focused on a single item. */
export type NavigationMode = 'gallery' | 'detail';

/** One section as the navigator sees it: an id, a label, and ordered item ids. */
export interface NavigationSection {
  readonly id: SectionId;
  /** Short label for the rail (`nav.label`). */
  readonly label: string;
  readonly title: string;
  readonly itemIds: readonly ItemId[];
}

/**
 * The navigator's view of the content.
 *
 * Plain data with no content, Astro or DOM dependency, so pure functions — and
 * tests — can build one by hand without a site.
 */
export interface NavigationModel {
  readonly sections: readonly NavigationSection[];
}

/** Where you are, without how you got there: what the URL encodes. */
export interface NavigationLocation {
  readonly mode: NavigationMode;
  /** Index into `NavigationModel.sections`. */
  readonly sectionIndex: number;
  /** Index into the selected section's `itemIds`. */
  readonly itemIndex: number;
}

/**
 * The full navigation state.
 *
 * Both indexes are always valid for the current model:
 * `sectionIndex` is clamped to the sections that exist, and `itemIndex` is
 * clamped to the selected section's items. An empty section keeps `itemIndex`
 * at 0, so `selectedItemId` — not the index — is the authoritative answer to
 * "is anything selected?".
 */
export interface NavigationState extends NavigationLocation {
  /** The shortcut help is open; it is modal, so navigation is suspended. */
  readonly helpOpen: boolean;
  /** Which way the last selection change moved; `null` before any move and after opening or closing an item. */
  readonly travel: Travel | null;
}

/**
 * The direction of a selection change, as the user meant it.
 *
 * Section moves are horizontal and item moves vertical; `sign` is `1` toward the
 * end (right or down) and `-1` toward the start. It follows the key rather than
 * the index delta, so wrapping from the last section to the first is still
 * forward. Navigation only reports this; what to do with it is not its concern.
 */
export interface Travel {
  readonly axis: 'section' | 'item';
  readonly sign: 1 | -1;
}

/**
 * Every transition the engine understands, named for intent rather than for the
 * key that happens to trigger it. The key mapping lives in `engine.ts`.
 */
export type NavigationAction =
  | { readonly type: 'nextSection' }
  | { readonly type: 'previousSection' }
  | { readonly type: 'nextItem' }
  | { readonly type: 'previousItem' }
  | { readonly type: 'firstSection' }
  | { readonly type: 'lastSection' }
  | { readonly type: 'openSelected' }
  | { readonly type: 'closeDetail' }
  /** Escape: close help first, otherwise leave detail mode. */
  | { readonly type: 'back' }
  | { readonly type: 'toggleHelp' }
  | { readonly type: 'closeHelp' }
  | { readonly type: 'focusSection'; readonly index: number; readonly direction?: 1 | -1 }
  | { readonly type: 'focusItem'; readonly index: number }
  /** Jump straight to a location (URL load, back/forward): no travel, closes help. */
  | { readonly type: 'restore'; readonly location: NavigationLocation };
