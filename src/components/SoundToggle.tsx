"use client";

import { useSyncExternalStore } from "react";
import {
  getSoundStatus,
  isSoundEnabled,
  playUi,
  setSoundEnabled,
  subscribeSound,
} from "@/lib/sound";
import MorphLabel from "@/components/MorphLabel";
import { soundscape } from "@/content";

/**
 * The soundscape's one control — a toggle, which is also the mute
 * control (see the night-archive plan's rulings). The visible text
 * carries the state ("Soundscape: on"), so no aria-pressed: a changing
 * accessible name and a pressed state would announce twice, and
 * disagree the moment one updates before the other. Turning on clicks
 * audibly (the context is running by then); turning off is silent
 * because playUi gates on the now-false setting — either way the text
 * change is the confirmation, never the sound alone.
 *
 * Renders nothing when the browser has no AudioContext: a control that
 * does nothing is worse than no control.
 */
export default function SoundToggle({ className = "" }: { className?: string }) {
  const status = useSyncExternalStore(
    subscribeSound,
    getSoundStatus,
    // Server snapshot: "off" renders the same shape as the client's
    // pre-init default, so hydration never mismatches.
    () => "off" as const,
  );
  if (status === "unavailable") return null;
  const on = isSoundEnabled() && status !== "off";
  return (
    <button
      type="button"
      data-voice // speaks brass for itself — the global chime skips it
      onClick={() => {
        setSoundEnabled(!on);
        playUi("click");
      }}
      className={`label transition-colors ${className}`}
    >
      {/* The square switch (CollectUI Phase 2) — aria-hidden decoration:
          the knob's position echoes the state the text already carries,
          so the accessible name stays one run of text. Styled in
          globals.css (`.sound-switch`); it slides on transform only. */}
      <span aria-hidden="true" className="sound-switch" data-on={on ? "" : undefined} />
      {/* Only the state word morphs (MorphLabel — the same 180ms word
          device the copy button uses); "Soundscape:" holds still, and
          the accessible name stays this one run of text. */}
      {soundscape.label}: <MorphLabel text={on ? soundscape.on : soundscape.off} />
    </button>
  );
}
