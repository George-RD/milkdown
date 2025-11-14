import type { EditorView } from '@milkdown/prose/view'

import { throttle } from 'lodash-es'

import type { Refs } from './types'

import {
  clearLineHoverIndex,
  computeCellHandlePositionByIndex,
  computeColHandlePositionByIndex,
  computeRowHandlePositionByIndex,
  findPointerIndex,
  getColumnCount,
  getColumnIndexFromDom,
  getRelatedDOM,
  hideButtonGroups,
  positionLineHandle,
  setLineHoverIndex,
  updateLineHandlePosition,
} from './utils'

function createPointerMoveHandler(
  refs: Refs,
  view?: EditorView
): (e: PointerEvent) => void {
  return throttle((e: PointerEvent) => {
    if (!view?.editable) return
    const {
      contentWrapperRef,
      yLineHandleRef,
      xLineHandleRef,
      colHandleRef,
      rowHandleRef,
      cellHandleRef,
      hoverIndex,
    } = refs
    const yHandle = yLineHandleRef.value
    if (!yHandle) return
    const xHandle = xLineHandleRef.value
    if (!xHandle) return
    const table = contentWrapperRef.value
    if (!table) return
    const rowHandle = rowHandleRef.value
    if (!rowHandle) return
    const colHandle = colHandleRef.value
    if (!colHandle) return
    const cellHandle = cellHandleRef.value
    if (!cellHandle) return

    const pointerIndex = findPointerIndex(e, view)
    if (!pointerIndex) return

    const dom = getRelatedDOM(contentWrapperRef, pointerIndex)
    if (!dom) return

    const [rowIndex] = pointerIndex
    const columnIndex = getColumnIndexFromDom(table, rowIndex, dom.col)
    if (columnIndex < 0) return

    const actualIndex: typeof pointerIndex = [rowIndex, columnIndex]

    const boundary = dom.col.getBoundingClientRect()
    const tableRect = table.getBoundingClientRect()

    const colSpan = dom.col.colSpan || 1
    const rowSpan = dom.col.rowSpan || 1

    const mergeButton = cellHandle.querySelector<HTMLElement>('[data-action="merge"]') as HTMLButtonElement | null
    if (mergeButton) mergeButton.disabled = false
    const splitButton = cellHandle.querySelector<HTMLElement>('[data-action="split"]') as HTMLButtonElement | null
    if (splitButton) splitButton.disabled = colSpan <= 1

    const closeToBoundaryLeft = Math.abs(e.clientX - boundary.left) < 8
    const closeToBoundaryRight = Math.abs(boundary.right - e.clientX) < 8
    const closeToBoundaryTop = Math.abs(e.clientY - boundary.top) < 8
    const closeToBoundaryBottom = Math.abs(boundary.bottom - e.clientY) < 8

    hideButtonGroups(rowHandle, colHandle, cellHandle)

    if (
      closeToBoundaryLeft ||
      closeToBoundaryRight ||
      closeToBoundaryTop ||
      closeToBoundaryBottom
    ) {
      rowHandle.dataset.show = 'false'
      colHandle.dataset.show = 'false'
      cellHandle.dataset.show = 'false'
      xHandle.dataset.displayType = 'tool'
      yHandle.dataset.displayType = 'tool'

      if (closeToBoundaryLeft || closeToBoundaryRight) {
        const targetIndex = closeToBoundaryLeft
          ? columnIndex
          : columnIndex + colSpan
        setLineHoverIndex(refs, [rowIndex, targetIndex], 'col')
        positionLineHandle(
          yHandle,
          dom.col,
          closeToBoundaryLeft ? 'left' : 'right',
          closeToBoundaryLeft ? -yHandle.getBoundingClientRect().width : 0
        )
        updateLineHandlePosition(yHandle, tableRect, tableRect.height, 'y')
        yHandle.dataset.show = 'true'
      } else {
        yHandle.dataset.show = 'false'
      }

      if (closeToBoundaryTop || closeToBoundaryBottom) {
        const targetIndex = closeToBoundaryTop
          ? rowIndex
          : rowIndex + rowSpan
        setLineHoverIndex(refs, [targetIndex, columnIndex], 'row')
        positionLineHandle(
          xHandle,
          dom.row,
          closeToBoundaryTop ? 'top' : 'bottom',
          closeToBoundaryTop ? -xHandle.getBoundingClientRect().height : 0
        )
        updateLineHandlePosition(xHandle, tableRect, tableRect.width, 'x')
        xHandle.dataset.show = 'true'
      } else {
        xHandle.dataset.show = 'false'
      }

      return
    }

    clearLineHoverIndex(refs)

    yHandle.dataset.show = 'false'
    xHandle.dataset.show = 'false'

    const columnCount = getColumnCount(table)
    if (actualIndex[1] >= columnCount) return

    computeRowHandlePositionByIndex({ refs, index: actualIndex })
    computeColHandlePositionByIndex({ refs, index: actualIndex })
    computeCellHandlePositionByIndex({ refs, index: actualIndex })
    hoverIndex.value = actualIndex
  }, 20)
}

function createPointerLeaveHandler(refs: Refs): () => void {
  return () => {
    const { rowHandleRef, colHandleRef, cellHandleRef, yLineHandleRef, xLineHandleRef } = refs
    setTimeout(() => {
      const rowHandle = rowHandleRef.value
      if (!rowHandle) return
      const colHandle = colHandleRef.value
      if (!colHandle) return
      const cellHandle = cellHandleRef.value
      if (!cellHandle) return
      const yHandle = yLineHandleRef.value
      if (!yHandle) return
      const xHandle = xLineHandleRef.value
      if (!xHandle) return

      rowHandle.dataset.show = 'false'
      colHandle.dataset.show = 'false'
      cellHandle.dataset.show = 'false'
      yHandle.dataset.show = 'false'
      xHandle.dataset.show = 'false'
    }, 200)
  }
}

export function usePointerHandlers(refs: Refs, view?: EditorView) {
  const pointerMove = createPointerMoveHandler(refs, view)
  const pointerLeave = createPointerLeaveHandler(refs)

  return {
    pointerMove,
    pointerLeave,
  }
}
