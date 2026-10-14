import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { createContentAccess } from '@/lib/content-access';
import type { ContentAccess } from '@/lib/content-access';
import type { ContentSnapshot } from '@/lib/types';

/**
 * React binding for the content layer.
 *
 * Hydrated islands cannot import `src/lib/content.ts` (it needs `astro:content`)
 * and cannot receive functions as props. So the snapshot travels as plain data
 * and the accessor is rebuilt here — giving components the same five methods the
 * build-time API exposes, without threading content through every layer of the
 * tree.
 *
 *   page        await getSection('work')          // src/lib/content.ts
 *   component   useContent().getSection('work')   // this file
 */

const ContentContext = createContext<ContentAccess | null>(null);

export interface ContentProviderProps {
  readonly snapshot: ContentSnapshot;
  readonly children: ReactNode;
}

/** Makes a loaded snapshot readable by every descendant. */
export function ContentProvider({ snapshot, children }: ContentProviderProps) {
  const access = useMemo(() => createContentAccess(snapshot), [snapshot]);

  return <ContentContext value={access}>{children}</ContentContext>;
}

/** The content accessors. Throws when used outside a `ContentProvider`. */
export function useContent(): ContentAccess {
  const access = useContext(ContentContext);
  if (access === null) {
    throw new Error('useContent() must be called inside a <ContentProvider>.');
  }

  return access;
}
