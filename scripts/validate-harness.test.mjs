import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import {
  progressReport,
  renderHandoff,
  sourceSnapshot,
  validateHarness
} from "./validate-harness.mjs";

const root = mkdtempSync(path.join(tmpdir(), "battle-harness-test-"));
mkdirSync(path.join(root, "docs"));
for (const file of [
  "AGENTS.md",
  "README.md",
  "PROGRESS.md",
  "session-handoff.md",
  "docs/verification.md"
])
  writeFileSync(path.join(root, file), "# Test documentation\n");
after(() => {
  const relative = path.relative(tmpdir(), root);
  assert.ok(relative.startsWith("battle-harness-test-") && !relative.includes(path.sep));
  rmSync(root, { recursive: true });
});

function fixture() {
  const data = {
    schema_version: 2,
    project: "Test",
    last_updated: "2026-10-06",
    rules: {
      single_active_feature: true,
      passing_requires_evidence: true,
      do_not_skip_verification: true
    },
    status_legend: {
      not_started: "Pending",
      in_progress: "Active",
      needs_verification: "Implemented",
      blocked: "Blocked",
      passing: "Verified"
    },
    continuation: {
      feature_id: "test-001",
      updated_at: "2026-10-06T12:00:00-06:00",
      summary: "Scoped test verification",
      next_action: "Continue scoped verification.",
      blockers: [],
      changed_files: ["README.md"],
      run_ids: ["run-1"],
      context: ["No hosted checks were performed."]
    },
    verification_runs: [
      {
        id: "run-1",
        recorded_at: "2026-10-06T12:00:00-06:00",
        revision: "a".repeat(40),
        source_snapshot: "b".repeat(64),
        worktree: [],
        environment: "Node 22",
        checks: [
          { level: "local", command: "npm run test", result: "passed", summary: "Tests passed" }
        ]
      }
    ],
    features: [
      {
        id: "test-001",
        priority: 1,
        area: "test",
        title: "Test",
        user_visible_behavior: "Works",
        status: "passing",
        verification: ["Verify behavior"],
        acceptance_results: [
          {
            step: 1,
            level: "local",
            status: "passed",
            run_id: "run-1",
            summary: "Behavior asserted"
          }
        ],
        related_files: ["README.md"],
        required_checks: ["local"],
        check_results: [{ level: "local", status: "passed", run_id: "run-1" }],
        evidence: ["Behavior asserted"],
        notes: "Local only",
        next_action: "Continue scoped verification."
      }
    ]
  };
  syncHandoff(data);
  return data;
}

/** @param {Parameters<typeof renderHandoff>[0]} data */
function syncHandoff(data) {
  writeFileSync(path.join(root, "feature_list.json"), JSON.stringify(data));
  writeFileSync(path.join(root, "session-handoff.md"), renderHandoff(data));
}

void test("accepts valid scoped evidence", () =>
  assert.deepEqual(validateHarness(fixture(), root), []));
void test("rejects malformed structure", () =>
  assert.ok(validateHarness({ features: [] }, root).length));
void test("rejects invalid status", () => {
  const data = fixture();
  data.features[0].status = "done";
  assert.ok(validateHarness(data, root).length);
});
void test("rejects duplicate IDs and multiple active features", () => {
  const data = fixture();
  data.features[0].status = "in_progress";
  data.features.push(structuredClone(data.features[0]));
  const errors = validateHarness(data, root);
  assert.ok(errors.some((error) => error.includes("Duplicate feature")));
  assert.ok(errors.some((error) => error.includes("Only one")));
});
void test("rejects duplicate run IDs", () => {
  const data = fixture();
  data.verification_runs.push(structuredClone(data.verification_runs[0]));
  assert.ok(validateHarness(data, root).some((error) => error.includes("Duplicate verification")));
});
void test("rejects passing without acceptance evidence", () => {
  const data = fixture();
  data.features[0].evidence = [];
  assert.ok(validateHarness(data, root).some((error) => error.includes("acceptance evidence")));
});
void test("rejects passing with pending required browser check", () => {
  const data = fixture();
  data.features[0].required_checks.push("browser");
  data.features[0].check_results.push({ level: "browser", status: "pending", reason: "Not run" });
  assert.ok(validateHarness(data, root).some((error) => error.includes("browser has not passed")));
});
void test("accepts implementation awaiting required checks", () => {
  const data = fixture();
  data.features[0].status = "needs_verification";
  data.features[0].required_checks.push("browser");
  data.features[0].check_results.push({
    level: "browser",
    status: "pending",
    reason: "Browser not installed"
  });
  syncHandoff(data);
  assert.deepEqual(validateHarness(data, root), []);
});
void test("rejects unknown and failed execution evidence", () => {
  const data = fixture();
  data.features[0].check_results[0].run_id = "missing";
  assert.ok(validateHarness(data, root).some((error) => error.includes("unknown run")));
  data.features[0].check_results[0].run_id = "run-1";
  data.verification_runs[0].checks[0].result = "failed";
  assert.ok(validateHarness(data, root).some((error) => error.includes("fully passed")));
});
void test("rejects skipped checks as passing evidence", () => {
  const data = fixture();
  data.verification_runs[0].checks[0].result = "not_run";
  assert.ok(validateHarness(data, root).some((error) => error.includes("fully passed")));
});
void test("requires a blocker and next action", () => {
  const data = fixture();
  data.features[0].status = "blocked";
  assert.ok(validateHarness(data, root).some((error) => error.includes("Blocker:")));
  data.features[0].notes = "Blocker: no Docker. Next action: start Docker.";
  data.continuation.blockers = ["No Docker"];
  syncHandoff(data);
  assert.deepEqual(validateHarness(data, root), []);
});
void test("rejects missing files and paths escaping the repository", () => {
  const data = fixture();
  data.features[0].related_files = ["missing.ts", "../outside.md"];
  assert.equal(
    validateHarness(data, root).filter((error) => error.includes("Missing or unsafe")).length,
    2
  );
});
void test("rejects broken documentation links", () => {
  writeFileSync(
    path.join(root, "README.md"),
    "[Missing](missing.md) [External](https://example.com)\n"
  );
  assert.ok(validateHarness(fixture(), root).some((error) => error.includes("missing.md")));
  writeFileSync(path.join(root, "README.md"), "[Verification](docs/verification.md)\n");
  assert.deepEqual(validateHarness(fixture(), root), []);
});
void test("snapshot changes with executable sources but not status documentation or line endings", () => {
  const original = sourceSnapshot(root);
  writeFileSync(path.join(root, "PROGRESS.md"), "New status\n");
  writeFileSync(path.join(root, "feature_list.json"), "{}\n");
  assert.equal(sourceSnapshot(root), original);
  writeFileSync(path.join(root, "app.ts"), "export const value = 1;\r\n");
  const changed = sourceSnapshot(root);
  assert.notEqual(changed, original);
  writeFileSync(path.join(root, "app.ts"), "export const value = 1;\n");
  assert.equal(sourceSnapshot(root), changed);
});

void test("requires results for every acceptance step before passing", () => {
  const data = fixture();
  data.features[0].verification.push("Second behavior");
  assert.ok(
    validateHarness(data, root).some((error) => error.includes("missing acceptance step 2"))
  );
  data.features[0].acceptance_results.push({
    step: 2,
    level: "browser",
    status: "pending",
    summary: "Not checked"
  });
  assert.ok(
    validateHarness(data, root).some((error) => error.includes("acceptance step 2 has not passed"))
  );
});
void test("rejects duplicate and out-of-range acceptance steps", () => {
  const data = fixture();
  data.features[0].acceptance_results.push({ ...data.features[0].acceptance_results[0] });
  assert.ok(
    validateHarness(data, root).some((error) => error.includes("duplicate acceptance step"))
  );
  data.features[0].acceptance_results[1].step = 99;
  assert.ok(validateHarness(data, root).some((error) => error.includes("unknown acceptance step")));
});
void test("acceptance evidence must reference the correct level and successful run", () => {
  const data = fixture();
  data.features[0].acceptance_results[0].level = "browser";
  assert.ok(
    validateHarness(data, root).some((error) => error.includes("no fully passed browser run"))
  );
  data.features[0].acceptance_results[0].run_id = "missing";
  assert.ok(validateHarness(data, root).some((error) => error.includes("unknown acceptance run")));
  data.features[0].acceptance_results[0].level = "local";
  data.features[0].acceptance_results[0].run_id = "run-1";
  data.verification_runs[0].checks[0].result = "not_run";
  assert.ok(
    validateHarness(data, root).some((error) =>
      error.includes("acceptance step 1 has no fully passed")
    )
  );
});
void test("failed acceptance requires failed execution evidence", () => {
  const data = fixture();
  data.features[0].status = "needs_verification";
  data.features[0].acceptance_results[0].status = "failed";
  assert.ok(validateHarness(data, root).some((error) => error.includes("failed acceptance step")));
  data.verification_runs[0].checks[0].result = "failed";
  data.features[0].check_results[0].status = "failed";
  syncHandoff(data);
  assert.deepEqual(validateHarness(data, root), []);
});
void test("unfinished features need a concrete next action", () => {
  const data = fixture();
  data.features[0].status = "needs_verification";
  delete data.features[0].next_action;
  assert.ok(
    validateHarness(data, root).some((error) =>
      error.includes("unfinished feature needs next_action")
    )
  );
});
void test("continuation rejects unknown features, runs and stale dates", () => {
  const data = fixture();
  data.continuation.feature_id = "missing-001";
  data.continuation.run_ids = ["missing-run"];
  data.continuation.updated_at = "2026-10-05T12:00:00-06:00";
  const errors = validateHarness(data, root);
  assert.ok(errors.some((error) => error.includes("unknown feature")));
  assert.ok(errors.some((error) => error.includes("unknown run")));
  assert.ok(errors.some((error) => error.includes("date differs")));
});
void test("continuation must follow the active feature and its next action", () => {
  const data = fixture();
  const active = structuredClone(data.features[0]);
  active.id = "test-002";
  active.status = "in_progress";
  data.features.push(active);
  assert.ok(validateHarness(data, root).some((error) => error.includes("in_progress feature")));
  data.continuation.feature_id = "test-002";
  data.continuation.next_action = "Wrong action";
  assert.ok(validateHarness(data, root).some((error) => error.includes("next_action differs")));
});
void test("detects stale handoff and accepts regeneration including CRLF", () => {
  const data = fixture();
  data.continuation.summary = "New session details";
  assert.ok(validateHarness(data, root).some((error) => error.includes("Stale session-handoff")));
  writeFileSync(
    path.join(root, "session-handoff.md"),
    renderHandoff(data).replaceAll("\n", "\r\n")
  );
  assert.deepEqual(validateHarness(data, root), []);
});
void test("rejects duplicate affected paths", () => {
  const data = fixture();
  data.features[0].related_files.push("README.md");
  assert.ok(validateHarness(data, root).some((error) => error.includes("duplicate related file")));
});
void test("reports verification gaps separately from feature counts and orders unfinished work", () => {
  const data = fixture();
  data.features[0].status = "needs_verification";
  data.features[0].priority = 2;
  data.features[0].required_checks.push("hosted");
  data.features[0].check_results.push({
    level: "hosted",
    status: "pending",
    reason: "No hosted access"
  });
  const active = structuredClone(data.features[0]);
  active.id = "test-002";
  active.priority = 1;
  active.status = "in_progress";
  data.features.push(active);
  data.continuation.feature_id = active.id;
  syncHandoff(data);
  assert.deepEqual(validateHarness(data, root), []);
  const report = progressReport(data);
  assert.ok(report.includes("in_progress: 1 | needs_verification: 1"));
  assert.ok(report.includes("acceptance 1/1; required checks pending/failed: hosted"));
  assert.ok(report.indexOf("- test-002") < report.indexOf("- test-001"));
  assert.ok(report.includes("not percent of product completion"));
});
void test("malformed percent encoding in a documentation link returns a validation error", () => {
  const data = fixture();
  writeFileSync(path.join(root, "README.md"), "[Bad](broken%link.md)\n");
  assert.ok(
    validateHarness(data, root).some((error) => error.includes("Invalid documentation link"))
  );
  writeFileSync(path.join(root, "README.md"), "# Test documentation\n");
});

void test("report CLI fails on stale records while handoff output repairs without writing files", () => {
  const data = fixture();
  data.continuation.summary = "Updated continuation";
  data.continuation.context = [];
  writeFileSync(path.join(root, "feature_list.json"), JSON.stringify(data));
  const script = fileURLToPath(new URL("./validate-harness.mjs", import.meta.url));
  const originalHandoff = readFileSync(path.join(root, "session-handoff.md"), "utf8");
  const report = spawnSync(process.execPath, [script, "--report"], { cwd: root, encoding: "utf8" });
  assert.equal(report.status, 1, report.error?.message);
  assert.ok(report.stderr.includes("Stale session-handoff"));
  const handoff = spawnSync(process.execPath, [script, "--handoff"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(handoff.status, 0, handoff.error?.message);
  assert.equal(handoff.stdout, renderHandoff(data));
  assert.equal(readFileSync(path.join(root, "session-handoff.md"), "utf8"), originalHandoff);
  assert.equal(readFileSync(path.join(root, "feature_list.json"), "utf8"), JSON.stringify(data));
  syncHandoff(data);
  const validReport = spawnSync(process.execPath, [script, "--report"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(validReport.status, 0, validReport.error?.message);
  assert.ok(validReport.stdout.includes("Continuation verification history:"));
  assert.ok(validReport.stdout.includes("npm run test=passed"));
});
