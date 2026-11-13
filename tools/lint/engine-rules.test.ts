// src/engine stays pure: no Math.random, no Date, no DOM, and imports only from
// inside src/engine (engine tests may also use vitest and fixtures/golden).
// Cases are linted as virtual text through the real eslint.config.js.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { VIRTUAL, lintVirtual, root, rulesOf } from "./lint-virtual.ts";

const IMPORTS = "local/engine-imports";

describe("engine purity", () => {
  it("rejects Math.random", async () => {
    const problems = await lintVirtual(VIRTUAL.engine, `export const r = Math.random();\n`);
    expect(rulesOf(problems)).toContainEqual({ ruleId: "no-restricted-properties", line: 1 });
  });

  it("rejects Date", async () => {
    const problems = await lintVirtual(VIRTUAL.engine, `export const t = Date.now();\n`);
    expect(rulesOf(problems)).toContainEqual({ ruleId: "no-restricted-globals", line: 1 });
  });

  it("rejects document.createElement", async () => {
    const problems = await lintVirtual(
      VIRTUAL.engine,
      `export const el: unknown = document.createElement("div");\n`,
    );
    expect(rulesOf(problems)).toContainEqual({ ruleId: "no-undef", line: 1 });
  });

  it("rejects document.createElement in an engine test", async () => {
    const problems = await lintVirtual(
      VIRTUAL.engineTest,
      `import { it } from "vitest";\nit("t", () => { document.createElement("div"); });\n`,
    );
    expect(rulesOf(problems)).toContainEqual({ ruleId: "no-undef", line: 2 });
  });

  it("does not flag TypeScript lib types or ES globals as undefined", async () => {
    const code = [
      `export const table: Record<string, Uint32Array> = {};`,
      `export type Shape = Partial<readonly PromiseLike<number>[]>;`,
      `export const big = BigInt(1) + 2n;`,
      `export const seen: ReadonlySet<number> = new Set<number>();`,
      `export const xs: Iterable<number> = [Math.PI, Number.EPSILON];`,
      `export const n: number = JSON.parse("1") as number;`,
      ``,
    ].join("\n");
    expect(await lintVirtual(VIRTUAL.engine, code)).toEqual([]);
  });

  it("accepts real engine code (rng.ts) with the real config", async () => {
    const [result] = await new ESLint({ cwd: root }).lintFiles([
      path.join(root, "src/engine/rng.ts"),
    ]);
    expect(result?.messages).toEqual([]);
  });
});

describe("engine import boundary (non-test files)", () => {
  const forbidden = (dir: string): string[] => [
    `../${dir}/App`,
    `./../${dir}/App.tsx`,
    `../engine/../${dir}/App.tsx`,
    `src/${dir}/App`,
    `@/${dir}/App`,
  ];

  it.each([...forbidden("ui"), ...forbidden("game")])("rejects import from %s", async (spec) => {
    const problems = await lintVirtual(
      VIRTUAL.engine,
      `import x from "${spec}";\nexport const y = x;\n`,
    );
    expect(rulesOf(problems)).toContainEqual({ ruleId: IMPORTS, line: 1 });
  });

  it.each([
    ["re-export", `export { default } from "../ui/App.tsx";\n`],
    ["export *", `export * from "../game/state.ts";\n`],
    ["type-only import", `import type { Props } from "../ui/App.tsx";\nexport type P = Props;\n`],
    ["import type expression", `export type P = import("../ui/App.tsx").Props;\n`],
    ["src/levels", `import level from "../levels/w0-l1.json";\nexport const l = level;\n`],
    ["src/i18n", `import en from "../i18n/en.json";\nexport const e = en;\n`],
    ["fixtures/golden", `import f from "../../fixtures/golden/x.json";\nexport const g = f;\n`],
    ["a bare package", `import { z } from "zod";\nexport const s = z;\n`],
    ["react", `import { useState } from "react";\nexport const h = useState;\n`],
    ["a Node builtin", `import { readFileSync } from "node:fs";\nexport const r = readFileSync;\n`],
    ["vitest", `import { it } from "vitest";\nexport const t = it;\n`],
  ])("rejects %s", async (_name, code) => {
    const problems = await lintVirtual(VIRTUAL.engine, code);
    expect(rulesOf(problems)).toContainEqual({ ruleId: IMPORTS, line: 1 });
  });

  it("rejects ../../ui/App from a nested engine folder", async () => {
    const problems = await lintVirtual(
      VIRTUAL.engineNested,
      `import x from "../../ui/App.tsx";\nexport const y = x;\n`,
    );
    expect(rulesOf(problems)).toContainEqual({ ruleId: IMPORTS, line: 1 });
  });

  it.each([
    [VIRTUAL.engine, `export { createRng } from "./rng.ts";\n`],
    [VIRTUAL.engine, `export { createRng } from "../engine/rng.ts";\n`],
    [VIRTUAL.engineNested, `export { createRng } from "../rng.ts";\n`],
  ])("%s accepts %s", async (file, code) => {
    expect(await lintVirtual(file, code)).toEqual([]);
  });
});

describe("engine import boundary (test files)", () => {
  it("accepts vitest and a JSON file under fixtures/golden", async () => {
    const code = [
      `import { expect, it } from "vitest";`,
      `import golden from "../../fixtures/golden/statevector/case-0001.json";`,
      `import { createRng } from "./rng.ts";`,
      ``,
      `it("loads", () => {`,
      `  const value: unknown = golden;`,
      `  expect(value).not.toBeUndefined();`,
      `  expect(createRng(1).nextFloat()).toBeLessThan(1);`,
      `});`,
      ``,
    ].join("\n");
    expect(await lintVirtual(VIRTUAL.engineTest, code)).toEqual([]);
  });

  it.each([
    ["src/ui", `import x from "../ui/App.tsx";\n`],
    ["src/game", `import x from "@/game/state";\n`],
    ["another package", `import { test } from "@playwright/test";\n`],
    ["a Node builtin", `import { readFileSync } from "node:fs";\n`],
    ["a vitest subpath", `import { x } from "vitest/node";\n`],
    ["fixtures outside golden", `import x from "../../fixtures/other.json";\n`],
  ])("rejects %s", async (_name, code) => {
    const problems = await lintVirtual(VIRTUAL.engineTest, code);
    expect(rulesOf(problems)).toContainEqual({ ruleId: IMPORTS, line: 1 });
  });
});

// Nothing may hide from lint: every source file in the repository (tracked, or
// untracked and not gitignored) is linted by the real config, with no override.
describe("lint coverage", () => {
  it("lints every source file in the repository", async () => {
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, encoding: "utf8" },
    )
      .split("\0")
      .filter((f) => /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(f));
    expect(files.length).toBeGreaterThan(5);

    const eslint = new ESLint({ cwd: root });
    const unlinted: string[] = [];
    for (const f of files) {
      const abs = path.join(root, f);
      const config: unknown = await eslint.calculateConfigForFile(abs);
      if ((await eslint.isPathIgnored(abs)) || config === undefined) unlinted.push(f);
    }
    expect(unlinted).toEqual([]);
  });
});
