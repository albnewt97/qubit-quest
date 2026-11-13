// Level validator (stub until M4).
//
// Finds every level JSON file under src/levels. With zero levels it passes. If any
// level exists it fails, so a level can never ship before the real validator does.
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const levelsDir = path.join(root, "src/levels");

const levelFiles = readdirSync(levelsDir, { recursive: true, encoding: "utf8" })
  .filter((p) => p.endsWith(".json"))
  .sort();

if (levelFiles.length > 0) {
  console.error(
    `validate:levels: found ${String(levelFiles.length)} level file(s) but the validator is not implemented yet (M4):`,
  );
  for (const f of levelFiles) console.error(`  src/levels/${f}`);
  process.exit(1);
}

console.log("validate:levels: 0 levels found, 0 levels validated.");
