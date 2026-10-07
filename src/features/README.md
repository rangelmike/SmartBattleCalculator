# UI features

These folders own user-visible React workflows. The app shell mounts one page at a time; feature components call domain helpers in `src/lib/pokemon` and browser persistence wrappers in `src/lib/supabase`.

| Module | Owns |
| --- | --- |
| [auth](auth/README.md) | Google sign-in screen and feature overview |
| [navigation](navigation/README.md) | Header, page links, theme button, sign-out |
| [teams](teams/README.md) | Profile/team library, import/editor/viewer and filter UI |
| [calculator](calculator/README.md) | Damage workspace, picker, battle controls/results and responsive panels |

Keep user-facing components and state here, but keep reusable Pokemon rules and Supabase access in their respective `src/lib` modules. Place focused component tests beside the affected component (`*.test.tsx`).
