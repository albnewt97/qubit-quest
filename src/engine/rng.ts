/**
 * Seeded pseudo-random number generator for the engine.
 *
 * All randomness in src/engine comes from an Rng passed in by the caller, so every
 * level, noise replay and test is reproducible from a seed.
 *
 * Algorithm: xoshiro128** (Blackman & Vigna) on four 32-bit words. Each stream is
 * identified by a 64-bit key (two uint32 words); the generator state is filled from
 * that key with SplitMix32. A root stream's key comes from its seed; a child stream's
 * key is a hash of its parent's key and its label. Not cryptographically secure.
 */
export interface Rng {
  /** Next integer, uniform in [0, 2^32). */
  nextUint32(): number;
  /** Next float, uniform in [0, 1), with 53 bits of precision. */
  nextFloat(): number;
  /**
   * Derive an independent child stream identified by `label`.
   *
   * The child depends only on the parent's identity (seed and fork path) and the
   * label, not on how many values the parent has drawn, and forking does not
   * advance the parent. So `fork("noise")` always returns the same stream for the
   * same parent, and `fork("a").fork("b")` differs from `fork("b").fork("a")`.
   */
  fork(label: string): Rng;
}

const UINT32_RANGE = 2 ** 32;
const ROOT_TAG = 0x6a09e667;
const TWO_POW_26 = 2 ** 26;
const TWO_POW_53 = 2 ** 53;

/** Create a root stream. `seed` must be an integer in [0, 2^32). */
export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE) {
    throw new RangeError(`Rng seed must be an integer in [0, 2^32), got ${String(seed)}`);
  }
  return new Xoshiro128StarStar(ROOT_TAG, seed >>> 0);
}

class Xoshiro128StarStar implements Rng {
  readonly #keyHi: number;
  readonly #keyLo: number;
  #s0: number;
  #s1: number;
  #s2: number;
  #s3: number;

  constructor(keyHi: number, keyLo: number) {
    this.#keyHi = keyHi;
    this.#keyLo = keyLo;
    // SplitMix32 is a bijection of its counter, so two consecutive outputs are never
    // both zero; hence the xoshiro state can never be all zeros.
    const [a, b] = splitMix32Pair(keyHi);
    const [c, d] = splitMix32Pair(keyLo);
    this.#s0 = a;
    this.#s1 = b;
    this.#s2 = c;
    this.#s3 = d;
  }

  nextUint32(): number {
    const s1 = this.#s1;
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9);
    const t = s1 << 9;
    this.#s2 ^= this.#s0;
    this.#s3 ^= s1;
    this.#s1 ^= this.#s2;
    this.#s0 ^= this.#s3;
    this.#s2 ^= t;
    this.#s3 = rotl(this.#s3, 11);
    return result >>> 0;
  }

  nextFloat(): number {
    const high = this.nextUint32() >>> 5; // 27 bits
    const low = this.nextUint32() >>> 6; // 26 bits
    return (high * TWO_POW_26 + low) / TWO_POW_53;
  }

  fork(label: string): Rng {
    if (typeof label !== "string") {
      throw new TypeError(`Rng fork label must be a string, got ${typeof label}`);
    }
    const hi = hashLabel(label, mixPair(this.#keyHi, this.#keyLo, 1));
    const lo = hashLabel(label, mixPair(this.#keyHi, this.#keyLo, 2));
    return new Xoshiro128StarStar(hi, lo);
  }
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** Two consecutive SplitMix32 outputs starting from `seed`. */
function splitMix32Pair(seed: number): [number, number] {
  const first = (seed + 0x9e3779b9) | 0;
  const second = (first + 0x9e3779b9) | 0;
  return [splitMix32Output(first), splitMix32Output(second)];
}

function splitMix32Output(counter: number): number {
  let z = counter;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

/** MurmurHash3 finaliser: a bijective 32-bit avalanche mix. */
function fmix32(value: number): number {
  let h = value;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Mix both 32-bit key words into one word; `tag` gives distinct outputs per use. */
function mixPair(hi: number, lo: number, tag: number): number {
  return fmix32(fmix32(hi ^ Math.imul(tag, 0x9e3779b9)) ^ lo);
}

/** Hash a label's UTF-16 code units, starting from `seed`. */
function hashLabel(label: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return fmix32(h ^ label.length);
}
