import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { z } from "zod";

const mode = process.argv[2];
if (process.argv.length > 3 || (mode && !["--full", "--backend"].includes(mode))) {
  throw new Error("Usage: npm run verify[:full|:backend]");
}

// This project/port range belongs only to verification, never the developer's stack.
const workdir = resolve(".supabase/verification");
// Keep shell arguments constant and space-free on Windows; filesystem paths stay absolute.
const cliArgs = ["--workdir", ".supabase/verification"];
const frontendEnv = {
  ...process.env,
  GITHUB_PAGES: "",
  VITE_SUPABASE_URL: "",
  VITE_SUPABASE_ANON_KEY: "",
  SBC_VERIFY_FULL: mode === "--full" ? "1" : "0"
};
let backendStarted = false;
let failed = false;

/** @param {string} command @param {string[]} args @param {NodeJS.ProcessEnv} env */
function run(command, args, env = process.env, capture = false) {
  const windowsCli = process.platform === "win32" && command === "supabase";
  if (windowsCli && args.some((argument) => !/^[\w./,:-]+$/.test(argument))) {
    throw new Error("Supabase verification arguments must be constant, shell-safe values.");
  }
  const result = spawnSync(
    windowsCli ? "cmd.exe" : command,
    windowsCli ? ["/d", "/s", "/c", `supabase ${args.join(" ")}`] : args,
    {
      env,
      stdio: capture ? "pipe" : "inherit",
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 600_000
    }
  );
  if (result.error || result.status !== 0) {
    // Status output contains credentials; never print its stdout on failure.
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.error?.message ?? result.status}).`
    );
  }
  return result.stdout ?? "";
}

/** @param {string} script */
function npm(script) {
  console.log(`\nChecking: ${script}`);
  if (!process.env.npm_execpath) throw new Error("Run verification through npm.");
  run(process.execPath, [process.env.npm_execpath, "run", script], frontendEnv);
}

try {
  if (mode !== "--backend") {
    for (const script of ["typecheck", "lint", "test"]) npm(script);
  }
  if (mode) {
    mkdirSync(resolve(workdir, "supabase"), { recursive: true });
    const config = readFileSync("supabase/config.toml", "utf8")
      .replace(
        'project_id = "smart-battle-calculator"',
        'project_id = "smart-battle-calculator-verification"'
      )
      .replace("port = 54321", "port = 55421")
      .replace("port = 54322", "port = 55422")
      .replace("port = 54323", "port = 55423")
      .replaceAll("5173", "4173");
    if (!config.includes('project_id = "smart-battle-calculator-verification"')) {
      throw new Error("Verification project isolation failed; review supabase/config.toml.");
    }
    writeFileSync(resolve(workdir, "supabase/config.toml"), config);
    for (const directory of ["migrations", "tests"]) {
      const target = resolve(workdir, "supabase", directory);
      if (!target.startsWith(`${workdir}${sep}`))
        throw new Error("Unsafe verification copy target.");
      rmSync(target, { recursive: true, force: true });
      cpSync(`supabase/${directory}`, target, { recursive: true });
    }
    console.log("\nStarting disposable verification Supabase (ports 55421–55423).");
    backendStarted = true;
    run(
      "supabase",
      [
        ...cliArgs,
        "start",
        "--exclude",
        "studio,imgproxy,mailpit,logflare,vector,supavisor,edge-runtime,realtime,storage-api,postgres-meta"
      ],
      process.env,
      true
    );
    run("supabase", [...cliArgs, "db", "reset", "--local"]);
    run("supabase", [...cliArgs, "test", "db", "--local"]);
    if (mode === "--full") {
      const status = z
        .object({
          API_URL: z.literal("http://127.0.0.1:55421"),
          ANON_KEY: z.string().min(1),
          SERVICE_ROLE_KEY: z.string().min(1)
        })
        .parse(
          JSON.parse(run("supabase", [...cliArgs, "status", "-o", "json"], process.env, true))
        );
      Object.assign(frontendEnv, {
        VITE_SUPABASE_URL: status.API_URL,
        VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
        SBC_TEST_SUPABASE_URL: status.API_URL,
        SBC_TEST_SUPABASE_ANON_KEY: status.ANON_KEY,
        SBC_TEST_SUPABASE_SERVICE_KEY: status.SERVICE_ROLE_KEY
      });
    }
  }
  if (mode !== "--backend") {
    npm("build");
    npm("test:e2e");
  }
  console.log(
    mode === "--backend"
      ? "Backend checks passed; this is not a full acceptance check."
      : "Local verification passed. Hosted Google OAuth and deployment still require the external check."
  );
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "Stop, investigate, and record cause/rerun evidence in docs/verification-failures.md."
  );
} finally {
  if (backendStarted) {
    try {
      run("supabase", [...cliArgs, "stop", "--no-backup"]);
    } catch (error) {
      failed = true;
      console.error(error instanceof Error ? error.message : error);
    }
  }
}
process.exitCode = failed ? 1 : 0;
