import type { Ctx } from '@milkdown/ctx'

import { editorViewCtx } from '@milkdown/core'

import type { TableCommandBridge } from '../../table-block/types'
import type { Refs } from '../../table-block/view/types'

/**
 * Hook providing grid table operations using the command bridge abstraction.
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
    if (buttonGroup)
      buttonGroup.dataset.show =
        buttonGroup.dataset.show === 'true' ? 'false' : 'true'
  }

  const deleteSelected = (e: PointerEvent) => {
    if (!bridge || !isEditable()) return

    e.preventDefault()
    e.stopPropagation()
    bridge.deleteSelectedCells()
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

  // Grid-table specific operations
  const onVAlign =
    (direction: 'top' | 'middle' | 'bottom') => (e: PointerEvent) => {
      if (!bridge?.setVAlign || !isEditable()) return

      e.preventDefault()
      e.stopPropagation()
      bridge.setVAlign(direction)
      focusEditor()
    }

  const onMergeCell = (e: PointerEvent) => {
    if (!bridge?.mergeCellRight || !isEditable()) return

    e.preventDefault()
    e.stopPropagation()
    bridge.mergeCellRight()
    focusEditor()
  }

  const onSplitCell = (e: PointerEvent) => {
    if (!bridge?.splitCell || !isEditable()) return

    e.preventDefault()
    e.stopPropagation()
    bridge.splitCell()
    focusEditor()
  }

  return {
    onAddRow,
    onAddCol,
    selectCol,
    selectRow,
    deleteSelected,
    onAlign,
    // Grid-specific
    onVAlign,
    onMergeCell,
    onSplitCell,
  }
}

