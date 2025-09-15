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
 * ## Usage Patterns
 *
 * ### Recommended: Post-commonmark Loading
 * ```typescript
 * import { commonmark } from '@milkdown/preset-commonmark'
 * import { gridTables } from '@milkdown/plugin-gridtables'
 *
 * editor.use(commonmark).use(gridTables)
 * ```
 *
 * ### Legacy: Pre-commonmark Loading
 * ```typescript
 * import { gridTablesLegacy } from '@milkdown/plugin-gridtables'
 *
 * editor.use(gridTablesLegacy).use(commonmark)
 * ```
 *
 * The main `gridTables` export uses composition-aware remark plugin that properly
 * handles micromark extension composition when loaded after commonmark/gfm.
 */

import type { SliceType } from '@milkdown/ctx'
import type { $Ctx, $Prose } from '@milkdown/utils'

import { remarkGridTablesComposed, remarkGridTablesLegacy } from './remark-wrapper'

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

/// Export remark wrapper components for advanced usage
export {
  remarkGridTablesComposed,
  remarkGridTablesLegacy,
} from './remark-wrapper'


/// This plugin wraps [@adobe/remark-gridtables](https://github.com/adobe/remark-gridtables).
/// Uses composition-aware wrapper by default for post-commonmark loading (.use(commonmark).use(gridTables)).
/// This is the recommended plugin for modern usage.
export const remarkGridTablesPlugin = remarkGridTablesComposed

/// All plugins exported by this package.
/// Uses composition-aware remark plugin for post-commonmark loading (.use(commonmark).use(gridTables)).
/// This is the recommended export for modern usage.
export const gridTables = [
  // Remark plugin for markdown parsing (composition-aware)
  remarkGridTablesComposed,

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

/// Legacy plugin bundle for backward compatibility.
/// Uses direct remark wrapper for pre-commonmark loading patterns.
export const gridTablesLegacy = [
  // Remark plugin for markdown parsing (direct wrapper)
  remarkGridTablesLegacy,

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

// Set keys for legacy export as well
gridTablesLegacy.key = gridTablePluginConfig.key
gridTablesLegacy.pluginKey = gridTableProseMirrorPlugin.key

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
