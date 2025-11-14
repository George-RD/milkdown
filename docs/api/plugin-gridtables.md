---
title: Grid Tables
description: Grid tables plugin for Milkdown with spanning and alignment.
---

Grid tables for Milkdown, powered by @adobe/remark-gridtables. Provides table sections, spanning, horizontal/vertical alignment, and rich markdown inside cells.

## Usage

```ts
import { Editor } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gridTables } from '@milkdown/kit/plugin/gridtables'

Editor.make()
  .use(commonmark)
  .use(gridTables)
  .create()
```

## Interoperability

### GFM Integration

GridTables works seamlessly with `@milkdown/preset-gfm`:

- **Automatic promotion**: Simple gridTables serialize as GFM pipe tables
- **Complex tables preserved**: Tables with spans/footers remain as grid tables
- **Plugin order independent**: Load in any order without issues

Example with GFM:

```ts
import { Editor } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { gridTables } from '@milkdown/kit/plugin/gridtables'

Editor.make()
  .use(commonmark)
  .use(gfm)          // Can be in any order
  .use(gridTables)   // with gridTables
  .create()
```

Promotion criteria:
- No cell spans (colSpan=1, rowSpan=1)
- Rectangular (all rows same cell count)
- Single header row, no footer
- No vertical alignment
- Single paragraph per cell

### Clipboard

The plugin includes intelligent clipboard handling:
- Detects ASCII grid patterns in pasted content
- Preserves table structure and attributes
- Works with both plain text and HTML paste

## Commands

- @insertGridTableCommand
- @exitGridTableCommand
- @goToNextGridCellCommand
- @goToPrevGridCellCommand
- @addGridRowAfterCommand
- @addGridRowBeforeCommand
- @deleteGridRowCommand
- @addGridColumnAfterCommand
- @addGridColumnBeforeCommand
- @deleteGridColumnCommand
- @setGridCellAlignCommand
- @setGridCellVAlignCommand
- @mergeGridCellRightCommand
- @splitGridCellCommand

Example:

```ts
import { callCommand } from '@milkdown/kit/utils'
import { insertGridTableCommand } from '@milkdown/kit/plugin/gridtables'

editor.action(callCommand(insertGridTableCommand.key, { rows: 4, cols: 5 }))
```

## Schemas

- @gridTableSchema
- @gridTableHeadSchema
- @gridTableBodySchema
- @gridTableFootSchema
- @gridTableRowSchema
- @gridTableCellSchema

## Keymap

- @gridTableKeymap

## Input Rules

- @gridTableInputRules
