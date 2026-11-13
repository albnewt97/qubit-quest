// Lints source text as if it were a file at a virtual path, through the real
// eslint.config.js. Nothing is written to disk.
//
// Typed linting only accepts files that exist and belong to a tsconfig, so the
// instance here overrides one parser option: `allowDefaultProject` for the fixed
// virtual paths below. The rule blocks, `files` globs and ignores are the real
// config's.
//
// typescript-eslint keeps one project service per process, so all virtual paths
// share one default project. It is tsconfig.engine.json, the strictest (no DOM, no
// Node types). For a non-engine path that can only add type errors, which the
// plain-file controls in the tests would show; it cannot hide a lint error.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint, type Linter } from "eslint";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The only paths that may be linted as virtual text. None may exist on disk. */
export const VIRTUAL = {
  engine: "src/engine/__virtual__.ts",
  engineNested: "src/engine/sub/__virtual__.ts",
  engineTest: "src/engine/__virtual__.test.ts",
  gameTest: "src/game/__virtual__.test.ts",
  uiTest: "src/ui/__virtual__.test.ts",
  toolsTest: "tools/__virtual__.test.ts",
  e2eSpec: "e2e/__virtual__.spec.ts",
} as const;

export type VirtualPath = (typeof VIRTUAL)[keyof typeof VIRTUAL];

let instance: ESLint | undefined;

function eslintInstance(): ESLint {
  instance ??= new ESLint({
    cwd: root,
    overrideConfig: {
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: Object.values(VIRTUAL),
            defaultProject: "tsconfig.engine.json",
          },
        },
      },
    },
  });
  return instance;
}

export interface LintProblem {
  ruleId: string | null;
  line: number;
  message: string;
}

/** Lint `code` as the file `filePath`. Returns every error and warning. */
export async function lintVirtual(filePath: VirtualPath, code: string): Promise<LintProblem[]> {
  if (existsSync(path.join(root, filePath))) {
    throw new Error(`${filePath} exists on disk; virtual lint paths must not exist.`);
  }
  const eslint = eslintInstance();
  if (await eslint.isPathIgnored(path.join(root, filePath))) {
    throw new Error(`${filePath} is ignored by the lint config, so linting it proves nothing.`);
  }
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  if (result === undefined) throw new Error(`no lint result for ${filePath}`);
  const fatal = result.messages.find((m: Linter.LintMessage) => m.fatal === true);
  if (fatal !== undefined) throw new Error(`${filePath}: ${fatal.message}`);
  return result.messages.map((m) => ({ ruleId: m.ruleId, line: m.line, message: m.message }));
}

/** Rule IDs reported by lint, for `toContainEqual` checks. */
export function rulesOf(problems: LintProblem[]): { ruleId: string | null; line: number }[] {
  return problems.map(({ ruleId, line }) => ({ ruleId, line }));
}
