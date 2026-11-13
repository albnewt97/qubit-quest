/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import testFiles from "./tools/test-files.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  test: {
    // Shared with eslint.config.js: every file linted as a test is run.
    include: [testFiles.unitTests],
    exclude: ["**/node_modules/**", `${testFiles.e2eDir}/**`],
    environment: "node",
  },
});
