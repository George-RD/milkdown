import type { Meta, StoryObj } from '@storybook/html'

import { gridTableBlock } from '@milkdown/kit/component/grid-table-block'
import { tableBlock } from '@milkdown/kit/component/table-block'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { cursor } from '@milkdown/kit/plugin/cursor'
import { gridTables } from '@milkdown/kit/plugin/gridtables'
import { history } from '@milkdown/kit/plugin/history'
import { gfm } from '@milkdown/kit/preset/gfm'
import tableStyle from '@milkdown/kit/prose/tables/style/tables.css?inline'

import type { CommonArgs } from '../utils/shadow'

import { setupMilkdown } from '../utils/shadow'
import style from './grid-table-block.css?inline'

const meta: Meta = {
  title: 'Components/Grid Table Block',
  parameters: {
    docs: {
      description: {
        component: `Grid Table Block component provides WYSIWYG manipulation for grid tables.
        
Features:
- Row and column drag and drop
- Row and column insert and delete  
- Horizontal alignment (left, center, right)
- Vertical alignment (top, middle, bottom) - grid tables only
- Cell merge and split - grid tables only

Works with both GFM tables and Grid tables.`,
      },
    },
  },
}

export default meta

const simpleGridTable = `+--------+--------+-----------+
| Fruit  | Animal | Vegetable |
+========+========+===========+
| Apple  | Cat    | Carrot    |
+--------+--------+-----------+
| Banana | Dog    | Cabbage   |
+--------+--------+-----------+
| Cherry | Horse  | Celery    |
+--------+--------+-----------+`

const gridTableWithSpans = `+-------------------+------+
| Table Headings    | Here |
+========+==========+======+
| cell   | column spanning |
| spans  +---------:+------+
| rows   |   normal | cell |
+--------+----------+------+`

const gridTableWithSections = `+--------+--------+-----------+
| Fruit  | Animal | Vegetable |
+========+========+===========+
| Apple  | Cat    | Carrot    |
+--------+--------+-----------+
| Banana | Dog    | Cabbage   |
+========+========+===========+
| Total  | 2      | 2         |
+--------+--------+-----------+`

const gfmTable = `| Fruit  | Animal | Vegetable |
| ------ | :----: | --------: |
| Apple  |   Cat  |    Carrot |
| Banana |   Dog  |   Cabbage |
| Cherry |  Horse |    Celery |`

export const SimpleGridTable: StoryObj<CommonArgs> = {
  name: 'Simple Grid Table',
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor
        .use(history)
        .use(cursor)
        .use(clipboard)
        .use(gfm)
        .use(gridTables)
        .use(gridTableBlock)
    })
  },
  args: {
    readonly: false,
    defaultValue: simpleGridTable,
  },
  parameters: {
    docs: {
      description: {
        story: 'A simple grid table with header and body rows.',
      },
    },
  },
}

export const GridTableWithSpans: StoryObj<CommonArgs> = {
  name: 'Grid Table with Cell Spans',
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor
        .use(history)
        .use(cursor)
        .use(clipboard)
        .use(gfm)
        .use(gridTables)
        .use(gridTableBlock)
    })
  },
  args: {
    readonly: false,
    defaultValue: gridTableWithSpans,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Grid table with row and column spans. Try the merge/split buttons.',
      },
    },
  },
}

export const GridTableWithSections: StoryObj<CommonArgs> = {
  name: 'Grid Table with Header/Body/Footer',
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor
        .use(history)
        .use(cursor)
        .use(clipboard)
        .use(gfm)
        .use(gridTables)
        .use(gridTableBlock)
    })
  },
  args: {
    readonly: false,
    defaultValue: gridTableWithSections,
  },
  parameters: {
    docs: {
      description: {
        story: 'Grid table with header, body, and footer sections.',
      },
    },
  },
}

export const GfmTableWithGridBlock: StoryObj<CommonArgs> = {
  name: 'GFM Table (with Unified Block)',
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor
        .use(history)
        .use(cursor)
        .use(clipboard)
        .use(gfm)
        .use(gridTables)
        .use(gridTableBlock) // Unified component handles both GFM and grid tables
    })
  },
  args: {
    readonly: false,
    defaultValue: gfmTable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A GFM pipe table using the unified grid-table-block component. The component detects the table type and uses the appropriate commands.',
      },
    },
  },
}

export const GfmTableOriginalBlock: StoryObj<CommonArgs> = {
  name: 'GFM Table (Original table-block)',
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor.use(history).use(cursor).use(clipboard).use(gfm).use(tableBlock)
    })
  },
  args: {
    readonly: false,
    defaultValue: gfmTable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The original table-block component with GFM tables only. This demonstrates backward compatibility.',
      },
    },
  },
}

export const BothTableTypes: StoryObj<CommonArgs> = {
  name: 'Mixed: GFM + Grid Tables',
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor
        .use(history)
        .use(cursor)
        .use(clipboard)
        .use(gfm)
        .use(gridTables)
        .use(gridTableBlock) // Unified component handles both table types
    })
  },
  args: {
    readonly: false,
    defaultValue: `# Mixed Tables Demo

Here's a simple GFM table:

${gfmTable}

And here's a complex grid table:

${gridTableWithSpans}

Both table types are handled by the same unified component!`,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Document with both GFM and Grid tables. The unified grid-table-block component handles both table types with appropriate UI controls.',
      },
    },
  },
}

