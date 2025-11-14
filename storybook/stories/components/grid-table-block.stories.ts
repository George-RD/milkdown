import type { Meta, StoryObj } from '@storybook/html'

import { gridTableBlock } from '@milkdown/kit/component/grid-table-block'
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
}

export default meta

const gridTable = `+-------------------+------+
| Table Headings    | Here |
+===================+======+
| cell              | more |
+-------------------+------+`

export const GridTable: StoryObj<CommonArgs> = {
  render: (args) => {
    return setupMilkdown([style, tableStyle], args, (editor) => {
      editor.use(history).use(cursor).use(gridTables).use(gridTableBlock).use(gfm)
    })
  },
  args: {
    readonly: false,
    defaultValue: gridTable,
  },
}
