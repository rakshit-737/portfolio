"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { terminal, terminalEntry } from "@/content";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import { jumpToSection } from "@/lib/jump";
import { complete, run, type Effect, type Line } from "@/lib/terminal";

/** One run: what was typed, and what the interpreter printed for it. */
interface Block {
  id: number;
  input: string;
  lines: Line[];
}

/** The log keeps the last 500 lines (echo lines included); the oldest whole
 *  blocks go first. */
const MAX_LINES = 500;
/** This session's history — memory only, never stored. */
const MAX_HISTORY = 50;

/** Drop the oldest blocks until the log fits, but never the newest one. */
function cap(blocks: Block[]): Block[] {
  let total = blocks.reduce((n, b) => n + b.lines.length + 1, 0);
  let drop = 0;
  while (total > MAX_LINES && drop < blocks.length - 1) {
    total -= blocks[drop].lines.length + 1;
    drop++;
  }
  return drop ? blocks.slice(drop) : blocks;
}

/** One printed line. Ember never appears here: it marks a number the lamp
 *  has lit, and this overlay sits above the lamp's pool. */
function OutputLine({ line }: { line: Line }) {
  switch (line.kind) {
    case "text":
      return <p className="break-words whitespace-pre-wrap">{line.text}</p>;
    case "heading":
      return <p className="label pt-1">{line.text}</p>;
    case "row":
      // `minmax(0, 1fr)`, not `1fr`: a long token must wrap in its track
      // rather than push the panel wider than a phone.
      return (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <span className="font-semibold break-words">{line.name}</span>
          <span className="break-words">{line.text}</span>
        </div>
      );
    case "link":
      // A real anchor, 24px tall for the WCAG 2.2 target size; the control
      // swap on hover and focus is the same local device the rail uses.
      return (
        <p>
          <a
            href={line.href}
            target={line.external ? "_blank" : undefined}
            rel={line.external ? "noopener noreferrer" : undefined}
            download={line.download}
            className="inline-flex min-h-6 items-center underline hover:bg-signal hover:text-ground focus-visible:bg-signal focus-visible:text-ground"
          >
            {line.label}
          </a>
        </p>
      );
  }
}

export default function TerminalPanel({
  onClose,
}: {
  onClose: (silent?: boolean) => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the current mouse press began on the scrim itself — the
  // palette's drag-select guard, see the overlay's onMouseDown/onClick pair.
  const scrimPressRef = useRef(false);
  const nextId = useRef(0);
  // This session's lines, newest last. `posRef` is the history cursor
  // (`history.length` means "not walking") and `draftRef` holds what was
  // typed before the first ↑, so ↓ past the newest line gives it back.
  const historyRef = useRef<string[]>([]);
  const posRef = useRef(0);
  const draftRef = useRef("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // After every run the log jumps to the bottom — instant, never smooth:
  // this overlay has no motion — so the newest output and the prompt are in
  // view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [blocks]);

  // One overlay at a time: close silently (the palette plays its own tap),
  // then open the palette on the next tick, once focus is back on whatever
  // opened the terminal — so the palette's restore target is that element,
  // not this dialog's input.
  const toPalette = () => {
    onClose(true);
    window.setTimeout(
      () => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT)),
      0,
    );
  };

  const perform = (effect: Effect) => {
    switch (effect.kind) {
      case "clear":
        setBlocks([]);
        break;
      case "exit":
        onClose();
        break;
      case "goto":
        jumpToSection(effect.id);
        onClose();
        break;
      case "open":
        // The tab itself, like the palette's navigations.
        window.location.href = effect.href;
        break;
      case "download": {
        // A transient anchor with `download`; the link the command printed
        // is the fallback if a blocker eats this programmatic click.
        const a = document.createElement("a");
        a.href = effect.href;
        a.download = "";
        document.body.append(a);
        a.click();
        a.remove();
        break;
      }
      case "palette":
        toPalette();
        break;
    }
  };

  const submit = () => {
    const line = value.trim();
    setValue("");
    // An empty line prints nothing and is not worth recalling.
    if (!line) return;
    const history = historyRef.current;
    if (history[history.length - 1] !== line) {
      history.push(line);
      if (history.length > MAX_HISTORY) history.shift();
    }
    posRef.current = history.length;
    draftRef.current = "";

    const result = run(line);
    const block: Block = { id: nextId.current++, input: line, lines: result.lines };
    // `clear` empties the log after this block lands, so the two updates
    // batch to an empty log.
    setBlocks((prev) => cap([...prev, block]));
    if (result.effect) perform(result.effect);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter that confirms an IME candidate is not a command.
    if (e.nativeEvent.isComposing) return;
    const history = historyRef.current;
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Tab completes when it has something to complete, and then the
      // dialog's focus trap must not also move focus off the prompt: stop
      // the event before it gets there. With nothing to complete it is an
      // ordinary Tab — it falls through to the trap, which wraps to the
      // first output link — so the keyboard is never stuck on the prompt.
      const next = complete(value);
      if (next !== value) {
        e.preventDefault();
        e.stopPropagation();
        setValue(next);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (posRef.current === 0) return;
      if (posRef.current >= history.length) draftRef.current = value;
      posRef.current = Math.min(posRef.current, history.length) - 1;
      setValue(history[posRef.current]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (posRef.current >= history.length) return;
      posRef.current += 1;
      setValue(
        posRef.current >= history.length
          ? draftRef.current
          : history[posRef.current],
      );
    }
  };

  // Dialog-level keys: work wherever focus sits inside the dialog.
  const onDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      !e.altKey &&
      e.key.toLowerCase() === "k"
    ) {
      // The palette's own chord — stop it here so its window listener does
      // not also fire; the hand-off opens it on the next tick.
      e.preventDefault();
      e.stopPropagation();
      toPalette();
    } else if (e.key === "Tab") {
      // Focus never leaves the dialog: wrap at either end. The prompt is
      // the last stop, with any output links before it.
      const items = Array.from(
        e.currentTarget.querySelectorAll<HTMLElement>("a[href], input, button"),
      );
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLElement);
      const edge = e.shiftKey ? 0 : items.length - 1;
      if (at === -1 || at === edge) {
        e.preventDefault();
        items[e.shiftKey ? items.length - 1 : 0].focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-ground/85 p-4 pt-[12vh]"
      // Close only when the press itself began on the scrim: a click's
      // target is the nearest common ancestor of mousedown and mouseup, so
      // drag-selecting output and releasing outside the dialog used to
      // land the click here and close the terminal mid-selection.
      onMouseDown={(e) => {
        scrimPressRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (scrimPressRef.current && e.target === e.currentTarget) onClose();
        scrimPressRef.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={terminalEntry.label}
        data-terminal
        className="w-full max-w-2xl border border-signal bg-ground"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <p className="label">{terminalEntry.label}</p>
          <kbd className="label shrink-0 border border-rule px-1.5 py-1">
            esc
          </kbd>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[min(60dvh,32rem)] overflow-y-auto px-4 py-3 font-mono text-sm"
          // Clicking the log's empty space puts the caret back in the
          // prompt, like clicking a terminal window — except on a link, and
          // except while text is selected: focusing the input would drop
          // the selection and with it the visitor's chance to copy output.
          onClick={(e) => {
            if ((e.target as Element).closest("a")) return;
            if (window.getSelection()?.toString()) return;
            inputRef.current?.focus();
          }}
        >
          {/* The live region holds only output. The prompt row below is its
              sibling, never inside it: every keystroke would otherwise be
              announced as a log addition. */}
          <div role="log" aria-label={terminal.output}>
            <p className="break-words">{terminal.welcome}</p>
            {blocks.map((b) => (
              <div
                key={b.id}
                className="mt-3 flex flex-col gap-1.5 border-t border-rule-soft pt-3"
              >
                {/* The echo tells a command from its output by structure —
                    the prompt glyph — never by dimming. aria-hidden: a
                    screen reader hears each result, not the question. */}
                <p aria-hidden="true" className="flex gap-2">
                  <span>{terminal.prompt}</span>
                  <span className="min-w-0 break-words whitespace-pre-wrap">
                    {b.input}
                  </span>
                </p>
                {b.lines.map((line, i) => (
                  <OutputLine key={i} line={line} />
                ))}
              </div>
            ))}
          </div>

          {/* Visible focus is not left to the caret: the rule above the
              prompt goes from border-rule to border-signal. */}
          <div className="mt-3 flex items-center gap-2 border-t border-rule pt-3 focus-within:border-signal">
            <span aria-hidden="true">{terminal.prompt}</span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onInputKeyDown}
              aria-label={terminal.input}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              maxLength={200}
              className="w-full min-w-0 bg-transparent font-mono text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="label flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule px-4 py-2.5">
          <span>{terminal.footer.complete}</span>
          <span className="flex items-center gap-1.5">
            <ArrowUp size={11} aria-hidden="true" />
            <ArrowDown size={11} aria-hidden="true" />
            {terminal.footer.history}
          </span>
          <span>{terminal.footer.close}</span>
        </div>
      </div>
    </div>
  );
}
