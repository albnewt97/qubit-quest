// pnpm compare:fixtures <regenerated-dir> — used by the CI fixtures job.
// Fails if the regenerated answer keys differ by value from fixtures/golden
// (see compare.ts for the rules). Reads both folders and writes nothing.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareFixtureDirs, DEFAULT_TOLERANCE } from "./compare.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const committed = path.join(root, "fixtures/golden");
const regenerated = process.argv[2];

if (regenerated === undefined || process.argv.length > 3) {
  console.error("Usage: pnpm compare:fixtures <regenerated-dir>");
  process.exit(2);
}

const errors = compareFixtureDirs(committed, path.resolve(regenerated));
if (errors.length > 0) {
  const shown = errors.slice(0, 50);
  console.error(
    `compare:fixtures: regenerated fixtures differ from fixtures/golden (${String(errors.length)} difference(s)):`,
  );
  for (const e of shown) console.error(`  ${e}`);
  if (errors.length > shown.length)
    console.error(`  ... and ${String(errors.length - shown.length)} more`);
  process.exit(1);
}

console.log(
  `compare:fixtures: regenerated fixtures match fixtures/golden (tolerance ${String(DEFAULT_TOLERANCE)}).`,
);
