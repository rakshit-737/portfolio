"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { playUi } from "@/lib/sound";
import {
  OPEN_TERMINAL_EVENT,
  isEditable,
  isTerminalBareKey,
  isTerminalChord,
} from "@/lib/terminalKeys";

// The panel and the interpreter behind it are a lazy chunk: a closed
// terminal costs the eager bundle only this shell. `ssr: false` is allowed
// here because this file is a Client Component (a Server Component importing
// it dynamically would get no code splitting — Next 16 lazy-loading guide).
// No spinner: the overlay simply appears when the chunk lands.
const TerminalPanel = dynamic(() => import("@/components/TerminalPanel"), {
  ssr: false,
  loading: () => null,
});

/** Warm the lazy chunk — the rail button calls this on hover and focus, so
 *  the click that follows opens the overlay without a network wait. */
export function preloadTerminal() {
  void import("@/components/TerminalPanel");
}

/**
 * The terminal's shell: always mounted, renders nothing until opened. It
 * owns the open state, the keys, the focus bookkeeping and the body scroll
 * lock — the same job CommandPalette does for itself — and leaves the
 * dialog UI to the lazy panel.
 */
export default function Terminal() {
  const [open, setOpen] = useState(false);
  // A mirror of `open` the two callbacks below keep in step, so `openNow`
  // can refuse a second open (the rail button, the palette action and the
  // key can all ask at once) while staying referentially stable. Only ever
  // touched from handlers, never during render.
  const openRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // `silent` is the hand-off to the palette: that overlay plays its own tap,
  // so one press never plays two.
  const close = useCallback((silent = false) => {
    openRef.current = false;
    setOpen(false);
    restoreFocusRef.current?.focus({ preventScroll: true });
    if (!silent) playUi("tap"); // the panel closing — wood, one of the sanctioned sounds
  }, []);

  // Every way in (the backtick, Ctrl+backtick, the rail button's and the
  // palette's open event) funnels through here — one place for the focus
  // bookkeeping and the one wood tap.
  const openNow = useCallback(() => {
    // A native <dialog> opened with showModal() (the certificate lightbox)
    // sits in the top layer and makes the page behind it inert — the
    // terminal must not open underneath it.
    if (openRef.current || document.querySelector("dialog[open]")) return;
    openRef.current = true;
    restoreFocusRef.current = document.activeElement as HTMLElement;
    setOpen(true);
    playUi("tap");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTerminalChord(e)) {
        e.preventDefault();
        if (open) close();
        else openNow();
      } else if (
        isTerminalBareKey(e) &&
        !open &&
        !isEditable(document.activeElement)
      ) {
        e.preventDefault();
        openNow();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_TERMINAL_EVENT, openNow);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_TERMINAL_EVENT, openNow);
    };
  }, [open, close, openNow]);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return <TerminalPanel onClose={close} />;
}
