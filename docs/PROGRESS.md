# Progress

Status of each milestone in docs/BUILD_PLAN.md. Each session reads this file first and updates it last.

| #   | Milestone                              | Status      | Proof it works                                                       |
| --- | -------------------------------------- | ----------- | -------------------------------------------------------------------- |
| M0  | Scaffold and guardrails                | Done        | A deliberately broken test blocks a commit (see M0 below)            |
| M1  | State-vector engine                    | Done        | 200 Qiskit fixtures match to 1 − 1e−9 (see M1 below)                  |
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
- **Open findings from the second review (of `fd2fb1d`), recorded and not fixed.** Line numbers are as of `fd2fb1d`. Its findings 2 (test files linted but never run) and 5 (uncommitted BUILD_PLAN.md edits) were closed in the final fix-up below.
  1. **Medium: the lint ban on skipped tests misses some forms.** The selector matches only objects literally named `describe`, `suite`, `it`, `test` or `bench`, so these give no lint error: `ctx.skip()` inside a test, the destructured `({ skip }) => skip()`, a renamed import (`import { it as check } from "vitest"; check.skip(…)`), Playwright's fixture pattern (`const t = base.extend({}); t.skip(…)`), and `it.fails(…)`, which inverts a test. No test covers these forms. *Partly mitigated by the final fix-up:* in unit tests, the first three are now caught at run time, because `pnpm test` fails on any skipped test. Still not caught: any skip in `e2e` (`pnpm test:e2e` has no such check), and `it.fails`, which reports as passed.
  2. **Medium: not every permission rule was tried live.** M0 item 6 asks for each rule to be confirmed by attempting the denied action. Only `Edit(/fixtures/golden/**)`, `--no-verify` and `-n` have a recorded attempt. Not confirmed: `Edit(/.githooks/**)`, `-nm`, `-an`, `git -c *` and `git config *core.hooksPath*`. (The first review reports that its own `git config core.hooksPath` command was refused, but that was incidental, not a recorded check.) Gaps in the rules themselves (`.claude/settings.json`): `git commit -nq -m x` and `git commit -na -m x` match no pattern, and neither do abbreviations such as `--no-veri`, which git accepts. Nothing denies edits to `.claude/settings.json` itself, and whether Claude Code protects that file by default has not been checked. The acceptance row "Commits that skip hooks are denied to Claude Code" reads as if `-n` were fully covered; it is not.
  3. **Low: two engine-purity gaps.** `globalThis.Math.random()` passes lint and `tsc` (inconsistent with `globalThis.Date`, which is banned), and so does `new Intl.DateTimeFormat().format()`, which reads the clock. No test covers either.
  4. **Low: branches with no test.**
     - `src/engine/rng.ts`: the boundary seeds 0 and 2^32 − 1 (accepted at line 35); `fork("")`; the mean and range of a forked stream (only the root stream is checked); whether a forked stream can equal some root seed's stream.
     - `tools/lint/engine-imports.js` (the review's probe showed each works, but no repo test covers it): the non-literal import message (lines 86–93), `import x = require(…)` (lines 130–134), the `/x` absolute-path branch (line 35), and stripping `?query` plus the bare `src`, `.` and `..` specifiers (lines 31–36).
     - `tools/validate-levels/index.ts` lines 16–22: the failure path ("a level can never ship before the validator does").
  5. **Nit:** the CI step name in `.github/workflows/ci.yml` (line 25) does not mention the fixture check, though `pnpm verify` runs it.

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

## M0 final fix-up (second review)

Branch `m00-scaffold`. No changes to `rng.ts`. The remaining findings of the second review are under Known limits in M0 above.

### What was done

- **One shared test-file pattern.** `tools/test-files.json` holds `unitTests` (`**/*.{test,spec}.{ts,tsx}`) and `e2eDir` (`e2e`). `eslint.config.js` builds its test-file globs from it, and `vite.config.ts` uses `unitTests` as Vitest's only `include` and excludes `e2e/**`. Before this, Vitest ran only `src/**/*.test.{ts,tsx}` and `tools/**/*.test.ts`, so a `src/game/x.spec.ts` or a test outside `src` and `tools` was linted but never run.
- **The unit-test step fails on tests that did not run.** The `test` script (the unit-test step of `verify`) adds the reporter `tools/vitest/no-skipped-reporter.ts`. After the run, it lists every test whose state is not passed or failed (skipped, todo, pending), and every skipped or pending suite, and sets exit code 1.
- `docs/BUILD_PLAN.md`: the owner's edits are committed unchanged.

### Acceptance checks

| Check | Proved by |
| ----- | --------- |
| A `*.test.*` or `*.spec.*` file outside `e2e` that Vitest does not collect fails a test | `tools/test-files.test.ts`: "collects every tracked or untracked-but-not-gitignored \*.test.\* or \*.spec.\* file outside e2e". It lists files with `git ls-files --cached --others --exclude-standard`, asks Vitest itself (`vitest list --filesOnly --json` in a child process) what it collects, and requires every candidate to be collected. |
| Vitest collects every file lint treats as a unit test | Both configs read `tools/test-files.json`; the test above checks the result on the real repository. |
| The unit-test step fails on any skipped, todo or pending test | `tools/vitest/no-skipped-reporter.test.ts` reads the real `test` script from `package.json` and runs its arguments in a child Vitest on a throwaway folder in the OS temp directory. It must exit non-zero, naming the test, for `it.skip`, `test.skip`, `it.todo`, `describe.skip`, `describe.todo`, `it.skipIf(true)`, `it.runIf(false)`, `ctx.skip()`, destructured `skip()` and `it.only` leaving another test unrun. Controls: all-passing exits 0, and a failing test still fails. |
| `pnpm verify` and `pnpm test:e2e` pass | Run in the session: `verify` exit 0 (236 unit tests), `test:e2e` 1 passed. |

### Shown in the session

- **Tests first:** both new test files were run before the implementation. All 10 skip cases failed (the child run exited 0), and the two controls passed. The coverage test first failed because `tools/test-files.json` did not exist yet. With only that file added, it failed for the intended reason: a temporary `src/game/probe.spec.ts` was reported as not collected.
- After the change, `probe.spec.ts` was collected. A temporary `src/game/probe.test.js`, which the shared pattern does not cover, made the coverage test fail. Both probes were then deleted.
- **verify, end to end:** a temporary `src/game/deliberate-runtime-skip.test.ts` using `ctx.skip()` passed typecheck and lint (lint cannot see it; see Known limits), and then `pnpm verify` exited 1 at the unit-test step: "no-skipped-reporter: 1 test(s) or suite(s) did not run …". The file was then deleted.

### Decisions

- **The shared pattern is a JSON file**, because `eslint.config.js` is plain JS and `vite.config.ts` is typechecked TypeScript. A JSON import works in both without adding `allowJs` or a declaration file.
- **The shared pattern covers `.ts` and `.tsx` only**, the same as lint's test rules before. A test file with another extension (`.test.js`, `.test.mts` …) is not collected, and the coverage test fails on it. Widening the pattern would also mean giving those files the engine and test lint rules, which was out of scope.
- **The coverage test also includes untracked files that are not gitignored**, like the "lints every source file" test, so a new test file fails before it is staged. It skips files listed in the index but deleted from the working tree.
- **The no-skip reporter is wired into the `test` script, not into `vite.config.ts`.** `verify` and CI run `pnpm test`, so they get it. An ad-hoc `pnpm vitest run file` or `-t name` does not, so filtering by name (which marks the other tests skipped) still works while developing.
- The probe runs in the reporter test drop `CI`, `TEST` and `VITEST*` from the child's environment, so `.only` behaves the same locally and in CI. (In CI, Vitest itself also rejects `.only`.)

### Skipped or uncertain

- A Vitest snapshot file (`__snapshots__/x.test.ts.snap`) matches `*.test.*` and is not a test file, so the coverage test would flag it. No snapshots exist. If they are adopted, the test needs an exemption for `__snapshots__`, which needs the owner's approval.
- Skipped Playwright tests are not caught at run time (see Known limits).

## M1. State-vector engine

Branch `m01-statevector`, from `m00-scaffold` (M0 is not merged into `main` yet).

### What was done

- **Engine, `src/engine/statevector/`** (pure TypeScript; every file under 300 lines):
  - `state.ts`: the `StateVector` class, 1 to 12 qubits, with real and imaginary parts in two Float64Arrays. Constructors `zero`, `basis` and `fromAmplitudes` (which copies its input and checks the length and that the norm is 1 within 1e-9). Methods `applyMatrix1(m, target, controls)` (any one-qubit matrix with any number of controls), `applySwap`, `measure(q, rng)` (collapses and renormalises), `probabilities()` (exact), `sample(shots, rng)` (no collapse; a `Uint32Array` of counts per basis index), `reducedBloch(q)` (returns `{x, y, z}`), `norm()` and `clone()`.
  - `matrix.ts`: the `Matrix2` type (row-major `[m00, m01, m10, m11]`), the matrices of I, X, Y, Z, H, S, S†, T, T†, Rx, Ry and Rz (Qiskit convention, `R_P(θ) = exp(−iθP/2)`), plus `dagger`, `multiply`, `withPhase`, `isUnitary` and `INVERSE_GATE`.
  - `compare.ts`: `inner`, `fidelity = |<a|b>|²`, and `equalUpToGlobalPhase` (fidelity ≥ 1 − 1e-9 by default).
  - `circuit.ts`:
    - The `Circuit` type (`{ qubits, columns: Op[][] }`). `Op` is one of: `gate` (a named gate with optional `controls` and `theta`), `unitary` (any 2×2 unitary with optional `controls`), `swap` and `measure`.
    - CNOT, CZ and Toffoli are `x` or `z` with one or two controls. The helpers `cnot`, `cz`, `toffoli`, `swap`, `gate`, `controlled`, `unitary` and `measure` build them.
    - `validateCircuit` checks qubit counts, qubits in range, no repeats within an op, disjoint ops within a column, angles, unitarity, and unknown gates or kinds. Errors name the column and op.
    - `inverse` reverses the columns and inverts each op, and refuses a circuit with a measurement.
  - `run.ts`: `run(circuit, rng, initial?)` returns `{ states, measurements }`.
    - `states[0]` is the starting state and `states[j + 1]` the state after column j, so `states.length = columns + 1`. Each entry is its own copy.
    - `measurements` lists `{column, qubit, outcome}`. Nothing is conditioned on outcomes (classical control is out of scope).
  - `random.ts`: seeded `randomOp`, `randomCircuit` (optionally with measurements), `randomUnitary` and `randomState`, used by the property tests.
  - `index.ts`: barrel export. `test-support.ts` holds the test helpers (the checked `at`, `matrixOf`, `maxAmplitudeDiff`).
- **Answer keys, `tools/fixtures/`:**
  - `gen_statevector.py` writes `fixtures/golden/statevector.json`.
    - 200 circuits, with circuit i on `1 + i mod 6` qubits and 1 to 15 columns, from seed 20261114 (numpy PCG64).
    - They are written in the engine's `Circuit` format, so the test feeds them straight to `run`.
    - Final states come from `qiskit.quantum_info.Statevector`. They are converted to our qubit order by bit-reversing each index (the only conversion), rounded to 12 decimals, with −0.0 written as 0.0.
    - Angles and unitary entries are written at full precision, so JSON gives JavaScript the exact float64 Qiskit used.
    - One circuit per line, no timestamps.
  - **Self-check (owner's change B).** For every op, controlled or not, Qiskit's `Operator` for the gate is compared with the matrix built directly from our definition: identity unless every control is 1, then the 2×2 matrix on the target. The comparison includes phase, to 1e-12. On any mismatch the generator stops before writing.
  - **Coverage check.** The generator stops if the seed fails to cover every named gate with and without controls, a unitary with and without controls, CX, CZ, CCX, SWAP and an op with 3 controls.
  - `fixturelib.py`:
    - `check_pins()`: the generators stop unless every package in `requirements.txt` is installed at exactly its pinned version.
    - `write_manifest()`: writes `MANIFEST.json`. Its `meta` holds the generator and the pins, but not the Python patch version.
  - `generate.py` is the `pnpm fixtures` entry point. It runs each generator in `GENERATORS`, then writes the manifest. `--out <dir>` writes elsewhere (change A). `gen_statevector.py` run on its own also writes the manifest.
  - `requirements.txt`: the full `pip freeze` of a clean Python 3.11 venv after installing the latest qiskit and numpy: qiskit 2.6.2, numpy 2.4.6, scipy 1.17.1, rustworkx 0.18.1, dill 0.4.1, stevedore 5.10.0, typing-extensions 4.16.0.
- **CI compare by value (change A).**
  - `tools/check-fixtures/compare.ts`, run as `pnpm compare:fixtures <dir>`. The two folders must hold the same set of files. In JSON files, structure, strings, booleans and integers must match exactly, and other numbers within 1e-10. `MANIFEST.json` is compared by its file list and `meta`, not by its hashes. Any other file is compared byte for byte.
  - The new `fixtures` job in `.github/workflows/ci.yml` does this, in order:
    1. Installs the pins on Python 3.11.
    2. Runs `pnpm fixtures --out "$RUNNER_TEMP/golden-regenerated"`.
    3. Runs `pnpm compare:fixtures` on that folder.
    4. Checks that `git status` shows nothing under `fixtures/golden`.
  - CI never writes the committed files or `MANIFEST.json`.
- `.gitignore`: `__pycache__/`.

### Acceptance checks

| Check | Proved by |
| ----- | --------- |
| H\|0⟩ = (\|0⟩ + \|1⟩)/√2 | `gates.test.ts`: "H\|0> = (\|0> + \|1>)/sqrt(2)" |
| HH = I, HZH = X, S·S = Z, T·T = S | `gates.test.ts`: "HH = I", "HZH = X", "S.S = Z", "T.T = S". Each compares the full 2×2 matrix the engine applies with a literal matrix to 1e-12, phase included. |
| Rotation convention as in Qiskit | `gates.test.ts`: "Rz(θ) = diag(e^(-i θ/2), e^(i θ/2))", plus the same for Rx and Ry, at 7 angles each. Also "%s matches its textbook matrix" for the 9 fixed gates. |
| Bell pair from H(0), CNOT(0→1), with reducedBloch (0, 0, 0) on both qubits | `state.test.ts`: "H(0) then CNOT(0 -> 1) on \|00> gives (\|00> + \|11>)/sqrt(2), with zero Bloch vectors" |
| CNOT(0→1): \|10⟩ → \|11⟩ and \|01⟩ → \|01⟩ | `state.test.ts`: "CNOT(0 -> 1) on \|10> gives \|11>" and "CNOT(0 -> 1) on \|01> gives \|01>" |
| On 3 qubits, X(0)\|000⟩ is index 4 and X(2)\|000⟩ is index 1 (owner's change C) | `state.test.ts`: "on 3 qubits, X on qubit 0 takes \|000> to index 4 and X on qubit 2 to index 1" |
| Norm within 1e-12 of 1 after 1,000 random gates | `norm.test.ts`: "stays within 1e-12 of 1 after 1,000 random gates on %i qubit(s)", for 1, 3, 6 and 12 qubits. It also checks the state moved and that every op kind was used. |
| measure on \|+⟩: 10,000 seeded trials within 4σ of 50/50, and the state afterwards is the measured basis state | `measure.test.ts`: "on \|+> gives 50/50 within 4 standard deviations over 10,000 trials, and collapses to the outcome" (\|ones − 5000\| ≤ 200, with each state after measurement checked) |
| Same seed gives the same measurement record and the same states (owner's answer 3) | `circuit.test.ts`: "gives the same measurement record and the same states for the same seed". The circuit has 5 qubits and 40 columns with more than 5 measurements. States are compared exactly, and a different seed gives a different record. |
| `run` returns the starting state and then one state per column (owner's answer 4) | `circuit.test.ts`: "returns the starting state at index 0, then one state per column", "gives an empty circuit just the starting state", "starts from a copy of the given state and never mutates it" and "keeps each snapshot independent of later columns". `golden.test.ts` also checks `states.length = columns + 1` on all 200 circuits. |
| Every golden fixture matches with fidelity ≥ 1 − 1e-9 | `golden.test.ts`: "circuit %i matches with fidelity >= 1 - 1e-9", one test per circuit, 200 in all. Also "holds 200 circuits on 1 to 6 qubits with distinct ids" and "uses every gate in the set, with and without controls". |
| Any random circuit followed by its inverse returns the starting state | `inverse.test.ts`: "returns the starting state after any random circuit, from \|0...0> and from random states". 100 circuits on 1–8 qubits with 20 columns each. The return must be exact within 1e-10 per amplitude, so global phase is included. A guard requires more than 90% of the circuits to move the state. |
| Error paths | `circuit.test.ts` "validateCircuit": 18 malformed circuits, a non-unitary or NaN matrix, and the column/op in the message. `state.test.ts` "input validation". `compare.test.ts`. `gates.test.ts`: "rejects a rotation without a finite angle…". `inverse.test.ts`: "refuses a circuit that contains a measurement". |
| CI comparison by value | `tools/check-fixtures/compare.test.ts` (13 tests): floats within 1e-10 pass and beyond it fail; integers, strings, booleans, array lengths and key sets are exact; a file on one side only fails; `MANIFEST.json` is compared without its hashes; invalid JSON fails; non-JSON files are compared by bytes. |
| `pnpm verify` passes | Run in the session: exit 0, 550 unit tests (16 files). `pnpm test:e2e`: 1 passed. |

### Shown in the session

- **Tests first.** The 8 engine test files were written before any engine code and run: all 8 failed, because the modules did not exist (an import failure, not an assertion failure). `compare.test.ts` likewise failed before `compare.ts` existed. To show the tests catch real bugs, two deliberate faults were put in after the engine passed, then reverted:
  - Rz with the opposite sign: 61 tests failed, 56 of them golden circuits plus the Rz convention tests.
  - Qubit order reversed (`1 << qubit`): 155 failed, including all three qubit-order tests and 147 golden circuits.
- **Regenerating locally gives byte-identical output.** Three runs of `pnpm fixtures` gave the same git object hashes: `statevector.json` c1dc273e…, `MANIFEST.json` 1deabac1…. A `--out` run into the scratchpad gave the same `statevector.json` SHA-256 that `MANIFEST.json` records (8835cbbd…). The CI steps were run locally as well: regenerate into a scratch folder, then `pnpm compare:fixtures` (exit 0), then `git status` under `fixtures/golden`.
- **The compare script on altered copies** (each made in the scratchpad from a regenerated copy, never under `fixtures/golden`):
  - One amplitude +1e-11: passes.
  - One amplitude +1e-9: fails with `$.circuits[17].re[0]: … (differs by more than 1e-10)`.
  - One `s` changed to `sdg`: fails with `$.circuits[1].columns[5][1].gate: "s" vs "sdg"`.
  - One target changed: fails.
- **The self-check stops the generator** (on a scratch copy of `tools/fixtures`):
  - Using Qiskit's `PhaseGate` for `rz`, which equals Rz only up to a global phase: "Qiskit's operator for rz with 0 control(s) differs from our definition by 6.564e-01 … Not writing fixtures.", exit 1, nothing written.
  - Negating U only in the controlled definition, a phase that matters only under control: stopped at "unitary with 1 control(s)", exit 1.
- **The permission rule held.** A Bash command that read files under `fixtures/golden` with `cp` and `shasum` was refused. The fixtures were written only by `pnpm fixtures`, run with the venv's `python3` on `PATH`. No file under `fixtures/golden` was written or edited by hand.

### Decisions

- **Python environment:** a uv venv outside the repository (in the session scratchpad) on the local CPython 3.11.9. CI uses Python 3.11 to match. `pnpm fixtures` still calls `python3`, so put a venv with the pins first on `PATH`.
- **Op model:** CNOT, CZ and Toffoli are `x` or `z` with controls rather than separate kinds, so one routine (`applyMatrix1`) serves every one-qubit and controlled gate, and the fixtures exercise it. `swap` takes no controls (Fredkin was not asked for). Controls are positive only (open controls were not asked for).
- **Named gates are lower-case** (`h`, `sdg`, `rx` …), as in OpenQASM and Qiskit.
- **`fromAmplitudes` requires norm 1 within 1e-9**, which admits the 12-decimal fixture amplitudes.
- **`measure`** draws r = nextFloat() × (p0 + p1) and returns 0 if r < p0. So an outcome of probability zero is never returned, tested in "never returns an outcome of probability zero".
- **`?? 0` in the hot loops of `state.ts` and `compare.ts`.** The lint config is `strictTypeChecked`, which bans `!`, and `noUncheckedIndexedAccess` types every typed-array read as `number | undefined`. Each of those reads is inside a loop bounded by the array length, so the fallback is unreachable; the file header says so. Tests use a checked `at()` that throws instead. The lint config was not changed.
- **Integers in the compare script:** a number that is an integer in both files must match exactly; any other number may differ by 1e-10. The generator writes structural values (ids, qubit counts, targets, controls) as integers and amplitudes as floats, so structure is compared exactly. In JSON, 1.0 and 1 are the same value; the rule treats them alike.
- **Fixture layout for later generators:** one JSON file per fixture set at the top of `fixtures/golden`, each written by a module with a `generate(out_dir)` function listed in `GENERATORS` in `tools/fixtures/generate.py`. Tests import the file as plain JSON. No `import.meta.glob`, and `tsconfig.engine.json` is unchanged.

### Known limits

- **The CI `fixtures` job has not run on GitHub** (nothing is pushed). It has only been run locally in pieces. The first push will show whether Linux x86 agrees within 1e-10; any difference would come from last-bit float noise in the Qiskit and numpy products.
- **`pip install` in CI uses exact pins but no hashes** (`--require-hashes` is not used), so it trusts PyPI to serve the pinned versions.
- **The CI check is now by value, so a hand edit to a fixture smaller than 1e-10 would pass `compare:fixtures`.** `check:fixtures` still catches any byte change, unless `MANIFEST.json` is edited along with it. The permission rule and review are the other protections. This narrows the M0 known limit; it does not close it.
- **The Python generator has no unit tests of its own.** It is checked through its self-check, the coverage check, the golden test and the CI comparison.

### Skipped or uncertain

- No player-facing text and no physics statements were written, so nothing is marked `TODO(physics-review)`.
- The M0 review findings listed under Known limits in M0 are unchanged.
