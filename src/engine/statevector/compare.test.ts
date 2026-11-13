import { describe, expect, it } from "vitest";
import { equalUpToGlobalPhase, fidelity, inner } from "./compare.ts";
import { gateMatrix } from "./matrix.ts";
import { StateVector } from "./state.ts";

const R = Math.SQRT1_2;

function plus(): StateVector {
  const s = StateVector.zero(1);
  s.applyMatrix1(gateMatrix("h"), 0);
  return s;
}

describe("fidelity and equalUpToGlobalPhase", () => {
  it("inner(a, b) conjugates a", () => {
    const a = StateVector.fromAmplitudes([R, 0], [0, R]); // (|0> + i|1>)/sqrt(2)
    const b = StateVector.basis(1, 1);
    const z = inner(a, b);
    expect(z.re).toBeCloseTo(0, 15);
    expect(z.im).toBeCloseTo(-R, 15);
  });

  it("fidelity is |<a|b>|^2", () => {
    expect(fidelity(plus(), StateVector.zero(1))).toBeCloseTo(0.5, 15);
    expect(fidelity(StateVector.zero(1), StateVector.basis(1, 1))).toBe(0);
    expect(fidelity(plus(), plus())).toBeCloseTo(1, 15);
  });

  it("treats states that differ by a global phase as equal, and a relative phase as different", () => {
    const a = plus();
    const global = StateVector.fromAmplitudes([0, 0], [R, R]); // i|+>
    const relative = StateVector.fromAmplitudes([R, -R], [0, 0]); // |->
    expect(equalUpToGlobalPhase(a, global)).toBe(true);
    expect(equalUpToGlobalPhase(a, relative)).toBe(false);
  });

  it("uses the 1 - 1e-9 tolerance by default", () => {
    const eps = 1e-5; // fidelity cos^2(eps) ~ 1 - 1e-10
    const near = StateVector.fromAmplitudes([Math.cos(eps), Math.sin(eps)], [0, 0]);
    const far = StateVector.fromAmplitudes([Math.cos(1e-4), Math.sin(1e-4)], [0, 0]); // ~ 1 - 1e-8
    expect(equalUpToGlobalPhase(StateVector.zero(1), near)).toBe(true);
    expect(equalUpToGlobalPhase(StateVector.zero(1), far)).toBe(false);
  });

  it("rejects states on different numbers of qubits", () => {
    expect(() => fidelity(StateVector.zero(1), StateVector.zero(2))).toThrow(RangeError);
    expect(() => equalUpToGlobalPhase(StateVector.zero(2), StateVector.zero(1))).toThrow(
      RangeError,
    );
  });
});
