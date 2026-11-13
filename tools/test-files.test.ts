// Every *.test.* or *.spec.* file outside e2e must be collected by Vitest, so no
// test file is linted but never run. Vitest itself reports what it collects.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { root } from "./lint/lint-virtual.ts";
import testFiles from "./test-files.json" with { type: "json" };

/** Environment without Vitest's own markers, so the child is a plain run. */
function childEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("VITEST") && k !== "TEST"),
  );
}

function collectedByVitest(): string[] {
  const out = execFileSync(
    process.execPath,
    [path.join(root, "node_modules/vitest/vitest.mjs"), "list", "--filesOnly", "--json"],
    { cwd: root, encoding: "utf8", env: childEnv() },
  );
  const entries = JSON.parse(out) as { file: string }[];
  return entries.map((e) => path.relative(root, e.file).split(path.sep).join("/"));
}

describe("Vitest collects every test file", () => {
  it("collects every tracked or untracked-but-not-gitignored *.test.* or *.spec.* file outside e2e", () => {
    const candidates = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, encoding: "utf8" },
    )
      .split("\0")
      .filter((f) => /(^|\/)[^/]*\.(test|spec)\.[^/]*$/.test(f))
      .filter((f) => !f.startsWith(`${testFiles.e2eDir}/`))
      .filter((f) => existsSync(path.join(root, f)));
    expect(candidates.length).toBeGreaterThan(3);

    const collected = new Set(collectedByVitest());
    expect(candidates.filter((f) => !collected.has(f))).toEqual([]);
  }, 60_000);
});
