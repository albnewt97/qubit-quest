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

- Vite + React + TypeScript app on pnpm. `tsconfig.app.json` covers `src`, and `tsconfig.node.json` covers the configs, `tools` and `e2e`. Both use `strict` and `noUncheckedIndexedAccess`.
- Folders: `src/{engine,game,ui,levels,i18n}`, `fixtures/golden`, `tools/{fixtures,validate-levels,lint}`, `e2e`, `docs/review`.
- Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `validate:levels`, `fixtures` and `verify`.
  - `verify` chains `typecheck && lint && test && validate:levels && build`, so the first failing step decides the exit code.
- `src/engine/rng.ts` is the seeded generator, with `nextUint32()`, `nextFloat()` and `fork(label)`.
- The ESLint rules for engine purity and for skipped or focused tests are in `eslint.config.js`.
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
| Math.random in src/engine fails the engine lint rule               | `tools/lint/eslint-rules.test.ts`: "rejects Math.random inside src/engine"              |
| That sample file is outside the normal lint run                    | `eslint-rules.test.ts`: "the fixtures are outside the normal lint run"                  |
| Other engine rules: no Date, no react, no src/ui or src/game imports | `eslint-rules.test.ts` (one test per rule)                                            |
| `.skip`, `.only`, `.todo` are lint errors                          | `eslint-rules.test.ts`: "rejects test-{skip,only,todo}.test.ts"                         |
| Home screen loads with the title                                   | `e2e/home.spec.ts`                                                                       |
| `pnpm verify` passes                                               | Run locally, exit 0                                                                      |
| A failing test makes `pnpm verify` exit non-zero and blocks a commit | Shown in the session: exit 1, and the hook refused the commit. The test was then removed. |

### Decisions

- **Versions** (current stable when M0 was done): TypeScript 6.0.3, not 7.0.2, because typescript-eslint 8.72 supports only TypeScript <6.1 and typed linting needs it. The other pins are exact, in `package.json`.
- **Node and pnpm:** Node 26 LTS in CI through `.nvmrc`. `engines.node` is `>=22.12`, so local Node 22 still works. pnpm 12.18.0 is pinned through `packageManager`.
- **esbuild build script:** pnpm 12 refuses unreviewed dependency build scripts, so esbuild's (pulled in by tsx) is denied in `pnpm-workspace.yaml` (`allowBuilds: esbuild: false`). Its postinstall only optimises the binary, and the platform package already provides it.
- **RNG algorithm:**
  - xoshiro128** on four 32-bit words. The state comes from SplitMix32 and a 64-bit stream key. `nextFloat` takes 53 bits from two draws.
  - `fork(label)` hashes the parent's key with the label. Forking doesn't advance the parent, so the child doesn't depend on how many values the parent has drawn, and nested labels depend on order.
  - The seed must be an integer in [0, 2^32).
  - Changing the algorithm later changes every seeded replay. Treat it as fixed.
- **Lint test fixtures** live in `src/engine/__lint-fixtures__/`. They are globally ignored by `pnpm lint` and excluded from Vitest discovery, and the lint test lints them with `ignore: false` against the real config.
- **Permission rules** follow code.claude.com/docs/en/permissions. `Edit(/…)` is anchored at the project root and covers Edit, Write and NotebookEdit. `Edit(/.githooks/**)` is a small addition, because editing the hook is another way to skip it.
- `CLAUDE.md` moved from `docs/` to the repo root, as BUILD_PLAN's setup step 3 says.

### Known limits

- Bash deny rules match command text only. The docs say they are not a security boundary: `sh -c 'git commit --no-verify'` gets past them. The pre-commit hook and CI are the real enforcement.
- The pre-commit hook checks the working tree, not only the staged content, so unstaged changes can make a commit pass or fail. CI runs on the pushed tree and is the backstop.
- Playwright runs Chromium only. The three-browser runs arrive in M14.
- Not yet pushed, so CI has not run on GitHub.

### Skipped or uncertain

- Nothing from the M0 prompt was skipped. No physics text was written.
