# Grid Table Block Implementation Plan

This checklist tracks the work to add a unified table manipulation component that supports both GFM tables and grid tables.

---

## Phase 1: Audit & Preparation

- [x] **1.1** Review existing `table-block` component structure
  - `packages/components/src/table-block/view/component.tsx` – Vue component rendering UI
  - `packages/components/src/table-block/view/operation.ts` – command wiring (GFM-specific)
  - `packages/components/src/table-block/view/view.ts` – NodeView factory
  - `packages/components/src/table-block/config.ts` – config slice (`renderButton`)
- [x] **1.2** Review grid-tables plugin commands and schema
  - `packages/plugins/plugin-gridtables/src/schema/index.ts`
  - `packages/plugins/plugin-gridtables/src/commands/index.ts`
- [x] **1.3** Identify shared vs. schema-specific logic in table-block
  - **Shared (schema-agnostic):** pointer handlers, drag preview rendering, DOM position calculations, UI structure
  - **Schema-specific:** commands in `useOperation` (GFM), cell type names in `findPointerIndex` (`table_cell`/`table_header` vs `gridTableCell`), drag handlers calling GFM move commands

---

## Phase 2: Extract Schema-Agnostic Infrastructure

- [x] **2.1** Define `TableCommandBridge` interface
  - Created `packages/components/src/table-block/types.ts` with:
    - `TableCommandBridge` interface
    - `TableFeatureFlags` interface
    - Default flags for GFM and Grid tables
- [x] **2.2** Refactor `useOperation` to accept a `TableCommandBridge` instead of hardcoded GFM commands
  - Updated `packages/components/src/table-block/view/operation.ts`
- [x] **2.3** Create `createGfmCommandBridge(ctx, getPos)` returning the bridge for GFM tables
  - Created `packages/components/src/table-block/bridges/gfm-bridge.ts`
- [x] **2.4** Ensure existing `tableBlock` plugin works identically after refactor (no regressions)
  - Build passes, exports updated in `index.ts`

---

## Phase 3: Implement Grid Table Command Bridge

- [x] **3.1** Create `createGridCommandBridge(ctx, getPos)` mapping grid-table commands to the bridge interface
  - Created `packages/components/src/grid-table-block/bridges/grid-bridge.ts`
- [x] **3.2** Implement optional bridge methods (`setVAlign`, `mergeCellRight`, `splitCell`)
  - All methods implemented in the bridge
- [x] **3.3** Add missing commands to plugin-gridtables
  - Added `selectGridRowCommand`, `selectGridColCommand`, `moveGridRowCommand`, `moveGridColCommand`
- [ ] **3.4** Unit test the bridge against grid-table schema

---

## Phase 4: Build `gridTableBlock` Component

- [x] **4.1** Scaffold `packages/components/src/grid-table-block/` directory
  - `index.ts`, `config.ts`, `view/` subdirectory, `bridges/` subdirectory
- [x] **4.2** Create `gridTableBlockConfig` slice with extended `RenderType` for new buttons
  - Added `'merge_cell'`, `'split_cell'`, `'align_col_top'`, `'align_col_middle'`, `'align_col_bottom'`
- [x] **4.3** Create `GridTableBlock` Vue component extending base UI with additional controls
  - Created `packages/components/src/grid-table-block/view/component.tsx`
- [x] **4.4** Create `gridTableBlockView` node view binding to `gridTableSchema.node`
  - Created `packages/components/src/grid-table-block/view/view.ts`
- [x] **4.5** Export `gridTableBlock` plugin array from component package
  - Updated `package.json` exports and added dependency on `@milkdown/plugin-gridtables`

---

## Phase 5: Dual-Mode / Auto-Detection (Optional)

- [ ] **5.1** Provide helper `enhancedTableBlock({ mode: 'auto' | 'gfm' | 'grid' })`
- [ ] **5.2** When `mode: 'auto'`, detect which schemas are registered and pick appropriate view
- [ ] **5.3** Document usage in README / docs

---

## Phase 6: Styling & Theming

- [ ] **6.1** Ensure new component uses same CSS class conventions (`milkdown-table-block`, `handle`, `button-group`, etc.)
- [ ] **6.2** Add CSS variables / theme tokens for new buttons
- [ ] **6.3** Update `theme-nord` or provide example styles

---

## Phase 7: Testing

- [ ] **7.1** Add unit tests for `TableCommandBridge` implementations
- [ ] **7.2** Add E2E tests under `e2e/tests/` for grid-table manipulation (add/delete row/col, merge, split)
- [ ] **7.3** Verify GFM-only setup still works with refactored `tableBlock`

---

## Phase 8: Documentation

- [ ] **8.1** Update `docs/api/component-table-block.md` noting the refactor
- [ ] **8.2** Create `docs/api/component-grid-table-block.md`
- [ ] **8.3** Add cross-links from `docs/api/plugin-gridtables.md`
- [ ] **8.4** Add Storybook stories demonstrating both modes

---

## Notes

- The component operates at the ProseMirror level; serialization to GFM vs grid-table markdown is handled by the respective plugins and their interop/promotion logic.
- Feature flags in config control which buttons appear, allowing the same base component to adapt to available capabilities.

