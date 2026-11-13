/** Running a circuit on a state, one column at a time. */
import type { Rng } from "../rng.ts";
import { CircuitError, validateCircuit, type Circuit, type Op } from "./circuit.ts";
import { gateMatrix } from "./matrix.ts";
import { StateVector } from "./state.ts";

export interface Measurement {
  /** Index of the column that holds the measurement. */
  readonly column: number;
  readonly qubit: number;
  readonly outcome: 0 | 1;
}

export interface RunResult {
  /**
   * states[0] is the starting state; states[j + 1] is the state after column j.
   * So states.length is columns.length + 1. Each entry is its own copy.
   */
  readonly states: StateVector[];
  /** Every measurement, in column order (and in op order within a column). */
  readonly measurements: Measurement[];
}

/**
 * Apply one operation to `state` in place. Returns the outcome of a measurement,
 * which needs `rng`, and undefined for any other operation.
 */
export function applyOp(state: StateVector, op: Op, rng?: Rng): 0 | 1 | undefined {
  switch (op.kind) {
    case "gate":
      state.applyMatrix1(gateMatrix(op.gate, op.theta), op.target, op.controls);
      return undefined;
    case "unitary":
      state.applyMatrix1(op.matrix, op.target, op.controls);
      return undefined;
    case "swap":
      state.applySwap(op.targets[0], op.targets[1]);
      return undefined;
    case "measure":
      if (!rng) throw new CircuitError("A measure needs an Rng");
      return state.measure(op.qubit, rng);
  }
}

/**
 * Run `circuit` from `initial` (default |0...0>), which is copied and never
 * changed. All randomness comes from `rng`, so the same seed gives the same
 * measurement record and the same states.
 */
export function run(circuit: Circuit, rng: Rng, initial?: StateVector): RunResult {
  validateCircuit(circuit);
  if (initial && initial.qubits !== circuit.qubits) {
    throw new CircuitError(
      `Starting state has ${String(initial.qubits)} qubits, circuit has ${String(circuit.qubits)}`,
    );
  }
  const state = initial ? initial.clone() : StateVector.zero(circuit.qubits);
  const states = [state.clone()];
  const measurements: Measurement[] = [];
  circuit.columns.forEach((column, j) => {
    for (const op of column) {
      const outcome = applyOp(state, op, rng);
      if (op.kind === "measure" && outcome !== undefined) {
        measurements.push({ column: j, qubit: op.qubit, outcome });
      }
    }
    states.push(state.clone());
  });
  return { states, measurements };
}
