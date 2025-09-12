# Grid Tables Plugin — Standards Fixes TODO

This checklist tracks the changes to bring `@milkdown/plugin-gridtables` in line with Milkdown’s plugin standards and the review notes.

## 1) Plugin Export Pattern (Critical)
- [x] Add `GridTablesPlugin` tuple type (typed array) matching block/slash patterns
- [x] Update `src/index.ts` to export `gridTables` as typed tuple
- [x] Attach `gridTables.key = gridTablePluginConfig.key`
- [x] Attach `gridTables.pluginKey = gridTableProseMirrorPlugin.key`
- [x] Keep convenience exports (`gridTableProseMirrorPlugins`, commands, schema, keymap) intact

Guide Alignment: Follows the typed array pattern used in `plugin-block` and `plugin-slash`, exposing `key` (ctx slice) and `pluginKey` (prosemirror key function) for consumers. No deprecated APIs touched; uses `$ctx` and `$prose` contracts per the guide.

## 2) Test Directory Cleanup
- [ ] Create single `test/` directory in package root
- [ ] Move `src/__test__/*` → `test/*`
- [ ] Move `src/__tests__/prosemirror-integration.test.ts` → `test/prosemirror-integration.test.ts`
- [ ] Update `vitest.config.ts` to `setupFiles: ['./test/vitest.setup.ts']`
- [ ] Update `tsconfig.json` excludes to include `"test/**"`

## 3) Documentation Enhancement (README)
- [ ] Add usage via `@milkdown/kit/plugin/gridtables` and direct package
- [ ] Document load order: use `gridTables` before `commonmark`
- [ ] Provide command usage examples (insert/exit/set alignment)
- [ ] Expand markdown syntax examples: spans (row/col), horizontal alignment (`:---`, `:--:`, `---:`, `>--<`), vertical alignment (`^`, `x`, `v`)
- [ ] Add common workflows and tips

## 4) Storybook Integration
- [ ] Ensure story exists under `storybook/stories/plugins/` (it does)
- [ ] Add an “Interactive” story with buttons wired to commands
- [ ] Demonstrate spans, alignment, and rich content with canonical examples
- [ ] Verify gridtables loads before commonmark in story setup

## 5) Minor Code Cleanup
- [ ] Remove unused imports flagged by lint
- [ ] Ensure withMeta() on applicable exports (skip composite keymaps by design)
- [ ] Verify no `any` leaks and TS strict mode passes
- [ ] Confirm package entry exports only public APIs

## 6) Validation
- [ ] Build plugin: `pnpm --filter=@milkdown/plugin-gridtables build`
- [ ] Run unit tests: `pnpm --filter=@milkdown/plugin-gridtables test:unit`
- [ ] Run lint: `pnpm test:lint`
- [ ] Manual Storybook smoke test: `pnpm start` → check Grid Tables stories

## Notes
- Only commit scoped changes for this task; avoid bundling unrelated modifications.
- Keep API surface minimal and typed; follow patterns in `plugin-block` and `plugin-slash`.
