# Repository Guidelines

## Project Structure & Module Organization

- Monorepo managed by pnpm. Key paths:
  - `packages/*` core libraries (`core`, `ctx`, `utils`, `prose`, etc.).
  - `packages/plugins/*` first‑party plugins and presets.
  - `packages/integrations/*` framework adapters (`react`, `vue`).
  - `storybook/` live examples; `e2e/` Playwright app + tests; `docs/`, `dev/`, `assets/`.
- Place new code in the appropriate package; keep APIs small and typed. Co‑locate unit tests with sources.

## Build, Test, and Development Commands

- Setup: `corepack enable && nvm use && pnpm install` (Node 22.x).
- Build all: `pnpm build` (TypeScript build + per‑package build).
- Storybook: `pnpm start` (serves `@milkdown/storybook` on 6006).
- Unit tests: `pnpm test:unit` (Vitest). All checks: `pnpm test` (lint + unit).
- E2E: `pnpm test:e2e` (Playwright). First run: `pnpm --filter=@milkdown/e2e run test:install`.
- Lint/format: `pnpm test:lint` (Oxlint), `pnpm fix` (Prettier), `pnpm format` (lint‑staged for staged files).
- Clean: `pnpm clear`. Codegen: `pnpm codegen` (updates TS project refs).

## Coding Style & Naming Conventions

- TypeScript, 2‑space indent, LF, final newline. Prettier: `semi: false`, `singleQuote: true`, `trailingComma: es5`.
- ESLint (`eslint.config.mjs`) with `typescript-eslint` and `perfectionist` (sorted imports). Oxlint enforces additional rules.
- Filenames: kebab‑case (unicorn/filename-case). Prefer type‑only imports; avoid unused promises.
- Public APIs: export from the package entry; avoid cross‑package imports that bypass published entry points.

## Testing Guidelines

- Unit: Vitest with co‑located `*.spec.ts` next to source. Use jsdom when DOM is needed.
- E2E: Playwright tests live in `e2e/tests`. Prefer role/text selectors; avoid brittle CSS.
- Add/modify tests with features; keep tests fast and deterministic.

## Commit & Pull Request Guidelines

- Conventional Commits enforced by commitlint. Use `pnpm commit` (commitizen) to compose messages.
- Hooks: `pre-commit` runs `pnpm format`; `commit-msg` validates messages.
- PRs: include a clear description, linked issues, test updates, and docs/story updates when UI changes.
- Versions/changes: run `pnpm changeset` for user‑facing changes; CI runs `changeset version/publish`.

## Security & Environment

- Do not commit secrets or `lib` artifacts. Keep Node at `22.19.0` per `.nvmrc`. Use pnpm only.
- See `packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md` for plugin specifics.
