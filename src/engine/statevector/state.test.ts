import { describe, expect, it } from "vitest";
import { createRng } from "../rng.ts";
import { gateMatrix } from "./matrix.ts";
import { MAX_QUBITS, StateVector } from "./state.ts";
import { at } from "./test-support.ts";

const R = Math.SQRT1_2;
const H = gateMatrix("h");
const X = gateMatrix("x");
const Z = gateMatrix("z");

function expectBloch(s: StateVector, q: number, want: [number, number, number]): void {
  const b = s.reducedBloch(q);
  expect(b.x).toBeCloseTo(want[0], 12);
  expect(b.y).toBeCloseTo(want[1], 12);
  expect(b.z).toBeCloseTo(want[2], 12);
}

describe("qubit order (qubit 0 is the leftmost bit of the ket)", () => {
  it("CNOT(0 -> 1) on |10> gives |11>", () => {
    const s = StateVector.basis(2, 0b10);
    s.applyMatrix1(X, 1, [0]);
    expect(Array.from(s.re)).toEqual([0, 0, 0, 1]);
    expect(Array.from(s.im)).toEqual([0, 0, 0, 0]);
  });

  it("CNOT(0 -> 1) on |01> gives |01>", () => {
    const s = StateVector.basis(2, 0b01);
    s.applyMatrix1(X, 1, [0]);
    expect(Array.from(s.re)).toEqual([0, 1, 0, 0]);
    expect(Array.from(s.im)).toEqual([0, 0, 0, 0]);
  });

  it("on 3 qubits, X on qubit 0 takes |000> to index 4 and X on qubit 2 to index 1", () => {
    const a = StateVector.zero(3);
    a.applyMatrix1(X, 0);
    expect(Array.from(a.re)).toEqual([0, 0, 0, 0, 1, 0, 0, 0]);
    const b = StateVector.zero(3);
    b.applyMatrix1(X, 2);
    expect(Array.from(b.re)).toEqual([0, 1, 0, 0, 0, 0, 0, 0]);
  });
});

describe("Bell state", () => {
  it("H(0) then CNOT(0 -> 1) on |00> gives (|00> + |11>)/sqrt(2), with zero Bloch vectors", () => {
    const s = StateVector.zero(2);
    s.applyMatrix1(H, 0);
    s.applyMatrix1(X, 1, [0]);
    const want = [R, 0, 0, R];
    for (let i = 0; i < 4; i++) {
      expect(s.re[i]).toBeCloseTo(at(want, i), 12);
      expect(s.im[i]).toBe(0);
    }
    expectBloch(s, 0, [0, 0, 0]);
    expectBloch(s, 1, [0, 0, 0]);
  });
});

describe("multi-qubit gates", () => {
  it("CZ flips the sign of |11> only", () => {
    for (let i = 0; i < 4; i++) {
      const s = StateVector.basis(2, i);
      s.applyMatrix1(Z, 1, [0]);
      expect(s.re[i]).toBe(i === 3 ? -1 : 1);
    }
  });

  it("Toffoli(0, 1 -> 2) maps |110> to |111> and leaves |100> alone", () => {
    const a = StateVector.basis(3, 0b110);
    a.applyMatrix1(X, 2, [0, 1]);
    expect(a.re[0b111]).toBe(1);
    const b = StateVector.basis(3, 0b100);
    b.applyMatrix1(X, 2, [0, 1]);
    expect(b.re[0b100]).toBe(1);
  });

  it("SWAP(0, 2) maps |100> to |001>", () => {
    const s = StateVector.basis(3, 0b100);
    s.applySwap(0, 2);
    expect(s.re[0b001]).toBe(1);
    expect(s.re[0b100]).toBe(0);
  });

  it("a controlled S applies phase i to |11> only", () => {
    const s = StateVector.zero(2);
    s.applyMatrix1(H, 0);
    s.applyMatrix1(H, 1);
    s.applyMatrix1(gateMatrix("s"), 1, [0]);
    expect(s.re[3]).toBeCloseTo(0, 12);
    expect(s.im[3]).toBeCloseTo(0.5, 12);
    expect(s.re[2]).toBeCloseTo(0.5, 12);
    expect(s.im[2]).toBe(0);
  });
});

describe("reducedBloch", () => {
  it("gives +z for |0>, -z for |1>, +x for |+> and +y for |+i> = SH|0>", () => {
    expectBloch(StateVector.zero(1), 0, [0, 0, 1]);
    expectBloch(StateVector.basis(1, 1), 0, [0, 0, -1]);
    const plus = StateVector.zero(1);
    plus.applyMatrix1(H, 0);
    expectBloch(plus, 0, [1, 0, 0]);
    const plusI = StateVector.zero(1);
    plusI.applyMatrix1(H, 0);
    plusI.applyMatrix1(gateMatrix("s"), 0);
    expectBloch(plusI, 0, [0, 1, 0]);
  });

  it("reads each qubit of a product state on its own", () => {
    // |0> (x) |+> (x) |1>
    const s = StateVector.zero(3);
    s.applyMatrix1(H, 1);
    s.applyMatrix1(X, 2);
    expectBloch(s, 0, [0, 0, 1]);
    expectBloch(s, 1, [1, 0, 0]);
    expectBloch(s, 2, [0, 0, -1]);
  });
});

describe("probabilities and sample", () => {
  it("probabilities() is exact", () => {
    const s = StateVector.zero(2);
    s.applyMatrix1(gateMatrix("ry", (2 * Math.PI) / 3), 0); // cos^2(pi/3) = 1/4
    const p = s.probabilities();
    expect(p).toHaveLength(4);
    expect(p[0]).toBeCloseTo(0.25, 15);
    expect(p[2]).toBeCloseTo(0.75, 15);
    expect(p[1]).toBe(0);
    expect(p[3]).toBe(0);
  });

  it("sample() counts shots per basis index without collapsing the state", () => {
    const s = StateVector.zero(2);
    s.applyMatrix1(H, 0);
    s.applyMatrix1(X, 1, [0]);
    const before = s.clone();
    const counts = s.sample(4000, createRng(3));
    expect(counts).toHaveLength(4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4000);
    expect(counts[1]).toBe(0);
    expect(counts[2]).toBe(0);
    expect(Math.abs(at(counts, 0) - 2000)).toBeLessThan(4 * Math.sqrt(1000));
    expect(Array.from(s.re)).toEqual(Array.from(before.re));
    expect(Array.from(s.im)).toEqual(Array.from(before.im));
  });

  it("sample() is reproducible from the seed", () => {
    const s = StateVector.zero(3);
    for (let q = 0; q < 3; q++) s.applyMatrix1(H, q);
    expect(Array.from(s.sample(500, createRng(9)))).toEqual(
      Array.from(s.sample(500, createRng(9))),
    );
  });
});

describe("input validation", () => {
  it("accepts 1 to 12 qubits and rejects anything else", () => {
    expect(MAX_QUBITS).toBe(12);
    expect(StateVector.zero(12).re).toHaveLength(4096);
    for (const n of [0, 13, 1.5, -1, Number.NaN]) {
      expect(() => StateVector.zero(n)).toThrow(RangeError);
    }
  });

  it("rejects a basis index out of range", () => {
    expect(() => StateVector.basis(2, 4)).toThrow(RangeError);
    expect(() => StateVector.basis(2, -1)).toThrow(RangeError);
    expect(() => StateVector.basis(2, 0.5)).toThrow(RangeError);
  });

  it("fromAmplitudes copies its input and rejects bad lengths and unnormalised vectors", () => {
    const re = [R, R];
    const s = StateVector.fromAmplitudes(re, [0, 0]);
    re[0] = 5;
    expect(s.re[0]).toBe(R);
    expect(s.qubits).toBe(1);
    expect(() => StateVector.fromAmplitudes([1, 0, 0], [0, 0, 0])).toThrow(RangeError);
    expect(() => StateVector.fromAmplitudes([1, 0], [0])).toThrow(RangeError);
    expect(() => StateVector.fromAmplitudes([1, 1], [0, 0])).toThrow(RangeError);
    expect(() => StateVector.fromAmplitudes([1], [0])).toThrow(RangeError);
  });

  it("rejects bad targets and controls", () => {
    const s = StateVector.zero(2);
    expect(() => {
      s.applyMatrix1(X, 2);
    }).toThrow(RangeError);
    expect(() => {
      s.applyMatrix1(X, -1);
    }).toThrow(RangeError);
    expect(() => {
      s.applyMatrix1(X, 0, [0]);
    }).toThrow(RangeError);
    expect(() => {
      s.applyMatrix1(X, 0, [2]);
    }).toThrow(RangeError);
    expect(() => {
      s.applyMatrix1(X, 0, [1, 1]);
    }).toThrow(RangeError);
    expect(() => {
      s.applySwap(1, 1);
    }).toThrow(RangeError);
    expect(() => {
      s.applySwap(0, 5);
    }).toThrow(RangeError);
  });

  it("rejects bad qubits and shot counts in measure, sample and reducedBloch", () => {
    const s = StateVector.zero(2);
    const rng = createRng(1);
    expect(() => s.measure(2, rng)).toThrow(RangeError);
    expect(() => s.reducedBloch(-1)).toThrow(RangeError);
    expect(() => s.sample(-1, rng)).toThrow(RangeError);
    expect(() => s.sample(1.5, rng)).toThrow(RangeError);
    expect(Array.from(s.sample(0, rng))).toEqual([0, 0, 0, 0]);
  });
});
