import type { Ctx } from '@milkdown/ctx'

import { commandsCtx, editorViewCtx } from '@milkdown/core'
import {
  addGridColumnAfterCommand,
  addGridColumnBeforeCommand,
  addGridRowAfterCommand,
  addGridRowBeforeCommand,
  deleteGridColumnCommand,
  deleteGridRowCommand,
  mergeGridCellRightCommand,
  moveGridColCommand,
  moveGridRowCommand,
  selectGridColCommand,
  selectGridRowCommand,
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  splitGridCellCommand,
} from '@milkdown/plugin-gridtables'

import type { TableCommandBridge } from '../../table-block/types'

/**
 * Creates a TableCommandBridge for Grid tables
 *
 * This bridge maps the abstract table operations to the specific
 * commands provided by @milkdown/plugin-gridtables.
 */
export function createGridCommandBridge(
  ctx: Ctx,
  getPos: () => number | undefined
): TableCommandBridge {
  const getTablePos = () => (getPos?.() ?? 0) + 1

  return {
    selectRow(index: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(selectGridRowCommand.key, { pos: getTablePos(), index })
    },

    selectCol(index: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(selectGridColCommand.key, { pos: getTablePos(), index })
    },

    addRowBefore() {
      const commands = ctx.get(commandsCtx)
      commands.call(addGridRowBeforeCommand.key)
    },

    addRowAfter() {
      const commands = ctx.get(commandsCtx)
      commands.call(addGridRowAfterCommand.key)
    },

    deleteRow() {
      const commands = ctx.get(commandsCtx)
      commands.call(deleteGridRowCommand.key)
    },

    addColBefore() {
      const commands = ctx.get(commandsCtx)
      commands.call(addGridColumnBeforeCommand.key)
    },

    addColAfter() {
      const commands = ctx.get(commandsCtx)
      commands.call(addGridColumnAfterCommand.key)
    },

    deleteCol() {
      const commands = ctx.get(commandsCtx)
      commands.call(deleteGridColumnCommand.key)
    },

    setAlign(direction: 'left' | 'center' | 'right') {
      const commands = ctx.get(commandsCtx)
      commands.call(setGridCellAlignCommand.key, direction)
    },

    moveRow(from: number, to: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(moveGridRowCommand.key, { from, to, pos: getTablePos() })
    },

    moveCol(from: number, to: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(moveGridColCommand.key, { from, to, pos: getTablePos() })
    },

    deleteSelectedCells() {
      // This method is deprecated - use deleteRow() or deleteCol() instead.
      // For backward compatibility, default to row deletion.
      // Note: The UI now calls deleteRow() and deleteCol() directly, so this
      // should rarely be called. If it is, we default to row deletion as a
      // safe fallback.
      const commands = ctx.get(commandsCtx)
      commands.call(deleteGridRowCommand.key)
    },

    // Grid-table specific features
    setVAlign(direction: 'top' | 'middle' | 'bottom') {
      const commands = ctx.get(commandsCtx)
      commands.call(setGridCellVAlignCommand.key, direction)
    },

    mergeCellRight() {
      const commands = ctx.get(commandsCtx)
      commands.call(mergeGridCellRightCommand.key)
    },

    splitCell() {
      const commands = ctx.get(commandsCtx)
      commands.call(splitGridCellCommand.key)
    },
  }
}

/**
 * Helper to check if the editor is editable
 */
export function isEditable(ctx: Ctx): boolean {
  return ctx.get(editorViewCtx).editable
}

/**
 * Helper to focus the editor
 */
export function focusEditor(ctx: Ctx): void {
  requestAnimationFrame(() => {
    ctx.get(editorViewCtx).focus()
  })
}
