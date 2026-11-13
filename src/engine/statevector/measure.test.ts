import { describe, expect, it } from "vitest";
import { createRng } from "../rng.ts";
import { gateMatrix } from "./matrix.ts";
import { StateVector } from "./state.ts";

describe("measure", () => {
  it("on |+> gives 50/50 within 4 standard deviations over 10,000 trials, and collapses to the outcome", () => {
    const trials = 10_000;
    const rng = createRng(20261114);
    const h = gateMatrix("h");
    let ones = 0;
    for (let t = 0; t < trials; t++) {
      const s = StateVector.zero(1);
      s.applyMatrix1(h, 0);
      const outcome = s.measure(0, rng);
      expect([0, 1]).toContain(outcome);
      ones += outcome;
      // The state after measurement is exactly the basis state that was measured.
      expect(s.re[outcome]).toBeCloseTo(1, 12);
      expect(s.im[outcome]).toBe(0);
      expect(s.re[1 - outcome]).toBe(0);
      expect(s.im[1 - outcome]).toBe(0);
    }
    const sigma = Math.sqrt(trials * 0.25);
    expect(Math.abs(ones - trials / 2)).toBeLessThanOrEqual(4 * sigma);
    // Both outcomes must actually occur.
    expect(ones).toBeGreaterThan(0);
    expect(ones).toBeLessThan(trials);
  });

  it("collapses one qubit of a Bell pair and renormalises", () => {
    const s = StateVector.zero(2);
    s.applyMatrix1(gateMatrix("h"), 0);
    s.applyMatrix1(gateMatrix("x"), 1, [0]);
    const outcome = s.measure(0, createRng(5));
    const kept = outcome === 0 ? 0b00 : 0b11;
    expect(s.re[kept]).toBeCloseTo(1, 12);
    expect(s.norm()).toBeCloseTo(1, 12);
    expect(s.measure(1, createRng(99))).toBe(outcome);
  });

  it("never returns an outcome of probability zero", () => {
    const rng = createRng(17);
    for (let t = 0; t < 200; t++) {
      expect(StateVector.zero(1).measure(0, rng)).toBe(0);
      expect(StateVector.basis(1, 1).measure(0, rng)).toBe(1);
    }
  });

  it("keeps the relative phases of the surviving amplitudes", () => {
    // (|00> + |01> + i|10> + i|11>)/2: measuring qubit 0 as 1 leaves i(|0> + |1>)/sqrt(2) on qubit 1.
    const s = StateVector.fromAmplitudes([0.5, 0.5, 0, 0], [0, 0, 0.5, 0.5]);
    const rng = createRng(1);
    let after: StateVector;
    // Measure fresh copies until one gives 1 (each draw is 50/50).
    do {
      after = s.clone();
    } while (after.measure(0, rng) !== 1);
    expect(after.re[2]).toBeCloseTo(0, 12);
    expect(after.im[2]).toBeCloseTo(Math.SQRT1_2, 12);
    expect(after.im[3]).toBeCloseTo(Math.SQRT1_2, 12);
    expect(after.re[0]).toBe(0);
    expect(after.re[1]).toBe(0);
  });
});
