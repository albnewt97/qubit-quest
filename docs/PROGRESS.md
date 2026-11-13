# Progress

Status of each milestone in docs/BUILD_PLAN.md. Each session reads this file first and updates it last.

| #   | Milestone                              | Status      | Proof it works                                                       |
| --- | -------------------------------------- | ----------- | -------------------------------------------------------------------- |
| M0  | Scaffold and guardrails                | Done        | A deliberately broken test blocks a commit (see M0 below)            |
| M1  | State-vector engine                    | Not started | 200 Qiskit fixtures match to 1 − 1e−9                                 |
| M2  | Circuit builder                        | Not started | Browser test builds a Bell pair both ways                            |
| M3  | State views                            | Not started | View tests on 5 reference states                                     |
| M4  | Level system                           | Not started | Validator rejects 3 broken levels; solve-bot clears all 8            |
| M5  | Lattice prototype                      | Not started | Commutation and distance tests; Gate 1 playtest                      |
| M6  | Primer, Worlds 0–1                     | Not started | Solve-bot clears every level; physics review file                    |
| M7  | Multi-qubit features, Worlds 2–3       | Not started | Teleportation, Deutsch–Jozsa and Grover tests; export checked        |
| M8  | Stabiliser engine and noise            | Not started | 300 Stim fixtures; cross-check against the M1 engine                 |
| M9  | Worlds 4–5                             | Not started | Repetition and Shor code tests; error rates match the formulas       |
| M10 | Decoder and decoder game               | Not started | Correction weight equals PyMatching's on every fixture               |
| M11 | Worlds 6–7, threshold lab              | Not started | Live rates agree with the precomputed curves                         |
| M12 | Classroom layer                        | Not started | Full student and teacher flow passes on the in-memory version        |
| M13 | Sandbox, offline, accessibility, Hindi | Not started | No serious accessibility findings; one level per world plays offline |
| M14 | Release                                | Not started | Every level clears in 3 browsers; budget met                         |

## M0. Scaffold and guardrails

Branch `m00-scaffold`.

### What was done

- Vite + React + TypeScript app on pnpm. `tsconfig.engine.json` covers `src/engine` with the ES library only (no DOM, worker or Node types). `tsconfig.app.json` covers the rest of `src`, and `tsconfig.node.json` covers the configs, `tools` and `e2e`. All three use `strict` and `noUncheckedIndexedAccess`.
- Folders: `src/{engine,game,ui,levels,i18n}`, `fixtures/golden`, `tools/{fixtures,validate-levels,lint}`, `e2e`, `docs/review`.
- Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `validate:levels`, `fixtures`, `check:fixtures` and `verify`.
  - `verify` chains `typecheck && lint && test && validate:levels && check:fixtures && build`, so the first failing step decides the exit code.
- `src/engine/rng.ts` is the seeded generator, with `nextUint32()`, `nextFloat()` and `fork(label)`.
- The ESLint rules for engine purity and for skipped or focused tests are in `eslint.config.js`. The engine import boundary is a local rule, `tools/lint/engine-imports.js`.
- `tools/check-fixtures` checks every file under `fixtures/golden` against its SHA-256 in `fixtures/golden/MANIFEST.json`.
- Guardrails:
  - `.githooks/pre-commit` runs `pnpm verify`. The `prepare` script sets `core.hooksPath`.
  - `.github/workflows/ci.yml` runs `pnpm verify` and Playwright on every push.
  - `.claude/settings.json` holds the deny rules.
- Home screen with the title, which comes from `src/i18n/en.json`.

### Acceptance checks

| Check                                                              | Proved by                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Same seed gives the same first 1,000 values                        | `src/engine/rng.test.ts`: "gives the same first 1,000 values for the same seed"          |
| Two different seeds differ                                         | `rng.test.ts`: "gives different sequences for different seeds"                           |
| `fork("a")` is reproducible and differs from `fork("b")`           | `rng.test.ts`: "is reproducible…", "gives a different stream for fork("a") and fork("b")" |
| Mean of 100,000 `nextFloat()` values within 0.005 of 0.5           | `rng.test.ts`: "has a nextFloat mean within 0.005 of 0.5 over 100,000 draws"             |
| Math.random in src/engine fails the engine lint rule               | `tools/lint/engine-rules.test.ts`: "rejects Math.random"                                 |
| Other engine rules: no Date, no DOM, imports only from inside src/engine | `engine-rules.test.ts` and `engine-typecheck.test.ts` (see the fix-up below)        |
| Skipped, focused and todo tests are lint errors                    | `tools/lint/test-rules.test.ts` (see the fix-up below)                                   |
| No source file is hidden from lint                                 | `engine-rules.test.ts`: "lints every source file in the repository"                      |
| Home screen loads with the title                                   | `e2e/home.spec.ts`                                                                       |
| `pnpm verify` passes                                               | Run locally, exit 0                                                                      |
| A failing test makes `pnpm verify` exit non-zero and blocks a commit | Shown in the session: `src/engine/deliberate-failure.test.ts` gave `verify` exit 1, and `git commit` exited 1 with no new commit. The test was then removed and `verify` returned exit 0. |
| Commits that skip hooks are denied to Claude Code                  | Shown in the session: `git commit --no-verify …` and `git commit -n …` were both refused by `.claude/settings.json`. |
| Edits under `fixtures/golden` are denied to Claude Code            | Shown in the fix-up session (see below).                                                 |

### Decisions

- **Versions** (current stable when M0 was done): TypeScript 6.0.3, not 7.0.2, because typescript-eslint 8.72 supports only TypeScript <6.1 and typed linting needs it. The other pins are exact, in `package.json`.
- **Node and pnpm:** Node 26 LTS in CI through `.nvmrc`. `engines.node` is `>=22.12`, so local Node 22 still works. pnpm 12.18.0 is pinned through `packageManager`.
- **esbuild build script:** pnpm 12 refuses unreviewed dependency build scripts, so esbuild's (pulled in by tsx) is denied in `pnpm-workspace.yaml` (`allowBuilds: esbuild: false`). Its postinstall only optimises the binary, and the platform package already provides it.
- **RNG algorithm:**
  - xoshiro128** on four 32-bit words. The state comes from SplitMix32 and a 64-bit stream key. `nextFloat` takes 53 bits from two draws.
  - `fork(label)` hashes the parent's key with the label. Forking doesn't advance the parent, so the child doesn't depend on how many values the parent has drawn, and nested labels depend on order.
  - The seed must be an integer in [0, 2^32).
  - Changing the algorithm later changes every seeded replay. Treat it as fixed. `rng.test.ts` "pinned output" holds literal values, and changing them needs the owner's approval.
- **Lint tests use virtual files, not sample files on disk.** `tools/lint/lint-virtual.ts` passes text to ESLint's `lintText` with a virtual `filePath`, through the real `eslint.config.js`. (This replaced the `__lint-fixtures__` folder in the fix-up below.)
- **Permission rules** follow code.claude.com/docs/en/permissions. `Edit(/…)` is anchored at the project root and covers Edit, Write and NotebookEdit. `Edit(/.githooks/**)` is a small addition, because editing the hook is another way to skip it.
- `CLAUDE.md` was already at the repository root (added in `de8011a`, before M0). M0 did not move it.

### Known limits

- Bash deny rules match command text only. The docs say they are not a security boundary: `sh -c 'git commit --no-verify'` gets past them. The pre-commit hook and CI are the real enforcement.
- The pre-commit hook checks the working tree, not only the staged content, so unstaged changes can make a commit pass or fail. CI runs on the pushed tree and is the backstop.
- Playwright runs Chromium only. The three-browser runs arrive in M14.
- Not yet pushed, so CI has not run on GitHub.
- The `fixtures/golden` deny rule covers Claude Code's file tools, Bash redirects and the file commands Claude Code recognises (`sed`, `tee` …). It does not cover a script that writes files itself, such as `node -e` or `python3 -c`. So until the CI regeneration job exists (M1), a shell write can get past it. `check:fixtures` catches an edit only if `MANIFEST.json` is not updated along with it.

### Skipped or uncertain

- **Not in place: the CI job that regenerates the deterministic fixtures and fails on any difference** (BUILD_PLAN guardrail table). It is scheduled for M1, together with the first generator. Until then, the only protections for `fixtures/golden` are the permission rule and `check:fixtures`, and a shell write can get past the permission rule (see Known limits).
- No physics text was written.

## M0 fix-up (independent review)

Branch `m00-scaffold`. No changes to `rng.ts`.

### Review findings and the tests that close them

| # | Finding | Closed by |
| - | ------- | --------- |
| 1 | Lint samples lived in `src/engine/__lint-fixtures__/`, which both lint and Vitest ignored, so it was a hiding place. | The folder and both ignore patterns are gone. Every lint test uses `lintText` with a virtual path. `tools/lint/engine-rules.test.ts`: "lints every source file in the repository" uses the real config with no override. It lists every tracked or untracked-but-not-gitignored `.ts/.tsx/.js/…` file and requires each one to be linted. |
| 2 | Banned test forms covered only `.skip`, `.only` and `.todo`, only in `src/engine`, and missed deeper nesting. | `tools/lint/test-rules.test.ts`: "banned test forms" runs 25 forms × 5 folders (`src/engine`, `src/game`, `src/ui`, `tools`, `e2e`) = 125 cases. Forms include `.skip/.only/.todo` on `it/test/describe`, `skipIf`, `runIf`, `fixme`, `xit`, `xtest`, `xdescribe`, `fit`, `fdescribe`, `test.describe.only/skip`, `test.describe.parallel.only`, `it.concurrent.only`, `it.skip.each`, `test["only"]` and `test.skip()` inside a test. "accepts a plain test" is the control in each folder. "engine test files keep the engine rules" rejects Date, Math.random and `import()` in an engine test. |
| 3 | The engine import check was a regex on the specifier text. | The local rule `local/engine-imports` checks the resolved path. `engine-rules.test.ts`, "engine import boundary (non-test files)": `../ui/App`, `./../ui/App.tsx`, `../engine/../ui/App.tsx`, `src/ui/App` and `@/ui/App` each fail, and so do the same five for `game`. Also rejected: re-export, `export *`, type-only import, `import("…")` types, `src/levels`, `src/i18n`, `fixtures/golden`, a bare package (`zod`), react, `node:fs`, vitest, and `../../ui/App` from a nested folder. `./rng.ts`, `../engine/rng.ts` and `../rng.ts` (nested) pass. "engine import boundary (test files)": vitest plus a JSON file under `fixtures/golden` pass. `src/ui`, `src/game`, `@playwright/test`, `node:fs`, `vitest/node` and `fixtures/other.json` fail. |
| 4 | The engine could use the DOM: it was typechecked with DOM types and linted with browser globals. | `tsconfig.engine.json` (lib `ES2023`, `types: []`, `resolveJsonModule`). `tools/lint/engine-typecheck.test.ts`: "rejects document.createElement in an engine file" (TS2584). Also rejects `window`, `self`, `process` and `setTimeout`. Further tests: "lets an engine test import fixture JSON from fixtures/golden, with its types", "has no DOM, worker or Node types", "is part of tsc -b, and the app project does not also claim src/engine". On the lint side, `engine-rules.test.ts`: "rejects document.createElement" and the same in an engine test (`no-undef`), plus "does not flag TypeScript lib types or ES globals as undefined". |
| 5 | The generator's output was not pinned. | `src/engine/rng.test.ts` "pinned output": the first 8 `nextUint32()` of `createRng(42)` and of `createRng(42).fork("a")`, and the first 8 `nextFloat()` of `createRng(42)`, as exact literals, with a do-not-edit comment. |
| 6 | Nothing checked fixture contents, and the deny rule had not been tried live. | `tools/check-fixtures/manifest.test.ts` covers: empty folder, `.gitkeep` only, file without a manifest, match with nested paths, optional `meta`, hash mismatch, listed-but-missing, unlisted file, nested `.gitkeep`, unknown top-level key, missing `files`, non-object `meta`, malformed hash, `..`, absolute and backslash paths, listing `MANIFEST.json`, invalid JSON and symlink. "fixtures/golden matches its manifest" checks the real folder. "pnpm verify runs the fixture check". The live permission check is below. |
| 7 | PROGRESS.md said CLAUDE.md was moved and that nothing was skipped. | Corrected above (Decisions, and Skipped or uncertain). |

### Shown in the session

- **Tests first:** the new tests were run before the implementation, and 132 of 211 failed. The pin tests passed from the start, because they record the current generator. Changing one pinned literal by 1 made "createRng(42) gives these first 8 nextUint32 values" fail, and the literal was restored.
- **Deleting each block of `eslint.config.js` fails tests** (each was restored after its run):

  | Block deleted | Lint tests failing |
  | ------------- | ------------------ |
  | engine block | 27 |
  | test-files block | 100 |
  | engine-tests block | 4 |

  Adding `tools/check-fixtures/**` to the global ignores failed "lints every source file in the repository", which listed the three files.
- **A real engine file, not only a virtual one, is caught:** a temporary `src/engine/tmp-dom-probe.ts` using `document.createElement` gave `no-undef` from `eslint` and TS2584 from `tsc -b`. It was then deleted.
- **Deliberately skipped test in `src/game`:** `src/game/deliberate-skip.test.ts` with `it.skip` made `pnpm verify` exit 1 at the lint step (`3:1 … no-restricted-syntax`). After the file was removed, `verify` exited 0.
- **Permission rule, tried live:** under `fixtures/golden`, a Write of a new file (`permission-probe.json`), a Write over the existing `.gitkeep`, and an Edit of `.gitkeep` were all refused with "File is in a directory that is denied by your permission settings". The folder was unchanged afterwards.
- **What the docs say about new-file writes** (code.claude.com/docs/en/permissions, read 2026-11-13): "`Edit` rules apply to all built-in tools that edit files". A `Write(path)` rule is accepted but never matched ("use `Edit(docs/**)` in place of `Write(docs/**)`"). So new-file writes need no rule of their own. Edit deny rules also apply to Bash redirect targets and to file commands Claude Code recognises, but not to "arbitrary subprocesses that read or write files indirectly, like a Python or Node script".
- `pnpm verify` exit 0 (223 unit tests), `pnpm test:e2e` 1 passed.

### Decisions

- **Virtual lint paths:** the harness's ESLint instance overrides only `parserOptions.projectService`, with `allowDefaultProject` set to the seven fixed paths in `VIRTUAL` (none exists on disk; the harness checks). typescript-eslint keeps one project service per process, so these paths share one default project. That project is `tsconfig.engine.json`, the strictest, so a mismatch can only add type errors. The plain-file controls would show those, and nothing can be hidden.
- **Engine boundary (owner's choice, stricter than the review asked):**
  - Non-test engine files may import only paths that resolve inside `src/engine`, and no packages.
  - Engine tests may also import `vitest` (exactly, not subpaths) and files under `fixtures/golden`.
  - `/x` is resolved both from the repository root and as an absolute path, `src/x` from the root, and `@/x` as `src/x`. Any other specifier is a package.
  - The react ban in `no-restricted-imports` was dropped, because the new rule covers it.
- **`tsconfig.app.json` excludes `src/engine`**, so the project service (lint and editor) assigns engine files to the engine project. `tsc -b` checks it through the reference in `tsconfig.json`.
- **`no-undef` is on for `src/engine`**, which no longer gets browser globals. It gave no false positives on TypeScript types (test above), so the fallback to `no-restricted-globals` was not needed.
- **Banned-test selector:** one `no-restricted-syntax` selector. It matches a modifier (`only|skip|todo|fixme|skipIf|runIf`) by name or string key, on a test object (`describe|suite|it|test|bench`) or on a member up to two levels below it.
- **MANIFEST.json format:** `{"meta"?: {…}, "files": {"<posix path relative to fixtures/golden>": "<sha256 hex>"}}`. `meta` is optional and not hashed, and any other top-level key is an error. `MANIFEST.json` and the top-level `.gitkeep` are not listed. With no manifest, the folder must hold no other files. Writing the manifest is the generator's job from M1 on; none was written by hand.

### For M1

- `tools/fixtures` must write `fixtures/golden/MANIFEST.json` whenever it writes fixtures, or `check:fixtures` fails.
- Add the CI job that runs the deterministic generators and fails on any difference.
- Engine tests load answer keys with a plain JSON import (`resolveJsonModule`). Loading many files through `import.meta.glob` would need `vite/client` types in `tsconfig.engine.json`; ask before adding them.
