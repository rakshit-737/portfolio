/**
 * Single source of truth for every word on the site.
 * Edit copy here — components only render what this file exports.
 */

export type ChipTone = "pass" | "fail" | "neutral";

export interface EvidenceSegment {
  label: string;
  tone?: ChipTone;
  href?: string;
  /** Render as a visibly disabled "coming soon" item. */
  disabled?: boolean;
}

export interface HeadlineNumber {
  value: string;
  label: string;
}

export interface FeaturedProject {
  id: string;
  name: string;
  timeframe: string;
  oneLiner: string;
  bullets: string[];
  headlineNumbers?: HeadlineNumber[];
  tech: string[];
  repoUrl: string | null; // null → disabled "coming soon" button
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
  description:
    "Software & Security Engineer — B.Tech (Cyber Security) @ VIT Chennai. Full-stack products, backend systems, security research, and applied ML, taken end-to-end from requirements to CI-tested deployments.",
  /** Override with NEXT_PUBLIC_SITE_URL at build time (see README). */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://rakshit-737.github.io",
} as const;

export const hero = {
  name: "Rakshit Rameshbabu",
  role: "Software & Security Engineer — B.Tech (Cyber Security) @ VIT Chennai",
  location: "Chennai, India",
  /** Typed once on page load. */
  provenance: {
    prefix: "verified:",
    text: "builds end-to-end · tested in CI · reproducible",
  },
} as const;

export const links = {
  github: { label: "GitHub", url: "https://github.com/rakshit-737" },
  linkedin: {
    label: "LinkedIn",
    url: "https://linkedin.com/in/rakshit-rameshbabu",
  },
  email: "rakshitoffl@gmail.com",
  resume: "/resume.pdf",
} as const;

export const about = {
  paragraphs: [
    "B.Tech Computer Science (Cyber Security) student at VIT Chennai, CGPA 9.08. I build full-stack products and backend systems and take them end-to-end — from written requirements and architecture to CI-tested, reproducible deployments.",
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
      "Statically analyzes PyPI packages (no code execution), fusing six independent analyzers — metadata/provenance, AST behavior, install-time execution, typosquatting, obfuscation, IOC matching — into explainable, per-signal risk evidence.",
      "Calibrated ML model (RandomForest + IsolationForest) fused with a tiered rule engine into a 0–100 score; allow/warn/block policy enforced via a REST API, a CLI/CI gate, and a React dashboard.",
      "Hardened against attacker-authored input (anti-zip-bomb, anti-path-traversal extraction); JWT auth with refresh rotation, argon2id hashing, RBAC, rate limiting, append-only audit trail; 40 automated tests in CI.",
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
    evidence: [
      { label: "2026-07" },
      { label: "active", tone: "pass" },
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
    oneLiner:
      "An evaluation study of ML-based GPU-cluster job scheduling — and a proven negative result.",
    bullets: [
      "End-to-end research pipeline: discrete-event cluster simulator, XGBoost wait-time regressor, 14-policy benchmark (FCFS, SJF, EASY/conservative backfill, SRPT, HRRN, ML) with Holm-adjusted significance testing.",
      "Core finding: the learned scheduler is structurally degenerate — its queue ordering collapses to a sort by requested job size. Verified across 45,432 real dispatch instants with zero counterexamples; equivalence established with paired TOST (p = 2.6×10⁻¹⁶) rather than difference tests.",
      "Validated on real supercomputer traces (LANL CM-5, SDSC SP2) via second-exact event replay: the simulated ML gain does not replicate. Fully reproducible (seeded pipeline, Docker, CI); LaTeX manuscript in progress.",
    ],
    headlineNumbers: [
      { value: "0", label: "counterexamples" },
      { value: "45,432", label: "dispatch instants" },
      { value: "p = 2.6×10⁻¹⁶", label: "paired TOST" },
    ],
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
      { label: "research", tone: "pass" },
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
      "Full SDLC before implementation: 36 requirements documents (228 functional requirements, 111 NFRs, 119 user stories, 89 use cases), system architecture, database schema, API specification.",
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
    evidence: [
      { label: "2026–present" },
      { label: "in active development", tone: "pass" },
      { label: "typescript · expo · express" },
      { label: "repo", href: "https://github.com/rakshit-737/PlantPal-Plus" },
      { label: "unit-tested · CI", tone: "pass" },
    ],
  },
];

/**
 * Research Spotlight — the constructive takeaway from the scheduler study,
 * pulled out as its own section per the site layout.
 */
export const researchSpotlight = {
  eyebrow: "Research spotlight",
  context:
    "From the Proactive Feasibility Scheduler study — a proven negative result, verified across 45,432 real dispatch instants. LaTeX manuscript in progress.",
  quote:
    "a wait-time feature set can only produce a meaningful ranking if it contains a per-job attribute that is not a function of size given cluster state — and the honest baseline for an ML scheduler is the ML-free control its feature set implies, not FIFO.",
  repoUrl: "https://github.com/rakshit-737/proactive-feasibility-scheduler",
} as const;

export const moreProjects: MoreProject[] = [
  {
    name: "Taintwall — AI Agent Tool-Boundary Firewall",
    timeframe: "Jul 2026",
    description:
      "In-process provenance and policy firewall for AI agent tool boundaries, defending against indirect prompt injection; four defense layers (Unicode/markup normalization, content-signal classifier, intent-gated policy, argument-level provenance) plus an attack harness and labelled corpus — measured 43% → 0% exfiltration with benign utility intact.",
    tech: ["Python"],
    repoUrl: "https://github.com/rakshit-737/taintwall",
    evidence: [
      { label: "2026-07" },
      { label: "phase 2", tone: "pass" },
      { label: "python" },
      { label: "repo", href: "https://github.com/rakshit-737/taintwall" },
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

export interface Achievement {
  title: string;
  detail: string;
  date: string;
  /** URL when live; null → visibly disabled "coming soon"; omit → no certificate. */
  certificateUrl?: string | null;
}

export const achievements: Achievement[] = [
  {
    title: "First Prize — Cyber Secure 360 Expo 2025",
    detail: "Organized by SCOPE, VIT Chennai.",
    date: "Jun 2025",
    certificateUrl: null, // CERTIFICATE_URL — placeholder
  },
  {
    title: "Top 100 Teams — FarAway Zuup Hackathon",
    detail: "Among ~11,000 participants.",
    date: "Jun 2026",
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
      "LLM-assisted development (Claude Code) for prototyping, debugging, test generation, code review",
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
    score: "CGPA 9.08/10",
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
  { id: "projects", label: "Projects" },
  { id: "research", label: "Research" },
  { id: "achievements", label: "Achievements" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
] as const;
