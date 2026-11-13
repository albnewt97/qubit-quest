// Lint fixture: must FAIL the engine rule (no React in src/engine).
import { useState } from "react";

export const hook = useState;
