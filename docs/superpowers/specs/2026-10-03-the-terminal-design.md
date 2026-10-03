# The Terminal — a command line in Lamplight's voice

Date: 2026-10-03 · Owner brief: "add a command line interface thing right near
my ctrl k button", then "like a terminal with the same aesthetic". The design
was approved in chat the same day: approach A — its own overlay, its own
button, its own key. This spec records that design, the rulings it had to
make, and the refinements found while reading the code.

## Intent

A visitor opens a terminal from the rail, right beside the ctrl K button, or
from the keyboard, types a few commands, and is shown the portfolio's real
content or taken to it. It is a second way to read and move through the
record — never the only way, never a gate. The audience is engineers and
recruiters; the goal is personality and speed. Nothing it prints is a new
claim: every line is composed from `content.ts` exports.

## Rulings this design keeps

| Standing rule | How it holds |
|---|---|
| The direction contract refuses "the dark terminal with its green-on-black nostalgia" (`layout.tsx` CONTRACT, `docs/DESIGN.md`) | The owner asked for a terminal "with the same aesthetic", so this one is Lamplight-native: bone on ground, hairline rules, Chivo Mono with `.label` chrome. No green, no `user@host`, no `$`, no glow, scanlines or CRT. Precedent: Warden's exhibit — mono text on a ground chamber, composed from real rows. The contract refuses a *skin*; `docs/DESIGN.md` gets a sentence saying so. `layout.tsx` is untouched. |
| Three values, no fourth; no grey | Bone and ground only. No ember: ember marks a number the lamp has lit, and this overlay sits above the lamp's pool. A command's echo and its output are told apart by structure (the prompt glyph, a hairline rule between blocks), never by dimming. |
| One light | The terminal is not a light source. Nothing glows. |
| `content.ts` is the only source of words | Every string — prompt, help, errors, labels — lives in a `terminal` export. Output is composed from existing exports. No new claims. |
| One moving part; no other entrance animations | No motion at all. Output appears at once; the log jumps to the bottom (never a smooth scroll). |
| One press, one sound | Open and close play the wood tap (`playUi("tap")`) once, from the shell. The rail button is `data-voice`. Typing and output are silent. |
| Never dim text to signal a state | Focus is a rule/colour swap, as everywhere else on the site. |
| Budget, CSP, static export | The panel and interpreter are a lazy chunk. No eval, workers, storage, network or new origins. Internal links go through `withBase` as plain `<a>` (no `next/link`). |

## Non-goals

Not a real shell: no pipes, variables or filesystem. No easter-egg commands
or jokes unless the owner writes the copy. No persisted history. No
instrument toggles (the palette owns those). No search (the palette owns
that too). No phone button. More commands (`education`, `certs`,
`achievements`) are one registry entry plus one copy key each, later.

## The pieces

### 1. The button — `Nav.tsx`

A bordered button directly after ctrl K in the desktop cluster, before
Résumé: lucide `Terminal` icon (12px) and a `kbd` hint reading `ctrl` and a
backtick, styled exactly like its neighbour (`label`, `border border-rule`,
`hover:border-signal active:border-signal`). Accessible name
``Open the terminal (Ctrl+`)``, mirroring "Search the field (Ctrl+K)".
`data-voice`. On `pointerenter` and `focus` it warms the lazy chunk.

**Rail fit.** The rail at `md` has about 3px of slack (the act-counter comment
in `Nav.tsx`), so the button is `hidden lg:flex`. The width sweep in
`tests/brand.spec.ts` (768, 1024, 1263, 1280, 1366, 1440) is the gate. If it
shows an overflow at 1024, or at 1440 (where the section links return with
about 110px to spare), the fallback order is: drop the `kbd` hint (icon only,
about 34px), then raise the breakpoint. Measure first; the plan records the
numbers.

The fit is date-dependent. The clock's month is `Intl` "short" text set in
proportional Manrope and uppercased by `.label`, so its width changes with
the month — October pushed the 768px rail 4px over (`b6b1e3c`). The
measurement therefore runs against the widest of the twelve month labels,
not today's, so the button cannot pass in October and overflow in another
month.

Below `lg` the terminal is reached from the palette ("Open the terminal") or
by key. There is no phone button: the sub-`md` rail is already full.
Case-file pages have no rail button either (their header carries only the
back crumb and Résumé); the shell is mounted there so the keys and the
palette action still work, exactly as the palette itself does.

### 2. The shell — `src/components/Terminal.tsx` (`"use client"`)

Always mounted, renders nothing until opened. Owns: the `open` state; the
window `keydown` listener (see Keyboard); the `OPEN_TERMINAL_EVENT` listener;
focus bookkeeping (remember `document.activeElement` on open, restore it on
close with `preventScroll` — identical to the palette otherwise); body scroll
lock; the wood tap on open and close (a silent variant for hand-offs).

It renders the panel through `next/dynamic` with `ssr: false`. Per the Next 16
lazy-loading guide (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`)
`ssr: false` is only allowed in a Client Component, and a Server Component
that dynamically imports a Client Component gets no code splitting — hence
this client shell sitting between `page.tsx` and the panel. It is mounted
beside `<CommandPalette />` in `src/app/page.tsx` and
`src/app/projects/[id]/page.tsx`.

### 3. The panel — `src/components/TerminalPanel.tsx`

The dialog UI (see The panel, below). Loaded on first open, or earlier by the
button's hover/focus warm-up. No spinner: the overlay appears when the chunk
lands.

### 4. The interpreter — `src/lib/terminal.ts`

Framework-free and pure: no React, no DOM, no `window`.
`run(input) → { lines, effect? }` and `complete(input) → string`. Commands
are a registry (`name`, optional `usage`, `run`, optional `complete`); `help`
is derived from it. Side effects come back as data (`goto`, `open`,
`download`, `palette`, `clear`, `exit`) and are performed by the panel. This
is what lets the whole command set be unit-tested in Node, in the style of
`tests/sound-unit.spec.ts`.

### 5. Shared leaf modules

- `src/lib/jump.ts` — `jumpToSection(id)`: the palette's inline `jump`
  (scroll to the act, or navigate to `/#id` when the section is not in this
  document, honouring reduced motion) extracted verbatim, so the palette and
  the terminal share one. Palette behaviour does not change.
- `src/lib/terminalKeys.ts` — `OPEN_TERMINAL_EVENT`, `isTerminalChord(e)`,
  `isTerminalBareKey(e)`. No component imports, so the palette can use them
  without a cycle and without pulling the panel into the eager bundle.

### 6. Palette changes — `CommandPalette.tsx` (small, behaviour-preserving)

- A new `instrument` command, "Open the terminal", hint `ctrl` + backtick,
  `silent: true`. It dispatches `OPEN_TERMINAL_EVENT` on the next tick, after
  the palette has closed and restored focus.
- `Command.silent` is passed through `run` to `close(silent)`, so one press
  plays one tap (the terminal's). This restores the contract the existing
  comment on `close` already describes.
- Ctrl+backtick inside the palette hands off to the terminal (the same path).
- The inline `jump` becomes `jumpToSection`.

## Keyboard

| Key | Where | Does |
|---|---|---|
| Backtick (the physical Backquote key, shifted or not) | focus not in an input, textarea or contenteditable | opens the terminal; no-op if already open |
| Ctrl + backtick | anywhere, including the prompt | toggles the terminal |
| Enter | prompt | runs the line |
| Tab | prompt | completes the command word, or the `open`/`goto` argument, when the prefix is unique; otherwise leaves the line alone |
| ↑ / ↓ | prompt | steps through this session's history (memory only, 50 lines, never stored) |
| Esc | dialog | closes (the panel consumes the event) |
| Ctrl+K | inside the terminal | hands off to the palette, the same as `palette` |

The shortcut matches `e.code === "Backquote"`, so it follows the physical key
on every layout. It ignores `e.repeat`, `e.isComposing`, and Alt or Meta held
(Cmd+backtick is the OS window switcher on macOS). Ctrl+J was rejected: it is
the browser's Downloads shortcut and the résumé is a download.

Collisions checked: the secrets in `Experience.tsx` (Konami, Shift+D, hold L)
already return when `typing(e.target)`, and the prompt is an `<input>`, so
typing `light` or `Dovedale` never trips them (a test types them). The sound
engine's first-gesture start treats Enter as engagement everywhere and a
space in an editable field as text (`armGestureStart`, the WCAG 1.4.2 ruling)
— exactly the palette's behaviour, inherited unchanged.

## Commands

All output is composed from `content.ts`; none of it is new copy about the
owner.

| Command | Prints | Effect |
|---|---|---|
| `help` | a heading, then one row per command: usage and description | — |
| `about` | `about.paragraphs`, one block each | — |
| `projects` | each featured project: its id (what `open` takes) and `oneLiner`; then `moreProjects`: name, linked to `repoUrl` when it has one | — |
| `open <project>` | "opening {name}…" | same-tab navigation to `withBase("/projects/<id>/")`. Resolves the id exactly, then a unique prefix of the id or the name, ignoring case and punctuation (`plantpal` finds PlantPal+). A prefix that matches more than one project counts as not found. Only featured projects that have a case study. |
| `skills` | each `skills` group and its items | — |
| `contact` | `contact.headline`, then the email (`mailto:`), GitHub and LinkedIn from `links`, as real links (external ones open in a new tab with `noopener noreferrer`, like the rest of the site) | — |
| `resume` | one line saying the download started, plus the same link in case a blocker eats the programmatic click | downloads `withBase(links.resume)` through an anchor with `download` |
| `goto <section>` | — | `jumpToSection(id)`, then closes. Ids: `top` plus `navSections`; matched by id or label |
| `palette` | — | closes, then opens the palette on the next tick |
| `clear` | — | empties the log |
| `exit` | — | closes |
| anything else | "command not found: {name} — type help" | — |
| an empty line | nothing | — |

A command missing its argument prints its usage line
(`open: name a project — try projects`) rather than staying silent.

## The panel

- **Layout.** The palette's scrim (`fixed inset-0 z-100 … bg-ground/85`) and
  a panel `w-full max-w-2xl border border-signal bg-ground`. Header: a
  `.label` "Terminal" and the palette's `esc` kbd. One scroll region
  (`max-h` in `dvh`, so a phone keyboard does not push it off) holds the
  welcome line, the blocks and, last, the prompt row — as in a real
  terminal. It jumps to the bottom after each run. Footer: a `.label` row,
  "tab complete", "↑↓ history", "esc close" (arrows as lucide icons, like the
  palette's footer).
- **Blocks.** A block is an echo line (the `>` glyph, `aria-hidden`, then the
  typed text) followed by its output, separated from the previous block by
  `border-t border-rule-soft`. Output rows are text (`break-words`), link
  rows (real `<a>`, underlined, with the control swap `bg-signal text-ground`
  on hover and focus), and name/description rows (two columns from `sm`,
  stacked below). The log keeps the last 500 lines.
- **Prompt.** An `<input type="text">` with `autocomplete="off"`,
  `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`,
  `enterkeyhint="go"` and `maxLength` 200, named from content. Visible focus
  is not left to the caret: the rule above the prompt row goes from
  `border-rule` to `border-signal` on `focus-within`.
- **Semantics.** `role="dialog" aria-modal="true"` named "Terminal". The log
  is `role="log"` (polite, additions) so a screen reader hears each result as
  it lands; the prompt row is its sibling inside the same scroll region,
  never inside the live region. Tab cycles through the dialog's focusable
  elements (the prompt and any output links) and wraps; it never leaves the
  dialog. Output links are at least 24×24 CSS px (WCAG 2.2 target size) — the
  axe scan runs with output on screen to prove it.
- **Closing.** Esc, `exit`, Ctrl+backtick, or a press that *begins* on the
  scrim (the palette's drag-select regression: a click's target is the
  common ancestor of mousedown and mouseup). Focus returns to whatever
  opened it.

## One overlay at a time

Opening either overlay from the other is a hand-off: close first (silently),
open on the next tick, so the second overlay's focus-restore target is the
element that was focused before either, and the body scroll lock is released
and retaken in order. The `palette` command, Ctrl+K inside the terminal, the
palette's "Open the terminal" action and Ctrl+backtick inside the palette all
take that path. The overlay that handles the chord stops its propagation so
the other's window listener does not also fire.

## Words — the `content.ts` exports

Draft for the owner's review: interface language only, no claim about the
owner. `{name}` and `{ids}` are filled in by the interpreter. The export is
split in two so the closed-state strings the eager bundle needs do not drag
the rest of the copy with them (an object literal is not tree-shaken
property by property).

```ts
export const terminalEntry = {
  label: "Terminal",
  open: "Open the terminal",
  hint: "ctrl `",
} as const;

export const terminal = {
  prompt: ">",
  input: "Terminal command",
  welcome: "help lists the commands.",
  helpHeading: "Commands",
  commands: {
    help: "list the commands",
    about: "read the about section",
    projects: "list the projects",
    open: "open a project's case file",
    skills: "list the skills by group",
    contact: "email, GitHub, LinkedIn",
    resume: "download the résumé",
    goto: "jump to a section of the page",
    palette: "open the search palette",
    clear: "clear the screen",
    exit: "close the terminal",
  },
  usage: { open: "open <project>", goto: "goto <section>" },
  projectsFeatured: "Case files — open <project> reads one",
  projectsMore: "More projects",
  opening: "opening {name}…",
  resume: "résumé download started — if nothing happens, use the link:",
  resumeLink: "Résumé",
  unknown: "command not found: {name} — type help",
  openUsage: "open: name a project — try projects",
  openMissing: "open: no project named {name} — try projects",
  gotoUsage: "goto: name a section — {ids}",
  gotoMissing: "goto: no section named {name} — {ids}",
  footer: { complete: "tab complete", history: "history", close: "esc close" },
} as const;
```

## Files

Create: `src/components/Terminal.tsx`, `src/components/TerminalPanel.tsx`,
`src/lib/terminal.ts`, `src/lib/jump.ts`, `src/lib/terminalKeys.ts`,
`tests/terminal-unit.spec.ts`, `tests/terminal.spec.ts`.

Modify: `src/content.ts` (the two exports), `src/components/Nav.tsx`,
`src/components/CommandPalette.tsx`, `src/app/page.tsx`,
`src/app/projects/[id]/page.tsx`, `tests/brand.spec.ts` (the sweep),
`tests/csp.spec.ts` (open the terminal, run commands), `docs/DESIGN.md`,
`AGENTS.md`. No new CSS, colours or tokens are expected: the components use
the same Tailwind utilities as the palette. No new dependency (`lucide-react`
already ships `Terminal`).

## Budgets

- **Eager JS.** The shell, the button and the palette delta; target at most
  2 kB gzipped over today. The 214 kB ceiling in `scripts/check-budget.mjs`
  is the gate and is not raised. The plan measures before and after rather
  than assuming.
- **CSP.** Unchanged: no eval, workers, storage, network or origins.
  `tests/playwright.csp.config.ts` runs with the terminal opened and
  commands run.
- **Content lint.** The overlay renders nothing until opened, so the static
  HTML — what `npm run check:content` reads — is unchanged.

## Testing

**Unit** (`tests/terminal-unit.spec.ts`, Node, no browser): every registered
command appears in `help`; `about` returns exactly `about.paragraphs`;
`projects` lists each featured id with its `oneLiner`; `open` resolves by id,
case-insensitively, by unique prefix and by name, and reports usage and
not-found (an ambiguous prefix is not found); the `open` effect href goes
through `withBase`;
`skills` and `contact` return what `content.ts` holds; `goto` knows `top` and
every `navSections` id; an unknown word is named in the hint; an empty line
prints nothing; `complete` completes a unique prefix (command word and
`open`/`goto` argument) and leaves ambiguous or unmatched input alone.

**End to end** (`tests/terminal.spec.ts`): the button is visible at 1280, sits
after ctrl K in DOM order, has its accessible name, and is absent at 768; a
click opens the dialog with the prompt focused; backtick opens from the body
and does not open while typing in an input; Ctrl+backtick toggles from inside
the prompt; `help`, `about`, `projects`, `contact` print their content;
`open warden` reaches `/projects/warden/` (with the base path under the
sub-path build); `goto contact` closes and brings `#contact` into view;
`palette` leaves the terminal closed, the palette open, and Esc returns focus
to the element focused before either; an unknown word prints the hint;
`clear` and `exit` work; ↑ recalls the last line; Tab completes `he` to
`help`; Esc and a scrim press close and restore focus; a drag-select that
ends on the scrim does not close it; Tab and Shift+Tab wrap inside the
dialog; typing `light` and holding `l` for 400ms in the prompt never sets
`data-snuffed`; a phone viewport reaches the terminal through the palette and
the panel does not scroll horizontally; opening plays exactly one
`night-archive:ui-sound` event, kind `tap`.

**Existing gates, extended or unchanged:** axe at zero violations with the
terminal open and `help`, `projects` and `contact` on screen; the width sweep
(button present from `lg`, rail never overflows at any swept width);
`npm run lint`, `typecheck`, `build`, `test`, `budget`, `check:content`,
`check:links`, and the CSP and sub-path configs.

## Docs

- `docs/DESIGN.md`: a short Terminal section, and a sentence on the
  contract line saying it refuses the dark-terminal *skin*, not a terminal
  built in the lamplight's own voice.
- `AGENTS.md`: one bullet in the conventions, in the style of the night
  archive's — what it is, where the words live, that the interpreter is pure,
  the keys, one overlay at a time.

## Delivery

- Branch `feat/terminal`, in its own worktree, off the current
  `chore/tidy-root` HEAD. That commit (`b6b1e3c`) fixes three red CI tests, so
  branching from it keeps the baseline green; a branch off `main` would
  inherit them. The unrelated `package-lock.json` modification in the working
  tree is left alone.
- A baseline run (build, lint, typecheck, test, budget) on the base before
  any change, so a later failure is attributable.
- Commits per task, in the repo's style (`feat(terminal): …`).

## Open points (non-blocking; defaults chosen)

1. **Copy.** The `terminal` strings above are a draft in the site's voice;
   review them here.
2. **The bare backtick** is a single-character shortcut (WCAG 2.1.4), like
   the palette's `/`. Ctrl+backtick is the modifier route. If strict
   conformance matters more than convenience, the bare key can be dropped
   without touching anything else.
3. **Delivery base.** If `chore/tidy-root` is merged or abandoned first,
   rebase onto `main`.
