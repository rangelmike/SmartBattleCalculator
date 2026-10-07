# Profile and team library

`ProfilePage.tsx` coordinates username editing, import, manual creation, library tabs, filters, and Popular teams pagination. `TeamEditorDialog.tsx` edits Champions-valid sets and member order; `TeamViewer.tsx` displays sets, items, forms, and stats. `FilterAutocomplete.tsx` supports source and multi-Pokemon filtering. Import/build/validation live in `src/lib/pokemon`; Supabase writes live in `src/lib/supabase`.

## Rules

- Own-team saves also appear in the opponent collection. Opponent saves do not appear in My teams. Editing/deleting a shared personal team affects the one underlying `teams` row.
- Save only after Champions validation: 1-6 distinct species, level 50, valid item/ability/moves/nature, and valid EV/IV bounds. Member order is significant and must survive serialization and database writes.
- Popular teams are a separate table and are readable by authenticated users. The UI checks admin capability for edit controls, while database RLS enforces write access. Never replace RLS with an email check in React.
- Personal filters are currently client-side; Popular filters use paginated server RPCs. Avoid loading the entire Popular catalog for one search.

Verify with `npm run test -- src/features/teams src/lib/pokemon/team-import.test.ts src/lib/pokemon/champions-data.test.ts src/lib/supabase/teams.test.ts src/lib/supabase/popular-teams.test.ts` and `npm run typecheck`. A live import also depends on Pokepaste availability.
