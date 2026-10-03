/**
 * The terminal's keys and its open event — a leaf module (no component
 * imports) so the palette, the shell and the rail button can all use it
 * without a cycle and without pulling the lazy panel into the eager bundle.
 */

/** Anything (the rail button, the palette's action) opens the terminal by
 *  dispatching this on `window`. */
export const OPEN_TERMINAL_EVENT = "lamplight:terminal";

type KeyLike = Pick<
  KeyboardEvent,
  "code" | "ctrlKey" | "metaKey" | "altKey" | "repeat" | "isComposing"
>;

/** Ctrl + the physical backtick key. `code`, not `key`: the key follows the
 *  physical position on every layout, and a dead-key layout reports
 *  `key: "Dead"`. Meta is refused — Cmd+backtick is the OS window switcher. */
export function isTerminalChord(e: KeyLike): boolean {
  return (
    e.code === "Backquote" &&
    e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.repeat &&
    !e.isComposing
  );
}

/** The bare backtick key, shifted or not. Only meaningful while focus is not
 *  in an editable element — the caller checks that with `isEditable`. */
export function isTerminalBareKey(e: KeyLike): boolean {
  return (
    e.code === "Backquote" &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.repeat &&
    !e.isComposing
  );
}

/** True while the user is typing: an input, a textarea or contenteditable. */
export function isEditable(el: Element | null): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}
