// Art integrity gate. Every registry entry must have committed files whose
// sha256 matches the lockfile — the export stays byte-stable and CI never
// has to contact Wikimedia.
import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const lockPath = "src/lib/art.lock.json";
if (!existsSync(lockPath)) {
  console.error(`FAIL missing ${lockPath} — run: npm run art`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const names = Object.keys(lock);
let failed = false;

if (names.length === 0) {
  console.error("FAIL lockfile is empty");
  failed = true;
}

for (const name of names) {
  const path = join("public", "art", name);
  if (!existsSync(path)) {
    console.error(`FAIL missing ${path}`);
    failed = true;
    continue;
  }
  const buf = readFileSync(path);
  const sha = createHash("sha256").update(buf).digest("hex");
  if (sha !== lock[name].sha256) {
    console.error(`FAIL sha mismatch ${path}`);
    failed = true;
  } else if (buf.length !== lock[name].bytes) {
    console.error(`FAIL size mismatch ${path}`);
    failed = true;
  }
}

// Reverse direction: every file actually sitting in public/art/ must be
// a lockfile entry. A crop edit that shrinks a plate's tier set can orphan
// files there — nothing else would ever flag them.
const artDir = join("public", "art");
if (existsSync(artDir)) {
  const onDisk = readdirSync(artDir).filter(
    (f) => !f.startsWith("."),
  );
  for (const file of onDisk) {
    if (!(file in lock)) {
      console.error(`FAIL orphaned file not in lockfile: ${join(artDir, file)}`);
      failed = true;
    }
  }
}

console.log(failed ? "art: FAILED" : `art: OK — ${names.length} files verified`);
process.exit(failed ? 1 : 0);
