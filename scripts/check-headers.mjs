// Asserts a live deploy sends every header in scripts/csp.mjs, exactly.
// Run by hand after a production deploy (CI has no deploy URL):
//   npm run check:headers -- https://rakshit-737.vercel.app
// or from the Actions tab: "Check live headers" (check-headers.yml).
// The GitHub Pages mirror cannot send custom headers at all, so point this
// at the Vercel primary.
import { SECURITY_HEADERS } from "./csp.mjs";

const url = process.argv[2];
if (!url) {
  console.error("usage: npm run check:headers -- <url>");
  process.exit(2);
}

let res;
try {
  res = await fetch(url, { method: "HEAD", redirect: "follow" });
} catch (err) {
  // A TLS-intercepting network firewall shows up here as
  // SELF_SIGNED_CERT_IN_CHAIN. Never switch verification off to get past
  // it: run from another network, point NODE_EXTRA_CA_CERTS at that
  // firewall's CA, or run the "Check live headers" workflow, which runs
  // this from GitHub's network.
  console.error(`FAIL could not reach ${url}: ${err.cause?.code ?? err.message}`);
  process.exit(1);
}
console.log(`${res.status} ${res.url}`);
let failed = false;
for (const { key, value } of SECURITY_HEADERS) {
  const got = res.headers.get(key);
  if (got === value) {
    console.log(`OK   ${key}`);
  } else {
    failed = true;
    console.log(`FAIL ${key}\n       expected: ${value}\n       got:      ${got ?? "(absent)"}`);
  }
}
const hsts = res.headers.get("strict-transport-security");
console.log(`${hsts ? "OK  " : "WARN"} Strict-Transport-Security ${hsts ? "(sent by Vercel)" : "absent"}`);
process.exit(failed ? 1 : 0);
