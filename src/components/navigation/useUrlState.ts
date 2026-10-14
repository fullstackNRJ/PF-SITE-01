import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Dispatch, RefObject } from 'react';

import type { NavigationAction, NavigationModel, NavigationState } from '@/lib/navigation/types';
import { hashFor, resolveHash } from '@/lib/navigation/url';

/**
 * Keeps the URL hash and navigation state in step.
 *
 * History policy: a new section or a mode change (open/close an item) pushes;
 * anything else — another item while open, or any key auto-repeat — replaces.
 * Browsing items within a section never touches the URL (the hash names the
 * section only). Restoring from the URL never writes history, except to
 * replace a non-canonical hash.
 *
 * Returns a ref the keyboard handler sets for auto-repeat, so holding a key
 * cannot flood history.
 */
export function useUrlState(
  model: NavigationModel,
  state: NavigationState,
  dispatch: Dispatch<NavigationAction>,
): RefObject<boolean> {
  const replaceNext = useRef(false);
  /** The hash the current state already corresponds to. */
  const synced = useRef<string | null>(null);
  const previous = useRef<NavigationState | null>(null);

  // Hydration renders the entry section; the URL is applied before the next paint, with no travel.
  useLayoutEffect(() => {
    function restoreFromUrl() {
      const { hash } = window.location;
      const location = resolveHash(model, hash);
      const canonical = hashFor(model, location);
      if (hash !== '' && hash !== canonical) {
        const { pathname, search } = window.location;
        window.history.replaceState(window.history.state, '', canonical || pathname + search);
      }
      synced.current = canonical;
      dispatch({ type: 'restore', location });
    }

    restoreFromUrl();
    window.addEventListener('popstate', restoreFromUrl);
    return () => {
      window.removeEventListener('popstate', restoreFromUrl);
    };
  }, [model, dispatch]);

  // A held key that changed nothing (e.g. Down at the last item) must not leave the flag set.
  useEffect(() => {
    function release() {
      replaceNext.current = false;
    }
    window.addEventListener('keyup', release);
    return () => {
      window.removeEventListener('keyup', release);
    };
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    // The mount render is the server's entry state, not a user move.
    if (before === null) {
      return;
    }

    const next = hashFor(model, state);
    const replace = replaceNext.current;
    replaceNext.current = false;
    if (next === '' || next === synced.current) {
      return;
    }

    const meaningful = before.sectionIndex !== state.sectionIndex || before.mode !== state.mode;
    if (meaningful && !replace) {
      window.history.pushState(null, '', next);
    } else {
      window.history.replaceState(window.history.state, '', next);
    }
    synced.current = next;
  }, [model, state]);

  return replaceNext;
}
