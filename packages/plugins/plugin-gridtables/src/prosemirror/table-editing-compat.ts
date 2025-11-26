/**
 * Experimental: prosemirror-tables compatibility layer for grid tables
 *
 * This module attempts to make grid tables compatible with prosemirror-tables
 * by adding the required tableRole attributes to the schema.
 *
 * The challenge: prosemirror-tables expects table → row → cell structure,
 * but grid tables have table → section → row → cell.
 *
 * Solution: Give sections tableRole: "table" so they act as mini-tables.
 * This means CellSelection and most commands work within a section.
 */

import type { Ctx, MilkdownPlugin } from '@milkdown/ctx'
import { tableEditing } from '@milkdown/prose/tables'
import { $prose } from '@milkdown/utils'
import { SchemaReady } from '@milkdown/core'

import { withMeta } from '../__internal__'

/**
 * Patches the grid table schema to add tableRole attributes needed by
 * prosemirror-tables. This must run AFTER the schema is built.
 *
 * Note: This is experimental and may not work perfectly with all
 * prosemirror-tables features due to the section structure.
 */
export const patchGridTableRoles: MilkdownPlugin = (ctx: Ctx) => async () => {
  await ctx.wait(SchemaReady)

  // We can't modify the schema after it's built, but we CAN check if
  // the roles were added at schema definition time.
  // This plugin serves as documentation of what's needed.

  console.warn(
    '[milkdown/grid-tables] tableRole compatibility requires schema changes. ' +
      'Add tableRole to your grid table node specs.'
  )
}

withMeta(patchGridTableRoles, {
  displayName: 'Plugin<patchGridTableRoles>',
  group: 'GridTable',
})

/**
 * Grid table editing plugin that wraps prosemirror-tables' tableEditing.
 *
 * This provides:
 * - CellSelection for multi-cell selection
 * - Cell-based copy/paste
 * - Table structure integrity
 *
 * Requirements: Grid table schema must have tableRole attributes.
 */
export const gridTableEditingPlugin = $prose(() =>
  tableEditing({ allowTableNodeSelection: true })
)

withMeta(gridTableEditingPlugin, {
  displayName: 'Prose<gridTableEditingPlugin>',
  group: 'GridTable',
})

/**
 * Schema additions needed for prosemirror-tables compatibility.
 *
 * Add these to your grid table node specs:
 *
 * gridTable: { tableRole: 'table', ... }
 * gridTableHead: { tableRole: 'table', ... }  // Acts as mini-table
 * gridTableBody: { tableRole: 'table', ... }  // Acts as mini-table
 * gridTableFoot: { tableRole: 'table', ... }  // Acts as mini-table
 * gridTableRow: { tableRole: 'row', ... }
 * gridTableCell: { tableRole: 'cell', ... }
 *
 * Note: Giving sections tableRole: 'table' means CellSelection works
 * within each section. Cross-section selection may not work correctly.
 */
export const TABLE_ROLE_CONFIG = {
  gridTable: 'table',
  gridTableHead: 'table', // Mini-table for prosemirror-tables
  gridTableBody: 'table', // Mini-table for prosemirror-tables
  gridTableFoot: 'table', // Mini-table for prosemirror-tables
  gridTableRow: 'row',
  gridTableCell: 'cell',
} as const

/**
 * All grid table editing plugins.
 * Include this array in your editor setup to enable prosemirror-tables features.
 */
export const gridTableEditingPlugins = [gridTableEditingPlugin].flat()

