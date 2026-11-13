// The unit-test step of verify (the `test` script) must fail if any test is
// reported skipped, todo or pending. Each case runs the real `test` script's
// arguments in a child Vitest, on a throwaway folder outside the repository.
// The probe files use Vitest globals, so they need no imports and no config.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { root } from "../lint/lint-virtual.ts";

function testScriptArgs(): string[] {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const [bin, ...args] = (pkg.scripts.test ?? "").split(/\s+/);
  expect(bin).toBe("vitest");
  expect(args[0]).toBe("run");
  // Reporter paths in the script are relative to the repository root.
  return args.map((a) =>
    a.replace(
      /^(--reporter=)(\.\.?\/.*)$/,
      (_m, flag: string, p: string) => `${flag}${path.join(root, p)}`,
    ),
  );
}

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function runProbe(code: string): { status: number | null; output: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "qq-no-skip-"));
  dirs.push(dir);
  writeFileSync(path.join(dir, "probe.test.ts"), code);
  // CI is dropped too, so .only behaves the same locally and in CI (in CI, Vitest
  // itself also rejects .only).
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !k.startsWith("VITEST") && k !== "TEST" && k !== "CI",
    ),
  );
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/vitest/vitest.mjs"),
      ...testScriptArgs(),
      "--root",
      dir,
      "--globals",
    ],
    { cwd: dir, encoding: "utf8", env },
  );
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

const PASS = `it("passes", () => { expect(1).toBe(1); });\n`;

describe("the test script fails on skipped, todo or pending tests", () => {
  it("passes when every test passes (control)", () => {
    const { status, output } = runProbe(PASS + `it("also passes", () => {});\n`);
    expect(status, output).toBe(0);
  }, 60_000);

  it("still fails on a failing test", () => {
    const { status, output } = runProbe(PASS + `it("fails", () => { expect(1).toBe(2); });\n`);
    expect(status, output).not.toBe(0);
  }, 60_000);

  it.each([
    ["it.skip", `it.skip("probe-skipped", () => {});\n`],
    ["test.skip", `test.skip("probe-skipped", () => {});\n`],
    ["it.todo", `it.todo("probe-skipped");\n`],
    ["describe.skip", `describe.skip("group", () => { it("probe-skipped", () => {}); });\n`],
    ["describe.todo", `describe.todo("probe-skipped");\n`],
    ["it.skipIf(true)", `it.skipIf(true)("probe-skipped", () => {});\n`],
    ["it.runIf(false)", `it.runIf(false)("probe-skipped", () => {});\n`],
    ["ctx.skip() inside a test", `it("probe-skipped", (ctx) => { ctx.skip(); });\n`],
    ["destructured skip()", `it("probe-skipped", ({ skip }) => { skip(); });\n`],
    [
      "it.only leaving another test unrun",
      `it.only("focused", () => {});\nit("probe-skipped", () => {});\n`,
    ],
  ])(
    "fails on %s",
    (_name, code) => {
      const { status, output } = runProbe(PASS + code);
      expect(status, output).not.toBe(0);
      expect(output).toContain("probe-skipped");
    },
    60_000,
  );
});
