import type { EditorView } from '@milkdown/prose/view'

import { computePosition, offset } from '@floating-ui/dom'
import { throttle } from 'lodash-es'

import type { Refs } from './types'

import {
  computeColHandlePositionByIndex,
  computeRowHandlePositionByIndex,
  findCellAtColumn,
  findPointerIndex,
  getRelatedDOM,
} from './utils'

export interface PointerOptions {
  allowHeaderRowInsertion?: boolean
}

function createPointerMoveHandler(
  refs: Refs,
  view: EditorView | undefined,
  options: PointerOptions = {}
): (e: PointerEvent) => void {
  // Hysteresis: track if we're currently in boundary mode to prevent flicker
  let isInBoundaryMode = false

  return throttle((e: PointerEvent) => {
    if (!view?.editable) return
    
    // Stop propagation to prevent hover handlers from the @milkdown/plugin-gridtables plugin
    // (and similar table plugins) from firing. This is necessary because those plugins also
    // listen for pointer events and may update their own hover state, leading to conflicting
    // state updates and unnecessary re-renders or UI flicker.
    e.stopPropagation()
    
    const {
      contentWrapperRef,
      yLineHandleRef,
      xLineHandleRef,
      colHandleRef,
      rowHandleRef,
      hoverIndex,
      lineHoverIndex,
    } = refs
    const yHandle = yLineHandleRef.value
    if (!yHandle) return
    const xHandle = xLineHandleRef.value
    if (!xHandle) return
    const content = contentWrapperRef.value
    if (!content) return
    const rowHandle = rowHandleRef.value
    if (!rowHandle) return
    const colHandle = colHandleRef.value
    if (!colHandle) return

    let index = findPointerIndex(e, view)
    // If detection fails, use last known index to maintain state (prevents flicker)
    if (!index && hoverIndex.value) {
      index = hoverIndex.value
    }
    if (!index) {
      return
    }

    const dom = getRelatedDOM(contentWrapperRef, index)
    if (!dom) {
      return
    }

    const [rowIndex, colIndex] = index
    
    const tableBoundary = content.getBoundingClientRect()
    const rowBoundary = dom.row.getBoundingClientRect()
    
    // Get all rows to calculate full column width
    const rows = content.querySelectorAll('tr')
    
    // Calculate column boundaries by finding the leftmost and rightmost edges
    // of cells in this column across all rows (accounts for colspans)
    let colLeft = Infinity
    let colRight = -Infinity
    for (const row of Array.from(rows)) {
      if (!row) continue
      // Find the cell that occupies this column index using shared utility
      const cell = findCellAtColumn(row, colIndex)
      if (cell) {
        const cellElement = cell as HTMLElement
        const cellRect = cellElement.getBoundingClientRect()
        colLeft = Math.min(colLeft, cellRect.left)
        colRight = Math.max(colRight, cellRect.right)
      }
    }
    
    // Fallback to header cell if calculation failed
    if (colLeft === Infinity) {
      const headerCol = dom.headerCol.getBoundingClientRect()
      colLeft = headerCol.left
      colRight = headerCol.right
    }
    
    // Extend row boundary horizontally past table edges (for handle tracking)
    // This allows tracking to continue when moving toward row handles outside the table
    const extendedRowBoundary = {
      left: tableBoundary.left - 100, // Extend left past table for row handle
      right: tableBoundary.right + 100, // Extend right past table
      top: rowBoundary.top,
      bottom: rowBoundary.bottom,
    }
    
    // Extend column boundary vertically past table edges (for handle tracking)
    // This allows tracking to continue when moving toward column handles outside the table
    const extendedColBoundary = {
      left: colLeft,
      right: colRight,
      top: tableBoundary.top - 100, // Extend top past table for col handle
      bottom: tableBoundary.bottom + 100, // Extend bottom past table
    }
    
    // Check if pointer is within the extended row/column boundaries
    // This allows tracking to continue when moving toward handles outside the table
    const isInRow = 
      e.clientY >= extendedRowBoundary.top &&
      e.clientY <= extendedRowBoundary.bottom
    
    const isInCol = 
      e.clientX >= extendedColBoundary.left &&
      e.clientX <= extendedColBoundary.right
    
    // Only show handles if we're tracking the row or column
    if (!isInRow && !isInCol) {
      // Pointer is outside both extended boundaries, hide handles
      rowHandle.dataset.show = 'false'
      colHandle.dataset.show = 'false'
      yHandle.dataset.show = 'false'
      xHandle.dataset.show = 'false'
      // Only update refs if they're not already reset to prevent re-renders
      if (lineHoverIndex.value[0] !== -1 || lineHoverIndex.value[1] !== -1) {
        lineHoverIndex.value = [-1, -1]
      }
      if (hoverIndex.value[0] !== -1 || hoverIndex.value[1] !== -1) {
        hoverIndex.value = [-1, -1]
      }
      return
    }
    
    // Hysteresis: use 8px to enter boundary mode, 16px to exit (prevents flicker)
    const enterThreshold = 8
    const exitThreshold = 16
    
    // Check distances to TABLE boundaries (not cell/column boundaries)
    // This prevents false triggers when moving within cells
    const distTableLeft = Math.abs(e.clientX - tableBoundary.left)
    const distTableRight = Math.abs(tableBoundary.right - e.clientX)
    const distTableTop = Math.abs(e.clientY - tableBoundary.top)
    const distTableBottom = Math.abs(tableBoundary.bottom - e.clientY)
    
    // Check distances to ROW boundaries (top/bottom of the row)
    const distRowTop = Math.abs(e.clientY - rowBoundary.top)
    const distRowBottom = Math.abs(rowBoundary.bottom - e.clientY)
    
    // Check distances to COLUMN boundaries (left/right of the full column)
    const distColLeft = Math.abs(e.clientX - colLeft)
    const distColRight = Math.abs(colRight - e.clientX)
    
    // Only enter boundary mode when near TABLE edges (for line handles between rows/cols)
    // OR when near ROW/COLUMN edges (for line handles at row/col boundaries)
    const shouldEnterBoundary = 
      (distTableTop < enterThreshold || distTableBottom < enterThreshold) ||
      (distTableLeft < enterThreshold || distTableRight < enterThreshold) ||
      (distRowTop < enterThreshold || distRowBottom < enterThreshold) ||
      (distColLeft < enterThreshold || distColRight < enterThreshold)
    
    // Exit boundary mode if far from all boundaries
    const shouldExitBoundary = 
      distTableTop >= exitThreshold &&
      distTableBottom >= exitThreshold &&
      distTableLeft >= exitThreshold &&
      distTableRight >= exitThreshold &&
      distRowTop >= exitThreshold &&
      distRowBottom >= exitThreshold &&
      distColLeft >= exitThreshold &&
      distColRight >= exitThreshold
    
    // Update boundary mode state with hysteresis
    if (shouldEnterBoundary) {
      isInBoundaryMode = true
    } else if (shouldExitBoundary) {
      isInBoundaryMode = false
    }
    // Otherwise, keep current state (hysteresis)
    
    const closeToBoundary = isInBoundaryMode
    // Only show line handles when near table edges or row/column boundaries
    const closeToBoundaryLeft = closeToBoundary && (distTableLeft < exitThreshold || distColLeft < exitThreshold)
    const closeToBoundaryRight = closeToBoundary && (distTableRight < exitThreshold || distColRight < exitThreshold)
    const closeToBoundaryTop = closeToBoundary && (distTableTop < exitThreshold || distRowTop < exitThreshold)
    const closeToBoundaryBottom = closeToBoundary && (distTableBottom < exitThreshold || distRowBottom < exitThreshold)

    const rowButtonGroup = rowHandle.querySelector<HTMLElement>('.button-group')
    const colButtonGroup = colHandle.querySelector<HTMLElement>('.button-group')
    if (rowButtonGroup) rowButtonGroup.dataset.show = 'false'
    if (colButtonGroup) colButtonGroup.dataset.show = 'false'

    if (closeToBoundary) {
      const contentBoundary = content.getBoundingClientRect()
      rowHandle.dataset.show = 'false'
      colHandle.dataset.show = 'false'
      xHandle.dataset.displayType = 'tool'
      yHandle.dataset.displayType = 'tool'

      const yHandleWidth = yHandle.getBoundingClientRect().width
      const xHandleHeight = xHandle.getBoundingClientRect().height

      // display vertical line handle
      if (closeToBoundaryLeft || closeToBoundaryRight) {
        const newLineColIndex = closeToBoundaryLeft ? colIndex : colIndex + 1
        // Only update if changed to prevent re-renders
        if (lineHoverIndex.value[1] !== newLineColIndex) {
          lineHoverIndex.value = [lineHoverIndex.value[0], newLineColIndex]
        }
        computePosition(dom.col, yHandle, {
          placement: closeToBoundaryLeft ? 'left' : 'right',
          middleware: [offset(closeToBoundaryLeft ? -1 * yHandleWidth : 0)],
        })
          .then(({ x }) => {
            yHandle.dataset.show = 'true'
            Object.assign(yHandle.style, {
              height: `${contentBoundary.height}px`,
              left: `${x}px`,
            })
          })
          .catch(console.error)
      } else {
        yHandle.dataset.show = 'false'
      }

      // display horizontal line handle
      const allowInsertion = options.allowHeaderRowInsertion ?? false
      const canInsertRow = allowInsertion || rowIndex !== 0
      if (canInsertRow && (closeToBoundaryTop || closeToBoundaryBottom)) {
        const newLineRowIndex = closeToBoundaryTop ? rowIndex : rowIndex + 1
        // Only update if changed to prevent re-renders
        if (lineHoverIndex.value[0] !== newLineRowIndex) {
          lineHoverIndex.value = [newLineRowIndex, lineHoverIndex.value[1]]
        }
        computePosition(dom.row, xHandle, {
          placement: closeToBoundaryTop ? 'top' : 'bottom',
          middleware: [offset(closeToBoundaryTop ? -1 * xHandleHeight : 0)],
        })
          .then(({ y }) => {
            xHandle.dataset.show = 'true'
            Object.assign(xHandle.style, {
              width: `${contentBoundary.width}px`,
              top: `${y}px`,
            })
          })
          .catch(console.error)
      } else {
        xHandle.dataset.show = 'false'
      }

      return
    }

    lineHoverIndex.value = [-1, -1]

    yHandle.dataset.show = 'false'
    xHandle.dataset.show = 'false'
    rowHandle.dataset.show = 'true'
    colHandle.dataset.show = 'true'

    computeRowHandlePositionByIndex({
      refs,
      index,
    })
    computeColHandlePositionByIndex({
      refs,
      index,
    })
    
    hoverIndex.value = index
  }, 20)
}

function createPointerLeaveHandler(refs: Refs): () => void {
  return () => {
    const { rowHandleRef, colHandleRef, yLineHandleRef, xLineHandleRef } = refs
    setTimeout(() => {
      const rowHandle = rowHandleRef.value
      if (!rowHandle) return
      const colHandle = colHandleRef.value
      if (!colHandle) return
      const yHandle = yLineHandleRef.value
      if (!yHandle) return
      const xHandle = xLineHandleRef.value
      if (!xHandle) return

      rowHandle.dataset.show = 'false'
      colHandle.dataset.show = 'false'
      yHandle.dataset.show = 'false'
      xHandle.dataset.show = 'false'
    }, 200)
  }
}

export function usePointerHandlers(
  refs: Refs,
  view?: EditorView,
  options?: PointerOptions
) {
  const pointerMove = createPointerMoveHandler(refs, view, options)
  const pointerLeave = createPointerLeaveHandler(refs)

  return {
    pointerMove,
    pointerLeave,
  }
}
