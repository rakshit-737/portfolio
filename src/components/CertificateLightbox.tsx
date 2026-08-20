"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A certificate thumbnail that opens the full-resolution scan in a native
 * `<dialog>` instead of navigating to a bare PNG. No new dependency: the
 * browser's own dialog element handles focus movement on open and
 * Escape-to-close; a click on the dialog's own backdrop area (anything
 * that isn't the framed image or the close control) closes it too. Focus
 * returns to the thumbnail trigger on close, via the dialog's native
 * `close` event — the same pattern whether the dialog was dismissed by
 * Escape, backdrop click, or the close button.
 *
 * The full-resolution image is only ever requested once the dialog is
 * actually open (`open` gates the `<img>` itself) — the thumbnail stays
 * the only network cost paid at page load, exactly as the ledger's other
 * receipt chips already work.
 */
export default function CertificateLightbox({
  thumbnail,
  fullSrc,
  alt,
  triggerLabel,
}: {
  /** The already-rendered thumbnail markup (a `<picture>` or `<img>`),
   *  shown at page-load cost — unchanged by opening the dialog. */
  thumbnail: ReactNode;
  /** Full-resolution scan path, already `withBase()`-prefixed. */
  fullSrc: string;
  alt: string;
  triggerLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Fires on Escape, backdrop-driven `cancel`, and the close button's own
    // `.close()` call alike — one path returns focus regardless of which
    // dismissal a visitor used.
    const onClose = () => {
      setOpen(false);
      triggerRef.current?.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
          // showModal() alone doesn't reliably focus a specific descendant
          // across browsers — some focus the dialog element itself. Move
          // focus to the close control explicitly once it has mounted.
          requestAnimationFrame(() => closeRef.current?.focus());
        }}
        aria-label={triggerLabel}
        className="inline-block border border-rule p-1 transition-colors hover:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        {thumbnail}
      </button>

      <dialog
        ref={dialogRef}
        aria-label={alt}
        className="certificate-lightbox max-h-[90svh] max-w-[92vw] border border-rule bg-ground p-0 text-signal sm:max-w-[85vw]"
        onClick={(e) => {
          // A click that lands on the dialog element itself (never on a
          // child) is a click on its own backdrop padding — the
          // click-outside-to-close affordance the brief asks for.
          if (e.target === dialogRef.current) close();
        }}
      >
        {open && (
          <div className="relative">
            <img
              src={fullSrc}
              alt={alt}
              className="block max-h-[90svh] max-w-[92vw] w-auto object-contain sm:max-w-[85vw]"
            />
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close certificate"
              className="label absolute top-2 right-2 flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-signal bg-ground px-2 py-1 transition-colors hover:bg-signal hover:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <X size={14} aria-hidden="true" />
              Close
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
