// Helpers shared by the state-vector tests. Pure engine code, so it follows the
// engine lint rules like any other file here.
import type { Matrix2 } from "./matrix.ts";
import { StateVector } from "./state.ts";

/** xs[i], throwing if it is out of range, so a test never reads a missing entry silently. */
export function at<T>(xs: ArrayLike<T>, i: number): T {
  const v = xs[i];
  if (v === undefined)
    throw new RangeError(`Index ${String(i)} out of range (length ${String(xs.length)})`);
  return v;
}

/** Largest absolute difference between the amplitudes of two states. */
export function maxAmplitudeDiff(a: StateVector, b: StateVector): number {
  if (a.qubits !== b.qubits) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.re.length; i++) {
    worst = Math.max(
      worst,
      Math.abs(at(a.re, i) - at(b.re, i)),
      Math.abs(at(a.im, i) - at(b.im, i)),
    );
  }
  return worst;
}

/**
 * The 2x2 matrix that `apply` performs on one qubit, read off by applying it to
 * |0> and |1>. Row-major: [m00, m01, m10, m11]. Exact, including global phase.
 */
export function matrixOf(apply: (s: StateVector) => void): Matrix2 {
  const col0 = StateVector.basis(1, 0);
  const col1 = StateVector.basis(1, 1);
  apply(col0);
  apply(col1);
  return {
    re: [at(col0.re, 0), at(col1.re, 0), at(col0.re, 1), at(col1.re, 1)],
    im: [at(col0.im, 0), at(col1.im, 0), at(col0.im, 1), at(col1.im, 1)],
  };
}

/** Largest absolute difference between the entries of two 2x2 matrices. */
export function maxMatrixDiff(a: Matrix2, b: Matrix2): number {
  const diffs = [0, 1, 2, 3].flatMap((k) => [
    Math.abs(at(a.re, k) - at(b.re, k)),
    Math.abs(at(a.im, k) - at(b.im, k)),
  ]);
  return Math.max(...diffs);
}
