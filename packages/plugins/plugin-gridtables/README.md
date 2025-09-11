# @milkdown/plugin-gridtables

A Milkdown plugin that adds support for grid tables using [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables).

## Features

- Full grid table support with cell spanning
- Horizontal and vertical alignment
- Support for complex markdown content within cells
- Header, body, and footer sections

## Installation

```bash
npm install @milkdown/plugin-gridtables
```

## Usage

```typescript
import { Editor } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gridTables } from '@milkdown/plugin-gridtables'

Editor
  .make()
  .use(commonmark)
  .use(gridTables)
  .create()
```

## Grid Table Syntax

Grid tables use ASCII art to define table structure:

```
+-------+-------+-------+
| Cell  | Cell  | Cell  |
| 1     | 2     | 3     |
+=======+=======+=======+
| Cell  | Cell  | Cell  |
| 4     | 5     | 6     |
+-------+-------+-------+
```

### Features

- **Cell Spanning**: Use `+` markers to span cells across rows/columns
- **Alignment**: Use `:` for horizontal alignment, `^` `v` for vertical
- **Complex Content**: Cells can contain full markdown including lists, code, etc.
- **Sections**: Separate header (with `=`), body, and footer sections

## Schema

The plugin provides these node types:

- `gridTable` - The root table node
- `gridTableHead` - Table header section
- `gridTableBody` - Table body section  
- `gridTableFoot` - Table footer section
- `gridTableRow` - Table row
- `gridTableCell` - Table cell with span and alignment attributes