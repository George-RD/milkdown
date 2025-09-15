# Grid Tables Plugin — Standards Fixes TODO

This checklist tracks the changes to bring `@milkdown/plugin-gridtables` in line with Milkdown’s plugin standards and the review notes.

## 1) Plugin Export Pattern (Critical)
- [x] Add `GridTablesPlugin` tuple type (typed array) matching block/slash patterns
- [x] Update `src/index.ts` to export `gridTables` as typed tuple
- [x] Attach `gridTables.key = gridTablePluginConfig.key`
- [x] Attach `gridTables.pluginKey = gridTableProseMirrorPlugin.key`
- [x] Keep convenience exports (`gridTableProseMirrorPlugins`, commands, schema, keymap) intact

Guide Alignment: Follows the typed array pattern used in `plugin-block` and `plugin-slash`, exposing `key` (ctx slice) and `pluginKey` (prosemirror key function) for consumers. No deprecated APIs touched; uses `$ctx` and `$prose` contracts per the guide.

Guide References:
- Plugin Architecture Overview: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#plugin-architecture-overview
- Factory Plugins (keys on arrays): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#6-factory-plugins-reusable-plugin-generators
- withMeta Helper (for remark/schema/commands): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#withmeta-helper

## 2) Test Directory Cleanup
- [x] Consolidate to `src/__test__/` (co-located tests)
- [x] Move `src/__tests__/prosemirror-integration.test.ts` → `src/__test__/prosemirror-integration.test.ts`
- [x] Keep other specs in `src/__test__/` and restore setup file there
- [x] Update `vitest.config.ts` to `setupFiles: ['./src/__test__/vitest.setup.ts']`
- [x] Keep `tsconfig.json` excludes for `src/__tests__/**` (and `*.test.ts`) only

Guide Alignment: The repository standard is co‑located tests under `src/__test__` (e.g., preset-commonmark, highlight). The previous suggestion to use a top-level `test/` folder was incorrect for this repo. We aligned with the guide’s “co‑locate *.spec.ts next to source” contract and unified duplicate `__test__/__tests__` dirs accordingly.

Guide References:
- Testing Playbook (layout + per-package config): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#testing-playbook-unit-+-e2e
- TypeScript build excludes (prevent emitting tests into lib/): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#testing-playbook-unit-+-e2e

Acceptance Fixes:
- [x] Update `tsconfig.json` excludes to include: `src/**/*.spec.ts`, `src/**/*.test.ts`, `src/__test__/**`, `src/__tests__/**`.

Guide Alignment Summary: Updated per Testing Playbook to ensure tests are excluded from emit, matching co-located test layout and preventing `lib/` pollution.

## 3) Documentation Enhancement (README)
- [x] Add usage via `@milkdown/kit/plugin/gridtables` and direct package
- [x] Document load order: use `gridTables` before `commonmark`
- [x] Provide command usage examples (insert/exit/set alignment)
- [x] Expand markdown syntax examples: spans (row/col), horizontal alignment (`:---`, `:--:`, `---:`, `>--<`), vertical alignment (`^`, `x`, `v`)
- [x] Add common workflows and tips

Guide References:
- Developer Workflow → Document-as-you-go: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#developer-workflow
- Kit Package (Unified API Access): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#kit-package-unified-api-access
- API Documentation (docs/api + builddocs): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#api-documentation-docsapi-+-builddocs

Follow-ups:
- [x] Create `docs/api/plugin-gridtables.md` with kit-based usage and `@Symbol` placeholders mapping to exports from `src/index.ts`.
- [x] Prefer kit imports in README code samples per the guide.

Guide Alignment Summary: README now follows “Document-as-you-go” and “Kit Package” guidance. Examples prefer `@milkdown/kit/...`, highlight required load order, and showcase primary commands and syntax variants.

## 4) Storybook Integration
- [x] Ensure story exists under `storybook/stories/plugins/` (it does)
- [x] Add an “Interactive” story with buttons wired to commands
- [x] Demonstrate spans, alignment, and rich content with canonical examples
- [x] Verify gridtables loads before commonmark in story setup

Guide Alignment Summary: Stories follow “Storybook Guidance”; interactive controls call commands via `callCommand`, and plugin load order is enforced.

Guide References:
- Storybook Guidance: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#storybook-guidance
- Parsing order matters (`.use(gridTables).use(commonmark)`): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#storybook-guidance

## 5) Minor Code Cleanup
- [ ] Remove unused imports flagged by lint
- [x] Ensure withMeta() on applicable exports (schemas, commands, remark, keymap.ctx, keymap.shortcuts)
- [x] Verify no `any` leaks and TS strict mode passes
- [x] Confirm package entry exports only public APIs (export via `src/index.ts`)

Guide Alignment Summary: Added withMeta to keymap ctx/shortcuts and remark pieces; eliminated `any` in command helpers; ensured public APIs are exported via `src/index.ts` per “Make your exports discoverable”.

Guide References:
- withMeta Helper: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#withmeta-helper
- Debugging and Development Tools (inspector/metadata): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#debugging-and-development-tools
- Make your exports discoverable: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#make-your-exports-discoverable

## 6) Validation
- [ ] Build plugin: `pnpm --filter=@milkdown/plugin-gridtables build`
- [ ] Run unit tests: `pnpm --filter=@milkdown/plugin-gridtables test:unit`
- [ ] Run lint: `pnpm test:lint`
- [ ] Manual Storybook smoke test: `pnpm start` → check Grid Tables stories
- [ ] Build docs to validate API placeholders: `pnpm --filter=@milkdown/docs build`

Guide References:
- Developer Workflow → Before opening a PR: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#developer-workflow
- Testing Playbook (unit + e2e): packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#testing-playbook-unit-+-e2e
- API Documentation → Build and verify: packages/plugins/PLUGIN_DEVELOPMENT_GUIDE.md#build-and-verify

Acceptance Fixes:
- [ ] Update `tsconfig.json` excludes to prevent emitting tests into `lib/` per guide:
  - Exclude: `src/**/*.spec.ts`, `src/**/*.test.ts`, `src/__test__/**`, `src/__tests__/**`.


## Notes
- Only commit scoped changes for this task; avoid bundling unrelated modifications.
- Keep API surface minimal and typed; follow patterns in `plugin-block` and `plugin-slash`.
