import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import local from "./tools/lint/engine-imports.js";
import testFiles from "./tools/test-files.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Engine purity: src/engine is pure TypeScript. Imports only from inside
// src/engine and no packages; no Math.random, no Date, no DOM or other host
// globals. Randomness comes from the Rng passed in. Engine tests may also import
// vitest and answer keys under fixtures/golden.
// ---------------------------------------------------------------------------
const ENGINE_MSG = "src/engine must stay pure (see CLAUDE.md).";

const engineImports = ["error", { allowedDirs: ["src/engine"], allowedPackages: [] }];
const engineTestImports = [
  "error",
  { allowedDirs: ["src/engine", "fixtures/golden"], allowedPackages: ["vitest"] },
];

const engineRestrictedSyntax = [
  {
    selector: "ImportExpression",
    message: `${ENGINE_MSG} No dynamic import().`,
  },
  {
    selector: "MemberExpression[object.name='Math'][property.value='random']",
    message: `${ENGINE_MSG} Use the Rng that is passed in, not Math.random.`,
  },
];

const engineRestrictedProperties = [
  "error",
  {
    object: "Math",
    property: "random",
    message: `${ENGINE_MSG} Use the Rng that is passed in, not Math.random.`,
  },
  { object: "globalThis", property: "Date", message: `${ENGINE_MSG} No Date.` },
  { object: "window", property: "Date", message: `${ENGINE_MSG} No Date.` },
];

const engineRestrictedGlobals = [{ name: "Date", message: `${ENGINE_MSG} No Date.` }];

// ---------------------------------------------------------------------------
// Tests may not be skipped or focused: .skip, .only, .todo (and equivalents).
// ---------------------------------------------------------------------------
const TEST_MSG = "Skipped, focused or todo tests are not allowed (see CLAUDE.md).";
const TEST_OBJECTS = "/^(describe|suite|it|test|bench)$/";
const TEST_MODIFIERS = "/^(only|skip|todo|fixme|skipIf|runIf)$/";

// A modifier on a test object or on a member up to two levels below it, with dot
// or string access:
// it.skip, test["only"], test.describe.only, it.concurrent.only,
// test.describe.parallel.only, it.skip.each ...
const testRestrictedSyntax = [
  {
    selector: [
      "MemberExpression",
      `:matches([property.name=${TEST_MODIFIERS}], [property.value=${TEST_MODIFIERS}])`,
      `:matches([object.name=${TEST_OBJECTS}], [object.object.name=${TEST_OBJECTS}], [object.object.object.name=${TEST_OBJECTS}])`,
    ].join(""),
    message: TEST_MSG,
  },
];

const testRestrictedGlobals = ["xit", "xtest", "xdescribe", "fit", "fdescribe"].map((name) => ({
  name,
  message: TEST_MSG,
}));

const ENGINE_FILES = ["src/engine/**/*.{ts,tsx}"];
// The unit-test pattern is shared with Vitest (vite.config.ts), so every file
// linted as a test is also run. tools/test-files.test.ts checks it.
const TEST_FILES = [testFiles.unitTests, `${testFiles.e2eDir}/**/*.{ts,tsx}`];

export default defineConfig([
  globalIgnores(["dist", "coverage", "playwright-report", "test-results"]),

  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    // Not src/engine: it gets ES globals only (see the engine block below).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/engine/**"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["*.ts", "tools/**/*.ts", "e2e/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/ui/**/*.tsx", "src/main.tsx"],
    extends: [reactHooks.configs.flat["recommended-latest"], reactRefresh.configs.vite],
  },

  {
    files: ENGINE_FILES,
    plugins: { local },
    rules: {
      "local/engine-imports": engineImports,
      // typescript-eslint turns no-undef off for TS. In the engine it is the lint
      // guard against DOM and host globals; tsconfig.engine.json is the other.
      "no-undef": "error",
      "no-restricted-properties": engineRestrictedProperties,
      "no-restricted-globals": ["error", ...engineRestrictedGlobals],
      "no-restricted-syntax": ["error", ...engineRestrictedSyntax],
    },
  },
  {
    files: TEST_FILES,
    rules: {
      "no-restricted-globals": ["error", ...testRestrictedGlobals],
      "no-restricted-syntax": ["error", ...testRestrictedSyntax],
    },
  },
  {
    // Engine tests get both sets: flat config replaces (not merges) a rule's options.
    files: ENGINE_FILES.map((g) => g.replace("*.{ts,tsx}", "*.{test,spec}.{ts,tsx}")),
    plugins: { local },
    rules: {
      "local/engine-imports": engineTestImports,
      "no-restricted-globals": ["error", ...engineRestrictedGlobals, ...testRestrictedGlobals],
      "no-restricted-syntax": ["error", ...engineRestrictedSyntax, ...testRestrictedSyntax],
    },
  },

  prettier,
]);
