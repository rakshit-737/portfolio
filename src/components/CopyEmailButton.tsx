"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

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
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the email
      // selectable as plain text next to this button.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 border border-hairline px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-steel/60 hover:text-steel"
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check size={13} aria-hidden="true" className="text-pass" />
          Copied
        </>
      ) : (
        <>
          <Copy size={13} aria-hidden="true" />
          Copy
        </>
      )}
    </button>
  );
}
