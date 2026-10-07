# Calculator UI

`CalculatorWorkspace.tsx` coordinates rosters, selected Pokemon, field, damage observations, and local battle state. `CalculatorTeamPicker.tsx` loads personal or Popular teams and can add individual species. `CalculatorTeamPanel.tsx` edits a selected set; `DamageOverview.tsx` displays move damage and opponent estimates; `CalculatorFieldPanel.tsx` edits conditions. `CalculatorPanelCarousel.tsx` makes lower panels swipeable below the `xl` breakpoint.

## State and contracts

- Team rosters and field/observations persist per user through `calculator-session.ts` in browser `localStorage`. Stages, current HP, and captured reset baselines live only in `CalculatorWorkspace` memory.
- Record own damage to the opponent in percent; record opponent damage to My Team in HP. Do not silently swap these units in UI or estimation code.
- Form changes must update sprite, types/stats, and ability used for damage. Active mega forms are derived from the held mega stone; saved sets remain base-form data.
- New battle keeps My Team and clears opponent, field, observations, temporary stages/HP. Reset stats restores the selected Pokemon's captured EV/IV/nature baseline and clears its temporary stage/HP changes.
- Keep domain calculations in `src/lib/pokemon`; do not duplicate formulae in React. Keep Supabase access behind `src/lib/supabase`.

Verify with `npm run test -- src/features/calculator src/lib/pokemon/damage-calculation.test.ts src/lib/pokemon/calculator-session.test.ts src/lib/pokemon/damage-observations.test.ts` and `npm run typecheck`. Also inspect desktop and mobile behavior after layout changes.
