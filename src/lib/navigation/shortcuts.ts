/** A key as shown to people: a glyph for sighted users and a spoken name for screen readers. */
export interface KeyLabel {
  /** `KeyboardEvent.key`, or `null` for keys the browser owns (Tab). */
  readonly key: string | null;
  readonly glyph: string;
  readonly name: string;
}

export interface Shortcut {
  readonly keys: readonly KeyLabel[];
  readonly description: string;
}

export const KEY_LEFT: KeyLabel = { key: 'ArrowLeft', glyph: '←', name: 'Left arrow' };
export const KEY_RIGHT: KeyLabel = { key: 'ArrowRight', glyph: '→', name: 'Right arrow' };
export const KEY_UP: KeyLabel = { key: 'ArrowUp', glyph: '↑', name: 'Up arrow' };
export const KEY_DOWN: KeyLabel = { key: 'ArrowDown', glyph: '↓', name: 'Down arrow' };
export const KEY_ENTER: KeyLabel = { key: 'Enter', glyph: '↵', name: 'Enter' };
export const KEY_ESCAPE: KeyLabel = { key: 'Escape', glyph: 'Esc', name: 'Escape' };
export const KEY_HOME: KeyLabel = { key: 'Home', glyph: 'Home', name: 'Home' };
export const KEY_END: KeyLabel = { key: 'End', glyph: 'End', name: 'End' };
export const KEY_HELP: KeyLabel = { key: '?', glyph: '?', name: 'Question mark' };
export const KEY_TAB: KeyLabel = { key: null, glyph: 'Tab', name: 'Tab' };

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: [KEY_LEFT, KEY_RIGHT], description: 'Previous or next section (wraps around)' },
  { keys: [KEY_UP, KEY_DOWN], description: 'Previous or next item in the section' },
  { keys: [KEY_HOME, KEY_END], description: 'First or last section' },
  { keys: [KEY_ENTER], description: 'Open the selected item' },
  { keys: [KEY_ESCAPE], description: 'Close this help, or return from an item to the gallery' },
  { keys: [KEY_HELP], description: 'Show or hide this help' },
  { keys: [KEY_TAB], description: 'Move between the section list, the selected item and its links' },
];
