// Lint fixture: must FAIL the engine rule (no Date in src/engine).
export function now(): number {
  return Date.now();
}
