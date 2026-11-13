import { describe, expect, it } from "vitest";
import { createRng } from "../rng.ts";
import { randomOp } from "./random.ts";
import { applyOp } from "./run.ts";
import { StateVector } from "./state.ts";

describe("norm", () => {
  it.each([1, 3, 6, 12])("stays within 1e-12 of 1 after 1,000 random gates on %i qubit(s)", (n) => {
    const rng = createRng(1000 + n);
    const s = StateVector.zero(n);
    const kinds = new Set<string>();
    for (let g = 0; g < 1000; g++) {
      const op = randomOp(rng, n);
      kinds.add(op.kind);
      applyOp(s, op);
    }
    expect(Math.abs(s.norm() - 1)).toBeLessThan(1e-12);
    // The random gates really did change the state and used every kind of op.
    expect(s.re[0] === 1 && s.im[0] === 0).toBe(false);
    expect(kinds.has("gate")).toBe(true);
    expect(kinds.has("unitary")).toBe(true);
    if (n > 1) expect(kinds.has("swap")).toBe(true);
  });
});
