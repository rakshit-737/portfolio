import type { Metadata } from "next";
import { BracketLink } from "@/components/Bracket";
import Provenance from "@/components/Provenance";
import { withBase } from "@/lib/base";

export const metadata: Metadata = {
  title: "404 — no record at this address",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden">
      <div className="relative mx-auto w-full max-w-[100rem] px-5 sm:px-8 lg:px-12">
        <Provenance
          segments={[
            { label: "404" },
            { label: "no record", tone: "fail" },
            { label: "path unverified" },
          ]}
        />
        <h1
          className="mt-7 font-mono leading-[0.9] font-semibold tracking-[-0.05em]"
          style={{ fontSize: "clamp(2.4rem, 8vw, 5rem)" }}
        >
          Nothing measured
          <br />
          at this address.
        </h1>
        <p className="prose-field mt-6">
          The page you requested is not part of this record.
        </p>
        <div className="mt-10">
          <BracketLink href={withBase("/")} weight="filled">
            Return to the index
          </BracketLink>
        </div>
      </div>
    </main>
  );
}
