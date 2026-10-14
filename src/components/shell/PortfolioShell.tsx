import { useRef } from 'react';

import { CardRail } from '@/components/gallery/CardRail';
import { FocusedWindow } from '@/components/gallery/FocusedWindow';
import { useNavigation } from '@/components/navigation/NavigationProvider';
import { useSwipe } from '@/components/navigation/useSwipe';
import { swipeKey } from '@/lib/gesture';
import { keyToAction } from '@/lib/navigation/engine';

import { KeyboardHelp } from './KeyboardHelp';
import { NavigationAnnouncer } from './NavigationAnnouncer';
import { ShellHeader } from './ShellHeader';

/**
 * Identity on top, the focused window in the middle, the card rail below.
 *
 * One layout at every width: the shell fills the viewport and the window takes
 * what the header and rail leave, so content never sizes it. Breakpoints only
 * restyle (see the rail variables in global.css); swipes stand in for the keys.
 */
export function PortfolioShell() {
  const { state, dispatch } = useNavigation();
  const main = useRef<HTMLElement | null>(null);

  useSwipe(main, (direction) => {
    const key = swipeKey(direction, state.mode);
    const action = key === null ? null : keyToAction(key);
    if (action !== null) {
      dispatch(action);
    }
  });

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <a
        href="#portfolio-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:bg-signal focus:px-3 focus:py-2 focus:font-mono focus:text-micro focus:text-ink"
      >
        Skip to content
      </a>

      <ShellHeader />

      <main
        ref={main}
        id="portfolio-content"
        tabIndex={-1}
        // Vertical scrolling and zoom stay with the browser; horizontal movement is ours.
        className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 touch-pan-y touch-pinch-zoom flex-col px-4 pb-4 pt-4 focus:outline-none md:px-6 md:pb-8 md:pt-6"
      >
        <FocusedWindow />
        <CardRail />
      </main>

      <NavigationAnnouncer />
      <KeyboardHelp />
    </div>
  );
}
