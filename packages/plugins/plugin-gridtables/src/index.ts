/**
 * @milkdown/plugin-gridtables
 *
 * Grid tables plugin for Milkdown editor. Implements advanced table features
 * based on @adobe/remark-gridtables with support for:
 * - Multi-line cells with proper text wrapping
 * - Cell alignment (left, center, right, justify)
 * - Vertical alignment (top, middle, bottom)
 * - Complex table structures
 *
 * ## Usage
 *
 * ```typescript
 * import { commonmark } from '@milkdown/preset-commonmark'
 * import { gridTables } from '@milkdown/plugin-gridtables'
 *
 * // Recommended: Post-commonmark loading
 * editor.use(commonmark).use(gridTables)
 *
 * // Legacy: Pre-commonmark loading (also supported)
 * editor.use(gridTables).use(commonmark)
 * ```
 *
 * The `gridTables` export handles micromark extension composition correctly
 * for both loading patterns.
 */

import type { SliceType } from '@milkdown/ctx'
import type { $Ctx, $Prose } from '@milkdown/utils'

import { remarkGridTables } from './remark-wrapper'
import { remarkGridTablesNormalizeInline } from './remark-normalize-inline'

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
import {
  gridTableProseMirrorPlugins,
  gridTablePluginConfig,
  gridTableProseMirrorPlugin,
} from './prosemirror-plugin'

/// Export schema types for external use
export type { GridTableAlign, GridTableVAlign } from './schema'

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
export {
  gridTableProseMirrorPlugins,
  gridTablePluginConfig,
} from './prosemirror-plugin'

/// Export remark wrapper for advanced usage
export { remarkGridTables } from './remark-wrapper'
export { remarkGridTablesNormalizeInline } from './remark-normalize-inline'

/// This plugin wraps [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables).
/// Handles micromark extension composition for both loading patterns.
export const remarkGridTablesPlugin = remarkGridTables

/// All plugins exported by this package.
/// Supports both post-commonmark (.use(commonmark).use(gridTables)) and
/// pre-commonmark (.use(gridTables).use(commonmark)) loading patterns.
export const gridTables = [
  // Remark plugin for markdown parsing
  remarkGridTables,
  remarkGridTablesNormalizeInline,

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
