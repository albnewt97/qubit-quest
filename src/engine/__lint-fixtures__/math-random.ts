// Lint fixture: must FAIL the engine rule. Excluded from `pnpm lint`; checked by
// tools/lint/eslint-rules.test.ts. Engine code must take randomness from an Rng.
export function roll(): number {
  return Math.random();
}
