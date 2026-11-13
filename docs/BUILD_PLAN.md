# Build plan and Claude Code prompts

Fifteen milestones take the game from an empty repository to v1.0. Each one is a single Claude Code session, with a prompt below and a set of tests that must pass before the next one starts.

## How to run this build

No prompt can promise a build with zero failures. What this plan does is make sure a failure is caught in the milestone where it happens, by a check that Claude Code did not write the answer to. Three things make that true:

- **External answer keys.** Engine tests compare against output from Qiskit, Stim and PyMatching, stored as fixture files. A wrong engine can't be made to pass by adjusting its own expectations.
- **One command decides.** `pnpm verify` runs type checks, lint, unit tests, level validation and the production build. A Git hook runs it before every commit, and CI runs it on every push.
- **Small steps, fresh sessions.** One milestone per session, a plan you approve before any code is written, and a progress file that carries state from one session to the next.

**The loop for every milestone:**

1. Start a new Claude Code session in plan mode: `claude --permission-mode plan`, or press Shift+Tab until the status bar shows plan mode.
2. Paste the milestone prompt. Read the plan that comes back, check its test list against the prompt, then approve it.
3. Let it work until `pnpm verify` passes and it reports each acceptance check with the test that proves it.
4. Open a second, fresh session and paste the review prompt from the recovery section. A reviewer that did not write the code finds different problems.
5. Do your part of the gate (last section): play the build, read the physics review file, merge the branch.

The calendar in the design tab still stands. Claude Code shortens the coding, but playtests, class pilots and your physics review take as long as they take.

## Decisions locked before the first prompt

Every choice below is fixed so that Claude Code never has to guess. Each one was picked because it removes a way for the build to go wrong.

| Decision | Choice | How it lowers risk |
| --- | --- | --- |
| Audience | Undergraduates first; 16–18 year-olds through a 6-level Primer with a placement check | One maths level for the main game |
| Tooling | TypeScript (strict), React, Vite, pnpm, Vitest, Playwright, ESLint, Prettier | Mainstream tools; strict types catch mistakes before tests run |
| Runtime dependencies | react, react-dom, zustand, zod and nothing else without your approval | Fewer moving parts to break or update |
| Graphics | SVG everywhere, including the Bloch sphere and the space-time view | No WebGL, so browser tests run reliably in CI |
| Engines | Own state-vector engine (up to 12 qubits) and own tableau engine (about 100 qubits), pure TypeScript | No WebAssembly build to maintain; every line is testable |
| Answer keys | Python scripts using Qiskit, Stim, PyMatching and sinter write JSON fixtures that are committed | Unit tests need no Python; the answers come from research tools |
| Decoder | Exact minimum-weight matching by dynamic programming up to 18 defects; a flagged greedy fallback above that | Short code that can be proven correct, instead of a hand-written blossom algorithm |
| Qubit order | Qubit 0 is the top wire and the leftmost bit of a ket | Matches textbooks; the conversion to Qiskit's reverse order lives in two places only |
| Randomness | One seeded generator passed into every engine call | Every level and every test replays exactly |
| Levels | JSON files checked by a schema; each ships a reference solution | A broken or unsolvable level fails `pnpm verify` |
| Player text | All of it in `src/i18n/en.json` | Physics review and translation read one file |
| Backend | None until M12, then behind an interface with an in-memory version | The game never depends on a server |

Two of these changed the design tab, which is updated to match: SVG replaces Three.js, and Stim fixtures replace a WebAssembly build of Stim.

**Repository layout:**

```text
qubit-quest/
  CLAUDE.md
  docs/              DESIGN.md, BUILD_PLAN.md, PROGRESS.md, review/
  src/
    engine/          rng, statevector, tableau, noise, codes, decoder, classical (pure TypeScript)
    game/            circuit model, level schema, checkers, scoring, progress, export, classroom
    ui/              builder, views, lattice, primer widgets, screens
    levels/          primer/, w0/ ... w8/ (JSON)
    i18n/            en.json, hi.json
  fixtures/golden/   JSON answer keys (generated, never edited by hand)
  tools/
    fixtures/        Python generators and requirements.txt
    validate-levels/
  e2e/               Playwright tests, including the solve-bot
  public/data/       precomputed threshold curves
```

## Guardrails

Instructions in CLAUDE.md are guidance that Claude Code usually follows, not rules it is forced to follow. Anything that must hold every time is therefore enforced by tooling, and M0 sets all of it up.

| Rule | Enforced by |
| --- | --- |
| Nothing is committed unless `pnpm verify` passes | Git pre-commit hook; a permission rule that denies commits which skip hooks; CI on every push |
| Answer-key fixtures are never edited by hand | Permission rule that denies edits under `fixtures/golden`; a CI job that regenerates the deterministic fixtures and fails on any difference |
| Engines stay pure: no UI imports, no `Math.random`, no `Date` | Lint rules scoped to `src/engine` |
| Tests are not skipped or narrowed | Lint errors on `.skip`, `.only` and `.todo`; the review prompt reads the test diff |
| Every level is solvable, and not solved by an empty circuit | `tools/validate-levels`, part of `pnpm verify` |
| Every level plays through in a real browser | The solve-bot in the Playwright suite, run in CI |
| Physics wording is checked by a physicist | A `docs/review` file per content milestone that you sign off; release is blocked while any `TODO(physics-review)` remains |

## Milestones

The fifteen milestones follow the four phases in the design tab. Gate 1 comes after M5, Gate 2 after M7, Gate 3 after M12 and Gate 4 after M14. The lattice prototype is M5, so the riskiest mechanic is in testers' hands before most of the content is written.

| # | Milestone | Phase | Delivers | Proof it works |
| --- | --- | --- | --- | --- |
| M0 | Scaffold and guardrails | 0 | Empty app, `pnpm verify`, hooks, CI, seeded random generator | A deliberately broken test blocks a commit |
| M1 | State-vector engine | 0 | Gates, measurement and Bloch vectors for up to 12 qubits | 200 Qiskit fixtures match to 1 − 1e−9 |
| M2 | Circuit builder | 0 | Mouse and keyboard editing, playhead, simulation worker | Browser test builds a Bell pair both ways |
| M3 | State views | 0 | Amplitude discs, Bloch sphere, histogram, Dirac text | View tests on 5 reference states |
| M4 | Level system | 0 | Schema, checkers, scoring, progress, validator, 8 World 1 levels | Validator rejects 3 broken levels; solve-bot clears all 8 |
| M5 | Lattice prototype | 0 | d = 3 surface-code layout, syndrome lattice, 3 levels | Commutation and distance tests; Gate 1 playtest |
| M6 | Primer, Worlds 0–1 | 1 | Primer widgets, placement check, 16 more levels | Solve-bot clears every level; physics review file |
| M7 | Multi-qubit features, Worlds 2–3 | 1 | Feed-forward, oracles, blueprints, export, 22 levels | Teleportation, Deutsch–Jozsa and Grover tests; export checked in Qiskit |
| M8 | Stabiliser engine and noise | 2 | Tableau simulator, three noise models | 300 Stim fixtures; cross-check against the M1 engine |
| M9 | Worlds 4–5 | 2 | Noise visuals, survival levels, syndrome lights, 20 levels | Repetition and Shor code tests; measured error rates match the formulas |
| M10 | Decoder and decoder game | 2 | Matching decoder, space-time view, pairing game | Correction weight equals PyMatching's on every fixture |
| M11 | Worlds 6–7, threshold lab | 2 | Stabiliser view, 24 levels, sinter curves, live lab, Stim export | Live rates agree with the precomputed curves |
| M12 | Classroom layer | 2 | Class codes, assignments, dashboard, CSV export | Full student and teacher flow passes on the in-memory version |
| M13 | Sandbox, offline, accessibility, Hindi | 3 | Sandbox, installable offline app, keyboard and screen-reader pass, `hi.json` | No serious accessibility findings; one level per world plays offline |
| M14 | Release | 3 | Three-browser solve-bot, performance budget, docs, deployment | Every level clears in 3 browsers; budget met |

## Setup

Five steps, done once, before the first prompt.

1. Create an empty Git repository named `qubit-quest` and open it in Claude Code.
2. Export the Game design tab as Markdown (click the doc's name, then Export; it exports the open tab) and save it as `docs/DESIGN.md`. Do the same for this tab as `docs/BUILD_PLAN.md`.
3. Save the block below as `CLAUDE.md` in the repository root.
4. Install Node (current LTS), pnpm and a recent Python 3 on your machine. Python is needed only to generate fixtures.
5. Start a session in plan mode and paste the M0 prompt.

**CLAUDE.md.** It is short on purpose: Claude Code loads it into every session, so it holds only what can't be worked out from the code.

```text
# Qubit Quest

Browser puzzle game teaching quantum circuits and quantum error correction.
Design: docs/DESIGN.md. Status and decisions so far: docs/PROGRESS.md.

# Commands
- Install: pnpm install
- Run locally: pnpm dev
- Full check, must pass before you finish: pnpm verify
- One test file: pnpm vitest run path/to/file.test.ts
- Browser tests: pnpm test:e2e
- Regenerate answer keys (needs Python): pnpm fixtures

# Workflow
- One milestone per session, on branch m<NN>-<slug>. Do not start the next milestone.
- Read docs/PROGRESS.md first. Present a plan (files, the tests you will write first, any ambiguity) and wait for approval.
- Write the tests named in the prompt before the implementation, and run them to see them fail.
- Never delete, skip or loosen a test or a fixture to get to green. If one looks wrong, stop and explain why.
- If the prompt is ambiguous or conflicts with docs/DESIGN.md, stop and ask. Do not guess.
- Finish by updating docs/PROGRESS.md: what was done, each acceptance check with the test that proves it, decisions made, anything skipped or uncertain.

# Conventions that are not obvious from the code
- Qubit order: qubit 0 is the top wire and the leftmost bit of a ket |q0 q1 ... q(n-1)>. Basis index = sum of q_k * 2^(n-1-k). Qiskit uses the reverse order; convert only in tools/fixtures and src/game/export.
- Compare quantum states up to global phase: |<a|b>|^2 >= 1 - 1e-9.
- src/engine is pure TypeScript: no React, no DOM, no Math.random, no Date. All randomness comes from the Rng that is passed in.
- fixtures/golden is generated by tools/fixtures from Qiskit, Stim and PyMatching. Never write or edit those files by hand. If Python or its packages are unavailable, stop and tell me; I will run the generator locally.
- Runtime dependencies allowed: react, react-dom, zustand, zod. Ask before adding any other.
- All player-facing text goes in src/i18n/en.json. If you are not certain a physics statement is correct, mark it TODO(physics-review) and list it in PROGRESS.md.
```

## Prompts for Phase 0: foundation and lattice prototype

Paste each prompt whole into a fresh session. Every prompt has the same shape: what to build, the tests to write first, what to leave alone, and what counts as done. The tests are the important part, so check that the plan Claude Code returns includes every one of them.

### M0. Scaffold and guardrails

```text
Milestone M0: scaffold and guardrails. Read CLAUDE.md and docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. A Vite + React + TypeScript app managed by pnpm. TypeScript strict mode plus noUncheckedIndexedAccess. ESLint, Prettier, Vitest, Playwright. Use current stable versions and commit the lockfile.
2. Folders: src/engine, src/game, src/ui, src/levels, src/i18n, fixtures/golden, tools/fixtures, tools/validate-levels, e2e, docs/review.
3. Scripts: dev, test, test:e2e, validate:levels (a stub that passes with zero levels), fixtures (a stub that prints usage), and verify = typecheck, then lint, then unit tests, then validate:levels, then production build. verify must exit non-zero if any step fails.
4. Lint rules: files under src/engine may not import react or anything from src/ui or src/game, and may not use Math.random or Date. Skipped or focused tests (.skip, .only, .todo) are lint errors.
5. src/engine/rng.ts: a seeded generator with nextUint32(), nextFloat() in [0, 1), and fork(label), which derives an independent child stream.
6. Guardrails: a Git pre-commit hook (through core.hooksPath, no extra dependency) that runs pnpm verify. A GitHub Actions workflow that runs pnpm verify and the Playwright tests on every push. Claude Code permission rules in .claude/settings.json that deny editing files under fixtures/golden and deny commits that skip hooks. Read the current Claude Code settings documentation for the exact format; do not guess it.
7. docs/PROGRESS.md with a status table for M0 to M14.
8. A home screen that shows the game title, and one Playwright test that loads it.

Tests first:
- rng: the same seed gives the same first 1,000 values; two different seeds differ; fork("a") is reproducible and differs from fork("b"); the mean of 100,000 nextFloat() values is within 0.005 of 0.5.
- lint: a sample file that uses Math.random inside src/engine fails the engine lint rule (keep it as a test of the rule, outside the normal lint run).

Out of scope: any game logic.

Done when:
- pnpm verify passes.
- You have shown me that a deliberately failing test makes pnpm verify exit non-zero and blocks a commit, and then removed it.
```

### M1. State-vector engine

```text
Milestone M1: state-vector engine. Read CLAUDE.md and docs/PROGRESS.md. Present a plan and wait for my go.

Build in src/engine/statevector:
1. Amplitudes in two Float64Arrays (real and imaginary parts). Up to 12 qubits.
2. Gates: I, X, Y, Z, H, S, S-dagger, T, T-dagger, Rx, Ry, Rz, CNOT, CZ, SWAP, Toffoli, and any one-qubit gate with any number of controls. Rotation convention: Rz(theta) = diag(e^(-i theta/2), e^(i theta/2)), and likewise for Rx and Ry, as in Qiskit.
3. measure(qubit, rng) collapses and renormalises. probabilities() is exact. sample(shots, rng) does not collapse. reducedBloch(qubit) returns (x, y, z).
4. fidelity(a, b) = |<a|b>|^2 and equalUpToGlobalPhase(a, b).
5. A Circuit type (columns of operations) and run(circuit, rng), which returns the state after every column. The UI will animate these.
6. tools/fixtures/gen_statevector.py: uses Qiskit to write fixtures/golden/statevector/*.json. 200 random circuits on 1 to 6 qubits from the gate set above, generated from a fixed seed, with final amplitudes converted to our qubit order and rounded to 12 decimals. Pin package versions in tools/fixtures/requirements.txt. Wire it into pnpm fixtures.

Tests first:
- H|0> = (|0> + |1>)/sqrt(2). HH = I. HZH = X. S.S = Z. T.T = S.
- H on qubit 0 then CNOT(0 -> 1) on |00> gives (|00> + |11>)/sqrt(2), and reducedBloch of either qubit is (0, 0, 0).
- CNOT(0 -> 1) on |10> gives |11>, and on |01> gives |01>. This pins the qubit order.
- The norm stays within 1e-12 of 1 after 1,000 random gates.
- measure on |+> with a fixed seed: over 10,000 trials the outcomes are within 4 standard deviations of 50/50, and the state after measurement is the basis state that was measured.
- Every golden fixture matches with fidelity at least 1 - 1e-9.
- Any random circuit followed by its inverse returns the starting state.

Out of scope: UI, noise, classical control.

Done when: pnpm verify passes with all the tests above present.
```

### M2. Circuit builder

```text
Milestone M2: circuit model and builder. Read CLAUDE.md and docs/PROGRESS.md. Present a plan and wait for my go.

Build:
1. src/game/circuit: the circuit as columns of operations on numbered wires, with pure functions to add, move and remove a gate, add and remove a wire, and convert to and from JSON. Reject two operations on the same wire in one column, and a control on the same wire as its target.
2. A zustand store around those functions with undo and redo, at least 100 steps deep.
3. src/ui/builder: an SVG circuit canvas in textbook orientation (time runs left to right, qubit 0 on top). A gate palette that the caller can restrict. Drag from the palette to a slot, drag to move, drag off to delete. For a controlled gate: place the target, then pick the controls.
4. A full keyboard path: arrow keys move a slot cursor; letter keys place gates (H, X, Y, Z, S, T, C for control, M for measure); Delete removes; Ctrl+Z and Ctrl+Y undo and redo. Every control has an accessible name.
5. Playhead: step forward, step back, run, reset. Simulation runs in a Web Worker that takes a circuit and a seed and returns the state after every column. The UI never calls the engine on the main thread.
6. For now, a plain-text state readout under the canvas, such as 0.707|00> + 0.707|11>, inside an aria-live region.

Tests first:
- Circuit functions: every invalid placement is rejected; after any sequence of 50 random edits, undoing them all restores the starting circuit exactly; JSON round-trip loses nothing.
- Worker: a Bell circuit returns three states (start, after H, after CNOT) equal to those from calling the engine directly.
- Playwright: build H then CNOT by mouse, and again by keyboard alone; step through; the readout ends at 0.707|00> + 0.707|11>.

Out of scope: state visualisations, levels, measurement feed-forward.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M3. State views

```text
Milestone M3: state views. Read CLAUDE.md and docs/PROGRESS.md. Present a plan and wait for my go.

Build in src/ui/views. Each view is a pure view-model function (state in, drawable data out) plus an SVG component that draws it and exposes the numbers as data attributes for testing:
1. Amplitude discs: one disc per basis state. Disc area is proportional to probability. A needle shows phase, measured relative to the first non-zero amplitude so that a global phase changes nothing. Fill colour comes from a cyclic, colour-blind-safe palette keyed to the same phase. Up to 4 qubits show every basis state; above that, show the 16 most probable and a count of the rest.
2. Bloch sphere per qubit, drawn in SVG with an orthographic projection (no 3D library). The arrow is reducedBloch from the engine. Show the arrow length as a number. An entangled qubit has an arrow shorter than the radius.
3. Measurement histogram: sampled counts for 100 or 1,000 shots from a seeded Rng, drawn beside the exact probabilities.
4. Dirac text with amplitudes to 3 decimals, hiding terms smaller than 1e-6.
5. All views read the same playhead state and update together. Transitions take 200 ms and are off under prefers-reduced-motion.

Tests first (view-model functions):
- |0>: one disc of full area, needle at 0 degrees; Bloch arrow (0, 0, 1).
- |+>: two discs of equal area, both needles at 0; Bloch arrow (1, 0, 0).
- |->: the |1> needle at 180 degrees; Bloch arrow (-1, 0, 0).
- S|+>: the |1> needle at 90 degrees; Bloch arrow (0, 1, 0).
- Bell state: discs for |00> and |11> only; both Bloch arrows have length 0.
- Multiplying any state by a global phase changes no view-model output.
- Playwright: for each of these five states, the rendered SVG carries the expected data attributes. Do not use pixel-comparison screenshots; they differ between machines.

Out of scope: levels, noise.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M4. Level system and first 8 levels

```text
Milestone M4: level system and the first 8 levels. Read CLAUDE.md, docs/PROGRESS.md and the curriculum and level-schema parts of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. src/game/level/schema.ts: a zod schema for a level, following the sketch in docs/DESIGN.md. Fields: id, world, title key, engine (classical, statevector or stabilizer), wires, palette, budget (gates, depth, two-qubit gates), start state, target, optional noise, optional predict question, hints, debrief key, reference solution, and a design card (learning outcome, misconception targeted, the moment of insight).
2. Target types with checkers in src/game/level/check: state (equal up to global phase); unitary (equal up to global phase, tested by |trace(U-dagger V)| / 2^n >= 1 - 1e-9); truthTable (classical engine); distribution (exact probabilities within a stated tolerance); blackBoxAnswer (multiple choice).
3. src/engine/classical: a boolean circuit evaluator with NOT, AND, OR, XOR, NAND, for World 0.
4. Scoring: pass or fail, plus up to 3 stars (solved; within the star budget; prediction correct). Hints are revealed one at a time.
5. Progress store: IndexedDB with an in-memory fallback; stars per level; world unlock rules.
6. Screens: level select and level play (brief, build, predict, run, score, debrief).
7. tools/validate-levels: for every level file, the schema parses; the reference solution passes the checker within budget; the empty circuit does not pass; every text key exists in en.json; ids are unique. Wire it into pnpm validate:levels.
8. e2e/solve-bot: a Playwright test that opens every level, loads its reference solution through the store, runs it and expects the debrief screen.
9. Write the first 8 levels of World 1 from the curriculum: |0> and |1>, X, H, measurement, H twice returns to |0>, Z, S and T, reaching |->. Each debrief is at most 40 words and introduces at most one new term.

Tests first:
- The state checker accepts e^(0.7i)|+> for target |+>, and rejects |-> for target |+>.
- The unitary checker accepts HZH for target X, and rejects Z for target X.
- The validator fails on three deliberately broken levels kept under tools/validate-levels/__fixtures__: a reference solution that does not solve the level, a level the empty circuit passes, and a missing text key.
- The solve-bot clears all 8 levels.

Also write docs/review/M4-physics.md: every debrief and every predict question with its answer, for my review.

Out of scope: noise, survival and decode level types, the Primer.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M5. Surface-code layout and lattice prototype

```text
Milestone M5: surface-code layout and lattice prototype. Read CLAUDE.md, docs/PROGRESS.md and the syndrome-lattice part of docs/DESIGN.md. Present a plan and wait for my go.

This is the build for the first playtest, so it uses the simplest model that is still correct: X errors on data qubits, perfect Z-check measurements, bit arithmetic only. The tableau engine and the automatic decoder come later.

Build:
1. src/engine/codes/rotatedSurface.ts: for odd d (3, 5, 7), the data-qubit coordinates, the X-type and Z-type checks (weight 4 in the bulk, weight 2 on the boundary), and one logical X and one logical Z operator, each of weight d.
2. src/engine/codes/parity.ts: given a set of X errors, the syndrome of the Z-type checks (and the mirror for Z errors); given an error and a correction, whether the syndrome is clear and whether their product flips the logical operator.
3. src/ui/lattice: an SVG lattice. Data qubits are dots; checks are coloured tiles that light up when their parity is odd. Click a qubit, or press Enter on it, to toggle a correction. Arrow keys move between qubits. A reveal step shows the hidden error, the player's correction and whether a logical flip remains.
4. Level type decode (schema, checker and validator support): the level is won only if the syndrome is clear and no logical flip remains.
5. Hovering or focusing two lit tiles shows a shortest chain of qubits between them (breadth-first search).
6. Three d = 3 levels: a single error; two errors that share a check; and a pattern where the obvious correction clears the syndrome but leaves a logical flip.

Tests first:
- Counts for d = 3, 5, 7: d^2 data qubits and (d^2 - 1)/2 checks of each type.
- Every X-type check overlaps every Z-type check on an even number of qubits.
- Logical X overlaps every Z-type check on an even number of qubits, logical Z does the same with every X-type check, and logical X and logical Z overlap each other on an odd number of qubits.
- Every single-qubit X error lights at least one Z-type check.
- d = 3, by brute force over all 512 X-error patterns: every pattern with a clear syndrome and a logical flip has weight at least 3, and at least one has weight exactly 3.
- In level 3, the reference solution wins and the stored obvious correction loses.

Out of scope: measurement errors, automatic decoding, levels above d = 3.

Done when: pnpm verify and pnpm test:e2e pass.
```

## Prompts for Phase 1: Primer and Worlds 0 to 3

These two milestones are mostly content. The engine tests still matter, but the bigger risk now is physics wording, so each one ends with a review file for you.

### M6. Primer, World 0 and the rest of World 1

```text
Milestone M6: Primer, World 0 and the rest of World 1. Read CLAUDE.md, docs/PROGRESS.md and the curriculum part of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. Four small interactive widgets in src/ui/primer, each with a pure view-model:
   - arrow board: drag two arrows and see their sum and their components;
   - length-squared meter: an arrow's components and their squares, which add to 1 for a unit arrow;
   - phase dial: a complex number drawn as an arrow that rotates when multiplied by i or by -1;
   - matrix machine: a 2 by 2 matrix applied to an arrow, with X and H as presets.
2. Level type widgetTask with goals a program can check, for example: make the sum arrow point at the target within 5 degrees.
3. The Primer, 6 levels: arrows and adding them; probability as squared length; complex numbers as rotating arrows; matrices as machines; binary and XOR (classical engine); and a recap that turns |0> into |+> first with the matrix machine and then with an H gate on the circuit canvas.
4. A placement check before the Primer: 5 multiple-choice questions, one each on vectors, probability, complex numbers, matrices and XOR. 4 or more correct offers a skip to World 0. Nobody is ever blocked from playing the Primer.
5. World 0, 6 levels: NOT; AND; XOR built from NAND; reversibility; one parity bit detects a flipped bit; boss: locate a single flipped bit in a 7-bit Hamming codeword (4 data bits, 3 parity bits) from the 3 parity checks.
6. World 1, the remaining 4 levels: relative phase (Z on |+>); black box, Z or S, in at most 3 runs; the T gate; boss: reach 4 target points on the Bloch sphere within a gate budget.
7. Every level has a design card, a reference solution, at most 3 hints, and a debrief of at most 40 words with at most one new term.

Tests first:
- Widgets: adding (1, 0) and (0, 1) gives (1, 1); multiplying 1 by i four times returns to 1; the H preset sends (1, 0) to (0.707, 0.707); the squares of a unit arrow's components add to 1.
- Placement check: 4 of 5 correct offers the skip; 3 of 5 does not.
- World 0 boss: for each of the 7 single-bit flips, the reference circuit's three parity outputs name the flipped bit, all 7 patterns are different, and no flip gives 000.
- Black-box level: the reference strategy names the box correctly for both Z and S with probability 1.
- Z on |0> leaves every view unchanged; Z on |+> changes the outcome of a following H from 0 to 1 with probability 1.
- The solve-bot clears every level in the Primer, World 0 and World 1.

Also write docs/review/M6-physics.md: every debrief, hint and predict answer in these levels, plus the 5 placement questions with answers.

Out of scope: multi-qubit levels.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M7. Multi-qubit features and Worlds 2 to 3

```text
Milestone M7: multi-qubit features and Worlds 2 to 3. Read CLAUDE.md, docs/PROGRESS.md and the curriculum part of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. Mid-circuit measurement that writes to a classical wire (drawn as a double line), and gates controlled by a classical bit. Support in the state-vector engine and in the worker.
2. Oracle boxes: a hidden unitary defined in the level file and drawn as a labelled box. A level can cap the number of oracle uses.
3. Blueprints: select a block of gates, save it as a named custom gate, place it like any gate, expand it to inspect. Saved in the progress store.
4. An entanglement meter per qubit: 1 minus the squared length of its Bloch arrow.
5. src/game/export: OpenQASM 3 and Qiskit Python for any circuit. The qubit-order conversion happens here and nowhere else in src.
6. tools/fixtures/check_export.py: exports 30 circuits, loads them in Qiskit, and confirms the simulated state equals ours for circuits without feed-forward, and that circuits with feed-forward load without error. It writes the verified text to fixtures/golden/export.
7. World 2 (12 levels) and World 3 (10 levels) from the curriculum, including the no-cloning level and the teleportation boss.

Tests first:
- CNOT with |+> as control and |0> as target gives a Bell state, whose fidelity with |+>|+> is 0.5. The no-cloning level depends on this.
- Each of the four Bell states is reached from |00> by its reference solution in at most 4 gates.
- Phase kickback: CNOT with control |+> and target |-> gives |->|->.
- Teleportation: for 20 random one-qubit states and each of the 4 measurement outcomes, the receiver's state has fidelity at least 1 - 1e-9 with the input.
- Superdense coding: each of the 4 two-bit messages is decoded with probability 1.
- Deutsch-Jozsa: correct for all 8 constant and balanced functions of 2 input bits, with one oracle call.
- Bernstein-Vazirani: finds each of the 8 hidden 3-bit strings with probability 1, with one oracle call.
- Grover on 2 qubits: finds each of the 4 marked items with probability 1 after one iteration.
- GHZ boss: the reference solution meets the level's depth limit.
- Export: the output for the 30 circuits equals the verified text in fixtures/golden/export.
- The solve-bot clears Worlds 2 and 3.

Also write docs/review/M7-physics.md, in the same form as before.

Out of scope: noise, the stabiliser engine.

Done when: pnpm verify and pnpm test:e2e pass.
```

## Prompts for Phase 2: error correction and the classroom layer

This is the part of the game no one else has built, and the part where your own expertise is the final check. M10 and M11 each produce a numbers file for you to compare against your own Stim runs.

### M8. Stabiliser engine and noise

```text
Milestone M8: stabiliser engine and noise. Read CLAUDE.md and docs/PROGRESS.md. Present a plan and wait for my go.

Build:
1. src/engine/tableau: an Aaronson-Gottesman stabiliser tableau with bit-packed rows. Gates H, S, S-dagger, X, Y, Z, CNOT, CZ, SWAP. measureZ and measureX return the outcome and whether it was deterministic. reset. expectation(pauliString) returns +1, -1 or 0. stabilizers() returns the generators as signed Pauli strings. For tests only, a way to force the outcome of a random measurement, so a test can follow the branch Stim took.
2. src/engine/noise with three models. All are driven by the seeded Rng, and all return a log of the errors they inserted, which the UI will draw later:
   - codeCapacity: after each round, each data qubit suffers X with probability px and Z with probability pz, or depolarising noise with probability p.
   - phenomenological: codeCapacity, plus each syndrome bit flipped with probability q.
   - circuitLevel: after every one-qubit gate, a random Pauli with probability p; after every two-qubit gate, one of the 15 non-identity two-qubit Paulis with probability p; each measurement result flipped with probability p; each reset flipped with probability p; each idle qubit depolarised with probability p per step.
3. The same Pauli noise for the state-vector engine, as sampled trajectories.
4. tools/fixtures/gen_tableau.py, using Stim with a fixed seed. Set A: 200 random Clifford circuits without measurement on 2 to 20 qubits, each with Stim's stabiliser generators of the final state. Set B: 100 circuits with mid-circuit measurements, each with Stim's measurement record, whether each measurement was deterministic, and the final generators.

Tests first:
- Set A: every one of Stim's generators has expectation +1 in our tableau. (This avoids depending on any canonical ordering.)
- Set B: forcing Stim's random outcomes, our deterministic flags and values agree with Stim's at every measurement, and every final generator has expectation +1.
- Cross-check against the M1 engine: for 200 random Clifford circuits on up to 6 qubits, every generator from stabilizers() has expectation +1 in the state vector.
- Bell pair: expectation of XX is +1, of ZZ is +1, of ZI is 0. Measuring qubit 0 makes the measurement of qubit 1 deterministic and equal to it.
- GHZ on 3 qubits: XXX, ZZI and IZZ all have expectation +1.
- Noise statistics: over 100,000 samples at p = 0.1, each error type occurs with a frequency within 4 standard deviations of its expected value. The same seed replays the same error log.
- Speed: 1,000 random gates on 97 qubits finish in under 500 ms.

Out of scope: UI, codes, decoding.

Done when: pnpm verify passes.
```

### M9. Worlds 4 to 5: noise and first codes

```text
Milestone M9: Worlds 4 to 5. Read CLAUDE.md, docs/PROGRESS.md and the curriculum and noise parts of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. Noise on the circuit canvas: each inserted error flashes on its wire with its Pauli letter. A noise-strength slider where the level allows it. A fidelity gauge against the ideal state. An x-ray replay after the level that shows every error from the log.
2. Level type survival: the player's circuit runs for N rounds under a noise model, over K seeded trials, and passes if the success rate reaches the level's bar. Use the tableau engine when the level's states are stabiliser states, and the state-vector engine otherwise (12 qubits at most; reuse ancillas with reset).
3. Syndrome lights for ancilla measurements, and a correction table that the player fills in (syndrome pattern to Pauli fix) and the game applies each round.
4. A logical/physical toggle that shows the encoded qubit's logical Bloch arrow.
5. World 4 (8 levels) and World 5 (12 levels) from the curriculum, ending with the Shor-code boss. The World 4 boss is meant to be lost: it completes after 3 attempts, and it carries a flag expectFail so the validator checks that its reference circuit stays below the bar instead of above it.

Tests first:
- Storing |0> without a code under X noise at p = 0.05 for 10 rounds: the survival rate over 100,000 trials is within 4 standard deviations of (1 + (1 - 2p)^10) / 2.
- 3-qubit bit-flip code, reference circuit: for 20 random states a|0> + b|1> and each single X error, the corrected state has fidelity at least 1 - 1e-9 with the original.
- The bit-flip code does not correct a single Z error: a|000> + b|111> becomes a|000> - b|111>. A level depends on this.
- Bit-flip code, logical error per round at p = 0.05 over 200,000 trials: within 4 standard deviations of 3p^2 - 2p^3.
- Measuring Z1Z2 through an ancilla leaves a|000> + b|111> unchanged. Measuring qubit 1 directly does not, for a = b.
- Phase-flip code: the same tests with X and Z exchanged.
- Shor code, on the tableau engine: starting from each of the six logical states |0>, |1>, |+>, |->, |+i>, |-i>, the reference circuit corrects all 27 single-qubit X, Y and Z errors.
- The solve-bot clears Worlds 4 and 5, treating the expectFail level as cleared after 3 attempts.

Also write docs/review/M9-physics.md, in the same form as before.

Out of scope: surface-code decoding, the stabiliser view.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M10. Matching decoder and the decoder game

```text
Milestone M10: matching decoder and decoder game. Read CLAUDE.md, docs/PROGRESS.md and the decoder part of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. src/engine/decoder/graph.ts: for one error type on the rotated surface code, the matching graph (nodes are the checks plus one boundary node; each data qubit is an edge) and all-pairs shortest paths.
2. src/engine/decoder/match.ts: exact minimum-weight matching of the lit checks (defects), where a defect pairs either with another defect or with the boundary. Use dynamic programming over subsets of defects. It is exact, and fast enough up to 18 defects. Above 18, use nearest-pair greedy matching and set approximate: true on the result. Return the correction as a set of qubits.
3. Repeated rounds: the space-time graph for T rounds with measurement errors. A defect is a change between consecutive syndrome rounds. Time-like edges have a configurable weight.
4. Syndrome-extraction circuits for d = 3, 5, 7 on the tableau engine, using the same gate order as Stim's generated rotated-memory circuits. Store Stim's circuits as fixtures and compare against them.
5. tools/fixtures/gen_matching.py, using PyMatching with uniform weights. For d = 3: all 512 X-error patterns. For d = 5: 2,000 random patterns at p = 0.08 from a fixed seed. For each pattern, the syndrome and the weight of PyMatching's correction. Also logical error rates for d = 3 and d = 5 at p = 0.02, 0.05, 0.10 and 0.15, from 200,000 shots each.
6. UI: the decoder game. The player draws pairings between lit checks, or from a lit check to the boundary. The game then shows the decoder's pairing and compares the logical outcome, not the exact edges. A space-time view that stacks syndrome rounds as layers, drawn in SVG.
7. Extend the M5 lattice levels to d = 5 and to repeated rounds.

Tests first:
- Our correction always clears the syndrome.
- The weight of our correction equals the weight of PyMatching's for every fixture. The pairing may differ; the weight may not.
- No logical flip remains for any X error of weight 1 at d = 3, or of weight 1 or 2 at d = 5 (all 325 patterns).
- Logical error rates over 50,000 seeded shots agree with the fixture rates at each p, within 10% relative plus 4 binomial standard errors. If they do not, stop and report. Do not tune the decoder to fit.
- A single measurement error in an otherwise clean 5-round run produces exactly two defects, one directly above the other, and the decoder applies no correction to the data.
- With p = 0, the extraction circuit gives a clear and stable syndrome for 10 rounds, for logical |0> and for logical |+>.

Also write docs/review/M10-numbers.md: a table of logical error rate against p for d = 3 and d = 5, with shot counts, and the value of p where the two curves cross.

Out of scope: the threshold lab, Worlds 6 and 7 content.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M11. Worlds 6 to 7 and the threshold lab

```text
Milestone M11: Worlds 6 to 7 and the threshold lab. Read CLAUDE.md, docs/PROGRESS.md and the curriculum and threshold-lab parts of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. Stabiliser view: the current generators as signed Pauli strings, updating with the playhead. A checker that tells the player whether two Pauli strings of their choice commute.
2. World 6, 10 levels: products of Paulis, commuting checks, the stabilisers of a Bell pair, logical operators, Steane-code syndrome extraction, boss.
3. World 7, 14 levels: fold in the lattice levels from M5 and M10, then add logical strings, measurement errors, d = 3 against d = 5, and the 1,000-round boss.
4. tools/fixtures/gen_threshold.py, using Stim, sinter and PyMatching: rotated surface-code memory at d = 3, 5 and 7 under three noise settings (data noise only, with one perfect round; data plus measurement noise over d rounds; full circuit-level noise over d rounds). 12 values of p, spaced logarithmically around each expected threshold. Stop each point at 1,000,000 shots or 2,000 errors. Write public/data/threshold.json with p, d, shots, errors and a 95% Wilson interval for every point, plus the exact Stim parameters used. The noise definitions must be the same as those in src/engine/noise; state them in the file.
5. Threshold lab: choose d and p, run live batches in the worker (d = 3 and 5 live; d = 7 from the precomputed data only), plot live points with error bars over the precomputed curves on logarithmic axes, and show shot counts.
6. Stim export for any surface-code level.

Tests first:
- Steane code: all 6 generators commute pairwise. The reference extraction circuit reports the correct syndrome for each of the 21 single-qubit X, Y and Z errors, and the syndromes of the 7 X errors are all different.
- Commute checker: XX and ZZ commute; XI and ZI anticommute; the checker agrees with the tableau engine on 1,000 random pairs of 5-qubit Pauli strings.
- threshold.json passes its schema, and every point has at least 100 errors or the full shot count.
- Live lab at d = 3, data noise only, p = 0.05, over 50,000 seeded shots: within 10% relative plus 4 standard errors of the precomputed point.
- Our exported Stim circuit for d = 3 equals the text in fixtures/golden/stim. That fixture is written by a script that loads our export in Stim and confirms it has the same number of detectors and observables as Stim's own generated circuit.
- The solve-bot clears Worlds 6 and 7.

Also write docs/review/M11-physics.md, and docs/review/M11-numbers.md with the threshold estimate for each noise setting and its uncertainty.

Out of scope: World 8, multiplayer.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M12. Classroom layer

```text
Milestone M12: classroom layer. Read CLAUDE.md, docs/PROGRESS.md and the classroom part of docs/DESIGN.md. Present a plan and wait for my go.

Build:
1. src/game/classroom/api.ts: an interface with createClass, joinClass(code, nickname), submitProgress, getClassProgress, createAssignment and exportCsv.
2. Two implementations: an in-memory one, used by every test and by local play, and one hosted Postgres API chosen by an environment variable. Ask me before creating any cloud project. Never commit keys; read them from .env.local, which is git-ignored.
3. Student flow: enter a class code and a nickname. No email, no password, no request for a real name. Progress is stored locally and syncs when online.
4. Teacher flow: create a class; set assignments (worlds or levels, a due date, hints on or off); view a grid of students by levels (solved, stuck, not started); see the most common wrong answers per level and time on task; open one student's attempt history for one level.
5. CSV export of scores and concept-check results.
6. A per-class switch that turns telemetry off. SQL migrations with row-level security, so that a teacher reads only their own classes and a student writes only their own rows.

Tests first:
- On the in-memory implementation: a teacher creates a class, 3 students join and play 2 levels, the grid shows the right states, and the CSV has 3 rows with the right scores.
- Progress made offline appears in the grid after reconnecting, with no duplicates.
- With telemetry off, no attempt history is stored.
- A schema test confirms that no table or field stores an email address or a real name.
- Playwright: the full student flow and the full teacher flow, on the in-memory implementation.

Also write docs/review/M12-privacy.md: every field stored, where it is stored and for how long. I need it for the data-protection review.

Out of scope: leaderboards, community levels.

Done when: pnpm verify and pnpm test:e2e pass.
```

## Prompts for Phase 3: polish and release

The budget numbers in M14 are starting targets. Change them once you have real measurements from the Beta build.

### M13. Sandbox, offline, accessibility, Hindi

```text
Milestone M13: sandbox, offline play, accessibility and Hindi. Read CLAUDE.md and docs/PROGRESS.md. Present a plan and wait for my go.

Build:
1. Sandbox: a free circuit lab with every gate, up to 8 qubits, all state views, and import of OpenQASM 3 (the subset we export).
2. Installable offline app: a manifest and a service worker that cache the app, the levels and the threshold data, so that every level plays offline after the first visit.
3. Accessibility pass: every screen usable by keyboard alone; screen-reader summaries of the state, such as: 50% |00>, 50% |11>, entangled; visible focus; text contrast of at least 4.5 to 1; a reduced-motion mode. Add @axe-core/playwright as a development dependency.
4. src/i18n/hi.json with a first-pass Hindi translation, every entry marked needsReview: true, and a language switch. Keep ket notation and gate names in Latin script.
5. Sound: short optional effects, off by default, using the Web Audio API only.

Tests first:
- Importing each exported fixture reproduces the original circuit.
- Playwright, offline: load once, go offline, then complete one level from each world.
- axe reports no serious or critical violations on the home screen, level select, level play, lattice, threshold lab and teacher dashboard.
- A keyboard-only solve-bot clears one level per world.
- Every key in en.json exists in hi.json, and no player-facing string is hard-coded in src/ui.

Out of scope: new levels.

Done when: pnpm verify and pnpm test:e2e pass.
```

### M14. Release

```text
Milestone M14: release. Read CLAUDE.md and docs/PROGRESS.md. Present a plan and wait for my go.

Build:
1. Run the solve-bot over every level in Chromium, Firefox and WebKit in CI.
2. A performance budget written as tests: initial JavaScript at most 300 kB gzipped; one step of a 6-qubit circuit simulates in under 16 ms; 1,000 decoding shots at d = 5 finish in under 2 s; a level loads in under 1 s with Playwright's CPU slowed 4 times.
3. README (what the game is, how to run it, how to verify it), CONTRIBUTING, docs/level-authoring.md, and a physics-accuracy note that explains how the engines are checked against Qiskit, Stim and PyMatching.
4. Deployment to static hosting from the main branch through CI. Ask me which host and which licence before adding either.
5. A version number, a changelog, and an About screen that shows the version, the licence and the versions of the fixture tools.

Tests first:
- The budgets above.
- A link checker over the docs.
- On a clean CI runner, a fresh clone followed by pnpm install and pnpm verify passes.

Finish by listing every open TODO(physics-review) and every hi.json entry still marked needsReview. The release is blocked until I clear the first list.

Done when: pnpm verify and pnpm test:e2e pass in all three browsers.
```

## Recovery and review prompts

Things will still go wrong. These six prompts cover the cases that come up most, and each one stops Claude Code from taking the easy way out, which is to change the test.

**Independent review.** Run this in a fresh session after every milestone, before you merge.

```text
You are reviewing branch m<NN>-<slug> against main. You did not write this code. Do not fix anything; report.

Check, in this order:
1. Tests: was any test deleted, skipped, loosened, or made to pass by special-casing its input? Is any acceptance check in the milestone prompt (docs/BUILD_PLAN.md) missing a test?
2. Fixtures: did any file under fixtures/golden change without a matching change in tools/fixtures?
3. Engine purity and qubit order: is there any qubit-order conversion outside tools/fixtures and src/game/export?
4. Physics: read every new string in src/i18n/en.json against docs/DESIGN.md. List any statement that is wrong, misleading, or stronger than the design supports.
5. New engine code: branches and error paths with no test.

Give findings ranked by severity, each with file and line, then a one-line verdict: merge, fix first, or redo.
```

**The check fails.**

```text
pnpm verify is failing. Do not change any test or fixture. Reproduce the failure, show me the shortest failing case, state the root cause in one paragraph, then propose the smallest fix and wait for my go.
```

**It is going in circles.**

```text
Stop. You have tried this twice. Summarise what you tried, your best hypothesis, and what evidence would confirm it or rule it out. Write one minimal failing test that isolates the problem. Do not change implementation code until I reply.
```

**A fixture disagrees with the engine.**

```text
A golden fixture disagrees with our engine. Assume the fixture is right. Find the smallest circuit in the fixture set that fails and print both states in our qubit order. Check the qubit-order conversion first, then the gate definitions (S, T and the sign convention of the rotations), then measurement. Report what you find before changing anything.
```

**Picking up after a break or a lost session.**

```text
Read CLAUDE.md and docs/PROGRESS.md, look at the last 15 commits and run pnpm verify. Tell me where milestone M<N> stands: which acceptance checks pass, which remain, and anything left half-finished. Do not write code yet.
```

**A physics statement looks wrong.**

```text
I think this statement in level <id> may be wrong: "<text>". Write an engine test that passes if the statement is true and fails if it is false, and run it. Report the result and, if needed, propose corrected wording. Do not edit en.json until I approve.
```

## Your part at each gate

The tests prove the code does what the prompt said. Only you can check that the prompt said the right physics and that the result is worth playing.

- [ ] The review session's verdict is "merge".
- [ ] You played every new level yourself and noted any that took over 10 minutes or felt like homework.
- [ ] You read `docs/review/M<N>-physics.md` line by line and fixed the wording in `en.json`.
- [ ] For M10 and M11, the numbers file agrees with your own Stim runs.
- [ ] `pnpm fixtures` on your machine produces no changes.
- [ ] The branch is merged and tagged, and the phase gate in the design tab is checked if this milestone ends a phase.

**What Claude Code should not decide alone:**

- Physics wording that reaches students.
- Threshold values and error-rate numbers shown in the game.
- Anything that touches student data.
- Cloud accounts, hosting and the licence.
- Any change to a test or a fixture.

## Sources

- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- [How Claude remembers your project (CLAUDE.md)](https://code.claude.com/docs/en/claude-md)
- [Choose a permission mode (plan mode)](https://code.claude.com/docs/en/permission-modes)
