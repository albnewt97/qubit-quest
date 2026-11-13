// Lint fixture: must FAIL the test rule (.skip). Excluded from vitest discovery.
import { describe, it } from "vitest";

describe.skip("skipped", () => {
  it("never runs", () => undefined);
});
