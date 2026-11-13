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

// Pinned output of the generator.
// DO NOT EDIT THESE VALUES. Changing them means the generator changed, and that
// breaks every seeded replay (levels, noise runs, saved games, tests). Any change
// here needs explicit approval from the project owner.
describe("pinned output", () => {
  it("createRng(42) gives these first 8 nextUint32 values", () => {
    expect(takeUint32(createRng(42), 8)).toEqual([
      1698727302, 3649385686, 112526994, 3714933728, 3936889994, 2679883055, 3912139601, 3370662020,
    ]);
  });

  it('createRng(42).fork("a") gives these first 8 nextUint32 values', () => {
    expect(takeUint32(createRng(42).fork("a"), 8)).toEqual([
      1619282167, 1826484909, 1857931055, 1064995702, 2106292376, 939643085, 1629950590, 4193247404,
    ]);
  });

  it("createRng(42) gives these first 8 nextFloat values", () => {
    expect(takeFloat(createRng(42), 8)).toEqual([
      0.3955157760507525, 0.026199734694886234, 0.9166286336180485, 0.9108659832536683,
      0.23106236871075192, 0.10200081006144301, 0.9124532034875158, 0.0028833112297139696,
    ]);
  });
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
