# Navigation

`AppShell.tsx` renders the signed-in header, theme toggle, sign-out button, and Calculator/Profile navigation. `src/app/App.tsx` owns the selected page and updates the URL hash.

Keep this layer presentational. It must not fetch teams, change calculator battle state, or authorize Popular teams writes. Verify navigation and accessibility changes with `npm run test -- src/features/navigation/AppShell.test.tsx`.
