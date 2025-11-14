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
  view?: EditorView,
  leaveTimeoutRef?: { current: ReturnType<typeof setTimeout> | null }
): (e: PointerEvent) => void {
  return throttle((e: PointerEvent) => {
    // Cancel any pending pointerLeave timeout
    if (leaveTimeoutRef?.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }

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

    // Check if pointer is over any handle element - if so, maintain current handle visibility
    const target = e.target as Element | null
    const isOverHandle =
      target?.closest('[data-role="col-drag-handle"]') ||
      target?.closest('[data-role="row-drag-handle"]') ||
      target?.closest('[data-role="cell-handle"]') ||
      target?.closest('[data-role="x-line-drag-handle"]') ||
      target?.closest('[data-role="y-line-drag-handle"]')

    // If over a handle, maintain handle visibility at the last known position
    if (isOverHandle) {
      const currentIndex = hoverIndex.value
      if (currentIndex[0] >= 0 && currentIndex[1] >= 0) {
        const dom = getRelatedDOM(contentWrapperRef, currentIndex)
        if (dom) {
          // Re-compute handle positions to ensure they stay visible and properly positioned
          computeRowHandlePositionByIndex({ refs, index: currentIndex })
          computeColHandlePositionByIndex({ refs, index: currentIndex })
          computeCellHandlePositionByIndex({ refs, index: currentIndex })
          // Hide line handles when over cell handles
          yHandle.dataset.show = 'false'
          xHandle.dataset.show = 'false'
          clearLineHoverIndex(refs)
        }
      }
      return
    }

    const pointerIndex = findPointerIndex(e, view)
    if (!pointerIndex) {
      // If we can't find a cell index but we have a previous hover index,
      // maintain the handles at that position to prevent them from disappearing
      // when moving from cell towards handle
      const currentIndex = hoverIndex.value
      if (currentIndex[0] >= 0 && currentIndex[1] >= 0) {
        const dom = getRelatedDOM(contentWrapperRef, currentIndex)
        if (dom) {
          // Check if pointer is still within reasonable distance of the last known cell
          const cellRect = dom.col.getBoundingClientRect()
          const distanceX = Math.abs(e.clientX - (cellRect.left + cellRect.width / 2))
          const distanceY = Math.abs(e.clientY - (cellRect.top + cellRect.height / 2))
          const maxDistance = Math.max(cellRect.width, cellRect.height) * 2

          // If pointer is still near the cell, maintain handle visibility
          // by re-computing their positions at the last known index
          if (distanceX < maxDistance && distanceY < maxDistance) {
            // Ensure handles remain visible and positioned
            computeRowHandlePositionByIndex({ refs, index: currentIndex })
            computeColHandlePositionByIndex({ refs, index: currentIndex })
            computeCellHandlePositionByIndex({ refs, index: currentIndex })
            // Hide line handles when not at boundary
            yHandle.dataset.show = 'false'
            xHandle.dataset.show = 'false'
            clearLineHoverIndex(refs)
            return
          }
        }
      }
      // If we can't find a cell and we're not near the last known cell,
      // don't update handles but also don't hide them (let pointerLeave handle that)
      return
    }

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

function createPointerLeaveHandler(
  refs: Refs,
  leaveTimeoutRef: { current: ReturnType<typeof setTimeout> | null }
): () => void {
  return () => {
    // Cancel any existing timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
    }

    const { rowHandleRef, colHandleRef, cellHandleRef, yLineHandleRef, xLineHandleRef } = refs
    leaveTimeoutRef.current = setTimeout(() => {
      leaveTimeoutRef.current = null
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
  // Shared timeout ref to allow pointerMove to cancel pointerLeave timeout
  const leaveTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
  const pointerMove = createPointerMoveHandler(refs, view, leaveTimeoutRef)
  const pointerLeave = createPointerLeaveHandler(refs, leaveTimeoutRef)

  return {
    pointerMove,
    pointerLeave,
  }
}
