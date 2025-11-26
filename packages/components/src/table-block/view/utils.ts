import type { Node } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import type { Ref } from 'vue'

import { computePosition } from '@floating-ui/dom'
import { findParent } from '@milkdown/prose'
import { CellSelection, findTable } from '@milkdown/prose/tables'

import type { CellIndex, Refs } from './types'

function findNodeIndex(parent: Node, child: Node) {
  for (let i = 0; i < parent.childCount; i++) {
    if (parent.child(i) === child) return i
  }
  return -1
}

/**
 * Find the cell element at a given logical column index, accounting for colspans.
 * This is essential for correct handle positioning in tables with merged columns.
 *
 * @param row - The table row element to search
 * @param targetCol - The logical column index (0-based)
 * @returns The cell element that occupies the target column, or undefined if not found
 */
export function findCellAtColumn(
  row: Element,
  targetCol: number
): Element | undefined {
  let currentCol = 0
  for (const cell of Array.from(row.children)) {
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

    const gridIndex = detectIndex(
      ['gridTableCell'],
      ['gridTableRow'],
      ['gridTable']
    )
    if (gridIndex) return gridIndex

    const gfmIndex = detectIndex(
      ['table_cell', 'table_header'],
      ['table_row', 'table_header_row'],
      ['table']
    )
    if (gfmIndex) return gfmIndex

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
    return
  }
  
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) {
    return
  }
  const { headerCol: col } = dom
  if (!col) {
    return
  }
  
  // Ensure handle is visible before computing position (floating-ui needs valid dimensions)
  colHandle.dataset.show = 'true'
  // Force a DOM reflow before computePosition reads dimensions.
  // This was empirically necessary: without it, floating-ui receives stale/invalid dimensions
  // (likely because the element was just made visible via dataset.show), resulting in
  // incorrect handle positioning. Accessing offsetHeight forces the browser to recalculate layout.
  // See: https://floating-ui.com/docs/computePosition#layout-shifts
  void colHandle.offsetHeight
  
  if (before) before(colHandle)
  computePosition(col, colHandle, { placement: 'top' })
    .then(({ x, y }) => {
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
    return
  }
  
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) {
    return
  }
  const { row } = dom
  if (!row) {
    return
  }
  
  // Ensure handle is visible before computing position (floating-ui needs valid dimensions)
  rowHandle.dataset.show = 'true'
  // Force a DOM reflow before computePosition reads dimensions.
  // This was empirically necessary: without it, floating-ui receives stale/invalid dimensions
  // (likely because the element was just made visible via dataset.show), resulting in
  // incorrect handle positioning. Accessing offsetHeight forces the browser to recalculate layout.
  // See: https://floating-ui.com/docs/computePosition#layout-shifts
  void rowHandle.offsetHeight
  
  if (before) before(rowHandle)
  computePosition(row, rowHandle, { placement: 'left' })
    .then(({ x, y }) => {
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
