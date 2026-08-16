/**
 * Build-time GitHub provenance for the evidence strips: stars, latest commit,
 * latest CI conclusion. Runs only during `next build` (static export). Any
 * failure — offline build, rate limit, private repo — degrades to `null` and
 * the strips render their static segments unchanged.
 */

import type { EvidenceSegment } from "@/content";

export interface RepoLive {
  stars: number;
  sha: string;
  commitDate: string;
  ci: "passing" | "failing" | null;
  /** Repo URL — lets live segments deep-link (commit, actions). */
  repoUrl: string;
}

interface GhRepo {
  stargazers_count?: number;
}
interface GhCommit {
  sha?: string;
  commit?: { committer?: { date?: string } };
}
interface GhRuns {
  workflow_runs?: { conclusion?: string | null }[];
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status}`);
  return res.json();
}

export async function fetchRepoLive(repoUrl: string): Promise<RepoLive | null> {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  const [, owner, repo] = m;

  try {
    const [meta, commits, runs] = await Promise.all([
      gh<GhRepo>(`/repos/${owner}/${repo}`),
      gh<GhCommit[]>(`/repos/${owner}/${repo}/commits?per_page=1`),
      gh<GhRuns>(
        `/repos/${owner}/${repo}/actions/runs?per_page=1&status=completed`,
      ).catch(() => null),
    ]);

    const commit = commits?.[0];
    const conclusion = runs?.workflow_runs?.[0]?.conclusion ?? null;
    return {
      stars: meta?.stargazers_count ?? 0,
      sha: commit?.sha?.slice(0, 7) ?? "",
      commitDate: commit?.commit?.committer?.date?.slice(0, 10) ?? "",
      ci:
        conclusion === "success"
          ? "passing"
          : conclusion
            ? "failing"
            : null,
      repoUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

/** Extra evidence-strip segments rendered after the static ones. Each
 *  chip deep-links to its proof: commit page, Actions runs. */
export function liveSegments(live: RepoLive | null): EvidenceSegment[] {
  if (!live) return [];
  const segments: EvidenceSegment[] = [];
  if (live.stars > 0)
    segments.push({
      label: `${live.stars} stars`,
      href: `${live.repoUrl}/stargazers`,
    });
  if (live.sha) {
    segments.push({
      label: live.commitDate
        ? `head ${live.sha} · ${live.commitDate}`
        : `head ${live.sha}`,
      href: `${live.repoUrl}/commit/${live.sha}`,
    });
  }
  if (live.ci) {
    segments.push({
      label: `ci: ${live.ci}`,
      tone: live.ci === "passing" ? "pass" : "fail",
      href: `${live.repoUrl}/actions`,
    });
  }
  return segments;
}
