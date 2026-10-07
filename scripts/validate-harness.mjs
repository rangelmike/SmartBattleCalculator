import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const levels = z.enum(["local", "browser", "functions", "integration", "hosted"]);
const text = z.string().trim().min(1);
const statuses = ["not_started", "in_progress", "needs_verification", "blocked", "passing"];
const schema = z
  .object({
    schema_version: z.literal(2),
    project: text,
    last_updated: z.iso.date(),
    rules: z
      .object({
        single_active_feature: z.literal(true),
        passing_requires_evidence: z.literal(true),
        do_not_skip_verification: z.literal(true)
      })
      .strict(),
    status_legend: z.record(z.enum(statuses), text),
    continuation: z
      .object({
        feature_id: text,
        updated_at: z.iso.datetime({ offset: true }),
        summary: text,
        next_action: text,
        blockers: z.array(text),
        changed_files: z.array(text).min(1),
        run_ids: z.array(text),
        context: z.array(text)
      })
      .strict(),
    verification_runs: z.array(
      z
        .object({
          id: text,
          recorded_at: z.iso.datetime({ offset: true }),
          revision: z.string().regex(/^[a-f0-9]{40}$/),
          source_snapshot: z.string().regex(/^[a-f0-9]{64}$/),
          worktree: z.array(text),
          environment: text,
          checks: z
            .array(
              z
                .object({
                  level: levels,
                  command: text,
                  result: z.enum(["passed", "failed", "not_run"]),
                  summary: text
                })
                .strict()
            )
            .min(1)
        })
        .strict()
    ),
    features: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z]+-\d{3}$/),
            priority: z.number().int().nonnegative(),
            area: text,
            title: text,
            user_visible_behavior: text,
            status: z.enum(statuses),
            verification: z.array(text).min(1),
            acceptance_results: z
              .array(
                z
                  .object({
                    step: z.number().int().positive(),
                    level: levels,
                    status: z.enum(["pending", "passed", "failed"]),
                    run_id: text.optional(),
                    summary: text
                  })
                  .strict()
              )
              .min(1),
            related_files: z.array(text).min(1),
            required_checks: z.array(levels).min(1),
            check_results: z.array(
              z
                .object({
                  level: levels,
                  status: z.enum(["pending", "passed", "failed"]),
                  run_id: text.optional(),
                  reason: text.optional()
                })
                .strict()
            ),
            evidence: z.array(text),
            notes: text,
            next_action: text.optional()
          })
          .strict()
      )
      .min(1)
  })
  .strict();

const requiredDocuments = [
  "AGENTS.md",
  "README.md",
  "PROGRESS.md",
  "session-handoff.md",
  "docs/verification.md"
];

/** @param {string} root @param {string} file */
function insideRoot(root, file) {
  const relative = path.relative(path.resolve(root), path.resolve(root, file));
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

/** Validate structure and execution references; this never runs checks or changes feature state.
 * @param {unknown} input
 * @param {string} root
 */
export function validateHarness(input, root) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  const data = parsed.data;
  /** @type {string[]} */
  const errors = [];
  /** @param {string} file */
  const checkPath = (file) => {
    if (!insideRoot(root, file) || !existsSync(path.resolve(root, file)))
      errors.push(`Missing or unsafe path: ${file}`);
  };
  requiredDocuments.forEach(checkPath);
  const runIds = new Set();
  for (const run of data.verification_runs) {
    if (runIds.has(run.id)) errors.push(`Duplicate verification run: ${run.id}`);
    runIds.add(run.id);
  }
  const ids = new Set();
  for (const feature of data.features) {
    if (ids.has(feature.id)) errors.push(`Duplicate feature ID: ${feature.id}`);
    ids.add(feature.id);
    feature.related_files.forEach(checkPath);
    if (new Set(feature.related_files).size !== feature.related_files.length)
      errors.push(`${feature.id}: duplicate related file`);
    if (feature.status !== "passing" && !feature.next_action)
      errors.push(`${feature.id}: unfinished feature needs next_action`);
    if (new Set(feature.required_checks).size !== feature.required_checks.length)
      errors.push(`${feature.id}: duplicate required level`);
    if (
      new Set(feature.check_results.map((result) => result.level)).size !==
      feature.check_results.length
    )
      errors.push(`${feature.id}: duplicate check result level`);
    for (const result of feature.check_results) {
      const run = data.verification_runs.find((entry) => entry.id === result.run_id);
      if (result.run_id && !run) errors.push(`${feature.id}: unknown run ${result.run_id}`);
      if (result.status === "pending" && !result.reason)
        errors.push(`${feature.id}: pending ${result.level} needs a reason`);
      if (result.status === "passed") {
        const checks = run?.checks.filter((check) => check.level === result.level) ?? [];
        if (!checks.length || checks.some((check) => check.result !== "passed"))
          errors.push(`${feature.id}: ${result.level} has no fully passed run`);
      }
      if (
        result.status === "failed" &&
        !run?.checks.some((check) => check.level === result.level && check.result === "failed")
      )
        errors.push(`${feature.id}: failed ${result.level} needs a failed run`);
    }
    for (const level of feature.required_checks) {
      const result = feature.check_results.find((entry) => entry.level === level);
      if (!result) errors.push(`${feature.id}: missing required ${level} result`);
      if (feature.status === "passing" && result?.status !== "passed")
        errors.push(`${feature.id}: required ${level} has not passed`);
    }
    if (feature.status === "passing" && !feature.evidence.length)
      errors.push(`${feature.id}: passing requires acceptance evidence`);
    const steps = new Set();
    for (const result of feature.acceptance_results) {
      if (steps.has(result.step))
        errors.push(`${feature.id}: duplicate acceptance step ${result.step}`);
      steps.add(result.step);
      if (result.step > feature.verification.length)
        errors.push(`${feature.id}: unknown acceptance step ${result.step}`);
      const run = data.verification_runs.find((entry) => entry.id === result.run_id);
      if (result.run_id && !run)
        errors.push(`${feature.id}: unknown acceptance run ${result.run_id}`);
      const checks = run?.checks.filter((check) => check.level === result.level) ?? [];
      if (
        result.status === "passed" &&
        (!checks.length || checks.some((check) => check.result !== "passed"))
      )
        errors.push(
          `${feature.id}: acceptance step ${result.step} has no fully passed ${result.level} run`
        );
      if (result.status === "failed" && !checks.some((check) => check.result === "failed"))
        errors.push(`${feature.id}: failed acceptance step ${result.step} needs a failed run`);
      if (feature.status === "passing" && result.status !== "passed")
        errors.push(`${feature.id}: acceptance step ${result.step} has not passed`);
    }
    for (let step = 1; step <= feature.verification.length; step++) {
      if (!steps.has(step)) errors.push(`${feature.id}: missing acceptance step ${step}`);
    }
    if (feature.status === "blocked" && !/blocker:.*next action:/is.test(feature.notes))
      errors.push(`${feature.id}: blocked notes need Blocker: and Next action:`);
  }
  if (data.features.filter((feature) => feature.status === "in_progress").length > 1)
    errors.push("Only one feature may be in_progress");
  const current = data.features.find((feature) => feature.id === data.continuation.feature_id);
  if (!current) errors.push("Continuation references an unknown feature");
  const active = data.features.find((feature) => feature.status === "in_progress");
  if (active && active.id !== current?.id)
    errors.push("Continuation must reference the in_progress feature");
  if (
    current &&
    current.status !== "passing" &&
    current.next_action !== data.continuation.next_action
  )
    errors.push("Continuation next_action differs from the current feature");
  if (current?.status === "blocked" && !data.continuation.blockers.length)
    errors.push("Blocked continuation needs a blocker");
  data.continuation.changed_files.forEach(checkPath);
  if (new Set(data.continuation.changed_files).size !== data.continuation.changed_files.length)
    errors.push("Continuation has duplicate changed files");
  if (new Set(data.continuation.run_ids).size !== data.continuation.run_ids.length)
    errors.push("Continuation has duplicate run references");
  for (const id of data.continuation.run_ids) {
    if (!runIds.has(id)) errors.push(`Continuation references unknown run ${id}`);
  }
  if (data.continuation.updated_at.slice(0, 10) !== data.last_updated)
    errors.push("Continuation date differs from last_updated");
  if (current && existsSync(path.join(root, "session-handoff.md"))) {
    const handoff = readFileSync(path.join(root, "session-handoff.md"), "utf8").replaceAll(
      "\r\n",
      "\n"
    );
    if (handoff !== renderHandoff(data))
      errors.push("Stale session-handoff.md: regenerate with npm run --silent harness:handoff");
  }

  // Verify local Markdown links in maintained documentation, including module READMEs.
  for (const file of repositoryFiles(root).filter((file) => file.endsWith(".md"))) {
    const content = readFileSync(path.resolve(root, file), "utf8");
    for (const match of content.matchAll(/\]\(([^\s)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      try {
        checkPath(path.join(path.dirname(file), decodeURIComponent(target)));
      } catch {
        errors.push(`Invalid documentation link in ${file}: ${target}`);
      }
    }
  }
  return errors;
}

/** @param {z.infer<typeof schema>} data */
export function renderHandoff(data) {
  const session = data.continuation;
  const feature = data.features.find((entry) => entry.id === session.feature_id);
  return [
    "# Session handoff",
    "",
    `Updated: ${session.updated_at}. Generated from [feature_list.json](feature_list.json); preserve execution history there.`,
    "",
    "## Current task",
    "",
    `- Feature: \`${session.feature_id}\` — ${feature?.title ?? "Unknown feature"}.`,
    `- State: \`${feature?.status ?? "unknown"}\`.`,
    `- Summary: ${session.summary}`,
    "",
    "## Changes and verification",
    "",
    ...session.changed_files.map((file) => `- [${file}](${file})`),
    "",
    `Run IDs: ${session.run_ids.length ? session.run_ids.map((id) => `\`${id}\``).join(", ") : "None recorded; required verification is pending."}`,
    "",
    "## Remaining work and next action",
    "",
    `Next action: ${session.next_action}`,
    "",
    `Blockers: ${session.blockers.length ? session.blockers.join("; ") : "None recorded."}`,
    "",
    ...session.context.map((entry) => `- ${entry}`),
    ""
  ].join("\n");
}

/** Read-only summary of recorded scope; counts do not measure effort or certify live services.
 * @param {z.infer<typeof schema>} data
 */
export function progressReport(data) {
  const counts = statuses.map(
    (status) => `${status}: ${data.features.filter((feature) => feature.status === status).length}`
  );
  const current = data.features.find((feature) => feature.id === data.continuation.feature_id);
  const lines = [
    `${data.project} — recorded progress (${data.last_updated})`,
    counts.join(" | "),
    `Continuation: ${current?.id} (${current?.status}) — ${data.continuation.summary}`,
    `Next action: ${data.continuation.next_action}`,
    `Blockers: ${data.continuation.blockers.join("; ") || "None recorded."}`,
    "Continuation verification history:"
  ];
  for (const id of data.continuation.run_ids) {
    const run = data.verification_runs.find((entry) => entry.id === id);
    if (run)
      lines.push(
        `- ${run.id} (${run.recorded_at}, source ${run.source_snapshot}): ${run.checks.map((check) => `${check.command}=${check.result}`).join("; ")}`
      );
  }
  if (!data.continuation.run_ids.length)
    lines.push("- No execution runs recorded for this session.");
  lines.push("Unfinished features (priority order; continuation takes precedence):");
  for (const feature of [...data.features]
    .filter((entry) => entry.status !== "passing")
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))) {
    const pending = feature.required_checks.filter(
      (level) => feature.check_results.find((entry) => entry.level === level)?.status !== "passed"
    );
    const accepted = feature.acceptance_results.filter((entry) => entry.status === "passed").length;
    lines.push(
      `- ${feature.id} [${feature.status}] ${feature.title}: acceptance ${accepted}/${feature.verification.length}; required checks pending/failed: ${pending.join(", ") || "none"}. Next: ${feature.next_action}`
    );
  }
  lines.push(
    "Counts describe recorded features, not percent of product completion. Historical runs do not certify the current checkout or hosted configuration."
  );
  return lines.join("\n");
}

/** @param {string} root */
function repositoryFiles(root) {
  /** @type {string[]} */
  const files = [];
  /** @param {string} directory */
  const visit = (directory) => {
    if (!existsSync(path.resolve(root, directory))) return;
    for (const entry of readdirSync(path.resolve(root, directory), { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (![".temp", ".branches", "node_modules"].includes(entry.name)) visit(file);
      } else if (entry.isFile()) files.push(file.replaceAll(path.sep, "/"));
    }
  };
  for (const directory of ["src", "e2e", "scripts", "supabase", "docs", ".github/workflows"])
    visit(directory);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && !entry.name.startsWith(".env")) files.push(entry.name);
  }
  return files.sort();
}

/** Read-only identifier for executable sources/config, excluding self-referential status records.
 * @param {string} root
 */
export function sourceSnapshot(root) {
  const hash = createHash("sha256");
  for (const file of repositoryFiles(root).filter(
    (file) =>
      /\.(?:tsx?|m?js|json|sql|toml|ya?ml|css|html)$/.test(file) && file !== "feature_list.json"
  )) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(path.resolve(root, file), "utf8").replaceAll("\r\n", "\n"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  if (process.argv.includes("--snapshot")) {
    console.log(
      JSON.stringify(
        {
          revision: execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: root,
            encoding: "utf8"
          }).trim(),
          source_snapshot: sourceSnapshot(root),
          worktree: execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" })
            .trimEnd()
            .split(/\r?\n/)
            .filter(Boolean)
        },
        null,
        2
      )
    );
  } else {
    /** @type {unknown} */
    const input = JSON.parse(readFileSync(path.join(root, "feature_list.json"), "utf8"));
    // Rendering precedes consistency validation so a stale handoff can be repaired.
    if (process.argv.includes("--handoff")) {
      process.stdout.write(renderHandoff(schema.parse(input)));
    } else {
      const errors = validateHarness(input, root);
      if (errors.length) {
        console.error(errors.join("\n"));
        process.exitCode = 1;
      } else if (process.argv.includes("--report"))
        console.log(progressReport(schema.parse(input)));
      else console.log("Harness records and documentation references are valid.");
    }
  }
}
