# Résumé diff — what the PDF must change to match the site

`public/rakshit-rameshbabu-resume.pdf` (byte-identical to `public/resume.pdf`)
was compared line by line, with `pdftotext -layout`, against `src/content.ts`
after the Phase 1 corrections of 2026-09-18/19. Only claims are listed. The
contact header is deliberately left out of this file.

Résumé bullets are shorter than the site's, so "should read" gives résumé-length
wording that stays inside what the source supports. Every number is taken
from the `content.ts` field in the last column. After regenerating, copy the
new PDF byte for byte to both paths (`tests/seo.spec.ts` asserts that they
match).

## Warden

| Line as printed | Line as it should read | Source in `content.ts` |
| --- | --- | --- |
| Warden – Software Supply-Chain Firewall · Jul 2026 | Warden – Software Supply-Chain Security Platform · Jul 2026 – Present | `featuredProjects[0].name`, `.timeframe` |
| Behavioral firewall for open-source dependencies; fuses rule-based and ML signals into a 0–100 risk verdict. | Gives a Python package an allow, warn or block verdict — from what its code does, where it came from, and what is known about it. | `featuredProjects[0].oneLiner` |
| Built a supply-chain firewall that statically analyzes PyPI packages (no code execution), fusing six independent analyzers (metadata/provenance, AST behavior, install-time execution, typosquatting, obfuscation, IOC matching) into explainable, per-signal risk evidence. | Analyzes PyPI packages without executing package code: verifies the published digest, extracts under hostile-archive guards, and runs 14 analyzers in parallel (metadata, typosquatting, AST behavior, install vectors, obfuscation, IOC, secrets, dependency confusion, provenance, YARA/Semgrep, vulnerability intelligence), correlating findings into named attack chains. | `featuredProjects[0].bullets[0]` |
| Trained and served a calibrated ML model (RandomForest + IsolationForest) fused with a tiered rule engine into a 0–100 score, enforcing allow/warn/block policy via a REST API, a CLI/CI gate, and a React dashboard. | Scores behavioral and vulnerability risk separately; a calibrated RandomForest may add at most 25 points below a rule score of 35, and an IsolationForest scores novelty as its own dimension. Policy as code maps the result to allow/warn/block through a REST API, a CLI gate and a React + TypeScript console; project scans emit CycloneDX/SPDX SBOMs and SARIF. | `featuredProjects[0].bullets[1]` |
| Hardened against attacker-authored input (anti-zip-bomb and anti-path-traversal extraction) with JWT auth + refresh rotation, argon2id hashing, RBAC, rate limiting, and an append-only audit trail; 40 automated tests in CI. | 13 / 14 malicious samples detected on a 22-sample synthetic benchmark (a regression baseline, not a real-world detection rate), none of the 8 benign look-alikes blocked; 2,908 backend tests pass in CI. | `featuredProjects[0].bullets[2]`, `.headlineNumbers` |
| Tech: Python 3.12, FastAPI, SQLAlchemy 2, scikit-learn, PostgreSQL, Redis, React 18, TypeScript, Docker | Tech: Python 3.11+, FastAPI, SQLAlchemy 2, scikit-learn, PostgreSQL, Redis, React 19, TypeScript, Docker | `featuredProjects[0].tech` |

The printed third bullet's security list (argon2id, rate limiting, append-only
audit trail) is no longer on the site. The Warden README now describes the
posture differently: refresh-token rotation, five-role RBAC and a hash-chained
audit log (`caseStudies.warden.outcome[1]`). If you keep a security clause, use
that wording, not the old one.

## Proactive Feasibility Scheduler

| Line as printed | Line as it should read | Source in `content.ts` |
| --- | --- | --- |
| Proved the learned scheduler is structurally degenerate: across 45,432 real dispatch instants (zero counterexamples) its queue ordering collapses to a sort by requested job size, established with paired TOST equivalence tests (p = 2.6×10⁻¹⁶) rather than difference tests. | Proved the learned scheduler is structurally degenerate: at the dispatch instant its score cannot tell two queued jobs apart by anything except requested size — zero counterexamples in 45,432 dispatch instants (41,786 real, 3,646 synthetic) — with equivalence shown by paired TOST (p = 2.6×10⁻¹⁶ on the synthetic benchmark) rather than difference tests. | `featuredProjects[1].bullets[0]` |
| Built an end-to-end pipeline -- discrete-event cluster simulator, an XGBoost wait-time regressor, and a 14-policy benchmark (FCFS, SJF, EASY/conservative backfill, SRPT, HRRN, ML) with Holm-adjusted significance testing. | No change needed. If a model-fit figure is added, it must be R² 0.811 ± 0.021 (run-wise CV), not 0.84. | `caseStudies.scheduler.approach[0]` |

Why this matters: the scheduler repo's `reports/honest_claims.md` §C lists
"45,432 real dispatch instants" under *Never say these*, and lists the
"sort by requested size" framing too ("The ranking is a permutation of the
size order"). The printed line uses both.

## PlantPal+

No numeric claim differs. The résumé's 36 requirements documents, 228
functional requirements, 111 NFRs, 119 user stories and 89 use cases all match
the PlantPal-Plus README and `content.ts`.

## Unchanged and verified

- Summary, skills, education (CGPA 9.07 / 10, 93.6%, 96.2%): match `content.ts`.
- Achievements (First Prize, Cyber Secure 360 Expo 2025; Top 100, FarAway Zuup
  Hackathon among 11,000): match `achievements`.
