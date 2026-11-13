// Lint fixture: must FAIL the test rule (.only). Excluded from vitest discovery.
import { it } from "vitest";

it.only("focused", () => undefined);
