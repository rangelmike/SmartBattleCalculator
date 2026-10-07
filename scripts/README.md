# Maintenance scripts

`validate-harness.mjs` powers `npm run harness:check` and the read-only `npm run harness:snapshot`. It validates `feature_list.json` records and local documentation references without changing feature state or executing application tests. `npm run harness:test` runs its Node regression tests separately from Vitest. See [Verification](../docs/verification.md) for the evidence and handoff protocol.

The schema is version 2: every acceptance step has a result linked to a run, every unfinished feature has a next action, and `continuation` owns the current session's scope, blockers, changed paths and evidence references. `npm run harness:report` validates this state and prints counts, acceptance/verification gaps and the ordered unfinished work. Its counts are not a completion percentage or certification of hosted services.

`npm run --silent harness:handoff` prints `session-handoff.md` from the authoritative records without writing files. Update `feature_list.json`, save the generated UTF-8 text using the example in [Verification](../docs/verification.md), and run `harness:check`. Handoff drift is an error. Regeneration is allowed before consistency validation so a stale handoff can be repaired; it still requires a valid schema. No command commits, pushes, runs application checks, or changes recorded statuses automatically.

`check-functions.mjs` powers `npm run check:functions`: it discovers every `.ts` file under `supabase/functions` and passes explicit paths to Deno, including new functions and shared files. This avoids shell-dependent wildcard expansion and does not run functions. Install the CI-pinned Deno version when making backend changes.

For a temporary package on Windows whose command is only a shell shim, set `DENO_EXECUTABLE` to its actual `deno.exe` path. The checker uses the executable directly without a shell; the default is `deno` from PATH.

`generate-sprite-map.mjs` powers `npm run sprites:refresh`. It reads the Pokemon Showdown animated-sprite directory, resolves Champions species to existing GIF names, and rewrites `src/lib/pokemon/champions-sprites.json`. The app reads that committed map at runtime; it does not query the directory for each render.

This script requires network access to Showdown and is intentionally not part of normal build/test. Run it only for a sprite data update, inspect the generated diff, and run `npm run test -- src/lib/pokemon/team-stats.test.ts` plus `npm run typecheck`. If a species has no verified asset, the generator fails instead of guessing a filename.
