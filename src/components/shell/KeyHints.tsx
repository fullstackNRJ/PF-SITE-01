import { Key } from '@/components/ui/Key';
import { KEY_DOWN, KEY_ENTER, KEY_LEFT, KEY_RIGHT, KEY_UP } from '@/lib/navigation/shortcuts';
import type { KeyLabel } from '@/lib/navigation/shortcuts';

const HINTS: readonly (readonly [keys: readonly KeyLabel[], action: string])[] = [
  [[KEY_LEFT, KEY_RIGHT], 'sections'],
  [[KEY_UP, KEY_DOWN], 'items'],
  [[KEY_ENTER], 'open'],
];

/** The three keys worth knowing, always in view on keyboard-and-mouse screens. The help dialog is the accessible source. */
export function KeyHints() {
  return (
    <ul
      aria-hidden="true"
      className="hidden items-center gap-4 font-mono text-micro text-fg-subtle lg:pointer-fine:flex"
    >
      {HINTS.map(([keys, action]) => (
        <li key={action} className="flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {keys.map((label) => (
              <Key key={label.name} label={label} />
            ))}
          </span>
          {action}
        </li>
      ))}
    </ul>
  );
}
