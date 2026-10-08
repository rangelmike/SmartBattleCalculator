# Pokemon mechanics

This module owns reusable battle and set rules. Prefer `@smogon/calc` generation 0 for Champions damage/stats, `@pkmn/sets` for Showdown text, and `@pkmn/dex` for Pokemon data. Do not implement parallel rules in React.

- `showdown-parser.ts` and `team-import.ts` parse/serialize teams and create saved-team hashes. `champions-data.ts` and `champions-learnsets.ts` enforce Champions availability, legal abilities/moves/items/natures, level 50, and 66 total SP/EV points with at most 32 per stat. Validate before saving personal or Popular teams.
- `team-stats.ts` calculates real and base stats and resolves Mega stones/forms. `champions-sprites.json` maps verified Showdown GIF filenames; `npm run sprites:refresh` regenerates it from the external sprite index, so review the resulting diff.
- `damage-calculation.ts` and `hp-effects.ts` calculate rolls, recoil/recovery and KO projections. `damage-observations.ts` estimates opponent spreads from damage; own attacks are recorded in percent, opponent attacks in HP.
- `calculator-session.ts` persists per-user rosters/field/eligible observations in browser storage. `battle-hp.ts` and `battle-boosts.ts` support temporary in-memory HP/stages; these are not durable set data. `individual-set.ts` uses a Popular common set or a deterministic legal fallback.

Tests sit beside these files. Update parser, validation, damage, or estimate tests with behavioral changes and run `npm run typecheck` plus focused Vitest tests before handing off.
