"use client";

import { useEffect, useState } from "react";
import { hero, site } from "@/content";
import Odometer from "@/components/Odometer";

/**
 * The owner's local time, live, beside the name in the nav — the
 * instrument reading a recruiter actually wants before writing: is it
 * a sensible hour to reach this person. Always `site.timeZone`, never
 * the visitor's own clock (which they can read off their own screen).
 *
 * Static export: the server renders a same-width placeholder (middle
 * dots in every digit position), not a build-time reading that would be
 * days stale and briefly wrong on every visit. The client replaces it on
 * mount and ticks once a second — a plain `setInterval`, not a rAF loop,
 * so the lamp's idle-stop contract is untouched. Digits
 * are tabular (`tnum` is global), so the width never changes and the nav
 * never reflows as the seconds turn. Plain text, no live region: a
 * screen reader hears it once on navigation, not sixty times a minute.
 *
 * The reading renders through Odometer.tsx (CollectUI brief, item 4):
 * each glyph in its own span, and only the glyphs a tick actually
 * changes turn over — the `<time>` stays a single element and its
 * text stays exactly `formatClock()`'s. The placeholder's swap to the
 * first real reading never animates: it differs at every digit
 * position, far past the odometer's three-wheel cap.
 */
export const CLOCK_PLACEHOLDER = `·· ··· · ··:··:·· ${site.timeZoneLabel}`;

/** "04 Sep · 14:32:05 IST" — day, month, then a 24-hour clock. `.label`
 *  uppercases the month on screen; the text itself stays as written. */
export function formatClock(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: site.timeZone,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day} ${parts.month} · ${parts.hour}:${parts.minute}:${parts.second} ${site.timeZoneLabel}`;
}

export default function LiveClock({ className = "" }: { className?: string }) {
  const [text, setText] = useState(CLOCK_PLACEHOLDER);
  const [iso, setIso] = useState<string | undefined>(undefined);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setText(formatClock(now));
      setIso(now.toISOString());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time
      dateTime={iso}
      data-clock
      title={`Current time in ${hero.location}`}
      className={`label tabular-nums whitespace-nowrap ${className}`.trim()}
    >
      <Odometer text={text} />
    </time>
  );
}
