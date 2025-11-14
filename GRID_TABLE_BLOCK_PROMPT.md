# Grid Table Block Component - Implementation Prompt

## Context

We have a working `@milkdown/plugin-gridtables` plugin that provides:
- Grid table schema (different from GFM tables)
- Full set of commands for table manipulation
- Support for cell spanning, alignment, and table sections (thead/tbody/tfoot)

All commands have been tested and verified working via an interactive Storybook story at `storybook/stories/plugins/gridtables.stories.ts` (CommandTesting story).

## Goal

Create a new `grid-table-block` component in `packages/components/src/grid-table-block/` that provides a UI manipulation interface for grid tables, similar to how `table-block` provides UI for GFM tables.

## Reference Implementation

Study the existing `table-block` component at `packages/components/src/table-block/` as a reference pattern:
- `view/view.ts` - NodeView implementation using Vue
- `view/component.tsx` - Vue component with drag handles and buttons
- `view/operation.ts` - Operations that call GFM table commands
- `view/drag.ts` - Drag and drop handlers
- `view/pointer.ts` - Pointer event handlers
- `config.ts` - Configuration with renderButton function

## Key Differences from table-block

1. **Schema**: Use `gridTableSchema` from `@milkdown/kit/plugin/gridtables` instead of `tableSchema` from `@milkdown/preset-gfm`
2. **Commands**: Use grid table commands instead of GFM commands:
   - `addGridRowAfterCommand` / `addGridRowBeforeCommand` / `deleteGridRowCommand`
   - `addGridColumnAfterCommand` / `addGridColumnBeforeCommand` / `deleteGridColumnCommand`
   - `setGridCellAlignCommand` (horizontal: left/center/right/justify - 4 options vs 3)
   - `setGridCellVAlignCommand` (vertical: top/middle/bottom - NEW feature)
   - `mergeGridCellRightCommand` / `splitGridCellCommand` (NEW features)
3. **Structure**: Handle `thead`, `tbody`, `tfoot` sections (GFM tables only have tbody)
4. **Spanning**: Support visual indicators and operations for merged cells (colspan/rowspan)
5. **Detection**: Detect grid tables via `data-type="grid-table"` attribute

## Available Grid Table Commands

All commands are exported from `@milkdown/kit/plugin/gridtables`:

**Table Creation:**
- `insertGridTableCommand` - Create new table (rows, cols, hasHeader, hasFooter)

**Navigation:**
- `goToNextGridCellCommand` - Move to next cell (Tab)
- `goToPrevGridCellCommand` - Move to previous cell (Shift+Tab)
- `exitGridTableCommand` - Exit table and create paragraph (Mod+Enter)

**Row Operations:**
- `addGridRowAfterCommand` - Add row after current
- `addGridRowBeforeCommand` - Add row before current
- `deleteGridRowCommand` - Delete current row

**Column Operations:**
- `addGridColumnAfterCommand` - Add column after current
- `addGridColumnBeforeCommand` - Add column before current
- `deleteGridColumnCommand` - Delete current column

**Cell Alignment:**
- `setGridCellAlignCommand` - Set horizontal alignment (left/center/right/justify)
- `setGridCellVAlignCommand` - Set vertical alignment (top/middle/bottom)

**Cell Merging:**
- `mergeGridCellRightCommand` - Merge cell with cell to the right
- `splitGridCellCommand` - Split merged cell

## Requirements

### 1. Component Structure

Create `packages/components/src/grid-table-block/` with:
```
grid-table-block/
├── config.ts              # Configuration (similar to table-block)
├── index.ts               # Exports
└── view/
    ├── index.ts           # NodeView registration using $view
    ├── view.ts            # GridTableNodeView class
    ├── component.tsx      # Vue component (reuse patterns from table-block)
    ├── operation.ts       # Operations (map UI actions to grid table commands)
    ├── drag.ts            # Drag handlers (row/column reordering)
    ├── pointer.ts         # Pointer event handlers
    ├── utils.ts           # Utility functions
    └── types.ts           # Type definitions
```

### 2. Configuration

Create `config.ts` with `gridTableBlockConfig` that includes:
- `renderButton` function similar to `tableBlockConfig`, but with additional render types:
  - All existing types from table-block (add_row, add_col, delete_row, delete_col, align_col_left/center/right, col_drag_handle, row_drag_handle)
  - NEW: `align_col_justify` (4th horizontal alignment option)
  - NEW: `align_cell_top`, `align_cell_middle`, `align_cell_bottom` (vertical alignment)
  - NEW: `merge_cell`, `split_cell` (cell merging operations)

### 3. NodeView

- Use `$view(gridTableSchema.node, ...)` to register the view
- Detect grid tables via `data-type="grid-table"` attribute
- Handle thead/tbody/tfoot sections properly
- Support spanning cells (colspan/rowspan) in visual indicators

### 4. Operations

Map UI actions to grid table commands:
- Row operations → `addGridRowAfterCommand`, `addGridRowBeforeCommand`, `deleteGridRowCommand`
- Column operations → `addGridColumnAfterCommand`, `addGridColumnBeforeCommand`, `deleteGridColumnCommand`
- Horizontal alignment → `setGridCellAlignCommand` with left/center/right/justify
- Vertical alignment → `setGridCellVAlignCommand` with top/middle/bottom
- Merge/split → `mergeGridCellRightCommand`, `splitGridCellCommand`

### 5. Section Awareness

- Respect section boundaries (thead/tbody/tfoot) when adding/deleting rows
- Don't allow deleting the only row in a section
- Handle operations within specific sections correctly

### 6. Spanning Support

- Visual indicators for merged cells
- Handle column/row operations with spanning cells (may need to split first)
- Show merge/split buttons only when appropriate

### 7. Integration

Export from `packages/components/src/index.ts`:
```typescript
export * from './grid-table-block'
```

Add to `packages/components/package.json` exports if needed.

## Testing

- Test with the CommandTesting story in Storybook to verify commands work
- Create a Storybook story for the grid-table-block component
- Test edge cases: deleting last row, merging/splitting, section boundaries

## Dependencies

- `@milkdown/plugin-gridtables` - For schema and commands
- `@milkdown/utils` - For `$view`, `$ctx`
- `vue` - For component rendering (consistent with table-block)

## Implementation Notes

1. **Reuse patterns** from `table-block` but adapt for grid table specifics
2. **Command mapping** - All grid table commands are already implemented and tested
3. **Section handling** - Grid tables have thead/tbody/tfoot, GFM tables only have tbody
4. **Alignment** - Grid tables support both horizontal (4 options) and vertical (3 options) alignment
5. **Merging** - Grid tables support cell merging, which GFM tables don't

## Files to Study

1. `packages/components/src/table-block/` - Reference implementation
2. `packages/plugins/plugin-gridtables/src/commands/index.ts` - All available commands
3. `packages/plugins/plugin-gridtables/src/schema/index.ts` - Grid table schema
4. `storybook/stories/plugins/gridtables.stories.ts` - CommandTesting story (shows all commands work)

## Success Criteria

- Component provides UI for all grid table operations
- Works with grid tables (not GFM tables)
- Handles sections (thead/tbody/tfoot) correctly
- Supports spanning cells
- Supports both horizontal and vertical alignment
- Supports merge/split operations
- Follows same patterns as table-block for consistency
- Includes Storybook story for testing

