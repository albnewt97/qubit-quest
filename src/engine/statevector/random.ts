/**
 * Seeded random operations, circuits, unitaries and states, for property tests
 * (and later the sandbox). All randomness comes from the Rng passed in.
 */
import type { Rng } from "../rng.ts";
import type { Circuit, Op } from "./circuit.ts";
import {
  gateMatrix,
  isRotation,
  multiply,
  NAMED_GATES,
  withPhase,
  type Matrix2,
} from "./matrix.ts";
import { StateVector } from "./state.ts";

const MAX_CONTROLS = 3;

function randomInt(rng: Rng, k: number): number {
  return Math.floor(rng.nextFloat() * k);
}

function randomAngle(rng: Rng, range: number): number {
  return (2 * rng.nextFloat() - 1) * range;
}

/** xs[i], or a RangeError (never expected: callers stay in range). */
function item<T>(xs: readonly T[], i: number): T {
  const v = xs[i];
  if (v === undefined) throw new RangeError(`Index ${String(i)} out of range`);
  return v;
}

/** Remove and return the last free qubit. */
function take(free: number[]): number {
  const q = free.pop();
  if (q === undefined) throw new RangeError("No free qubit left");
  return q;
}

function shuffled(rng: Rng, n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const ai = item(a, i);
    a[i] = item(a, j);
    a[j] = ai;
  }
  return a;
}

/** A general 2x2 unitary: e^(i a) Rz(b) Ry(c) Rz(d) with uniform angles. */
export function randomUnitary(rng: Rng): Matrix2 {
  const a = randomAngle(rng, Math.PI);
  const b = randomAngle(rng, Math.PI);
  const c = randomAngle(rng, Math.PI);
  const d = randomAngle(rng, Math.PI);
  return withPhase(
    multiply(gateMatrix("rz", b), multiply(gateMatrix("ry", c), gateMatrix("rz", d))),
    a,
  );
}

/** Draw one operation on qubits taken (removed) from `free`. */
function drawOp(rng: Rng, free: number[], allowMeasure: boolean): Op {
  const roll = rng.nextFloat();
  if (allowMeasure && roll < 0.1) return { kind: "measure", qubit: take(free) };
  if (roll < 0.25 && free.length >= 2) return { kind: "swap", targets: [take(free), take(free)] };
  const k =
    free.length < 2 || rng.nextFloat() < 0.5
      ? 0
      : 1 + randomInt(rng, Math.min(MAX_CONTROLS, free.length - 1));
  const target = take(free);
  const controls = Array.from({ length: k }, () => take(free));
  const withControls = k > 0 ? { controls } : {};
  if (roll < 0.75) {
    const g = item(NAMED_GATES, randomInt(rng, NAMED_GATES.length));
    const theta = isRotation(g) ? { theta: randomAngle(rng, 2 * Math.PI) } : {};
    return { kind: "gate", gate: g, target, ...withControls, ...theta };
  }
  return { kind: "unitary", matrix: randomUnitary(rng), target, ...withControls };
}

/** One random unitary operation (gate, controlled gate, unitary or swap) on n qubits. */
export function randomOp(rng: Rng, qubits: number): Op {
  return drawOp(rng, shuffled(rng, qubits), false);
}

export interface RandomCircuitOptions {
  readonly qubits: number;
  readonly columns: number;
  /** Also draw measurements (about 1 op in 10). Default false. */
  readonly measure?: boolean;
}

/** A random circuit: each column has one or more ops on disjoint qubits. */
export function randomCircuit(rng: Rng, options: RandomCircuitOptions): Circuit {
  const columns: Op[][] = [];
  for (let j = 0; j < options.columns; j++) {
    const free = shuffled(rng, options.qubits);
    const column: Op[] = [];
    while (free.length > 0 && !(column.length > 0 && rng.nextFloat() < 0.15)) {
      column.push(drawOp(rng, free, options.measure ?? false));
    }
    columns.push(column);
  }
  return { qubits: options.qubits, columns };
}

/** A random normalised state (Gaussian amplitudes, so uniform on the sphere). */
export function randomState(rng: Rng, qubits: number): StateVector {
  const dim = 2 ** qubits;
  const re: number[] = [];
  const im: number[] = [];
  let sum = 0;
  for (let i = 0; i < dim; i++) {
    // Box-Muller; 1 - nextFloat() is in (0, 1], so the log is finite.
    const r = Math.sqrt(-2 * Math.log(1 - rng.nextFloat()));
    const phi = 2 * Math.PI * rng.nextFloat();
    re.push(r * Math.cos(phi));
    im.push(r * Math.sin(phi));
    sum += r * r;
  }
  const scale = 1 / Math.sqrt(sum);
  return StateVector.fromAmplitudes(
    re.map((x) => x * scale),
    im.map((x) => x * scale),
  );
}
