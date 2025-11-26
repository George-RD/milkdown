import type { Ctx } from '@milkdown/ctx'

import { editorViewCtx } from '@milkdown/core'

import type { TableCommandBridge } from '../types'
import type { Refs } from './types'

/**
 * Hook providing table operations using the command bridge abstraction.
 *
 * This allows the same UI to work with different table implementations
 * (GFM tables, Grid tables) by swapping out the command bridge.
 */
export function useOperation(
  refs: Refs,
  ctx: Ctx | undefined,
  bridge: TableCommandBridge | undefined
) {
  const {
    xLineHandleRef,
    contentWrapperRef,
    colHandleRef,
    rowHandleRef,
    hoverIndex,
    lineHoverIndex,
  } = refs

  const isEditable = () => {
    if (!ctx) return false
    return ctx.get(editorViewCtx).editable
  }

  const focusEditor = () => {
    if (!ctx) return
    requestAnimationFrame(() => {
      ctx.get(editorViewCtx).focus()
    })
  }

  const onAddRow = () => {
    if (!bridge || !isEditable()) return
    const xHandle = xLineHandleRef.value
    if (!xHandle) return

    const [rowIndex] = lineHoverIndex.value!
    if (rowIndex < 0) return

    const rows = Array.from(
      contentWrapperRef.value?.querySelectorAll('tr') ?? []
    )

    if (rows.length === rowIndex) {
      bridge.selectRow(rowIndex - 1)
      bridge.addRowAfter()
    } else {
      bridge.selectRow(rowIndex)
      bridge.addRowBefore()
    }

    bridge.selectRow(rowIndex)
    xHandle.dataset.show = 'false'
  }

  const onAddCol = () => {
    if (!bridge || !isEditable()) return
    const xHandle = xLineHandleRef.value
    if (!xHandle) return

    const [_, colIndex] = lineHoverIndex.value!
    if (colIndex < 0) return

    const cols = Array.from(
      contentWrapperRef.value?.querySelector('tr')?.children ?? []
    )

    if (cols.length === colIndex) {
      bridge.selectCol(colIndex - 1)
      bridge.addColAfter()
    } else {
      bridge.selectCol(colIndex)
      bridge.addColBefore()
    }

    bridge.selectCol(colIndex)
  }

  const selectCol = () => {
    if (!bridge) return
    const [_, colIndex] = hoverIndex.value!
    bridge.selectCol(colIndex)
    const buttonGroup =
      colHandleRef.value?.querySelector<HTMLElement>('.button-group')
    if (buttonGroup)
      buttonGroup.dataset.show =
        buttonGroup.dataset.show === 'true' ? 'false' : 'true'
  }

  const selectRow = () => {
    if (!bridge) return
    const [rowIndex, _] = hoverIndex.value!
    bridge.selectRow(rowIndex)
    const buttonGroup =
      rowHandleRef.value?.querySelector<HTMLElement>('.button-group')
    if (buttonGroup && rowIndex > 0)
      buttonGroup.dataset.show =
        buttonGroup.dataset.show === 'true' ? 'false' : 'true'
  }

  const deleteRow = (e: PointerEvent) => {
    if (!bridge || !isEditable()) return

    e.preventDefault()
    e.stopPropagation()
    bridge.deleteRow()
    focusEditor()
  }

  const deleteCol = (e: PointerEvent) => {
    if (!bridge || !isEditable()) return

    e.preventDefault()
    e.stopPropagation()
    bridge.deleteCol()
    focusEditor()
  }

  const onAlign =
    (direction: 'left' | 'center' | 'right') => (e: PointerEvent) => {
      if (!bridge || !isEditable()) return

      e.preventDefault()
      e.stopPropagation()
      bridge.setAlign(direction)
      focusEditor()
    }

  return {
    onAddRow,
    onAddCol,
    selectCol,
    selectRow,
    deleteRow,
    deleteCol,
    onAlign,
  }
}
