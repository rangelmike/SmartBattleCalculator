# UI ownership

`src/app/App.tsx` gates the app on a Supabase session and chooses a page from the URL hash. Keep user-visible components and transient UI state here; call Pokemon rules and Supabase adapters from `src/lib`, rather than duplicating them in React.

- `auth/AuthPage.tsx`: Google-only visible sign-in and recoverable redirect errors. OAuth/session logic is in `src/lib/supabase/auth.ts`.
- `navigation/AppShell.tsx`: calculator/profile navigation, theme toggle, and sign-out.
- `teams/ProfilePage.tsx`: username, personal/Popular libraries, import and search. `TeamEditorDialog.tsx` edits legal sets and order; `TeamViewer.tsx` displays sets, base/level-50 stats, items, and forms. Personal saves to My teams also appear under Opponents; Popular write controls are UI affordances, not authorization.
- `calculator/CalculatorWorkspace.tsx`: battle rosters, selected Pokemon, field, observations, and in-memory HP/stages. `CalculatorTeamPicker.tsx` loads own/opponent/Popular teams or species; `DamageOverview.tsx` shows damage and estimates; `CalculatorPanelCarousel.tsx` handles mobile lateral navigation.

Tests sit beside components as `*.test.tsx`. For changes across saved teams, calculator state, or Auth, check the corresponding `src/lib` tests too. A visual or OAuth flow still needs browser/integration verification beyond mocked component tests.
