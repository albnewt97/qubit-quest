// Tests that the real eslint.config.js enforces the engine-purity and no-skipped-test
// rules. The fixtures live in src/engine/__lint-fixtures__, which `pnpm lint` ignores,
// so here they are linted with ignore: false.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = (name: string): string => path.join(root, "src/engine/__lint-fixtures__", name);

const eslint = new ESLint({ cwd: root, ignore: false });

async function errorsFor(file: string): Promise<{ ruleId: string | null; line: number }[]> {
  const [result] = await eslint.lintFiles([file]);
  if (result === undefined) throw new Error(`no lint result for ${file}`);
  return result.messages
    .filter((m) => m.severity === 2)
    .map((m) => ({ ruleId: m.ruleId, line: m.line }));
}

describe("engine lint rules", () => {
  it("the fixtures are outside the normal lint run", async () => {
    const normal = new ESLint({ cwd: root });
    expect(await normal.isPathIgnored(fixture("math-random.ts"))).toBe(true);
  });

  it("rejects Math.random inside src/engine", async () => {
    expect(await errorsFor(fixture("math-random.ts"))).toContainEqual({
      ruleId: "no-restricted-properties",
      line: 4,
    });
  });

  it("rejects Date inside src/engine", async () => {
    expect(await errorsFor(fixture("date.ts"))).toContainEqual({
      ruleId: "no-restricted-globals",
      line: 3,
    });
  });

  it("rejects importing react inside src/engine", async () => {
    expect(await errorsFor(fixture("imports-react.ts"))).toContainEqual({
      ruleId: "no-restricted-imports",
      line: 2,
    });
  });

  it("rejects importing from src/ui inside src/engine", async () => {
    expect(await errorsFor(fixture("imports-ui.ts"))).toContainEqual({
      ruleId: "no-restricted-imports",
      line: 2,
    });
  });

  it("rejects importing from src/game inside src/engine", async () => {
    expect(await errorsFor(fixture("imports-game.ts"))).toContainEqual({
      ruleId: "no-restricted-imports",
      line: 3,
    });
  });

  it("accepts real engine code (rng.ts)", async () => {
    expect(await errorsFor(path.join(root, "src/engine/rng.ts"))).toEqual([]);
  });
});

describe("test lint rules", () => {
  it.each([
    ["test-skip.test.ts", 4],
    ["test-only.test.ts", 4],
    ["test-todo.test.ts", 4],
  ])("rejects %s", async (name, line) => {
    expect(await errorsFor(fixture(name))).toContainEqual({
      ruleId: "no-restricted-syntax",
      line,
    });
  });
});
