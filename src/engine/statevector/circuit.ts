/**
 * Circuits as columns of operations. The operations in one column act on
 * disjoint qubits (controls included), so they commute and the UI can draw them
 * in one time step.
 *
 * CNOT, CZ and Toffoli are not separate kinds: they are the gate "x" or "z" with
 * one or two controls. Any one-qubit gate, named or given as a 2x2 unitary, may
 * have any number of controls.
 */
import {
  dagger,
  INVERSE_GATE,
  isNamedGate,
  isRotation,
  isUnitary,
  type Matrix2,
  type NamedGate,
} from "./matrix.ts";
import { MAX_QUBITS } from "./state.ts";

export { NAMED_GATES, type NamedGate } from "./matrix.ts";

export interface GateOp {
  readonly kind: "gate";
  readonly gate: NamedGate;
  readonly target: number;
  readonly controls?: readonly number[];
  /** Angle in radians; required for rx, ry and rz, absent otherwise. */
  readonly theta?: number;
}

export interface UnitaryOp {
  readonly kind: "unitary";
  readonly matrix: Matrix2;
  readonly target: number;
  readonly controls?: readonly number[];
}

export interface SwapOp {
  readonly kind: "swap";
  readonly targets: readonly [number, number];
}

/** Z-basis measurement of one qubit. The outcome is recorded; nothing depends on it yet. */
export interface MeasureOp {
  readonly kind: "measure";
  readonly qubit: number;
}

export type Op = GateOp | UnitaryOp | SwapOp | MeasureOp;
export type Column = readonly Op[];

export interface Circuit {
  readonly qubits: number;
  readonly columns: readonly Column[];
}

/** Thrown for a circuit that breaks the rules above. */
export class CircuitError extends Error {
  override name = "CircuitError";
}

// ---------------------------------------------------------------------------
// Helpers that build operations.
// ---------------------------------------------------------------------------

export function gate(name: NamedGate, target: number, theta?: number): GateOp {
  return theta === undefined
    ? { kind: "gate", gate: name, target }
    : { kind: "gate", gate: name, target, theta };
}

/** Add controls to a one-qubit operation. */
export function controlled<T extends GateOp | UnitaryOp>(op: T, controls: readonly number[]): T {
  return { ...op, controls: [...(op.controls ?? []), ...controls] };
}

export function cnot(control: number, target: number): GateOp {
  return { kind: "gate", gate: "x", target, controls: [control] };
}

export function cz(control: number, target: number): GateOp {
  return { kind: "gate", gate: "z", target, controls: [control] };
}

export function toffoli(c1: number, c2: number, target: number): GateOp {
  return { kind: "gate", gate: "x", target, controls: [c1, c2] };
}

export function swap(a: number, b: number): SwapOp {
  return { kind: "swap", targets: [a, b] };
}

export function unitary(matrix: Matrix2, target: number, controls?: readonly number[]): UnitaryOp {
  return controls === undefined
    ? { kind: "unitary", matrix, target }
    : { kind: "unitary", matrix, target, controls };
}

export function measure(qubit: number): MeasureOp {
  return { kind: "measure", qubit };
}

// ---------------------------------------------------------------------------
// Validation and inversion.
// ---------------------------------------------------------------------------

/** Every qubit an operation touches, controls included. */
export function opQubits(op: Op): number[] {
  switch (op.kind) {
    case "gate":
    case "unitary":
      return [...(op.controls ?? []), op.target];
    case "swap":
      return [...op.targets];
    case "measure":
      return [op.qubit];
  }
}

/** Checks the shape of one operation. Reads it as unknown, since circuits can come from JSON. */
function checkOp(op: Op, where: string): void {
  const raw = op as unknown as Record<string, unknown>;
  const controls = raw.controls;
  if (controls !== undefined && !Array.isArray(controls)) {
    throw new CircuitError(`${where}: controls must be an array`);
  }
  switch (raw.kind) {
    case "gate": {
      const { gate: name, theta } = raw;
      if (!isNamedGate(name)) throw new CircuitError(`${where}: unknown gate ${String(name)}`);
      if (isRotation(name)) {
        if (typeof theta !== "number" || !Number.isFinite(theta)) {
          throw new CircuitError(`${where}: ${name} needs a finite angle, got ${String(theta)}`);
        }
      } else if (theta !== undefined) {
        throw new CircuitError(`${where}: ${name} takes no angle`);
      }
      return;
    }
    case "unitary": {
      const m = raw.matrix;
      if (typeof m !== "object" || m === null || !isUnitary(m as Matrix2)) {
        throw new CircuitError(`${where}: matrix is not a finite 2x2 unitary`);
      }
      return;
    }
    case "swap": {
      const targets = raw.targets;
      if (!Array.isArray(targets) || targets.length !== 2 || controls !== undefined) {
        throw new CircuitError(`${where}: swap needs two targets and no controls`);
      }
      return;
    }
    case "measure":
      return;
    default:
      throw new CircuitError(`${where}: unknown operation kind ${String(raw.kind)}`);
  }
}

/**
 * Throw CircuitError unless the circuit has 1 to 12 qubits, every operation is
 * well formed, touches only integer qubits in range, touches each qubit at most
 * once, and shares no qubit with another operation in its column.
 */
export function validateCircuit(circuit: Circuit): void {
  const n = circuit.qubits;
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) {
    throw new CircuitError(`A circuit needs 1 to ${String(MAX_QUBITS)} qubits, got ${String(n)}`);
  }
  const columns: unknown = circuit.columns;
  if (!Array.isArray(columns)) throw new CircuitError("columns must be an array");
  circuit.columns.forEach((column, j) => {
    const raw: unknown = column;
    if (!Array.isArray(raw)) throw new CircuitError(`column ${String(j)} must be an array`);
    const used = new Set<number>();
    column.forEach((op, k) => {
      const where = `column ${String(j)}, op ${String(k)}`;
      checkOp(op, where);
      const qubits = opQubits(op);
      const own = new Set<number>();
      for (const q of qubits) {
        if (!Number.isInteger(q) || q < 0 || q >= n) {
          throw new CircuitError(`${where}: qubit ${String(q)} is not in [0, ${String(n)})`);
        }
        if (own.has(q)) throw new CircuitError(`${where}: qubit ${String(q)} is used twice`);
        if (used.has(q))
          throw new CircuitError(`${where}: qubit ${String(q)} is already used in this column`);
        own.add(q);
      }
      for (const q of own) used.add(q);
    });
  });
}

function invertOp(op: Op, where: string): Op {
  switch (op.kind) {
    case "gate": {
      const inv: GateOp = { ...op, gate: INVERSE_GATE[op.gate] };
      return op.theta === undefined ? inv : { ...inv, theta: -op.theta };
    }
    case "unitary":
      return { ...op, matrix: dagger(op.matrix) };
    case "swap":
      return op;
    case "measure":
      throw new CircuitError(`${where}: cannot invert a circuit that contains a measure`);
  }
}

/** The circuit that undoes this one: columns reversed, each operation inverted. */
export function inverse(circuit: Circuit): Circuit {
  validateCircuit(circuit);
  return {
    qubits: circuit.qubits,
    columns: circuit.columns
      .map((column, j) =>
        column.map((op, k) => invertOp(op, `column ${String(j)}, op ${String(k)}`)),
      )
      .reverse(),
  };
}
