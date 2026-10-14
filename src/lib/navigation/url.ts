import { selectedItemId, selectedSection } from './engine.ts';
import type { NavigationLocation, NavigationModel } from './types.ts';

/**
 * Hash <-> navigation location. Pure: no DOM, no history.
 *
 *   #<section>          the section, browsing (item selection is not shared)
 *   #<section>/<item>   that item, open in detail mode
 */

export interface HashTarget {
  readonly sectionId: string;
  readonly itemId: string | null;
}

/** Where the site starts, and where anything unrecognised lands. */
export const ENTRY_LOCATION: NavigationLocation = { mode: 'gallery', sectionIndex: 0, itemIndex: 0 };

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

/** `null` for an empty or malformed hash. */
export function parseHash(hash: string): HashTarget | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') {
    return null;
  }

  const slash = raw.indexOf('/');
  const sectionId = decode(slash === -1 ? raw : raw.slice(0, slash));
  if (sectionId === null || sectionId === '') {
    return null;
  }
  if (slash === -1) {
    return { sectionId, itemId: null };
  }

  const itemId = decode(raw.slice(slash + 1));
  // A malformed item still names a valid section; drop just the item.
  return { sectionId, itemId: itemId === '' ? null : itemId };
}

export function formatHash(sectionId: string, itemId: string | null = null): string {
  const section = `#${encodeURIComponent(sectionId)}`;
  return itemId === null ? section : `${section}/${encodeURIComponent(itemId)}`;
}

/** Unknown section -> entry; unknown item -> its section, browsing. */
export function resolveHash(model: NavigationModel, hash: string): NavigationLocation {
  const target = parseHash(hash);
  if (target === null) {
    return ENTRY_LOCATION;
  }

  const sectionIndex = model.sections.findIndex((section) => section.id === target.sectionId);
  if (sectionIndex === -1) {
    return ENTRY_LOCATION;
  }
  if (target.itemId === null) {
    return { mode: 'gallery', sectionIndex, itemIndex: 0 };
  }

  const itemIndex = model.sections[sectionIndex]?.itemIds.indexOf(target.itemId) ?? -1;
  return itemIndex === -1
    ? { mode: 'gallery', sectionIndex, itemIndex: 0 }
    : { mode: 'detail', sectionIndex, itemIndex };
}

/** The canonical hash for a location; `''` when there is nothing to point at. */
export function hashFor(model: NavigationModel, location: NavigationLocation): string {
  const section = selectedSection(model, location);
  if (section === null) {
    return '';
  }
  return formatHash(section.id, location.mode === 'detail' ? selectedItemId(model, location) : null);
}
