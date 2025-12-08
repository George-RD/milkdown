import type { Ctx } from '@milkdown/ctx'

import { commandsCtx, editorViewCtx } from '@milkdown/core'
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  deleteSelectedCellsCommand,
  moveColCommand,
  moveRowCommand,
  selectColCommand,
  selectRowCommand,
  setAlignCommand,
} from '@milkdown/preset-gfm'

import type { TableCommandBridge } from '../types'

/**
 * Creates a TableCommandBridge for GFM tables
 *
 * This bridge maps the abstract table operations to the specific
 * commands provided by @milkdown/preset-gfm.
 */
export function createGfmCommandBridge(
  ctx: Ctx,
  getPos: () => number | undefined
): TableCommandBridge {
  const getTablePos = () => (getPos?.() ?? 0) + 1

  return {
    selectRow(index: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(selectRowCommand.key, { pos: getTablePos(), index })
    },

    selectCol(index: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(selectColCommand.key, { pos: getTablePos(), index })
    },

    addRowBefore() {
      const commands = ctx.get(commandsCtx)
      commands.call(addRowBeforeCommand.key)
    },

    addRowAfter() {
      const commands = ctx.get(commandsCtx)
      commands.call(addRowAfterCommand.key)
    },

    deleteRow() {
      const commands = ctx.get(commandsCtx)
      commands.call(deleteSelectedCellsCommand.key)
    },

    addColBefore() {
      const commands = ctx.get(commandsCtx)
      commands.call(addColBeforeCommand.key)
    },

    addColAfter() {
      const commands = ctx.get(commandsCtx)
      commands.call(addColAfterCommand.key)
    },

    deleteCol() {
      const commands = ctx.get(commandsCtx)
      commands.call(deleteSelectedCellsCommand.key)
    },

    setAlign(direction: 'left' | 'center' | 'right') {
      const commands = ctx.get(commandsCtx)
      commands.call(setAlignCommand.key, direction)
    },

    moveRow(from: number, to: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(moveRowCommand.key, { from, to, pos: getTablePos() })
    },

    moveCol(from: number, to: number) {
      const commands = ctx.get(commandsCtx)
      commands.call(moveColCommand.key, { from, to, pos: getTablePos() })
    },

    deleteSelectedCells() {
      const commands = ctx.get(commandsCtx)
      commands.call(deleteSelectedCellsCommand.key)
    },

    // GFM tables don't support these features
    setVAlign: undefined,
    mergeCellRight: undefined,
    splitCell: undefined,
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

