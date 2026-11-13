import { describe, expect, it } from "vitest";
import { createRng } from "../rng.ts";
import {
  CircuitError,
  cnot,
  controlled,
  cz,
  gate,
  measure,
  swap,
  toffoli,
  unitary,
  validateCircuit,
  type Circuit,
  type Op,
} from "./circuit.ts";
import { gateMatrix, type Matrix2 } from "./matrix.ts";
import { randomCircuit } from "./random.ts";
import { run } from "./run.ts";
import { StateVector } from "./state.ts";
import { at } from "./test-support.ts";

const R = Math.SQRT1_2;

function bellCircuit(): Circuit {
  return { qubits: 2, columns: [[gate("h", 0)], [cnot(0, 1)]] };
}

describe("run", () => {
  it("returns the starting state at index 0, then one state per column", () => {
    const { states, measurements } = run(bellCircuit(), createRng(1));
    expect(states).toHaveLength(3);
    expect(Array.from(at(states, 0).re)).toEqual([1, 0, 0, 0]);
    expect(at(states, 1).re[0]).toBeCloseTo(R, 12);
    expect(at(states, 1).re[2]).toBeCloseTo(R, 12);
    expect(at(states, 2).re[0]).toBeCloseTo(R, 12);
    expect(at(states, 2).re[3]).toBeCloseTo(R, 12);
    expect(measurements).toEqual([]);
  });

  it("gives an empty circuit just the starting state", () => {
    const { states } = run({ qubits: 3, columns: [] }, createRng(1));
    expect(states).toHaveLength(1);
    expect(at(states, 0).qubits).toBe(3);
  });

  it("starts from a copy of the given state and never mutates it", () => {
    const start = StateVector.basis(2, 0b10);
    const { states } = run(bellCircuit(), createRng(1), start);
    expect(states[0]).not.toBe(start);
    expect(Array.from(start.re)).toEqual([0, 0, 1, 0]);
    // H on |1> then CNOT: (|00> - |11>)/sqrt(2).
    expect(at(states, 2).re[0]).toBeCloseTo(R, 12);
    expect(at(states, 2).re[3]).toBeCloseTo(-R, 12);
  });

  it("keeps each snapshot independent of later columns", () => {
    const { states } = run(bellCircuit(), createRng(1));
    at(states, 2).re[0] = 99;
    expect(at(states, 1).re[0]).toBeCloseTo(R, 12);
    expect(at(states, 0).re[0]).toBe(1);
  });

  it("rejects a starting state with a different number of qubits", () => {
    expect(() => run(bellCircuit(), createRng(1), StateVector.zero(3))).toThrow(CircuitError);
  });

  it("records each measurement with its column, qubit and outcome", () => {
    const c: Circuit = {
      qubits: 2,
      columns: [[gate("h", 0)], [cnot(0, 1)], [measure(0)], [measure(1)]],
    };
    const { states, measurements } = run(c, createRng(8));
    expect(measurements).toHaveLength(2);
    const m0 = at(measurements, 0);
    const m1 = at(measurements, 1);
    expect(m0).toMatchObject({ column: 2, qubit: 0 });
    expect(m1).toMatchObject({ column: 3, qubit: 1 });
    expect(m1.outcome).toBe(m0.outcome);
    const kept = m0.outcome === 0 ? 0 : 3;
    expect(at(states, 3).re[kept]).toBeCloseTo(1, 12);
  });

  it("gives the same measurement record and the same states for the same seed", () => {
    const shape = randomCircuit(createRng(77), { qubits: 5, columns: 40, measure: true });
    expect(shape.columns.flat().filter((op) => op.kind === "measure").length).toBeGreaterThan(5);
    const a = run(shape, createRng(123));
    const b = run(shape, createRng(123));
    expect(b.measurements).toEqual(a.measurements);
    expect(b.states).toHaveLength(a.states.length);
    for (let i = 0; i < a.states.length; i++) {
      expect(Array.from(at(b.states, i).re)).toEqual(Array.from(at(a.states, i).re));
      expect(Array.from(at(b.states, i).im)).toEqual(Array.from(at(a.states, i).im));
    }
    // A different seed gives a different record, so the rng is really used.
    const records = new Set<string>();
    for (let seed = 0; seed < 8; seed++) {
      records.add(JSON.stringify(run(shape, createRng(seed)).measurements));
    }
    expect(records.size).toBeGreaterThan(1);
  });
});

describe("operation helpers", () => {
  it("build the canonical operations", () => {
    expect(cnot(0, 1)).toEqual({ kind: "gate", gate: "x", target: 1, controls: [0] });
    expect(cz(0, 2)).toEqual({ kind: "gate", gate: "z", target: 2, controls: [0] });
    expect(toffoli(0, 1, 2)).toEqual({ kind: "gate", gate: "x", target: 2, controls: [0, 1] });
    expect(swap(1, 0)).toEqual({ kind: "swap", targets: [1, 0] });
    expect(gate("rz", 1, 0.5)).toEqual({ kind: "gate", gate: "rz", target: 1, theta: 0.5 });
    expect(controlled(gate("ry", 3, 1.2), [0, 1])).toEqual({
      kind: "gate",
      gate: "ry",
      target: 3,
      theta: 1.2,
      controls: [0, 1],
    });
    expect(measure(2)).toEqual({ kind: "measure", qubit: 2 });
    const m = gateMatrix("h");
    expect(unitary(m, 0, [1])).toEqual({ kind: "unitary", matrix: m, target: 0, controls: [1] });
  });
});

describe("validateCircuit", () => {
  const bad: [string, Circuit][] = [
    ["0 qubits", { qubits: 0, columns: [] }],
    ["13 qubits", { qubits: 13, columns: [] }],
    ["a target out of range", { qubits: 2, columns: [[gate("x", 2)]] }],
    ["a negative target", { qubits: 2, columns: [[gate("x", -1)]] }],
    ["a non-integer target", { qubits: 2, columns: [[gate("x", 0.5)]] }],
    ["a control out of range", { qubits: 2, columns: [[cnot(3, 0)]] }],
    ["a control equal to the target", { qubits: 2, columns: [[cnot(1, 1)]] }],
    ["a repeated control", { qubits: 3, columns: [[toffoli(0, 0, 2)]] }],
    ["overlapping ops in a column", { qubits: 2, columns: [[gate("h", 0), cnot(0, 1)]] }],
    ["a control shared within a column", { qubits: 3, columns: [[cnot(0, 1), cnot(0, 2)]] }],
    ["a swap of a qubit with itself", { qubits: 2, columns: [[swap(1, 1)]] }],
    ["a swap out of range", { qubits: 2, columns: [[swap(0, 2)]] }],
    ["a measurement out of range", { qubits: 1, columns: [[measure(1)]] }],
    [
      "a rotation without an angle",
      { qubits: 1, columns: [[{ kind: "gate", gate: "rx", target: 0 }]] },
    ],
    ["a non-finite angle", { qubits: 1, columns: [[gate("rz", 0, Number.NaN)]] }],
    [
      "an angle on a fixed gate",
      { qubits: 1, columns: [[{ kind: "gate", gate: "h", target: 0, theta: 1 }]] },
    ],
    ["an unknown gate", { qubits: 1, columns: [[{ kind: "gate", gate: "q" as "h", target: 0 }]] }],
    [
      "an unknown op kind",
      { qubits: 1, columns: [[{ kind: "reset", qubit: 0 } as unknown as Op]] },
    ],
  ];

  it.each(bad)("rejects %s", (_label, c) => {
    expect(() => {
      validateCircuit(c);
    }).toThrow(CircuitError);
    expect(() => run(c, createRng(1))).toThrow(CircuitError);
  });

  it("rejects a non-unitary or non-finite matrix", () => {
    const notUnitary: Matrix2 = { re: [1, 0, 0, 2], im: [0, 0, 0, 0] };
    const nan: Matrix2 = { re: [Number.NaN, 0, 0, 1], im: [0, 0, 0, 0] };
    for (const m of [notUnitary, nan]) {
      expect(() => {
        validateCircuit({ qubits: 1, columns: [[unitary(m, 0)]] });
      }).toThrow(CircuitError);
    }
  });

  it("names the column and operation that is wrong", () => {
    const c: Circuit = { qubits: 2, columns: [[gate("h", 0)], [gate("x", 0), gate("x", 5)]] };
    expect(() => {
      validateCircuit(c);
    }).toThrow(/column 1, op 1/);
  });

  it("accepts disjoint ops in one column, controlled gates and unitaries", () => {
    const c: Circuit = {
      qubits: 5,
      columns: [
        [gate("h", 0), cnot(1, 2), swap(3, 4)],
        [toffoli(0, 1, 4), unitary(gateMatrix("t"), 2, [3])],
        [measure(0), measure(1)],
      ],
    };
    expect(() => {
      validateCircuit(c);
    }).not.toThrow();
  });
});
