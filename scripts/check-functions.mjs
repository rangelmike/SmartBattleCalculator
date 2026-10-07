import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const directory = "supabase/functions";
const files = readdirSync(directory, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
  .map((entry) => path.join(entry.parentPath, entry.name))
  .sort();
if (!files.length) throw new Error("No Edge Function TypeScript files found.");
const result = spawnSync(process.env.DENO_EXECUTABLE ?? "deno", ["check", "--no-lock", ...files], {
  stdio: "inherit"
});
if (result.error)
  console.error(
    `Could not run Deno: ${result.error.message}. Install the CI-pinned Deno version; see docs/verification.md.`
  );
process.exitCode = result.status ?? 1;
