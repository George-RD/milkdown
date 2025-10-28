import type { Node as ProseNode, Schema } from '@milkdown/prose/model'
import { Fragment } from '@milkdown/prose/model'

/**
 * Checks if a gridTable node can be represented as a GFM table.
 *
 * GFM tables have these constraints:
 * - No cell spans (rowspan/colspan must all be 1)
 * - Rectangular structure (all rows have same number of cells)
 * - Single header row
 * - No footer section
 * - No vertical alignment
 * - Each cell contains exactly one paragraph
 */
export function canPromoteToGfm(gridTable: ProseNode): boolean {
  // Must have gtHead and gtBody
  let gtHead: ProseNode | null = null
  let gtBody: ProseNode | null = null
  let gtFoot: ProseNode | null = null

  gridTable.forEach((child) => {
    if (child.type.name === 'gridTableHead') gtHead = child
    else if (child.type.name === 'gridTableBody') gtBody = child
    else if (child.type.name === 'gridTableFoot') gtFoot = child
  })

  // GFM doesn't support footers
  if (gtFoot) return false

  // Must have exactly one header row
  if (!gtHead || gtHead.childCount !== 1) return false
  if (!gtBody || gtBody.childCount === 0) return false

  // Check all rows for compatibility
  const allRows: ProseNode[] = []
  gtHead.forEach((row) => allRows.push(row))
  gtBody.forEach((row) => allRows.push(row))

  const firstRowCellCount = allRows[0]?.childCount ?? 0
  if (firstRowCellCount === 0) return false

  for (const row of allRows) {
    // All rows must have same cell count (rectangular)
    if (row.childCount !== firstRowCellCount) return false

    // Check each cell
    for (let i = 0; i < row.childCount; i++) {
      const cell = row.child(i)

      // No spans allowed
      if (cell.attrs.colSpan !== 1 || cell.attrs.rowSpan !== 1) return false

      // No vertical alignment
      if (cell.attrs.valign) return false

      // Must contain exactly one paragraph
      if (cell.childCount !== 1) return false
      const firstChild = cell.firstChild
      if (!firstChild || firstChild.type.name !== 'paragraph') return false
    }
  }

  return true
}

/**
 * Converts a gridTable ProseMirror node to a GFM table node.
 *
 * Assumes canPromoteToGfm(gridTable) returned true.
 */
export function promoteToGfmTable(
  gridTable: ProseNode,
  schema: Schema
): ProseNode | null {
  const tableType = schema.nodes['table']
  const tableHeaderRowType = schema.nodes['table_header_row']
  const tableRowType = schema.nodes['table_row']
  const tableHeaderType = schema.nodes['table_header']
  const tableCellType = schema.nodes['table_cell']

  if (!tableType || !tableHeaderRowType || !tableRowType || !tableHeaderType || !tableCellType) {
    return null
  }

  let gtHead: ProseNode | null = null
  let gtBody: ProseNode | null = null

  gridTable.forEach((child) => {
    if (child.type.name === 'gridTableHead') gtHead = child
    else if (child.type.name === 'gridTableBody') gtBody = child
  })

  if (!gtHead || !gtBody) return null

  const headerRow = gtHead.firstChild
  if (!headerRow) return null

  // Convert header row
  const headerCells: ProseNode[] = []
  for (let i = 0; i < headerRow.childCount; i++) {
    const gridCell = headerRow.child(i)
    const alignment = mapAlignment(gridCell.attrs.align)

    const cellContent = gridCell.content
    console.log('[promotion] Header cell', i, 'content size:', cellContent.size, 'childCount:', cellContent.childCount)
    console.log('[promotion] Header cell', i, 'first child type:', cellContent.firstChild?.type.name)
    const headerCell = tableHeaderType.create({ alignment }, cellContent)
    console.log('[promotion] Created header cell, childCount:', headerCell.childCount)
    headerCells.push(headerCell)
  }

  const gfmHeaderRow = tableHeaderRowType.create(null, Fragment.from(headerCells))

  // Convert body rows
  const bodyRows: ProseNode[] = []
  for (let rowIdx = 0; rowIdx < gtBody.childCount; rowIdx++) {
    const gridRow = gtBody.child(rowIdx)
    const cells: ProseNode[] = []

    for (let cellIdx = 0; cellIdx < gridRow.childCount; cellIdx++) {
      const gridCell = gridRow.child(cellIdx)
      const alignment = mapAlignment(gridCell.attrs.align)

      const cellContent = gridCell.content
      const cell = tableCellType.create({ alignment }, cellContent)
      cells.push(cell)
    }

    const gfmRow = tableRowType.create(null, Fragment.from(cells))
    bodyRows.push(gfmRow)
  }

  // Create GFM table with header row + body rows
  const tableContent = [gfmHeaderRow, ...bodyRows]
  const gfmTable = tableType.create(null, Fragment.from(tableContent))

  console.log('[promotion] Created GFM table with', tableContent.length, 'rows')
  console.log('[promotion] Header row has', headerCells.length, 'cells')
  console.log('[promotion] First body row has', bodyRows[0]?.childCount, 'cells')

  return gfmTable
}

/**
 * Maps gridTable alignment to GFM alignment.
 */
function mapAlignment(align: string | null): string {
  if (align === 'center' || align === 'right') return align
  // 'justify' and null both map to 'left' (GFM default)
  return 'left'
}

/**
 * Recursively walks a ProseMirror document and promotes compatible gridTables
 * to GFM tables.
 */
export function promoteGridTablesToGfm(doc: ProseNode, schema: Schema): ProseNode {
  // Check if GFM table schema exists
  if (!schema.nodes['table']) {
    console.log('[promotion] No GFM table schema found, skipping promotion')
    return doc
  }

  console.log('[promotion] Starting promotion, scanning document...')

  // Recursively transform the document
  const transformNode = (node: ProseNode): ProseNode => {
    // If it's a gridTable, try to promote it
    if (node.type.name === 'gridTable') {
      console.log('[promotion] Found gridTable, checking if promotable...')
      const canPromote = canPromoteToGfm(node)
      console.log('[promotion] Can promote:', canPromote)
      if (canPromote) {
        const promoted = promoteToGfmTable(node, schema)
        console.log('[promotion] Promotion result:', promoted ? 'success' : 'failed')
        if (promoted) return promoted
      }
    }

    // If node has content, recursively transform children
    if (node.content.size > 0) {
      const newContent: ProseNode[] = []
      node.content.forEach((child) => {
        newContent.push(transformNode(child))
      })

      return node.copy(Fragment.from(newContent))
    }

    return node
  }

  return transformNode(doc)
}

