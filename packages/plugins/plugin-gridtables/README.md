# @milkdown/plugin-gridtables

Grid tables for Milkdown, powered by [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables). Supports spanning, alignment, rich content, and table sections.

## Installation

```bash
pnpm add @milkdown/plugin-gridtables
```

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

## Features

- **Rich Content**: Cells can contain full Markdown (lists, code blocks, inline formatting)
- **Cell Spanning**: Merge cells horizontally and vertically
- **Alignment**: Horizontal (`left`, `center`, `right`, `justify`) and vertical (`top`, `middle`, `bottom`) alignment
- **Table Sections**: Header (`thead`), body (`tbody`), and footer (`tfoot`) sections
- **Multi-line Cells**: Support for complex content across multiple lines
- **ASCII Syntax**: Human-readable grid table format in source

## Commands

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
editor.action(
  callCommand(insertGridTableCommand.key, {
    rows: 4,
    cols: 5,
    hasHeader: true,
    hasFooter: true,
  })
)

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

## Keyboard Shortcuts

- `Tab` / `Shift-Tab` - Navigate between cells
- `Mod-Enter` - Exit table
- Arrow keys - Navigate cells (when cursor is at cell edge)
