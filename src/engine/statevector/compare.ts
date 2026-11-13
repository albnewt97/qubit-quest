/** Comparisons between pure states. Both states are assumed to be normalised. */
import type { StateVector } from "./state.ts";

/** Default tolerance: states are equal up to global phase when |<a|b>|^2 >= 1 - 1e-9. */
export const PHASE_EQUALITY_TOLERANCE = 1e-9;

function checkSameSize(a: StateVector, b: StateVector): void {
  if (a.qubits !== b.qubits) {
    throw new RangeError(
      `States have different qubit counts: ${String(a.qubits)} and ${String(b.qubits)}`,
    );
  }
}

/** The inner product <a|b> = sum of conj(a_i) * b_i. */
export function inner(a: StateVector, b: StateVector): { re: number; im: number } {
  checkSameSize(a, b);
  let re = 0;
  let im = 0;
  for (let i = 0; i < a.re.length; i++) {
    const ar = a.re[i] ?? 0;
    const ai = a.im[i] ?? 0;
    const br = b.re[i] ?? 0;
    const bi = b.im[i] ?? 0;
    re += ar * br + ai * bi;
    im += ar * bi - ai * br;
  }
  return { re, im };
}

/** |<a|b>|^2. */
export function fidelity(a: StateVector, b: StateVector): number {
  const z = inner(a, b);
  return z.re * z.re + z.im * z.im;
}

/** True when a and b are the same state up to a global phase: fidelity >= 1 - tol. */
export function equalUpToGlobalPhase(
  a: StateVector,
  b: StateVector,
  tol = PHASE_EQUALITY_TOLERANCE,
): boolean {
  return fidelity(a, b) >= 1 - tol;
}
