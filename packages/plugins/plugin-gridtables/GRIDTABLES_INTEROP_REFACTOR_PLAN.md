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

## Task Breakdown

### 1. Bootstrap Interop Helper
- [ ] Add `interop/` module under `packages/plugins/plugin-gridtables/src/`.
- [ ] Define a `tableInteropCtx` (or similar) that holds DOM transform callbacks.
- [ ] Provide helper to register transforms during plugin setup.
- [ ] Unit test the registration mechanism.

### 2. Wire Clipboard to Interop
- [ ] Update clipboard plugin to read registered transforms (if any) before parsing HTML.
- [ ] Ensure clipboard stays functional when no transforms are registered.
- [ ] Move current header/alignment normalization from clipboard plugin into grid-table interop transform(s).

### 3. Verification
- [ ] Re-run existing grid-table paste specs (update to use new interop setup).
- [ ] Add integration tests to confirm behavior with only GFM, only grid tables, and both.
- [ ] Run `pnpm test:unit`.

### 4. Future Follow-ups (to track separately)
- [ ] Adjust GFM `parseDOM` rules to recognize headers without `data-is-header`.
- [ ] Implement grid-table → GFM promotion at serialization.
- [ ] Ensure table manipulation commands remain consistent across table types.

## Open Questions / Notes
- Determine if the interop helper should be exported for third-party table plugins.
- Confirm no performance regressions by benchmarking paste on large tables (optional).
