import { describe, expect, it } from "vitest";
import { gateMatrix, type Matrix2 } from "./matrix.ts";
import { StateVector } from "./state.ts";
import { matrixOf, maxMatrixDiff } from "./test-support.ts";

const TOL = 1e-12;
const R = Math.SQRT1_2;

// Literal definitions, written out here so the tests do not trust gateMatrix.
const LIT = {
  I: { re: [1, 0, 0, 1], im: [0, 0, 0, 0] },
  X: { re: [0, 1, 1, 0], im: [0, 0, 0, 0] },
  Y: { re: [0, 0, 0, 0], im: [0, -1, 1, 0] },
  Z: { re: [1, 0, 0, -1], im: [0, 0, 0, 0] },
  H: { re: [R, R, R, -R], im: [0, 0, 0, 0] },
  S: { re: [1, 0, 0, 0], im: [0, 0, 0, 1] },
  Sdg: { re: [1, 0, 0, 0], im: [0, 0, 0, -1] },
  T: { re: [1, 0, 0, R], im: [0, 0, 0, R] },
  Tdg: { re: [1, 0, 0, R], im: [0, 0, 0, -R] },
} satisfies Record<string, Matrix2>;

function apply(...gates: Matrix2[]): (s: StateVector) => void {
  return (s) => {
    for (const g of gates) s.applyMatrix1(g, 0);
  };
}

describe("one-qubit gates", () => {
  it("H|0> = (|0> + |1>)/sqrt(2)", () => {
    const s = StateVector.zero(1);
    s.applyMatrix1(gateMatrix("h"), 0);
    expect(s.re[0]).toBeCloseTo(R, 12);
    expect(s.re[1]).toBeCloseTo(R, 12);
    expect(s.im[0]).toBe(0);
    expect(s.im[1]).toBe(0);
  });

  it("HH = I", () => {
    const h = gateMatrix("h");
    expect(maxMatrixDiff(matrixOf(apply(h, h)), LIT.I)).toBeLessThan(TOL);
  });

  it("HZH = X", () => {
    const h = gateMatrix("h");
    expect(maxMatrixDiff(matrixOf(apply(h, gateMatrix("z"), h)), LIT.X)).toBeLessThan(TOL);
  });

  it("S.S = Z", () => {
    const s = gateMatrix("s");
    expect(maxMatrixDiff(matrixOf(apply(s, s)), LIT.Z)).toBeLessThan(TOL);
  });

  it("T.T = S", () => {
    const t = gateMatrix("t");
    expect(maxMatrixDiff(matrixOf(apply(t, t)), LIT.S)).toBeLessThan(TOL);
  });

  it.each([
    ["i", "I"],
    ["x", "X"],
    ["y", "Y"],
    ["z", "Z"],
    ["h", "H"],
    ["s", "S"],
    ["sdg", "Sdg"],
    ["t", "T"],
    ["tdg", "Tdg"],
  ] as const)("%s matches its textbook matrix", (name, lit) => {
    expect(maxMatrixDiff(matrixOf(apply(gateMatrix(name))), LIT[lit])).toBeLessThan(TOL);
  });
});

describe("rotation convention (Qiskit)", () => {
  const thetas = [0, 0.3, -1.1, Math.PI / 2, Math.PI, 2 * Math.PI, 5.7];

  it.each(thetas)("Rz(%f) = diag(e^(-i theta/2), e^(i theta/2))", (theta) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const want: Matrix2 = { re: [c, 0, 0, c], im: [-s, 0, 0, s] };
    expect(maxMatrixDiff(matrixOf(apply(gateMatrix("rz", theta))), want)).toBeLessThan(TOL);
  });

  it.each(thetas)("Rx(%f) = [[cos, -i sin], [-i sin, cos]] of theta/2", (theta) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const want: Matrix2 = { re: [c, 0, 0, c], im: [0, -s, -s, 0] };
    expect(maxMatrixDiff(matrixOf(apply(gateMatrix("rx", theta))), want)).toBeLessThan(TOL);
  });

  it.each(thetas)("Ry(%f) = [[cos, -sin], [sin, cos]] of theta/2", (theta) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const want: Matrix2 = { re: [c, -s, s, c], im: [0, 0, 0, 0] };
    expect(maxMatrixDiff(matrixOf(apply(gateMatrix("ry", theta))), want)).toBeLessThan(TOL);
  });

  it("rejects a rotation without a finite angle, and an angle on a fixed gate", () => {
    expect(() => gateMatrix("rx")).toThrow(RangeError);
    expect(() => gateMatrix("ry", Number.NaN)).toThrow(RangeError);
    expect(() => gateMatrix("rz", Infinity)).toThrow(RangeError);
    expect(() => gateMatrix("h", 0.5)).toThrow(RangeError);
  });
});
