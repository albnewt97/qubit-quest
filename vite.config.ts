/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tools/**/*.test.ts"],
    exclude: ["**/node_modules/**", "e2e/**"],
    environment: "node",
  },
});
