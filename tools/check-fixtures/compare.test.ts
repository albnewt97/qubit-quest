import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compareFixtureDirs, compareJson } from "./compare.ts";

let committed: string;
let regenerated: string;

function write(dir: string, rel: string, text: string): void {
  const file = path.join(dir, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function both(rel: string, text: string): void {
  write(committed, rel, text);
  write(regenerated, rel, text);
}

const manifest = (files: Record<string, string>, meta: unknown = { v: "1" }): string =>
  JSON.stringify({ meta, files });
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

beforeEach(() => {
  committed = mkdtempSync(path.join(os.tmpdir(), "committed-"));
  regenerated = mkdtempSync(path.join(os.tmpdir(), "regenerated-"));
});

afterEach(() => {
  rmSync(committed, { recursive: true, force: true });
  rmSync(regenerated, { recursive: true, force: true });
});

describe("compareJson (by value)", () => {
  const TOL = 1e-10;

  it("accepts identical values and floats within 1e-10", () => {
    expect(
      compareJson(
        { a: [0.5, 1e-13], s: "x", t: true, n: null },
        { a: [0.5 + 9e-11, 0], s: "x", t: true, n: null },
        TOL,
      ),
    ).toEqual([]);
  });

  it("rejects a float that differs by more than 1e-10", () => {
    expect(compareJson({ re: [0.5] }, { re: [0.5 + 2e-10] }, TOL)).toEqual([
      "$.re[0]: 0.5 vs 0.5000000002 (differs by more than 1e-10)",
    ]);
  });

  it("compares integers exactly", () => {
    expect(compareJson({ target: 2 }, { target: 3 }, TOL)).toEqual(["$.target: 2 vs 3"]);
  });

  it("compares strings, booleans and null exactly", () => {
    expect(compareJson({ gate: "s" }, { gate: "sdg" }, TOL)).toEqual(['$.gate: "s" vs "sdg"']);
    expect(compareJson([true], [false], TOL)).toEqual(["$[0]: true vs false"]);
    expect(compareJson([null], [0], TOL)).toEqual(["$[0]: null vs 0 (different types)"]);
  });

  it("rejects a different array length or a different set of keys", () => {
    expect(compareJson({ c: [1, 2] }, { c: [1, 2, 3] }, TOL)).toEqual(["$.c: array length 2 vs 3"]);
    expect(compareJson({ a: 1, b: 2 }, { a: 1, c: 2 }, TOL)).toEqual([
      "$: key b only in the committed file",
      "$: key c only in the regenerated file",
    ]);
  });

  it("rejects an array against an object", () => {
    expect(compareJson({ x: [] }, { x: {} }, TOL)).toEqual([
      "$.x: array vs object (different types)",
    ]);
  });
});

describe("compareFixtureDirs", () => {
  it("passes folders that agree by value even when the bytes differ", () => {
    write(committed, "sv.json", '{"re":[0.707106781187]}');
    write(regenerated, "sv.json", '{"re":[0.707106781186]}');
    write(committed, "MANIFEST.json", manifest({ "sv.json": HASH_A }));
    write(regenerated, "MANIFEST.json", manifest({ "sv.json": HASH_B }));
    expect(compareFixtureDirs(committed, regenerated)).toEqual([]);
  });

  it("ignores .gitkeep", () => {
    write(committed, ".gitkeep", "");
    both("MANIFEST.json", manifest({}));
    expect(compareFixtureDirs(committed, regenerated)).toEqual([]);
  });

  it("fails on a file present on one side only", () => {
    both("MANIFEST.json", manifest({}));
    write(committed, "old.json", "{}");
    write(regenerated, "new.json", "{}");
    expect(compareFixtureDirs(committed, regenerated)).toEqual([
      "new.json: only in the regenerated output",
      "old.json: only in the committed fixtures",
    ]);
  });

  it("fails on a value difference and names the file and path", () => {
    both("MANIFEST.json", manifest({ "sv.json": HASH_A }));
    write(committed, "sv.json", '{"circuits":[{"qubits":2}]}');
    write(regenerated, "sv.json", '{"circuits":[{"qubits":3}]}');
    expect(compareFixtureDirs(committed, regenerated)).toEqual([
      "sv.json: $.circuits[0].qubits: 2 vs 3",
    ]);
  });

  it("compares MANIFEST.json by its file list and meta, not its hashes", () => {
    write(committed, "MANIFEST.json", manifest({ "a.json": HASH_A }, { qiskit: "1" }));
    write(regenerated, "MANIFEST.json", manifest({ "b.json": HASH_A }, { qiskit: "2" }));
    both("a.json", "{}");
    write(regenerated, "b.json", "{}");
    const errors = compareFixtureDirs(committed, regenerated);
    expect(errors).toContain('MANIFEST.json: $.meta.qiskit: "1" vs "2"');
    expect(errors).toContain("MANIFEST.json: $.files: key a.json only in the committed file");
    expect(errors).toContain("MANIFEST.json: $.files: key b.json only in the regenerated file");
  });

  it("fails on invalid JSON and compares non-JSON files byte for byte", () => {
    both("MANIFEST.json", manifest({}));
    write(committed, "broken.json", "{");
    write(regenerated, "broken.json", "{}");
    write(committed, "notes.txt", "a");
    write(regenerated, "notes.txt", "b");
    expect(compareFixtureDirs(committed, regenerated)).toEqual([
      "broken.json: not valid JSON in the committed fixtures",
      "notes.txt: bytes differ",
    ]);
  });

  it("fails when either folder is missing", () => {
    expect(compareFixtureDirs(committed, path.join(regenerated, "nope"))).toEqual([
      `${path.join(regenerated, "nope")}: not a folder`,
    ]);
  });
});
