# @milkdown/plugin-gridtables

Grid tables for Milkdown, powered by [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables). Supports spanning, alignment, rich content, and table sections.

## Installation

```bash
pnpm add @milkdown/plugin-gridtables
```

## Usage

- Preferred (via kit re‑export):
```ts
import { Editor } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gridTables } from '@milkdown/kit/plugin/gridtables'

Editor.make()
  .use(commonmark)
  .use(gridTables) // Can now load after commonmark - composition handled automatically
  .create()
```

- Direct package import:
```ts
import { Editor } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gridTables } from '@milkdown/plugin-gridtables'

Editor.make()
  .use(commonmark)
  .use(gridTables) // Flexible loading order - composition handled automatically
  .create()
```

## Commands (examples)

```ts
import { callCommand } from '@milkdown/kit/utils'
import {
  insertGridTableCommand,
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  addGridRowAfterCommand,
  addGridColumnBeforeCommand,
  mergeGridCellRightCommand,
  splitGridCellCommand,
  exitGridTableCommand,
} from '@milkdown/kit/plugin/gridtables'

// Insert a 3x3 with header
editor.action(callCommand(insertGridTableCommand.key))

// Insert a 4x5 with header + footer
editor.action(callCommand(insertGridTableCommand.key, {
  rows: 4, cols: 5, hasHeader: true, hasFooter: true,
}))

// Align current cell
editor.action(callCommand(setGridCellAlignCommand.key, 'center'))
editor.action(callCommand(setGridCellVAlignCommand.key, 'top'))

// Structure
editor.action(callCommand(addGridRowAfterCommand.key))
editor.action(callCommand(addGridColumnBeforeCommand.key))
editor.action(callCommand(mergeGridCellRightCommand.key))
editor.action(callCommand(splitGridCellCommand.key))

// Exit the table
editor.action(callCommand(exitGridTableCommand.key))
```

## Grid Table Syntax

ASCII grid table examples (subset):

```
// Basic
+-------+-------+-------+
| A     | B     | C     |
+=======+=======+=======+
| 1     | 2     | 3     |
+-------+-------+-------+

// Spanning
| span across +--+ columns |

// Horizontal alignment
| :--- | :--: | ---: | >--< |
| left |center|right |justify|

// Vertical alignment (within cells)
^ top | x middle | v bottom
```

Cells may contain full markdown (lists, code blocks, inline formatting). Sections use `thead`/`tbody`/`tfoot` (header rows denoted by `=` divider).

## Schema

- `gridTable` (root)
- `gridTableHead`, `gridTableBody`, `gridTableFoot`
- `gridTableRow`
- `gridTableCell` (attributes: `colSpan`, `rowSpan`, `align`, `valign`)

## Advanced Usage

### Remark Composition

The plugin now includes composition-aware remark wrappers for advanced usage scenarios:

```ts
import { $remark } from '@milkdown/utils'
import {
  remarkGridTablesFactory,
  remarkGridTablesComposed,
  remarkGridTablesLegacy,
} from '@milkdown/plugin-gridtables'

// Automatic composition handling
const autoPlugin = $remark('gridTables', (ctx) => remarkGridTablesFactory(ctx))

// Explicit composition-aware wrapper
const composedPlugin = $remark('gridTables', (ctx) => remarkGridTablesComposed(ctx))

// Legacy direct wrapper (no composition handling)
const legacyPlugin = $remark('gridTables', () => remarkGridTablesLegacy())
```

### Loading Order Flexibility

Grid tables now work with flexible loading order:

```ts
// Both of these work correctly:
Editor.make().use(gridTables).use(commonmark) // Traditional
Editor.make().use(commonmark).use(gridTables) // Post-commonmark (NEW)
```

The plugin automatically detects existing table plugins and ensures grid table syntax takes precedence.

## Tips

- Flexible loading order: works before or after commonmark/gfm
- Prefer kit imports for examples and consumers
- Use keybindings: `Tab`/`Shift-Tab` to navigate, `Mod-Enter` to exit
- For advanced composition control, use the remark wrapper functions directly
