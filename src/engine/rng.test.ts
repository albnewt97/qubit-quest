import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "./rng.ts";

function takeUint32(rng: Rng, n: number): number[] {
  return Array.from({ length: n }, () => rng.nextUint32());
}

function takeFloat(rng: Rng, n: number): number[] {
  return Array.from({ length: n }, () => rng.nextFloat());
}

describe("createRng", () => {
  it("gives the same first 1,000 values for the same seed", () => {
    expect(takeUint32(createRng(42), 1000)).toEqual(takeUint32(createRng(42), 1000));
    expect(takeFloat(createRng(42), 1000)).toEqual(takeFloat(createRng(42), 1000));
  });

  it("gives different sequences for different seeds", () => {
    const a = takeUint32(createRng(1), 1000);
    const b = takeUint32(createRng(2), 1000);
    expect(a).not.toEqual(b);
    // Not just a shifted or mostly-equal stream: nearly every position differs.
    const samePositions = a.filter((v, i) => v === b[i]).length;
    expect(samePositions).toBeLessThan(5);
  });

  it("produces nextUint32 values that are integers in [0, 2^32)", () => {
    for (const v of takeUint32(createRng(7), 10_000)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2 ** 32);
    }
  });

  it("produces nextFloat values in [0, 1)", () => {
    for (const v of takeFloat(createRng(7), 10_000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("has a nextFloat mean within 0.005 of 0.5 over 100,000 draws", () => {
    const rng = createRng(12345);
    let sum = 0;
    for (let i = 0; i < 100_000; i++) sum += rng.nextFloat();
    expect(Math.abs(sum / 100_000 - 0.5)).toBeLessThanOrEqual(0.005);
  });

  it.each([-1, 1.5, 2 ** 32, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid seed %s",
    (seed) => {
      expect(() => createRng(seed)).toThrow(RangeError);
    },
  );
});

describe("fork", () => {
  it('is reproducible: fork("a") from equal parents gives equal streams', () => {
    const a1 = createRng(99).fork("a");
    const a2 = createRng(99).fork("a");
    expect(takeUint32(a1, 1000)).toEqual(takeUint32(a2, 1000));
  });

  it('gives a different stream for fork("a") and fork("b")', () => {
    const parent = createRng(99);
    expect(takeUint32(parent.fork("a"), 1000)).not.toEqual(takeUint32(parent.fork("b"), 1000));
  });

  it("differs from the parent stream", () => {
    expect(takeUint32(createRng(99).fork("a"), 1000)).not.toEqual(takeUint32(createRng(99), 1000));
  });

  it("does not advance or alter the parent", () => {
    const forked = createRng(5);
    forked.fork("a");
    forked.fork("b").nextUint32();
    expect(takeUint32(forked, 1000)).toEqual(takeUint32(createRng(5), 1000));
  });

  it("does not depend on how many values the parent has drawn", () => {
    const fresh = createRng(5);
    const used = createRng(5);
    takeUint32(used, 17);
    expect(takeUint32(used.fork("a"), 100)).toEqual(takeUint32(fresh.fork("a"), 100));
  });

  it("depends on the order of nested labels", () => {
    const ab = createRng(5).fork("a").fork("b");
    const ba = createRng(5).fork("b").fork("a");
    expect(takeUint32(ab, 100)).not.toEqual(takeUint32(ba, 100));
  });

  it("rejects a non-string label", () => {
    const rng = createRng(5);
    expect(() => rng.fork(3 as unknown as string)).toThrow(TypeError);
  });
});
