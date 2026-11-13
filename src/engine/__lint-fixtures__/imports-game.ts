// Lint fixture: must FAIL the engine rule (no imports from src/game).
// @ts-expect-error -- src/game has no modules yet; only the import path matters here.
import { thing } from "../../game/anything.ts";

export const value: unknown = thing;
