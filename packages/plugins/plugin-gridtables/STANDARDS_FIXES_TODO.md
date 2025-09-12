# Grid Tables Plugin — Standards Fixes TODO

This checklist tracks the changes to bring `@milkdown/plugin-gridtables` in line with Milkdown’s plugin standards and the review notes.

## 1) Plugin Export Pattern (Critical)
- [ ] Add `GridTablesPlugin` tuple type (typed array) matching block/slash patterns
- [ ] Update `src/index.ts` to export `gridTables` as typed tuple
- [ ] Attach `gridTables.key = gridTablePluginConfig.key`
- [ ] Attach `gridTables.pluginKey = gridTableProseMirrorPlugin.key`
- [ ] Keep convenience exports (`gridTableProseMirrorPlugins`, commands, schema, keymap) intact

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

