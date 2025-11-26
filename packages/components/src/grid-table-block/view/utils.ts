import type { Node } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import type { Ref } from 'vue'

import { computePosition } from '@floating-ui/dom'
import { findParent } from '@milkdown/prose'
import { CellSelection, findTable } from '@milkdown/prose/tables'

import type { CellIndex, Refs } from '../../table-block/view/types'

function findNodeIndex(parent: Node, child: Node) {
  for (let i = 0; i < parent.childCount; i++) {
    if (parent.child(i) === child) return i
  }
  return -1
}

/**
 * Find the cell and row indices for both GFM and Grid tables.
 * Grid tables have sections (head/body/foot), GFM tables have direct rows.
 */
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

    // Try Grid table first
    const gridCellTypes = ['gridTableCell']
    const gridRowTypes = ['gridTableRow']
    const gridSectionTypes = ['gridTableHead', 'gridTableBody', 'gridTableFoot']
    const gridTableTypes = ['gridTable']

    // Try GFM table
    const gfmCellTypes = ['table_cell', 'table_header']
    const gfmRowTypes = ['table_row', 'table_header_row']
    const gfmTableTypes = ['table']

    // Check if it's a grid table
    let cell = gridCellTypes.includes(node.type.name)
      ? node
      : findParent((n) => gridCellTypes.includes(n.type.name))($pos)?.node
    let row = findParent((n) => gridRowTypes.includes(n.type.name))($pos)?.node
    let table = findParent((n) => gridTableTypes.includes(n.type.name))($pos)
      ?.node

    if (cell && row && table) {
      // It's a grid table
      const columnIndex = findNodeIndex(row, cell)

      // For grid tables, calculate row index across all sections
      let rowIndex = 0
      let foundRow = false

      table.forEach((sectionNode) => {
        if (foundRow) return
        if (!gridSectionTypes.includes(sectionNode.type.name)) return

        sectionNode.forEach((rowNode) => {
          if (foundRow) return
          if (rowNode === row) {
            foundRow = true
            return
          }
          rowIndex++
        })
      })

      if (!foundRow) return
      return [rowIndex, columnIndex]
    }

    // Check if it's a GFM table
    cell = gfmCellTypes.includes(node.type.name)
      ? node
      : findParent((n) => gfmCellTypes.includes(n.type.name))($pos)?.node
    row = findParent((n) => gfmRowTypes.includes(n.type.name))($pos)?.node
    table = findParent((n) => gfmTableTypes.includes(n.type.name))($pos)?.node

    if (cell && row && table) {
      // It's a GFM table
      const columnIndex = findNodeIndex(row, cell)
      const rowIndex = findNodeIndex(table, row)
      return [rowIndex, columnIndex]
    }

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

  const headerCol = firstRow.children[columnIndex]
  if (!headerCol) return

  const col = row.children[columnIndex]
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
      // Grid table row handling
      const rowNode = findParent((n) => n.type.name === 'gridTableRow')($head)
      if (!rowNode) return
      const tableNode = findParent((n) => n.type.name === 'gridTable')($head)
      if (!tableNode) return

      let rowIndex = 0
      let foundRow = false
      const sectionTypes = ['gridTableHead', 'gridTableBody', 'gridTableFoot']

      tableNode.node.forEach((sectionNode) => {
        if (foundRow) return
        if (!sectionTypes.includes(sectionNode.type.name)) return

        sectionNode.forEach((r) => {
          if (foundRow) return
          if (r === rowNode.node) {
            foundRow = true
            return
          }
          rowIndex++
        })
      })

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
    } else {
      // GFM table row handling
      const rowTypes = ['table_row', 'table_header_row']
      const rowNode = findParent((n) => rowTypes.includes(n.type.name))($head)
      if (!rowNode) return
      const tableNode = findParent((n) => n.type.name === 'table')($head)
      if (!tableNode) return

      const rowIndex = findNodeIndex(tableNode.node, rowNode.node)

      computeRowHandlePositionByIndex({
        refs,
        index: [rowIndex, 0],
        before: (handleDOM) => {
          // For GFM tables, row 0 is the header row
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
  const { contentWrapperRef, colHandleRef, hoverIndex } = refs
  const colHandle = colHandleRef.value
  if (!colHandle) return

  hoverIndex.value = index
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) return
  const { headerCol: col } = dom
  colHandle.dataset.show = 'true'
  if (before) before(colHandle)
  computePosition(col, colHandle, { placement: 'top' })
    .then(({ x, y }) => {
      Object.assign(colHandle.style, {
        left: `${x}px`,
        top: `${y}px`,
      })
      if (after) after(colHandle)
    })
    .catch(console.error)
}

export function computeRowHandlePositionByIndex({
  refs,
  index,
  before,
  after,
}: ComputeHandlePositionByIndexProps) {
  const { contentWrapperRef, rowHandleRef, hoverIndex } = refs
  const rowHandle = rowHandleRef.value
  if (!rowHandle) return

  hoverIndex.value = index
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) return
  const { row } = dom
  rowHandle.dataset.show = 'true'
  if (before) before(rowHandle)
  computePosition(row, rowHandle, { placement: 'left' })
    .then(({ x, y }) => {
      Object.assign(rowHandle.style, {
        left: `${x}px`,
        top: `${y}px`,
      })
      if (after) after(rowHandle)
    })
    .catch(console.error)
}

