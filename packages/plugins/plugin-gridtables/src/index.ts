import type { MilkdownPlugin, SliceType } from '@milkdown/ctx'
import type { $Ctx, $Prose } from '@milkdown/utils'

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
import { gridTableCommands } from './commands'
import { gridTableKeymap } from './keymap'
import { gridTableInputRules } from './input-rules'
import {
  gridTableProseMirrorPlugins,
  gridTablePluginConfig,
  gridTableProseMirrorPlugin,
} from './prosemirror-plugin'
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

/// Export all command components
export {
  insertGridTableCommand,
  exitGridTableCommand,
  goToNextGridCellCommand,
  goToPrevGridCellCommand,
  addGridRowAfterCommand,
  addGridRowBeforeCommand,
  deleteGridRowCommand,
  addGridColumnAfterCommand,
  addGridColumnBeforeCommand,
  deleteGridColumnCommand,
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  mergeGridCellRightCommand,
  splitGridCellCommand,
  isInGridTable,
  createGridTable,
} from './commands'

/// Export keymap and input rules
export { gridTableKeymap } from './keymap'
export { gridTableInputRules } from './input-rules'
export { gridTableProseMirrorPlugins, gridTablePluginConfig } from './prosemirror-plugin'

/// This plugin wraps [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables).
export const remarkGridTablesPlugin = $remark(
  'remarkGridTables',
  () => remarkGridTables
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
export const gridTables = [
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
  
  // Commands for table manipulation
  gridTableCommands,
  
  // Keyboard navigation
  gridTableKeymap,
  
  // ProseMirror plugins for enhanced functionality
  gridTableProseMirrorPlugins,
].flat() as GridTablesPlugin
gridTables.key = gridTablePluginConfig.key
gridTables.pluginKey = gridTableProseMirrorPlugin.key

// Typed tuple pattern with key/pluginKey (align with block/slash plugins)
// Provides stable keys for consumers that need direct access to config/prose plugin keys.
export type GridTablesPlugin = [
  $Ctx<
    {
      enableCellHover: boolean
      enableColumnResize: boolean
      cellHoverClass: string
    },
    'gridTablePluginConfig'
  >,
  $Prose,
] & {
  key: SliceType<
    {
      enableCellHover: boolean
      enableColumnResize: boolean
      cellHoverClass: string
    },
    'gridTablePluginConfig'
  >
  pluginKey: $Prose['key']
}
