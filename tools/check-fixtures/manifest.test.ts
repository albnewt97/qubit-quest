import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGoldenDir } from "./manifest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

let dir: string;

function write(rel: string, text: string): void {
  const file = path.join(dir, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function writeManifest(manifest: unknown): void {
  write("MANIFEST.json", JSON.stringify(manifest));
}

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "golden-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("checkGoldenDir", () => {
  it("passes an empty folder with no manifest", () => {
    expect(checkGoldenDir(dir)).toEqual({ errors: [], checked: 0 });
  });

  it("passes a folder holding only the top-level .gitkeep", () => {
    write(".gitkeep", "");
    expect(checkGoldenDir(dir)).toEqual({ errors: [], checked: 0 });
  });

  it("fails a fixture when there is no manifest", () => {
    write("statevector/a.json", "{}");
    expect(checkGoldenDir(dir).errors).toEqual([
      "statevector/a.json: not listed in MANIFEST.json (there is no MANIFEST.json)",
    ]);
  });

  it("passes when every file matches its hash, including nested paths", () => {
    write("a.json", "[1]");
    write("statevector/b.json", "[2]");
    writeManifest({ files: { "a.json": sha("[1]"), "statevector/b.json": sha("[2]") } });
    expect(checkGoldenDir(dir)).toEqual({ errors: [], checked: 2 });
  });

  it("passes with an optional top-level meta object, which is not hashed", () => {
    write("a.json", "[1]");
    writeManifest({
      meta: { generator: "tools/fixtures", qiskit: "x" },
      files: { "a.json": sha("[1]") },
    });
    expect(checkGoldenDir(dir)).toEqual({ errors: [], checked: 1 });
  });

  it("fails a hash mismatch", () => {
    write("a.json", "[1] edited");
    writeManifest({ files: { "a.json": sha("[1]") } });
    expect(checkGoldenDir(dir).errors).toEqual([
      `a.json: SHA-256 is ${sha("[1] edited")}, MANIFEST.json says ${sha("[1]")}`,
    ]);
  });

  it("fails a file listed in the manifest but missing on disk", () => {
    writeManifest({ files: { "gone.json": sha("x") } });
    expect(checkGoldenDir(dir).errors).toEqual(["gone.json: listed in MANIFEST.json but missing"]);
  });

  it("fails a file on disk that the manifest does not list", () => {
    write("a.json", "[1]");
    write("extra.json", "[3]");
    writeManifest({ files: { "a.json": sha("[1]") } });
    expect(checkGoldenDir(dir).errors).toEqual(["extra.json: not listed in MANIFEST.json"]);
  });

  it("does not exempt a .gitkeep below the top level", () => {
    write("statevector/.gitkeep", "");
    expect(checkGoldenDir(dir).errors).toEqual([
      "statevector/.gitkeep: not listed in MANIFEST.json (there is no MANIFEST.json)",
    ]);
  });

  it.each([
    [
      "an unknown top-level key",
      { files: {}, extra: 1 },
      'MANIFEST.json: unknown top-level key "extra"',
    ],
    ["a missing files object", { meta: {} }, 'MANIFEST.json: "files" must be an object'],
    [
      "meta that is not an object",
      { files: {}, meta: [1] },
      'MANIFEST.json: "meta" must be an object',
    ],
    ["a manifest that is not an object", [1], "MANIFEST.json: must be a JSON object"],
    [
      "a malformed hash",
      { files: { "a.json": "abc" } },
      'MANIFEST.json: "a.json" must map to a lowercase hex SHA-256',
    ],
    [
      "a path that leaves the folder",
      { files: { "../a.json": sha("x") } },
      'MANIFEST.json: "../a.json" is not a plain relative path',
    ],
    [
      "an absolute path",
      { files: { "/a.json": sha("x") } },
      'MANIFEST.json: "/a.json" is not a plain relative path',
    ],
    [
      "a backslash path",
      { files: { "sv\\a.json": sha("x") } },
      'MANIFEST.json: "sv\\a.json" is not a plain relative path',
    ],
    [
      "listing MANIFEST.json itself",
      { files: { "MANIFEST.json": sha("x") } },
      'MANIFEST.json: "MANIFEST.json" may not be listed',
    ],
  ])("rejects %s", (_name, manifest, error) => {
    writeManifest(manifest);
    expect(checkGoldenDir(dir).errors).toContain(error);
  });

  it("rejects a manifest that is not valid JSON", () => {
    write("MANIFEST.json", "{ not json");
    expect(checkGoldenDir(dir).errors).toEqual(["MANIFEST.json: not valid JSON"]);
  });

  it("rejects a symbolic link", () => {
    write("real.json", "[1]");
    symlinkSync(path.join(dir, "real.json"), path.join(dir, "link.json"));
    writeManifest({ files: { "real.json": sha("[1]"), "link.json": sha("[1]") } });
    expect(checkGoldenDir(dir).errors).toEqual(["link.json: not a regular file"]);
  });
});

describe("the repository", () => {
  it("fixtures/golden matches its manifest", () => {
    expect(checkGoldenDir(path.join(root, "fixtures/golden")).errors).toEqual([]);
  });

  it("pnpm verify runs the fixture check", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["check:fixtures"]).toBe("tsx tools/check-fixtures/index.ts");
    expect(pkg.scripts.verify?.split("&&").map((s) => s.trim())).toContain("pnpm check:fixtures");
  });
});
