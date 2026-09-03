/**
 * Single source of truth for every word on the site.
 * Edit copy here — components only render what this file exports.
 */

import type { PlateId } from "@/lib/art";

/** Pass/fail only — reserved for verifiable outcomes (tests, CI). Module-
 *  internal — nothing outside this file imports it (B4/B5/B6/B8, final fix
 *  wave); un-exported rather than deleted, since `EvidenceSegment.tone`
 *  below still needs the type name. */
type ChipTone = "pass" | "fail";

export interface EvidenceSegment {
  label: string;
  tone?: ChipTone;
  href?: string;
  /** Previously rendered as a visibly-disabled "coming soon" chip
   *  (`BracketDisabled`, `Provenance.tsx`'s `s.disabled` branch) — both
   *  deleted (B3, final fix wave) once nothing in this file set this to
   *  `true` any more and the branch had gone unreachable. The field stays
   *  on the type rather than being removed outright, the same call this
   *  file makes for `Achievement.certificateUrl`'s retired `null` state
   *  below: re-add the render branch alongside it if a future evidence
   *  segment genuinely needs a pending state — don't leave dead rendering
   *  code live for a value nothing sets in the meantime. */
  disabled?: boolean;
}

export interface HeadlineNumber {
  value: string;
  label: string;
}

export interface FeaturedProject {
  /** One of the eight landing-page acts (`ActId`, declared below with
   *  `acts`) — every featured project has its own act, so `acts[id]` and
   *  `plates[acts[id].plate]` never need an unchecked cast at the call
   *  site. Forward reference to `ActId` is fine within one module. */
  id: ActId;
  name: string;
  timeframe: string;
  oneLiner: string;
  /** `**text**` marks the bullet's single strongest metric — rendered as a
   *  bold mono chip (`Metric.tsx`, `.metric`), not amber: ember is reserved
   *  for lit numbers only (see AGENTS.md's Ember-Is-Rare rule), and a
   *  static bullet emphasis is never an ignition.
   *
   *  The landing page no longer renders these bullets directly (its cards
   *  now show `oneLiner`/`headlineNumbers` instead) — `llms.txt`
   *  (`src/app/llms.txt/route.ts`) is the one remaining consumer, and a
   *  real one: it is the machine-readable summary of this site an LLM or
   *  crawler actually reads, so the field stays exported rather than
   *  getting deleted as dead. B1 (final fix wave) checked whether each
   *  bullet's claims were already fully covered in its own project's
   *  `caseStudies[id]` prose and, if not, relocated it verbatim — the
   *  precedent at `caseStudies.plantpal.approach` — but for warden and
   *  scheduler specifically, every claim in every bullet was already
   *  present elsewhere in that project's case study (verified token by
   *  token, not by eye), so nothing needed relocating there; only plantpal
   *  actually had bullets nothing else on the site stated. */
  bullets: string[];
  headlineNumbers?: HeadlineNumber[];
  /** One line rendered directly under `headlineNumbers`, glossing the
   *  block's own widest/hardest-to-parse value. Verbatim-or-condensed
   *  from existing copy only — never a new claim. Optional: only the
   *  scheduler card carries one today (its p-value needs a gloss the
   *  other two cards' numbers don't). */
  headlineNumbersCaption?: string;
  tech: string[];
  // Every featured project today has a real repo, so `null` is currently
  // unused — but the type stays nullable rather than tightened to
  // `string`, because a future project (a design study, a paper with no
  // public code) may genuinely have nothing to link. The call sites
  // (page.tsx, projects/[id]/page.tsx) simply omit the "Repository"
  // button when this is null, rather than rendering a disabled
  // placeholder — `BracketDisabled` and the equivalent branch this used to
  // read (`EvidenceSegment.disabled` in `Provenance.tsx`) were both
  // deleted (B3, final fix wave) once they had zero call sites left.
  repoUrl: string | null;
  /** The signature element: mono provenance line on every card. */
  evidence: EvidenceSegment[];
}

export interface MoreProject {
  name: string;
  timeframe: string;
  description: string;
  tech: string[];
  repoUrl?: string;
  /** Compact provenance line — every project card carries one. */
  evidence: EvidenceSegment[];
}

export const site = {
  title: "Rakshit Rameshbabu — Software & Security Engineer",
  /** P13: the meta-description budget is 155 characters — the original
   *  copy here ran 203. This is `hero.role` + `hero.positioning` (both
   *  below) joined verbatim, not new copy; `site` is declared before
   *  `hero` in this module so the join is hardcoded rather than
   *  referenced, but both source strings are unchanged. 136 chars. */
  description:
    "Software & Security Engineer — B.Tech (Cyber Security) @ VIT Chennai. I build full-stack products and backend systems, taken end-to-end.",
  /** Override with NEXT_PUBLIC_SITE_URL at build time (see README).
   *  Fallback is the real GitHub Pages project URL — absolute OG/sitemap
   *  URLs stay valid even when the env var is missing. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://rakshit-737.github.io/portfolio",
} as const;

export interface ProvenanceToken {
  label: string;
  href: string;
  /** Screen-reader-only proof text (`aria-describedby`) — what backs the
   *  claim, for the reader who can't infer it from the underlined label
   *  alone. */
  proof: string;
}

/**
 * Each token here is a real receipt, not a self-claim: the strip only
 * ever states what it can also link to. A token that stops having a real
 * receipt gets deleted, not kept as decoration.
 */
const provenanceTokens: readonly ProvenanceToken[] = [
  {
    label: "builds end-to-end",
    href: "/projects/warden/#outcome",
    proof:
      "See Warden's case file, Outcome section, for the built, tested, and deployed system this claim traces to.",
  },
  {
    label: "tested in CI",
    href: "https://github.com/rakshit-737/portfolio/actions",
    proof: "This site's own GitHub Actions history — CI runs on every push.",
  },
  {
    label: "reproducible",
    href: "https://github.com/rakshit-737/portfolio#build-static-export",
    proof:
      "This site's own README, Build (static export) section — a documented build from scratch.",
  },
] as const;

export const hero = {
  name: "Rakshit Rameshbabu",
  role: "Software & Security Engineer — B.Tech (Cyber Security) @ VIT Chennai",
  location: "Chennai, India",
  /** ≤14 words, condensed from `about.paragraphs[0]`'s opening sentence:
   *  "I build full-stack products and backend systems and take them
   *  end-to-end — from written requirements and architecture to
   *  CI-tested, reproducible deployments." No new claims, just trimmed. */
  positioning:
    "I build full-stack products and backend systems, taken end-to-end.",
  /** Typed once on page load. */
  provenance: {
    prefix: "verified:",
    tokens: provenanceTokens,
    /** Plain-text join for the OG card (Satori can't render links) —
     *  derived from `tokens` so the two can't drift. */
    text: provenanceTokens.map((t) => t.label).join(" · "),
  },
} as const;

/**
 * Mono stat strip under the hero CTAs — proof above the fold. Every value
 * traces elsewhere in this file:
 * - "3" is the count of `featuredProjects` below (warden, scheduler,
 *   plantpal) — "end-to-end" traces to `hero.provenance` and
 *   `about.paragraphs[0]`.
 * - "9.07" is `education[0].score`.
 * - "6" is `featuredProjects[0].headlineNumbers[0]` (Warden's six
 *   analyzers), explained inline rather than left as a bare proper noun —
 *   see `featuredProjects[0].oneLiner`.
 * The old facts (45,432 dispatch instants, 40 tests in CI) are not
 * deleted from the site — they still render as headline numbers inside
 * the scheduler and warden acts further down the page.
 */
export const heroStats: HeadlineNumber[] = [
  // "requirements → CI" and not "→ deploy": one of the three counted
  // systems (the scheduler) is a research study whose end state is a
  // reproducible pipeline and manuscript, not a deployment — the label
  // must be true of all three it counts.
  { value: "3", label: "systems built end-to-end — requirements → CI" },
  { value: "9.07", label: "CGPA / 10 — VIT Chennai" },
  {
    value: "6",
    label: "security analyzers in Warden, my supply-chain firewall",
  },
];

export const links = {
  github: { label: "GitHub", url: "https://github.com/rakshit-737" },
  linkedin: {
    label: "LinkedIn",
    url: "https://linkedin.com/in/rakshit-rameshbabu",
  },
  email: "rakshitoffl@gmail.com",
  /** P13: every on-site link now points at the named file — clearer in a
   *  browser's download tray than "resume.pdf". The old `/resume.pdf` path
   *  (`public/resume.pdf`, byte-identical copy) is kept serving too, so any
   *  link to it from outside this repo doesn't break. */
  resume: "/rakshit-rameshbabu-resume.pdf",
} as const;

/**
 * Contact section copy. The headline states what the owner confirmed
 * during the product interview: both internships and full-time roles.
 */
export const contact = {
  headline:
    "Open to internships and full-time roles in software and security engineering.",
  body: "The fastest way to reach me is email — copy it here, or find me on GitHub and LinkedIn.",
  /** The owner asked for a thank-you at the close of the record. One
   *  quiet line, in the site's mono voice — not a second statement. */
  closing: "Thank you for reading this far.",
} as const;

export const about = {
  paragraphs: [
    "B.Tech Computer Science (Cyber Security) student at VIT Chennai, CGPA 9.07. I build full-stack products and backend systems and take them end-to-end — from written requirements and architecture to CI-tested, reproducible deployments.",
    "My work sits at the intersection of software engineering, security, and applied ML: a supply-chain firewall for PyPI packages, a published-grade evaluation study of ML job scheduling, and a cross-platform wellness app. I work AI-native — LLM coding tools are part of my daily loop for prototyping, debugging, test generation, and review.",
  ],
  interests: [
    "scalable backend systems",
    "applied AI/ML",
    "security research",
    "post-quantum cryptography",
  ],
} as const;

export const featuredProjects: FeaturedProject[] = [
  {
    id: "warden",
    name: "Warden — Software Supply-Chain Firewall",
    timeframe: "Jul 2026",
    oneLiner:
      "Behavioral firewall for open-source dependencies; fuses rule-based and ML signals into a 0–100 risk verdict.",
    bullets: [
      "Statically analyzes PyPI packages (no code execution), fusing **six independent analyzers** — metadata/provenance, AST behavior, install-time execution, typosquatting, obfuscation, IOC matching — into explainable, per-signal risk evidence.",
      "Calibrated ML model (RandomForest + IsolationForest) fused with a tiered rule engine into a **0–100 score**; allow/warn/block policy enforced via a REST API, a CLI/CI gate, and a React dashboard.",
      "Hardened against attacker-authored input (anti-zip-bomb, anti-path-traversal extraction); JWT auth with refresh rotation, argon2id hashing, RBAC, rate limiting, append-only audit trail; **40 automated tests in CI**.",
    ],
    tech: [
      "Python 3.12",
      "FastAPI",
      "SQLAlchemy 2",
      "scikit-learn",
      "PostgreSQL",
      "Redis",
      "React 18",
      "TypeScript",
      "Docker",
    ],
    repoUrl: "https://github.com/rakshit-737/warden-supply-chain-firewall",
    headlineNumbers: [
      { value: "6", label: "independent analyzers" },
      { value: "0–100", label: "risk verdict" },
      { value: "40", label: "tests in CI" },
    ],
    evidence: [
      { label: "2026-07" },
      { label: "active" },
      { label: "python · fastapi · react" },
      {
        label: "repo",
        href: "https://github.com/rakshit-737/warden-supply-chain-firewall",
      },
      { label: "40 tests · CI", tone: "pass" },
    ],
  },
  {
    id: "scheduler",
    name: "Proactive Feasibility Scheduler",
    timeframe: "Research, 2026–Present",
    // P12: reordered so the outcome leads — was "An evaluation study of
    // ML-based GPU-cluster job scheduling — and a proven negative result."
    // Same two clauses, swapped around the dash; no claim added or removed.
    oneLiner:
      "A proven negative result — an evaluation study of ML-based GPU-cluster job scheduling.",
    bullets: [
      "End-to-end research pipeline: discrete-event cluster simulator, XGBoost wait-time regressor, **14-policy benchmark** (FCFS, SJF, EASY/conservative backfill, SRPT, HRRN, ML) with Holm-adjusted significance testing.",
      "Core finding: the learned scheduler is structurally degenerate — its queue ordering collapses to a sort by requested job size. Verified across **45,432 real dispatch instants with zero counterexamples**; equivalence established with paired TOST (p = 2.6×10⁻¹⁶) rather than difference tests.",
      "Validated on real supercomputer traces (LANL CM-5, SDSC SP2) via second-exact event replay: the simulated ML gain does not replicate. Fully reproducible (seeded pipeline, Docker, CI); LaTeX manuscript in progress.",
    ],
    headlineNumbers: [
      { value: "0", label: "counterexamples" },
      { value: "45,432", label: "dispatch instants" },
      { value: "p = 2.6×10⁻¹⁶", label: "paired TOST" },
    ],
    // P12 §3: condensed verbatim from `caseStudies.scheduler.decisions[0]`'s
    // body ("Running a paired TOST equivalence test instead makes the tie
    // the finding: sorting by requested size is statistically equivalent to
    // the full XGBoost pipeline, p = 2.6×10⁻¹⁶.") — glosses what the p-value
    // above actually means, in plain English.
    headlineNumbersCaption:
      "Sorting by requested size is statistically equivalent to the full XGBoost pipeline.",
    tech: [
      "Python",
      "XGBoost",
      "scikit-learn",
      "NumPy/pandas",
      "discrete-event simulation",
      "TOST/Holm statistics",
      "Docker",
    ],
    repoUrl: "https://github.com/rakshit-737/proactive-feasibility-scheduler",
    evidence: [
      { label: "2026–present" },
      { label: "research" },
      { label: "python · xgboost" },
      {
        label: "repo",
        href: "https://github.com/rakshit-737/proactive-feasibility-scheduler",
      },
      { label: "seeded · docker · CI", tone: "pass" },
    ],
  },
  {
    id: "plantpal",
    name: "PlantPal+ — Full-Stack Daily Wellness & Plant-Care Platform",
    timeframe: "2026–Present",
    oneLiner:
      "Cross-platform app unifying plant care, fitness, and nutrition in one daily dashboard with streaks, reminders, and cloud sync.",
    bullets: [
      "TypeScript monorepo: React Native (Expo) mobile app, React + Vite web app, Node.js/Express REST API on PostgreSQL; node-cron reminder engine; 11-table JWT auth service with a custom migration runner; GitHub Actions CI.",
      "Full SDLC before implementation: 36 requirements documents (**228 functional requirements**, 111 NFRs, 119 user stories, 89 use cases), system architecture, database schema, API specification.",
      "Unit-tested scientific domain layer (Mifflin-St Jeor/TDEE energy models, workout energy/1RM/volume, species- and season-aware watering intervals); offline-light sync via an append-only event log with client-generated UUID idempotency keys.",
    ],
    tech: [
      "TypeScript",
      "React Native (Expo)",
      "React",
      "Node.js/Express",
      "PostgreSQL",
      "node-cron",
      "GitHub Actions",
    ],
    repoUrl: "https://github.com/rakshit-737/PlantPal-Plus",
    headlineNumbers: [
      { value: "228", label: "functional requirements" },
      { value: "119", label: "user stories" },
      { value: "89", label: "use cases" },
    ],
    evidence: [
      { label: "2026–present" },
      { label: "in active development" },
      { label: "typescript · expo · express" },
      { label: "repo", href: "https://github.com/rakshit-737/PlantPal-Plus" },
      { label: "unit-tested · CI", tone: "pass" },
    ],
  },
];

/* ---- Case studies (/projects/[id]) ---------------------------------- */

export interface DiagramStep {
  label: string;
  sub?: string;
  /** The single verdict/output node — rendered as a filled (bone
   *  background, ground text) chamber, not ember; DiagramFlow.tsx's own
   *  inversion, distinct from `.ignite`. */
  accent?: boolean;
}

export interface CaseDecision {
  title: string;
  body: string;
}

export interface CaseEvidenceRow {
  label: string;
  value: string;
  href?: string;
}

export interface CaseStudy {
  /** Matches FeaturedProject.id — cards link "read the case file →". */
  id: string;
  problem: string[];
  approach: string[];
  diagram: DiagramStep[];
  diagramTitle: string;
  decisions: CaseDecision[];
  evidence: CaseEvidenceRow[];
  outcome: string[];
  next: string[];
  /** One line under the act's "Read the case file" button — condensed
   *  verbatim from this study's own `outcome[0]`, never a new claim. Each
   *  entry below names the exact sentence(s) it draws from. */
  teaser: string;
}

/**
 * The five sections every case file renders, in order — the single list
 * `src/app/projects/[id]/page.tsx`'s `<CaseSection slug="…" title="…">`
 * calls and `CommandPalette.tsx`'s jump-to-section commands both derive
 * from (D10, final fix wave: these two files used to each hand-type their
 * own identical copy of this five-item list — one text change to a title
 * updated one and not the other silently). Each field of `CaseStudy` above
 * that a section renders shares that section's own `slug` for a reason:
 * `problem`/`approach`/`decisions`/`outcome` are direct name matches, and
 * `evidence` too, even though the section itself blends in the study's
 * `next` array as well.
 */
export const caseSections = [
  { slug: "problem", title: "Problem" },
  { slug: "approach", title: "Approach" },
  { slug: "decisions", title: "Decisions" },
  { slug: "evidence", title: "Evidence" },
  { slug: "outcome", title: "Outcome" },
] as const;

/**
 * Case-study copy. Every claim traces to the linked repo's README or to
 * the card bullets above — drafted from those sources, fact-checked
 * against them, nothing invented.
 */
export const caseStudies: Record<string, CaseStudy> = {
  warden: {
    id: "warden",
    problem: [
      "`pip install` runs third-party code at the full privilege of whoever invoked it. Attackers exploit exactly that surface: malicious publishes with install-time exfiltration, typosquatting (reqeusts vs requests), and dependency confusion.",
      "CVE-based scanners match known vulnerabilities, so a never-before-seen threat passes them by construction. Warden takes the other route — behavioral analysis instead of signatures — and judges what a package would actually do.",
    ],
    approach: [
      "A FastAPI backend orchestrates the pipeline. A PyPI fetcher pulls the package under hostile-input guards — anti-zip-bomb, anti-path-traversal — and never executes package code. Six analyzers then run over the artifact: metadata/provenance, AST behavior, install-time execution, typosquatting, obfuscation, and known-IOC matching, each emitting explainable per-signal risk evidence.",
      "A hybrid scorer fuses the rule signals with ML — RandomForest for non-linear risk probability, IsolationForest for unsupervised novelty — conservatively, into a single 0–100 score. A policy engine maps that score to allow/warn/block; results persist to PostgreSQL with Redis caching, and the verdict is enforced through a REST API, a CLI/CI gate, and a React dashboard.",
      "The frontend is React 18 + TypeScript on Vite, with Tailwind and Recharts. End to end, a verdict returns in a few hundred milliseconds.",
    ],
    diagram: [
      { label: "pypi fetcher", sub: "safe extract · no exec" },
      { label: "six analyzers", sub: "AST · typosquat · IOC" },
      { label: "hybrid scorer", sub: "rules + ML, fused" },
      { label: "policy engine", sub: "allow · warn · block", accent: true },
      { label: "enforcement", sub: "API · CLI · dashboard" },
    ],
    diagramTitle:
      "Warden pipeline: PyPI fetcher → six analyzers → hybrid scorer → policy engine → API/CLI/dashboard enforcement",
    decisions: [
      {
        title: "Two-tier signal classification",
        body: "Not every suspicious capability deserves equal weight. Primary indicators — install-time network or eval, an IOC match, a typosquat name, an obfuscated loader — each drive high or critical risk on their own. Supporting capabilities only accumulate toward a capped ceiling, a guard against false positives on complex-but-benign packages like NumPy.",
      },
      {
        title: "Zero code execution, hostile input assumed",
        body: "Every package is treated as attacker-authored. Extraction is guarded against zip bombs and path traversal and bounded by size, time, and count caps; package code is never executed at any stage of analysis. The test suite includes adversarial-extraction security tests to hold that line.",
      },
      {
        title: "Conservative ML fusion with graceful degradation",
        body: "The ML layer pairs a RandomForest (non-linear risk probability) with an IsolationForest (unsupervised novelty), and its output is fused conservatively with the rule engine rather than trusted outright. When the model is absent, scoring degrades gracefully to rules-only.",
      },
      {
        title: "Synthetic training data, swappable by design",
        body: "Real malicious package corpora are not redistributable, so the model is trained on synthetic data — the project's stated trade-off. The pipeline is designed so replacing that corpus is a one-file swap.",
      },
    ],
    evidence: [
      { label: "requests", value: "risk 25 — low" },
      { label: "flask", value: "risk 31 — low" },
      { label: "numpy", value: "risk 40 — medium" },
      {
        label: "typosquat + install-time exfil (synthetic)",
        value: "risk 100 — block",
      },
      { label: "obfuscated base64 loader (synthetic)", value: "risk 100 — block" },
      { label: "credential stealer (synthetic)", value: "risk 100 — block" },
    ],
    outcome: [
      "What stands measured today: the scorer separates what it has been pointed at. requests and flask score low; numpy — the kind of complex-but-benign package the two-tier design exists to protect — lands at 40, medium, not blocked; all three synthetic malicious samples score 100 and are blocked. Verdicts come back in a few hundred milliseconds.",
      "The engineering around the verdict is in place: 40 tests run fully offline in GitHub Actions (SQLite, in-process caching), adversarial-extraction tests included, and Docker Compose brings up the full stack. Production posture is already built — JWT auth with refresh rotation, argon2id, RBAC, rate limiting, structured logging with request IDs, an append-only audit trail, Alembic migrations, read-only non-root containers. The honest gap: the blocked samples are synthetic, and the model trains on synthetic data — real malicious-package corpora are not redistributable; the pipeline is built for a one-file corpus swap when labeled real data becomes available.",
    ],
    next: [
      "npm ecosystem analyzers",
      "Dynamic sandbox detonation (gVisor/Firecracker)",
      "Transitive dependency-tree scanning",
      "PEP 503 registry proxy for inline blocking",
      "Analyst-override retraining loops",
    ],
    // Condensed verbatim from outcome[0]: "requests and flask score low;
    // numpy ... lands at 40, medium, not blocked; all three synthetic
    // malicious samples score 100 and are blocked."
    teaser:
      "requests scores low, numpy lands at 40 — all three synthetic samples score 100 and are blocked.",
  },
  scheduler: {
    id: "scheduler",
    problem: [
      'The research question is narrow and testable: can machine learning improve GPU-cluster job scheduling via learned wait-time prediction? The intuition behind an ML "Proactive" scheduler is that a model predicting each queued job\'s wait from live cluster state should order the queue better than classical heuristics.',
      "This study answers that question end to end — and the answer is a proven negative result. The learned scheduler is structurally degenerate: its queue ordering collapses to a sort by requested job size.",
    ],
    approach: [
      "The pipeline begins with a discrete-event cluster simulator (01_simulation/) and an XGBoost regressor that predicts per-job wait time from 12 cluster-state features (can_fit_now, gpu_fit_ratio, node_availability, queue_pressure, and others). On a 20% holdout with 5-fold cross-validation the regressor reaches R² ≈ 0.84 and MAE ≈ 4.69 — the regressor fits its training distribution well.",
      "Fourteen policies run against the simulator — FCFS, SJF (oracle, estimated, modal), SRPT, EASY and conservative backfill, HRRN, and the ML Proactive scheduler — with Holm-adjusted significance testing. Validation then moves off synthetic workloads onto real supercomputer traces from the Parallel Workloads Archive: LANL CM-5 and SDSC SP2, replayed second-exact, 12 policies across 20 paired 7-day windows at load ≈ 0.70, using the real user runtime estimates recorded in the traces.",
      "The degeneracy audit (04_scheduler/ranking_degeneracy.py) asks one question of the full pipeline: can the learned score ever rank two identically-sized queued jobs differently? Everything is reproducible — bash run_all_experiments.sh, Python 3.11+, seeded runs, Docker, CI.",
    ],
    diagram: [
      { label: "simulator", sub: "discrete-event cluster" },
      { label: "xgboost regressor", sub: "wait-time, R² ≈ 0.84" },
      { label: "14-policy bench", sub: "Holm-adjusted stats" },
      { label: "trace replay", sub: "LANL CM-5 · SDSC SP2" },
      { label: "degeneracy audit", sub: "45,432 instants" },
      { label: "negative result", sub: "TOST p = 2.6×10⁻¹⁶", accent: true },
    ],
    diagramTitle:
      "Study pipeline: simulator → XGBoost regressor → 14-policy benchmark → real-trace replay → degeneracy audit → proven negative result",
    decisions: [
      {
        title: "Test equivalence, not difference",
        body: "A standard Holm-adjusted difference test between the ML scheduler and a size sort returns p = 0.17 — no detectable difference, and the tie stays hidden. Running a paired TOST equivalence test instead makes the tie the finding: sorting by requested size is statistically equivalent to the full XGBoost pipeline, p = 2.6×10⁻¹⁶.",
      },
      {
        title: "Prove the degeneracy structurally",
        body: "At any single dispatch instant, cluster-state features take the same value for every queued job — 7 of the 12 features vary across the queue in 0.0% of instants. That makes the learned score a function of requested size alone, and the audit confirms it empirically: zero counterexamples in 45,432 real dispatch instants where two identically-sized queued jobs scored differently.",
      },
      {
        title: "Replay real traces second-exact",
        body: "The synthetic benchmark looked favorable: 7.9% ± 9.4% mean wait reduction vs FIFO over 40 paired runs (paired t, p = 2.0×10⁻⁶). But GPU utilization was unchanged (~64%), tail latency worsened (~58 → 123 ts), and Gini fairness degraded (0.53 → 0.79) — and on real traces the headline gain proved machine-dependent: −20.4% vs FCFS on SDSC (p = 0.042) but −4.5%, p = 0.48, on LANL.",
      },
      {
        title: "Name the honest baseline",
        body: "The control implied by this feature set is not FIFO — it is a sort by requested size, which needs no training, no inference, and no monitoring. Judged against that ML-free control, the learned scheduler adds nothing: both land on the same mean wait (145.0) in the SDSC replay.",
      },
    ],
    evidence: [
      { label: "Dispatch instants audited", value: "45,432 — zero counterexamples" },
      { label: "Equivalence to size sort (paired TOST)", value: "p = 2.6×10⁻¹⁶" },
      { label: "Regressor, 20% holdout / 5-fold CV", value: "R² ≈ 0.84 · MAE ≈ 4.69" },
      {
        label: "Synthetic gain vs FIFO (40 paired runs)",
        value: "7.9% ± 9.4% (p = 2.0×10⁻⁶)",
      },
      { label: "SJF vs ML Proactive, SDSC", value: "20.2% lower wait (Holm p = 0.009)" },
      { label: "Zero-shot transfer, both real traces", value: "R² ≈ 0" },
    ],
    outcome: [
      "What stands proven as of v3.4: the learned score is a function of requested job size alone. Across 45,432 real dispatch instants, two identically-sized queued jobs never scored differently, and paired TOST (p = 2.6×10⁻¹⁶) establishes that a size sort is equivalent to the XGBoost pipeline. The simulated gain does not replicate on real hardware traces — the ML scheduler beats FCFS on SDSC (−20.4%, p = 0.042) but not on LANL (−4.5%, p = 0.48), plain SJF beats it by 20.2% (Holm p = 0.009) on SDSC and 15.3% on LANL, and transfer is weak: zero-shot R² ≈ 0 on both traces, 0.49 (SDSC) and 0.10 (LANL) after retraining.",
      "The constructive output is three findings. A wait-time feature set can only produce a meaningful ranking if it contains a per-job attribute that is not a function of size given cluster state; the honest baseline for an ML scheduler is the ML-free control its feature set implies, not FIFO; and equivalence tests are required — the difference test (Holm-adjusted p = 0.17) would have hidden the tie. The replay also surfaced side results: EASY backfill costs +74% mean wait under real estimate error versus perfect estimates (LANL, p = 0.025), and real estimate distributions (SDSC median 6.91× over-estimate with 0.1% under; LANL 1.51× with 36.3% under-estimates) do not match the f-model's 3.0× over-only assumption.",
    ],
    next: [
      "Finish the LaTeX manuscript, in progress at phases_22_30/phase_28_manuscript/manuscript.tex.",
      "Per-job attributes that satisfy the non-degeneracy condition — runtime estimates, user history, partition identity — define what any non-degenerate successor feature set must contain.",
    ],
    // Condensed verbatim from outcome[0]: "the learned score is a function
    // of requested job size alone" and "...establishes that a size sort is
    // equivalent to the XGBoost pipeline" (p = 2.6×10⁻¹⁶, also outcome[0]).
    teaser:
      "the learned score is a function of requested job size alone — a size sort is statistically equivalent to the full XGBoost pipeline, p = 2.6×10⁻¹⁶.",
  },
  plantpal: {
    id: "plantpal",
    problem: [
      "Plant care, fitness, and nutrition apps each implement the same daily loop — schedule, remind, log, streak, reflect — separately. PlantPal+ unifies all three domains in one loop, implemented once, across a mobile app, a web app, and a REST API.",
      "The engineering problem underneath is duplication: when a watering calculator or a calorie formula is reimplemented per platform, the implementations drift. This project treats a single shared domain implementation, with bit-for-bit agreement between server and clients, as a hard requirement rather than an aspiration.",
    ],
    approach: [
      "The codebase is a TypeScript monorepo on npm workspaces: packages/shared holds the domain logic used identically by all clients — the watering schedule calculator, the Atwater energy identity, and Mifflin-St Jeor BMR are each implemented once. apps/api is an Express + TypeScript REST service on PostgreSQL, apps/web is React + Vite, apps/mobile is React Native with Expo.",
      "Specification came before implementation. Phase 1 produced 36 documents: 228 functional requirements, 307 business rules, 111 NFRs across 13 quality attributes, 119 user stories with Gherkin acceptance criteria, 89 fully-specified use cases, and 119 Mermaid diagrams. Phase 2 added system architecture, an OpenAPI 3.1 spec, sequence diagrams, and ADRs; Phase 3 mapped artifacts back to requirements for traceability.",
      "Auth uses JWT with a 32+ character access secret, a refresh-token flow, and a 30-day account deletion window that blocks session renewal. Sync is an append-only event log: only three operations queue offline (watering events, workout records, meals), each carrying a client-generated UUID idempotency key that the server upserts by — conflict-free by construction, with no CRDTs or last-write-wins. All other operations require connectivity explicitly.",
      /* Relocated verbatim from featuredProjects[2].bullets when the landing
         page stopped rendering bullets — these claims appear nowhere else. */
      "TypeScript monorepo: React Native (Expo) mobile app, React + Vite web app, Node.js/Express REST API on PostgreSQL; node-cron reminder engine; 11-table JWT auth service with a custom migration runner; GitHub Actions CI.",
      "Unit-tested scientific domain layer (Mifflin-St Jeor/TDEE energy models, workout energy/1RM/volume, species- and season-aware watering intervals); offline-light sync via an append-only event log with client-generated UUID idempotency keys.",
    ],
    diagram: [
      { label: "spec phase", sub: "36 docs · 228 FRs" },
      { label: "shared domain pkg", sub: "one impl, all clients" },
      { label: "express + postgres", sub: "JWT · event log" },
      { label: "web + mobile", sub: "React · Expo" },
      { label: "ci: 307 tests", sub: "Node 20.11 + 22" },
      { label: "deploy", sub: "Pages live · Render", accent: true },
    ],
    diagramTitle:
      "PlantPal+ pipeline: spec phase → shared domain package → Express/PostgreSQL API → web + mobile clients → CI (307 tests) → deployment",
    decisions: [
      {
        title: "Spec-first, then code",
        body: "Writing 36 requirements documents before implementation is an unusual amount of specification for a project of this size, but it made the rest checkable: algorithm test vectors come from the specs, and Phase 3 traceability maps artifacts back to requirements. The 53 shared-package tests verify the domain formulas against those spec-derived vectors.",
      },
      {
        title: "One domain implementation, three clients",
        body: "The watering calculator is species-, season-, light-, and pot-aware; its canonical test vector is 7 × 0.80 × 1.10 × 0.80 × 1.00 = 4.928, rounded to 5 days. Because the calculator, Mifflin-St Jeor, and Atwater live only in packages/shared, server and clients agree bit-for-bit — there is no second implementation to drift.",
      },
      {
        title: "Offline sync without CRDTs",
        body: "Rather than solve general conflict resolution, the design narrows the offline surface to three append-only operations, each idempotent via a client-generated UUID key the server upserts by. That makes sync conflict-free by construction. Everything else explicitly requires connectivity — a documented constraint, not an accident. 24 mobile tests cover the offline outbox.",
      },
      {
        title: "Adversarial audits as a quality gate",
        body: "Two adversarial multi-agent audits were run against the system; they found 6 critical and 4 major defects, all fixed. Combined with CI running typecheck plus the full 307-test suite on Node 20.11 and 22 for every push and PR — with a PostgreSQL service container for integration tests — regressions have to get past both.",
      },
    ],
    evidence: [
      { label: "Functional requirements", value: "228 (+ 307 business rules, 111 NFRs)" },
      { label: "Spec documents (Phase 1)", value: "36" },
      { label: "Use cases / user stories", value: "89 / 119 (Gherkin acceptance criteria)" },
      { label: "Automated tests", value: "307 — 53 shared · 158 API · 24 mobile · 72 web" },
      { label: "Audit defects found & fixed", value: "6 critical + 4 major" },
      { label: "Seeded Indian catalogue", value: "94 plant species · 180 foods" },
    ],
    outcome: [
      "Today the web app is live on GitHub Pages, and the API deploys via a one-click Render Blueprint — the free tier sleeps after 15 idle minutes, so a keep-alive via UptimeRobot or a GitHub Actions /healthz ping every 10 minutes is documented. Mobile EAS builds are pending. All 307 tests, including the 12-test auth integration suite against real PostgreSQL, run in CI on every push and PR.",
      "The gaps are stated rather than hidden: images are URL-only with no object storage, quiet hours are not enforced by the notification dispatcher, there is no purge sweep after the 30-day deletion window, no mail provider is wired (password reset and email verification tokens exist in the schema), custom foods are undeletable, and there is no push retry. Phase 6 — deployment — is in progress. MIT licensed.",
    ],
    next: [
      "Finish Phase 6 (deployment), including EAS builds for mobile",
      "Wire a mail provider for the password reset and email verification tokens already in the schema",
      "Enforce quiet hours in the notification dispatcher",
      "Add object storage for images (currently image URL only)",
      "Add a purge sweep after the 30-day deletion window",
      "Make custom foods deletable and add push notification retry",
    ],
    // Condensed verbatim from outcome[0]: "the web app is live on GitHub
    // Pages, and the API deploys via a one-click Render Blueprint" and
    // "All 307 tests ... run in CI on every push and PR."
    teaser:
      "the web app is live on GitHub Pages, the API deploys via a one-click Render Blueprint, and all 307 tests run in CI on every push and PR.",
  },
};

/**
 * Research Spotlight — the constructive takeaway from the scheduler study,
 * pulled out as its own section per the site layout. `eyebrow` (a
 * "Research spotlight" label) was removed here (B2, final fix wave): it
 * duplicated the role `acts.research.label` already carries on the
 * rendered page, and this file's own header forbids a dead visible-copy
 * field — do not re-add it as decoration.
 */
export const researchSpotlight = {
  context:
    "From the Proactive Feasibility Scheduler study — a proven negative result, verified across 45,432 real dispatch instants. LaTeX manuscript in progress.",
  quote:
    "a wait-time feature set can only produce a meaningful ranking if it contains a per-job attribute that is not a function of size given cluster state — and the honest baseline for an ML scheduler is the ML-free control its feature set implies, not FIFO.",
  repoUrl: "https://github.com/rakshit-737/proactive-feasibility-scheduler",
} as const;

/**
 * Real per-policy results from the scheduler study's trace replay
 * (RESULTS.md → 05_results/trace_schedulers, SDSC SP2 trace). The two
 * highlighted rows are the finding: the ML scheduler and the ML-free
 * size-sort control land on the same number.
 */
export interface BenchmarkPolicy {
  name: string;
  wait: number;
  /** The finding rows: ML result == ML-free control. */
  highlight?: boolean;
}

export const benchmarkChart: {
  title: string;
  unit: string;
  source: string;
  note: string;
  policies: BenchmarkPolicy[];
} = {
  title: "Mean wait by policy — SDSC SP2 trace, second-exact replay",
  unit: "simulated time units, lower is better",
  source: "05_results/trace_schedulers",
  note: "Proactive (XGBoost) ties its own ML-free control, Smallest-first — the degeneracy, visualized.",
  policies: [
    { name: "SRPT (oracle, preemptive)", wait: 60.1 },
    { name: "SJF (oracle)", wait: 110.8 },
    { name: "SJF (real user estimates)", wait: 115.8 },
    { name: "Proactive + estimate feature", wait: 125.0 },
    { name: "HRRN (real estimates)", wait: 126.3 },
    { name: "Smallest-first (no ML)", wait: 145.0, highlight: true },
    { name: "Proactive (XGBoost)", wait: 145.0, highlight: true },
    { name: "FCFS + first-fit", wait: 174.6 },
    { name: "EASY backfill (oracle)", wait: 183.7 },
    { name: "EASY backfill (real estimates)", wait: 195.1 },
    { name: "Conservative backfill", wait: 207.5 },
    { name: "Strict FIFO", wait: 755.1 },
  ],
} as const;

/**
 * Exhibit copy — the framed "museum plate" artifacts rendered inside each
 * act's `.scrim` content layer (`Exhibit.tsx`), presenting the actual
 * product rather than only describing it. Nothing here is a new claim:
 * warden's `rows` are labels resolved against `caseStudies.warden.evidence`
 * at render time (`src/app/page.tsx`), so the terminal can never drift from
 * that table, and the scheduler's caption is composed directly from
 * `benchmarkChart` above. The plantpal shots are placeholders — see the
 * dormant-render note at the call site and `public/exhibits/README.md`.
 */
export interface WardenExhibit {
  caption: string;
  /** Labels selected from `caseStudies.warden.evidence`, in display
   *  order. Resolved against that table at render time; a label that
   *  stops matching a row fails the build loudly rather than silently
   *  dropping a line. */
  rows: string[];
}

export interface SchedulerExhibit {
  caption: string;
}

export interface PlantpalExhibitShot {
  /** Path stem under `public/exhibits/`, unbased, no extension. The
   *  render site checks for `${stem}.avif` and `${stem}.webp` and skips
   *  the shot entirely when either is missing — the same convention a
   *  pending certificate scan already uses (`certificateThumb()`,
   *  src/app/page.tsx). */
  stem: string;
  /** Placeholder, condensed from `featuredProjects[2].oneLiner` and
   *  `caseStudies.plantpal.approach` — rewrite once the real screenshot
   *  exists to describe what that specific image actually shows. */
  alt: string;
}

export interface PlantpalExhibit {
  caption: string;
  shots: PlantpalExhibitShot[];
}

export const exhibits: {
  warden: WardenExhibit;
  scheduler: SchedulerExhibit;
  plantpal: PlantpalExhibit;
} = {
  warden: {
    caption:
      "WARDEN CLI GATE — VERDICTS FROM THE EVIDENCE TABLE · SYNTHETIC ATTACK SAMPLES",
    rows: ["requests", "numpy", "typosquat + install-time exfil (synthetic)"],
  },
  scheduler: {
    // The chart's own former title/unit/source lines, concatenated — see
    // the P3 brief: "its existing caption/source line becomes the exhibit
    // caption."
    caption: `${benchmarkChart.title} · ${benchmarkChart.unit} · source: ${benchmarkChart.source}`,
  },
  plantpal: {
    caption: "PLANTPAL+ — DAILY DASHBOARD & STREAKS, FROM THE LIVE APP",
    shots: [
      {
        stem: "/exhibits/plantpal-dashboard",
        alt: "PlantPal+'s daily dashboard, unifying plant-care, workout, and nutrition tasks in one view.",
      },
      {
        stem: "/exhibits/plantpal-streaks",
        alt: "PlantPal+'s streaks screen, showing consecutive-day counts across plant care, workouts, and meals.",
      },
    ],
  },
};

export const moreProjects: MoreProject[] = [
  {
    name: "Taintwall — AI Agent Tool-Boundary Firewall",
    timeframe: "Jul 2026",
    description:
      "In-process provenance and policy firewall for AI agent tool boundaries, defending against indirect prompt injection; four defense layers (Unicode/markup normalization, content-signal classifier, intent-gated policy, argument-level provenance) plus an attack harness and labelled corpus — measured **43% → 0% exfiltration** with benign utility intact.",
    tech: ["Python"],
    repoUrl: "https://github.com/rakshit-737/taintwall",
    evidence: [
      { label: "2026-07" },
      { label: "phase 2" },
      { label: "python" },
      { label: "repo", href: "https://github.com/rakshit-737/taintwall" },
    ],
  },
  {
    // Every claim transcribed from the repo's README (fetched 2026-08-30);
    // dates from the GitHub API (created 2026-07-31, last push 2026-08-30).
    name: "DocForge — Personal Document Studio",
    timeframe: "Jul 2026",
    description:
      "Client-side document studio that turns Markdown into typeset PDFs and Word documents — a live paginated preview that is itself the editing surface, automatic table of contents with real page numbers, per-page footnotes, numeric or author–year citations, cross-references, and LaTeX math exported to Word as real editable equations — in **one self-contained HTML file**: no account, no server, works offline. MIT licensed.",
    tech: ["JavaScript", "KaTeX"],
    repoUrl: "https://github.com/rakshit-737/docforge",
    evidence: [
      { label: "2026-07" },
      { label: "active" },
      { label: "javascript" },
      { label: "repo", href: "https://github.com/rakshit-737/docforge" },
    ],
  },
  {
    name: "SentinelCore — OS-Level Malware Analysis Framework",
    timeframe: "Aug 2025",
    description:
      "Kernel-level malware analysis with real-time syscall monitoring (strace/eBPF); container-free isolation via Linux namespaces and cgroups; multi-engine detection pipeline (entropy analysis, ClamAV, VirusTotal API, AI-assisted log analysis).",
    tech: ["Python", "C", "Linux", "eBPF"],
    evidence: [
      { label: "2025-08" },
      { label: "completed" },
      { label: "python · c · eBPF" },
    ],
  },
  {
    name: "Web Application Security Suite",
    timeframe: "Dec 2025",
    description:
      "Security testing and monitoring platform: OWASP Top 10 vulnerability scanner (SQLi, XSS, CSRF), request monitoring with anomaly detection and rate limiting, JWT-based Zero Trust auth, attack simulation for testing.",
    tech: ["Python", "JavaScript"],
    evidence: [
      { label: "2025-12" },
      { label: "completed" },
      { label: "python · javascript" },
    ],
  },
];

/** The trailing row after `moreProjects` in the ledger's Archive section
 *  (`page.tsx`) — a link out to the full GitHub repository list, not
 *  itself one of the archived projects. Rendered as one more ruled row in
 *  that section's list, the same as every `moreProjects` entry — not a
 *  grid cell; the "More Projects" 2×2 card grid this once balanced was
 *  replaced by the P8 ledger rebuild's ruled-row layout. */
export const archive = {
  title: "Full archive",
  description: "More repositories — everything public lives on GitHub.",
  url: "https://github.com/rakshit-737?tab=repositories",
  evidence: [
    { label: "archive" },
    { label: "github.com/rakshit-737", href: "https://github.com/rakshit-737" },
  ] satisfies EvidenceSegment[],
} as const;

export interface Achievement {
  title: string;
  detail: string;
  date: string;
  /** Path under `public/`, unbased — apply `withBase()` at the render
   *  site. Omit when there's no certificate to link. (This used to also
   *  accept `null` for a visibly-disabled "certificate pending" state —
   *  removed once the one achievement that used it got a real scan; see
   *  the comment at its call site below. Re-add it here, and the
   *  disabled-chip branch at the render site, if a future achievement
   *  genuinely needs it — don't leave the type accepting a value nothing
   *  renders.) */
  certificateUrl?: string;
}

export const achievements: Achievement[] = [
  {
    title: "First Prize — Cyber Secure 360 Expo 2025",
    detail: "Organized by SCOPE, VIT Chennai.",
    date: "Jun 2025",
    // The certificate itself now has a home — see `certifications` below,
    // which carries the scan, issuer, date and registration number. This
    // was `null` ("certificate pending") before the owner supplied the
    // scan; leaving it there once the document exists and is shown lower
    // on the same page would read as still-missing when it isn't.
    certificateUrl: "/certificates/cyber-secure-360-2025.png",
  },
  {
    title: "Top 100 Teams — FarAway Zuup Hackathon",
    detail: "Among ~11,000 participants.",
    date: "Jun 2026",
  },
];

export interface CertificationSignatory {
  name: string;
  role: string;
}

export interface Certification {
  title: string;
  awardedTo: string;
  /** Registration or certificate number. Omit when the document prints
   *  neither. */
  registration?: string;
  /** What the certificate recognises — a prize ("First Prize") for an
   *  award, or the course name for a certificate of completion. */
  reason: string;
  /** The event a prize was awarded at. Absent for course-completion
   *  certificates, which have no event. */
  event?: string;
  organiser: string;
  /** Issue date, exactly as printed. Omit when the document prints none. */
  date?: string;
  /** Omit when the document names no signatories. */
  signatories?: CertificationSignatory[];
  /** Other organisations' marks shown on the document (e.g. partner
   *  institutions on a course certificate), transcribed verbatim. Omit
   *  when the document shows none. */
  partners?: string[];
  /** A live verification URL printed on the document, if any — surfaced
   *  as a link alongside the other provenance segments. */
  verificationUrl?: string;
  /** Path under `public/`, unbased — apply `withBase()` at the render
   *  site. When the named file exists it renders as a modest bordered
   *  thumbnail linking to the full scan; when absent, the entry renders
   *  its text alone and the build still succeeds — never a placeholder
   *  image. */
  image?: string;
}

/**
 * Certifications — the credential itself (issuer, date, registration
 * number), distinct from `achievements[0]` above, which records the
 * outcome. Shaped to hold several entries even though only one held this
 * shape's full field set for a while.
 *
 * Every fact below is transcribed verbatim from the owner's certificate
 * documents in `public/certificates/`. Nothing here is inferred or
 * invented; a field is omitted rather than guessed whenever the source
 * document doesn't print it.
 */
export const certifications: Certification[] = [
  {
    title: "Certificate of Appreciation",
    awardedTo: "Rakshit Rameshbabu",
    registration: "24BYB1117",
    reason: "First Prize",
    event: "Cyber Secure 360 Expo – 2025",
    organiser:
      "School of Computer Science and Engineering (SCOPE), Vellore Institute of Technology, Chennai",
    date: "21 June 2025",
    signatories: [
      { name: "Dr. Karmel A", role: "HOD, B.Tech CSE Cyber Security" },
      { name: "Dr. Ganesan R", role: "Dean, SCOPE" },
    ],
    image: "/certificates/cyber-secure-360-2025.png",
  },
  {
    title: "Certificate of Completion",
    awardedTo: "Rakshit R",
    reason: "AI Fluency: Framework & Foundations",
    organiser: "Anthropic",
    partners: [
      "University College Cork (Ireland)",
      "Ringling College of Art + Design",
      "Higher Education Authority (An tÚdarás um Ard-Oideachas)",
      "National Forum for the Enhancement of Teaching and Learning in Higher Education",
    ],
    image: "/certificates/ai-fluency-framework-and-foundations.png",
  },
  {
    title: "Certificate of Completion",
    awardedTo: "Rakshit R",
    reason: "Claude 101",
    organiser: "Anthropic",
    image: "/certificates/claude-101.png",
  },
  {
    title: "Certificate of Completion",
    awardedTo: "Rakshit R",
    reason: "Claude Code in Action",
    organiser: "Anthropic",
    registration: "k66h6cj46fuo",
    date: "4 April 2026",
    verificationUrl: "https://verify.skilljar.com/c/k66h6cj46fuo",
    image: "/certificates/claude-code-in-action.png",
  },
  {
    // Transcribed from the certificate: the document prints a credential ID
    // (40C256D368DB2490) alongside the certification number recorded here,
    // and marks itself "Online Verifiable" without printing a URL — so no
    // `verificationUrl` is claimed. Satya Narayana Nadella signs it, but the
    // document states no role for him, so no signatory role is invented.
    title: "Microsoft Certified: Azure Fundamentals",
    awardedTo: "Rakshit Rameshbabu",
    registration: "D85FB0-05V137",
    reason: "Azure Fundamentals",
    organiser: "Microsoft",
    date: "24 July 2026",
    image: "/certificates/azure-fundamentals.png",
  },
];

export const skills: { group: string; items: string[] }[] = [
  {
    group: "Languages",
    items: [
      "Python",
      "Java",
      "C/C++",
      "TypeScript",
      "JavaScript",
      "SQL",
      "HTML/CSS",
    ],
  },
  {
    group: "Core CS",
    items: [
      "Data Structures & Algorithms",
      "OOP",
      "Operating Systems",
      "Computer Networks",
      "DBMS",
    ],
  },
  {
    group: "Backend & Frameworks",
    items: [
      "FastAPI",
      "Node.js/Express",
      "REST APIs",
      "SQLAlchemy",
      "React",
      "React Native (Expo)",
      "Next.js",
      "scikit-learn",
    ],
  },
  {
    group: "Databases & Infra",
    items: [
      "PostgreSQL",
      "Redis",
      "SQLite",
      "Docker",
      "Git/GitHub",
      "GitHub Actions (CI/CD)",
      "AWS (basics)",
      "Linux",
    ],
  },
  {
    group: "Security",
    items: [
      "Wireshark",
      "Nmap",
      "Burp Suite",
      "Metasploit",
      "Nessus",
      "ClamAV",
      "network/web security",
      "threat detection",
      "supply-chain security",
    ],
  },
  {
    group: "AI-Native Workflow",
    items: [
      "LLM-assisted development (Claude Code)",
      "prototyping",
      "debugging",
      "test generation",
      "code review",
    ],
  },
];

export interface EducationEntry {
  degree: string;
  institution: string;
  period: string;
  score: string;
}

export const education: EducationEntry[] = [
  {
    degree: "B.Tech CSE (Cyber Security)",
    institution: "VIT Chennai",
    period: "2024–Present",
    score: "CGPA 9.07/10",
  },
  {
    degree: "Class XII (PCM-CS)",
    institution: "National Public School",
    period: "2023–2024",
    score: "93.6%",
  },
  {
    degree: "Class X",
    institution: "National Public School",
    period: "2021–2022",
    score: "96.2%",
  },
];

export const navSections = [
  { id: "about", label: "About" },
  { id: "warden", label: "Warden" },
  { id: "scheduler", label: "Scheduler" },
  { id: "plantpal", label: "PlantPal+" },
  { id: "research", label: "Research" },
  { id: "ledger", label: "Ledger" },
  { id: "contact", label: "Contact" },
] as const;

export type ActId =
  | "hero"
  | "about"
  | "warden"
  | "scheduler"
  | "plantpal"
  | "research"
  | "ledger"
  | "contact";

/**
 * The eight acts of the landing page. `statement` is the single display
 * line each act carries — every one approved by the owner and traceable
 * to copy elsewhere in this file or to a linked repo. `plate` names the
 * painting the act is set in (see src/lib/art.ts).
 *
 * `kicker` (P12) is an optional plain-English line rendered as a `.label`
 * directly above `statement` — the first beat a non-engineer's eye hits,
 * with `statement` staying the poetic/technical second beat. Every kicker
 * is a condensation of copy already in this file, cited at its own entry.
 * Three acts carry none, deliberately:
 * - hero: already gets its plain-English line from P2 (`hero.role` above
 *   the name, `hero.positioning` below it) — a second kicker here would
 *   duplicate that, not add to it.
 * - ledger: its statement already fully condenses the one candidate
 *   source sentence (`archive.description`); no second sentence in this
 *   file summarizes the ledger's contents without repeating the statement.
 * - contact: its statement (`contact.headline`) is already plain English,
 *   and the only other candidate source, `contact.body`, renders verbatim
 *   as body copy two lines below — a kicker drawn from it would just
 *   repeat that sentence within the same screenful.
 */
export const acts: Record<
  ActId,
  { label: string; statement: string; plate: PlateId; kicker?: string }
> = {
  hero: { label: "act 01 — the record", statement: "Rakshit Rameshbabu", plate: "blacksmith" },
  about: {
    label: "act 02 — the work",
    statement: "End to end, from written requirements to CI-tested deployments.",
    plate: "alchemist",
    // Condensed from `about.paragraphs[1]`: "My work sits at the
    // intersection of software engineering, security, and applied ML."
    kicker: "Software engineering, security, and applied ML.",
  },
  warden: {
    label: "act 03 — warden",
    statement: "Judges what a package would actually do.",
    plate: "forge",
    // From `featuredProjects[0].oneLiner`: "Behavioral firewall for
    // open-source dependencies."
    kicker: "A firewall for open-source packages",
  },
  scheduler: {
    label: "act 04 — the scheduler",
    statement: "The answer is a proven negative result.",
    plate: "orrery",
    // From `caseStudies.scheduler.problem[0]`'s research question ("can
    // machine learning improve GPU-cluster job scheduling") and the
    // study's own "proven negative result" framing (oneLiner, problem[1]).
    kicker: "Can ML schedule GPU clusters better? A proven no.",
  },
  plantpal: {
    label: "act 05 — plantpal+",
    statement: "No second implementation to drift.",
    plate: "kitten",
    // From `featuredProjects[2].oneLiner`: "unifying plant care, fitness,
    // and nutrition."
    kicker: "One app for plants, fitness, and food",
  },
  research: {
    label: "act 06 — the finding",
    statement: "The honest baseline is not FIFO.",
    plate: "anatomy",
    // Condensed from `caseStudies.scheduler.decisions[3].body` ("it is a
    // sort by requested size... Judged against that ML-free control, the
    // learned scheduler adds nothing").
    kicker: "The ML scheduler doesn't beat a simple size sort.",
  },
  ledger: { label: "act 07 — the ledger", statement: "Everything public lives on GitHub.", plate: "dovedale" },
  contact: { label: "act 08 — the close", statement: "Open to internships and full-time roles in software and security engineering.", plate: "latour" },
};
