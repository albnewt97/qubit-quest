/**
 * A pure state of 1 to 12 qubits, as 2^n complex amplitudes held in two
 * Float64Arrays (real and imaginary parts).
 *
 * Qubit order: qubit 0 is the top wire and the leftmost bit of the ket, so the
 * basis index of |q0 q1 ... q(n-1)> is sum of q_k * 2^(n-1-k).
 *
 * The apply and measure methods change the state in place; clone() first to keep
 * the original.
 *
 * Every array read below is inside a loop bounded by the array's length, so it is
 * never out of range; `?? 0` only satisfies noUncheckedIndexedAccess.
 */
import type { Rng } from "../rng.ts";
import type { Matrix2 } from "./matrix.ts";

export const MAX_QUBITS = 12;

/** Bloch vector of one qubit's reduced state; its length is 1 for a pure qubit. */
export interface BlochVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Tolerance on the norm of amplitudes passed to fromAmplitudes. */
export const NORM_TOLERANCE = 1e-9;

function checkQubitCount(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) {
    throw new RangeError(`A state needs 1 to ${String(MAX_QUBITS)} qubits, got ${String(n)}`);
  }
}

export class StateVector {
  readonly qubits: number;
  readonly re: Float64Array;
  readonly im: Float64Array;

  private constructor(qubits: number, re: Float64Array, im: Float64Array) {
    this.qubits = qubits;
    this.re = re;
    this.im = im;
  }

  /** |0...0> on n qubits. */
  static zero(n: number): StateVector {
    return StateVector.basis(n, 0);
  }

  /** The basis state with the given index (qubit 0 is the most significant bit). */
  static basis(n: number, index: number): StateVector {
    checkQubitCount(n);
    const dim = 2 ** n;
    if (!Number.isInteger(index) || index < 0 || index >= dim) {
      throw new RangeError(
        `Basis index must be an integer in [0, ${String(dim)}), got ${String(index)}`,
      );
    }
    const s = new StateVector(n, new Float64Array(dim), new Float64Array(dim));
    s.re[index] = 1;
    return s;
  }

  /**
   * A state from copies of the given amplitudes. The length must be 2^n for n in
   * 1..12 and the norm within NORM_TOLERANCE of 1.
   */
  static fromAmplitudes(re: ArrayLike<number>, im: ArrayLike<number>): StateVector {
    if (re.length !== im.length) {
      throw new RangeError(
        `Real and imaginary parts differ in length: ${String(re.length)} and ${String(im.length)}`,
      );
    }
    const n = Math.log2(re.length);
    if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) {
      throw new RangeError(
        `Amplitude count must be 2^n for n in 1..${String(MAX_QUBITS)}, got ${String(re.length)}`,
      );
    }
    const s = new StateVector(n, Float64Array.from(re), Float64Array.from(im));
    const norm = s.norm();
    if (!(Math.abs(norm - 1) <= NORM_TOLERANCE)) {
      throw new RangeError(
        `Amplitudes must have norm 1 (within ${String(NORM_TOLERANCE)}), got ${String(norm)}`,
      );
    }
    return s;
  }

  /** Number of amplitudes, 2^qubits. */
  get dimension(): number {
    return this.re.length;
  }

  clone(): StateVector {
    return new StateVector(this.qubits, this.re.slice(), this.im.slice());
  }

  /** Euclidean norm, sqrt(sum |a_i|^2). */
  norm(): number {
    let sum = 0;
    for (let i = 0; i < this.re.length; i++) sum += (this.re[i] ?? 0) ** 2 + (this.im[i] ?? 0) ** 2;
    return Math.sqrt(sum);
  }

  /** Bit mask of a qubit within a basis index. */
  private mask(qubit: number, what = "qubit"): number {
    if (!Number.isInteger(qubit) || qubit < 0 || qubit >= this.qubits) {
      throw new RangeError(
        `${what} must be an integer in [0, ${String(this.qubits)}), got ${String(qubit)}`,
      );
    }
    return 1 << (this.qubits - 1 - qubit);
  }

  /**
   * Apply the 2x2 matrix `m` to `target` when every qubit in `controls` is 1, and
   * do nothing otherwise. Controls must be distinct and differ from the target.
   * CNOT is X with one control, CZ is Z with one, Toffoli is X with two.
   */
  applyMatrix1(m: Matrix2, target: number, controls: readonly number[] = []): void {
    const t = this.mask(target, "target");
    let cmask = 0;
    for (const c of controls) {
      const bit = this.mask(c, "control");
      if (bit === t) throw new RangeError(`Control ${String(c)} is also the target`);
      if (cmask & bit) throw new RangeError(`Control ${String(c)} is repeated`);
      cmask |= bit;
    }
    const [m00r, m01r, m10r, m11r] = m.re;
    const [m00i, m01i, m10i, m11i] = m.im;
    const { re, im } = this;
    for (let i = 0; i < re.length; i++) {
      if (i & t || (i & cmask) !== cmask) continue;
      const j = i | t;
      const ar = re[i] ?? 0;
      const ai = im[i] ?? 0;
      const br = re[j] ?? 0;
      const bi = im[j] ?? 0;
      re[i] = m00r * ar - m00i * ai + m01r * br - m01i * bi;
      im[i] = m00r * ai + m00i * ar + m01r * bi + m01i * br;
      re[j] = m10r * ar - m10i * ai + m11r * br - m11i * bi;
      im[j] = m10r * ai + m10i * ar + m11r * bi + m11i * br;
    }
  }

  /** Exchange qubits a and b. */
  applySwap(a: number, b: number): void {
    const ma = this.mask(a);
    const mb = this.mask(b);
    if (ma === mb) throw new RangeError(`Cannot swap qubit ${String(a)} with itself`);
    const { re, im } = this;
    for (let i = 0; i < re.length; i++) {
      // Visit each pair once, from the index with a = 1 and b = 0.
      if (!(i & ma) || i & mb) continue;
      const j = (i & ~ma) | mb;
      const r = re[i] ?? 0;
      const s = im[i] ?? 0;
      re[i] = re[j] ?? 0;
      im[i] = im[j] ?? 0;
      re[j] = r;
      im[j] = s;
    }
  }

  /** Exact probability of each basis index. */
  probabilities(): Float64Array {
    const p = new Float64Array(this.re.length);
    for (let i = 0; i < p.length; i++) p[i] = (this.re[i] ?? 0) ** 2 + (this.im[i] ?? 0) ** 2;
    return p;
  }

  /**
   * Measure one qubit in the Z basis: returns the outcome, keeps the amplitudes
   * consistent with it and renormalises them. An outcome of probability zero is
   * never returned.
   */
  measure(qubit: number, rng: Rng): 0 | 1 {
    const bit = this.mask(qubit);
    const { re, im } = this;
    let p0 = 0;
    let p1 = 0;
    for (let i = 0; i < re.length; i++) {
      const p = (re[i] ?? 0) ** 2 + (im[i] ?? 0) ** 2;
      if (i & bit) p1 += p;
      else p0 += p;
    }
    const outcome: 0 | 1 = rng.nextFloat() * (p0 + p1) < p0 ? 0 : 1;
    const scale = 1 / Math.sqrt(outcome === 0 ? p0 : p1);
    for (let i = 0; i < re.length; i++) {
      if ((i & bit ? 1 : 0) === outcome) {
        re[i] = (re[i] ?? 0) * scale;
        im[i] = (im[i] ?? 0) * scale;
      } else {
        re[i] = 0;
        im[i] = 0;
      }
    }
    return outcome;
  }

  /**
   * Measure every qubit `shots` times without changing the state. Returns the
   * number of shots that gave each basis index.
   */
  sample(shots: number, rng: Rng): Uint32Array {
    if (!Number.isInteger(shots) || shots < 0 || shots > 0xffffffff) {
      throw new RangeError(`Shots must be a non-negative integer, got ${String(shots)}`);
    }
    const p = this.probabilities();
    const cdf = new Float64Array(p.length);
    let total = 0;
    for (let i = 0; i < p.length; i++) {
      total += p[i] ?? 0;
      cdf[i] = total;
    }
    const counts = new Uint32Array(p.length);
    for (let s = 0; s < shots; s++) {
      const r = rng.nextFloat() * total;
      // First index whose cumulative probability exceeds r; it has p > 0.
      let lo = 0;
      let hi = cdf.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if ((cdf[mid] ?? 0) > r) hi = mid;
        else lo = mid + 1;
      }
      counts[lo] = (counts[lo] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Bloch vector (x, y, z) of one qubit's reduced density matrix
   * rho = (I + xX + yY + zZ)/2. It is (0, 0, 0) for half of a Bell pair.
   */
  reducedBloch(qubit: number): BlochVector {
    const bit = this.mask(qubit);
    const { re, im } = this;
    let p0 = 0;
    let p1 = 0;
    let rho01r = 0;
    let rho01i = 0;
    for (let i = 0; i < re.length; i++) {
      if (i & bit) continue;
      const j = i | bit;
      const ar = re[i] ?? 0;
      const ai = im[i] ?? 0;
      const br = re[j] ?? 0;
      const bi = im[j] ?? 0;
      p0 += ar * ar + ai * ai;
      p1 += br * br + bi * bi;
      // rho01 += a_i * conj(a_j)
      rho01r += ar * br + ai * bi;
      rho01i += ai * br - ar * bi;
    }
    return { x: 2 * rho01r, y: -2 * rho01i, z: p0 - p1 };
  }
}
