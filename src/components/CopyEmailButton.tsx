"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { playUi } from "@/lib/sound";

export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      playUi("seal"); // success only — the wax pressing; "Copied" is the confirmation
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the email
      // selectable as plain text next to this button.
    }
  };

  return (
    <>
      <button
        type="button"
        data-voice // speaks wax on success — the global chime skips it
        onClick={copy}
        aria-label={copied ? `Copied ${email}` : `Copy email address ${email}`}
        className="label print-hidden inline-flex items-center gap-2 border border-rule px-3 py-2.5 transition-colors hover:bg-signal hover:text-ground"
      >
        {copied ? (
          <>
            <Check size={13} strokeWidth={2.2} aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy size={13} strokeWidth={2.2} aria-hidden="true" />
            Copy
          </>
        )}
      </button>
      {/* Announce copy success without re-announcing the button itself. */}
      <span aria-live="polite" className="sr-only">
        {copied ? `Email address ${email} copied to clipboard` : ""}
      </span>
    </>
  );
}
