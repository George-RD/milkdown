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
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  splitGridCellCommand,
} from '@milkdown/plugin-gridtables'

import type { CellIndex, Refs } from './types'

import {
  getCellByIndex,
  getColumnCount,
  selectCell,
} from './utils'

export function useOperation(
  refs: Refs,
  ctx?: Ctx
) {
  const {
    xLineHandleRef,
    yLineHandleRef,
    contentWrapperRef,
    colHandleRef,
    rowHandleRef,
    cellHandleRef,
    hoverIndex,
    lineHoverIndex,
  } = refs

  const focusCellAtIndex = (index: CellIndex) => {
    if (!ctx) return false
    const table = contentWrapperRef.value
    if (!table) return false
    const cell = getCellByIndex(table, index)
    if (!cell) return false
    const view = ctx.get(editorViewCtx)
    if (!view) return false
    const updated = selectCell(view, cell)
    if (!updated) return false
    requestAnimationFrame(() => {
      view.focus()
    })
    return true
  }

  const onAddRow = () => {
    if (!ctx) return
    const xHandle = xLineHandleRef.value
    if (!xHandle) return

    const [rowBoundary] = lineHoverIndex.value
    if (rowBoundary < 0) return

    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const table = contentWrapperRef.value
    if (!table) return
    const rows = Array.from(table.rows)
    if (!rows.length) return

    const targetRowIndex =
      rowBoundary >= rows.length ? rows.length - 1 : rowBoundary
    const index: CellIndex = [Math.max(0, targetRowIndex), 0]
    if (!focusCellAtIndex(index)) return

    const commands = ctx.get(commandsCtx)
    if (rowBoundary >= rows.length) {
      commands.call(addGridRowAfterCommand.key)
    } else {
      commands.call(addGridRowBeforeCommand.key)
    }

    xHandle.dataset.show = 'false'
  }

  const onAddCol = () => {
    if (!ctx) return
    const yHandle = yLineHandleRef.value
    if (!yHandle) return

    const [rowIndex, colBoundary] = lineHoverIndex.value
    if (colBoundary < 0) return

    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const table = contentWrapperRef.value
    if (!table) return
    const columnCount = getColumnCount(table)
    if (columnCount <= 0) return

    const targetColIndex =
      colBoundary >= columnCount ? columnCount - 1 : colBoundary
    const index: CellIndex = [Math.max(0, rowIndex), Math.max(0, targetColIndex)]
    if (!focusCellAtIndex(index)) return

    const commands = ctx.get(commandsCtx)
    if (colBoundary >= columnCount) {
      commands.call(addGridColumnAfterCommand.key)
    } else {
      commands.call(addGridColumnBeforeCommand.key)
    }

    yHandle.dataset.show = 'false'
  }

  const toggleButtonGroup = (handle: HTMLDivElement | undefined) => {
    if (!handle) return
    const buttonGroup = handle.querySelector<HTMLElement>('.button-group')
    if (!buttonGroup) return
    buttonGroup.dataset.show =
      buttonGroup.dataset.show === 'true' ? 'false' : 'true'
  }

  const selectCol = () => {
    if (!ctx) return
    const colHandle = colHandleRef.value
    if (!colHandle) return
    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index = hoverIndex.value
    if (!focusCellAtIndex(index)) return

    toggleButtonGroup(colHandle)
  }

  const selectRow = () => {
    if (!ctx) return
    const rowHandle = rowHandleRef.value
    if (!rowHandle) return
    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index: CellIndex = [hoverIndex.value[0], 0]
    if (!focusCellAtIndex(index)) return

    toggleButtonGroup(rowHandle)
  }

  const selectCellHandle = () => {
    if (!ctx) return
    const cellHandle = cellHandleRef.value
    if (!cellHandle) return
    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index = hoverIndex.value
    if (!focusCellAtIndex(index)) return

    toggleButtonGroup(cellHandle)
  }

  const deleteRow = (e: PointerEvent) => {
    if (!ctx) return
    e.preventDefault()
    e.stopPropagation()

    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index: CellIndex = [hoverIndex.value[0], 0]
    if (!focusCellAtIndex(index)) return

    const commands = ctx.get(commandsCtx)
    commands.call(deleteGridRowCommand.key)
  }

  const deleteCol = (e: PointerEvent) => {
    if (!ctx) return
    e.preventDefault()
    e.stopPropagation()

    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index = hoverIndex.value
    if (!focusCellAtIndex(index)) return

    const commands = ctx.get(commandsCtx)
    commands.call(deleteGridColumnCommand.key)
  }

  const onAlign =
    (direction: 'left' | 'center' | 'right' | 'justify') =>
    (e: PointerEvent) => {
      if (!ctx) return
      e.preventDefault()
      e.stopPropagation()

      const view = ctx.get(editorViewCtx)
      if (!view?.editable) return

      const index = hoverIndex.value
      if (!focusCellAtIndex(index)) return

      const commands = ctx.get(commandsCtx)
      commands.call(setGridCellAlignCommand.key, direction)
    }

  const onVAlign =
    (direction: 'top' | 'middle' | 'bottom') =>
    (e: PointerEvent) => {
      if (!ctx) return
      e.preventDefault()
      e.stopPropagation()

      const view = ctx.get(editorViewCtx)
      if (!view?.editable) return

      const index = hoverIndex.value
      if (!focusCellAtIndex(index)) return

      const commands = ctx.get(commandsCtx)
      commands.call(setGridCellVAlignCommand.key, direction)
    }

  const mergeCell = (e: PointerEvent) => {
    if (!ctx) return
    e.preventDefault()
    e.stopPropagation()

    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index = hoverIndex.value
    if (!focusCellAtIndex(index)) return

    const commands = ctx.get(commandsCtx)
    commands.call(mergeGridCellRightCommand.key)
  }

  const splitCell = (e: PointerEvent) => {
    if (!ctx) return
    e.preventDefault()
    e.stopPropagation()

    const view = ctx.get(editorViewCtx)
    if (!view?.editable) return

    const index = hoverIndex.value
    if (!focusCellAtIndex(index)) return

    const commands = ctx.get(commandsCtx)
    commands.call(splitGridCellCommand.key)
  }

  return {
    onAddRow,
    onAddCol,
    selectCol,
    selectRow,
    selectCellHandle,
    deleteRow,
    deleteCol,
    onAlign,
    onVAlign,
    mergeCell,
    splitCell,
  }
}
