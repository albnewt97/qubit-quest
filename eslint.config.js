import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// ---------------------------------------------------------------------------
// Engine purity: src/engine is pure TypeScript. No React, no UI or game imports,
// no Math.random, no Date. Randomness comes from the Rng passed in.
// ---------------------------------------------------------------------------
const ENGINE_MSG = "src/engine must stay pure (see CLAUDE.md).";

const engineRestrictedImports = [
  "error",
  {
    paths: [
      { name: "react", message: `${ENGINE_MSG} No React.` },
      { name: "react-dom", message: `${ENGINE_MSG} No React.` },
    ],
    patterns: [
      { group: ["react/*", "react-dom/*"], message: `${ENGINE_MSG} No React.` },
      {
        // Relative paths that climb into src/ui or src/game, or root/alias paths to them.
        regex: String.raw`^(\.\./)+(ui|game)([/.]|$)|(^|/)src/(ui|game)([/.]|$)|^@/(ui|game)([/.]|$)`,
        message: `${ENGINE_MSG} The engine may not import from src/ui or src/game.`,
      },
    ],
  },
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

const testRestrictedSyntax = [
  {
    // it.skip, test.only, describe.todo, test.fixme ...
    selector: `MemberExpression[object.name=${TEST_OBJECTS}][property.name=${TEST_MODIFIERS}]`,
    message: TEST_MSG,
  },
  {
    // test.describe.only, it.concurrent.skip ...
    selector: `MemberExpression[object.type='MemberExpression'][object.object.name=${TEST_OBJECTS}][property.name=${TEST_MODIFIERS}]`,
    message: TEST_MSG,
  },
];

const testRestrictedGlobals = ["xit", "xtest", "xdescribe", "fit", "fdescribe"].map((name) => ({
  name,
  message: TEST_MSG,
}));

const ENGINE_FILES = ["src/engine/**/*.{ts,tsx}"];
const TEST_FILES = ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "e2e/**/*.{ts,tsx}"];

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    // Lint-rule samples that must fail; linted only by tools/lint/eslint-rules.test.ts.
    "**/__lint-fixtures__/**",
  ]),

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
    files: ["src/**/*.{ts,tsx}"],
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
    rules: {
      "no-restricted-imports": engineRestrictedImports,
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
    rules: {
      "no-restricted-globals": ["error", ...engineRestrictedGlobals, ...testRestrictedGlobals],
      "no-restricted-syntax": ["error", ...engineRestrictedSyntax, ...testRestrictedSyntax],
    },
  },

  prettier,
]);
