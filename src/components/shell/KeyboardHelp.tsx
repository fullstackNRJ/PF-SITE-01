import { useEffect, useRef } from 'react';

import { useNavigation } from '@/components/navigation/NavigationProvider';
import { Key } from '@/components/ui/Key';
import { KEY_ESCAPE, SHORTCUTS } from '@/lib/navigation/shortcuts';

export function KeyboardHelp() {
  const { helpOpen, closeHelp } = useNavigation();
  const dialog = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }

    if (helpOpen && !element.open) {
      element.showModal();
    } else if (!helpOpen && element.open) {
      element.close();
    }
  }, [helpOpen]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="keyboard-help-title"
      onClose={closeHelp}
      onClick={(event) => {
        // A click on the backdrop targets the dialog element itself.
        if (event.target === event.currentTarget) {
          closeHelp();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg border border-line-strong bg-panel p-0 text-fg shadow-[0_32px_64px_-24px_var(--color-ink)] backdrop:bg-ink/80"
    >
      <div className="flex flex-col gap-6 p-6">
        <h2 id="keyboard-help-title" className="font-serif text-3xl leading-none">
          Keyboard shortcuts
        </h2>

        <table className="w-full text-left text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">Keys</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((shortcut) => (
              <tr key={shortcut.description} className="border-t border-line align-baseline">
                <td className="whitespace-nowrap py-2.5 pr-6">
                  <span className="flex gap-1">
                    {shortcut.keys.map((label) => (
                      <Key key={label.name} label={label} />
                    ))}
                  </span>
                </td>
                <td className="py-2.5 text-fg-muted">{shortcut.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <p className="font-mono text-micro text-fg-subtle">On touch: swipe for sections, tap to open.</p>
          <button
            type="button"
            autoFocus
            onClick={closeHelp}
            className="flex items-center gap-2 font-mono text-micro text-fg-muted transition-colors duration-(--duration-quick) hover:text-fg"
          >
            Close
            <span aria-hidden="true">
              <Key label={KEY_ESCAPE} />
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
