import type { Metadata } from "next";
import EvidenceStrip from "@/components/EvidenceStrip";
import { withBase } from "@/lib/base";

export const metadata: Metadata = {
  title: "404 — record not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center px-6">
      <div className="mx-auto w-full max-w-5xl">
        <EvidenceStrip
          segments={[
            { label: "404" },
            { label: "record not found", tone: "fail" },
            { label: "path unverified" },
          ]}
        />
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          No evidence at this address.
        </h1>
        <p className="mt-3 max-w-md text-base text-muted">
          The page you requested is not part of this record.
        </p>
        <a
          href={withBase("/")}
          className="mt-8 inline-flex items-center border border-steel/40 px-4 py-2 font-mono text-sm text-steel transition-colors hover:border-steel hover:bg-steel/10"
        >
          Return to index
        </a>
      </div>
    </main>
  );
}
