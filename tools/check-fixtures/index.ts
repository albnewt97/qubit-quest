// pnpm check:fixtures — part of pnpm verify. Fails if any file under
// fixtures/golden does not match its SHA-256 in fixtures/golden/MANIFEST.json.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkGoldenDir } from "./manifest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { errors, checked } = checkGoldenDir(path.join(root, "fixtures/golden"));

if (errors.length > 0) {
  console.error(`check:fixtures: fixtures/golden does not match MANIFEST.json:`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(`check:fixtures: ${String(checked)} file(s) in fixtures/golden match MANIFEST.json.`);
