import type { MilkdownPlugin } from '@milkdown/ctx'
import type { RemarkPluginRaw } from '@milkdown/transformer'

import { $remark } from '@milkdown/utils'
import remarkGridTables from '@adobe/remark-gridtables'

import {
  gridTableAttr,
  gridTableBodyAttr,
  gridTableBodySchema,
  gridTableCellAttr,
  gridTableCellSchema,
  gridTableFootAttr,
  gridTableFootSchema,
  gridTableHeadAttr,
  gridTableHeadSchema,
  gridTableRowAttr,
  gridTableRowSchema,
  gridTableSchema,
} from './schema'
import { withMeta } from './__internal__'

/// Export schema types for external use
export type {
  GridTableAlign,
  GridTableVAlign,
} from './schema'

/// Export all schema components
export {
  gridTableAttr,
  gridTableBodyAttr,
  gridTableBodySchema,
  gridTableCellAttr,
  gridTableCellSchema,
  gridTableFootAttr,
  gridTableFootSchema,
  gridTableHeadAttr,
  gridTableHeadSchema,
  gridTableRowAttr,
  gridTableRowSchema,
  gridTableSchema,
}

/// This plugin wraps [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables).
export const remarkGridTablesPlugin = $remark(
  'remarkGridTables',
  () => remarkGridTables as RemarkPluginRaw
)

withMeta(remarkGridTablesPlugin.plugin, {
  displayName: 'Remark<remarkGridTablesPlugin>',
  group: 'GridTable',
})

withMeta(remarkGridTablesPlugin.options, {
  displayName: 'RemarkConfig<remarkGridTablesPlugin>',
  group: 'GridTable',
})

/// All plugins exported by this package.
export const gridTables: MilkdownPlugin[] = [
  // Remark plugin for markdown parsing
  remarkGridTablesPlugin,
  
  // HTML attributes
  gridTableAttr,
  gridTableHeadAttr,
  gridTableBodyAttr,
  gridTableFootAttr,
  gridTableRowAttr,
  gridTableCellAttr,
  
  // Node schemas
  gridTableSchema,
  gridTableHeadSchema,
  gridTableBodySchema,
  gridTableFootSchema,
  gridTableRowSchema,
  gridTableCellSchema,
].flat()