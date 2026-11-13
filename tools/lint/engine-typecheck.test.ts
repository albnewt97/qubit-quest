// src/engine is typechecked by tsconfig.engine.json, which has no DOM, worker or
// Node types. Virtual files are served from memory; nothing is written to disk.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { root } from "./lint-virtual.ts";

const ENGINE_FILE = path.join(root, "src/engine/__virtual__.ts");
const ENGINE_TEST = path.join(root, "src/engine/__virtual__.test.ts");
const GOLDEN_JSON = path.join(root, "fixtures/golden/__virtual__.json");

function parseConfig(name: string): ts.ParsedCommandLine {
  const parsed = ts.getParsedCommandLineOfConfigFile(path.join(root, name), undefined, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    },
  });
  if (parsed === undefined) throw new Error(`could not parse ${name}`);
  return parsed;
}

interface Problem {
  file: string;
  code: number;
  text: string;
}

/** Typecheck the engine project plus the given in-memory files. */
function typecheckEngine(virtual: Record<string, string> = {}): Problem[] {
  for (const f of Object.keys(virtual)) {
    if (existsSync(f)) throw new Error(`${f} exists on disk; virtual files must not.`);
  }
  const config = parseConfig("tsconfig.engine.json");
  const host = ts.createCompilerHost(config.options);
  const getSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  host.getSourceFile = (fileName, language, ...rest) => {
    const text = virtual[fileName];
    return text === undefined
      ? getSourceFile(fileName, language, ...rest)
      : ts.createSourceFile(fileName, text, language);
  };
  host.fileExists = (fileName) => fileName in virtual || fileExists(fileName);
  host.readFile = (fileName) => virtual[fileName] ?? readFile(fileName);

  const rootNames = [
    ...config.fileNames,
    ...Object.keys(virtual).filter((f) => !f.endsWith(".json")),
  ];
  const program = ts.createProgram({ rootNames, options: config.options, host });
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    file: path.relative(root, d.file?.fileName ?? ""),
    code: d.code,
    text: ts.flattenDiagnosticMessageText(d.messageText, " "),
  }));
}

describe("tsconfig.engine.json", () => {
  it("typechecks the real engine files with no errors", () => {
    expect(typecheckEngine()).toEqual([]);
  });

  it("rejects document.createElement in an engine file", () => {
    const problems = typecheckEngine({
      [ENGINE_FILE]: `export const el: unknown = document.createElement("div");\n`,
    });
    expect(problems.map((p) => [p.file, p.code])).toContainEqual([
      "src/engine/__virtual__.ts",
      2584,
    ]);
  });

  it.each([
    ["window", `export const w: unknown = window;\n`],
    ["self (worker)", `export const s: unknown = self;\n`],
    ["process (Node)", `export const p: unknown = process;\n`],
    ["setTimeout (host timer)", `export const t: unknown = setTimeout;\n`],
  ])("rejects %s in an engine file", (_name, code) => {
    const problems = typecheckEngine({ [ENGINE_FILE]: code });
    expect(problems.filter((p) => p.file === "src/engine/__virtual__.ts")).not.toEqual([]);
  });

  it("lets an engine test import fixture JSON from fixtures/golden, with its types", () => {
    const problems = typecheckEngine({
      [GOLDEN_JSON]: `{ "qubits": 2, "amplitudes": [[0.7071067811865476, 0], [0, 0]] }\n`,
      [ENGINE_TEST]: [
        `import { expect, it } from "vitest";`,
        `import golden from "../../fixtures/golden/__virtual__.json";`,
        ``,
        `it("loads", () => {`,
        `  const qubits: number = golden.qubits;`,
        `  const amplitudes: number[][] = golden.amplitudes;`,
        `  expect([qubits, amplitudes.length]).toEqual([2, 2]);`,
        `});`,
        ``,
      ].join("\n"),
    });
    expect(problems).toEqual([]);
  });

  it("has no DOM, worker or Node types", () => {
    const { options } = parseConfig("tsconfig.engine.json");
    expect(options.lib?.every((lib) => /^lib\.es[\w.]*\.d\.ts$/.test(lib))).toBe(true);
    expect(options.types).toEqual([]);
  });

  it("is part of tsc -b, and the app project does not also claim src/engine", () => {
    const solution = JSON.parse(readFileSync(path.join(root, "tsconfig.json"), "utf8")) as {
      references: { path: string }[];
    };
    expect(solution.references.map((r) => r.path)).toContain("./tsconfig.engine.json");

    const engineFiles = parseConfig("tsconfig.engine.json").fileNames;
    expect(engineFiles).toContain(path.join(root, "src/engine/rng.ts"));
    expect(engineFiles).toContain(path.join(root, "src/engine/rng.test.ts"));
    const appFiles = parseConfig("tsconfig.app.json").fileNames;
    expect(appFiles.filter((f) => f.startsWith(path.join(root, "src/engine")))).toEqual([]);
  });
});
