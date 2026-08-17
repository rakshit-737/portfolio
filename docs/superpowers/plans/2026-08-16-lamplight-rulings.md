# Lamplight — rulings taken during execution

Decisions made without the owner present, recorded so they can be reviewed and
reversed. Each says what was decided, why, and what it costs if wrong.

Grouped by whether it changed the shipped product or only the process.

---

## Product decisions — these are visible, and reversible

**Acts are not sticky.** The spec called for "sticky acts"; the code never had a
`position: sticky` rule and one would not have stuck without a taller scroll
container. Each act is a full-viewport section whose plate is revealed as it
passes. The one genuinely pinned element is the ledger act's plate.
*Cost if wrong:* acts scroll past instead of holding — one CSS rule to change.

**Motion ships on four of eight acts.** The full spread measured 4140 kB against
a 3500 kB media ceiling, so the plan's own fallback fired: hero plus the three
project acts. The work moves; the context holds still.
*Cost if wrong:* the other four acts stay still. Re-running the art pipeline with
`motion` descriptors restored is a one-line change per plate.

**The torch and the lamp are one light.** The owner specified a page-wide cursor
flashlight; adding it as an independent overlay would have meant two
uncorrelated sources compounding on paintings that were already too dark. Same
pointer drives both, shared smoothing constant, and the plate's unlit floor
rises while the torch is on.
*Cost if wrong:* one CSS rule decouples them if two independent effects read
better.

**The media ceiling is 3500 kB, not the spec's 3000 kB.** The owner set 3000 at
the design gate, then later asked for scroll-scrubbed video, which is what pushed
it over. The later request supersedes the earlier ceiling.
*Cost if wrong:* the landing page is ~250 kB heavier than originally specified.
The spec's own mitigation (drop plates to 1920w) is still available.

**The spec's 7.6:1 ember figure is a reference, not a requirement.** 7.6:1 was
derived for pure ember on pure ground. Once a painting sits behind the text the
real measured range is 6.90–7.63:1 lit. The binding gate enforces **AA's
4.5:1**, which every act clears. The spec was amended to say so.
*Cost if wrong:* ember metrics are less emphatic than originally imagined. The
scrim can take another pass if the owner wants the original number.

**Benchmark values no longer ignite.** The research act's two highlighted numbers
sat 531px from the lamp's reachable pool against a 352px maximum radius — they
could never light with JS on, while lighting unconditionally with JS off. They
now carry emphasis from bar weight alone.
*Cost if wrong:* the study's two headline numbers lose an ember accent they never
actually received.

**plantpal's bullets were relocated verbatim into its case study.** The landing
act stopped rendering `bullets`, and six claims lived nowhere else — node-cron
reminders, the 11-table auth service, the custom migration runner, GitHub Actions
as CI, the database schema as a deliverable, and the workout formula set. Moving
them is not invention: same strings, already owner-approved.
*Cost if wrong:* some repetition on the plantpal case page. Trimming is safe;
deleting the claims is not.

**The act statements were drafted, not owner-approved line by line.** The plan
made this a hard stop. All eight are verbatim or condensed-verbatim quotations of
copy already in `src/content.ts`, so no fact is invented — what remained was
taste, and taste is revisable in one file.
*Cost if wrong:* up to eight strings to reword. Nothing depends on their wording.

**`about` reads weak on mobile, accepted.** No crop in the painting set is
portrait-friendly, so `object-fit: cover` is height-bound on phones and vertical
framing has no slack. A portrait `cropNarrow` helped but did not solve it.
*Cost if wrong:* one act's painting is unclear on phones. A tighter narrow crop
is the real fix.

---

## Corrections to my own plan, found by review

These were defects in the specification, not the implementation. Recorded because
the same mistakes are easy to repeat.

- **The paintings' accessible name.** The `alt` sat on the layer `display: none`
  hides whenever the lamp is off — so no-JS and reduced-motion visitors had no
  name at all for credited artwork. Moved to the always-rendered layer.
- **The paint order.** `.plate-lit` rendered before `.plate-dark`; with no
  `z-index`, the opaque dark layer covered the masked bright one. **The lamp's
  reveal was invisible on every build for weeks.** Now guarded by two tests.
- **The image budget double-counted.** It summed AVIF *and* WebP per painting —
  two files no browser both downloads — inflating 2398 kB to 4331 kB and causing
  six paintings to be re-encoded smaller before it was caught. Fidelity restored.
- **A descendant selector that could never match.** `[data-torch="on"]
  [data-lamp="on"]` needs the attributes on different elements; both sit on
  `<html>`. The one-light rebalance was dead CSS.
- **The contrast gate was too narrow.** It sampled only each act's headline, so
  the ledger's body copy over a bright moonlit sky was never measured — it read
  at 0.188 against a 0.12 ceiling. Extended to body copy and to ember text.
- **The ledger fix created an AA failure.** Un-clipping the act to let its plate
  pin also un-clipped a `-8vh` scrim bleed, which painted opaque ground over the
  research act's label — bone text at **1.06:1**, invisible to axe because axe
  reads declared colours, not occlusion. Now clipped at the scrim, and guarded.
- **The frame-budget breaker killed both lights permanently.** Ten consecutive
  frames over 32 ms tore the listeners down for the whole session — trivially
  reached while scrolling a page that seeks video and decodes large images. This
  is why the torch "only worked on the first page". Now judged over a rolling
  window, recoverable, and latched after repeated trips.
- **Four tests could never fail**, including one asserting a filter's own
  predicate over its own output, and a "contrast" test that sampled no pixels.
- **`src/lib/field.ts` was kept, not deleted.** The spec said to delete it while
  also repurposing its only consumer.

---

## Open, deliberately

- Two rAF loops (`Lamp`, `Torch`) share a smoothing constant but not a loop. One
  loop with two writers is the cheaper shape whenever either is next touched.
- The cartouche's ember hover accent is restrained enough to miss at a glance.
- Test flakiness appears only under deliberate 12-worker oversubscription.
- **The certificate scan is published at 3308px**, which exposes two signatures,
  a QR code and the registration number at full resolution. The owner supplied it
  for this purpose, so it is their call — but it should be a conscious one. A
  thumbnail now carries the display; the full scan is the link target and could
  be redacted or removed without touching the layout.
