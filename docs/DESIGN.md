# Qubit Quest — Game Design & Build Plan

Nov 13, 2026 · @Naman

Build plan and Claude Code prompts: Build plan and prompts

## Vision and goals

Qubit Quest (working title) is a browser puzzle game. Students build real quantum circuits to protect a fragile logical qubit, then learn to keep it alive against noise using error correction. Most quantum games stop at gates and Bell states. This one treats **error correction as the main event**: the whole campaign climbs toward running and decoding a distance-3 surface code.

**Target learners:**

- Primary: first- and second-year undergraduates in physics, CS or engineering.
- Secondary: 16–18 year-olds, who start with a short Primer that teaches the maths they have not met yet. Also self-learners and software engineers retraining into quantum.
- Prerequisites for the main game: comfort with binary, XOR and simple matrices. Anyone without them plays the Primer first. Complex numbers are taught in-game.

**Learning outcomes.** After the full campaign a student can:

1. Predict the output of 1–3 qubit circuits built from H, X, Z, S, T, CNOT and measurement, and explain interference and entanglement in their own words.
2. Read and write circuits in standard notation and export them as OpenQASM or Qiskit.
3. Explain why errors are inevitable, the difference between bit-flip and phase-flip errors, and why copying (no-cloning) rules out naive backup.
4. Build a repetition code, measure its parity checks with ancillas, and correct a single error from the syndrome.
5. Describe the stabiliser picture of the Steane and surface codes, read a syndrome on a surface-code lattice, and decode it by hand with minimum-weight matching.
6. Explain code distance, logical error rate and the threshold idea from experiments they ran themselves.

**Success at 12 months:**

- A measurable learning gain: post-test score up at least 20 percentage points over pre-test in classroom pilots.
- At least 3 university courses or schools using it in a real module.
- 40% of players who start World 4 (error correction) finish it.
- Open-source core with at least 5 outside contributors of levels or translations.

## Landscape and gap

The existing tools teach gates and circuits well, and a few teach decoding in isolation. None of them takes a student from |0⟩ to a working, decoded surface code in one continuous game. That gap is the product.

| Tool | What it does well | What it misses for our goal |
| --- | --- | --- |
| [Quantum Odyssey](https://keymailer.co/QuantumOdyssey) (Quarks Interactive, Steam release Jan 2025) | Fully visual puzzles on real quantum logic; exports circuits to Qiskit | Error correction is not the spine; commercial and closed |
| [The Qubit Factory](https://www.goodreads.com/author_blog_posts/24988704-building-a-visceral-understanding-of-quantum-phenomena) | Open-ended circuit building; includes some QEC levels | Restricts states to real amplitudes (X–Z plane only), so no phase or T gates |
| [Decodoku](https://en.wikipedia.org/wiki/Decodoku) (Univ. of Basel, 2016) | Surface-code decoding as a grid puzzle; citizen science | Strips away the quantum context; no circuits |
| [Quantum Error Correction for Kids](https://arxiv.org/html/2405.06795v1) (Wolf, 2024) | Physical team game teaching parity checks and stabilisers, age 7+ | Unplugged only; stops before real codes |
| [Quantum Hashi](https://github.com/dotQ-Research/qaif-hashi) | QEC syndrome ideas on a Hashi puzzle | Small hobby project; narrow scope |
| Quirk, IBM Quantum Composer (simulators) | Accurate, fast, standard notation | Sandboxes, not games: no goals, feedback or progression |

**Our differentiators:**

1. **QEC is the destination.** Gates are taught as tools for building codes, so every early concept pays off later.
2. **Real physics, full complex amplitudes.** A state-vector engine for small circuits and a stabiliser engine (Stim) for codes, so nothing taught has to be unlearned.
3. **Noise you can see.** Errors appear as animated events, and players watch syndromes light up in real time.
4. **Bridge to research tools.** Every level exports to OpenQASM, Qiskit and Stim, so students can carry their work into real tools.
5. **Open source, built for classrooms.** Teacher dashboard, level editor, no accounts required for students.

## Pedagogy

The game teaches by doing first and naming second. Each new idea shows up as a puzzle the player can't solve with what they already have. Once they solve it, the game gives the idea its formal name and notation.

**Design principles:**

- **Predict, run, explain.** Before a circuit runs, the player predicts the outcome; then they see the result and get a short explanation. This loop is built into levels, not bolted on as quizzes.
- **Several views, one state.** Amplitudes as bars or discs with phase colour, a Bloch sphere for single qubits, probabilities, and Dirac notation, all shown side by side and kept in sync. Each world adds one new view.
- **Fade the scaffolding.** Early levels lock the available gates and show hints. Later levels give a full toolbox and a cost budget (gate count, depth or qubit count).
- **Mistakes cost nothing.** Unlimited rewinds, step-through execution and a ghost of the target state.
- **Notation is earned.** Matrices and ket notation appear after the player has built intuition for them, then stay switchable.
- **Spaced review.** Boss levels at the end of each world combine concepts from earlier worlds.

**Misconceptions to target directly** (each gets at least one level designed to break it):

| Misconception | Level that breaks it |
| --- | --- |
| A qubit is secretly 0 or 1 and we just don't know which | H-then-H returns 0 every time; a classical coin can't do that |
| Superposition means trying all answers in parallel | Deutsch–Jozsa level: speed-up comes from interference, not from reading all answers |
| Measuring an entangled qubit sends a signal | Two-player Bell level where the local statistics never change |
| Global phase matters / relative phase doesn't | Z on \|0⟩ changes nothing visible; Z on \|+⟩ changes the H-basis outcome |
| Errors can be fixed by copying the qubit | No-cloning level: the copy circuit fails on \|+⟩ |
| Measuring a code qubit to check it is fine | Direct measurement destroys the encoded superposition; ancilla parity checks don't |
| Bigger codes are always better | At high physical error rates, distance 5 does worse than distance 3 |

**Assessment.** Built-in, invisible-where-possible:

- Stealth assessment: every solution is logged (gate count, attempts, hint use) and mapped to learning outcomes.
- Short concept checks (2–3 questions) at world boundaries, reused as pre/post tests in pilots.
- "Explain it" prompts in boss levels: the player writes one sentence, and teachers can review it in the dashboard.

## Core game concept

The player is the new engineer aboard a deep-space relay station. The station's quantum memory holds the only copy of a message from a probe, and cosmic noise is eating it. Each world unlocks a new part of the station: first the gate bench, then the entangler, then the memory core with its error-correction lattice. The story gives a reason to care about one fragile qubit, and that is exactly the emotional hook QEC needs.

**Core loop (one level, 3–10 minutes):**

1. **Brief.** A target is shown: an output state, a truth table, a probability pattern, or "keep the message alive for N rounds".
2. **Build.** Drag gates onto wires within a budget (allowed gates, max qubits, max depth).
3. **Predict.** Optional for stars: the player guesses the outcome, such as which basis state is most likely or which detector fires.
4. **Run.** Step through the circuit or play it at speed. The state views animate and noise events flash where they hit.
5. **Score.** Pass/fail on the target, plus up to 3 stars for efficiency (gate count, depth) and for correct predictions.
6. **Debrief.** A 2–3 sentence explanation, the formal name of what they just did, and an export button.

**Player verbs.** Place, wire, step, measure, predict, inspect, detect (read a syndrome), correct (apply a Pauli fix), decode (pair up defects).

**Level types:**

| Type | Goal | Example |
| --- | --- | --- |
| Target state | Reach an exact state | Make (\|00⟩ + \|11⟩)/√2 from \|00⟩ |
| Equivalence | Build a circuit equal to a given one, cheaper | Make a CNOT pointing the other way using only H and CNOT |
| Black box | Find out what a hidden gate does | Is the box Z or S? You get 3 runs |
| Survival | Keep a logical qubit alive under noise for N rounds | Repetition code under 5% bit-flip noise |
| Decode | Given a syndrome, choose the correction | Pair the lit plaquettes on a d = 3 surface code |
| Design | Open-ended, scored on a leaderboard | Lowest logical error rate with 9 data qubits |

**Progression.** Stars unlock optional challenge levels; finishing a world unlocks the next part of the station. Players collect "blueprints" (circuits they built), and these become reusable custom gates. For example, their own Bell-pair circuit becomes a single block in World 3, and their own syndrome-extraction circuit becomes one in World 5. This makes abstraction a reward rather than a lecture.

## Curriculum map

There is an optional Primer plus nine worlds, about 100 levels in all, roughly 15–20 hours for a full playthrough. The secret thread is **parity**. World 0 teaches XOR, and the same idea comes back as CNOT, then as the syndrome, then as the stabiliser, then as the surface-code plaquette. A course can run Worlds 0–3 as a stand-alone "intro to quantum circuits" unit, and Worlds 4–7 as a QEC unit.

**Primer (optional, 6 levels, about 40 minutes).** Written for 16–18 year-olds and anyone rusty on the maths. It covers arrows (vectors) and adding them, probability as squared length, complex numbers as rotating arrows, matrices as machines that turn one arrow into another, and binary with XOR. A five-question placement check at the start lets undergraduates skip straight to World 0.

| World | Station area | Concepts | New mechanic or view | Example levels | Boss level | Levels |
| --- | --- | --- | --- | --- | --- | --- |
| 0. Bits | Power room | Bits, NOT, AND, XOR, reversibility, parity bits | Classical wires, truth tables | Build XOR from NAND; detect a flipped bit with one parity bit | Locate one flipped bit in a 7-bit Hamming codeword from its 3 parity checks | 6 |
| 1. One qubit | Gate bench | \|0⟩, \|1⟩, X, H, measurement, probability, interference, Z, S, T, relative phase | Amplitude discs with phase colour; Bloch sphere; measurement histogram | HH = identity; turn \|0⟩ into \|−⟩; black box: Z or S? | Hit 4 target Bloch points with the fewest gates | 12 |
| 2. Many qubits | Entangler | Tensor product, CNOT, Bell states, entanglement, no-cloning, phase kickback | Multi-qubit amplitude grid; entanglement meter | Make all 4 Bell states; flip CNOT direction with H; why copying \|+⟩ fails | Prepare a 3-qubit GHZ state with a depth limit | 12 |
| 3. Algorithms | Comms array | Deutsch–Jozsa, Bernstein–Vazirani, 2-qubit Grover, teleportation, superdense coding | Oracle boxes; classical feed-forward wires | Find the hidden string in one query; teleport a qubit across the station | Teleportation with a mid-circuit correction step | 10 |
| 4. Noise | Hull breach | Decoherence, Pauli X/Y/Z errors, bit-flip vs phase-flip, error probability, fidelity | Noise slider; animated error events; fidelity gauge | Watch a stored \|+⟩ drift; which errors hurt \|0⟩ and which hurt \|+⟩? | Survive 10 rounds without a code and see that you can't | 8 |
| 5. First codes | Memory core | 3-qubit bit-flip code, ancilla parity checks, syndrome tables, phase-flip code, Shor 9-qubit code | Syndrome lights; correction step; logical vs physical qubit view | Encode with 2 CNOTs; measure Z1Z2 without measuring qubits 1 or 2 | Shor code: correct any single-qubit error | 12 |
| 6. Stabilisers | Control room | Pauli group, commuting checks, stabiliser generators, logical operators, Steane code, Clifford circuits | Stabiliser tableau view; "does it commute?" checker | Find the stabilisers of a Bell pair; build Steane syndrome extraction | Design the checks for a hidden code from its errors | 10 |
| 7. Surface code | Lattice | Rotated d = 3 surface code, plaquettes, defects, error strings, logical operators, matching decoder, repeated rounds, measurement errors, distance, threshold | Lattice view; space-time syndrome view; logical error rate graph | Pair defects by hand; find a logical string; d = 3 vs d = 5 at 0.1% and 2% noise | Keep the message alive for 1,000 simulated rounds | 14 |
| 8. Frontier (optional) | Deep space | Erasure errors and heralding, leakage, lattice surgery, magic states | Heralded-error markers; two-patch view | Decode when some error locations are known; merge two patches | Open design challenge with leaderboard | 8+ |

World 8 is where your own research fits: herald-conditioned matching on erasure errors turns straight into a level where flagged qubits make the matching puzzle visibly easier. That gives you a research-to-classroom story to cite in applications.

## Key mechanics in detail

Seven systems carry the game. The circuit builder and the state views are needed from day one. The syndrome lattice and the decoder are the parts no other game has, so they get the most design and playtest time.

### 1. Circuit builder

- Wires run left to right in standard textbook orientation, so skills carry straight over to Qiskit and papers.
- Drag gates from a palette that each level restricts. Multi-qubit gates snap across wires, and measurement creates a double-line classical wire that can control later gates (feed-forward).
- Step-through mode with a playhead: the state views update after every column. Scrub backwards freely.
- Blueprints: select a block of gates and save it as a named custom gate, which can be expanded again for inspection.
- Budgets shown live: gate count, depth, qubits, and later a CNOT count, since two-qubit gates are what is noisy in real hardware.

### 2. State views (all synchronised)

- **Amplitude discs.** One disc per basis state: area = probability, needle angle and colour = phase. This is the main view, and it makes interference visible as needles cancelling.
- **Bloch sphere** for each qubit, showing the reduced state. When a qubit becomes entangled, its arrow shrinks inside the sphere. That gives a picture of entanglement as lost local information, with no maths needed.
- **Probability histogram** from sampled shots, so students feel the gap between amplitudes and what an experiment returns.
- **Dirac text** and, from World 2, **matrix view**, each toggleable.
- From World 6 the **stabiliser view** replaces amplitudes: a list of Pauli strings that grows only linearly with qubit count. The game says out loud why: this is how 50-qubit codes can be simulated on a laptop.

### 3. Noise engine

Noise arrives in three stages, matching how QEC research models it:

1. **Code capacity.** Pauli errors hit data qubits only, between rounds. Used in Worlds 4–5.
2. **Phenomenological.** Syndrome measurements can also be wrong. Introduced in World 7, motivating repeated rounds.
3. **Circuit-level.** Every gate, idle step and measurement can fail. Used in the late World 7 levels and in World 8.

Errors are drawn as visible events (a flash on the wire with the Pauli letter), and each level can replay its noise with a fixed seed. Players can turn on "x-ray mode" after a level to see where the errors actually landed.

### 4. Syndrome lattice (the signature mechanic)

- Data qubits sit on vertices, and X-type and Z-type checks are coloured tiles. A tile lights up when its parity is odd.
- The player taps qubits to apply X or Z corrections. The level is won when every tile is dark **and** the hidden message survives. A final reveal shows whether the correction combined with the error formed a logical operator.
- This teaches the deepest QEC lesson by experience: clearing the syndrome is not the same as fixing the error. Two corrections with the same syndrome can differ by a logical flip.
- Hint layer: when the player hovers over two defects, the game shows the shortest error chain that connects them.

### 5. Decoder mini-game

- Space-time view: syndrome rounds stack vertically into a 3D lattice, and a measurement error shows up as a vertical pair of defects.
- The player draws pairings between defects, or to the boundary. The game then runs the matching decoder on the same syndrome and compares logical outcomes rather than exact edges.
- Score: agreement with the decoder, plus a bonus for cases where the player's pairing is also correct but different, which teaches degeneracy.
- World 8 variant: erased qubits are flagged, their edges drop to near-zero weight, and the player sees matching get easier.

### 6. Threshold lab

- The player picks code distance (3, 5, 7) and physical error rate, then runs batches of shots and watches a logical error rate curve plot point by point.
- Small batches run live in the browser. Precomputed high-statistics curves are overlaid, so the crossing point (the threshold) stays clear despite noisy live data.
- Prompt: "Where does adding more qubits stop helping?" This is the threshold theorem, discovered by the player.

### 7. Sandbox and multiplayer

- **Sandbox.** Free circuit lab with all gates. Import and export OpenQASM 2/3, Qiskit Python and Stim circuit files.
- **Noise vs Coder (2 players, same screen or online).** One player places errors under a budget, and the other must decode from the syndrome alone. Roles swap each round. This adapts the team game in Wolf's *QEC for Kids* to the screen.
- **Weekly challenge.** One design problem with a public leaderboard, such as the fewest CNOTs to prepare a given stabiliser state.

## Technical architecture

The game is a static web app that runs entirely in the browser, with simulation done in a Web Worker. A Python pipeline built on Stim, sinter and PyMatching runs offline in CI. It validates every level and precomputes the heavy statistics. A small optional backend handles classrooms and leaderboards. School Chromebooks get full gameplay with no install and no server load.

&#91;embedded content: architecture · browser, offline pipeline, optional backend\]

The simulation worker is the core of the system. It keeps the UI smooth during runs and is the only part that must be physically exact.

| Layer | Choice | Why |
| --- | --- | --- |
| UI | TypeScript + React; SVG for everything, including the Bloch sphere and the space-time view (no 3D library in v1) | Widely known stack; SVG stays sharp and is accessible to screen readers |
| State-vector engine | Own TypeScript module, complex float64 arrays, up to 12 qubits (gameplay capped at about 6 for readability) | Tiny, fast, and fully in our control for animation hooks |
| Stabiliser engine | Tableau (CHP-style) simulator in TypeScript, checked against Stim fixtures | Handles about 100 qubits, enough for d = 7 rotated surface code (97 qubits) |
| Decoder | Exact matching on small graphs in-browser (dynamic programming over defects; greedy fallback above 18 defects) | Live feedback in the decoder mini-game; graphs at d ≤ 7 are small |
| Offline pipeline | Python: Stim + sinter + PyMatching, plus Qiskit for cross-checks | Research-grade numbers for threshold curves; reuses your existing toolchain |
| Level format | JSON with a published schema | Diff-able in Git; easy for teachers to author |
| Storage | Local-first (IndexedDB); optional sync | Works offline; no student account needed |
| Backend (optional) | Postgres-backed API (e.g. Supabase) for class codes, teacher dashboards and leaderboards | Cheap, and can be self-hosted by universities |
| Hosting | Static CDN (GitHub Pages or Cloudflare Pages) + installable PWA | Near-zero cost; offline use in classrooms |

**Level schema (sketch):**

```json
{
  "id": "w5-03-syndrome-without-looking",
  "world": 5,
  "qubits": { "data": 3, "ancilla": 2 },
  "palette": ["CNOT", "MEASURE"],
  "budget": { "gates": 6, "depth": 4 },
  "engine": "stabilizer",
  "noise": { "model": "code_capacity", "pauli": "X", "p": 0.1, "seed": 42 },
  "target": { "type": "measure_parities", "checks": ["Z0Z1", "Z1Z2"], "preserve_logical": true },
  "predict": { "question": "Which ancilla lights if qubit 1 flips?", "answer": "both" },
  "hints": ["An ancilla can collect parity through CNOTs"],
  "debrief": "i18n:w5-03-debrief",
  "reference_solution": "w5-03.stim"
}
```

**Correctness guarantees** (as a QEC researcher, this is where your credibility sits):

- Every level ships a reference solution, and CI checks that it passes and stays within budget.
- Random-circuit tests compare the TypeScript state-vector engine against Qiskit, and the tableau engine against Stim, on every commit.
- Threshold curves shown in-game are generated by sinter with recorded shot counts and confidence intervals, and the source data is shipped with the game.

**Accessibility and reach:**

- Phase is shown by needle angle as well as colour, with a colour-blind-safe palette.
- Full keyboard circuit editing, with screen-reader state summaries ("50% |00⟩, 50% |11⟩, entangled").
- Reduced-motion mode; targets 60 fps on a 4 GB Chromebook.
- Internationalisation from day one; English and Hindi first.

## Content pipeline and level authoring

Levels are data, not code. Anyone who can build a circuit can make a level in the in-game editor, and a level reaches players only after CI has validated it and a human has reviewed it.

1. **Design card.** One line each: the learning outcome, the misconception targeted, and the "aha" moment the level forces.
2. **Build in the editor.** Set the palette, budget, target and noise. Solve the level once to record the reference solution.
3. **Auto-checks in CI.** The reference solution passes; the budget is not trivially loose (a search over short circuits finds no much cheaper solution unless intended); text fits the screen; i18n keys exist.
4. **Physics review.** A QEC-literate reviewer signs off on the debrief text. This is the main defence against teaching something subtly wrong.
5. **Playtest.** 3–5 target-age players. Record completion rate, median time and hint use. Change any level with completion under 60% or median time over 12 minutes.
6. **Ship in a level pack.** Versioned and backward-compatible, so a level never changes under a class mid-term.

**Writing rules for in-game text:** at most 40 words per debrief screen; one new term per level; every term links to a glossary card with a picture; no unexplained symbols.

**Community levels.** Teachers and students can share levels by link. Promoted community levels go through steps 3–5 before they join the official packs.

## Classroom and teacher features

Teachers are the distribution channel. A lecturer will adopt the game only if it saves them preparation time and shows them who is stuck, so the classroom layer ships in the first public release rather than later.

- **Class codes.** The teacher creates a class and students join with a code and a nickname. No email address and no student accounts. Progress is stored locally and synced to the class.
- **Assignments.** Pick worlds or single levels, set a due date, lock or unlock hints.
- **Dashboard.** A heat map of students × levels (solved, stuck, not started), the most common wrong answers per level, and time on task. One click shows a student's circuit history for a level.
- **Misconception report.** For each class, the top 3 misconceptions flagged by level telemetry, each linked to a 10-minute discussion activity.
- **Lesson kits.** For each world: slides, a 50-minute lesson plan, an unplugged warm-up (for example Wolf's parity game before World 5), a worksheet and answer key. Mapped to typical undergraduate quantum-information syllabi.
- **Export.** CSV of scores and the concept-check results for gradebooks.

**Privacy.** The design aims to collect nothing that identifies a student: nicknames only, no ads, no third-party trackers. Telemetry is aggregated and can be switched off per class. It must comply with GDPR (UK/EU), India's Digital Personal Data Protection Act 2023, and COPPA if under-13s ever play. A data-protection review before the first school pilot is a hard gate.

## Roadmap

The plan runs 40 weeks to a public v1.0 with a small team, in four phases, each ending in a go/no-go gate. The riskiest piece, the syndrome lattice, is prototyped in the first six weeks rather than left until last. If the fun isn't there, it's better to learn that while the build is still cheap.

&#91;embedded content: roadmap · 4 phases, 4 gates\]

A failed gate means another iteration of that phase, not a slip of the whole plan. Gate 1 is the cheapest place to find out the core mechanic doesn't work.

**Deliverables by phase:**

| Phase | Weeks | Deliverables |
| --- | --- | --- |
| 0. Prototype | 1–6 | Paper prototype of the lattice; vertical slice with the circuit builder, amplitude discs and 8 World 1 levels; 3 lattice levels on a hard-coded engine |
| 1. Alpha | 7–18 | Primer and Worlds 0–3 (46 levels); level schema and editor v1; QASM/Qiskit export; CI level validation; engine cross-tests against Qiskit |
| 2. Beta | 19–32 | Worlds 4–7 (44 levels); tableau engine; in-browser matching decoder; threshold lab with sinter-generated curves; teacher dashboard v1 |
| 3. Launch | 33–40 | Polish and sound; lesson kits for 8 worlds; Hindi translation; accessibility audit; open-source release; launch at a conference or Qiskit community event |
| 4. After v1.0 | 41+ | World 8 (erasure, lattice surgery); Noise vs Coder multiplayer; community levels; learning-gain paper |

**Team and effort:**

| Role | Who | Load | Notes |
| --- | --- | --- | --- |
| Physics and content lead, engine | You | 50% | Curriculum, level design, simulation engines, physics review |
| Frontend and game developer | Hire or co-founder | 100% | UI, animation, editor, PWA |
| Visual and UX designer | Freelance | 30%, heavier in phases 0 and 3 | Station art, state-view design, icons |
| Education advisor | University lecturer partner | About 2 hours/week | Learning outcomes, pilot design, assessment |
| Playtesters | 2 pilot classes + a Discord group | In each phase | Target-age students, not experts |

Total effort is about 60–70 person-weeks to v1.0. Solo and part-time, expect 12–18 months: cut World 8 and multiplayer, and launch with Worlds 0–5 first.

## Testing and evaluation

The game succeeds only if students learn more than they would have otherwise. That is measured with a pre/post test and a comparison group, not inferred from play time.

**Playtesting cadence.**

- Every 2 weeks: 3–5 think-aloud sessions on new levels (screen plus voice recording, with consent).
- Every phase gate: one pilot with a real class.

**Learning-gain study (from the Alpha pilot onward).**

- Design: a 15-item concept test before and after, with a comparison section taught the same topics by lecture plus problem sheets.
- Metric: normalised gain, (post − pre) / (100 − pre). The target is at least 0.3 above the comparison group.
- Pre-register the hypotheses and analysis before the Beta pilot. Report effect sizes with confidence intervals, never only p-values. Publish results either way, as a paper in *Physical Review Physics Education Research* or the *IEEE Quantum Week* education track.

**Product metrics (telemetry, aggregated):**

| Metric | Target | Why it matters |
| --- | --- | --- |
| Level completion rate | ≥ 70% per level | Below 60% means the level is mis-tuned |
| Median time per level | 3–10 minutes | Fits a lab session |
| Hint use | 20–40% of attempts | Too low suggests it's too easy; too high suggests it's unclear |
| World 4 → World 7 retention | ≥ 40% | The QEC arc is the product |
| Prediction accuracy trend | Rising within each world | Evidence of building intuition, not trial and error |
| Teacher reuse | ≥ 50% assign a second world | Adoption signal |

## Risks, open questions and next steps

The biggest risk is a game that is accurate but not fun. The second is scope: nine worlds is a lot for a small team.

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Accurate but not fun; feels like homework | High | Prototype the lattice first; playtest with non-experts every 2 weeks; cut any level that tests poorly twice |
| Scope creep past 40 weeks | High | Ship Worlds 0–5 as v0.9 if Phase 2 slips; World 8 and multiplayer are explicitly post-launch |
| Subtly wrong physics in simplified explanations | Medium | Physics review step for every debrief; engines cross-tested against Qiskit and Stim in CI |
| Difficulty cliff at World 6 (stabilisers) | Medium | Extra bridge levels; blueprints hide syndrome circuits once they are understood |
| Low teacher adoption | Medium | Lesson kits, dashboard in v1.0, recruit 2 pilot lecturers before Alpha |
| Browser performance on school hardware | Low | Worker-based engines; precomputed curves; test on a low-end Chromebook from Phase 0 |
| Competition (e.g. Quantum Odyssey adds a QEC campaign) | Low–medium | Stay open source and classroom-first, with research-grade QEC depth |

**Open questions:**

- [ ] Is this an Axiom product, an open-source side project, or an academic outreach project? This affects licence, funding and branding.
- [ ] Licence: MIT/Apache for the engine and CC BY-SA for level content?
- [ ] Funding: outreach grants, quantum open-source microgrants, or university teaching-innovation funds. Check current programmes.
- [ ] Name: check "Qubit Quest" for existing trademarks and app-store clashes.

**Next steps (first 2 weeks):**

- [ ] Write the 15-item concept test; it defines what "learned" means.
- [ ] Paper-prototype the syndrome lattice (tiles plus counters) and play it with 3 people who don't know QEC.
- [ ] Build the circuit builder and amplitude-disc view as a throwaway prototype with 3 World 1 levels.
- [ ] Draft the level JSON schema and port one existing Stim surface-code circuit into it.
- [ ] Contact 2 lecturers about a pilot slot next term.

## Sources

- [Quantum Odyssey on Keymailer (release date, Qiskit export)](https://keymailer.co/QuantumOdyssey)
- [Building a Visceral Understanding of Quantum Phenomena (The Qubit Factory)](https://www.goodreads.com/author_blog_posts/24988704-building-a-visceral-understanding-of-quantum-phenomena)
- [Decodoku (Wikipedia)](https://en.wikipedia.org/wiki/Decodoku)
- [Wootton, Getting the public involved in Quantum Error Correction (arXiv:1712.09649)](https://arxiv.org/pdf/1712.09649)
- [Wolf, Quantum error correction for kids (arXiv:2405.06795)](https://arxiv.org/html/2405.06795v1)
- [Quantum Hashi (GitHub)](https://github.com/dotQ-Research/qaif-hashi)
