// Skipped, focused and todo tests are lint errors in every folder that holds tests.
// Each case is linted as virtual text through the real eslint.config.js (see
// lint-virtual.ts), so no sample files are hidden from the normal lint run.
import { describe, expect, it } from "vitest";
import { VIRTUAL, lintVirtual, rulesOf, type VirtualPath } from "./lint-virtual.ts";

const SYNTAX = "no-restricted-syntax";
const GLOBALS = "no-restricted-globals";

const LOCATIONS: VirtualPath[] = [
  VIRTUAL.engineTest,
  VIRTUAL.gameTest,
  VIRTUAL.uiTest,
  VIRTUAL.toolsTest,
  VIRTUAL.e2eSpec,
];

function header(location: VirtualPath): string {
  return location === VIRTUAL.e2eSpec
    ? `import { test } from "@playwright/test";\n`
    : `import { describe, it, test } from "vitest";\n`;
}

// [name, line 2 of the file, rule that must report line 2]
const BANNED: [string, string, string][] = [
  ["it.skip", `it.skip("t", () => undefined);`, SYNTAX],
  ["test.skip", `test.skip("t", () => undefined);`, SYNTAX],
  ["describe.skip", `describe.skip("s", () => undefined);`, SYNTAX],
  ["it.only", `it.only("t", () => undefined);`, SYNTAX],
  ["test.only", `test.only("t", () => undefined);`, SYNTAX],
  ["describe.only", `describe.only("s", () => undefined);`, SYNTAX],
  ["it.todo", `it.todo("t");`, SYNTAX],
  ["test.todo", `test.todo("t");`, SYNTAX],
  ["describe.todo", `describe.todo("s");`, SYNTAX],
  ["test.skipIf", `test.skipIf(true)("t", () => undefined);`, SYNTAX],
  ["describe.skipIf", `describe.skipIf(true)("s", () => undefined);`, SYNTAX],
  ["test.runIf", `test.runIf(false)("t", () => undefined);`, SYNTAX],
  ["test.fixme", `test.fixme("t", () => undefined);`, SYNTAX],
  ["xit", `xit("t", () => undefined);`, GLOBALS],
  ["xtest", `xtest("t", () => undefined);`, GLOBALS],
  ["xdescribe", `xdescribe("s", () => undefined);`, GLOBALS],
  ["fit", `fit("t", () => undefined);`, GLOBALS],
  ["fdescribe", `fdescribe("s", () => undefined);`, GLOBALS],
  ["test.describe.only", `test.describe.only("s", () => undefined);`, SYNTAX],
  ["test.describe.skip", `test.describe.skip("s", () => undefined);`, SYNTAX],
  ["test.describe.parallel.only", `test.describe.parallel.only("s", () => undefined);`, SYNTAX],
  ["it.concurrent.only", `it.concurrent.only("t", () => undefined);`, SYNTAX],
  ["it.skip.each", `it.skip.each([1])("t %s", () => undefined);`, SYNTAX],
  ['test["only"]', `test["only"]("t", () => undefined);`, SYNTAX],
  ["test.skip() inside a test", `test("t", () => { test.skip(); });`, SYNTAX],
];

const CASES = LOCATIONS.flatMap((location) =>
  BANNED.map(([name, line, rule]) => [location, name, line, rule] as const),
);

describe("banned test forms", () => {
  it.each(CASES)("%s rejects %s", async (location, _name, line, rule) => {
    const problems = await lintVirtual(location, `${header(location)}${line}\n`);
    expect(rulesOf(problems)).toContainEqual({ ruleId: rule, line: 2 });
  });

  it.each(LOCATIONS)("%s accepts a plain test", async (location) => {
    const code =
      location === VIRTUAL.e2eSpec
        ? `import { expect, test } from "@playwright/test";\n\ntest("adds", () => {\n  expect(1 + 1).toBe(2);\n});\n`
        : `import { expect, it } from "vitest";\n\nit("adds", () => {\n  expect(1 + 1).toBe(2);\n});\n`;
    expect(await lintVirtual(location, code)).toEqual([]);
  });
});

// The engine-test block replaces the options of no-restricted-globals and
// no-restricted-syntax, so engine tests must keep the engine rules too.
describe("engine test files keep the engine rules", () => {
  const head = `import { it } from "vitest";\n`;

  it("rejects Date in an engine test", async () => {
    const problems = await lintVirtual(VIRTUAL.engineTest, `${head}it("t", () => Date.now());\n`);
    expect(rulesOf(problems)).toContainEqual({ ruleId: GLOBALS, line: 2 });
  });

  it("rejects Math.random in an engine test", async () => {
    const problems = await lintVirtual(
      VIRTUAL.engineTest,
      `${head}it("t", () => Math.random());\n`,
    );
    expect(rulesOf(problems)).toContainEqual({ ruleId: "no-restricted-properties", line: 2 });
  });

  it("rejects dynamic import() in an engine test", async () => {
    const problems = await lintVirtual(
      VIRTUAL.engineTest,
      `${head}it("t", async () => { await import("./rng.ts"); });\n`,
    );
    expect(rulesOf(problems)).toContainEqual({ ruleId: SYNTAX, line: 2 });
  });
});
