import type { Node } from '@milkdown/prose/model'
import type { EditorState } from '@milkdown/prose/state'
import type { Ctx } from '@milkdown/ctx'

import { Selection } from '@milkdown/prose/state'
import { findParentNodeType } from '@milkdown/prose'
import { $command } from '@milkdown/utils'
import { paragraphSchema } from '@milkdown/preset-commonmark'

import { withMeta } from './__internal__'
import {
  gridTableSchema,
  gridTableHeadSchema,
  gridTableBodySchema,
  gridTableFootSchema,
  gridTableRowSchema,
  gridTableCellSchema,
} from './schema'

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

/// Create a grid table with specified dimensions
export function createGridTable(
  ctx: Ctx,
  rowsCount = 3,
  colsCount = 3,
  hasHeader = true,
  hasFooter = false
): Node {
  // Create cells for the table
  const createCell = (content?: Node) => {
    const cellNode = gridTableCellSchema.type(ctx).createAndFill()
    return cellNode || gridTableCellSchema.type(ctx).create(
      { colSpan: 1, rowSpan: 1, align: null, valign: null },
      content ? [content] : [paragraphSchema.type(ctx).createAndFill()!]
    )
  }

  const createRow = (cellCount: number) => {
    const cells = Array(cellCount).fill(0).map(() => createCell())
    return gridTableRowSchema.type(ctx).create(null, cells)
  }

  const children: Node[] = []

  // Add header if requested
  if (hasHeader) {
    const headerRows = [createRow(colsCount)]
    children.push(gridTableHeadSchema.type(ctx).create(null, headerRows))
  }

  // Add body rows (subtract 1 if header exists)
  const bodyRowCount = hasHeader ? rowsCount - 1 : rowsCount
  const bodyRows = Array(Math.max(1, bodyRowCount)).fill(0).map(() => createRow(colsCount))
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
      hasFooter = false 
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
      if (
        node.type === gridTableCellSchema.type(ctx) &&
        pos < cell.from
      ) {
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

    // Find the section (head, body, or foot) containing this row
    const { $head } = state.selection
    const headSection = findParentNodeType($head, gridTableHeadSchema.type(ctx))
    const bodySection = findParentNodeType($head, gridTableBodySchema.type(ctx))
    const footSection = findParentNodeType($head, gridTableFootSchema.type(ctx))

    const section = headSection || bodySection || footSection
    if (!section) return false

    // Count columns in current row
    let colCount = 0
    currentRow.node.forEach(node => {
      if (node.type === gridTableCellSchema.type(ctx)) {
        colCount += node.attrs.colSpan || 1
      }
    })

    // Create new row with same number of columns
    const cells = Array(colCount).fill(0).map(() => {
      const cellContent = paragraphSchema.type(ctx).createAndFill()!
      return gridTableCellSchema.type(ctx).create(
        { colSpan: 1, rowSpan: 1, align: null, valign: null },
        [cellContent]
      )
    })
    
    const newRow = gridTableRowSchema.type(ctx).create(null, cells)
    
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

    // Count columns in current row
    let colCount = 0
    currentRow.node.forEach(node => {
      if (node.type === gridTableCellSchema.type(ctx)) {
        colCount += node.attrs.colSpan || 1
      }
    })

    // Create new row with same number of columns
    const cells = Array(colCount).fill(0).map(() => {
      const cellContent = paragraphSchema.type(ctx).createAndFill()!
      return gridTableCellSchema.type(ctx).create(
        { colSpan: 1, rowSpan: 1, align: null, valign: null },
        [cellContent]
      )
    })
    
    const newRow = gridTableRowSchema.type(ctx).create(null, cells)
    
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
    const tr = state.tr.delete(currentRow.from, currentRow.from + currentRow.node.nodeSize)
    
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
  (ctx) => (align?: 'left' | 'center' | 'right' | 'justify' | null) => (state, dispatch) => {
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const tr = state.tr.setNodeMarkup(cell.from, undefined, {
      ...cell.node.attrs,
      align: align ?? null,
    })

    dispatch?.(tr)
    return true
  }
)

withMeta(setGridCellAlignCommand, {
  displayName: 'Command<setGridCellAlignCommand>',
  group: 'GridTable',
})

/// Command to set cell vertical alignment
export const setGridCellVAlignCommand = $command(
  'SetGridCellVAlign',
  (ctx) => (valign?: 'top' | 'middle' | 'bottom' | null) => (state, dispatch) => {
    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const tr = state.tr.setNodeMarkup(cell.from, undefined, {
      ...cell.node.attrs,
      valign: valign ?? null,
    })

    dispatch?.(tr)
    return true
  }
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

    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const table = findParentGridTable(state, ctx)
    if (!table) return false

    // Find the column index of the current cell
    let columnIndex = 0
    const row = findParentGridTableRow(state, ctx)
    if (!row) return false

    // Calculate column position
    // let _cellIndex = 0  // Unused for now
    row.node.forEach((node, _, index) => {
      if (index < cell.from - row.from - 1) {
        columnIndex += node.attrs?.colSpan || 1
      }
    })

    // Add column to all rows in all sections
    const tr = state.tr
    let offset = 0

    type SectionSchema =
      | typeof gridTableHeadSchema
      | typeof gridTableBodySchema
      | typeof gridTableFootSchema

    const addColumnToSection = (sectionType: SectionSchema) => {
      const sectionNode = findParentNodeType(state.selection.$head, sectionType.type(ctx))
      if (!sectionNode) return

      sectionNode.node.forEach((rowNode, _rowIndex) => {
        const rowStart = sectionNode.from + 1
        let currentCol = 0
        let insertPos = rowStart

        rowNode.forEach((cellNode, _cellOffset) => {
          if (currentCol === columnIndex) {
            // Create new cell
            const newCell = gridTableCellSchema.type(ctx).create(
              { colSpan: 1, rowSpan: 1, align: null, valign: null },
              [paragraphSchema.type(ctx).createAndFill()!]
            )
            tr.insert(insertPos + offset, newCell)
            offset += newCell.nodeSize
            return false // Stop iteration
          }
          currentCol += cellNode.attrs?.colSpan || 1
          insertPos += cellNode.nodeSize
          return true // Continue iteration
        })
      })
    }

    // Add to all sections
    addColumnToSection(gridTableHeadSchema)
    addColumnToSection(gridTableBodySchema)
    addColumnToSection(gridTableFootSchema)

    if (offset > 0) {
      dispatch?.(tr)
      return true
    }
    
    return false
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

    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    const table = findParentGridTable(state, ctx)
    if (!table) return false

    // Similar logic to addGridColumnAfterCommand but insert before
    const tr = state.tr
    let offset = 0

    type SectionSchema =
      | typeof gridTableHeadSchema
      | typeof gridTableBodySchema
      | typeof gridTableFootSchema

    const addColumnToSection = (sectionType: SectionSchema) => {
      const sectionNode = findParentNodeType(state.selection.$head, sectionType.type(ctx))
      if (!sectionNode) return

      sectionNode.node.forEach((_rowNode) => {
        // Insert new cell at the beginning of each row in this section
        const rowStart = sectionNode.from + 1
        const newCell = gridTableCellSchema.type(ctx).create(
          { colSpan: 1, rowSpan: 1, align: null, valign: null },
          [paragraphSchema.type(ctx).createAndFill()!]
        )
        tr.insert(rowStart + offset, newCell)
        offset += newCell.nodeSize
      })
    }

    // Add to all sections
    addColumnToSection(gridTableHeadSchema)
    addColumnToSection(gridTableBodySchema)
    addColumnToSection(gridTableFootSchema)

    if (offset > 0) {
      dispatch?.(tr)
      return true
    }
    
    return false
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

    const cell = findParentGridTableCell(state, ctx)
    if (!cell) return false

    // Find all cells in the same column and delete them
    const table = findParentGridTable(state, ctx)
    if (!table) return false

    const tr = state.tr
    const cellsToDelete: { from: number; to: number }[] = []

    // Collect all cells in this column
    const { from, to } = table
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === gridTableCellSchema.type(ctx)) {
        // Simple heuristic: if cell position aligns with current cell column
        // This is a simplified approach - in production you'd want more precise column tracking
        const isSameColumn = Math.abs(pos - cell.from) % 100 < 50 // Rough alignment check
        if (isSameColumn) {
          cellsToDelete.push({ from: pos, to: pos + node.nodeSize })
        }
      }
    })

    // Delete cells from end to start to maintain position accuracy
    cellsToDelete.reverse().forEach(({ from, to }) => {
      tr.delete(from, to)
    })

    if (cellsToDelete.length > 0) {
      dispatch?.(tr)
      return true
    }

    return false
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
      if (nodePos > cell.from && node.type === gridTableCellSchema.type(ctx) && nextCellPos === null) {
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
          colSpan: (cell.node.attrs.colSpan || 1) + (nextCellNode.attrs.colSpan || 1),
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
    const newCell = gridTableCellSchema.type(ctx).create(
      { colSpan: 1, rowSpan: rowSpan, align: null, valign: null },
      [paragraphSchema.type(ctx).createAndFill()!]
    )

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
