import type { Node } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import type { Ref } from 'vue'

import { computePosition, offset } from '@floating-ui/dom'
import { findParent } from '@milkdown/prose'
import { TextSelection } from '@milkdown/prose/state'

import type { CellIndex, Refs } from './types'

function findNodeIndex(parent: Node, child: Node) {
  for (let i = 0; i < parent.childCount; i++) {
    if (parent.child(i) === child) return i
  }
  return -1
}

function findRowIndex(table: Node, row: Node) {
  let index = 0
  let result = -1

  table.forEach((section) => {
    if (result !== -1) return
    const name = section.type.name
    if (
      name !== 'gridTableHead' &&
      name !== 'gridTableBody' &&
      name !== 'gridTableFoot'
    )
      return

    section.forEach((rowNode) => {
      if (result !== -1) return
      if (rowNode === row) {
        result = index
        return
      }
      index += 1
    })

  })

  return result
}

function getCellAtColumn(row: HTMLTableRowElement, columnIndex: number) {
  let current = 0
  const cells = Array.from(row.cells) as HTMLTableCellElement[]
  for (const cell of cells) {
    const span = cell.colSpan || 1
    if (columnIndex >= current && columnIndex < current + span) return cell
    current += span
  }
  return undefined
}

function getColumnIndexForCell(row: HTMLTableRowElement, target: Element) {
  let current = 0
  const cells = Array.from(row.cells)
  for (const cell of cells) {
    const span = (cell as HTMLTableCellElement).colSpan || 1
    if (cell === target) return current
    current += span
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
    const pos = posAtCoords.inside
    if (pos == null || pos < 0) return

    const $pos = view.state.doc.resolve(pos)
    const node = view.state.doc.nodeAt(pos)
    if (!node) return

    const cellType = ['gridTableCell']
    const rowType = ['gridTableRow']

    const cell = cellType.includes(node.type.name)
      ? node
      : findParent((node) => cellType.includes(node.type.name))($pos)?.node
    const row = findParent((node) => rowType.includes(node.type.name))($pos)?.node
    const table = findParent((node) => node.type.name === 'gridTable')($pos)?.node
    if (!cell || !row || !table) return

    const columnIndex = findNodeIndex(row, cell)
    const rowIndex = findRowIndex(table, row)

    if (columnIndex < 0 || rowIndex < 0) return

    return [rowIndex, columnIndex]
  } catch {
    return undefined
  }
}

function getRowByIndex(table: HTMLTableElement | undefined, rowIndex: number) {
  if (!table) return undefined
  return table.rows[rowIndex]
}

export function getRelatedDOM(
  contentWrapperRef: Ref<HTMLTableElement | undefined>,
  [rowIndex, columnIndex]: CellIndex
) {
  const table = contentWrapperRef.value
  if (!table) return

  const row = getRowByIndex(table, rowIndex)
  if (!row) return

  const headerRow = getRowByIndex(table, 0)
  const col = getCellAtColumn(row, columnIndex)
  if (!col) return
  const headerCol = headerRow
    ? getCellAtColumn(headerRow, columnIndex) ?? col
    : col

  return {
    row,
    col,
    headerCol,
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

export function computeCellHandlePositionByIndex({
  refs,
  index,
  before,
  after,
}: ComputeHandlePositionByIndexProps) {
  const { contentWrapperRef, cellHandleRef, hoverIndex } = refs
  const cellHandle = cellHandleRef.value
  if (!cellHandle) return

  hoverIndex.value = index
  const dom = getRelatedDOM(contentWrapperRef, index)
  if (!dom) return
  const { col } = dom
  cellHandle.dataset.show = 'true'
  const colspan = col.colSpan || 1
  const rowspan = col.rowSpan || 1
  cellHandle.dataset.colspan = String(colspan)
  cellHandle.dataset.rowspan = String(rowspan)
  if (before) before(cellHandle)
  computePosition(col, cellHandle, { placement: 'top' })
    .then(({ x, y }) => {
      Object.assign(cellHandle.style, {
        left: `${x}px`,
        top: `${y}px`,
      })
      if (after) after(cellHandle)
    })
    .catch(console.error)
}

export function recoveryStateBetweenUpdate(
  refs: Refs,
  view?: EditorView,
  node?: Node
) {
  if (!node) return
  if (!view) return

  const { selection } = view.state
  const $from = selection.$from
  const table = findParent((node) => node.type.name === 'gridTable')($from)
  if (!table || table.node !== node) return

  const row = findParent((node) => node.type.name === 'gridTableRow')($from)
  const cell = findParent((node) => node.type.name === 'gridTableCell')($from)
  if (!row || !cell) return

  const rowIndex = findRowIndex(table.node, row.node)
  const columnIndex = findNodeIndex(row.node, cell.node)
  if (rowIndex < 0 || columnIndex < 0) return

  const index: CellIndex = [rowIndex, columnIndex]
  computeRowHandlePositionByIndex({ refs, index })
  computeColHandlePositionByIndex({ refs, index })
  computeCellHandlePositionByIndex({ refs, index })
}

export function findLineInsertIndex(
  table: HTMLTableElement,
  dimension: 'row' | 'col'
) {
  if (dimension === 'row') return table.rows.length
  const firstRow = table.rows[0]
  if (!firstRow) return 0
  let count = 0
  for (const cell of Array.from(firstRow.cells) as HTMLTableCellElement[]) {
    count += cell.colSpan || 1
  }
  return count
}

export function getColumnIndexFromDom(
  table: HTMLTableElement,
  rowIndex: number,
  cell: HTMLTableCellElement
) {
  const row = getRowByIndex(table, rowIndex)
  if (!row) return -1
  return getColumnIndexForCell(row, cell)
}

export function getColumnCount(table: HTMLTableElement) {
  const firstRow = table.rows[0]
  if (!firstRow) return 0
  let count = 0
  for (const cell of Array.from(firstRow.cells) as HTMLTableCellElement[]) {
    count += cell.colSpan || 1
  }
  return count
}

export function getCellByIndex(
  table: HTMLTableElement,
  [rowIndex, columnIndex]: CellIndex
) {
  const row = getRowByIndex(table, rowIndex)
  if (!row) return undefined
  return getCellAtColumn(row, columnIndex)
}

export function selectCell(
  view: EditorView | undefined,
  cell: HTMLTableCellElement | undefined
) {
  if (!cell || !view) return false
  const pos = view.posAtDOM(cell, 0)
  if (pos == null) return false
  const tr = view.state.tr.setSelection(
    TextSelection.near(view.state.doc.resolve(pos + 1))
  )
  view.dispatch(tr)
  return true
}

export function setLineHoverIndex(
  refs: Refs,
  lineIndex: CellIndex,
  type: 'row' | 'col'
) {
  const { lineHoverIndex } = refs
  if (type === 'row') {
    lineHoverIndex.value[0] = lineIndex[0]
  } else {
    lineHoverIndex.value[1] = lineIndex[1]
  }
}

export function clearLineHoverIndex(refs: Refs) {
  refs.lineHoverIndex.value = [-1, -1]
}

export function hideButtonGroups(...handles: (HTMLElement | null | undefined)[]) {
  handles.forEach((handle) => {
    handle?.querySelector('.button-group')?.setAttribute('data-show', 'false')
  })
}

export function updateLineHandlePosition(
  handle: HTMLDivElement,
  rect: DOMRect,
  size: number,
  axis: 'x' | 'y'
) {
  if (axis === 'x') {
    Object.assign(handle.style, {
      width: `${size}px`,
      top: `${rect.y}px`,
    })
  } else {
    Object.assign(handle.style, {
      height: `${size}px`,
      left: `${rect.x}px`,
    })
  }
}

export function positionLineHandle(
  handle: HTMLDivElement,
  anchor: Element,
  placement: 'top' | 'bottom' | 'left' | 'right',
  middlewareOffset: number
) {
  computePosition(anchor, handle, {
    placement,
    middleware: [offset(middlewareOffset)],
  })
    .then(({ x, y }) => {
      if (placement === 'left' || placement === 'right') {
        handle.style.left = `${x}px`
      } else {
        handle.style.top = `${y}px`
      }
    })
    .catch(console.error)
}
