/**
 * One-qubit gate matrices.
 *
 * A Matrix2 is row-major, [m00, m01, m10, m11], with real and imaginary parts in
 * separate tuples. Rotations follow Qiskit: R_P(theta) = exp(-i theta P / 2), so
 * Rz(theta) = diag(e^(-i theta/2), e^(i theta/2)).
 */
export interface Matrix2 {
  readonly re: readonly [number, number, number, number];
  readonly im: readonly [number, number, number, number];
}

export const NAMED_GATES = [
  "i",
  "x",
  "y",
  "z",
  "h",
  "s",
  "sdg",
  "t",
  "tdg",
  "rx",
  "ry",
  "rz",
] as const;
export type NamedGate = (typeof NAMED_GATES)[number];

const ROTATIONS: ReadonlySet<string> = new Set(["rx", "ry", "rz"]);
const NAMED: ReadonlySet<string> = new Set(NAMED_GATES);

/** True for the gates that take an angle (rx, ry, rz). */
export function isRotation(gate: NamedGate): boolean {
  return ROTATIONS.has(gate);
}

export function isNamedGate(gate: unknown): gate is NamedGate {
  return typeof gate === "string" && NAMED.has(gate);
}

/** The named gate whose matrix is the inverse (for rotations, negate the angle too). */
export const INVERSE_GATE: Readonly<Record<NamedGate, NamedGate>> = {
  i: "i",
  x: "x",
  y: "y",
  z: "z",
  h: "h",
  s: "sdg",
  sdg: "s",
  t: "tdg",
  tdg: "t",
  rx: "rx",
  ry: "ry",
  rz: "rz",
};

const R = Math.SQRT1_2;

const FIXED: Readonly<Record<Exclude<NamedGate, "rx" | "ry" | "rz">, Matrix2>> = {
  i: { re: [1, 0, 0, 1], im: [0, 0, 0, 0] },
  x: { re: [0, 1, 1, 0], im: [0, 0, 0, 0] },
  y: { re: [0, 0, 0, 0], im: [0, -1, 1, 0] },
  z: { re: [1, 0, 0, -1], im: [0, 0, 0, 0] },
  h: { re: [R, R, R, -R], im: [0, 0, 0, 0] },
  s: { re: [1, 0, 0, 0], im: [0, 0, 0, 1] },
  sdg: { re: [1, 0, 0, 0], im: [0, 0, 0, -1] },
  t: { re: [1, 0, 0, R], im: [0, 0, 0, R] },
  tdg: { re: [1, 0, 0, R], im: [0, 0, 0, -R] },
};

/**
 * Matrix of a named gate. Rotations need a finite `theta`; the fixed gates must
 * not be given one. Throws RangeError otherwise.
 */
export function gateMatrix(gate: NamedGate, theta?: number): Matrix2 {
  if (!isNamedGate(gate)) throw new RangeError(`Unknown gate ${String(gate)}`);
  if (!isRotation(gate)) {
    if (theta !== undefined) throw new RangeError(`Gate ${gate} takes no angle`);
    return FIXED[gate as keyof typeof FIXED];
  }
  if (theta === undefined || !Number.isFinite(theta)) {
    throw new RangeError(`Gate ${gate} needs a finite angle, got ${String(theta)}`);
  }
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  switch (gate) {
    case "rx":
      return { re: [c, 0, 0, c], im: [0, -s, -s, 0] };
    case "ry":
      return { re: [c, -s, s, c], im: [0, 0, 0, 0] };
    default:
      return { re: [c, 0, 0, c], im: [-s, 0, 0, s] };
  }
}

/** Conjugate transpose. */
export function dagger(m: Matrix2): Matrix2 {
  return {
    re: [m.re[0], m.re[2], m.re[1], m.re[3]],
    im: [-m.im[0], -m.im[2], -m.im[1], -m.im[3]],
  };
}

/** Matrix product a * b (apply b first, then a). */
export function multiply(a: Matrix2, b: Matrix2): Matrix2 {
  const [a00r, a01r, a10r, a11r] = a.re;
  const [a00i, a01i, a10i, a11i] = a.im;
  const [b00r, b01r, b10r, b11r] = b.re;
  const [b00i, b01i, b10i, b11i] = b.im;
  // x*y + z*w for complex x, y, z, w.
  const dot = (
    xr: number,
    xi: number,
    yr: number,
    yi: number,
    zr: number,
    zi: number,
    wr: number,
    wi: number,
  ): [number, number] => [
    xr * yr - xi * yi + zr * wr - zi * wi,
    xr * yi + xi * yr + zr * wi + zi * wr,
  ];
  const c00 = dot(a00r, a00i, b00r, b00i, a01r, a01i, b10r, b10i);
  const c01 = dot(a00r, a00i, b01r, b01i, a01r, a01i, b11r, b11i);
  const c10 = dot(a10r, a10i, b00r, b00i, a11r, a11i, b10r, b10i);
  const c11 = dot(a10r, a10i, b01r, b01i, a11r, a11i, b11r, b11i);
  return { re: [c00[0], c01[0], c10[0], c11[0]], im: [c00[1], c01[1], c10[1], c11[1]] };
}

/** Multiply every entry by e^(i phase). */
export function withPhase(m: Matrix2, phase: number): Matrix2 {
  const c = Math.cos(phase);
  const s = Math.sin(phase);
  const rot = (r: number, i: number): [number, number] => [r * c - i * s, r * s + i * c];
  const e0 = rot(m.re[0], m.im[0]);
  const e1 = rot(m.re[1], m.im[1]);
  const e2 = rot(m.re[2], m.im[2]);
  const e3 = rot(m.re[3], m.im[3]);
  return { re: [e0[0], e1[0], e2[0], e3[0]], im: [e0[1], e1[1], e2[1], e3[1]] };
}

/**
 * True if the matrix has 4 finite real and 4 finite imaginary entries and
 * M^dagger M is the identity within `tol`. Checks the shape too, since matrices
 * can come from JSON.
 */
export function isUnitary(m: Matrix2, tol = 1e-9): boolean {
  const re: unknown = m.re;
  const im: unknown = m.im;
  const finite = (xs: unknown): boolean =>
    Array.isArray(xs) &&
    xs.length === 4 &&
    xs.every((x) => typeof x === "number" && Number.isFinite(x));
  if (!finite(re) || !finite(im)) return false;
  const p = multiply(dagger(m), m);
  const [p00r, p01r, p10r, p11r] = p.re;
  const off = [p00r - 1, p01r, p10r, p11r - 1, ...p.im];
  return off.every((x) => Math.abs(x) <= tol);
}
