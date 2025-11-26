import type { Ctx } from '@milkdown/ctx'
import type { Node } from '@milkdown/prose/model'
import type { EditorState, Transaction } from '@milkdown/prose/state'

import { paragraphSchema } from '@milkdown/preset-commonmark'
import { findParentNodeType } from '@milkdown/prose'
import { Selection } from '@milkdown/prose/state'
import { goToNextCell } from '@milkdown/prose/tables'
import { $command } from '@milkdown/utils'

import type { GridTableAlign, GridTableVAlign } from '../schema'

import { withMeta } from '../__internal__'
import {
  gridTableBodySchema,
  gridTableCellSchema,
  gridTableFootSchema,
  gridTableHeadSchema,
  gridTableRowSchema,
  gridTableSchema,
} from '../schema'

/// Utility function to find parent grid table node
function findParentGridTable(state: EditorState, ctx: Ctx) {
  const { $head } = state.selection
  return findParentNodeType($head, gridTableSchema.type(ctx))
}

/// Utility function to find parent grid table row
function findParentGridTableRow(state: EditorState, ctx: Ctx) {
  const { $head } = state.selection
  return findParentNodeType($head, gridTableRowSchema.type(ctx))
}

/// Utility function to find parent grid table cell
function findParentGridTableCell(state: EditorState, ctx: Ctx) {
  const { $head } = state.selection
  return findParentNodeType($head, gridTableCellSchema.type(ctx))
}

/// Check if cursor is inside a grid table
export function isInGridTable(state: EditorState, ctx: Ctx): boolean {
  return !!findParentGridTable(state, ctx)
}

type GridCellAttrs = {
  colspan: number
  rowspan: number
  align: GridTableAlign
  valign: GridTableVAlign
}

const defaultCellAttrs: GridCellAttrs = {
  colspan: 1,
  rowspan: 1,
  align: null,
  valign: null,
}

const mergeCellAttrs = (
  attrs: Partial<GridCellAttrs> | undefined
): GridCellAttrs => ({
  colspan: attrs?.colspan ?? defaultCellAttrs.colspan,
  rowspan: attrs?.rowspan ?? defaultCellAttrs.rowspan,
  align: (attrs?.align ?? defaultCellAttrs.align) as GridTableAlign,
  valign: (attrs?.valign ?? defaultCellAttrs.valign) as GridTableVAlign,
})

const createParagraphNode = (ctx: Ctx): Node => {
  const paragraphType = paragraphSchema.type(ctx)
  return paragraphType.createAndFill() ?? paragraphType.create()
}

const createGridCellNode = (
  ctx: Ctx,
  attrs?: Partial<GridCellAttrs>,
  content?: Node | Node[]
): Node => {
  const cellType = gridTableCellSchema.type(ctx)
  const normalizedAttrs = mergeCellAttrs(attrs)
  const cellContent = Array.isArray(content)
    ? content
    : content
    ? [content]
    : [createParagraphNode(ctx)]

  return (
    cellType.createAndFill(normalizedAttrs, cellContent) ??
    cellType.create(normalizedAttrs, cellContent)
  )
}

const createRowWithColumnCount = (ctx: Ctx, columnCount: number): Node => {
  const cells = Array.from({ length: columnCount }, () =>
    createGridCellNode(ctx)
  )
  return gridTableRowSchema.type(ctx).create(null, cells)
}

const createRowFromTemplate = (ctx: Ctx, template: Node): Node => {
  const cellType = gridTableCellSchema.type(ctx)
  const cells: Node[] = []

  template.forEach((child) => {
    if (child.type !== cellType) return

    cells.push(
      createGridCellNode(ctx, {
        colspan: child.attrs?.colspan ?? defaultCellAttrs.colspan,
        align: (child.attrs?.align ?? defaultCellAttrs.align) as GridTableAlign,
        valign: (child.attrs?.valign ?? defaultCellAttrs.valign) as GridTableVAlign,
        rowspan: defaultCellAttrs.rowspan,
      })
    )
  })

  if (!cells.length) {
    cells.push(createGridCellNode(ctx))
  }

  return gridTableRowSchema.type(ctx).create(null, cells)
}

type NodeWithFrom = {
  node: Node
  from: number
}

const getTableSections = (
  table: ReturnType<typeof findParentGridTable>,
  ctx: Ctx
): NodeWithFrom[] => {
  const sections: NodeWithFrom[] = []
  if (!table) return sections

  const sectionTypes = new Set([
    gridTableHeadSchema.type(ctx),
    gridTableBodySchema.type(ctx),
    gridTableFootSchema.type(ctx),
  ])

  const tableStart = table.from + 1

  table.node.forEach((child, offset) => {
    if (!sectionTypes.has(child.type)) return

    sections.push({
      node: child,
      from: tableStart + offset,
    })
  })

  return sections
}

const getTableRows = (
  table: ReturnType<typeof findParentGridTable>,
  ctx: Ctx
): NodeWithFrom[] => {
  const rows: NodeWithFrom[] = []
  const sections = getTableSections(table, ctx)
  const rowType = gridTableRowSchema.type(ctx)

  sections.forEach(({ node: sectionNode, from: sectionFrom }) => {
    const sectionStart = sectionFrom + 1

    sectionNode.forEach((rowNode, offset) => {
      if (rowNode.type !== rowType) return

      rows.push({
        node: rowNode,
        from: sectionStart + offset,
      })
    })
  })

  return rows
}

const getColumnMetrics = (
  ctx: Ctx,
  row: ReturnType<typeof findParentGridTableRow>,
  cell: ReturnType<typeof findParentGridTableCell>
): { index: number; span: number } | null => {
  if (!row || !cell) return null

  const cellType = gridTableCellSchema.type(ctx)
  let index = 0
  let span = defaultCellAttrs.colspan
  let found = false

  row.node.forEach((child, offset) => {
    if (found || child.type !== cellType) return

    const childPos = row.from + 1 + offset
    const childSpan = child.attrs?.colspan ?? defaultCellAttrs.colspan

    if (childPos === cell.from) {
      span = childSpan
      found = true
      return
    }

    index += childSpan
  })

  if (!found) return null
  return { index, span }
}

const getColumnInsertPos = (
  ctx: Ctx,
  rowInfo: NodeWithFrom,
  targetColumn: number
): number => {
  const cellType = gridTableCellSchema.type(ctx)
  const rowContentStart = rowInfo.from + 1
  let currentColumn = 0
  let insertPos = rowContentStart

  rowInfo.node.forEach((child, offset) => {
    if (child.type !== cellType) return
    if (currentColumn >= targetColumn) return

    insertPos = rowContentStart + offset + child.nodeSize
    currentColumn += child.attrs?.colspan ?? defaultCellAttrs.colspan
  })

  return insertPos
}

const getCellAtColumn = (
  ctx: Ctx,
  rowInfo: NodeWithFrom,
  targetColumn: number
): { from: number; to: number } | null => {
  const cellType = gridTableCellSchema.type(ctx)
  const rowContentStart = rowInfo.from + 1
  let currentColumn = 0
  let match: { from: number; to: number } | null = null

  rowInfo.node.forEach((child, offset) => {
    if (match || child.type !== cellType) return

    const span = child.attrs?.colspan ?? defaultCellAttrs.colspan
    const cellFrom = rowContentStart + offset
    const cellTo = cellFrom + child.nodeSize

    if (targetColumn >= currentColumn && targetColumn < currentColumn + span) {
      match = { from: cellFrom, to: cellTo }
      return
    }

    currentColumn += span
  })

  return match
}

const updateGridCellNodeAttrs = (
  ctx: Ctx,
  attrs: Partial<GridCellAttrs>
) =>
  (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const tr = state.tr.setNodeMarkup(cell.from, undefined, {
      ...cell.node.attrs,
      ...attrs,
    })

    dispatch?.(tr)
    return true
  }

/// Create a grid table with specified dimensions
export function createGridTable(
  ctx: Ctx,
  rowsCount = 3,
  colsCount = 3,
  hasHeader = true,
  hasFooter = false
): Node {
  // Create cells for the table
  const createRow = (cellCount: number) => createRowWithColumnCount(ctx, cellCount)

  const children: Node[] = []

  // Add header if requested
  if (hasHeader) {
    const headerRows = [createRow(colsCount)]
    children.push(gridTableHeadSchema.type(ctx).create(null, headerRows))
  }

  // Add body rows (subtract 1 if header exists)
  const bodyRowCount = hasHeader ? rowsCount - 1 : rowsCount
  const bodyRows = Array(Math.max(1, bodyRowCount))
    .fill(0)
    .map(() => createRow(colsCount))
  children.push(gridTableBodySchema.type(ctx).create(null, bodyRows))

  // Add footer if requested
  if (hasFooter) {
    const footerRows = [createRow(colsCount)]
    children.push(gridTableFootSchema.type(ctx).create(null, footerRows))
  }

  return gridTableSchema.type(ctx).create(null, children)
}

/// Command to insert a grid table
export const insertGridTableCommand = $command(
  'InsertGridTable',
  (ctx) =>
    ({
      rows = 3,
      cols = 3,
      hasHeader = true,
      hasFooter = false,
    }: {
      rows?: number
      cols?: number
      hasHeader?: boolean
      hasFooter?: boolean
    } = {}) =>
    (state, dispatch) => {
      const { selection, tr } = state
      const { from } = selection

      const table = createGridTable(ctx, rows, cols, hasHeader, hasFooter)
      const _tr = tr.replaceSelectionWith(table)

      // Position cursor in first cell
      const sel = Selection.findFrom(_tr.doc.resolve(from + 1), 1, true)
      if (sel) _tr.setSelection(sel)

      dispatch?.(_tr)
      return true
    }
)

withMeta(insertGridTableCommand, {
  displayName: 'Command<insertGridTableCommand>',
  group: 'GridTable',
})

/// Command to exit grid table and insert paragraph
export const exitGridTableCommand = $command(
  'ExitGridTable',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const tableNode = findParentGridTable(state, ctx)
    if (!tableNode) return false

    const { to } = tableNode

    const tr = state.tr.replaceWith(
      to,
      to,
      paragraphSchema.type(ctx).createAndFill()!
    )

    tr.setSelection(Selection.near(tr.doc.resolve(to), 1)).scrollIntoView()
    dispatch?.(tr)
    return true
  }
)

withMeta(exitGridTableCommand, {
  displayName: 'Command<exitGridTableCommand>',
  group: 'GridTable',
})

/// Navigate to next cell in grid table.
/// Uses prosemirror-tables' goToNextCell for consistent behavior with GFM tables.
export const goToNextGridCellCommand = $command(
  'GoToNextGridCell',
  () => () => goToNextCell(1)
)

withMeta(goToNextGridCellCommand, {
  displayName: 'Command<goToNextGridCellCommand>',
  group: 'GridTable',
})

/// Navigate to previous cell in grid table.
/// Uses prosemirror-tables' goToNextCell for consistent behavior with GFM tables.
export const goToPrevGridCellCommand = $command(
  'GoToPrevGridCell',
  () => () => goToNextCell(-1)
)

withMeta(goToPrevGridCellCommand, {
  displayName: 'Command<goToPrevGridCellCommand>',
  group: 'GridTable',
})

/// Command to add a row after the current row
export const addGridRowAfterCommand = $command(
  'AddGridRowAfter',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const currentRow = findParentGridTableRow(state, ctx)
    if (!currentRow) return false

    const newRow = createRowFromTemplate(ctx, currentRow.node)

    // Insert the new row after the current row
    const insertPos = currentRow.from + currentRow.node.nodeSize
    const tr = state.tr.insert(insertPos, newRow)

    dispatch?.(tr)
    return true
  }
)

withMeta(addGridRowAfterCommand, {
  displayName: 'Command<addGridRowAfterCommand>',
  group: 'GridTable',
})

/// Command to add a row before the current row
export const addGridRowBeforeCommand = $command(
  'AddGridRowBefore',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const currentRow = findParentGridTableRow(state, ctx)
    if (!currentRow) return false

    const newRow = createRowFromTemplate(ctx, currentRow.node)

    // Insert the new row before the current row
    const tr = state.tr.insert(currentRow.from, newRow)

    dispatch?.(tr)
    return true
  }
)

withMeta(addGridRowBeforeCommand, {
  displayName: 'Command<addGridRowBeforeCommand>',
  group: 'GridTable',
})

/// Command to delete the current row
export const deleteGridRowCommand = $command(
  'DeleteGridRow',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const currentRow = findParentGridTableRow(state, ctx)
    if (!currentRow) return false

    // Check if this is the only row in the section
    const { $head } = state.selection
    const headSection = findParentNodeType($head, gridTableHeadSchema.type(ctx))
    const bodySection = findParentNodeType($head, gridTableBodySchema.type(ctx))
    const footSection = findParentNodeType($head, gridTableFootSchema.type(ctx))

    const section = headSection || bodySection || footSection
    if (!section) return false

    // Don't delete if it's the only row in body section
    if (bodySection && section.node.childCount === 1) {
      return false
    }

    // Delete the row
    const tr = state.tr.delete(
      currentRow.from,
      currentRow.from + currentRow.node.nodeSize
    )

    dispatch?.(tr)
    return true
  }
)

withMeta(deleteGridRowCommand, {
  displayName: 'Command<deleteGridRowCommand>',
  group: 'GridTable',
})

/// Command to set cell alignment
export const setGridCellAlignCommand = $command(
  'SetGridCellAlign',
  (ctx) =>
    (align?: 'left' | 'center' | 'right' | 'justify' | null) =>
      updateGridCellNodeAttrs(ctx, { align: align ?? null })
)

withMeta(setGridCellAlignCommand, {
  displayName: 'Command<setGridCellAlignCommand>',
  group: 'GridTable',
})

/// Command to set cell vertical alignment
export const setGridCellVAlignCommand = $command(
  'SetGridCellVAlign',
  (ctx) =>
    (valign?: 'top' | 'middle' | 'bottom' | null) =>
      updateGridCellNodeAttrs(ctx, { valign: valign ?? null })
)

withMeta(setGridCellVAlignCommand, {
  displayName: 'Command<setGridCellVAlignCommand>',
  group: 'GridTable',
})

/// Command to add column after current column
export const addGridColumnAfterCommand = $command(
  'AddGridColumnAfter',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const row = findParentGridTableRow(state, ctx)
    const cell = findParentGridTableCell(state, ctx)
    const table = findParentGridTable(state, ctx)
    if (!row || !cell || !table) return false

    const metrics = getColumnMetrics(ctx, row, cell)
    if (!metrics) return false

    const targetColumn = metrics.index + metrics.span
    const rows = getTableRows(table, ctx)
    if (!rows.length) return false

    const insertions = rows.map((rowInfo) => ({
      pos: getColumnInsertPos(ctx, rowInfo, targetColumn),
      cell: createGridCellNode(ctx),
    }))

    if (!insertions.length) return false

    const tr = state.tr
    insertions
      .sort((a, b) => b.pos - a.pos)
      .forEach(({ pos, cell: newCell }) => {
        tr.insert(pos, newCell)
      })

    dispatch?.(tr)
    return true
  }
)

withMeta(addGridColumnAfterCommand, {
  displayName: 'Command<addGridColumnAfterCommand>',
  group: 'GridTable',
})

/// Command to add column before current column
export const addGridColumnBeforeCommand = $command(
  'AddGridColumnBefore',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const row = findParentGridTableRow(state, ctx)
    const cell = findParentGridTableCell(state, ctx)
    const table = findParentGridTable(state, ctx)
    if (!row || !cell || !table) return false

    const metrics = getColumnMetrics(ctx, row, cell)
    if (!metrics) return false

    const targetColumn = metrics.index
    const rows = getTableRows(table, ctx)
    if (!rows.length) return false

    const insertions = rows.map((rowInfo) => ({
      pos: getColumnInsertPos(ctx, rowInfo, targetColumn),
      cell: createGridCellNode(ctx),
    }))

    if (!insertions.length) return false

    const tr = state.tr
    insertions
      .sort((a, b) => b.pos - a.pos)
      .forEach(({ pos, cell: newCell }) => {
        tr.insert(pos, newCell)
      })

    dispatch?.(tr)
    return true
  }
)

withMeta(addGridColumnBeforeCommand, {
  displayName: 'Command<addGridColumnBeforeCommand>',
  group: 'GridTable',
})

/// Command to delete current column
export const deleteGridColumnCommand = $command(
  'DeleteGridColumn',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const row = findParentGridTableRow(state, ctx)
    const cell = findParentGridTableCell(state, ctx)
    const table = findParentGridTable(state, ctx)
    if (!row || !cell || !table) return false

    const metrics = getColumnMetrics(ctx, row, cell)
    if (!metrics) return false

    const targetColumn = metrics.index
    const rows = getTableRows(table, ctx)
    if (!rows.length) return false

    const deletions = rows
      .map((rowInfo) => getCellAtColumn(ctx, rowInfo, targetColumn))
      .filter((item): item is { from: number; to: number } => !!item)

    if (!deletions.length) return false

    const tr = state.tr
    deletions
      .sort((a, b) => b.from - a.from)
      .forEach(({ from, to }) => {
        tr.delete(from, to)
      })

    dispatch?.(tr)
    return true
  }
)

withMeta(deleteGridColumnCommand, {
  displayName: 'Command<deleteGridColumnCommand>',
  group: 'GridTable',
})

/// Command to merge current cell with cell to the right (increase colspan)
export const mergeGridCellRightCommand = $command(
  'MergeGridCellRight',
  (ctx) => () => (state, dispatch) => {
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    // Find the next cell in the same row
    const row = findParentGridTableRow(state, ctx)
    if (!row) return false

    let nextCellPos: number | null = null
    row.node.forEach((node, offset) => {
      const nodePos = row.from + 1 + offset
      if (
        nodePos > cell.from &&
        node.type === gridTableCellSchema.type(ctx) &&
        nextCellPos === null
      ) {
        nextCellPos = nodePos
        return false
      }
      return true
    })

    if (nextCellPos !== null) {
      const nextCell = state.doc.resolve(nextCellPos)
      const nextCellNode = nextCell.parent

      // Merge cells by increasing colspan and removing the next cell
      const tr = state.tr
        .setNodeMarkup(cell.from, undefined, {
          ...cell.node.attrs,
          colspan:
            (cell.node.attrs.colspan || 1) + (nextCellNode.attrs.colspan || 1),
        })
        .delete(nextCellPos, nextCellPos + nextCellNode.nodeSize)

      dispatch?.(tr)
      return true
    }

    return false
  }
)

withMeta(mergeGridCellRightCommand, {
  displayName: 'Command<mergeGridCellRightCommand>',
  group: 'GridTable',
})

/// Command to split current cell (decrease colspan)
export const splitGridCellCommand = $command(
  'SplitGridCell',
  (ctx) => () => (state, dispatch) => {
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const { colspan = 1, rowspan = 1 } = cell.node.attrs
    if (colspan <= 1) return false // Can't split single-column cell

    // Create new cell
    const newCell = createGridCellNode(ctx, {
      colspan: 1,
      rowspan,
      align: (cell.node.attrs.align ?? defaultCellAttrs.align) as GridTableAlign,
      valign: (cell.node.attrs.valign ?? defaultCellAttrs.valign) as GridTableVAlign,
    })

    // Update current cell colspan and insert new cell
    const tr = state.tr
      .setNodeMarkup(cell.from, undefined, {
        ...cell.node.attrs,
        colspan: colspan - 1,
      })
      .insert(cell.from + cell.node.nodeSize, newCell)

    dispatch?.(tr)
    return true
  }
)

withMeta(splitGridCellCommand, {
  displayName: 'Command<splitGridCellCommand>',
  group: 'GridTable',
})

/// Command to select a row by index
export const selectGridRowCommand = $command(
  'SelectGridRow',
  (ctx) =>
    (payload: { index: number; pos?: number } = { index: 0 }) =>
    (state, dispatch) => {
      const pos = payload.pos ?? state.selection.from
      const $pos = state.doc.resolve(pos)
      const table = findParentNodeType($pos, gridTableSchema.type(ctx))
      if (!table) return false

      const rows = getTableRows(table, ctx)
      const targetRow = rows[payload.index]
      if (!targetRow) return false

      // Select the first cell in the row
      const cellType = gridTableCellSchema.type(ctx)
      let firstCellPos: number | null = null

      targetRow.node.forEach((child, offset) => {
        if (firstCellPos === null && child.type === cellType) {
          firstCellPos = targetRow.from + 1 + offset + 1
        }
      })

      if (firstCellPos !== null) {
        const sel = Selection.near(state.doc.resolve(firstCellPos), 1)
        dispatch?.(state.tr.setSelection(sel))
        return true
      }

      return false
    }
)

withMeta(selectGridRowCommand, {
  displayName: 'Command<selectGridRowCommand>',
  group: 'GridTable',
})

/// Command to select a column by index
export const selectGridColCommand = $command(
  'SelectGridCol',
  (ctx) =>
    (payload: { index: number; pos?: number } = { index: 0 }) =>
    (state, dispatch) => {
      const pos = payload.pos ?? state.selection.from
      const $pos = state.doc.resolve(pos)
      const table = findParentNodeType($pos, gridTableSchema.type(ctx))
      if (!table) return false

      const rows = getTableRows(table, ctx)
      if (!rows.length) return false

      // Find the cell at the given column index in the first row
      const firstRow = rows[0]
      if (!firstRow) return false

      const cellMatch = getCellAtColumn(ctx, firstRow, payload.index)
      if (!cellMatch) return false

      // Select inside the cell
      const sel = Selection.near(state.doc.resolve(cellMatch.from + 1), 1)
      dispatch?.(state.tr.setSelection(sel))
      return true
    }
)

withMeta(selectGridColCommand, {
  displayName: 'Command<selectGridColCommand>',
  group: 'GridTable',
})

/// Command to move a row from one position to another
export const moveGridRowCommand = $command(
  'MoveGridRow',
  (ctx) =>
    (payload: { from: number; to: number; pos?: number } = { from: 0, to: 0 }) =>
    (state, dispatch) => {
      const { from, to, pos } = payload
      const resolvePos = pos ?? state.selection.from
      const $pos = state.doc.resolve(resolvePos)
      const table = findParentNodeType($pos, gridTableSchema.type(ctx))
      if (!table) return false

      const rows = getTableRows(table, ctx)
      if (from < 0 || from >= rows.length || to < 0 || to >= rows.length)
        return false
      if (from === to) return false

      const sourceRow = rows[from]
      if (!sourceRow) return false

      const tr = state.tr

      // Clone the row node
      const rowCopy = sourceRow.node.copy(sourceRow.node.content)

      // Delete the source row first
      tr.delete(sourceRow.from, sourceRow.from + sourceRow.node.nodeSize)

      // Recalculate positions after deletion
      const updatedRows = getTableRows(
        findParentNodeType(tr.doc.resolve(resolvePos), gridTableSchema.type(ctx)),
        ctx
      )

      // Determine insert position
      let insertPos: number
      if (to >= updatedRows.length) {
        // Insert at the end
        const lastRow = updatedRows[updatedRows.length - 1]
        insertPos = lastRow
          ? lastRow.from + lastRow.node.nodeSize
          : table.from + 1
      } else {
        insertPos = updatedRows[to]?.from ?? table.from + 1
      }

      tr.insert(insertPos, rowCopy)

      dispatch?.(tr)
      return true
    }
)

withMeta(moveGridRowCommand, {
  displayName: 'Command<moveGridRowCommand>',
  group: 'GridTable',
})

/// Command to move a column from one position to another
export const moveGridColCommand = $command(
  'MoveGridCol',
  (ctx) =>
    (payload: { from: number; to: number; pos?: number } = { from: 0, to: 0 }) =>
    (state, dispatch) => {
      const { from, to, pos } = payload
      const resolvePos = pos ?? state.selection.from
      const $pos = state.doc.resolve(resolvePos)
      const table = findParentNodeType($pos, gridTableSchema.type(ctx))
      if (!table) return false

      if (from === to) return false

      const rows = getTableRows(table, ctx)
      if (!rows.length) return false

      const tr = state.tr
      const cellType = gridTableCellSchema.type(ctx)

      // For each row, move the cell from 'from' column to 'to' column
      // Process rows in reverse order to maintain position validity
      const operations: Array<{
        deleteFrom: number
        deleteTo: number
        insertPos: number
        cell: Node
      }> = []

      for (const rowInfo of rows) {
        const rowContentStart = rowInfo.from + 1
        let currentColumn = 0
        let sourceCellFrom = -1
        let sourceCellTo = -1
        let sourceCellNode: Node | null = null
        let targetInsertPos: number | null = null

        rowInfo.node.forEach((child, offset) => {
          if (child.type !== cellType) return

          const cellFrom = rowContentStart + offset
          const cellTo = cellFrom + child.nodeSize
          const span = child.attrs?.colspan ?? 1

          // Find source cell
          if (currentColumn === from) {
            sourceCellFrom = cellFrom
            sourceCellTo = cellTo
            sourceCellNode = child
          }

          // Find target insert position
          if (currentColumn === to) {
            targetInsertPos = from < to ? cellTo : cellFrom
          }

          currentColumn += span
        })

        // Handle edge case: inserting at the end
        if (targetInsertPos === null && to >= currentColumn) {
          targetInsertPos = rowInfo.from + rowInfo.node.nodeSize
        }

        if (sourceCellNode && targetInsertPos !== null) {
          operations.push({
            deleteFrom: sourceCellFrom,
            deleteTo: sourceCellTo,
            insertPos: targetInsertPos,
            cell: sourceCellNode,
          })
        }
      }

      // Apply operations in reverse order (by position) to maintain validity
      operations.sort((a, b) => {
        // Process deletes and inserts carefully
        return b.deleteFrom - a.deleteFrom
      })

      for (const op of operations) {
        // If moving right, delete first then insert
        // If moving left, insert first then delete
        if (from < to) {
          tr.delete(op.deleteFrom, op.deleteTo)
          // Adjust insert position after delete
          const adjustedInsertPos =
            op.insertPos > op.deleteTo
              ? op.insertPos - (op.deleteTo - op.deleteFrom)
              : op.insertPos
          tr.insert(adjustedInsertPos, op.cell)
        } else {
          tr.insert(op.insertPos, op.cell)
          // Adjust delete position after insert
          const adjustedDeleteFrom = op.deleteFrom + op.cell.nodeSize
          const adjustedDeleteTo = op.deleteTo + op.cell.nodeSize
          tr.delete(adjustedDeleteFrom, adjustedDeleteTo)
        }
      }

      dispatch?.(tr)
      return true
    }
)

withMeta(moveGridColCommand, {
  displayName: 'Command<moveGridColCommand>',
  group: 'GridTable',
})

/// All grid table commands
export const gridTableCommands = [
  insertGridTableCommand,
  exitGridTableCommand,
  goToNextGridCellCommand,
  goToPrevGridCellCommand,
  addGridRowAfterCommand,
  addGridRowBeforeCommand,
  deleteGridRowCommand,
  addGridColumnAfterCommand,
  addGridColumnBeforeCommand,
  deleteGridColumnCommand,
  setGridCellAlignCommand,
  setGridCellVAlignCommand,
  mergeGridCellRightCommand,
  splitGridCellCommand,
  selectGridRowCommand,
  selectGridColCommand,
  moveGridRowCommand,
  moveGridColCommand,
].flat()
