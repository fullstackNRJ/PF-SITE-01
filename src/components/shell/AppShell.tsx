import { useMemo } from 'react';

import { ContentProvider } from '@/components/content/ContentProvider';
import { NavigationProvider } from '@/components/navigation/NavigationProvider';
import { buildNavigationModel } from '@/lib/navigation/model';
import type { ContentSnapshot } from '@/lib/types';

import { PortfolioShell } from './PortfolioShell';

export interface AppShellProps {
  /** Plain, serializable content from `getContentSnapshot()`. */
  readonly snapshot: ContentSnapshot;
}

/**
 * The portfolio shell: the only component Astro hydrates.
 *
 * It does one thing — turn the snapshot into the two pieces of ambient state the
 * tree needs, then hand off. Chrome and rendering live in `PortfolioShell` and
 * below, so this file does not change as the site grows.
 *
 *   content    -> `@/lib/content`        (loaded once, arrives as props)
 *   provider   -> `ContentProvider`      (same API, available to components)
 *   navigation -> `NavigationProvider`   (engine + global keyboard)
 *   chrome     -> `PortfolioShell`
 */
export default function AppShell({ snapshot }: AppShellProps) {
  const model = useMemo(() => buildNavigationModel(snapshot.sections), [snapshot.sections]);

  return (
    <ContentProvider snapshot={snapshot}>
      <NavigationProvider model={model}>
        <PortfolioShell />
      </NavigationProvider>
    </ContentProvider>
  );
}
