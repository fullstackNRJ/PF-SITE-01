import { useSyncExternalStore } from 'react';

/** Below Tailwind's `md`: the single-column, touch-first layout. */
export const COMPACT_QUERY = '(width < 48rem)';

/**
 * Whether a media query matches. The server and the hydration pass render as
 * if it doesn't (the desktop default), then the real value takes over, so
 * markup never mismatches. Use it for behaviour; layout belongs in CSS.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
