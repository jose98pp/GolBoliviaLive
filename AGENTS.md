# AGENTS.md

## Project

- Node.js package.
- Built with: Vite, React, Tailwind CSS, esbuild, Express.
- Language: TypeScript.

## Package manager

- Use `bun` for this workspace. The lockfile is `bun.lock`.
- Run package scripts with `bun <script>`.

## Commands

```bash
bun lint             # run linter
bun test             # run tests
```

No linter, formatter, test runner is configured.

## Architecture

- Project: react-example.
- Uses Vite for dev server and bundling.

## Source entry points

- `src/App.tsx` (1443 lines).
- `index.html` (114 lines) — Vite-powered, ES module script, loads scripts.

## Runtime assets and packaging

- `dist/` is ignored, so build before launching, testing, or packaging.
- TypeScript uses module `ESNext`, target `ES2022`.

## Testing and launch

- Test with `bun test` (tsx scripts/test-player-frontend.ts).

## Related instruction files

- Also check `DESIGN.md` when the task touches matching tooling or design behavior.

## Key Conventions

- Components use JSX/TSX; prefer functional components.

## Comment style

- Never place comments on the first two lines of a source file; start with imports or declarations.
- Prefer concise section headings such as `// ── Constants ──` or a three-line banner for major sections so files remain easy to scan.
- Use JSDoc blocks only when an API, intent, edge case, or constraint needs explanation; do not restate the code.

## Caveats

- No formatter detected — no Prettier config or format script.

## Boundaries

- Prefer existing local patterns and helper APIs before adding new abstractions.
- Keep generated, packaged, and runtime asset boundaries intact; do not move files across host/webview ownership without updating build and packaging config.
