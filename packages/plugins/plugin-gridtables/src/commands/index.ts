import type { Node } from '@milkdown/prose/model'
import type { EditorState, Transaction } from '@milkdown/prose/state'
import type { Ctx } from '@milkdown/ctx'

import { Selection } from '@milkdown/prose/state'
import { findParentNodeType } from '@milkdown/prose'
import { $command } from '@milkdown/utils'
import { paragraphSchema } from '@milkdown/preset-commonmark'

import { withMeta } from '../__internal__'
import type { GridTableAlign, GridTableVAlign } from '../schema'
import {
  gridTableSchema,
  gridTableHeadSchema,
  gridTableBodySchema,
  gridTableFootSchema,
  gridTableRowSchema,
  gridTableCellSchema,
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
  colSpan: number
  rowSpan: number
  align: GridTableAlign
  valign: GridTableVAlign
}

const defaultCellAttrs: GridCellAttrs = {
  colSpan: 1,
  rowSpan: 1,
  align: null,
  valign: null,
}

const mergeCellAttrs = (
  attrs: Partial<GridCellAttrs> | undefined
): GridCellAttrs => ({
  colSpan: attrs?.colSpan ?? defaultCellAttrs.colSpan,
  rowSpan: attrs?.rowSpan ?? defaultCellAttrs.rowSpan,
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
        colSpan: child.attrs?.colSpan ?? defaultCellAttrs.colSpan,
        align: (child.attrs?.align ?? defaultCellAttrs.align) as GridTableAlign,
        valign: (child.attrs?.valign ?? defaultCellAttrs.valign) as GridTableVAlign,
        rowSpan: defaultCellAttrs.rowSpan,
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
  let span = defaultCellAttrs.colSpan
  let found = false

  row.node.forEach((child, offset) => {
    if (found || child.type !== cellType) return

    const childPos = row.from + 1 + offset
    const childSpan = child.attrs?.colSpan ?? defaultCellAttrs.colSpan

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
    currentColumn += child.attrs?.colSpan ?? defaultCellAttrs.colSpan
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

    const span = child.attrs?.colSpan ?? defaultCellAttrs.colSpan
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

/// Navigate to next cell in grid table
export const goToNextGridCellCommand = $command(
  'GoToNextGridCell',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const { $head: _$head } = state.selection
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    // Find next cell by traversing the document
    let nextCellPos: number | null = null
    const table = findParentGridTable(state, ctx)
    if (!table) return false

    // Simple implementation: find next cell node after current position
    const { from, to } = table
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (
        node.type === gridTableCellSchema.type(ctx) &&
        pos > cell.from &&
        nextCellPos === null
      ) {
        nextCellPos = pos + 1 // Position inside the cell
        return false // Stop traversing
      }
      return true // Continue traversing
    })

    if (nextCellPos !== null) {
      const tr = state.tr.setSelection(
        Selection.near(state.tr.doc.resolve(nextCellPos), 1)
      )
      dispatch?.(tr)
      return true
    }

    return false
  }
)

withMeta(goToNextGridCellCommand, {
  displayName: 'Command<goToNextGridCellCommand>',
  group: 'GridTable',
})

/// Navigate to previous cell in grid table
export const goToPrevGridCellCommand = $command(
  'GoToPrevGridCell',
  (ctx) => () => (state, dispatch) => {
    if (!isInGridTable(state, ctx)) return false

    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    // Find previous cell by traversing backwards
    let prevCellPos: number | null = null
    const table = findParentGridTable(state, ctx)
    if (!table) return false

    const { from, to } = table
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === gridTableCellSchema.type(ctx) && pos < cell.from) {
        prevCellPos = pos + 1 // Position inside the cell
      }
    })

    if (prevCellPos !== null) {
      const tr = state.tr.setSelection(
        Selection.near(state.tr.doc.resolve(prevCellPos), 1)
      )
      dispatch?.(tr)
      return true
    }

    return false
  }
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

/// Command to merge current cell with cell to the right (increase colSpan)
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

      // Merge cells by increasing colSpan and removing the next cell
      const tr = state.tr
        .setNodeMarkup(cell.from, undefined, {
          ...cell.node.attrs,
          colSpan:
            (cell.node.attrs.colSpan || 1) + (nextCellNode.attrs.colSpan || 1),
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

/// Command to split current cell (decrease colSpan)
export const splitGridCellCommand = $command(
  'SplitGridCell',
  (ctx) => () => (state, dispatch) => {
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const { colSpan = 1, rowSpan = 1 } = cell.node.attrs
    if (colSpan <= 1) return false // Can't split single-column cell

    // Create new cell
    const newCell = createGridCellNode(ctx, {
      colSpan: 1,
      rowSpan,
      align: (cell.node.attrs.align ?? defaultCellAttrs.align) as GridTableAlign,
      valign: (cell.node.attrs.valign ?? defaultCellAttrs.valign) as GridTableVAlign,
    })

    // Update current cell colSpan and insert new cell
    const tr = state.tr
      .setNodeMarkup(cell.from, undefined, {
        ...cell.node.attrs,
        colSpan: colSpan - 1,
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
].flat()
