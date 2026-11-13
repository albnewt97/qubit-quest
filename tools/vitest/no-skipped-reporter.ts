// Vitest reporter used by the `test` script (the unit-test step of pnpm verify).
// It fails the run if any test or suite is reported skipped, todo or pending, so a
// test cannot be switched off at run time (ctx.skip(), skipIf, .only leaving
// others unrun ...) in a way the lint rules cannot see.
import type { Reporter, TestModule } from "vitest/node";

export default class NoSkippedReporter implements Reporter {
  onTestRunEnd(testModules: readonly TestModule[]): void {
    const offenders: string[] = [];
    for (const mod of testModules) {
      const file = mod.relativeModuleId;
      for (const suite of mod.children.allSuites()) {
        const state = suite.state();
        if (state === "skipped" || state === "pending") {
          offenders.push(`${file} > ${suite.fullName} (suite ${state})`);
        }
      }
      for (const test of mod.children.allTests()) {
        const { state } = test.result();
        if (state !== "passed" && state !== "failed") {
          offenders.push(
            `${file} > ${test.fullName} (${test.options.mode === "todo" ? "todo" : state})`,
          );
        }
      }
    }
    if (offenders.length === 0) return;
    console.error(
      `\nno-skipped-reporter: ${String(offenders.length)} test(s) or suite(s) did not run. Skipped, todo and pending tests are not allowed (see CLAUDE.md):`,
    );
    for (const o of offenders) console.error(`  ${o}`);
    process.exitCode = 1;
  }
}
