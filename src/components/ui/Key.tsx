import type { KeyLabel } from '@/lib/navigation/shortcuts';

export interface KeyProps {
  readonly label: KeyLabel;
}

export function Key({ label }: KeyProps) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-key border border-b-2 border-line-strong bg-raised px-1 font-mono text-micro tracking-normal text-fg normal-case">
      <span aria-hidden="true">{label.glyph}</span>
      <span className="sr-only">{label.name}</span>
    </kbd>
  );
}
