// Answer keys from Qiskit (tools/fixtures/gen_statevector.py). The fixture is
// read as plain JSON and checked here, so a malformed file fails loudly.
import { describe, expect, it } from "vitest";
import golden from "../../../fixtures/golden/statevector.json" with { type: "json" };
import { createRng } from "../rng.ts";
import { NAMED_GATES, type Circuit, type Op } from "./circuit.ts";
import { fidelity } from "./compare.ts";
import type { Matrix2 } from "./matrix.ts";
import { run } from "./run.ts";
import { StateVector } from "./state.ts";
import { at } from "./test-support.ts";

interface GoldenCase {
  id: number;
  circuit: Circuit;
  expected: StateVector;
}

function fail(where: string, what: string): never {
  throw new Error(`statevector.json ${where}: ${what}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function intArray(v: unknown, where: string): number[] {
  if (!Array.isArray(v) || !v.every((x) => Number.isInteger(x))) fail(where, "expected integers");
  return v as number[];
}

function numArray(v: unknown, len: number, where: string): number[] {
  if (!Array.isArray(v) || v.length !== len || !v.every((x) => typeof x === "number")) {
    fail(where, `expected ${String(len)} numbers`);
  }
  return v;
}

function four(v: unknown, where: string): [number, number, number, number] {
  const a = numArray(v, 4, where);
  return [at(a, 0), at(a, 1), at(a, 2), at(a, 3)];
}

function parseOp(raw: unknown, where: string): Op {
  if (!isRecord(raw)) fail(where, "op is not an object");
  const controls =
    raw.controls === undefined ? undefined : intArray(raw.controls, `${where}.controls`);
  const withControls = <T extends object>(o: T): T => (controls ? { ...o, controls } : o);
  switch (raw.kind) {
    case "gate": {
      if (!NAMED_GATES.includes(raw.gate as never)) fail(where, `unknown gate ${String(raw.gate)}`);
      const base = {
        kind: "gate" as const,
        gate: raw.gate as (typeof NAMED_GATES)[number],
        target: raw.target as number,
      };
      return withControls(raw.theta === undefined ? base : { ...base, theta: raw.theta as number });
    }
    case "unitary": {
      if (!isRecord(raw.matrix)) fail(where, "unitary without a matrix");
      const matrix: Matrix2 = {
        re: four(raw.matrix.re, `${where}.re`),
        im: four(raw.matrix.im, `${where}.im`),
      };
      return withControls({ kind: "unitary" as const, matrix, target: raw.target as number });
    }
    case "swap": {
      const t = intArray(raw.targets, `${where}.targets`);
      if (t.length !== 2 || controls) fail(where, "swap takes two targets and no controls");
      return { kind: "swap", targets: [at(t, 0), at(t, 1)] };
    }
    default:
      return fail(where, `unexpected op kind ${String(raw.kind)}`);
  }
}

function parseGolden(raw: unknown): GoldenCase[] {
  if (!isRecord(raw) || !Array.isArray(raw.circuits)) fail("top level", "no circuits array");
  return raw.circuits.map((c: unknown, i: number) => {
    const where = `circuits[${String(i)}]`;
    if (!isRecord(c) || !Array.isArray(c.columns)) fail(where, "malformed circuit");
    const qubits = c.qubits as number;
    const columns = c.columns.map((col: unknown, j: number) => {
      if (!Array.isArray(col)) fail(`${where}.columns[${String(j)}]`, "column is not an array");
      return col.map((op: unknown, k: number) =>
        parseOp(op, `${where}.columns[${String(j)}][${String(k)}]`),
      );
    });
    const dim = 2 ** qubits;
    const expected = StateVector.fromAmplitudes(
      numArray(c.re, dim, `${where}.re`),
      numArray(c.im, dim, `${where}.im`),
    );
    return { id: c.id as number, circuit: { qubits, columns }, expected };
  });
}

const cases = parseGolden(golden);

function opLabel(op: Op): string[] {
  if (op.kind === "swap") return ["swap"];
  if (op.kind === "measure") return ["measure"];
  const k = op.controls?.length ?? 0;
  const name = op.kind === "gate" ? op.gate : "unitary";
  const labels = [k === 0 ? name : `c-${name}`];
  if (k >= 3) labels.push("3+ controls");
  if (op.kind === "gate" && op.gate === "x" && k === 1) labels.push("cx");
  if (op.kind === "gate" && op.gate === "z" && k === 1) labels.push("cz");
  if (op.kind === "gate" && op.gate === "x" && k === 2) labels.push("ccx");
  return labels;
}

describe("golden fixtures from Qiskit", () => {
  it("holds 200 circuits on 1 to 6 qubits with distinct ids", () => {
    expect(cases).toHaveLength(200);
    expect(new Set(cases.map((c) => c.id)).size).toBe(200);
    expect(new Set(cases.map((c) => c.circuit.qubits))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it("uses every gate in the set, with and without controls", () => {
    const seen = new Set(cases.flatMap((c) => c.circuit.columns.flat().flatMap(opLabel)));
    const want = [
      ...NAMED_GATES,
      ...NAMED_GATES.map((g) => `c-${g}`),
      "unitary",
      "c-unitary",
      "cx",
      "cz",
      "ccx",
      "swap",
      "3+ controls",
    ];
    expect(want.filter((label) => !seen.has(label))).toEqual([]);
    expect(seen.has("measure")).toBe(false);
  });

  it.each(cases.map((c) => [c.id, c] as const))(
    "circuit %i matches with fidelity >= 1 - 1e-9",
    (_id, c) => {
      const states = run(c.circuit, createRng(0)).states;
      expect(states).toHaveLength(c.circuit.columns.length + 1);
      expect(fidelity(at(states, states.length - 1), c.expected)).toBeGreaterThanOrEqual(1 - 1e-9);
    },
  );
});
