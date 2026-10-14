import { useContent } from '@/components/content/ContentProvider';
import { useNavigation } from '@/components/navigation/NavigationProvider';
import { Key } from '@/components/ui/Key';
import { KEY_HELP } from '@/lib/navigation/shortcuts';

import { KeyHints } from './KeyHints';

export function ShellHeader() {
  const { author } = useContent().getSiteConfig();
  const { toggleHelp } = useNavigation();

  return (
    <header className="border-b border-line bg-ink">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 md:px-6">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <h1 className="font-serif text-3xl leading-none text-fg">{author.name}</h1>
          <p className="text-sm leading-snug text-fg-muted sm:truncate">{author.headline}</p>
        </div>

        <div className="flex shrink-0 items-center gap-6">
          <KeyHints />
          <button
            type="button"
            onClick={toggleHelp}
            aria-haspopup="dialog"
            aria-keyshortcuts="?"
            className="-m-2 flex items-center gap-2 p-2 font-mono text-micro text-fg-muted transition-colors duration-(--duration-quick) hover:text-fg"
          >
            <span aria-hidden="true">
              <Key label={KEY_HELP} />
            </span>
            <span className="sr-only md:not-sr-only">Keyboard shortcuts</span>
          </button>
        </div>
      </div>
    </header>
  );
}
