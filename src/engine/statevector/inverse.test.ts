import { describe, expect, it } from "vitest";
import { createRng } from "../rng.ts";
import { inverse, type Circuit } from "./circuit.ts";
import { fidelity } from "./compare.ts";
import { randomCircuit, randomState } from "./random.ts";
import { run } from "./run.ts";
import { StateVector } from "./state.ts";
import { at, maxAmplitudeDiff } from "./test-support.ts";

function finalState(c: Circuit, start: StateVector): StateVector {
  const states = run(c, createRng(0), start).states;
  return at(states, states.length - 1);
}

describe("inverse", () => {
  it("returns the starting state after any random circuit, from |0...0> and from random states", () => {
    const rng = createRng(4242);
    let moved = 0;
    const trials = 100;
    for (let t = 0; t < trials; t++) {
      const n = 1 + (t % 8);
      const circuit = randomCircuit(rng, { qubits: n, columns: 20 });
      const inv = inverse(circuit);
      const both: Circuit = { qubits: n, columns: [...circuit.columns, ...inv.columns] };
      for (const start of [StateVector.zero(n), randomState(rng, n)]) {
        // Exact return, including global phase.
        expect(maxAmplitudeDiff(finalState(both, start), start)).toBeLessThan(1e-10);
      }
      if (fidelity(finalState(circuit, StateVector.zero(n)), StateVector.zero(n)) < 0.999) moved++;
    }
    // Guard against a trivially passing test: the circuits do move the state.
    expect(moved).toBeGreaterThan(trials * 0.9);
  });

  it("reverses the columns and inverts each operation", () => {
    const c: Circuit = {
      qubits: 2,
      columns: [
        [
          { kind: "gate", gate: "s", target: 0 },
          { kind: "gate", gate: "rx", target: 1, theta: 0.4 },
        ],
        [{ kind: "gate", gate: "t", target: 1, controls: [0] }],
        [{ kind: "swap", targets: [0, 1] }],
      ],
    };
    expect(inverse(c)).toEqual({
      qubits: 2,
      columns: [
        [{ kind: "swap", targets: [0, 1] }],
        [{ kind: "gate", gate: "tdg", target: 1, controls: [0] }],
        [
          { kind: "gate", gate: "sdg", target: 0 },
          { kind: "gate", gate: "rx", target: 1, theta: -0.4 },
        ],
      ],
    });
  });

  it("refuses a circuit that contains a measurement", () => {
    const c: Circuit = { qubits: 1, columns: [[{ kind: "measure", qubit: 0 }]] };
    expect(() => inverse(c)).toThrow(/measure/);
  });
});
