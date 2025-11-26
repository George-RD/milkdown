import type { Node } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import type { Ref } from 'vue'

import { computePosition } from '@floating-ui/dom'
import { findParent } from '@milkdown/prose'
import { CellSelection, findTable } from '@milkdown/prose/tables'

import type { CellIndex, Refs } from './types'

// Enable pointer debugging - set to true to see logs
const DEBUG_POINTER = true
let lastPointerDebug = 0

const debugPointer = (payload: Record<string, unknown>) => {
  if (!DEBUG_POINTER) return
  const now = Date.now()
  if (now - lastPointerDebug < 250) return
  lastPointerDebug = now
  console.log('[table-block:pointer]', payload)
}

function findNodeIndex(parent: Node, child: Node) {
  for (let i = 0; i < parent.childCount; i++) {
    if (parent.child(i) === child) return i
  }
  return -1
}

export function findPointerIndex(
  event: PointerEvent,
  view?: EditorView
): CellIndex | undefined {
  if (!view) return

  try {
    const posAtCoords = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    })
    if (!posAtCoords) return
    const pos = posAtCoords?.inside
    if (pos == null || pos < 0) return

    const $pos = view.state.doc.resolve(pos)
    const node = view.state.doc.nodeAt(pos)
    if (!node) return

    const debugContext = {
      nodeType: node.type.name,
      pos,
    }

    const detectIndex = (
      cellTypes: string[],
      rowTypes: string[],
      tableTypes: string[]
    ): CellIndex | undefined => {
      const cell = cellTypes.includes(node.type.name)
        ? node
        : findParent((n) => cellTypes.includes(n.type.name))($pos)?.node
      const row = findParent((n) => rowTypes.includes(n.type.name))($pos)?.node
      const table = findParent((n) =>
        tableTypes.includes(n.type.name)
      )($pos)?.node

      if (!cell || !row || !table) return
      const columnIndex = findNodeIndex(row, cell)
      const rowIndex = findNodeIndex(table, row)
      if (rowIndex === -1) return
      return [rowIndex, columnIndex]
    }

    const isInsideGridTable = Boolean(
      findParent((n) => n.type.name === 'gridTable')($pos)
    )

    const gridIndex = detectIndex(
      ['gridTableCell'],
      ['gridTableRow'],
      ['gridTable']
    )
    if (gridIndex) return gridIndex

    if (isInsideGridTable) {
      debugPointer({
        ...debugContext,
        reason: 'grid-detect-miss',
      })
    }

    const gfmIndex = detectIndex(
      ['table_cell', 'table_header'],
      ['table_row', 'table_header_row'],
      ['table']
    )
    if (gfmIndex) return gfmIndex

    debugPointer({
      ...debugContext,
      reason: isInsideGridTable ? 'grid-no-dom' : 'no-table-match',
    })
    return undefined
  } catch {
    return undefined
  }
}

export function getRelatedDOM(
  contentWrapperRef: Ref<HTMLElement | undefined>,
  [rowIndex, columnIndex]: CellIndex
) {
  const content = contentWrapperRef.value
  if (!content) return
  const rows = content.querySelectorAll('tr')
  const row = rows[rowIndex]
  if (!row) return

  const firstRow = rows[0]
  if (!firstRow) return

  // Find the cell at the logical column index, accounting for colspans
  const findCellAtColumn = (
    row: Element,
    targetCol: number
  ): Element | undefined => {
    let currentCol = 0
    for (let i = 0; i < row.children.length; i++) {
      const cell = row.children[i]
      const colspan = parseInt(
        (cell as HTMLElement).getAttribute('colspan') || '1',
        10
      )
      if (currentCol <= targetCol && targetCol < currentCol + colspan) {
        return cell
      }
      currentCol += colspan
    }
    return undefined
  }

  const headerCol = findCellAtColumn(firstRow, columnIndex)
  if (!headerCol) return

  const col = findCellAtColumn(row, columnIndex)
  if (!col) return

  return {
    row,
    col,
    headerCol,
  }
}

export function recoveryStateBetweenUpdate(
  refs: Refs,
  view?: EditorView,
  node?: Node
) {
  if (!node) return
  if (!view) return
  const { selection } = view.state
  if (!(selection instanceof CellSelection)) return

  const { $from } = selection
  const table = findTable($from)
  if (!table || table.node !== node) return

  const isGridTable = node.type.name === 'gridTable'

  if (selection.isColSelection()) {
    const { $head } = selection
    const colIndex = $head.index($head.depth - 1)
    computeColHandlePositionByIndex({
      refs,
      index: [0, colIndex],
      before: (handleDOM) => {
        handleDOM
          .querySelector('.button-group')
          ?.setAttribute('data-show', 'true')
      },
    })
    return
  }

  if (selection.isRowSelection()) {
    const { $head } = selection

    if (isGridTable) {
      const rowNode = findParent((n) => n.type.name === 'gridTableRow')($head)
      if (!rowNode) return
      const tableNode = findParent((n) => n.type.name === 'gridTable')($head)
      if (!tableNode) return

      const rowIndex = findNodeIndex(tableNode.node, rowNode.node)
      if (rowIndex === -1) return

      computeRowHandlePositionByIndex({
        refs,
        index: [rowIndex, 0],
        before: (handleDOM) => {
          const section = rowNode.node.attrs.section as
            | 'head'
            | 'body'
            | 'foot'
            | undefined
          if (section !== 'head') {
            handleDOM
              .querySelector('.button-group')
              ?.setAttribute('data-show', 'true')
          }
        },
      })
    } else {
      const rowNode = findParent(
        (n) =>
          n.type.name === 'table_row' || n.type.name === 'table_header_row'
      )($head)
      if (!rowNode) return
      const rowIndex = findNodeIndex(table.node, rowNode.node)
      computeRowHandlePositionByIndex({
        refs,
        index: [rowIndex, 0],
        before: (handleDOM) => {
          if (rowIndex > 0)
            handleDOM
              .querySelector('.button-group')
              ?.setAttribute('data-show', 'true')
        },
      })
    }
  }
}

interface ComputeHandlePositionByIndexProps {
  refs: Refs
  index: CellIndex
  before?: (handleDOM: HTMLDivElement) => void
  after?: (handleDOM: HTMLDivElement) => void
}

export function computeColHandlePositionByIndex({
  refs,
  index,
  before,
  after,
}: ComputeHandlePositionByIndexProps) {
  const { contentWrapperRef, colHandleRef } = refs
  const colHandle = colHandleRef.value
  if (!colHandle) {
    if (DEBUG_POINTER) {
      console.log('[table-block:computeColHandle] colHandleRef is null', { index })
    }
    return
  }
  
  // Debug: Check for duplicate handles
  if (DEBUG_POINTER) {
    const allHandles = document.querySelectorAll('[data-role="col-drag-handle"]')
    if (allHandles.length > 1) {
      console.warn('[table-block:computeColHandle] Multiple col handles found!', {
        count: allHandles.length,
        index,
        table: contentWrapperRef.value,
      })
    }
  }

  // Don't update hoverIndex here - the pointer handler already handles it conditionally
  // Setting it here would cause unnecessary Vue re-renders
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) {
    if (DEBUG_POINTER) {
      console.log('[table-block:computeColHandle] getRelatedDOM returned undefined', {
        index,
        rowCount: contentWrapperRef.value?.querySelectorAll('tr').length,
      })
    }
    return
  }
  const { headerCol: col } = dom
  if (!col) {
    if (DEBUG_POINTER) {
      console.log('[table-block:computeColHandle] headerCol is null', { index })
    }
    return
  }
  
  // Ensure handle is visible before computing position (floating-ui needs valid dimensions)
  colHandle.dataset.show = 'true'
  // Force a reflow to ensure the element is laid out
  void colHandle.offsetHeight
  
  if (DEBUG_POINTER) {
    console.log('[table-block:computeColHandle] computing position', {
      index,
      colRect: col.getBoundingClientRect(),
      handleRect: colHandle.getBoundingClientRect(),
      colVisible: col instanceof HTMLElement && col.offsetParent !== null,
      handleVisible: colHandle.offsetParent !== null,
    })
  }
  
  if (before) before(colHandle)
  computePosition(col, colHandle, { placement: 'top' })
    .then(({ x, y }) => {
      if (DEBUG_POINTER) {
        console.log('[table-block:computeColHandle] position computed', { x, y })
      }
      Object.assign(colHandle.style, {
        left: `${x}px`,
        top: `${y}px`,
      })
      if (after) after(colHandle)
    })
    .catch((error) => {
      console.error('[table-block:computeColHandle] computePosition failed', error)
    })
}

export function computeRowHandlePositionByIndex({
  refs,
  index,
  before,
  after,
}: ComputeHandlePositionByIndexProps) {
  const { contentWrapperRef, rowHandleRef } = refs
  const rowHandle = rowHandleRef.value
  if (!rowHandle) {
    if (DEBUG_POINTER) {
      console.log('[table-block:computeRowHandle] rowHandleRef is null', { index })
    }
    return
  }
  
  // Debug: Check for duplicate handles
  if (DEBUG_POINTER) {
    const allHandles = document.querySelectorAll('[data-role="row-drag-handle"]')
    if (allHandles.length > 1) {
      console.warn('[table-block:computeRowHandle] Multiple row handles found!', {
        count: allHandles.length,
        index,
        table: contentWrapperRef.value,
      })
    }
  }

  // Don't update hoverIndex here - the pointer handler already handles it conditionally
  // Setting it here would cause unnecessary Vue re-renders
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) {
    if (DEBUG_POINTER) {
      console.log('[table-block:computeRowHandle] getRelatedDOM returned undefined', {
        index,
        rowCount: contentWrapperRef.value?.querySelectorAll('tr').length,
      })
    }
    return
  }
  const { row } = dom
  if (!row) {
    if (DEBUG_POINTER) {
      console.log('[table-block:computeRowHandle] row is null', { index })
    }
    return
  }
  
  // Ensure handle is visible before computing position (floating-ui needs valid dimensions)
  rowHandle.dataset.show = 'true'
  // Force a reflow to ensure the element is laid out
  void rowHandle.offsetHeight
  
  if (DEBUG_POINTER) {
    console.log('[table-block:computeRowHandle] computing position', {
      index,
      rowRect: row.getBoundingClientRect(),
      handleRect: rowHandle.getBoundingClientRect(),
      rowVisible: row instanceof HTMLElement && row.offsetParent !== null,
      handleVisible: rowHandle.offsetParent !== null,
    })
  }
  
  if (before) before(rowHandle)
  computePosition(row, rowHandle, { placement: 'left' })
    .then(({ x, y }) => {
      if (DEBUG_POINTER) {
        console.log('[table-block:computeRowHandle] position computed', { x, y })
      }
      Object.assign(rowHandle.style, {
        left: `${x}px`,
        top: `${y}px`,
      })
      if (after) after(rowHandle)
    })
    .catch((error) => {
      console.error('[table-block:computeRowHandle] computePosition failed', error)
    })
}
