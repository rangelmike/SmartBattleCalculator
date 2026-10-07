# Styles

`globals.css` defines Tailwind layers, semantic color tokens, and global theme styles. React components live under `src/features/*`; they should use the existing semantic tokens and responsive conventions rather than duplicating global rules. Theme selection is managed by `src/lib/theme.ts` and toggled from the signed-in header.

After changes to layout or tokens, inspect both light and dark modes and mobile/desktop widths. Run `npm run build` to catch stylesheet pipeline problems; component tests do not replace visual review.
