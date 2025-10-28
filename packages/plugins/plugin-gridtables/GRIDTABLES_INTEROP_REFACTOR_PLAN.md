# Grid Tables Clipboard/Interop Refactor

## Goal
Maintain modularity of the shared clipboard plugin by moving grid table–specific paste handling into a composable interop layer, while preparing for future upgrades that promote simple grid tables to GFM output.

## Branch
- Base: `feat/gridtable-plugin`
- New branch to create: `feat/gridtable-interop-refactor`

## Deliverables
1. Create a grid-table interop helper that exposes registration hooks via context.
2. Migrate existing clipboard DOM adjustments into interop-registered transforms.
3. Remove hard-coded table logic from the clipboard plugin and consume registered transforms instead.
4. Add regression coverage for paste flows (grid only, GFM only, combined).
5. Leave follow-on tasks ready for schema tweaks and serialization promotion.

### Current Scaffolding Status (2024-XX-XX)
- [x] Branch `feat/gridtable-interop-refactor` created from `feat/gridtable-plugin`.
- [x] Initial interop directory scaffolded at `packages/plugins/plugin-gridtables/src/interop/` with placeholder context helpers.
- [x] Source tree reorganized into domain-specific folders (commands, schema, remark, etc.) with `AGENTS.md` breadcrumbs for future contributors.
- [x] Clipboard integration and transform migration implemented.
- [x] Serializer interop wrapper scaffolded (promotion heuristics still outstanding).

## Task Breakdown

### 1. Bootstrap Interop Helper
- [x] Add `interop/` module under `packages/plugins/plugin-gridtables/src/`.
- [x] Define a `tableInteropCtx` (or similar) that holds DOM transform callbacks.
- [x] Provide helper to register transforms during plugin setup.
- [x] Unit test the registration mechanism (`interop.spec.ts`).

### 2. Wire Clipboard to Interop
- [x] Update clipboard plugin to read registered transforms (if any) before parsing HTML.
- [x] Ensure clipboard stays functional when no transforms are registered.
- [x] Move current header/alignment normalization from clipboard plugin into grid-table interop transform(s).
- [x] Replace `GRID_TABLE_DOM_TRANSFORM_SLICE` with a clipboard-owned transform slice so the clipboard package has no grid-table-specific knowledge (expose registration helper from clipboard plugin, or accept key injection via config).

### 3. Serializer Interop
- [x] Add serializer transform context and plugin wrapper.
- [ ] Implement promotion heuristics that convert eligible grid tables to GFM output.

### 3. Verification
- [x] Re-run existing grid-table paste specs (update to use new interop setup).
- [ ] Add integration tests to confirm behavior with only GFM, only grid tables, and both.
- [x] Run `pnpm test:unit`.

### 4. Future Follow-ups (to track separately)
- [ ] Adjust GFM `parseDOM` rules to recognize headers without `data-is-header`.
- [ ] Implement grid-table → GFM promotion at serialization.
- [ ] Ensure table manipulation commands remain consistent across table types.

## Implementation Notes & Guidance

### Status Log (2025-10-27)
- Clipboard regression captured at `packages/plugins/plugin-gridtables/src/__test__/paste-verification.spec.ts` using the sanitized HTML emitted when copying the Storybook “Complex Grid Table” sample (ASCII `<p>` + `<table>`).
- `gridTableClipboardDomTransform` now promotes tables when an adjacent ASCII grid block is detected, ensuring GFM never receives the ragged table fallback.

- **Interop context lifecycle**
  - `registerClipboardDomTransform` now lives in `@milkdown/plugin-clipboard`; grid tables re-export it via `registerGridTableDomTransform`.
  - `gridTableClipboardInterop` registers the default DOM transform via the shared helper so the clipboard plugin no longer contains grid-table-specific branching.
  - The clipboard plugin pulls every transform stored in `clipboardDomTransformsCtx` and executes them in registration order before parsing HTML.
  - Tables pasted with merged cells (`rowspan`/`colspan`), vertical alignment, or ragged rows now automatically upgrade to grid tables even when GFM is present, preventing remark-gfm from receiving unsupported row structures.
  - Additional transforms should be appended rather than replacing the default; disposable callbacks are returned for test suites.

- **Serializer promotion hook (pending)**
  - `gridTableSerializeTransformsCtx` and `gridTableSerializerInterop` now wrap the serializer; register promotion transforms through this hook.
  - Promotion logic should live in a dedicated module under `src/interop/serializers/` (to be created) and operate on ProseMirror nodes before remark serialization.
  - Prioritise detection of rectangular tables with uniform cell spans; fall back to grid tables when promotion fails. Record detection heuristics directly in this plan once finalised.

- **GFM header parsing follow-up**
  - Modify `packages/plugins/preset-gfm/src/remark/table.ts` (or the relevant DOM parser module) so `<th>` tags imply header rows without needing `data-is-header`.
  - After updating the parser, remove the redundant annotation step from the grid-table transform and confirm paste flows still pass.

- **Testing strategy**
  - Unit: keep `interop/index.spec.ts` focused on registration mechanics; add serializer-specific specs alongside new modules.
  - Integration: create Vitest-driven clipboard specs under `packages/plugins/plugin-gridtables/src/__tests__/` covering (1) grid-only, (2) GFM-only, and (3) combined plugin orders mirroring the Storybook scenarios.
  - Storybook: `storybook/stories/plugins/grid-tables.stories.tsx` now reflects five plugin-order permutations for manual verification; keep them updated when adding new behaviour.

- **Documentation & breadcrumbs**
  - Update the relevant `AGENTS.md` files whenever new interop slices or transforms are introduced so downstream contributors have short pathfinding notes.
  - Capture any heuristics or edge cases spotted during testing in this plan to avoid regression hunts later.

## Open Questions / Notes
- Determine if the interop helper should be exported for third-party table plugins.
- Confirm no performance regressions by benchmarking paste on large tables (optional).
